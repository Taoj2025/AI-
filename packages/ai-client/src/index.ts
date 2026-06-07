/**
 * @resumeai/ai-client — AI 调用客户端 SDK
 * 
 * 封装 Hermes 统一适配层 + OpenClaw 编排链的前端调用
 * 支持:
 *   - 14+ 款 AI 模型一键切换
 *   - 流式生成（SSE）
 *   - 成本自动追踪
 *   - 智能故障转移
 *   - 多版本并行生成
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { z } from 'zod';

// ============================================================
// 类型定义
// ============================================================

/** 支持的 AI 模型 */
export type AIModel =
  // 国际
  | 'gpt-4o' | 'gpt-4o-mini'
  | 'claude-3.5-sonnet' | 'claude-3-opus'
  | 'gemini-1.5-pro' | 'gemini-2.0-flash'
  // 国产
  | 'wenxin-4.0' | 'qwen-max'
  | 'hunyuan-pro' | 'glm-4-plus'
  | 'deepseek-chat' | 'deepseek-coder'
  | 'moonshot-v1-128k' | 'yi-large';

/** 模型提供商 */
export type AIProvider =
  | 'openai' | 'anthropic' | 'google'
  | 'baidu' | 'alibaba' | 'tencent' | 'zhipu'
  | 'deepseek' | 'moonshot' | 'yi';

/** 公司类型 */
export type CompanyType = 'internet' | 'foreign' | 'soe' | 'startup' | 'consulting';

/** 简历风格 */
export type ResumeStyle = 'classic' | 'modern' | 'minimal' | 'creative' | 'academic' | 'executive';

/** 输入方式 */
export type InputMethod = 'text' | 'pdf' | 'word' | 'ppt' | 'image' | 'voice';

/** 导出格式 */
export type ExportFormat = 'pdf' | 'docx' | 'pptx' | 'png' | 'jpg' | 'html' | 'markdown';

/** 模型配置 */
export interface ModelConfig {
  id: AIModel;
  name: string;
  provider: AIProvider;
  description: string;
  maxTokens: number;
  costPer1kTokens: number;
  supportsStreaming: boolean;
  color: string;           // UI 展示颜色
  badge?: string;          // 标签如 "推荐" "新"
}

/** 生成请求 */
export interface GenerateRequest {
  /** 输入方式 */
  inputMethod: InputMethod;
  /** 用户输入内容（文字直接是文本，文件则是 base64/URL） */
  content: string;
  /** 目标公司类型 */
  companyType: CompanyType;
  /** 简历风格 */
  style: ResumeStyle;
  /** 目标职位（可选） */
  targetPosition?: string;
  /** 目标公司（可选） */
  targetCompany?: string;
  /** 是否并行生成多版本 */
  parallelVersions?: boolean;
  /** 并行版本数（默认 2） */
  versionCount?: number;
  /** 是否启用 ATS 优化 */
  atsOptimize?: boolean;
  /** 附加说明 */
  notes?: string;
}

/** 生成响应 */
export interface GenerateResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  versions?: ResumeVersion[];
  error?: string;
}

/** 简历版本 */
export interface ResumeVersion {
  id: string;
  model: AIModel;
  content: string;          // 简历结构化内容（JSON string）
  renderUrl?: string;        // 预览 URL
  tokensUsed: number;
  cost: number;
  latencyMs: number;
}

/** 流式事件 */
export interface StreamEvent {
  type: 'start' | 'token' | 'version_done' | 'all_done' | 'error';
  model?: AIModel;
  token?: string;
  version?: ResumeVersion;
  error?: string;
}

/** 用量统计 */
export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  byModel: Record<AIModel, { tokens: number; cost: number; calls: number }>;
}

// ============================================================
// 模型注册表（14+ 款模型）
// ============================================================

export const MODEL_REGISTRY: Record<AIModel, ModelConfig> = {
  // 国际模型
  'gpt-4o': {
    id: 'gpt-4o', name: 'GPT-4o', provider: 'openai',
    description: 'OpenAI 最强模型，推理能力出色',
    maxTokens: 128000, costPer1kTokens: 0.03, supportsStreaming: true,
    color: '#22C55E', badge: '推荐',
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai',
    description: '轻量快速，适合日常使用',
    maxTokens: 128000, costPer1kTokens: 0.01, supportsStreaming: true,
    color: '#22C55E', badge: '经济',
  },
  'claude-3.5-sonnet': {
    id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic',
    description: 'Anthropic 旗舰，长文本理解强',
    maxTokens: 200000, costPer1kTokens: 0.003, supportsStreaming: true,
    color: '#3B82F6', badge: '推荐',
  },
  'claude-3-opus': {
    id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic',
    description: 'Anthropic 强推理模型',
    maxTokens: 200000, costPer1kTokens: 0.015, supportsStreaming: true,
    color: '#3B82F6',
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google',
    description: 'Google 多模态大模型，超长上下文',
    maxTokens: 1000000, costPer1kTokens: 0.0035, supportsStreaming: true,
    color: '#8B5CF6',
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google',
    description: 'Google 最新快速模型',
    maxTokens: 1000000, costPer1kTokens: 0.001, supportsStreaming: true,
    color: '#8B5CF6', badge: '新',
  },
  // 国产模型
  'wenxin-4.0': {
    id: 'wenxin-4.0', name: '文心一言 4.0', provider: 'baidu',
    description: '百度旗舰模型，中文优化',
    maxTokens: 8000, costPer1kTokens: 0.012, supportsStreaming: true,
    color: '#F97316',
  },
  'qwen-max': {
    id: 'qwen-max', name: '通义千问 Max', provider: 'alibaba',
    description: '阿里最强模型，中文处理优秀',
    maxTokens: 32000, costPer1kTokens: 0.008, supportsStreaming: true,
    color: '#F97316',
  },
  'hunyuan-pro': {
    id: 'hunyuan-pro', name: '腾讯混元 Pro', provider: 'tencent',
    description: '腾讯旗舰模型',
    maxTokens: 32000, costPer1kTokens: 0.01, supportsStreaming: true,
    color: '#EF4444', badge: '新',
  },
  'glm-4-plus': {
    id: 'glm-4-plus', name: '智谱 GLM-4 Plus', provider: 'zhipu',
    description: '智谱 AI 最新旗舰',
    maxTokens: 128000, costPer1kTokens: 0.007, supportsStreaming: true,
    color: '#EF4444', badge: '新',
  },
  'deepseek-chat': {
    id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek',
    description: 'DeepSeek 通用对话模型，性价比极高',
    maxTokens: 64000, costPer1kTokens: 0.001, supportsStreaming: true,
    color: '#14B8A6', badge: '超值',
  },
  'deepseek-coder': {
    id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'deepseek',
    description: 'DeepSeek 代码专精，适合技术岗简历',
    maxTokens: 64000, costPer1kTokens: 0.001, supportsStreaming: true,
    color: '#14B8A6',
  },
  'moonshot-v1-128k': {
    id: 'moonshot-v1-128k', name: 'Moonshot v1 128K', provider: 'moonshot',
    description: '月之暗面超长上下文模型',
    maxTokens: 128000, costPer1kTokens: 0.006, supportsStreaming: true,
    color: '#6366F1',
  },
  'yi-large': {
    id: 'yi-large', name: '零一万物 Yi-Large', provider: 'yi',
    description: '李开复团队旗舰模型',
    maxTokens: 16000, costPer1kTokens: 0.005, supportsStreaming: true,
    color: '#6366F1',
  },
};

/** 按提供商分组模型 */
export function getModelsByProvider(): Record<string, ModelConfig[]> {
  const groups: Record<string, ModelConfig[]> = {};
  for (const model of Object.values(MODEL_REGISTRY)) {
    if (!groups[model.provider]) groups[model.provider] = [];
    groups[model.provider].push(model);
  }
  return groups;
}

/** 获取推荐模型 */
export function getRecommendedModels(): AIModel[] {
  return ['gpt-4o', 'claude-3.5-sonnet', 'deepseek-chat', 'qwen-max', 'glm-4-plus'];
}

/** 获取免费/低成本模型 */
export function getBudgetModels(): AIModel[] {
  return ['deepseek-chat', 'gemini-2.0-flash', 'gpt-4o-mini', 'yi-large'];
}

// ============================================================
// AI Client 主类
// ============================================================

export class AIClient {
  private httpClient: AxiosInstance;
  private baseUrl: string;
  private authToken: string | null = null;
  private usageStats: UsageStats = {
    totalTokens: 0,
    totalCost: 0,
    byModel: {} as any,
  };

  constructor(config: {
    baseUrl?: string;
    authToken?: string;
    timeout?: number;
  } = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:3002';
    this.authToken = config.authToken || null;

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 120000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      },
    });

    // 请求拦截器：自动注入 Token
    this.httpClient.interceptors.request.use((cfg) => {
      if (this.authToken) {
        cfg.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return cfg;
    });
  }

  /** 设置认证 Token */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /** 获取用量统计 */
  getUsageStats(): UsageStats {
    return { ...this.usageStats };
  }

  /** 重置用量统计 */
  resetUsageStats(): void {
    this.usageStats = { totalTokens: 0, totalCost: 0, byModel: {} as any };
  }

  // ---- 核心 API ----

  /**
   * 生成简历（非流式）
   */
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await this.httpClient.post<GenerateResponse>('/api/ai/generate', request);
    const data = response.data;

    // 更新用量统计
    if (data.versions) {
      for (const v of data.versions) {
        this.usageStats.totalTokens += v.tokensUsed;
        this.usageStats.totalCost += v.cost;
        if (!this.usageStats.byModel[v.model]) {
          this.usageStats.byModel[v.model] = { tokens: 0, cost: 0, calls: 0 };
        }
        this.usageStats.byModel[v.model].tokens += v.tokensUsed;
        this.usageStats.byModel[v.model].cost += v.cost;
        this.usageStats.byModel[v.model].calls += 1;
      }
    }

    return data;
  }

  /**
   * 生成简历（流式 SSE）
   */
  async generateStream(
    request: GenerateRequest,
    onEvent: (event: StreamEvent) => void,
  ): Promise<void> {
    const response = await this.httpClient.post('/api/ai/generate/stream', request, {
      responseType: 'text',
      headers: { Accept: 'text/event-stream' },
    });

    const text = response.data as string;
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event: StreamEvent = JSON.parse(line.slice(6));
          onEvent(event);

          // 更新用量
          if (event.type === 'version_done' && event.version) {
            const v = event.version;
            this.usageStats.totalTokens += v.tokensUsed;
            this.usageStats.totalCost += v.cost;
          }
        } catch {
          // 忽略非 JSON 行
        }
      }
    }
  }

  /**
   * 获取生成任务状态
   */
  async getTaskStatus(taskId: string): Promise<GenerateResponse> {
    const response = await this.httpClient.get<GenerateResponse>(`/api/ai/tasks/${taskId}`);
    return response.data;
  }

  /**
   * 优化简历（给已有简历优化建议）
   */
  async optimize(content: string, options: {
    companyType?: CompanyType;
    targetPosition?: string;
    focus?: 'ats' | 'language' | 'structure' | 'all';
  } = {}): Promise<string> {
    const response = await this.httpClient.post('/api/ai/optimize', { content, ...options });
    return response.data.suggestions;
  }

  /**
   * 解析输入（PDF/Word/图片 → 结构化简历数据）
   */
  async parseInput(file: File | Blob, inputMethod: InputMethod): Promise<Record<string, any>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('inputMethod', inputMethod);

    const response = await this.httpClient.post('/api/ai/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  }
}

// ============================================================
// React Hooks（状态管理）
// ============================================================

/** 创建 AI Client 实例 */
export function createAIClient(config?: ConstructorParameters<typeof AIClient>[0]): AIClient {
  return new AIClient(config);
}

/** Zustand Store 类型 */
export interface AIStoreState {
  client: AIClient;
  selectedModel: AIModel;
  isGenerating: boolean;
  currentTaskId: string | null;
  versions: ResumeVersion[];
  error: string | null;
  usageStats: UsageStats;

  // Actions
  setModel: (model: AIModel) => void;
  generate: (request: Omit<GenerateRequest, 'content'> & { content: string }) => Promise<void>;
  reset: () => void;
}
