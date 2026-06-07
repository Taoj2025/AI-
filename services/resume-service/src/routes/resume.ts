// ============================================================
// ResumeAI - Resume 路由：CRUD + 版本管理
// ============================================================
import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { prisma, redis } from '../index.js';
import { authMiddleware } from '../middleware/auth.js';

const ResumeRoutes = async (fastify: FastifyInstance) => {
  // ---- 创建简历 ----
  fastify.post<{ Body: CreateResumeBody }>('/', {
    preHandler: authMiddleware,
    schema: {
      body: Type.Object({
        title: Type.String({ minLength: 1, maxLength: 200 }),
        companyType: Type.Union([
          Type.Literal('internet'), Type.Literal('foreign'),
          Type.Literal('state'), Type.Literal('startup'), Type.Literal('consulting'),
        ]),
        style: Type.Optional(Type.String()),
        initialData: Type.Optional(Type.Any()),
      }),
    },
    handler: async (request, reply) => {
      const { title, companyType, style = 'modern', initialData } = request.body;
      const userId = request.user.id;

      // 检查配额
      const count = await prisma.resume.count({ where: { userId } });
      const limits = { free: 3, basic: 20, pro: 999, enterprise: 9999 };
      const tier = request.user.subscription as keyof typeof limits;
      if (count >= (limits[tier] ?? 3)) {
        return reply.status(403).send({
          success: false,
          error: { code: 'QUOTA_EXCEEDED', message: '简历数量已达上限，请升级订阅' },
        });
      }

      const resume = await prisma.resume.create({
        data: {
          userId,
          title,
          companyType,
          style: style ?? 'modern',
          data: initialData ?? {},
          isPublic: false,
        },
      });

      return reply.status(201).send({ success: true, data: resume });
    },
  });

  // ---- 获取简历列表 ----
  fastify.get('/', {
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const userId = request.user.id;
      const { page = '1', pageSize = '20' } = request.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(pageSize);
      const take = Math.min(parseInt(pageSize), 100);

      const [resumes, total] = await Promise.all([
        prisma.resume.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          skip,
          take,
        }),
        prisma.resume.count({ where: { userId } }),
      ]);

      return reply.send({
        success: true,
        data: resumes,
        meta: { page: parseInt(page), pageSize: take, total },
      });
    },
  });

  // ---- 获取单份简历 ----
  fastify.get('/:id', {
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user.id;

      const resume = await prisma.resume.findFirst({
        where: { id, userId },
      });

      if (!resume) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '简历不存在' },
        });
      }

      // 写入缓存
      await redis.setEx(`resume:${id}`, 300, JSON.stringify(resume));

      return reply.send({ success: true, data: resume });
    },
  });

  // ---- 更新简历 ----
  fastify.put('/:id', {
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user.id;
      const { title, data, isPublic } = request.body as any;

      const existing = await prisma.resume.findFirst({ where: { id, userId } });
      if (!existing) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '简历不存在' } });
      }

      const updated = await prisma.resume.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(data !== undefined && { data }),
          ...(isPublic !== undefined && { isPublic }),
          updatedAt: new Date(),
        },
      });

      // 失效缓存
      await redis.del(`resume:${id}`);

      return reply.send({ success: true, data: updated });
    },
  });

  // ---- 删除简历 ----
  fastify.delete('/:id', {
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user.id;

      const existing = await prisma.resume.findFirst({ where: { id, userId } });
      if (!existing) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '简历不存在' } });
      }

      await prisma.resume.delete({ where: { id } });
      await redis.del(`resume:${id}`);

      return reply.send({ success: true, data: { message: '简历已删除' } });
    },
  });
};

export default ResumeRoutes;
