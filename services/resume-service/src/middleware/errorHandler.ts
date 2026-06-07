// ============================================================
// ResumeAI - 全局错误处理
// ============================================================
import Fastify, { FastifyError } from 'fastify';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const statusCode = error.statusCode ?? 500;

  // Prisma 错误
  if (error.message?.includes('Prisma')) {
    return reply.status(400).send({
      success: false,
      error: { code: 'DB_ERROR', message: '数据库操作失败', details: error.message },
    });
  }

  // Zod / 校验错误
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请求参数校验失败', details: error.validation },
    });
  }

  // 默认 500
  request.log.error(error);
  return reply.status(statusCode).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: statusCode >= 500 ? '服务器内部错误' : error.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
    },
  });
}
