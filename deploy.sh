#!/bin/bash
# ============================================================
# ResumeAI Docker Compose 一键部署脚本
# 用法: bash deploy.sh [prod|dev]
# ============================================================
set -e

MODE="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 ResumeAI 部署脚本 - 模式: $MODE"
echo ""

# ---- 1. 检查环境 ----
if ! command -v docker &> /dev/null; then
    echo "❌ 请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    if ! docker compose version &> /dev/null; then
        echo "❌ 请先安装 Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
fi

DOCKER_COMPOSE="docker-compose"
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
fi

# ---- 2. 创建 .env ----
if [ ! -f ".env" ]; then
    echo "📝 创建 .env 配置文件..."
    if [ -f ".env.prod" ]; then
        cp .env.prod .env
    elif [ -f ".env.example" ]; then
        cp .env.example .env
    fi
    # 生成随机 JWT Secret
    if [ "$MODE" = "prod" ]; then
        JWT_SECRET=$(openssl rand -hex 64 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(64))" 2>/dev/null)
        if [ -n "$JWT_SECRET" ]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/JWT_SECRET=CHANGE_ME_TO_A_RANDOM_64_CHAR_STRING/JWT_SECRET=$JWT_SECRET/" .env
            else
                sed -i "s/JWT_SECRET=CHANGE_ME_TO_A_RANDOM_64_CHAR_STRING/JWT_SECRET=$JWT_SECRET/" .env
            fi
        fi
    fi
    echo "✅ .env 文件已创建"
else
    echo "📝 .env 文件已存在，跳过创建"
fi

# ---- 3. 创建必需目录 ----
mkdir -p volumes/postgres volumes/redis volumes/minio volumes/clickhouse

# ---- 4. 启动服务 ----
echo ""
echo "🐳 启动所有服务 (Docker Compose)..."
$DOCKER_COMPOSE up -d --build

echo ""
echo "⏳ 等待服务启动健康检查..."
sleep 10

# ---- 5. 检查服务状态 ----
echo ""
echo "📊 服务状态:"
$DOCKER_COMPOSE ps

echo ""
echo "🔍 健康检查:"
# 检查 API Gateway
for i in $(seq 1 12); do
    if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
        echo "  ✅ API Gateway (localhost:8080) - 健康"
        break
    fi
    if [ $i -eq 12 ]; then
        echo "  ⚠️  API Gateway 未就绪，请稍后检查"
    else
        sleep 5
    fi
done

echo ""
echo "========================================"
echo "🎉 ResumeAI 部署完成！"
echo "========================================"
echo "Web 前端:   http://localhost:8080"
echo "API 网关:   http://localhost:3000"
echo "MinIO 控制台: http://localhost:9001"
echo ""
echo "查看日志: $DOCKER_COMPOSE logs -f"
echo "停止服务: $DOCKER_COMPOSE down"
echo "========================================"
