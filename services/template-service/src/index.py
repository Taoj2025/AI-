"""
Template Service — 简历模板管理
ResumeAI 微服务

端口: 3004
功能: 模板CRUD/分类筛选/预览/评分排行/种子数据
"""

import json
import time
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# ---- 数据模型 ----
class Style(str, Enum):
    CLASSIC = "classic"       # 经典
    MODERN = "modern"         # 现代
    MINIMAL = "minimal"       # 极简
    CREATIVE = "creative"     # 创意
    ACADEMIC = "academic"     # 学术
    EXECUTIVE = "executive"   # 高管

class CompanyType(str, Enum):
    INTERNET = "internet"     # 互联网大厂
    FOREIGN = "foreign"       # 外企
    SOE = "soe"               # 国企
    STARTUP = "startup"       # 创业公司
    CONSULTING = "consulting" # 咨询

class TemplateCategory(str, Enum):
    TECH = "tech"             # 技术
    DESIGN = "design"         # 设计
    FINANCE = "finance"       # 金融
    MARKETING = "marketing"   # 市场
    MANAGEMENT = "management" # 管理
    EDUCATION = "education"   # 教育
    MEDICAL = "medical"       # 医疗
    GENERAL = "general"       # 通用

class TemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., max_length=500)
    category: TemplateCategory
    style: Style
    companyTypes: list[CompanyType] = []
    industry: str = ""
    tags: list[str] = []
    thumbnailUrl: str = ""
    previewUrl: str = ""
    htmlTemplate: str = ""
    isPremium: bool = False

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[TemplateCategory] = None
    style: Optional[Style] = None
    companyTypes: Optional[list[CompanyType]] = None
    tags: Optional[list[str]] = None
    isPremium: Optional[bool] = None

class TemplateResponse(TemplateBase):
    id: str
    createdAt: str
    updatedAt: str
    usageCount: int
    rating: float
    ratingCount: int

class PaginatedResponse(BaseModel):
    total: int
    page: int
    pageSize: int
    data: list[TemplateResponse]


# ---- 内存存储 ----
templates: dict[str, dict] = {}


def _seed_templates():
    """初始化默认模板种子数据"""
    seed_data = [
        {
            "name": "互联网大厂技术岗", "description": "适合字节/阿里/腾讯/美团等互联网大厂技术岗位",
            "category": "tech", "style": "modern", "companyTypes": ["internet"],
            "industry": "互联网", "tags": ["技术", "大厂", "ATS优化"],
            "thumbnailUrl": "/templates/tech-internet-thumb.png",
            "previewUrl": "/templates/tech-internet-preview.html",
            "htmlTemplate": "<!-- 互联网大厂技术岗模板 -->",
            "isPremium": False, "usageCount": 15280, "rating": 4.8, "ratingCount": 892,
        },
        {
            "name": "外企商务精英", "description": "英文+中文双语简历，适合外企申请",
            "category": "management", "style": "classic", "companyTypes": ["foreign"],
            "industry": "外企", "tags": ["双语", "外企", "专业"],
            "thumbnailUrl": "/templates/foreign-biz-thumb.png",
            "previewUrl": "/templates/foreign-biz-preview.html",
            "htmlTemplate": "<!-- 外企商务精英模板 -->",
            "isPremium": True, "usageCount": 8930, "rating": 4.7, "ratingCount": 521,
        },
        {
            "name": "国企公务员", "description": "规范格式，适合国企/事业单位/公务员申请",
            "category": "general", "style": "classic", "companyTypes": ["soe"],
            "industry": "体制内", "tags": ["国企", "公务员", "规范"],
            "thumbnailUrl": "/templates/soe-gov-thumb.png",
            "previewUrl": "/templates/soe-gov-preview.html",
            "htmlTemplate": "<!-- 国企公务员模板 -->",
            "isPremium": False, "usageCount": 12450, "rating": 4.6, "ratingCount": 678,
        },
        {
            "name": "创业公司全能型", "description": "突出多面手能力，适合初创企业求职",
            "category": "tech", "style": "creative", "companyTypes": ["startup"],
            "industry": "创业", "tags": ["创业", "全能", "灵活"],
            "thumbnailUrl": "/templates/startup-allround-thumb.png",
            "previewUrl": "/templates/startup-allround-preview.html",
            "htmlTemplate": "<!-- 创业公司全能型模板 -->",
            "isPremium": False, "usageCount": 6720, "rating": 4.5, "ratingCount": 345,
        },
        {
            "name": "咨询顾问", "description": "数据驱动型简历，适合MBB及四大咨询",
            "category": "finance", "style": "executive", "companyTypes": ["consulting"],
            "industry": "咨询", "tags": ["咨询", "数据", "专业"],
            "thumbnailUrl": "/templates/consultant-thumb.png",
            "previewUrl": "/templates/consultant-preview.html",
            "htmlTemplate": "<!-- 咨询顾问模板 -->",
            "isPremium": True, "usageCount": 4580, "rating": 4.9, "ratingCount": 267,
        },
        {
            "name": "UI/UX设计师", "description": "视觉导向，作品集链接突出展示",
            "category": "design", "style": "creative",
            "companyTypes": ["internet", "startup", "foreign"],
            "industry": "设计", "tags": ["设计", "UI", "UX", "作品集"],
            "thumbnailUrl": "/templates/design-uiux-thumb.png",
            "previewUrl": "/templates/design-uiux-preview.html",
            "htmlTemplate": "<!-- UI/UX设计师模板 -->",
            "isPremium": False, "usageCount": 9810, "rating": 4.7, "ratingCount": 543,
        },
        {
            "name": "极简程序员", "description": "简洁有力，突出技术栈和开源贡献",
            "category": "tech", "style": "minimal",
            "companyTypes": ["internet", "startup", "foreign"],
            "industry": "技术", "tags": ["程序员", "极简", "开源"],
            "thumbnailUrl": "/templates/dev-minimal-thumb.png",
            "previewUrl": "/templates/dev-minimal-preview.html",
            "htmlTemplate": "<!-- 极简程序员模板 -->",
            "isPremium": False, "usageCount": 11200, "rating": 4.6, "ratingCount": 612,
        },
        {
            "name": "学术研究员", "description": "论文/专利/项目经历突出展示",
            "category": "education", "style": "academic",
            "companyTypes": ["soe", "foreign"],
            "industry": "学术", "tags": ["学术", "研究", "论文"],
            "thumbnailUrl": "/templates/academic-research-thumb.png",
            "previewUrl": "/templates/academic-research-preview.html",
            "htmlTemplate": "<!-- 学术研究员模板 -->",
            "isPremium": False, "usageCount": 5340, "rating": 4.8, "ratingCount": 298,
        },
        {
            "name": "市场营销达人", "description": "数据+案例双驱动，突出ROI和增长",
            "category": "marketing", "style": "modern",
            "companyTypes": ["internet", "startup"],
            "industry": "市场", "tags": ["市场", "增长", "ROI"],
            "thumbnailUrl": "/templates/marketing-thumb.png",
            "previewUrl": "/templates/marketing-preview.html",
            "htmlTemplate": "<!-- 市场营销达人模板 -->",
            "isPremium": True, "usageCount": 7890, "rating": 4.5, "ratingCount": 421,
        },
        {
            "name": "金融分析师", "description": "量化成果突出，适合投行/证券/基金",
            "category": "finance", "style": "executive",
            "companyTypes": ["foreign", "soe"],
            "industry": "金融", "tags": ["金融", "量化", "分析"],
            "thumbnailUrl": "/templates/finance-analyst-thumb.png",
            "previewUrl": "/templates/finance-analyst-preview.html",
            "htmlTemplate": "<!-- 金融分析师模板 -->",
            "isPremium": True, "usageCount": 6120, "rating": 4.7, "ratingCount": 356,
        },
    ]

    for t in seed_data:
        tid = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        templates[tid] = {
            **t, "id": tid, "createdAt": now, "updatedAt": now,
        }


# ---- FastAPI App (lifespan pattern) ----
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: seed template data"""
    _seed_templates()
    yield
    # Shutdown: nothing to clean up

app = FastAPI(title="ResumeAI Template Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "template-service", "timestamp": datetime.now(timezone.utc).isoformat()}


# ---- 模板 API ----

@app.get("/api/templates", response_model=PaginatedResponse)
async def list_templates(
    category: Optional[str] = None,
    style: Optional[str] = None,
    companyType: Optional[str] = None,
    isPremium: Optional[bool] = None,
    tag: Optional[str] = None,
    keyword: Optional[str] = None,
    sortBy: str = "usageCount",
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=50),
):
    """获取模板列表（支持筛选、排序、分页）"""
    result = list(templates.values())

    # 筛选
    if category:
        result = [t for t in result if t["category"] == category]
    if style:
        result = [t for t in result if t["style"] == style]
    if companyType:
        result = [t for t in result if companyType in t.get("companyTypes", [])]
    if isPremium is not None:
        result = [t for t in result if t["isPremium"] == isPremium]
    if tag:
        result = [t for t in result if tag in t.get("tags", [])]
    if keyword:
        kw = keyword.lower()
        result = [t for t in result if kw in t["name"].lower() or kw in t["description"].lower() or kw in str(t.get("tags", [])).lower()]

    # 排序
    if sortBy == "usageCount":
        result.sort(key=lambda x: x["usageCount"], reverse=True)
    elif sortBy == "rating":
        result.sort(key=lambda x: x["rating"], reverse=True)
    elif sortBy == "newest":
        result.sort(key=lambda x: x["createdAt"], reverse=True)

    total = len(result)
    start = (page - 1) * pageSize
    end = start + pageSize
    paginated = result[start:end]

    return PaginatedResponse(total=total, page=page, pageSize=pageSize, data=paginated)


@app.get("/api/templates/{template_id}")
async def get_template(template_id: str):
    """获取模板详情"""
    t = templates.get(template_id)
    if not t:
        raise HTTPException(status_code=404, detail="模板不存在")
    return {"success": True, "data": t}


@app.post("/api/templates", status_code=201)
async def create_template(tpl: TemplateCreate):
    """创建模板（管理员）"""
    tid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    data = {**tpl.model_dump(), "id": tid, "createdAt": now, "updatedAt": now,
            "usageCount": 0, "rating": 0.0, "ratingCount": 0}
    templates[tid] = data
    return {"success": True, "data": data}


@app.put("/api/templates/{template_id}")
async def update_template(template_id: str, update: TemplateUpdate):
    """更新模板"""
    t = templates.get(template_id)
    if not t:
        raise HTTPException(status_code=404, detail="模板不存在")

    for k, v in update.model_dump(exclude_unset=True).items():
        if v is not None:
            t[k] = v

    t["updatedAt"] = datetime.now(timezone.utc).isoformat()
    return {"success": True, "data": t}


@app.delete("/api/templates/{template_id}")
async def delete_template(template_id: str):
    """删除模板"""
    if template_id not in templates:
        raise HTTPException(status_code=404, detail="模板不存在")
    del templates[template_id]
    return {"success": True, "message": "模板已删除"}


@app.post("/api/templates/{template_id}/rate")
async def rate_template(template_id: str, rating: int = Query(..., ge=1, le=5)):
    """给模板评分"""
    t = templates.get(template_id)
    if not t:
        raise HTTPException(status_code=404, detail="模板不存在")

    t["ratingCount"] += 1
    t["rating"] = round((t["rating"] * (t["ratingCount"] - 1) + rating) / t["ratingCount"], 1)
    t["updatedAt"] = datetime.now(timezone.utc).isoformat()
    return {"success": True, "data": {"rating": t["rating"], "ratingCount": t["ratingCount"]}}


@app.get("/api/templates/categories/summary")
async def categories_summary():
    """获取各分类的模板数量统计"""
    from collections import Counter
    cats = Counter(t["category"] for t in templates.values())
    styles = Counter(t["style"] for t in templates.values())
    return {
        "success": True,
        "data": {
            "categories": dict(cats),
            "styles": dict(styles),
            "total": len(templates),
        },
    }


# 直接运行
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3004)
