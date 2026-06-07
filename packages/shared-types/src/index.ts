// ============================================================
// ResumeAI 共享类型定义 v1.0
// 所有微服务和前端共享的类型
// ============================================================

// -------- 公司类型 --------
export type CompanyType = 'internet' | 'foreign' | 'state' | 'startup' | 'consulting';

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  internet: '互联网大厂',
  foreign: '外企/跨国',
  state: '国企/事业单位',
  startup: '创业公司',
  consulting: '咨询/金融',
};

// -------- AI 模型 --------
export type AIModelProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'baidu'
  | 'ali'
  | 'tencent'
  | 'zhipu'
  | 'moonshot'
  | 'deepseek';

export interface AIModelConfig {
  provider: AIModelProvider;
  model: string;
  apiKey?: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}

// -------- 简历数据结构 --------
export interface ResumeSection {
  id: string;
  type: 'personal' | 'education' | 'work' | 'project' | 'skill' | 'certificate' | 'summary' | 'custom';
  title: string;
  content: Record<string, unknown>;
  order: number;
  visible: boolean;
}

export interface WorkExperience {
  company: string;
  position: string;
  startDate: string;       // "2022-03"
  endDate: string | null;  // null = 至今
  description: string;
  achievements: string[];
  keywords: string[];
}

export interface Education {
  school: string;
  degree: '高中' | '大专' | '本科' | '硕士' | '博士' | '其他';
  major: string;
  startDate: string;
  endDate: string;
  gpa?: string;
  awards?: string[];
}

export interface Project {
  name: string;
  role: string;
  startDate: string;
  endDate: string | null;
  description: string;
  responsibilities: string[];
  technologies: string[];
  url?: string;
}

export interface ResumeData {
  personal: {
    name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    website?: string;
    github?: string;
    linkedin?: string;
    avatar?: string;
  };
  summary: string;
  education: Education[];
  work: WorkExperience[];
  projects: Project[];
  skills: Array<{ category: string; items: string[] }>;
  certificates: Array<{ name: string; issuer: string; date: string }>;
  customSections: ResumeSection[];
}

// -------- 简历版本 --------
export interface ResumeVersion {
  id: string;
  resumeId: string;
  companyType: CompanyType;
  style: ResumeStyle;
  data: ResumeData;
  atsScore?: number;
  keywords?: string[];
  createdAt: string;
  isActive: boolean;
}

export type ResumeStyle =
  | 'classic'
  | 'modern'
  | 'minimal'
  | 'creative'
  | 'academic'
  | 'executive';

export const RESUME_STYLE_LABELS: Record<ResumeStyle, string> = {
  classic: '经典商务',
  modern: '现代简约',
  minimal: '极简清新',
  creative: '创意设计',
  academic: '学术严谨',
  executive: '高管精英',
};

// -------- 简历模板 --------
export interface ResumeTemplate {
  id: string;
  name: string;
  style: ResumeStyle;
  thumbnail: string;
  description: string;
  isPremium: boolean;
  tags: string[];
  createdAt: string;
}

// -------- 导出格式 --------
export type ExportFormat = 'pdf' | 'docx' | 'pptx' | 'png' | 'jpg' | 'html' | 'markdown';

export interface ExportRequest {
  resumeId: string;
  versionId: string;
  format: ExportFormat;
  options?: {
    pageSize?: 'A4' | 'letter';
    quality?: 'standard' | 'high';
    includePhoto?: boolean;
    colorMode?: 'color' | 'grayscale';
  };
}

// -------- API 通用 --------
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

export interface PaginatedRequest {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// -------- 用户 --------
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscription: SubscriptionTier;
  createdAt: string;
}

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, { resumes: number; exportsPerMonth: number; aiGenerations: number }> = {
  free: { resumes: 3, exportsPerMonth: 5, aiGenerations: 10 },
  basic: { resumes: 20, exportsPerMonth: 50, aiGenerations: 100 },
  pro: { resumes: 999, exportsPerMonth: 999, aiGenerations: 999 },
  enterprise: { resumes: 9999, exportsPerMonth: 9999, aiGenerations: 9999 },
};

// -------- 多模态输入 --------
export type InputModality = 'text' | 'pdf' | 'docx' | 'pptx' | 'image' | 'voice';

export interface MultiModalInput {
  modality: InputModality;
  content: string;        // 文本内容 或 base64 或 URL
  filename?: string;
  mimeType?: string;
  language?: string;      // 输入语言：'zh' | 'en'
}

// -------- AI 生成请求 --------
export interface GenerateResumeRequest {
  input: MultiModalInput | MultiModalInput[];
  companyType: CompanyType;
  style?: ResumeStyle;
  targetPosition?: string;
  targetIndustry?: string;
  emphasizeKeywords?: string[];
  modelPreference?: AIModelConfig;
}

export interface GenerateResumeResponse {
  resumeId: string;
  versionId: string;
  data: ResumeData;
  atsScore: number;
  suggestions: string[];
  modelUsed: AIModelProvider;
  tokensUsed: number;
}
