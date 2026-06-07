FROM node:20-alpine AS base
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# ---- 依赖阶段 ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/user-service/package.json ./services/user-service/
RUN pnpm install --frozen-lockfile

# ---- 构建阶段 ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./
COPY . .
RUN pnpm --filter @resumeai/user-service build

# ---- 运行阶段 ----
FROM base
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/user-service/dist ./dist
COPY --from=builder /app/services/user-service/package.json ./package.json
EXPOSE 3004
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3004/health || exit 1
CMD ["node", "dist/index.js"]
