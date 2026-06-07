# Export Service - 简历导出微服务
# 支持: PDF / Word / PPT / PNG / JPG / HTML / Markdown

FROM python:3.13-slim AS base
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ---- 依赖+构建阶段 ----
FROM base AS builder
COPY services/export-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY services/export-service/src ./src/

EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3002", "--workers", "2"]
