# AI 引擎模块设计文档

**模块**: 04-ai-engine  
**版本**: v1.0.0  
**状态**: 规划中

---

## 1. 模块概述

AI 引擎层是 ResumeAI 的核心竞争力所在，基于 **OpenClaw + Hermes** 双框架构建，实现：

- 多模型统一调用与智能路由
- 简历内容的智能生成、优化与定制
- 多模态输入解析（图片 OCR、PDF 提取、PPT 解析）
- 针对不同公司类型和岗位的简历适配

---

## 2. OpenClaw 框架设计

### 2.1 核心组件

```python
# OpenClaw 核心抽象
class OpenClaw:
    """多模型编排框架核心"""
    
    components = {
        "TaskRouter": "任务分类与路由",
        "PromptLibrary": "提示词模板库",
        "ModelSelector": "模型选择策略",
        "ChainExecutor": "链式任务执行器",
        "ResultProcessor": "结果处理与格式化",
        "StreamHandler": "流式输出处理",
        "CostTracker": "成本追踪",
    }
```

### 2.2 任务类型与模型映射

| 任务类型 | 推荐模型 | 备选模型 | 原因 |
|---------|---------|---------|------|
| 简历内容生成 | GPT-4o | Claude-3.5-Sonnet | 综合质量最优 |
| 文本润色优化 | Claude-3.5-Sonnet | GPT-4o | 文字质量更细腻 |
| 多模态输入解析 | Gemini-1.5-Pro | GPT-4-vision | 多模态能力强 |
| 国内用户简历 | 文心4.0 / 通义Max | GPT-4o | 理解中文语境 |
| 低成本批量生成 | GPT-4o-mini | Llama3(本地) | 成本敏感场景 |
| 公司调研分析 | GPT-4o + 搜索 | Perplexity | 需要联网能力 |

### 2.3 提示词模板库（PromptLibrary）

#### 2.3.1 简历生成提示词框架

```
系统提示词结构:
1. 角色定义（专业HR顾问/职业规划师）
2. 任务约束（格式/长度/风格）
3. 公司类型适配规则
4. 岗位关键词注入
5. 输出格式规范（JSON Schema）

用户提示词结构:
1. 个人信息摘要
2. 目标职位描述
3. 工作经历（结构化）
4. 特殊要求（风格/侧重点）
```

#### 2.3.2 公司类型适配策略

```python
COMPANY_TYPE_PROMPTS = {
    "internet_giant": {
        "name": "互联网大厂",
        "keywords": ["数据驱动", "高并发", "微服务", "敏捷开发", "OKR"],
        "style": "量化成果，突出技术深度，STAR法则",
        "focus": "技术能力 > 业务影响 > 团队协作",
        "length": "1-2页",
    },
    "foreign_company": {
        "name": "外资/外企",
        "keywords": ["Global mindset", "Cross-functional", "Stakeholder management"],
        "style": "英中双语友好，突出国际化视野，简洁专业",
        "focus": "沟通能力 > 领导力 > 专业能力",
        "length": "1页（国际标准）",
    },
    "state_owned": {
        "name": "国有企业/央企",
        "keywords": ["稳定", "责任心", "党建", "合规", "廉洁"],
        "style": "规范正式，突出稳定性和专业资质",
        "focus": "资质证书 > 工作年限 > 专业背景",
        "length": "1-2页",
    },
    "startup": {
        "name": "创业公司",
        "keywords": ["快速学习", "全栈能力", "0-1", "增长黑客", "自驱力"],
        "style": "展现潜力和学习能力，突出多元经验",
        "focus": "成长潜力 > 全栈能力 > 个性亮点",
        "length": "1页",
    },
    "consulting": {
        "name": "咨询/金融",
        "keywords": ["问题解决", "逻辑分析", "客户导向", "商业洞察"],
        "style": "逻辑清晰，量化成果，案例驱动",
        "focus": "教育背景 > 逻辑能力 > 行业经验",
        "length": "1页（麦肯锡标准）",
    },
}
```

### 2.4 简历生成 Chain 设计

```python
class ResumeGenerationChain:
    """简历生成完整链路"""
    
    steps = [
        Step("input_analysis", "分析用户输入信息完整度"),
        Step("info_extraction", "结构化提取个人信息"),
        Step("job_analysis", "分析目标职位JD关键词"),
        Step("company_profiling", "公司类型分析与策略选择"),
        Step("content_generation", "生成简历各模块内容"),
        Step("keyword_optimization", "ATS关键词优化注入"),
        Step("style_application", "应用所选风格模板"),
        Step("quality_check", "内容质量自检与修正"),
        Step("multi_version", "生成多个版本变体（可选）"),
        Step("output_formatting", "格式化为标准JSON结构"),
    ]
```

---

## 3. Hermes 统一适配层设计

### 3.1 架构设计

```python
class HermesAdapter:
    """统一 API 适配层"""
    
    def __init__(self):
        self.providers = {
            "openai": OpenAIProvider(),
            "anthropic": AnthropicProvider(),
            "google": GoogleProvider(),
            "baidu": BaiduProvider(),
            "alibaba": AlibabaProvider(),
            "xfyun": XFYunProvider(),
            "local": OllamaProvider(),
        }
        self.key_manager = APIKeyManager()
        self.cost_tracker = CostTracker()
        self.rate_limiter = RateLimiter()
        self.failover = FailoverHandler()
    
    async def chat(
        self, 
        model: str, 
        messages: list,
        stream: bool = False,
        **kwargs
    ) -> Response:
        """统一调用接口"""
        provider = self._resolve_provider(model)
        
        with self.cost_tracker.track(model):
            try:
                return await provider.chat(messages, stream=stream, **kwargs)
            except RateLimitError:
                return await self.failover.handle(model, messages, **kwargs)
```

### 3.2 统一消息格式

```python
# 统一输入格式（OpenAI 兼容）
UnifiedMessage = {
    "role": "user" | "assistant" | "system",
    "content": str | list,  # list 支持多模态
}

# 多模态内容格式
MultiModalContent = [
    {"type": "text", "text": "请分析这份简历"},
    {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}},
]
```

### 3.3 API Key 管理策略

```python
class APIKeyManager:
    """API Key 轮换与保护"""
    
    strategies = {
        "round_robin": "轮询多个Key（高并发场景）",
        "failover": "主Key失效自动切换备用Key",
        "cost_based": "根据成本预算动态选择Key",
        "rate_aware": "感知限流状态智能切换",
    }
    
    # Key 存储: 环境变量 + 加密数据库（用户自定义Key）
    storage = {
        "system_keys": "env vars（平台提供）",
        "user_keys": "AES-256加密存储（用户自带Key）",
    }
```

### 3.4 故障转移策略

```
主模型调用失败
    ↓
重试（3次，指数退避）
    ↓ 仍失败
切换备用模型（同提供商其他模型）
    ↓ 仍失败
切换备用提供商
    ↓ 仍失败
返回降级响应（离线模板）
```

---

## 4. 多模态输入解析

### 4.1 支持的输入类型

| 输入类型 | 解析方式 | 输出格式 |
|---------|---------|---------|
| 纯文字描述 | 直接传入 NLP 处理 | 结构化 JSON |
| 旧版简历 PDF | PyMuPDF + GPT-4V 解析 | 结构化 JSON |
| 图片简历 | Tesseract OCR + GPT-4V | 结构化 JSON |
| PPT 文件 | python-pptx + 内容提取 | 结构化 JSON |
| Word 文档 | python-docx 解析 | 结构化 JSON |
| 语音描述 | Whisper API 转文字 | 文本 → 结构化 |
| LinkedIn 链接 | 网页爬取 + 解析 | 结构化 JSON |

### 4.2 解析流程

```python
class MultiModalParser:
    
    async def parse(self, input_data: InputData) -> StructuredResume:
        # 1. 检测输入类型
        input_type = self.detect_type(input_data)
        
        # 2. 提取原始文本/内容
        raw_content = await self.extract(input_data, input_type)
        
        # 3. 使用 AI 结构化（Gemini Pro 或 GPT-4V）
        structured = await self.ai_structurize(raw_content)
        
        # 4. 校验与补全
        validated = self.validate_and_complete(structured)
        
        return validated
```

---

## 5. 简历结构化数据模型

```python
# 核心数据结构（TypeScript/Python 共用 Schema）
ResumeData = {
    "meta": {
        "id": "uuid",
        "version": 1,
        "created_at": "ISO-8601",
        "target_company_type": "internet_giant | foreign_company | state_owned | startup | consulting",
        "style_template": "minimal | business | creative | technical | academic",
    },
    "personal": {
        "name": str,
        "email": str,
        "phone": str,
        "location": str,
        "linkedin": str | None,
        "github": str | None,
        "portfolio": str | None,
        "avatar": str | None,  # 图片 URL
    },
    "summary": str,  # 个人简介/求职意向（AI 生成）
    "experience": [
        {
            "company": str,
            "position": str,
            "start_date": str,
            "end_date": str | "present",
            "description": str,
            "achievements": [str],  # 量化成果列表
            "tech_stack": [str],
        }
    ],
    "education": [
        {
            "institution": str,
            "degree": str,
            "major": str,
            "start_date": str,
            "end_date": str,
            "gpa": float | None,
            "awards": [str],
        }
    ],
    "skills": {
        "technical": [str],
        "soft": [str],
        "languages": [{"language": str, "level": str}],
        "certifications": [str],
    },
    "projects": [
        {
            "name": str,
            "description": str,
            "tech_stack": [str],
            "link": str | None,
            "achievements": [str],
        }
    ],
    "awards": [str],
    "publications": [str] | None,
    "custom_sections": [
        {
            "title": str,
            "content": str,
        }
    ],
}
```

---

## 6. AI 生成质量保证

### 6.1 内容自检清单

```python
QUALITY_CHECKS = [
    "check_completeness",      # 关键字段是否填写完整
    "check_consistency",       # 时间线是否一致
    "check_quantification",    # 成果是否有数字量化
    "check_action_verbs",      # 开头是否使用动作动词
    "check_keywords",          # 目标岗位关键词覆盖率
    "check_length",            # 长度是否符合目标公司规范
    "check_grammar",           # 语法检查
    "check_sensitivity",       # 敏感信息检测（身份证等）
]
```

### 6.2 ATS 优化

- 解析目标 JD，提取关键词
- 计算简历与 JD 的关键词匹配度
- 自动建议补充关键词
- 格式合规性检查（避免 ATS 无法解析的复杂格式）

---

## 7. 测试要求

- [ ] 单元测试: 每个 Provider 适配器 100% 覆盖
- [ ] 集成测试: 每种模型调用链端到端测试
- [ ] 压测: 并发 100 请求，平均响应 < 30s（流式）
- [ ] 故障测试: 模拟 API 超时/限流，验证故障转移
- [ ] 质量测试: 生成结果人工评测 + 自动评分

---

*关联文档: [架构设计](../01-architecture/ARCHITECTURE.md) | [后端服务](../03-backend/BACKEND.md)*
