# Analytics Service — 数据分析微服务 v2.0 (ClickHouse)
FROM python:3.13-slim
WORKDIR /app

# Install system deps for clickhouse-connect
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY services/analytics-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY services/analytics-service/src/ ./src/
COPY services/analytics-service/tests/ ./tests/

EXPOSE 3006
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:3006/health').raise_for_status()" || exit 1

CMD ["uvicorn", "src.index:app", "--host", "0.0.0.0", "--port", "3006", "--workers", "2"]
