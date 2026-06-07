/**
 * API Gateway — ResumeAI 统一入口
 *
 * 职责:
 *   1. 路由转发 (Proxy) — 将请求转发到对应微服务
 *   2. JWT 认证 — 验证 Token (排除公开路径)
 *   3. 全局限流 — 保护所有端点
 *   4. 请求日志 — 记录访问日志
 *   5. CORS / Helmet / Gzip
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import compress from "@fastify/compress";
import http from "http";

// ──────────────── 配置 ────────────────

const PORT = parseInt(process.env.API_GATEWAY_PORT || "3000", 10);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

// 各微服务地址映射
const SERVICES: Record<string, string> = {
  "user-service": process.env.USER_SERVICE_URL || "http://user-service:3004",
  "resume-service": process.env.RESUME_SERVICE_URL || "http://resume-service:3001",
  "export-service": process.env.EXPORT_SERVICE_URL || "http://export-service:3002",
  "ai-dispatch": process.env.AI_DISPATCH_URL || "http://ai-dispatch:3003",
  "template-service": process.env.TEMPLATE_SERVICE_URL || "http://template-service:3005",
  "analytics-service": process.env.ANALYTICS_SERVICE_URL || "http://analytics-service:3006",
  "payment-service": process.env.PAYMENT_SERVICE_URL || "http://payment-service:3007",
};

// 路由 → 服务映射
const ROUTE_MAP: Record<string, string> = {
  "/api/auth": "user-service",
  "/api/users": "user-service",
  "/api/resumes": "resume-service",
  "/api/versions": "resume-service",
  "/api/export": "export-service",
  "/api/generate": "ai-dispatch",
  "/api/ai": "ai-dispatch",
  "/api/templates": "template-service",
  "/api/analytics": "analytics-service",
  "/api/payment": "payment-service",
  "/api/subscriptions": "payment-service",
  "/api/invoices": "payment-service",
  "/api/usage": "payment-service",
};

// 公开路径 (不需要 JWT 认证)
const PUBLIC_PATHS = new Set([
  "/health",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/sms",
  "/api/auth/oauth",
  "/api/templates",
]);

// ──────────────── Fastify 初始化 ────────────────

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          // 不记录 Authorization 头
          headers: { ...req.headers, authorization: undefined },
        };
      },
    },
  },
});

// ──────────────── 插件 ────────────────

await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") || ["*"],
  credentials: true,
});

await app.register(helmet, {
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
});

await app.register(compress, { threshold: 1024 });

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  cache: 10_000,
});

await app.register(jwt, {
  secret: JWT_SECRET,
  sign: { expiresIn: "7d" },
});

// ──────────────── 认证中间件 ────────────────

app.addHook("onRequest", async (request, reply) => {
  const url = request.url;

  // 跳过公开路径
  for (const publicPath of PUBLIC_PATHS) {
    if (url.startsWith(publicPath)) return;
  }

  // 跳过 health
  if (url === "/health") return;

  // 验证 JWT
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ success: false, error: "未授权，请先登录" });
  }
});

// ──────────────── 健康检查 ────────────────

app.get("/health", async () => ({
  status: "ok",
  service: "api-gateway",
  version: "1.0.0",
  services: Object.keys(SERVICES),
  uptime: process.uptime(),
}));

// ──────────────── 代理转发 ────────────────

function proxyRequest(
  request: any,
  reply: any,
  targetService: string,
  targetPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const targetUrl = new URL(targetPath, SERVICES[targetService]);

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      path: targetUrl.pathname + targetUrl.search,
      method: request.method,
      headers: {
        ...request.headers,
        host: targetUrl.host,
        "X-Forwarded-For": request.ip,
        "X-Request-ID": request.id,
      },
    };

    // 转发用户身份信息
    if ((request as any).user) {
      (options.headers as Record<string, string>)["X-User-ID"] = (request as any).user.id;
      (options.headers as Record<string, string>)["X-User-Email"] = (request as any).user.email || "";
    }

    const proxyReq = http.request(options, (proxyRes: http.IncomingMessage) => {
      reply.code(proxyRes.statusCode || 502);

      // 转发响应头
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value) reply.header(key, value);
      }

      proxyRes.pipe(reply.raw);
      proxyRes.on("end", resolve);
      proxyRes.on("error", reject);
    });

    proxyReq.on("error", (err: Error) => {
      request.log.error({ err, targetService, targetPath }, "代理请求失败");
      if (!reply.sent) {
        reply.code(502).send({
          success: false,
          error: "上游服务不可用",
          service: targetService,
        });
      }
      resolve();
    });

    // 转发请求体
    request.raw.pipe(proxyReq);
  });
}

// 注册所有路由
for (const [routePrefix, serviceName] of Object.entries(ROUTE_MAP)) {
  app.all(`${routePrefix}/*`, async (request, reply) => {
    // 保留原始查询参数
    const fullPath = request.url;
    await proxyRequest(request, reply, serviceName, fullPath);
  });

  // 精确匹配（无尾部路径）
  app.all(routePrefix, async (request, reply) => {
    await proxyRequest(request, reply, serviceName, request.url);
  });
}

// ──────────────── 404 ────────────────

app.setNotFoundHandler((request, reply) => {
  reply.code(404).send({
    success: false,
    error: "接口不存在",
    path: request.url,
    availablePrefixes: Object.keys(ROUTE_MAP),
  });
});

// ──────────────── 启动 ────────────────

const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`API Gateway 已启动，端口: ${PORT}`);
    app.log.info(`已注册 ${ROUTE_MAP.length} 条路由规则`);
    app.log.info(`已连接 ${Object.keys(SERVICES).length} 个微服务`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
