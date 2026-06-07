"""
Template Service 测试
覆盖: CRUD/分类筛选/排序/分页/评分/种子数据
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.index import app, templates, _seed_templates


# ---- 客户端 fixture ----
@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_templates():
    """每个测试前重置模板数据"""
    templates.clear()
    _seed_templates()


# ---- 健康检查 ----

class TestHealth:
    def test_health_check(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert data["service"] == "template-service"


# ---- 种子数据 ----

class TestSeedData:
    def test_seed_creates_templates(self):
        assert len(templates) >= 10

    def test_seed_has_all_categories(self):
        cats = set(t["category"] for t in templates.values())
        assert "tech" in cats
        assert "design" in cats
        assert "finance" in cats
        assert "marketing" in cats

    def test_seed_has_all_styles(self):
        styles = set(t["style"] for t in templates.values())
        for s in ["classic", "modern", "minimal", "creative", "academic", "executive"]:
            assert s in styles, f"Missing style: {s}"

    def test_seed_has_company_types(self):
        ct = set()
        for t in templates.values():
            ct.update(t.get("companyTypes", []))
        for expected in ["internet", "foreign", "soe", "startup", "consulting"]:
            assert expected in ct, f"Missing company type: {expected}"


# ---- 模板列表 ----

class TestListTemplates:
    def test_list_all(self, client):
        r = client.get("/api/templates")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 10
        assert len(data["data"]) > 0

    def test_filter_by_category(self, client):
        r = client.get("/api/templates?category=tech")
        assert r.status_code == 200
        data = r.json()
        for t in data["data"]:
            assert t["category"] == "tech"

    def test_filter_by_style(self, client):
        r = client.get("/api/templates?style=modern")
        assert r.status_code == 200
        data = r.json()
        for t in data["data"]:
            assert t["style"] == "modern"

    def test_filter_by_company_type(self, client):
        r = client.get("/api/templates?companyType=internet")
        assert r.status_code == 200
        data = r.json()
        for t in data["data"]:
            assert "internet" in t.get("companyTypes", [])

    def test_filter_by_premium(self, client):
        r = client.get("/api/templates?isPremium=true")
        assert r.status_code == 200
        data = r.json()
        for t in data["data"]:
            assert t["isPremium"] is True

    def test_filter_by_free(self, client):
        r = client.get("/api/templates?isPremium=false")
        assert r.status_code == 200
        data = r.json()
        for t in data["data"]:
            assert t["isPremium"] is False

    def test_filter_by_tag(self, client):
        r = client.get("/api/templates?tag=大厂")
        assert r.status_code == 200
        data = r.json()
        for t in data["data"]:
            assert "大厂" in t.get("tags", [])

    def test_search_by_keyword(self, client):
        r = client.get("/api/templates?keyword=互联网")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1

    def test_sort_by_rating(self, client):
        r = client.get("/api/templates?sortBy=rating")
        assert r.status_code == 200
        data = r.json()
        ratings = [t["rating"] for t in data["data"]]
        for i in range(len(ratings) - 1):
            assert ratings[i] >= ratings[i + 1]

    def test_sort_by_newest(self, client):
        r = client.get("/api/templates?sortBy=newest")
        assert r.status_code == 200
        data = r.json()
        dates = [t["createdAt"] for t in data["data"]]
        for i in range(len(dates) - 1):
            assert dates[i] >= dates[i + 1]

    def test_pagination(self, client):
        r = client.get("/api/templates?page=1&pageSize=3")
        assert r.status_code == 200
        data = r.json()
        assert data["page"] == 1
        assert data["pageSize"] == 3
        assert len(data["data"]) <= 3

    def test_pagination_page_2(self, client):
        r1 = client.get("/api/templates?page=1&pageSize=5")
        r2 = client.get("/api/templates?page=2&pageSize=5")
        ids_page1 = {t["id"] for t in r1.json()["data"]}
        ids_page2 = {t["id"] for t in r2.json()["data"]}
        assert ids_page1.isdisjoint(ids_page2), "Pages should not overlap"


# ---- 模板 CRUD ----

class TestTemplateCRUD:
    def test_get_template(self, client):
        tid = list(templates.keys())[0]
        r = client.get(f"/api/templates/{tid}")
        assert r.status_code == 200
        assert r.json()["data"]["id"] == tid

    def test_get_template_not_found(self, client):
        r = client.get("/api/templates/nonexistent")
        assert r.status_code == 404

    def test_create_template(self, client):
        payload = {
            "name": "测试模板",
            "description": "测试用",
            "category": "tech",
            "style": "modern",
            "companyTypes": ["internet"],
            "tags": ["测试"],
            "thumbnailUrl": "",
            "previewUrl": "",
            "htmlTemplate": "<!-- test -->",
            "isPremium": False,
        }
        r = client.post("/api/templates", json=payload)
        assert r.status_code == 201
        data = r.json()
        assert data["data"]["name"] == "测试模板"
        assert data["data"]["id"]

    def test_update_template(self, client):
        tid = list(templates.keys())[0]
        r = client.put(f"/api/templates/{tid}", json={"name": "更新后名称"})
        assert r.status_code == 200
        assert r.json()["data"]["name"] == "更新后名称"

    def test_update_template_not_found(self, client):
        r = client.put("/api/templates/nonexistent", json={"name": "x"})
        assert r.status_code == 404

    def test_delete_template(self, client):
        tid = list(templates.keys())[0]
        r = client.delete(f"/api/templates/{tid}")
        assert r.status_code == 200
        assert tid not in templates

    def test_delete_template_not_found(self, client):
        r = client.delete("/api/templates/nonexistent")
        assert r.status_code == 404


# ---- 评分 ----

class TestRating:
    def test_rate_template(self, client):
        tid = list(templates.keys())[0]
        old = templates[tid]["rating"]
        r = client.post(f"/api/templates/{tid}/rate?rating=5")
        assert r.status_code == 200
        new_rating = r.json()["data"]["rating"]
        assert new_rating >= old

    def test_rate_invalid(self, client):
        tid = list(templates.keys())[0]
        r = client.post(f"/api/templates/{tid}/rate?rating=0")
        assert r.status_code == 422

    def test_rate_increases_count(self, client):
        tid = list(templates.keys())[0]
        old_count = templates[tid]["ratingCount"]
        client.post(f"/api/templates/{tid}/rate?rating=4")
        assert templates[tid]["ratingCount"] == old_count + 1


# ---- 分类统计 ----

class TestCategoriesSummary:
    def test_summary(self, client):
        r = client.get("/api/templates/categories/summary")
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["total"] >= 10
        assert "categories" in data
        assert "styles" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
