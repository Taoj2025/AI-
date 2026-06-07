# ResumeAI — AI 智能简历生成平台

> 商业级移动端 + Web 双平台 AI 简历生成 App，集成 OpenClaw 多模型编排框架与 Hermes 统一 API 适配层

---

## 项目概览

ResumeAI 是一款面向求职者的 AI 驱动简历生成平台，支持：

- 多模态信息录入（文字、图片、PPT、PDF、语音）
- 多大模型 API 调用（OpenAI、Claude、Gemini、文心一言、通义千问等）
- 针对不同公司类型（互联网/外企/国企/创业公司）生成定制化简历版本
- 多种简历风格模板（极简风、商务风、创意风、技术风等）
- 多格式导出（PDF、Word、PPT、PNG/JPG、HTML、在线链接）
- 在线编辑器，支持实时预览与修改
- 小红书/知乎风格 UI，社区分享功能

---

## 文档结构

```
docs/
├── 01-architecture/     # 系统架构设计
├── 02-frontend/         # 前端开发规范
├── 03-backend/          # 后端服务设计
├── 04-ai-engine/        # AI 引擎集成（OpenClaw + Hermes）
├── 05-data/             # 数据库与存储设计
├── 06-export/           # 导出模块设计
├── 07-testing/          # 测试策略与用例
├── 08-deployment/       # 部署方案
├── 09-security/         # 安全合规
└── 10-business/         # 商业模式与运营
```

---

## 技术栈速览

| 层级 | 技术选型 |
|------|---------|
| 移动端 | React Native 0.74 + Expo |
| Web 前端 | Next.js 14 + Tailwind CSS + shadcn/ui |
| 后端 | Node.js (Express/Fastify) + Python (FastAPI) |
| AI 引擎 | OpenClaw + Hermes 双框架 |
| 数据库 | PostgreSQL 16 + Redis 7 |
| 文件存储 | MinIO / 腾讯云 COS |
| 容器化 | Docker + Kubernetes |
| CI/CD | GitHub Actions |

---

## 快速开始

详见各模块文档：

1. [架构设计](docs/01-architecture/ARCHITECTURE.md)
2. [前端开发](docs/02-frontend/FRONTEND.md)
3. [后端服务](docs/03-backend/BACKEND.md)
4. [AI 引擎](docs/04-ai-engine/AI_ENGINE.md)
5. [数据层](docs/05-data/DATABASE.md)
6. [导出模块](docs/06-export/EXPORT.md)
7. [测试方案](docs/07-testing/TESTING.md)
8. [部署方案](docs/08-deployment/DEPLOYMENT.md)
9. [安全合规](docs/09-security/SECURITY.md)
10. [商业模式](docs/10-business/BUSINESS.md)

---

## 开发原则

- **SOLID 原则** — 单一职责、开闭原则贯穿全栈
- **DRY** — 复用优先，避免重复逻辑
- **测试先行** — 每个模块必须有完整测试用例通过后方可合并
- **合规优先** — 数据隐私、GDPR/PIPL 合规，内容安全审核
- **渐进增强** — 核心功能离线可用，AI 增强功能联网提供

---

*版本: v0.1.0 | 文档更新: 2026-06-07*
