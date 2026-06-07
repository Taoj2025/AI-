// ============================================================
// ResumeAI - Version 路由：简历多版本管理
// ============================================================
import Fastify from 'fastify';
import { prisma, redis } from '../index.js';
import { authMiddleware } from '../middleware/auth.js';

const VersionRoutes = async (fastify: FastifyInstance) => {
  // ---- 生成新版本（调用 AI Dispatch 服务）----
  fastify.post('/:id/versions', {
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user.id;
      const { companyType, style, modelPreference } = request.body as any;

      // 验证简历归属
      const resume = await prisma.resume.findFirst({ where: { id, userId } });
      if (!resume) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '简历不存在' } });
      }

      // 调用 AI Dispatch 服务
      const aiDispatchUrl = process.env.AI_DISPATCH_URL ?? 'http://localhost:3003';
      try {
        const aiRes = await fetch(`${aiDispatchUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeId: id,
            baseData: resume.data,
            companyType,
            style,
            modelPreference,
          }),
        });

        if (!aiRes.ok) throw new Error(`AI Dispatch 错误: ${aiRes.statusText}`);

        const aiData = await aiRes.json();

        // 保存版本
        const version = await prisma.resumeVersion.create({
          data: {
            resumeId: id,
            companyType,
            style: style ?? 'modern',
            data: aiData.data,
            atsScore: aiData.atsScore ?? null,
            keywords: aiData.keywords ?? [],
            modelUsed: aiData.modelUsed ?? null,
            tokensUsed: aiData.tokensUsed ?? 0,
          },
        });

        return reply.status(201).send({ success: true, data: version });
      } catch (err: any) {
        return reply.status(502).send({
          success: false,
          error: { code: 'AI_ERROR', message: 'AI 生成失败', details: err.message },
        });
      }
    },
  });

  // ---- 获取所有版本 ----
  fastify.get('/:id/versions', {
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user.id;

      const resume = await prisma.resume.findFirst({ where: { id, userId } });
      if (!resume) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '简历不存在' } });
      }

      const versions = await prisma.resumeVersion.findMany({
        where: { resumeId: id },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ success: true, data: versions });
    },
  });

  // ---- 激活某个版本 ----
  fastify.patch('/:id/versions/:versionId/activate', {
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id, versionId } = request.params as { id: string; versionId: string };
      const userId = request.user.id;

      const resume = await prisma.resume.findFirst({ where: { id, userId } });
      if (!resume) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '简历不存在' } });
      }

      // 取消其他版本激活状态
      await prisma.resumeVersion.updateMany({
        where: { resumeId: id },
        data: { isActive: false },
      });

      // 激活目标版本
      const version = await prisma.resumeVersion.update({
        where: { id: versionId },
        data: { isActive: true },
      });

      return reply.send({ success: true, data: version });
    },
  });
};

export default VersionRoutes;
