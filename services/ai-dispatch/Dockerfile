# AI Dispatch Service — OpenClaw 编排 + Hermes 适配
FROM python:3.13-slim
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY services/ai-dispatch/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 复制源码
COPY services/ai-dispatch/src/ ./src/
COPY services/ai-dispatch/main.py ./

EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3003", "--workers", "2"]
