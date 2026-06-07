<div align="center">
  <h1>📄 ResumeAI — 智能简历生成平台</h1>
  <p><strong>AI-Powered Resume Builder · Hermes Adaptor · OpenClaw Orchestrator</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js 14" />
    <img src="https://img.shields.io/badge/Python-3.9+-blue?logo=python" alt="Python 3.9+" />
    <img src="https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
  </p>
</div>

---

## 🚀 快速开始

### 方式一：本地开发（无需 Docker）

```bash
# 克隆仓库
git clone git@github.com:Taoj2025/AI-.git
cd AI-

# 一键启动（SQLite + Mock AI）
bash start-dev.sh
```

启动后访问：
- 🌐 **Web 前端**: http://localhost:8080
- 🤖 **AI 调度**: http://localhost:3003
- 📄 **导出服务**: http://localhost:3002
- 💳 **支付服务**: http://localhost:3007

### 方式二：Docker Compose 部署（生产）

```bash
# 复制生产配置
cp .env.prod .env

# 生成 JWT Secret
openssl rand -hex 64 | tee -a .env

# 启动全部服务
docker-compose up -d

# 查看状态
docker-compose ps
```

访问 http://localhost:8080

---

## 🏗️ 架构总览

```
┌─────────────────────────────────────────────────────┐
│                    Web 前端 (Next.js)                │
│             http://localhost:8080                    │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP / API Gateway (Nginx)
                   ▼
┌─────────────────────────────────────────────────────┐
│                    API Gateway                       │
│               http://localhost:3000                   │
└───┬──────┬──────┬──────┬──────┬──────┬──────┬──────┘
    │      │      │      │      │      │      │
    ▼      ▼      ▼      ▼      ▼      ▼      ▼
 ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
 │User│ │Res │ │AI  │ │Exp │ │Pay │ │Ana │ │Tem │
 │Svc │ │Svc │ │Disp│ │Svc │ │Svc │ │Svc │ │Svc │
 │3004│ │3001│ │3003│ │3002│ │3007│ │3006│ │3005│
 └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘
    │      │      │      │      │      │
    ▼      ▼      ▼      ▼      ▼      ▼
 ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
 │PG  │ │PG  │ │Redis│ │MinIO│ │PG  │ │CH  │
 └────┘ └────┘ └────┘ └────┘ └────┘ └────┘
```

---

## 🤖 AI 模型支持

通过 **Hermes 统一适配层** + **OpenClaw 编排链**，一键切换所有模型：

| 提供商 | 模型 | 默认模型 | 适配器 |
|--------|------|---------|--------|
| **OpenAI** | GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5 | `gpt-4o` | `OpenAIProvider` |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Haiku | `claude-3-5-sonnet` | `AnthropicProvider` |
| **Google** | Gemini 1.5 Pro, Gemini 1.5 Flash | `gemini-1.5-pro` | `GoogleProvider` |
| **百度** | ERNIE 4.0, ERNIE 4.0 Turbo | `ernie-4.0-turbo` | `BaiduProvider` |
| **阿里** | Qwen Max, Qwen Plus | `qwen-max` | `AlibabaProvider` |
| **腾讯** | Hunyuan Pro | `hunyuan-pro` | `TencentProvider` |
| **智谱** | GLM-4 Plus, GLM-4 | `glm-4-plus` | `ZhipuProvider` |
| **Moonshot** | Moonshot v1 128K | `moonshot-v1-128k` | `MoonshotProvider` |
| **DeepSeek** | DeepSeek Chat | `deepseek-chat` | `DeepSeekProvider` |
| **MiniMax** | MiniMax-M3, M2.7, M2.5, M2.1, M2 | `MiniMax-M3` | `MiniMaxProvider` |

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| **14+ AI 模型** | Hermes 适配层统一接入，故障转移自动降级 |
| **5 种公司类型** | 互联网/外企/国企/创业/咨询，差异化生成策略 |
| **7 种导出格式** | PDF/Word/PPT/PNG/JPG/HTML/Markdown |
| **6 种风格模板** | 经典/现代/极简/创意/学术/高管 |
| **多模态输入** | 文字/PDF/Word/图片/语音，上传即解析 |
| **ATS 优化** | 智能关键词匹配，通过率提升 300% |
| **实时生成** | 流式输出，所见即所得 |
| **版本管理** | 简历版本历史，随时回退 |
| **支付订阅** | Stripe 真实接入 + 微信/支付宝 Mock，4 档套餐 |

---

## 📦 项目结构

```
AI-/
├── apps/
│   ├── mobile/          # React Native 移动端
│   └── web/             # Next.js Web 前端
├── services/
│   ├── api-gateway/     # API 网关 (Node.js/Fastify)
│   ├── ai-dispatch/     # AI 调度 (Python/FastAPI)
│   │   ├── src/
│   │   │   ├── hermes.py    # Hermes 统一适配层
│   │   │   ├── openclaw.py  # OpenClaw 编排链
│   │   │   └── providers/   # 各模型 Provider
│   │   └── main.py          # API 入口
│   ├── export-service/  # 简历导出 (Python/FastAPI)
│   ├── payment-service/ # 支付订阅 (Python/FastAPI)
│   ├── analytics-service/ # 数据分析 (Python/FastAPI)
│   ├── resume-service/  # 简历CRUD (Node.js/Fastify)
│   ├── user-service/    # 用户认证 (Node.js/Fastify)
│   └── template-service/ # 模板管理 (Node.js/Fastify)
├── packages/
│   ├── shared-types/    # TypeScript 共享类型
│   ├── ai-client/       # AI 客户端 SDK
│   └── ui-kit/          # UI 组件库
├── infra/               # 基础设施配置
├── .env.dev             # 开发环境配置
├── .env.prod            # 生产环境配置
├── docker-compose.yml   # Docker 编排
├── start-dev.sh         # 本地一键启动
└── deploy.sh            # 生产部署脚本
```

---

## 🗄️ 数据库

| 服务 | 本地开发 | 生产环境 |
|------|---------|---------|
| 用户/简历 | SQLite | PostgreSQL |
| 支付 | SQLite | PostgreSQL |
| 分析 | SQLite | ClickHouse |
| 缓存 | 内存 | Redis |
| 文件 | 本地文件 | MinIO (S3) |

---

## 🔧 配置说明

### 环境变量

```bash
# 数据库（开发用 SQLite，无需 Docker）
PAYMENT_DB_BACKEND=sqlite
ANALYTICS_DB_BACKEND=sqlite

# AI Mock 模式（无需 API Key）
MOCK_MODE=true
MOCK_AI=true

# 生产环境需要设置：
# OPENAI_API_KEY=sk-xxx
# ANTHROPIC_API_KEY=sk-ant-xxx
```

---

## 📊 测试

```bash
# AI 调度服务
cd services/ai-dispatch && python -m pytest tests/ -v

# 导出服务
cd services/export-service && python -m pytest tests/ -v

# 支付服务
cd services/payment-service && python -m pytest tests/ -v

# 全部测试
make test-python
```

当前测试覆盖：
- ✅ AI 调度: 45 测试
- ✅ 导出服务: 22 测试
- ✅ 支付服务: 50 测试
- ✅ 总计: **117 测试全部通过**

---

## 📄 License

MIT © [Taoj2025](https://github.com/Taoj2025)
