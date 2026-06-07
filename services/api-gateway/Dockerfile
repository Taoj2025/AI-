# API Gateway — 统一入口 (npm)
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps
COPY services/api-gateway/package.json services/api-gateway/package-lock.json ./
RUN npm ci

# Copy source & build
COPY services/api-gateway/tsconfig.json ./
COPY services/api-gateway/src ./src/
RUN npm run build

# ---- Production ----
FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
