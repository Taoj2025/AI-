"""Analytics Service 完整测试套件 v2.0
使用 MemoryDB 替代 ClickHouse，API 行为与原版完全一致

增强：添加数据库后端切换测试、ClickHouseDB mock 测试
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from src.db import MemoryDB, ClickHouseDB, set_db, get_db, AnalyticsDB
from src.index import app, EventCategory, EventType

client = TestClient(app)

# 用 MemoryDB 替代 ClickHouse，保证测试无外部依赖
_test_db = MemoryDB()
set_db(_test_db)


def _clear_data():
    """清除内存数据"""
    _test_db.clear()


def _track_batch(events_data):
    """批量记录事件"""
    for e in events_data:
        client.post("/api/events/track", json=e)


def _get_db():
    return _test_db


# ========== 数据库后端切换测试 ==========

class TestDBBackendSwitch:
    def setup_method(self):
        _clear_data()

    def test_get_db_default(self):
        """测试默认数据库后端"""
        from src.db import _db_instance
        # 默认应该是 MemoryDB
        db = get_db()
        assert isinstance(db, MemoryDB)

    def test_set_db(self):
        """测试 set_db() 切换后端"""
        original_db = get_db()
        mock_db = MagicMock(spec=AnalyticsDB)
        set_db(mock_db)
        assert get_db() is mock_db
        # 恢复
        set_db(original_db)

    def test_clickhouse_db_creation(self):
        """测试 ClickHouseDB 实例创建和默认配置"""
        # 不需要 mock，直接测试默认值
        ch_db = ClickHouseDB()
        assert ch_db._database == "resumeai_analytics"
        assert ch_db._client is None

    def test_clickhouse_db_env_override(self):
        """测试环境变量覆盖默认配置"""
        with patch("src.db.os.getenv") as mock_getenv:
            # 模拟环境变量
            def side_effect(key, default=None):
                if key == "CLICKHOUSE_DATABASE":
                    return "test_db"
                return default
            mock_getenv.side_effect = side_effect
            
            ch_db = ClickHouseDB()
            assert ch_db._database == "test_db"

    def test_memory_db_clear(self):
        """测试 MemoryDB.clear() 正确清空数据"""
        _track_batch([
            {"session_id": "s1", "category": "page_view", "event": "home_page"},
        ])
        assert len(_test_db.events) == 1
        _clear_data()
        assert len(_test_db.events) == 0
        assert len(_test_db.daily_stats) == 0
        assert len(_test_db.model_usage) == 0


# ========== 事件追踪 ==========

class TestEventTracking:
    def setup_method(self):
        _clear_data()

    def test_track_page_view(self):
        r = client.post("/api/events/track", json={
            "session_id": "sess_001",
            "category": "page_view",
            "event": "home_page",
            "properties": {"referrer": "google"},
        })
        assert r.status_code == 200
        assert r.json()["success"]

    def test_track_ai_generation(self):
        r = client.post("/api/events/track", json={
            "session_id": "sess_002",
            "category": "ai_generation",
            "event": "ai_generate_complete",
            "properties": {"model": "gpt-4o", "tokens": 1500, "cost": 0.05},
        })
        assert r.status_code == 200

    def test_track_with_timestamp(self):
        r = client.post("/api/events/track", json={
            "session_id": "sess_003",
            "category": "export",
            "event": "export_complete",
            "timestamp": "2026-06-01T10:00:00",
        })
        assert r.json()["success"]

    def test_track_signup(self):
        r = client.post("/api/events/track", json={
            "session_id": "sess_004",
            "category": "sign_up",
            "event": "register",
            "properties": {"method": "phone"},
        })
        assert r.json()["success"]

    def test_track_payment(self):
        r = client.post("/api/events/track", json={
            "session_id": "sess_005",
            "category": "payment",
            "event": "payment_success",
            "properties": {"amount": 79.0, "plan": "pro"},
        })
        assert r.json()["success"]

    def test_batch_track(self):
        batch = [
            {"session_id": f"s_{i}", "category": "page_view", "event": "home_page"}
            for i in range(5)
        ]
        r = client.post("/api/events/batch", json=batch)
        assert r.status_code == 200
        assert r.json()["count"] == 5

    def test_event_has_id(self):
        client.post("/api/events/track", json={
            "session_id": "s_id", "category": "page_view", "event": "home_page",
        })
        events = _get_db().events
        assert len(events) >= 1
        assert "id" in events[-1]


# ========== 实时仪表盘 ==========

class TestRealtimeDashboard:
    def setup_method(self):
        _clear_data()

    def test_empty_dashboard(self):
        r = client.get("/api/dashboard/realtime")
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["today"]["page_views"] == 0
        assert data["active_users_5m"] == 0

    def test_dashboard_with_events(self):
        _track_batch([
            {"session_id": "s1", "category": "page_view", "event": "home_page"},
            {"session_id": "s2", "category": "page_view", "event": "home_page"},
            {"session_id": "s1", "category": "ai_generation", "event": "ai_generate_complete",
             "properties": {"model": "gpt-4o", "tokens": 1000, "cost": 0.03}},
            {"session_id": "s3", "category": "export", "event": "export_complete"},
            {"session_id": "s4", "category": "sign_up", "event": "register"},
            {"session_id": "s5", "category": "payment", "event": "payment_success",
             "properties": {"amount": 29.0}},
        ])
        r = client.get("/api/dashboard/realtime")
        data = r.json()["data"]
        assert data["today"]["page_views"] == 2
        assert data["today"]["ai_calls"] == 1
        assert data["today"]["exports"] == 1
        assert data["today"]["signups"] == 1
        assert data["today"]["payments"] == 1
        assert data["today"]["revenue"] == 29.0

    def test_total_events_count(self):
        _track_batch([
            {"session_id": f"s{i}", "category": "page_view", "event": "home_page"}
            for i in range(10)
        ])
        r = client.get("/api/dashboard/realtime")
        assert r.json()["data"]["total_events"] == 10


# ========== 用户转化漏斗 ==========

class TestFunnel:
    def setup_method(self):
        _clear_data()

    def test_empty_funnel(self):
        r = client.get("/api/analytics/funnel")
        assert r.status_code == 200
        data = r.json()["data"]
        assert len(data["funnel"]) == 6
        assert data["funnel"][0]["step"] == "页面浏览"
        assert data["funnel"][0]["rate"] == 0

    def test_funnel_with_data(self):
        _track_batch([
            {"session_id": "f1", "category": "page_view", "event": "home_page"},
            {"session_id": "f2", "category": "page_view", "event": "home_page"},
            {"session_id": "f3", "category": "page_view", "event": "home_page"},
            {"session_id": "f1", "category": "sign_up", "event": "register"},
            {"session_id": "f2", "category": "sign_up", "event": "register"},
            {"session_id": "f1", "category": "button_click", "event": "login_success"},
            {"session_id": "f2", "category": "button_click", "event": "login_success"},
            {"session_id": "f1", "category": "ai_generation", "event": "ai_generate_complete"},
            {"session_id": "f1", "category": "export", "event": "export_complete"},
            {"session_id": "f1", "category": "payment", "event": "payment_success",
             "properties": {"amount": 79.0}},
        ])
        r = client.get("/api/analytics/funnel")
        funnel = r.json()["data"]["funnel"]
        assert funnel[0]["count"] == 3
        assert funnel[1]["count"] == 2
        assert funnel[2]["count"] == 2
        assert funnel[3]["count"] == 1
        assert funnel[4]["count"] == 1
        assert funnel[5]["count"] == 1

    def test_funnel_days_param(self):
        r = client.get("/api/analytics/funnel?days=30")
        assert r.json()["data"]["period_days"] == 30

    def test_funnel_decreasing_rates(self):
        _track_batch([
            {"session_id": "f1", "category": "page_view", "event": "home_page"},
            {"session_id": "f2", "category": "page_view", "event": "home_page"},
            {"session_id": "f3", "category": "page_view", "event": "home_page"},
            {"session_id": "f1", "category": "sign_up", "event": "register"},
            {"session_id": "f2", "category": "sign_up", "event": "register"},
            {"session_id": "f1", "category": "button_click", "event": "login_success"},
            {"session_id": "f1", "category": "ai_generation", "event": "ai_generate_complete"},
            {"session_id": "f1", "category": "export", "event": "export_complete"},
            {"session_id": "f1", "category": "payment", "event": "payment_success",
             "properties": {"amount": 79.0}},
        ])
        r = client.get("/api/analytics/funnel")
        funnel = r.json()["data"]["funnel"]
        counts = [f["count"] for f in funnel]
        for i in range(len(counts) - 1):
            assert counts[i] >= counts[i + 1], f"Step {i} ({counts[i]}) < step {i+1} ({counts[i+1]})"
        assert counts[0] >= counts[-1]


# ========== AI模型统计 ==========

class TestModelStats:
    def setup_method(self):
        _clear_data()

    def test_empty_model_stats(self):
        r = client.get("/api/analytics/models")
        assert r.status_code == 200
        assert r.json()["data"]["total_calls"] == 0

    def test_model_stats(self):
        _track_batch([
            {"session_id": "s1", "category": "ai_generation", "event": "ai_generate_complete",
             "properties": {"model": "gpt-4o", "tokens": 1000, "cost": 0.03}},
            {"session_id": "s2", "category": "ai_generation", "event": "ai_generate_complete",
             "properties": {"model": "gpt-4o", "tokens": 800, "cost": 0.024}},
            {"session_id": "s3", "category": "ai_generation", "event": "ai_generate_complete",
             "properties": {"model": "claude-3.5-sonnet", "tokens": 1200, "cost": 0.06}},
            {"session_id": "s4", "category": "ai_generation", "event": "ai_generate_fail",
             "properties": {"model": "claude-3.5-sonnet", "tokens": 0, "cost": 0.0}},
        ])
        r = client.get("/api/analytics/models")
        data = r.json()["data"]
        assert data["total_calls"] == 4
        models = data["models"]
        assert "gpt-4o" in models
        assert models["gpt-4o"]["calls"] == 2
        assert models["gpt-4o"]["success"] == 2
        assert models["claude-3.5-sonnet"]["calls"] == 2
        assert models["claude-3.5-sonnet"]["fail"] == 1


# ========== 收入报表 ==========

class TestRevenue:
    def setup_method(self):
        _clear_data()

    def test_empty_revenue(self):
        r = client.get("/api/analytics/revenue")
        data = r.json()["data"]
        assert data["total_revenue"] == 0
        assert data["total_payments"] == 0

    def test_revenue_calculation(self):
        _track_batch([
            {"session_id": "s1", "category": "payment", "event": "payment_success",
             "properties": {"amount": 29.0}},
            {"session_id": "s2", "category": "payment", "event": "payment_success",
             "properties": {"amount": 79.0}},
            {"session_id": "s3", "category": "payment", "event": "payment_success",
             "properties": {"amount": 29.0}},
        ])
        r = client.get("/api/analytics/revenue")
        data = r.json()["data"]
        assert data["total_revenue"] == 137.0
        assert data["total_payments"] == 3

    def test_avg_daily_revenue(self):
        _track_batch([
            {"session_id": "s1", "category": "payment", "event": "payment_success",
             "properties": {"amount": 100.0}},
        ])
        r = client.get("/api/analytics/revenue?days=1")
        data = r.json()["data"]
        assert data["avg_daily_revenue"] == 100.0


# ========== 每日趋势 ==========

class TestTrends:
    def setup_method(self):
        _clear_data()

    def test_empty_trends(self):
        r = client.get("/api/analytics/trends?days=3")
        assert r.status_code == 200
        assert len(r.json()["data"]) == 3

    def test_trends_structure(self):
        r = client.get("/api/analytics/trends?days=7")
        for day in r.json()["data"]:
            assert "date" in day
            assert "page_views" in day
            assert "ai_calls" in day
            assert "exports" in day
            assert "signups" in day
            assert "revenue" in day


# ========== 用户活跃度 ==========

class TestUserActivity:
    def setup_method(self):
        _clear_data()

    def test_empty_activity(self):
        r = client.get("/api/analytics/user-activity")
        data = r.json()["data"]
        assert data["dau"] == 0
        assert data["wau"] == 0
        assert data["mau"] == 0

    def test_dau_calculation(self):
        _track_batch([
            {"session_id": "s1", "category": "page_view", "event": "home_page"},
            {"session_id": "s1", "category": "page_view", "event": "template_market"},
            {"session_id": "s2", "category": "page_view", "event": "home_page"},
        ])
        r = client.get("/api/analytics/user-activity?days=1")
        data = r.json()["data"]
        assert data["dau"] == 2.0

    def test_dau_mau_ratio(self):
        _track_batch([
            {"session_id": f"s{i}", "category": "page_view", "event": "home_page"}
            for i in range(5)
        ])
        r = client.get("/api/analytics/user-activity")
        ratio = r.json()["data"]["dau_mau_ratio"]
        assert 0 <= ratio <= 100


# ========== 热门模板排行 ==========

class TestTopTemplates:
    def setup_method(self):
        _clear_data()

    def test_empty_top_templates(self):
        r = client.get("/api/analytics/top-templates")
        assert r.status_code == 200
        assert r.json()["data"] == []

    def test_top_templates_ranking(self):
        _track_batch([
            {"session_id": "s1", "category": "template_view", "event": "template_market",
             "properties": {"template_id": "tpl_001"}},
            {"session_id": "s2", "category": "template_view", "event": "template_market",
             "properties": {"template_id": "tpl_001"}},
            {"session_id": "s3", "category": "template_view", "event": "template_market",
             "properties": {"template_id": "tpl_002"}},
        ])
        r = client.get("/api/analytics/top-templates")
        data = r.json()["data"]
        assert data[0]["template_id"] == "tpl_001"
        assert data[0]["views"] == 2
        assert data[0]["rank"] == 1
        assert data[1]["template_id"] == "tpl_002"

    def test_top_templates_limit(self):
        _track_batch([
            {"session_id": f"s{i}", "category": "template_view", "event": "template_market",
             "properties": {"template_id": f"tpl_{i:03d}"}}
            for i in range(20)
        ])
        r = client.get("/api/analytics/top-templates?limit=5")
        assert len(r.json()["data"]) == 5


# ========== 健康检查 ==========

class TestHealth:
    def test_health_check(self):
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["service"] == "analytics"
        assert data["version"] == "2.0.0"
        assert data["backend"] == "MemoryDB"

    def test_health_total_events(self):
        _clear_data()
        _track_batch([
            {"session_id": "s1", "category": "page_view", "event": "home_page"},
            {"session_id": "s2", "category": "page_view", "event": "home_page"},
        ])
        r = client.get("/health")
        assert r.json()["total_events"] == 2
