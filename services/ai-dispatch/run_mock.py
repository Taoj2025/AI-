"""启动 AI Dispatch 服务 (Mock Mode)"""
import os, sys
os.environ["MOCK_MODE"] = "true"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

import uvicorn
from main import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3004, log_level="info")
