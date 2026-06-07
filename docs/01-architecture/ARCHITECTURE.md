# 系统架构设计文档

**模块**: 01-architecture  
**版本**: v1.0.0  
**状态**: 规划中

---

## 1. 系统整体架构

### 1.1 架构模式

采用 **前后端分离 + 微服务** 架构，核心分层：

```
┌─────────────────────────────────────────────────────────┐
│                     客户端层                              │
│  移动端(React Native)    Web端(Next.js)    小程序(未来)   │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS / WebSocket
┌──────────────────────────▼──────────────────────────────┐
│                   API Gateway 层                          │
│          Kong / Nginx + 鉴权 + 限流 + 日志               │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                   后端微服务层                            │
│  用户服务  简历服务  模板服务  AI调度  导出服务  支付服务  │
└──────┬──────────────────────────────────────┬───────────┘
       │                                      │
┌──────▼──────┐                    ┌──────────▼──────────┐
│  AI 引擎层  │                    │     数据存储层        │
│ OpenClaw   │                    │  PostgreSQL + Redis  │
│  + Hermes  │                    │  + MinIO             │
└─────────────┘                    └─────────────────────┘
```

### 1.2 核心设计原则

1. **服务自治**: 每个微服务独立部署、独立扩容
2. **事件驱动**: 异步任务（AI生成、导出）通过消息队列（Redis Pub/Sub 或 BullMQ）处理
3. **API First**: 所有功能通过 RESTful API + GraphQL（可选）暴露
4. **状态无关**: 服务层无状态，状态全部下沉到数据层

---

## 2. 微服务划分

### 2.1 服务清单

| 服务名 | 职责 | 技术栈 | 端口 |
|--------|------|--------|------|
| `user-service` | 用户注册/登录/OAuth/profile | Node.js + Fastify | 3001 |
| `resume-service` | 简历 CRUD、版本管理 | Node.js + Fastify | 3002 |
| `template-service` | 模板管理、风格配置 | Node.js + Fastify | 3003 |
| `ai-dispatch-service` | AI 任务调度、模型路由 | Python + FastAPI | 3004 |
| `export-service` | 格式转换、文件导出 | Python + FastAPI | 3005 |
| `payment-service` | 订阅/会员/支付 | Node.js + Fastify | 3006 |
| `notification-service` | 推送/邮件/短信 | Node.js + Fastify | 3007 |
| `file-service` | 文件上传/解析/OCR | Python + FastAPI | 3008 |

### 2.2 服务间通信

- **同步**: REST API（服务间直调，通过服务发现）
- **异步**: Redis Pub/Sub + BullMQ（AI生成任务、导出任务）
- **事件总线**: 用于跨服务事件通知（用户注册完成→发欢迎邮件等）

---

## 3. OpenClaw 集成方案

### 3.1 OpenClaw 定位

OpenClaw 作为 **多模型编排框架**，负责：

- 模型路由与负载均衡（根据任务类型选择最优模型）
- 提示词工程（Prompt Engineering）模板管理
- 流式输出（SSE/WebSocket）统一处理
- 模型调用链（Chain）管理
- 结果后处理与格式化

### 3.2 OpenClaw 工作流

```
用户请求
    │
    ▼
TaskRouter（任务分类）
    │
    ├── 简历生成任务 → PromptBuilder → ModelSelector → 执行 → PostProcessor
    ├── 简历优化任务 → PromptBuilder → ModelSelector → 执行 → PostProcessor
    ├── 简历分析任务 → PromptBuilder → ModelSelector → 执行 → PostProcessor
    └── 多版本任务   → ParallelChain（并行调用多模型）→ Merger → PostProcessor
```

### 3.3 Hermes 定位

Hermes 作为 **统一 API 适配层**，负责：

- 抽象不同厂商 API 差异（OpenAI/Anthropic/Google/百度/阿里）
- 统一 Token 计算与成本跟踪
- API Key 轮换与限流保护
- 请求/响应日志审计
- 故障转移（Failover）

### 3.4 Hermes 支持的模型

| 提供商 | 模型 | 用途 |
|--------|------|------|
| OpenAI | GPT-4o, GPT-4-turbo | 高质量简历生成 |
| Anthropic | Claude 3.5 Sonnet | 文本润色优化 |
| Google | Gemini 1.5 Pro | 多模态输入解析 |
| 百度 | 文心一言 4.0 | 国内用户备选 |
| 阿里 | 通义千问 Max | 国内用户备选 |
| 讯飞 | 星火 3.5 | 国内语音识别 |
| 本地 | Ollama (Llama3) | 离线/低成本模式 |

---

## 4. API 设计规范

### 4.1 RESTful 规范

```
基础路径: /api/v1/

用户相关:
  POST   /api/v1/auth/register
  POST   /api/v1/auth/login
  POST   /api/v1/auth/oauth/{provider}
  GET    /api/v1/users/me
  PUT    /api/v1/users/me

简历相关:
  GET    /api/v1/resumes              # 列表
  POST   /api/v1/resumes              # 新建
  GET    /api/v1/resumes/:id          # 详情
  PUT    /api/v1/resumes/:id          # 更新
  DELETE /api/v1/resumes/:id          # 删除
  POST   /api/v1/resumes/:id/generate # AI生成
  GET    /api/v1/resumes/:id/versions # 历史版本

模板相关:
  GET    /api/v1/templates            # 模板列表
  GET    /api/v1/templates/:id        # 模板详情

导出相关:
  POST   /api/v1/export/pdf           # 导出PDF
  POST   /api/v1/export/word          # 导出Word
  POST   /api/v1/export/ppt           # 导出PPT
  POST   /api/v1/export/image         # 导出图片

文件上传:
  POST   /api/v1/files/upload         # 上传文件
  POST   /api/v1/files/parse          # 解析文件
```

### 4.2 统一响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "timestamp": "2026-06-07T08:00:00Z",
  "requestId": "uuid-v4"
}
```

### 4.3 错误码体系

```
1xxx - 认证鉴权错误
2xxx - 参数校验错误
3xxx - 业务逻辑错误
4xxx - AI服务错误
5xxx - 系统内部错误
```

---

## 5. 状态机设计

### 5.1 简历生成状态机

```
DRAFT → GENERATING → GENERATED → EDITING → PUBLISHED
              ↓
           FAILED → RETRY
```

### 5.2 导出任务状态机

```
PENDING → PROCESSING → COMPLETED → DELIVERED
              ↓
           FAILED
```

---

## 6. 缓存策略

| 缓存对象 | 策略 | TTL |
|---------|------|-----|
| 用户 Session | Redis | 7天 |
| 模板列表 | Redis | 1小时 |
| AI 生成结果 | Redis | 24小时 |
| 导出文件 CDN | CDN | 30天 |
| 用户简历列表 | Redis | 5分钟 |

---

## 7. 监控与可观测性

- **日志**: Winston + ELK Stack（Elasticsearch + Logstash + Kibana）
- **指标**: Prometheus + Grafana
- **链路追踪**: Jaeger / OpenTelemetry
- **告警**: PagerDuty / 企业微信机器人

---

*关联文档: [后端服务](../03-backend/BACKEND.md) | [AI引擎](../04-ai-engine/AI_ENGINE.md)*
