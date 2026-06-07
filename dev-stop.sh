#!/bin/bash
# 停止所有 ResumeAI 本地开发服务
echo "🛑 停止 ResumeAI 开发服务..."

for PID_FILE in /tmp/resumeai_*.pid; do
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        echo "  停止 PID $PID"
        kill "$PID" 2>/dev/null || true
        rm "$PID_FILE"
    fi
done

# 也尝试按端口找进程
for PORT in 3002 3003 3007 8080; do
    PID=$(lsof -ti :$PORT 2>/dev/null || netstat -ano | findstr ":$PORT " | awk '{print $5}' 2>/dev/null || true)
    if [ -n "$PID" ]; then
        echo "  停止端口 $PORT (PID $PID)"
        kill $PID 2>/dev/null || taskkill /F /PID $PID 2>/dev/null || true
    fi
done

echo "✅ 已停止所有 ResumeAI 服务"
