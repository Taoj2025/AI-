# Template Service — 模板管理微服务
FROM python:3.12-slim
WORKDIR /app

# 安装 Python 依赖
COPY services/template-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 复制源码
COPY services/template-service/src/index.py ./
COPY services/template-service/tests/ ./tests/

EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3005/health || exit 1

CMD ["uvicorn", "index:app", "--host", "0.0.0.0", "--port", "3005", "--workers", "2"]
