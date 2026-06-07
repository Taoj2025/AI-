"""
ResumeAI Analytics Service — 数据分析服务
用户行为追踪、AI调用统计、收入报表、用户增长漏斗、实时仪表盘
支持 ClickHouse (生产) / MemoryDB (测试)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from collections import defaultdict
from enum import Enum

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .db import get_db, init_db, close_db, MemoryDB, set_db


# ============================================================
#  Data Models
# ============================================================

class EventCategory(str, Enum):
    PAGE_VIEW = "page_view"
    BUTTON_CLICK = "button_click"
    AI_GENERATION = "ai_generation"
    EXPORT = "export"
    SIGN_UP = "sign_up"
    LOGIN = "login"
    PAYMENT = "payment"
    TEMPLATE_VIEW = "template_view"
    RESUME_EDIT = "resume_edit"

class EventType(str, Enum):
    # 页面事件
    HOME_PAGE = "home_page"
    TEMPLATE_MARKET = "template_market"
    RESUME_EDITOR = "resume_editor"
    DISCOVER = "discover"
    PROFILE = "profile"
    # AI事件
    AI_GENERATE_START = "ai_generate_start"
    AI_GENERATE_COMPLETE = "ai_generate_complete"
    AI_GENERATE_FAIL = "ai_generate_fail"
    AI_MODEL_SWITCH = "ai_model_switch"
    # 导出事件
    EXPORT_START = "export_start"
    EXPORT_COMPLETE = "export_complete"
    # 支付事件
    PLAN_VIEW = "plan_view"
    SUBSCRIBE_START = "subscribe_start"
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAIL = "payment_fail"
    # 用户事件
    REGISTER = "register"
    LOGIN_SUCCESS = "login_success"
    LOGOUT = "logout"

class TrackEvent(BaseModel):
    user_id: Optional[str] = None
    session_id: str
    category: EventCategory
    event: EventType
    properties: Dict[str, Any] = {}
    timestamp: Optional[str] = None

class FunnelStep(BaseModel):
    step: str
    count: int
    rate: float


# ============================================================
#  FastAPI App
# ============================================================

app = FastAPI(
    title="ResumeAI Analytics Service",
    version="2.0.0",
    description="数据分析 · 用户行为追踪 · AI调用统计 · 收入报表 · ClickHouse",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()


@app.on_event("shutdown")
async def shutdown():
    await close_db()


# -------- Event Tracking --------

@app.post("/api/events/track")
async def track_event(event: TrackEvent):
    """记录用户行为事件"""
    db = get_db()
    record = {
        **event.model_dump(),
        "id": str(uuid.uuid4()),
        "timestamp": event.timestamp or datetime.utcnow().isoformat(),
    }
    await db.track_event(record)
    return {"success": True}


@app.post("/api/events/batch")
async def track_events(event_list: List[TrackEvent]):
    """批量记录事件"""
    db = get_db()
    records = []
    for e in event_list:
        records.append({
            **e.model_dump(),
            "id": str(uuid.uuid4()),
            "timestamp": e.timestamp or datetime.utcnow().isoformat(),
        })
    count = await db.batch_track(records)
    return {"success": True, "count": count}


# -------- Realtime Dashboard --------

@app.get("/api/dashboard/realtime")
async def realtime_dashboard():
    """实时仪表盘数据"""
    db = get_db()
    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")
    hour = now.hour

    # 今日统计
    today_stats = await db.get_today_stats()

    # 本小时事件
    hour_events = await db.get_hour_events(today, hour)
    hour_page_views = sum(1 for e in hour_events if e["category"] == EventCategory.PAGE_VIEW)
    hour_ai_calls = sum(1 for e in hour_events if e["category"] == EventCategory.AI_GENERATION)

    # 活跃用户（最近5分钟）
    five_min_ago = (now - timedelta(minutes=5)).isoformat()
    active_users = await db.get_active_users_count(five_min_ago)

    total = await db.get_total_events()

    return {
        "success": True,
        "data": {
            "today": {
                "page_views": today_stats.get("page_views", 0),
                "ai_calls": today_stats.get("ai_calls", 0),
                "exports": today_stats.get("exports", 0),
                "signups": today_stats.get("signups", 0),
                "payments": today_stats.get("payments", 0),
                "revenue": today_stats.get("revenue", 0.0),
            },
            "this_hour": {
                "page_views": hour_page_views,
                "ai_calls": hour_ai_calls,
            },
            "active_users_5m": active_users,
            "total_events": total,
        },
    }


# -------- Conversion Funnel --------

@app.get("/api/analytics/funnel")
async def conversion_funnel(days: int = Query(default=7, ge=1, le=90)):
    """获取用户转化漏斗"""
    db = get_db()
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    recent = await db.query_events(since)

    unique_sessions = set(e["session_id"] for e in recent)
    page_viewers = len(unique_sessions)

    register_sessions = set(e["session_id"] for e in recent if e["event"] == EventType.REGISTER)
    registrations = len(register_sessions)

    login_sessions = set(e["session_id"] for e in recent if e["event"] == EventType.LOGIN_SUCCESS)
    logins = len(login_sessions)

    ai_gen_sessions = set(e["session_id"] for e in recent if e["event"] == EventType.AI_GENERATE_COMPLETE)
    ai_generations = len(ai_gen_sessions)

    export_sessions = set(e["session_id"] for e in recent if e["event"] == EventType.EXPORT_COMPLETE)
    exports = len(export_sessions)

    payment_sessions = set(e["session_id"] for e in recent if e["event"] == EventType.PAYMENT_SUCCESS)
    payments = len(payment_sessions)

    base = max(page_viewers, 1)
    funnel = [
        FunnelStep(step="页面浏览", count=page_viewers, rate=page_viewers / base * 100),
        FunnelStep(step="注册", count=registrations, rate=registrations / base * 100),
        FunnelStep(step="登录", count=logins, rate=logins / base * 100),
        FunnelStep(step="AI生成", count=ai_generations, rate=ai_generations / base * 100),
        FunnelStep(step="导出", count=exports, rate=exports / base * 100),
        FunnelStep(step="付费", count=payments, rate=payments / base * 100),
    ]

    return {"success": True, "data": {"period_days": days, "funnel": [f.model_dump() for f in funnel]}}


# -------- AI Model Stats --------

@app.get("/api/analytics/models")
async def model_stats(days: int = Query(default=30, ge=1, le=365)):
    """AI模型调用统计"""
    db = get_db()
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    ai_events = await db.query_events(since, category="ai_generation")

    model_stats_dict: Dict[str, Dict] = defaultdict(
        lambda: {"calls": 0, "tokens": 0, "cost": 0.0, "success": 0, "fail": 0}
    )
    for e in ai_events:
        model = e["properties"].get("model", "unknown")
        model_stats_dict[model]["calls"] += 1
        model_stats_dict[model]["tokens"] += e["properties"].get("tokens", 0)
        model_stats_dict[model]["cost"] += e["properties"].get("cost", 0.0)
        if e["event"] == EventType.AI_GENERATE_COMPLETE:
            model_stats_dict[model]["success"] += 1
        elif e["event"] == EventType.AI_GENERATE_FAIL:
            model_stats_dict[model]["fail"] += 1

    sorted_models = sorted(model_stats_dict.items(), key=lambda x: x[1]["calls"], reverse=True)

    return {
        "success": True,
        "data": {
            "period_days": days,
            "models": dict(sorted_models),
            "total_calls": sum(s["calls"] for s in model_stats_dict.values()),
            "total_cost": sum(s["cost"] for s in model_stats_dict.values()),
        },
    }


# -------- Revenue Report --------

@app.get("/api/analytics/revenue")
async def revenue_report(days: int = Query(default=30, ge=1, le=365)):
    """收入报表"""
    db = get_db()
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    payment_events = await db.query_events(since, event="payment_success")

    daily_revenue: Dict[str, float] = defaultdict(float)
    daily_payments: Dict[str, int] = defaultdict(int)

    for e in payment_events:
        date_key = e["timestamp"][:10]
        daily_revenue[date_key] += e["properties"].get("amount", 0.0)
        daily_payments[date_key] += 1

    all_dates = sorted(set(list(daily_revenue.keys()) + list(daily_payments.keys())))

    breakdown = [
        {"date": d, "revenue": daily_revenue.get(d, 0.0), "payments": daily_payments.get(d, 0)}
        for d in all_dates
    ]

    total_revenue = sum(daily_revenue.values())
    total_payments = sum(daily_payments.values())
    avg_daily = total_revenue / max(len(daily_revenue), 1)

    return {
        "success": True,
        "data": {
            "period_days": days,
            "total_revenue": total_revenue,
            "total_payments": total_payments,
            "avg_daily_revenue": round(avg_daily, 2),
            "breakdown": breakdown,
        },
    }


# -------- Daily Trends --------

@app.get("/api/analytics/trends")
async def daily_trends(days: int = Query(default=30, ge=1, le=90)):
    """每日趋势数据"""
    db = get_db()
    end = datetime.utcnow()
    start = end - timedelta(days=days)
    start_str = start.strftime("%Y-%m-%d")
    result = await db.get_daily_trends(start_str, days)

    return {"success": True, "data": result}


# -------- User Activity --------

@app.get("/api/analytics/user-activity")
async def user_activity(days: int = Query(default=7, ge=1, le=90)):
    """用户活跃度分析（DAU/MAU/WAU）"""
    db = get_db()
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    recent_events = await db.query_events(since)

    # DAU: unique sessions per day
    daily_active: Dict[str, set] = defaultdict(set)
    for e in recent_events:
        date_key = e["timestamp"][:10]
        daily_active[date_key].add(e.get("session_id", ""))

    dau_values = [len(s) for s in daily_active.values()]
    avg_dau = sum(dau_values) / max(len(dau_values), 1)

    # MAU
    all_sessions = set(e.get("session_id", "") for e in recent_events)
    mau = len(all_sessions)

    # WAU (last 7 days)
    week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    week_events = [e for e in recent_events if e["timestamp"] >= week_ago]
    week_sessions = set(e.get("session_id", "") for e in week_events)
    wau = len(week_sessions)

    return {
        "success": True,
        "data": {
            "dau": avg_dau,
            "wau": wau,
            "mau": mau,
            "dau_mau_ratio": round(avg_dau / max(mau, 1) * 100, 2),
            "daily_active_users": {d: len(s) for d, s in sorted(daily_active.items())},
        },
    }


# -------- Top Templates --------

@app.get("/api/analytics/top-templates")
async def top_templates(
    days: int = Query(default=7, ge=1, le=90),
    limit: int = Query(default=10, ge=1, le=100),
):
    """热门模板使用排行"""
    db = get_db()
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    template_events = await db.query_events(since, category="template_view")

    template_counts: Dict[str, int] = defaultdict(int)
    for e in template_events:
        tid = e["properties"].get("template_id", "unknown")
        template_counts[tid] += 1

    sorted_templates = sorted(template_counts.items(), key=lambda x: x[1], reverse=True)[:limit]

    return {
        "success": True,
        "data": [
            {"template_id": t[0], "views": t[1], "rank": i + 1}
            for i, t in enumerate(sorted_templates)
        ],
    }


# -------- Health Check --------

@app.get("/health")
async def health():
    db = get_db()
    total = await db.get_total_events()
    return {
        "status": "ok",
        "service": "analytics",
        "version": "2.0.0",
        "backend": type(db).__name__,
        "total_events": total,
    }
