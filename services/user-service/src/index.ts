/**
 * User Service — 用户认证与用户管理
 * ResumeAI 微服务
 *
 * 端口: 3000
 * 功能: 注册/登录/JWT刷新/OAuth/个人资料/短信验证码
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { z } from 'zod';
import { registerRoutes } from './routes/auth';
import { profileRoutes } from './routes/profile';

const PORT = parseInt(process.env.USER_SERVICE_PORT || '3004', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// ---- App 启动 ----
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
  ajv: {
    customOptions: { strict: false },
  },
});

async function bootstrap() {
  // 插件注册
  await app.register(cors, {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8081'],
    credentials: true,
  });

  await app.register(jwt, {
    secret: JWT_SECRET,
    sign: { expiresIn: '7d' },
    cookie: { cookieName: 'resumeai-token', signed: false },
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    cache: 10000,
  });

  // 健康检查
  app.get('/health', async () => ({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() }));

  // 路由注册
  await app.register(registerRoutes, { prefix: '/api/auth' });
  await app.register(profileRoutes, { prefix: '/api/profile', hook: 'onRequest' });

  // 全局错误处理
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    if (error.statusCode === 429) {
      reply.status(429).send({ error: '请求过于频繁，请稍后再试' });
      return;
    }
    if (error.statusCode && error.statusCode < 500) {
      reply.status(error.statusCode).send({ error: error.message });
      return;
    }
    reply.status(500).send({ error: '服务内部错误，请稍后再试' });
  });

  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`User Service 启动成功 → http://localhost:${PORT}`);
}

export { app, bootstrap };

// 直接运行
import { fileURLToPath } from 'url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  bootstrap().catch(console.error);
}
