// ============================================================
// ResumeAI - Resume Service 入口
// Fastify + Prisma + Redis
// ============================================================
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import resumeRoutes from './routes/resume.js';
import versionRoutes from './routes/version.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

const PORT = parseInt(process.env.RESUME_SERVICE_PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-prod';

// ---- Mock/No-op 适配（无外部依赖时仍可启动）----
export let prisma = null;
export let redis = null;

// 尝试连接 Prisma（PostgreSQL）
try {
  const { PrismaClient } = await import('@prisma/client');
  const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://resumeai:password@localhost:5432/resumeai_db';
  prisma = new PrismaClient({ datasourceUrl: DATABASE_URL });
  await prisma.$connect();
  console.log('[ResumeService] PostgreSQL connected');
} catch (err) {
  console.warn('[ResumeService] PostgreSQL unavailable, running in mock mode');
}

// 尝试连接 Redis
try {
  const Redis = await import('redis');
  const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
  redis = Redis.createClient({ url: REDIS_URL });
  await redis.connect();
  console.log('[ResumeService] Redis connected');
} catch (err) {
  console.warn('[ResumeService] Redis unavailable, running without cache');
}

const app = Fastify({ logger: true, ajv: { customOptions: { strict: false } } });

// ---- 插件注册 ----
app.register(cors, { origin: true, credentials: true });
app.register(jwt, { secret: JWT_SECRET });
app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// ---- 全局中间件 ----
app.addHook('onRequest', authMiddleware);
app.setErrorHandler(errorHandler);

// ---- 路由 ----
app.get('/health', async () => ({ status: 'ok', service: 'resume-service', version: '1.0.0', mock: !prisma }));
app.register(resumeRoutes, { prefix: '/api/resumes' });
app.register(versionRoutes, { prefix: '/api/resumes' });

// ---- 启动 ----
async function start() {
  await app.listen({ port: PORT, host: HOST });
  console.log(`[ResumeService] Listening on http://${HOST}:${PORT}`);
}

start();
