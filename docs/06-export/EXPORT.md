# 导出模块设计文档

**模块**: 06-export  
**版本**: v1.0.0  
**状态**: 规划中

---

## 1. 支持的导出格式

| 格式 | 技术方案 | 适用场景 |
|------|---------|---------|
| PDF | WeasyPrint / Puppeteer | 投递正式简历，通用性最强 |
| Word (.docx) | python-docx | 需要继续编辑 |
| PPT (.pptx) | python-pptx | 演示/特殊场景 |
| PNG/JPG | Playwright 截图 / Pillow | 社交分享、微信传送 |
| HTML | Jinja2 模板渲染 | 在线简历链接 |
| Markdown | 自定义渲染器 | GitHub/技术社区 |
| JSON | 直接序列化 | API 接入、数据备份 |

---

## 2. 导出服务架构

```python
# export-service/main.py
class ExportService:
    
    exporters = {
        "pdf": PDFExporter,
        "word": WordExporter,
        "ppt": PPTExporter,
        "png": ImageExporter,
        "jpg": ImageExporter,
        "html": HTMLExporter,
        "markdown": MarkdownExporter,
        "json": JSONExporter,
    }
    
    async def export(
        self,
        resume_id: str,
        format: str,
        options: ExportOptions
    ) -> ExportResult:
        
        # 1. 获取简历数据
        resume = await resume_repo.get(resume_id)
        
        # 2. 获取模板配置
        template = await template_repo.get(resume.template_id)
        
        # 3. 选择导出器
        exporter = self.exporters[format](template, options)
        
        # 4. 执行导出
        file_path = await exporter.export(resume)
        
        # 5. 上传到对象存储
        url = await storage.upload(file_path, expires_in=7*24*3600)
        
        return ExportResult(url=url, format=format, size=os.path.getsize(file_path))
```

---

## 3. PDF 导出方案

### 3.1 双引擎策略

```python
class PDFExporter:
    
    async def export(self, resume: Resume) -> str:
        # 优先使用 Puppeteer（像素级精确，支持复杂CSS）
        try:
            return await self._puppeteer_export(resume)
        except Exception:
            # 降级到 WeasyPrint（Python原生，无需浏览器）
            return await self._weasyprint_export(resume)
    
    async def _puppeteer_export(self, resume: Resume) -> str:
        # 1. 用 Jinja2 渲染 HTML
        html = self._render_html(resume)
        
        # 2. 启动 Headless Chromium
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()
            await page.set_content(html, wait_until='networkidle')
            
            # 3. 导出 PDF（A4，精确边距）
            pdf_bytes = await page.pdf(
                format='A4',
                margin={'top': '15mm', 'bottom': '15mm', 
                        'left': '15mm', 'right': '15mm'},
                print_background=True
            )
            
            await browser.close()
        
        # 4. 保存并返回路径
        return self._save(pdf_bytes, resume.id)
```

### 3.2 PDF 质量要求

- 字体嵌入（中文字体嵌入，避免乱码）
- 链接可点击（邮箱、GitHub、作品集）
- ATS 可解析（纯文本层，非图片PDF）
- 文件大小优化（< 2MB）

---

## 4. Word 导出方案

```python
class WordExporter:
    
    async def export(self, resume: Resume) -> str:
        doc = Document()
        
        # 页面设置（A4）
        section = doc.sections[0]
        section.page_width = Mm(210)
        section.page_height = Mm(297)
        section.top_margin = Mm(15)
        section.bottom_margin = Mm(15)
        
        # 样式定义
        self._define_styles(doc, resume.template.config)
        
        # 渲染各模块
        self._render_header(doc, resume.personal)
        self._render_summary(doc, resume.summary)
        self._render_experience(doc, resume.experience)
        self._render_education(doc, resume.education)
        self._render_skills(doc, resume.skills)
        self._render_projects(doc, resume.projects)
        
        # 保存
        path = f"/tmp/{resume.id}.docx"
        doc.save(path)
        return path
```

---

## 5. PPT 导出方案

```python
class PPTExporter:
    """
    将简历导出为演示文稿格式
    适用场景: 面试自我介绍、作品集展示
    """
    
    SLIDE_TEMPLATES = {
        "cover": "封面幻灯片（姓名+求职意向+联系方式）",
        "summary": "个人简介幻灯片",
        "experience": "工作经历幻灯片（每段经历一页）",
        "skills": "技能栈幻灯片（图表展示）",
        "projects": "项目展示幻灯片",
        "education": "教育背景幻灯片",
    }
    
    async def export(self, resume: Resume) -> str:
        prs = Presentation()
        prs.slide_width = Inches(13.33)
        prs.slide_height = Inches(7.5)
        
        # 按照规划生成每页幻灯片
        for slide_type, data in self._get_slide_data(resume):
            self._add_slide(prs, slide_type, data, resume.template.config)
        
        path = f"/tmp/{resume.id}.pptx"
        prs.save(path)
        return path
```

---

## 6. 图片导出方案

```python
class ImageExporter:
    """
    导出为高分辨率图片（适合微信/社交分享）
    """
    
    async def export(self, resume: Resume, format: str = "png") -> str:
        # 1. 先导出 PDF
        pdf_path = await PDFExporter().export(resume)
        
        # 2. PDF 转图片（高分辨率，300 DPI）
        images = convert_from_path(
            pdf_path, 
            dpi=300,
            fmt=format,
            output_folder="/tmp"
        )
        
        # 3. 如果多页，拼接为长图
        if len(images) > 1 and resume.options.get("merge_pages"):
            merged = self._merge_images_vertically(images)
            path = f"/tmp/{resume.id}.{format}"
            merged.save(path, quality=95)
            return path
        
        return images[0].filename
```

---

## 7. HTML 在线简历

```python
class HTMLExporter:
    """
    生成可在线访问的 HTML 简历页面
    支持 SEO、可分享链接
    """
    
    async def export(self, resume: Resume) -> str:
        # 渲染完整 HTML 页面（含内联 CSS，无外部依赖）
        html = self.jinja_env.get_template(
            f"templates/{resume.template.id}/resume.html"
        ).render(
            resume=resume,
            config=resume.template.config,
            meta={
                "title": f"{resume.personal.name} - 简历",
                "description": resume.summary[:160],
            }
        )
        
        # 上传到对象存储，返回公开 URL
        url = await storage.upload_html(
            html, 
            key=f"resumes/{resume.share_token}/index.html",
            content_type="text/html; charset=utf-8"
        )
        
        return url
```

---

## 8. 导出任务队列

```
导出请求 → API → 创建导出任务（export_jobs表）→ 推入 BullMQ 队列
                                                      ↓
Worker 消费 → 执行导出 → 上传文件 → 更新任务状态 → 通知用户（WebSocket/Push）
```

### 优先级策略

```
付费用户: HIGH 优先级队列
免费用户: NORMAL 优先级队列
批量导出: LOW 优先级队列
```

---

## 9. 导出限制策略

| 用户等级 | 每日导出次数 | 可用格式 |
|---------|------------|---------|
| FREE | 3次 | PDF |
| BASIC | 20次 | PDF + Word + PNG |
| PRO | 无限 | 全部格式 |

---

*关联文档: [后端服务](../03-backend/BACKEND.md) | [数据层](../05-data/DATABASE.md)*
