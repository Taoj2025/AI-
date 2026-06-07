/**
 * 认证路由 — 注册/登录/JWT刷新/OAuth
 */
import { FastifyInstance } from 'fastify';

// ---- Zod 验证 Schema ----
export const RegisterSchema = {
  body: {
    type: 'object',
    required: ['phone', 'password', 'code'],
    properties: {
      phone: { type: 'string', pattern: '^1[3-9]\\d{9}$', description: '中国手机号' },
      email: { type: 'string', format: 'email', description: '邮箱（可选）' },
      password: { type: 'string', minLength: 8, maxLength: 64 },
      code: { type: 'string', length: 6, description: '短信验证码' },
      inviteCode: { type: 'string', description: '邀请码（可选）' },
    },
  },
};

export const LoginSchema = {
  body: {
    type: 'object',
    required: ['identity', 'password'],
    properties: {
      identity: { type: 'string', description: '手机号或邮箱' },
      password: { type: 'string' },
      captchaToken: { type: 'string', description: '图形验证码Token（防暴力破解）' },
    },
  },
};

export const RefreshSchema = {
  body: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string' },
    },
  },
};

export const OAuthCallbackSchema = {
  body: {
    type: 'object',
    required: ['provider', 'code'],
    properties: {
      provider: { type: 'string', enum: ['wechat', 'apple', 'google', 'github'] },
      code: { type: 'string' },
      state: { type: 'string' },
    },
  },
};

// ---- 内存存储（MVP阶段，后续接入 Redis + PostgreSQL） ----
interface UserRecord {
  id: string;
  phone: string;
  email?: string;
  passwordHash: string;
  nickname: string;
  avatar?: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  createdAt: string;
  refreshToken?: string;
}

const users: Map<string, UserRecord> = new Map();
const smsCodes: Map<string, { code: string; expiresAt: number }> = new Map();
let userCounter = 0;

// 简单密码哈希（MVP，生产用 argon2）
async function hashPassword(pwd: string): Promise<string> {
  // 在沙箱中不用 argon2，用简单 hash 模拟
  const encoder = new TextEncoder();
  const data = encoder.encode(pwd + 'resumeai-salt');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function verifyPassword(pwd: string, hash: string): Promise<boolean> {
  const pwdHash = await hashPassword(pwd);
  return pwdHash === hash;
}

function generateToken(): string {
  return Math.random().toString(36).substring(2, 15);
}

// ---- 路由注册 ----
export async function registerRoutes(fastify: FastifyInstance) {
  /**
   * @route POST /api/auth/send-code
   * @desc 发送短信验证码
   */
  fastify.post('/send-code', {
    schema: {
      body: {
        type: 'object',
        required: ['phone'],
        properties: {
          phone: { type: 'string', pattern: '^1[3-9]\\d{9}$' },
        },
      },
    },
  }, async (request: any) => {
    const { phone } = request.body as { phone: string };

    // 检查发送频率（60秒内不重复发送）
    const existing = smsCodes.get(phone);
    if (existing && existing.expiresAt > Date.now() - 55000) {
      return { success: false, error: '验证码已发送，请60秒后再试' };
    }

    // 生成6位验证码
    const code = String(Math.floor(100000 + Math.random() * 900000));
    smsCodes.set(phone, { code, expiresAt: Date.now() + 300000 }); // 5分钟有效

    // TODO: 接入短信服务商（阿里云SMS/腾讯云SMS）
    fastify.log.info(`[SMS] 验证码已发送: ${phone} -> ${code}`);

    return { success: true, message: '验证码已发送' };
  });

  /**
   * @route POST /api/auth/register
   * @desc 用户注册
   */
  fastify.post('/register', { schema: RegisterSchema }, async (request: any) => {
    const { phone, email, password, code, inviteCode } = request.body;

    // 验证短信验证码
    const smsRecord = smsCodes.get(phone);
    if (!smsRecord || smsRecord.code !== code || smsRecord.expiresAt < Date.now()) {
      return { error: '验证码无效或已过期' };
    }

    // 检查手机号是否已注册
    for (const [, u] of users) {
      if (u.phone === phone) {
        return { error: '该手机号已注册' };
      }
    }

    // 创建用户
    const passwordHash = await hashPassword(password);
    userCounter++;
    const userId = `user_${String(userCounter).padStart(6, '0')}`;

    const refreshToken = generateToken();
    const user: UserRecord = {
      id: userId,
      phone,
      email,
      passwordHash,
      nickname: `用户${userCounter}`,
      plan: 'free',
      createdAt: new Date().toISOString(),
      refreshToken,
    };

    users.set(userId, user);
    smsCodes.delete(phone);

    // 生成 JWT
    const token = await fastify.jwt.sign({
      sub: userId,
      phone,
      plan: 'free',
      type: 'access',
    }, { expiresIn: '7d' });

    return {
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: userId,
          phone,
          email,
          nickname: user.nickname,
          plan: 'free',
        },
      },
    };
  });

  /**
   * @route POST /api/auth/login
   * @desc 用户登录（手机号/邮箱 + 密码）
   */
  fastify.post('/login', { schema: LoginSchema }, async (request: any) => {
    const { identity, password } = request.body;

    // 查找用户
    let foundUser: UserRecord | undefined;
    for (const [, u] of users) {
      if (u.phone === identity || u.email === identity) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      return { error: '账号或密码错误' };
    }

    // 验证密码
    const valid = await verifyPassword(password, foundUser.passwordHash);
    if (!valid) {
      return { error: '账号或密码错误' };
    }

    // 生成 JWT
    const refreshToken = generateToken();
    foundUser.refreshToken = refreshToken;

    const token = await fastify.jwt.sign({
      sub: foundUser.id,
      phone: foundUser.phone,
      plan: foundUser.plan,
      type: 'access',
    }, { expiresIn: '7d' });

    return {
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: foundUser.id,
          phone: foundUser.phone,
          email: foundUser.email,
          nickname: foundUser.nickname,
          avatar: foundUser.avatar,
          plan: foundUser.plan,
        },
      },
    };
  });

  /**
   * @route POST /api/auth/refresh
   * @desc 刷新 Token
   */
  fastify.post('/refresh', { schema: RefreshSchema }, async (request: any) => {
    const { refreshToken } = request.body;

    for (const [, u] of users) {
      if (u.refreshToken === refreshToken) {
        const newRefreshToken = generateToken();
        u.refreshToken = newRefreshToken;

        const token = await fastify.jwt.sign({
          sub: u.id,
          phone: u.phone,
          plan: u.plan,
          type: 'access',
        }, { expiresIn: '7d' });

        return {
          success: true,
          data: { token, refreshToken: newRefreshToken },
        };
      }
    }

    return { error: 'Refresh Token 无效' };
  });

  /**
   * @route POST /api/auth/oauth/callback
   * @desc 第三方OAuth登录回调（微信/Apple/Google/GitHub）
   */
  fastify.post('/oauth/callback', { schema: OAuthCallbackSchema }, async (request: any) => {
    const { provider, code } = request.body;

    // TODO: 实际对接各平台 OAuth API
    // 微信: https://api.weixin.qq.com/sns/oauth2/access_token
    // Apple: https://appleid.apple.com/auth/token
    // Google: https://oauth2.googleapis.com/token
    // GitHub: https://github.com/login/oauth/access_token

    fastify.log.info(`[OAuth] ${provider} callback, code=${code.substring(0, 8)}...`);

    // 模拟：创建或查找 OAuth 用户
    const oauthUserId = `oauth_${provider}_${code.substring(0, 8)}`;
    let user = users.get(oauthUserId);

    if (!user) {
      userCounter++;
      const userId = oauthUserId;
      user = {
        id: userId,
        phone: '',
        passwordHash: await hashPassword(generateToken()),
        nickname: `${provider}用户`,
        plan: 'free',
        createdAt: new Date().toISOString(),
        refreshToken: generateToken(),
      };
      users.set(userId, user);
    }

    const token = await fastify.jwt.sign({
      sub: user.id,
      phone: user.phone,
      plan: user.plan,
      type: 'access',
    }, { expiresIn: '7d' });

    return {
      success: true,
      data: {
        token,
        refreshToken: user.refreshToken,
        user: {
          id: user.id,
          nickname: user.nickname,
          plan: user.plan,
        },
      },
    };
  });

  /**
   * @route POST /api/auth/logout
   * @desc 退出登录
   */
  fastify.post('/logout', async (request: any) => {
    try {
      const decoded = await request.jwtVerify<{ sub: string }>();
      const user = users.get(decoded.sub);
      if (user) {
        user.refreshToken = undefined;
      }
    } catch {
      // Token 无效也直接返回成功
    }
    return { success: true, message: '已退出登录' };
  });
}

// 导出内存存储（供测试使用）
export { users, smsCodes, hashPassword, verifyPassword };
