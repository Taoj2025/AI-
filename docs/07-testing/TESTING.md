# 测试策略与用例文档

**模块**: 07-testing  
**版本**: v1.0.0  
**状态**: 规划中

---

## 1. 测试策略总览

### 1.1 测试金字塔

```
         ┌──────────────┐
         │   E2E 测试    │  10%（关键用户路径）
         │  (Playwright) │
        ┌┴──────────────┴┐
        │   集成测试      │  30%（API、服务间）
        │  (Jest/Pytest)  │
      ┌─┴────────────────┴─┐
      │     单元测试         │  60%（函数、组件）
      │  (Jest/Vitest/Pytest)│
      └────────────────────┘
```

### 1.2 测试工具栈

| 层级 | 工具 | 用途 |
|------|------|------|
| Node.js 单元 | Vitest | 快速、TypeScript 原生支持 |
| Node.js 集成 | Vitest + Supertest | HTTP 接口测试 |
| Python 单元 | Pytest | AI服务、导出服务 |
| Python 集成 | Pytest + httpx | FastAPI 接口测试 |
| 前端组件 | React Testing Library | RN + Web 组件 |
| E2E 移动端 | Detox | React Native E2E |
| E2E Web | Playwright | Next.js E2E |
| 性能测试 | k6 | API 压力测试 |
| AI 质量测试 | 自定义评估框架 | 生成质量评分 |

### 1.3 测试覆盖率要求

| 模块 | 最低覆盖率 |
|------|-----------|
| 核心业务逻辑 | 90% |
| API 接口 | 85% |
| AI 引擎 | 80% |
| 导出模块 | 85% |
| 前端组件 | 75% |

---

## 2. 单元测试用例

### 2.1 Hermes 适配层测试

```python
# tests/unit/test_hermes.py
import pytest
from unittest.mock import AsyncMock, patch
from ai_engine.hermes import HermesAdapter

class TestHermesAdapter:
    
    @pytest.fixture
    def hermes(self):
        return HermesAdapter(config=TEST_CONFIG)
    
    @pytest.mark.asyncio
    async def test_openai_chat_success(self, hermes):
        """测试 OpenAI 正常调用"""
        with patch('openai.AsyncOpenAI') as mock_client:
            mock_client.return_value.chat.completions.create = AsyncMock(
                return_value=mock_openai_response("测试回复")
            )
            result = await hermes.chat(
                model="gpt-4o",
                messages=[{"role": "user", "content": "生成一份简历"}]
            )
            assert result.content == "测试回复"
            assert result.model == "gpt-4o"
    
    @pytest.mark.asyncio
    async def test_failover_on_rate_limit(self, hermes):
        """测试限流时故障转移"""
        with patch('openai.AsyncOpenAI') as mock_primary:
            mock_primary.return_value.chat.completions.create = AsyncMock(
                side_effect=RateLimitError("Rate limit exceeded")
            )
            with patch.object(hermes, '_call_fallback') as mock_fallback:
                mock_fallback.return_value = mock_response("fallback回复")
                result = await hermes.chat(model="gpt-4o", messages=[...])
                mock_fallback.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_cost_tracking(self, hermes):
        """测试成本追踪"""
        with patch.object(hermes.cost_tracker, 'record') as mock_record:
            await hermes.chat(model="gpt-4o", messages=[...])
            mock_record.assert_called_once()
            call_args = mock_record.call_args[0]
            assert call_args[0] == "gpt-4o"
            assert call_args[1] > 0  # token 消耗 > 0
    
    def test_model_resolution(self, hermes):
        """测试模型名称解析"""
        assert hermes._resolve_provider("gpt-4o") == "openai"
        assert hermes._resolve_provider("claude-3.5-sonnet") == "anthropic"
        assert hermes._resolve_provider("gemini-1.5-pro") == "google"
        assert hermes._resolve_provider("ernie-4.0") == "baidu"
```

### 2.2 OpenClaw 简历生成链测试

```python
# tests/unit/test_openclaw.py
class TestResumeGenerationChain:
    
    @pytest.mark.asyncio
    async def test_full_chain_execution(self, mock_hermes):
        """测试完整生成链路"""
        chain = ResumeGenerationChain(hermes=mock_hermes)
        
        input_data = ResumeInput(
            personal={"name": "张三", "email": "test@example.com"},
            experience=[{"company": "字节跳动", "position": "工程师", "years": 3}],
            target_job="高级后端工程师",
            company_type="internet_giant"
        )
        
        result = await chain.execute(input_data)
        
        assert result.status == "completed"
        assert result.resume.personal.name == "张三"
        assert len(result.resume.experience) > 0
        assert "高并发" in result.resume.summary or "微服务" in result.resume.summary
    
    def test_company_type_prompt_injection(self):
        """测试公司类型提示词注入"""
        builder = PromptBuilder()
        
        internet_prompt = builder.build(company_type="internet_giant")
        assert "数据驱动" in internet_prompt or "量化" in internet_prompt
        
        startup_prompt = builder.build(company_type="startup")
        assert "0-1" in startup_prompt or "快速学习" in startup_prompt
        
        foreign_prompt = builder.build(company_type="foreign_company")
        assert "领导力" in foreign_prompt or "沟通" in foreign_prompt
```

### 2.3 导出模块测试

```python
# tests/unit/test_export.py
class TestPDFExporter:
    
    @pytest.mark.asyncio
    async def test_pdf_export_success(self, sample_resume):
        """测试 PDF 导出成功"""
        exporter = PDFExporter()
        result = await exporter.export(sample_resume)
        
        assert os.path.exists(result)
        assert result.endswith(".pdf")
        assert os.path.getsize(result) > 0
        assert os.path.getsize(result) < 2 * 1024 * 1024  # < 2MB
    
    @pytest.mark.asyncio
    async def test_pdf_contains_text(self, sample_resume):
        """测试 PDF 文本可提取（ATS兼容）"""
        exporter = PDFExporter()
        pdf_path = await exporter.export(sample_resume)
        
        with pdfplumber.open(pdf_path) as pdf:
            text = "".join(page.extract_text() for page in pdf.pages)
        
        assert sample_resume.personal.name in text
        assert sample_resume.personal.email in text
    
    @pytest.mark.asyncio
    async def test_word_export_valid(self, sample_resume):
        """测试 Word 导出合法性"""
        exporter = WordExporter()
        docx_path = await exporter.export(sample_resume)
        
        doc = Document(docx_path)
        full_text = "\n".join([p.text for p in doc.paragraphs])
        
        assert sample_resume.personal.name in full_text
```

### 2.4 前端组件测试

```typescript
// tests/components/ResumeCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ResumeCard } from '@/components/resume/ResumeCard';

describe('ResumeCard', () => {
  const mockResume = {
    id: '1',
    title: '我的简历',
    status: 'generated',
    updatedAt: '2026-06-07',
    templateName: '极简风',
  };
  
  it('should render resume title', () => {
    render(<ResumeCard resume={mockResume} />);
    expect(screen.getByText('我的简历')).toBeTruthy();
  });
  
  it('should call onPress when tapped', () => {
    const onPress = jest.fn();
    render(<ResumeCard resume={mockResume} onPress={onPress} />);
    fireEvent.press(screen.getByTestId('resume-card'));
    expect(onPress).toHaveBeenCalledWith(mockResume.id);
  });
  
  it('should show generating status correctly', () => {
    render(<ResumeCard resume={{ ...mockResume, status: 'generating' }} />);
    expect(screen.getByText('AI 生成中...')).toBeTruthy();
  });
});
```

---

## 3. 集成测试用例

### 3.1 API 集成测试

```typescript
// tests/integration/resume.api.test.ts
describe('Resume API Integration', () => {
  let authToken: string;
  let resumeId: string;
  
  beforeAll(async () => {
    // 创建测试用户并登录
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@test.com', password: 'Test1234!', username: '测试用户' });
    authToken = res.body.data.accessToken;
  });
  
  it('POST /api/v1/resumes — should create resume', async () => {
    const res = await request(app)
      .post('/api/v1/resumes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: '测试简历', targetCompanyType: 'internet_giant' });
    
    expect(res.status).toBe(201);
    expect(res.body.data.resume.id).toBeDefined();
    resumeId = res.body.data.resume.id;
  });
  
  it('POST /api/v1/resumes/:id/generate — should trigger AI generation', async () => {
    const res = await request(app)
      .post(`/api/v1/resumes/${resumeId}/generate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        modelId: 'gpt-4o-mini',
        jobDescription: '负责后端服务开发，熟悉 Node.js',
        companyType: 'internet_giant',
      });
    
    expect(res.status).toBe(202);
    expect(res.body.data.taskId).toBeDefined();
  });
  
  it('should enforce rate limiting for free users', async () => {
    // 连续发送超过限制的请求
    for (let i = 0; i < 12; i++) {
      await request(app)
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${authToken}`);
    }
    
    const res = await request(app)
      .get('/api/v1/resumes')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(429);
  });
});
```

---

## 4. E2E 测试用例

### 4.1 Web E2E（Playwright）

```typescript
// tests/e2e/create-resume.spec.ts
import { test, expect } from '@playwright/test';

test.describe('简历创建完整流程', () => {
  test('should create, generate and export resume', async ({ page }) => {
    // 1. 登录
    await page.goto('/login');
    await page.fill('[name=email]', 'e2e@test.com');
    await page.fill('[name=password]', 'E2ETest123!');
    await page.click('[type=submit]');
    await expect(page).toHaveURL('/dashboard');
    
    // 2. 新建简历
    await page.click('[data-testid=create-resume-btn]');
    await page.fill('[name=title]', 'E2E测试简历');
    await page.click('[data-testid=company-type-internet]');
    await page.click('[data-testid=next-btn]');
    
    // 3. 填写信息
    await page.fill('[name=name]', '张三');
    await page.fill('[name=email]', 'zhangsan@example.com');
    await page.click('[data-testid=next-btn]');
    
    // 4. 触发 AI 生成（等待完成）
    await page.click('[data-testid=generate-btn]');
    await expect(page.locator('[data-testid=generation-status]'))
      .toHaveText('生成完成', { timeout: 60000 });
    
    // 5. 导出 PDF
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid=export-pdf-btn]'),
    ]);
    
    expect(download.suggestedFilename()).toMatch(/.*\.pdf$/);
  });
});
```

---

## 5. AI 质量测试框架

```python
# tests/quality/test_ai_quality.py
class AIQualityEvaluator:
    """AI 生成简历质量自动评估"""
    
    METRICS = {
        "completeness": "关键字段完整度（0-10）",
        "relevance": "与目标JD的相关度（0-10）",
        "readability": "可读性评分（0-10）",
        "quantification": "量化成果比例（0-1）",
        "keyword_match": "关键词匹配率（0-1）",
        "grammar": "语法正确率（0-1）",
    }
    
    def evaluate(self, resume: Resume, jd: str) -> QualityReport:
        scores = {}
        scores["completeness"] = self._check_completeness(resume)
        scores["relevance"] = self._check_relevance(resume, jd)
        scores["quantification"] = self._check_quantification(resume)
        scores["keyword_match"] = self._check_keywords(resume, jd)
        
        overall = sum(scores.values()) / len(scores)
        
        # 质量要求: 综合评分 >= 7.0
        assert overall >= 7.0, f"AI生成质量不达标: {overall:.1f}/10"
        
        return QualityReport(scores=scores, overall=overall)
```

---

## 6. 性能测试（k6）

```javascript
// tests/performance/api-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // 爬升到 20 并发
    { duration: '1m', target: 50 },    // 维持 50 并发
    { duration: '30s', target: 100 },  // 峰值 100 并发
    { duration: '30s', target: 0 },    // 降低
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% 请求 < 500ms
    http_req_failed: ['rate<0.01'],    // 错误率 < 1%
  },
};

export default function() {
  const res = http.get(
    `${BASE_URL}/api/v1/templates`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

---

## 7. CI/CD 测试流水线

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on: [push, pull_request]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Node.js unit tests
        run: pnpm test:unit --coverage
      - name: Run Python unit tests
        run: pytest tests/unit/ --cov=. --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  integration-test:
    needs: unit-test
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test }
      redis:
        image: redis:7
    steps:
      - name: Run integration tests
        run: pnpm test:integration

  e2e-test:
    needs: integration-test
    steps:
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: pnpm test:e2e
```

---

*关联文档: [前端开发](../02-frontend/FRONTEND.md) | [后端服务](../03-backend/BACKEND.md) | [AI引擎](../04-ai-engine/AI_ENGINE.md)*
