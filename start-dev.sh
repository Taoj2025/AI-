#!/bin/bash
# ============================================================
# ResumeAI 一键本地开发启动脚本
# 无需 Docker，SQLite 数据库，Mock AI 模式
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================================"
echo "  ResumeAI — 本地开发环境启动"
echo "  无需 Docker · SQLite · Mock AI"
echo "================================================"
echo ""

# ---- 1. 检查环境 ----
echo "📋 检查环境..."

if ! command -v node &> /dev/null; then
    echo "❌ 需要 Node.js: https://nodejs.org/"
    exit 1
fi

if ! command -v python &> /dev/null; then
    echo "❌ 需要 Python 3.9+"
    exit 1
fi

# ---- 2. 创建数据目录 ----
mkdir -p data

# ---- 3. 安装依赖 ----
echo "📦 安装依赖..."
cd services/ai-dispatch && pip install -q -r requirements.txt && cd ../..
cd services/export-service && pip install -q -r requirements.txt && cd ../..
cd services/payment-service && pip install -q -r requirements.txt && cd ../..
cd services/analytics-service && pip install -q -r requirements.txt && cd ../..

# ---- 4. 设置环境变量 ----
export MOCK_MODE=true
export MOCK_AI=true
export PAYMENT_DB_BACKEND=sqlite
export ANALYTICS_DB_BACKEND=sqlite
export LOG_LEVEL=info
export NEXT_TELEMETRY_DISABLED=1

echo ""
echo "🚀 启动服务..."

# ---- 5. 启动服务 ----
# AI 调度服务 (端口 3003)
echo "  [1/4] AI 调度服务 → :3003"
cd services/ai-dispatch && python -m uvicorn main:app --host 0.0.0.0 --port 3003 &
AI_PID=$!
cd "$SCRIPT_DIR"

# 导出服务 (端口 3002)
echo "  [2/4] 导出服务 → :3002"
cd services/export-service && python -m uvicorn src.main:app --host 0.0.0.0 --port 3002 &
EXPORT_PID=$!
cd "$SCRIPT_DIR"

# 支付服务 (端口 3007)
echo "  [3/4] 支付服务 → :3007"
cd services/payment-service && python -m uvicorn src.index:app --host 0.0.0.0 --port 3007 &
PAYMENT_PID=$!
cd "$SCRIPT_DIR"

# Web 前端 (端口 8080)
echo "  [4/4] Web 前端 → :8080"
cd apps/web && npx next dev --port 8080 &
WEB_PID=$!
cd "$SCRIPT_DIR"

echo ""
echo "================================================"
echo "  ✅ 所有服务已启动！"
echo "================================================"
echo "  Web 前端:     http://localhost:8080"
echo "  AI 调度:      http://localhost:3003"
echo "  导出服务:     http://localhost:3002"
echo "  支付服务:     http://localhost:3007"
echo "================================================"
echo "  停止: kill $AI_PID $EXPORT_PID $PAYMENT_PID $WEB_PID"
echo "  或:   bash dev-stop.sh"
echo "================================================"

# 等待任意子进程退出
wait
