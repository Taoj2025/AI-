// ============================================================
// ResumeAI - 认证中间件
// ============================================================
import Fastify from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string; email: string; subscription: string };
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // 健康检查不需要认证
  if (request.routeOptions.url === '/health') return;

  try {
    const decoded = await request.jwtVerify<{ id: string; email: string; subscription: string }>();
    request.user = decoded;
  } catch (err) {
    // 开发环境允许 Mock 用户
    if (process.env.NODE_ENV !== 'production') {
      request.user = {
        id: 'dev-user-001',
        email: 'dev@resumeai.com',
        subscription: 'pro',
      };
      return;
    }
    reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '认证失败，请提供有效 Token' },
    });
    return;
  }
}
