# 后端服务设计文档

**模块**: 03-backend  
**版本**: v1.0.0  
**状态**: 规划中

---

## 1. 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 22.x | 用户/简历/模板/支付服务 |
| Fastify | 4.x | 高性能 HTTP 框架 |
| Python | 3.12 | AI调度/导出/文件解析服务 |
| FastAPI | 0.111 | Python 异步 HTTP 框架 |
| Prisma | 5.x | Node.js ORM |
| SQLAlchemy | 2.x | Python ORM |
| BullMQ | 5.x | 任务队列（Node.js） |
| Celery | 5.x | 任务队列（Python） |
| JWT | - | 无状态认证 |
| Passport.js | - | OAuth 集成 |
| Zod | - | 参数校验（Node.js） |
| Pydantic | 2.x | 参数校验（Python） |

---

## 2. 服务详细设计

### 2.1 用户服务（user-service）

#### 功能职责
- 用户注册/登录（邮箱、手机号）
- OAuth 第三方登录（微信、GitHub、Google）
- JWT 令牌管理（访问令牌 + 刷新令牌）
- 用户 Profile 管理
- 会员等级管理

#### 核心 API

```typescript
// 注册
POST /api/v1/auth/register
Body: { email, password, username }
Response: { user, accessToken, refreshToken }

// 登录
POST /api/v1/auth/login
Body: { email, password }
Response: { user, accessToken, refreshToken }

// OAuth 回调
GET /api/v1/auth/oauth/wechat/callback
GET /api/v1/auth/oauth/github/callback

// 刷新令牌
POST /api/v1/auth/refresh
Body: { refreshToken }
Response: { accessToken }
```

#### 会员等级设计

```
FREE      - 每月3次AI生成，2个简历，3个模板
BASIC     - 每月20次AI生成，10个简历，全量模板，PDF导出
PRO       - 无限生成，无限简历，全量导出，自定义API Key
ENTERPRISE - 私有部署，团队管理，API访问，定制服务
```

---

### 2.2 简历服务（resume-service）

#### 功能职责
- 简历 CRUD（创建/读取/更新/删除）
- 简历版本管理
- 多版本（不同公司类型）管理
- 简历数据结构校验

#### 核心 API

```typescript
// 创建简历
POST /api/v1/resumes
Body: { title, templateId, targetCompanyType }
Response: { resume }

// 更新简历内容
PUT /api/v1/resumes/:id
Body: { sections: { personal, experience, education, skills, ... } }

// 触发 AI 生成
POST /api/v1/resumes/:id/generate
Body: { 
  modelId: "gpt-4o" | "claude-3.5" | ...,
  jobDescription: string,
  companyType: "internet_giant" | ...,
  styleOptions: { tone, length, focus }
}
Response: { taskId }  // 异步任务，轮询状态

// 查询生成状态（SSE 流式）
GET /api/v1/resumes/:id/generate/status
GET /api/v1/resumes/:id/generate/stream  // SSE

// 获取历史版本
GET /api/v1/resumes/:id/versions
Response: { versions: [{ versionId, createdAt, companyType, ... }] }

// 恢复历史版本
POST /api/v1/resumes/:id/versions/:versionId/restore
```

#### 版本管理策略

```
每次 AI 生成 → 自动创建版本快照
每次手动保存 → 创建版本快照
版本保留策略: 免费用户5个版本，付费用户无限版本
```

---

### 2.3 模板服务（template-service）

#### 数据结构

```typescript
interface Template {
  id: string;
  name: string;
  category: 'minimal' | 'business' | 'creative' | 'technical' | 'academic' | 'international';
  industries: string[];       // 适用行业
  companyTypes: string[];     // 适合公司类型
  experienceLevel: string[];  // 经验等级
  previewUrl: string;         // 预览图
  thumbnailUrl: string;       // 缩略图
  config: TemplateConfig;     // 渲染配置（颜色/字体/布局）
  isPremium: boolean;
  downloadCount: number;
  rating: number;
}
```

---

### 2.4 AI 调度服务（ai-dispatch-service，Python）

#### 功能职责
- 接收 AI 生成任务
- 调用 OpenClaw + Hermes 执行
- 管理任务队列（Celery + Redis）
- 流式输出转发（SSE）
- 成本统计与限额控制

#### 任务处理流程

```python
# tasks/resume_generation.py
@celery_app.task(bind=True, max_retries=3)
async def generate_resume_task(
    self,
    resume_id: str,
    user_id: str,
    params: GenerationParams
):
    try:
        # 1. 获取用户简历数据
        resume_data = await resume_repo.get(resume_id)
        
        # 2. 通过 Hermes 选择模型
        model = hermes.select_model(params.model_id, user_id)
        
        # 3. 通过 OpenClaw 编排生成链
        chain = openclaw.create_resume_chain(
            resume_data=resume_data,
            params=params
        )
        
        # 4. 执行并流式推送
        async for chunk in chain.stream(model):
            await redis_pub.publish(f"resume:{resume_id}", chunk)
        
        # 5. 保存结果 + 更新状态
        await resume_repo.update_generated(resume_id, chain.result)
        
    except Exception as e:
        self.retry(countdown=2 ** self.request.retries)
        raise
```

---

### 2.5 导出服务（export-service，Python）

详见 [导出模块文档](../06-export/EXPORT.md)

---

### 2.6 文件解析服务（file-service，Python）

#### 支持格式

```python
SUPPORTED_FORMATS = {
    "pdf": PDFParser,       # PyMuPDF + pdfplumber
    "docx": DocxParser,     # python-docx
    "pptx": PPTXParser,     # python-pptx
    "jpg|jpeg|png": ImageParser,  # Pillow + Tesseract + GPT-4V
    "txt": TextParser,      # 直接处理
}
```

#### OCR 流程

```python
class ImageParser:
    async def parse(self, file_path: str) -> StructuredResume:
        # 1. 图像预处理（对比度/降噪）
        img = preprocess_image(file_path)
        
        # 2. Tesseract OCR 提取文本
        raw_text = tesseract.image_to_string(img, lang="chi_sim+eng")
        
        # 3. GPT-4V 多模态辅助解析（提高准确率）
        structured = await hermes.chat(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": encode_image(file_path)}},
                    {"type": "text", "text": EXTRACT_RESUME_PROMPT}
                ]
            }]
        )
        
        return parse_json_response(structured)
```

---

## 3. 中间件设计

### 3.1 认证中间件

```typescript
// middleware/auth.ts
export async function authMiddleware(request, reply) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return reply.status(401).send({ code: 1001, message: '未授权' });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    request.user = await userService.findById(payload.sub);
  } catch (e) {
    return reply.status(401).send({ code: 1002, message: 'Token 无效或已过期' });
  }
}
```

### 3.2 限流中间件

```typescript
// 基于 Redis 的滑动窗口限流
// 免费用户: 10次/分钟 API调用，3次/天 AI生成
// 付费用户: 60次/分钟 API调用，无限 AI生成
const rateLimitConfig = {
  free: { windowMs: 60000, max: 10 },
  paid: { windowMs: 60000, max: 60 },
};
```

### 3.3 请求日志中间件

```typescript
// 记录所有 API 请求（requestId, userId, path, method, duration, status）
// 敏感字段脱敏: password, token, apiKey
```

---

## 4. 错误处理规范

```typescript
// 全局错误处理
fastify.setErrorHandler((error, request, reply) => {
  const response = {
    code: error.code || 5000,
    message: error.message || '服务器内部错误',
    requestId: request.id,
    timestamp: new Date().toISOString(),
  };
  
  // 生产环境不暴露堆栈信息
  if (process.env.NODE_ENV !== 'production') {
    response.stack = error.stack;
  }
  
  logger.error({ requestId: request.id, error });
  
  reply.status(error.statusCode || 500).send(response);
});
```

---

*关联文档: [架构设计](../01-architecture/ARCHITECTURE.md) | [AI引擎](../04-ai-engine/AI_ENGINE.md) | [数据层](../05-data/DATABASE.md)*
