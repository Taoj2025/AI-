# ResumeAI 项目长期记忆

## 项目简介
AI 智能简历生成平台，商业级移动端 + Web 双平台。

## 关键决策
- 架构: 前后端分离 + 微服务（8个服务 + API Gateway）
- 数据库: PostgreSQL 16(14张表) + Redis 7 + MinIO
- 端口分配: Gateway(3000) / Resume(3001) / Export(3002) / AI(3003) / User(3004) / Template(3005) / Analytics(3006) / Payment(3007)
- AI引擎: OpenClaw (编排) + Hermes (适配层)，支持14+款大模型
- 移动端: React Native 0.74 + Expo
- Web: Next.js 14 + Tailwind CSS
- 数据库: PostgreSQL 16 + Redis 7 + MinIO
- 包管理: pnpm + Turborepo monorepo
- PDF导出: reportlab（纯Python，无系统依赖）

## 支持的AI模型（14+款）
国际: GPT-4o/Mini, Claude-3.5-Sonnet/3-Opus, Gemini-1.5-Pro/2.0-Flash
国产: 文心一言4.0, 通义千问Max, 腾讯混元Pro, 智谱GLM-4-Plus, DeepSeek-Chat/Coder, Moonshot-v1-128K, 零一万物Yi-Large

## 核心特色
- 5种公司类型适配（互联网大厂/外企/国企/创业/咨询）
- 多模态输入（文字/PDF/Word/PPT/图片/语音）
- 7种导出格式（PDF/Word/PPT/PNG/JPG/HTML/Markdown）
- 6种简历风格（经典/现代/极简/创意/学术/高管）
- ATS 关键词优化

## 测试结果（总计 120/120 全部通过 ✅）
- AI Dispatch: 45/45 ✅
- Export Service: 22/22 ✅
- Template Service: 28/28 ✅
- User Service: 25/25 ✅

## 完整目录结构
- docs/ — 10个模块规划文档
- services/ai-dispatch/ — Python AI调度（Hermes+OpenClaw，45测试，FastAPI入口）
- services/api-gateway/ — Node.js Fastify 统一网关（路由转发+JWT+限流+日志）
- services/resume-service/ — Node.js Fastify 简历CRUD + Prisma
- services/export-service/ — Python FastAPI 导出（7种格式，22测试）
- services/user-service/ — Node.js Fastify 用户认证（25测试）
- services/template-service/ — Python FastAPI 模板管理（28测试，10个默认模板）
- services/analytics-service/ — Python FastAPI 数据分析（事件追踪+漏斗+DAU）
- services/payment-service/ — Python FastAPI 支付订阅（4档套餐+4渠道）
- packages/ai-client/ — 前端AI调用SDK（14+模型注册表+流式生成）
- packages/shared-types/ — TypeScript 共享类型
- packages/ui-components/ — 共享UI组件库（12个组件：Button/Input/Card/Badge/Modal等）
- apps/mobile/ — React Native App（6个屏幕+编辑器+导出弹窗+Zustand）
- apps/web/ — Next.js 14 Web（首页+模板市场+编辑器向导+Tailwind）
- infra/ — Docker Compose(8服务) + Nginx(全路由) + PostgreSQL init.sql(14张表)
- .github/workflows/ — CI/CD + PR质量门禁（覆盖全部服务）

## 商业模式
- FREE / BASIC(¥29) / PRO(¥79) / ENTERPRISE(定制)
- 目标: 6个月10万用户，付费转化5%，MRR ¥10万
