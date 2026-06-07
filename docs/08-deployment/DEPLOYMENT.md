# 部署方案文档

**模块**: 08-deployment  
**版本**: v1.0.0  
**状态**: 规划中

---

## 1. 部署环境

| 环境 | 用途 | 域名 |
|------|------|------|
| Development | 本地开发 | localhost |
| Staging | 测试验证 | staging.resumeai.app |
| Production | 生产环境 | resumeai.app |

---

## 2. 容器化（Docker）

### 2.1 目录结构

```
docker/
├── user-service/
│   └── Dockerfile
├── resume-service/
│   └── Dockerfile
├── ai-dispatch/
│   └── Dockerfile
├── export-service/
│   └── Dockerfile
├── web/
│   └── Dockerfile
└── nginx/
    ├── Dockerfile
    └── nginx.conf
```

### 2.2 Docker Compose（本地开发）

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: resumeai
      POSTGRES_USER: resumeai
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  user-service:
    build: ./services/user-service
    environment:
      - DATABASE_URL=postgresql://resumeai:${POSTGRES_PASSWORD}@postgres:5432/resumeai
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on: [postgres, redis]
    ports:
      - "3001:3001"

  resume-service:
    build: ./services/resume-service
    environment:
      - DATABASE_URL=postgresql://resumeai:${POSTGRES_PASSWORD}@postgres:5432/resumeai
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
    depends_on: [postgres, redis]
    ports:
      - "3002:3002"

  ai-dispatch:
    build: ./services/ai-dispatch
    environment:
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    depends_on: [redis]
    ports:
      - "3004:3004"

  export-service:
    build: ./services/export-service
    environment:
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
    depends_on: [redis, minio]
    ports:
      - "3005:3005"

  web:
    build: ./apps/web
    environment:
      - NEXT_PUBLIC_API_URL=http://nginx/api
    depends_on: [user-service, resume-service]
    ports:
      - "3000:3000"

  nginx:
    build: ./docker/nginx
    ports:
      - "80:80"
      - "443:443"
    depends_on: [web, user-service, resume-service, ai-dispatch]

volumes:
  postgres_data:
  minio_data:
```

### 2.3 Node.js 服务 Dockerfile

```dockerfile
# services/user-service/Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
USER appuser
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

### 2.4 Python 服务 Dockerfile

```dockerfile
# services/ai-dispatch/Dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
RUN pip install uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

FROM python:3.12-slim AS runner
WORKDIR /app
RUN addgroup --system appgroup && adduser --system --group appuser
COPY --from=builder /app/.venv ./.venv
COPY . .
USER appuser
EXPOSE 3004
CMD [".venv/bin/python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3004"]
```

---

## 3. Kubernetes 生产部署

### 3.1 命名空间规划

```yaml
namespaces:
  - resumeai-prod      # 生产环境
  - resumeai-staging   # 预发布环境
  - resumeai-infra     # 基础设施（监控、日志等）
```

### 3.2 Resume Service Deployment

```yaml
# k8s/resume-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resume-service
  namespace: resumeai-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: resume-service
  template:
    spec:
      containers:
      - name: resume-service
        image: resumeai/resume-service:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 15
          periodSeconds: 20
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: resume-service-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: resume-service
```

### 3.3 HPA 自动扩缩容

```yaml
# k8s/resume-service/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: resume-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: resume-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## 4. 云平台部署选项

### 4.1 国内云（推荐）

```
腾讯云 TKE（容器服务）+ COS（对象存储）+ CDB（PostgreSQL）+ Redis
或
阿里云 ACK + OSS + PolarDB + Redis
```

### 4.2 国际云

```
AWS EKS + S3 + RDS + ElastiCache
或
Google Cloud GKE + GCS + Cloud SQL + Memorystore
```

### 4.3 快速本地部署（单机）

```bash
# 一键部署脚本
git clone https://github.com/resumeai/resumeai.git
cd resumeai
cp .env.example .env
# 编辑 .env 填入 API Keys
docker compose up -d
# 访问 http://localhost:3000
```

---

## 5. 移动端发布

### 5.1 iOS App Store

```bash
# 构建
cd apps/mobile
eas build --platform ios --profile production

# 提交审核
eas submit --platform ios
```

### 5.2 Android Google Play

```bash
eas build --platform android --profile production
eas submit --platform android
```

### 5.3 OTA 热更新（Expo Updates）

```bash
# 发布 JS Bundle 更新（无需 App Store 审核）
eas update --branch production --message "Fix AI generation timeout"
```

---

## 6. 环境变量规范

```bash
# .env.example
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/resumeai
REDIS_URL=redis://:password@localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-64-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-64-chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# AI API Keys（系统级）
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
BAIDU_API_KEY=...
ALIBABA_API_KEY=...

# 对象存储
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=resumeai

# 支付
WECHAT_PAY_MCH_ID=...
WECHAT_PAY_KEY=...
ALIPAY_APP_ID=...
ALIPAY_PRIVATE_KEY=...

# 其他
APP_ENV=production
LOG_LEVEL=info
CORS_ORIGINS=https://resumeai.app,https://www.resumeai.app
```

---

## 7. 发布流程

```
代码提交 → GitHub Actions 触发
    ↓
单元测试 + 集成测试 通过
    ↓
构建 Docker 镜像，推送 ECR/CR
    ↓
自动部署到 Staging 环境
    ↓
E2E 测试通过
    ↓
人工审批（生产发布）
    ↓
蓝绿部署到 Production
    ↓
监控大盘观察 15 分钟
    ↓
完成 or 回滚
```

---

*关联文档: [架构设计](../01-architecture/ARCHITECTURE.md) | [安全合规](../09-security/SECURITY.md)*
