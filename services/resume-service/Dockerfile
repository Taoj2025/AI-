FROM node:20-alpine AS base
WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# ---- 依赖阶段 ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY services/resume-service/package.json ./services/resume-service/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile

# ---- 构建阶段 ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./
COPY . .
RUN pnpm --filter @resumeai/resume-service build

# ---- 运行阶段 ----
FROM base
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/resume-service/dist ./dist
COPY --from=builder /app/services/resume-service/package.json ./package.json
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
