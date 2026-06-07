# Resume Service — 简历 CRUD 微服务 (npm, depends on packages/shared-types)
FROM node:22-alpine AS shared-builder
WORKDIR /app
COPY packages/shared-types/package.json packages/shared-types/package-lock.json ./packages/shared-types/
RUN cd packages/shared-types && npm ci
COPY packages/shared-types/tsconfig.json packages/shared-types/src ./packages/shared-types/
RUN cd packages/shared-types && npm run build

# ---- Build resume-service ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=shared-builder /app/packages/shared-types /app/packages/shared-types
COPY services/resume-service/package.json services/resume-service/package-lock.json ./
RUN npm ci
COPY services/resume-service/tsconfig.json ./
COPY services/resume-service/prisma ./prisma/
COPY services/resume-service/src ./src/
RUN npx prisma generate && npm run build

# ---- Production ----
FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "dist/index.js"]
