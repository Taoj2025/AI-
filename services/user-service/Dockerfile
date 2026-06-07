# User Service — 用户认证微服务 (npm)
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps
COPY services/user-service/package.json services/user-service/package-lock.json ./
RUN npm ci

# Copy source & build
COPY services/user-service/tsconfig.json ./
COPY services/user-service/src ./src/
RUN npm run build

# ---- Production ----
FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3004
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3004/health || exit 1
CMD ["node", "dist/index.js"]
