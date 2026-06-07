FROM node:20-alpine AS base
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# ---- 依赖阶段 ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/api-gateway/package.json ./services/api-gateway/
RUN pnpm install --frozen-lockfile

# ---- 构建阶段 ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./
COPY . .
RUN pnpm --filter @resumeai/api-gateway build

# ---- 运行阶段 ----
FROM base
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/api-gateway/dist ./dist
COPY --from=builder /app/services/api-gateway/package.json ./package.json
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
