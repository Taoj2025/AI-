"""
AI Dispatch Service — FastAPI HTTP 入口
统一对外提供 AI 简历生成能力
"""
from __future__ import annotations

import sys
import os
import time
import logging
from typing import Optional

# 确保 src 包可导入
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openclaw import (
    OpenClawResumeChain,
    ResumeInput,
    PersonalInfo,
    ExperienceItem,
    CompanyType,
    ResumeStyle,
    GenerationResult,
)
from hermes import HermesAdapter, MockProvider

# ─────────────────────────── 配置 ───────────────────────────

logger = logging.getLogger("ai-dispatch")
logging.basicConfig(level=logging.INFO)

MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"
PORT = int(os.getenv("AI_DISPATCH_PORT", "3003"))

# ─────────────────────────── 初始化 ───────────────────────────

def create_hermes() -> HermesAdapter:
    """创建 Hermes 实例"""
    if MOCK_MODE:
        mock_provider = MockProvider(
            response_text='''```json
{
  "summary": "资深全栈开发工程师，5年互联网大厂经验，擅长高并发系统设计与AI应用开发。主导过多个百万级用户产品的技术架构，具备优秀的团队管理和跨部门协作能力。",
  "experience": [
    {
      "company": "某互联网大厂",
      "position": "高级全栈工程师",
      "start_date": "2021.03",
      "end_date": "至今",
      "achievements": [
        "主导重构核心交易系统，QPS从2000提升至12000，系统可用性从99.5%提升至99.99%",
        "设计并实现智能推荐引擎，用户转化率提升32%，年化营收增长超过5000万元",
        "带领5人前端小组完成微前端架构迁移，首屏加载时间从3.2s优化至0.8s"
      ],
      "tech_stack": ["React", "Go", "Kubernetes", "Redis"]
    }
  ],
  "skills_optimized": {
    "technical": ["Go", "React", "Kubernetes", "PostgreSQL", "Redis", "Python"],
    "soft": ["技术架构", "团队管理", "跨部门协作", "敏捷开发"],
    "keywords": ["高并发", "微服务", "系统设计", "K8s", "性能优化"]
  }
}
```'''
        )
        return HermesAdapter(providers={"mock": mock_provider})
    return HermesAdapter()

hermes = create_hermes()
chain = OpenClawResumeChain(hermes=hermes)

app = FastAPI(
    title="AI Dispatch Service",
    description="ResumeAI AI 调度服务 — OpenClaw 编排 + Hermes 适配",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────── 请求/响应模型 ───────────────────────────

class ExperienceInput(BaseModel):
    company: str
    position: str
    start_date: str
    end_date: str
    description: str = ""
    achievements: list[str] = []
    tech_stack: list[str] = []

class PersonalInput(BaseModel):
    name: str
    email: str
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    github: str = ""
    portfolio: str = ""

class GenerateRequest(BaseModel):
    """简历生成请求"""
    personal: PersonalInput
    experience: list[ExperienceInput]
    education: list[dict] = []
    skills: list[str] = []
    target_job: str
    company_type: str = "internet_giant"
    job_description: str = ""
    style: str = "business"
    language: str = "zh"
    model: str = "gpt-4o"
    temperature: float = 0.7

class MultiGenerateRequest(BaseModel):
    """多版本简历生成请求"""
    personal: PersonalInput
    experience: list[ExperienceInput]
    education: list[dict] = []
    skills: list[str] = []
    target_job: str
    company_types: list[str] = ["internet_giant", "foreign_company", "startup"]
    model: str = "gpt-4o-mini"

class GenerateResponse(BaseModel):
    success: bool
    summary: str = ""
    experience_enhanced: list[dict] = []
    skills_optimized: dict = {}
    keywords: list[str] = []
    model_used: str = ""
    is_fallback: bool = False
    cost_usd: float = 0.0
    latency_ms: float = 0.0
    raw_response: str = ""

class MultiGenerateResponse(BaseModel):
    success: bool
    results: dict[str, GenerateResponse] = {}

class ModelInfo(BaseModel):
    name: str
    provider: str
    fallback: Optional[str] = None

class ModelsResponse(BaseModel):
    models: list[ModelInfo]
    usage_summary: dict

class HealthResponse(BaseModel):
    status: str
    service: str
    mock_mode: bool
    version: str

# ─────────────────────────── API 端点 ───────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        service="ai-dispatch",
        mock_mode=MOCK_MODE,
        version="1.0.0",
    )

@app.get("/api/ai/models", response_model=ModelsResponse)
async def list_models():
    """列出所有支持的 AI 模型"""
    models = [
        ModelInfo(name=m, provider=p, fallback=HermesAdapter.FALLBACK_CHAIN.get(m))
        for m, p in HermesAdapter.MODEL_PROVIDER_MAP.items()
    ]
    return ModelsResponse(
        models=models,
        usage_summary=hermes.get_usage_summary(),
    )

@app.post("/api/generate", response_model=GenerateResponse)
async def generate_resume(req: GenerateRequest):
    """
    单版本简历生成
    根据用户输入和目标公司类型，调用 AI 生成优化后的简历内容
    """
    try:
        company_type = CompanyType(req.company_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"无效的公司类型: {req.company_type}，可选值: {[t.value for t in CompanyType]}",
        )

    try:
        style = ResumeStyle(req.style)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"无效的风格: {req.style}，可选值: {[s.value for s in ResumeStyle]}",
        )

    resume_input = ResumeInput(
        personal=PersonalInfo(**req.personal.model_dump()),
        experience=[
            ExperienceItem(**exp.model_dump()) for exp in req.experience
        ],
        education=req.education,
        skills=req.skills,
        target_job=req.target_job,
        company_type=company_type,
        job_description=req.job_description,
        style=style,
        language=req.language,
    )

    try:
        result: GenerationResult = await chain.generate(
            resume_input=resume_input,
            model=req.model,
            temperature=req.temperature,
        )
        return GenerateResponse(
            success=True,
            summary=result.summary,
            experience_enhanced=result.experience_enhanced,
            skills_optimized=result.skills_optimized,
            keywords=result.keywords,
            model_used=result.model_used,
            is_fallback=result.is_fallback,
            cost_usd=result.cost_usd,
            latency_ms=result.latency_ms,
            raw_response=result.raw_response,
        )
    except Exception as e:
        logger.error(f"生成失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")

@app.post("/api/generate/multi", response_model=MultiGenerateResponse)
async def generate_multi_version(req: MultiGenerateRequest):
    """
    多版本简历生成
    同时为多种公司类型生成适配的简历版本
    """
    company_types = []
    for ct_str in req.company_types:
        try:
            company_types.append(CompanyType(ct_str))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"无效的公司类型: {ct_str}",
            )

    resume_input = ResumeInput(
        personal=PersonalInfo(**req.personal.model_dump()),
        experience=[
            ExperienceItem(**exp.model_dump()) for exp in req.experience
        ],
        education=req.education,
        skills=req.skills,
        target_job=req.target_job,
        company_type=company_types[0],
    )

    try:
        results = await chain.generate_multi_version(
            resume_input=resume_input,
            company_types=company_types,
            model=req.model,
        )
        return MultiGenerateResponse(
            success=True,
            results={
                ct.value: GenerateResponse(
                    success=True,
                    summary=r.summary,
                    experience_enhanced=r.experience_enhanced,
                    skills_optimized=r.skills_optimized,
                    keywords=r.keywords,
                    model_used=r.model_used,
                    is_fallback=r.is_fallback,
                    cost_usd=r.cost_usd,
                    latency_ms=r.latency_ms,
                )
                for ct, r in results.items()
            },
        )
    except Exception as e:
        logger.error(f"多版本生成失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"多版本生成失败: {str(e)}")

@app.get("/api/ai/usage")
async def get_usage():
    """获取 AI 调用统计"""
    return {
        "success": True,
        "data": hermes.get_usage_summary(),
    }

# ─────────────────────────── 启动 ───────────────────────────

if __name__ == "__main__":
    import uvicorn
    logger.info(f"AI Dispatch Service 启动 (Mock模式: {MOCK_MODE})")
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
