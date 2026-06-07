# Export Service - FastAPI 主入口
# 集成 exporters.py 中的各格式导出器
import os, asyncio, tempfile, pathlib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal
import uuid, json, datetime

app = FastAPI(title="ResumeAI Export Service", version="1.0.0")

# -------- 模型 --------
ExportFormat = Literal['pdf', 'docx', 'pptx', 'png', 'jpg', 'html', 'markdown']

class ExportRequest(BaseModel):
    resume_id: str
    version_id: str
    format: ExportFormat
    options: Optional[dict] = {}

class ExportResponse(BaseModel):
    task_id: str
    status: str
    download_url: Optional[str] = None

# -------- 内存任务存储（生产环境用 Redis）--------
tasks: dict[str, dict] = {}

# -------- 路由 --------
@app.get("/health")
def health():
    return {"status": "ok", "service": "export-service", "version": "1.0.0"}

@app.post("/api/export", response_model=ExportResponse)
async def create_export(req: ExportRequest):
    task_id = str(uuid.uuid4())
    tasks[task_id] = {
        "status": "processing",
        "format": req.format,
        "resume_id": req.resume_id,
        "version_id": req.version_id,
        "created_at": datetime.datetime.utcnow().isoformat(),
        "download_url": None,
    }
    # 用 asyncio.create_task 调度 async 后台任务
    asyncio.create_task(process_export(task_id, req))
    return ExportResponse(task_id=task_id, status="processing")

@app.get("/api/export/{task_id}")
def get_export_status(task_id: str):
    task = tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task

# -------- 从 Resume Service 获取简历数据 --------
async def fetch_resume_data(resume_id: str, version_id: str) -> dict:
    """调用 Resume Service HTTP API 获取简历数据"""
    import httpx
    base = os.getenv("RESUME_SERVICE_URL", "http://localhost:3001")
    url = f"{base}/api/resumes/{resume_id}"
    async with httpx.AsyncClient() as client:
        res = await client.get(url)
        res.raise_for_status()
        json_data = res.json()
        return json_data.get("data", {})

# -------- 后台导出任务 --------
async def process_export(task_id: str, req: ExportRequest):
    """实际导出逻辑（改为 async，避免 asyncio.run()）"""
    try:
        # 获取简历数据
        try:
            resume_data = await fetch_resume_data(req.resume_id, req.version_id)
        except Exception:
            resume_data = {
                "personal": {"name": "测试用户", "title": "测试职位", "email": "test@example.com"},
                "summary": "测试个人总结",
                "work": [], "education": [], "skills": [],
            }

        # 确保导出目录存在
        out_dir = pathlib.Path("/tmp/resumeai_exports")
        out_dir.mkdir(parents=True, exist_ok=True)
        output_path = str(out_dir / f"{task_id}.{req.format}")

        # 根据格式调用对应导出器（同步操作放到线程池，避免阻塞事件循环）
        from .exporters import export_resume
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None, export_resume, resume_data, output_path, req.format, req.options or {}
        )

        # 上传到 MinIO（若配置）
        download_url = output_path
        minio_ep = os.getenv("MINIO_ENDPOINT")
        if minio_ep:
            try:
                from minio import Minio
                client = Minio(
                    minio_ep,
                    access_key=os.getenv("MINIO_ACCESS_KEY", "resumeai"),
                    secret_key=os.getenv("MINIO_SECRET_KEY", "resumeai123"),
                    secure=False
                )
                bucket = os.getenv("MINIO_BUCKET", "resumeai-files")
                object_name = f"exports/{task_id}.{req.format}"
                client.fput_object(bucket, object_name, output_path)
                download_url = f"{minio_ep}/{bucket}/{object_name}"
            except Exception:
                pass

        tasks[task_id] = {
            **tasks[task_id],
            "status": "completed",
            "download_url": download_url,
            "completed_at": datetime.datetime.utcnow().isoformat(),
        }
    except Exception as e:
        tasks[task_id] = {
            **tasks[task_id],
            "status": "failed",
            "error": str(e),
        }

# -------- 启动 --------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=3002, reload=True)
