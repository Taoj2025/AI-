/**
 * 个人资料路由 — 需要认证
 */
import { FastifyInstance } from 'fastify';
import { users } from './auth';

export async function profileRoutes(fastify: FastifyInstance) {
  // 所有路由需要 JWT 认证
  fastify.addHook('onRequest', async (request: any) => {
    try {
      await request.jwtVerify<{ sub: string; phone: string }>();
    } catch {
      throw fastify.httpErrors.unauthorized('请先登录');
    }
  });

  /**
   * @route GET /api/profile
   * @desc 获取当前用户信息
   */
  fastify.get('/', async (request: any) => {
    const decoded = request.user;
    const user = users.get(decoded.sub);
    if (!user) {
      return { error: '用户不存在' };
    }
    return {
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        plan: user.plan,
        createdAt: user.createdAt,
      },
    };
  });

  /**
   * @route PUT /api/profile
   * @desc 更新个人资料
   */
  fastify.put('/', {
    schema: {
      body: {
        type: 'object',
        properties: {
          nickname: { type: 'string', minLength: 1, maxLength: 30 },
          email: { type: 'string', format: 'email' },
          avatar: { type: 'string', maxLength: 500 },
        },
      },
    },
  }, async (request: any) => {
    const decoded = request.user;
    const user = users.get(decoded.sub);
    if (!user) {
      return { error: '用户不存在' };
    }

    const { nickname, email, avatar } = request.body;
    if (nickname) user.nickname = nickname;
    if (email !== undefined) user.email = email;
    if (avatar !== undefined) user.avatar = avatar;

    return {
      success: true,
      data: { nickname: user.nickname, email: user.email, avatar: user.avatar },
    };
  });

  /**
   * @route PUT /api/profile/password
   * @desc 修改密码
   */
  fastify.put('/password', {
    schema: {
      body: {
        type: 'object',
        required: ['oldPassword', 'newPassword'],
        properties: {
          oldPassword: { type: 'string', minLength: 8 },
          newPassword: { type: 'string', minLength: 8, maxLength: 64 },
        },
      },
    },
  }, async (request: any) => {
    const decoded = request.user;
    const user = users.get(decoded.sub);
    if (!user) {
      return { error: '用户不存在' };
    }

    const { oldPassword, newPassword } = request.body;
    const { verifyPassword, hashPassword } = await import('./auth');

    if (!(await verifyPassword(oldPassword, user.passwordHash))) {
      return { error: '原密码错误' };
    }

    user.passwordHash = await hashPassword(newPassword);
    return { success: true, message: '密码修改成功' };
  });

  /**
   * @route DELETE /api/profile
   * @desc 注销账号
   */
  fastify.delete('/', async (request: any) => {
    const decoded = request.user;
    users.delete(decoded.sub);
    return { success: true, message: '账号已注销' };
  });
}
