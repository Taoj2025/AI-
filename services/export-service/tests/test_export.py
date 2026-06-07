# ============================================================
# Export Service 单元测试
# 测试 PDF/Word/HTML/Markdown/PPT 导出器的核心逻辑
# ============================================================
import pytest
import sys, os, tempfile, json

# 确保 src 目录在路径中
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

# Mock 简历数据
SAMPLE_RESUME = {
    "personal": {
        "name": "张三",
        "title": "高级前端工程师",
        "email": "zhangsan@example.com",
        "phone": "13800138000",
        "location": "北京",
    },
    "summary": "5年前端开发经验，专注于 React 和 TypeScript。",
    "education": [
        {"school": "清华大学", "major": "计算机科学", "degree": "硕士", "startDate": "2017", "endDate": "2020"}
    ],
    "work": [
        {
            "company": "字节跳动",
            "position": "高级前端工程师",
            "startDate": "2020-07",
            "endDate": None,
            "description": "负责抖音电商前端架构设计",
            "achievements": ["性能优化提升 40%", "团队从 5 人扩展到 15 人"],
        }
    ],
    "projects": [
        {
            "name": "电商中台重构",
            "role": "技术负责人",
            "startDate": "2022-01",
            "endDate": "2022-06",
            "description": "主导电商中台前端重构，采用微前端架构",
            "technologies": ["React", "Module Federation", "TypeScript"],
        }
    ],
    "skills": [
        {"category": "前端框架", "items": ["React", "Vue", "Next.js"]},
        {"category": "语言", "items": ["TypeScript", "Python", "Go"]},
    ],
}


# -------- 导出器测试 --------
class TestBaseRenderer:
    def test_render_html_contains_name(self):
        from exporters import BaseRenderer
        html = BaseRenderer.render_html(SAMPLE_RESUME)
        assert "张三" in html

    def test_render_html_contains_sections(self):
        from exporters import BaseRenderer
        html = BaseRenderer.render_html(SAMPLE_RESUME)
        assert "工作经历" in html
        assert "教育背景" in html
        assert "专业技能" in html

    def test_render_html_respects_style(self):
        from exporters import BaseRenderer
        html = BaseRenderer.render_html(SAMPLE_RESUME, style="minimal")
        assert "style-minimal" in html

    def test_render_different_styles_differ(self):
        from exporters import BaseRenderer
        h1 = BaseRenderer.render_html(SAMPLE_RESUME, style="modern")
        h2 = BaseRenderer.render_html(SAMPLE_RESUME, style="classic")
        assert "style-modern" in h1
        assert "style-classic" in h2
        assert h1 != h2


class TestPDFExporter:
    def test_export_creates_file(self):
        from exporters import PDFExporter
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            output = f.name
        try:
            result = PDFExporter.export(SAMPLE_RESUME, output, {})
            assert os.path.exists(result)
            assert os.path.getsize(result) > 200
        finally:
            if os.path.exists(output):
                os.unlink(output)

    def test_export_with_chinese(self):
        from exporters import PDFExporter
        data = {**SAMPLE_RESUME, "personal": {**SAMPLE_RESUME["personal"], "name": "李四测试UTF8"}}
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            output = f.name
        try:
            result = PDFExporter.export(data, output, {})
            assert os.path.exists(result)
        finally:
            if os.path.exists(output):
                os.unlink(output)


class TestWordExporter:
    def test_export_creates_docx(self):
        from exporters import WordExporter
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
            output = f.name
        try:
            result = WordExporter.export(SAMPLE_RESUME, output, {})
            assert os.path.exists(result)
            assert result.endswith(".docx")
            assert os.path.getsize(output) > 512
        finally:
            if os.path.exists(output):
                os.unlink(output)

    def test_docx_contains_name(self):
        from exporters import WordExporter
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
            output = f.name
        try:
            WordExporter.export(SAMPLE_RESUME, output, {})
            from docx import Document
            doc = Document(output)
            texts = " ".join([p.text for p in doc.paragraphs])
            assert "张三" in texts
        finally:
            if os.path.exists(output):
                os.unlink(output)


class TestPPTExporter:
    def test_export_creates_pptx(self):
        from exporters import PPTExporter
        with tempfile.NamedTemporaryFile(suffix=".pptx", delete=False) as f:
            output = f.name
        try:
            result = PPTExporter.export(SAMPLE_RESUME, output, {})
            assert os.path.exists(result)
            assert os.path.getsize(output) > 256
        finally:
            if os.path.exists(output):
                os.unlink(output)


class TestHTMLExporter:
    def test_export_creates_html(self):
        from exporters import HTMLExporter
        with tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w") as f:
            output = f.name
        try:
            result = HTMLExporter.export(SAMPLE_RESUME, output, {})
            with open(result, encoding="utf-8") as f:
                content = f.read()
            assert "张三" in content
            assert "<!DOCTYPE html>" in content
        finally:
            if os.path.exists(output):
                os.unlink(output)


class TestMarkdownExporter:
    def test_export_creates_md(self):
        from exporters import MarkdownExporter
        with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w") as f:
            output = f.name
        try:
            result = MarkdownExporter.export(SAMPLE_RESUME, output, {})
            with open(result, encoding="utf-8") as f:
                content = f.read()
            assert "# 张三" in content
            assert "## 工作经历" in content
            assert "字节跳动" in content
        finally:
            if os.path.exists(output):
                os.unlink(output)

    def test_markdown_sections(self):
        from exporters import MarkdownExporter
        with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w") as f:
            output = f.name
        try:
            MarkdownExporter.export(SAMPLE_RESUME, output, {})
            with open(output, encoding="utf-8") as f:
                content = f.read()
            assert "## 个人总结" in content
            assert "## 教育背景" in content
            assert "## 专业技能" in content
            assert "## 项目经历" in content
        finally:
            if os.path.exists(output):
                os.unlink(output)


class TestImageExporter:
    def test_export_creates_png(self):
        from exporters import ImageExporter
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            output = f.name
        try:
            result = ImageExporter.export(SAMPLE_RESUME, output, "png", {})
            assert os.path.exists(result)
            assert os.path.getsize(output) > 100
        finally:
            if os.path.exists(output):
                os.unlink(output)


class TestExportResume:
    def test_export_pdf(self):
        from exporters import export_resume
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            output = f.name
        try:
            result = export_resume(SAMPLE_RESUME, output, "pdf")
            assert os.path.exists(result)
        finally:
            if os.path.exists(output):
                os.unlink(output)

    def test_export_markdown(self):
        from exporters import export_resume
        with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w") as f:
            output = f.name
        try:
            export_resume(SAMPLE_RESUME, output, "markdown")
            with open(output, encoding="utf-8") as f:
                assert "张三" in f.read()
        finally:
            if os.path.exists(output):
                os.unlink(output)

    def test_unsupported_format_raises(self):
        from exporters import export_resume
        with pytest.raises(ValueError, match="不支持的导出格式"):
            export_resume(SAMPLE_RESUME, "/tmp/test.xyz", "xyz")


class TestExportMap:
    def test_all_formats_have_exporter(self):
        from exporters import EXPORT_MAP
        for fmt in ['pdf', 'docx', 'pptx', 'png', 'jpg', 'html', 'markdown']:
            assert fmt in EXPORT_MAP, f"Missing exporter for format: {fmt}"

    def test_image_formats_share_exporter(self):
        from exporters import EXPORT_MAP
        assert EXPORT_MAP['png'] is EXPORT_MAP['jpg']


# -------- API 测试 --------
class TestExportAPI:
    def test_health(self):
        from main import app
        from fastapi.testclient import TestClient
        client = TestClient(app)
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

    def test_create_export_task(self):
        from main import app
        from fastapi.testclient import TestClient
        client = TestClient(app)
        payload = {
            "resume_id": "resume-001",
            "version_id": "v-001",
            "format": "pdf",
            "options": {"pageSize": "A4"},
        }
        res = client.post("/api/export", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "task_id" in data
        assert data["status"] == "processing"

    def test_get_export_status(self):
        from main import app
        from fastapi.testclient import TestClient
        client = TestClient(app)
        payload = {"resume_id": "r1", "version_id": "v1", "format": "pdf"}
        create_res = client.post("/api/export", json=payload)
        task_id = create_res.json()["task_id"]
        res = client.get(f"/api/export/{task_id}")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("processing", "completed", "failed")

    def test_get_nonexist_task(self):
        from main import app
        from fastapi.testclient import TestClient
        client = TestClient(app)
        res = client.get("/api/export/nonexist-id")
        assert res.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
