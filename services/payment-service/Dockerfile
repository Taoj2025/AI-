# Payment Service — 支付订阅微服务 v2.0 (Stripe + PostgreSQL)
FROM python:3.12-slim
WORKDIR /app

# Install system deps for asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY services/payment-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY services/payment-service/src/ ./src/
COPY services/payment-service/tests/ ./tests/

EXPOSE 3007
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:3007/health').raise_for_status()" || exit 1

CMD ["uvicorn", "src.index:app", "--host", "0.0.0.0", "--port", "3007", "--workers", "2"]
