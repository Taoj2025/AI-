# 数据库与存储设计文档

**模块**: 05-data  
**版本**: v1.0.0  
**状态**: 规划中

---

## 1. 数据库选型

| 组件 | 版本 | 用途 |
|------|------|------|
| PostgreSQL | 16 | 主数据库（用户、简历、模板等） |
| Redis | 7 | 缓存、Session、任务队列、Pub/Sub |
| MinIO | latest | 文件对象存储（或腾讯云COS） |

---

## 2. 数据库表设计（PostgreSQL）

### 2.1 用户表 (users)

```sql
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) UNIQUE NOT NULL,
  phone        VARCHAR(20) UNIQUE,
  username     VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255),          -- OAuth 登录可为空
  avatar_url   TEXT,
  plan         VARCHAR(20) DEFAULT 'free',  -- free/basic/pro/enterprise
  plan_expires_at TIMESTAMP,
  ai_tokens_used INT DEFAULT 0,
  ai_tokens_limit INT DEFAULT 3,        -- 免费用户每月限制
  tokens_reset_at TIMESTAMP,
  is_email_verified BOOLEAN DEFAULT false,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);
```

### 2.2 OAuth 账号绑定表 (oauth_accounts)

```sql
CREATE TABLE oauth_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  provider     VARCHAR(20) NOT NULL,  -- wechat/github/google
  provider_id  VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  created_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);
```

### 2.3 简历表 (resumes)

```sql
CREATE TABLE resumes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL DEFAULT '我的简历',
  status       VARCHAR(20) DEFAULT 'draft',  -- draft/generated/published
  target_company_type VARCHAR(50),  -- internet_giant/foreign/state/startup/consulting
  target_job   VARCHAR(200),
  job_description TEXT,             -- 目标 JD
  template_id  UUID REFERENCES templates(id),
  style_config JSONB DEFAULT '{}',  -- 颜色、字体等自定义
  is_public    BOOLEAN DEFAULT false,
  share_token  VARCHAR(64) UNIQUE,  -- 分享链接 token
  view_count   INT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);
```

### 2.4 简历内容表 (resume_sections)

```sql
CREATE TABLE resume_sections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id    UUID REFERENCES resumes(id) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL,  -- personal/summary/experience/education/skills/projects/awards/custom
  sort_order   INT DEFAULT 0,
  is_visible   BOOLEAN DEFAULT true,
  content      JSONB NOT NULL,        -- 各模块结构化数据
  ai_generated BOOLEAN DEFAULT false,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);
```

### 2.5 简历版本表 (resume_versions)

```sql
CREATE TABLE resume_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id    UUID REFERENCES resumes(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  snapshot     JSONB NOT NULL,         -- 完整简历数据快照
  change_note  VARCHAR(200),
  ai_model     VARCHAR(50),            -- 生成该版本使用的模型
  company_type VARCHAR(50),
  created_at   TIMESTAMP DEFAULT NOW()
);
```

### 2.6 模板表 (templates)

```sql
CREATE TABLE templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  category     VARCHAR(50) NOT NULL,   -- minimal/business/creative/technical/academic/international
  preview_url  TEXT,
  thumbnail_url TEXT,
  config       JSONB NOT NULL,         -- 渲染配置（颜色、字体、布局）
  layout_data  JSONB NOT NULL,         -- 布局结构定义
  industries   TEXT[] DEFAULT '{}',
  company_types TEXT[] DEFAULT '{}',
  experience_levels TEXT[] DEFAULT '{}',
  is_premium   BOOLEAN DEFAULT false,
  is_active    BOOLEAN DEFAULT true,
  download_count INT DEFAULT 0,
  like_count   INT DEFAULT 0,
  rating       DECIMAL(3,2) DEFAULT 0,
  created_at   TIMESTAMP DEFAULT NOW()
);
```

### 2.7 AI 调用记录表 (ai_usage_logs)

```sql
CREATE TABLE ai_usage_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  resume_id    UUID REFERENCES resumes(id),
  model_id     VARCHAR(50) NOT NULL,
  task_type    VARCHAR(50) NOT NULL,   -- generate/optimize/analyze
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  cost_usd     DECIMAL(10,6),
  status       VARCHAR(20),            -- success/failed
  duration_ms  INT,
  created_at   TIMESTAMP DEFAULT NOW()
);
```

### 2.8 导出记录表 (export_jobs)

```sql
CREATE TABLE export_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  resume_id    UUID REFERENCES resumes(id),
  format       VARCHAR(20) NOT NULL,   -- pdf/word/ppt/png/jpg/html
  status       VARCHAR(20) DEFAULT 'pending',  -- pending/processing/completed/failed
  file_url     TEXT,                   -- 导出文件 URL
  file_size    INT,
  expires_at   TIMESTAMP,             -- 文件过期时间
  created_at   TIMESTAMP DEFAULT NOW()
);
```

### 2.9 用户收藏表 (user_favorites)

```sql
CREATE TABLE user_favorites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  template_id  UUID REFERENCES templates(id) ON DELETE CASCADE,
  created_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, template_id)
);
```

### 2.10 支付订单表 (payment_orders)

```sql
CREATE TABLE payment_orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  plan         VARCHAR(20) NOT NULL,
  amount_cents INT NOT NULL,           -- 分为单位
  currency     VARCHAR(3) DEFAULT 'CNY',
  status       VARCHAR(20) DEFAULT 'pending',  -- pending/paid/failed/refunded
  provider     VARCHAR(20),            -- wechat_pay/alipay
  provider_order_id VARCHAR(100),
  paid_at      TIMESTAMP,
  created_at   TIMESTAMP DEFAULT NOW()
);
```

---

## 3. 索引设计

```sql
-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);

-- 简历表索引
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_status ON resumes(status);
CREATE INDEX idx_resumes_share_token ON resumes(share_token);

-- 简历内容索引
CREATE INDEX idx_resume_sections_resume_id ON resume_sections(resume_id);
CREATE INDEX idx_resume_sections_type ON resume_sections(section_type);

-- 版本索引
CREATE INDEX idx_resume_versions_resume_id ON resume_versions(resume_id);

-- AI 日志索引
CREATE INDEX idx_ai_usage_user_id ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_created ON ai_usage_logs(created_at);

-- 全文搜索（模板名称/描述）
CREATE INDEX idx_templates_fts ON templates USING gin(to_tsvector('chinese', name || ' ' || COALESCE(description, '')));
```

---

## 4. Redis 数据结构设计

```
# Session 存储
KEY: session:{userId}
TYPE: Hash
TTL: 7d
FIELDS: accessToken, refreshToken, planType, ...

# AI 生成任务状态
KEY: ai_task:{taskId}
TYPE: Hash
TTL: 24h
FIELDS: status, progress, result, error

# 简历生成流式推送
KEY: resume_stream:{resumeId}
TYPE: Pub/Sub Channel

# 用户 AI 配额（滑动窗口）
KEY: ai_quota:{userId}:{YYYY-MM}
TYPE: String (计数器)
TTL: 月末

# 模板列表缓存
KEY: templates:list:{category}
TYPE: String (JSON)
TTL: 1h

# 导出任务队列
KEY: export_queue
TYPE: BullMQ Queue
```

---

## 5. 文件存储设计（MinIO/COS）

```
Bucket 结构:
resumeai/
├── avatars/         # 用户头像
│   └── {userId}/avatar.jpg
├── uploads/         # 用户上传的原始文件
│   └── {userId}/{uuid}.{ext}
├── exports/         # 导出的简历文件
│   └── {userId}/{resumeId}/{uuid}.{pdf|docx|...}
├── templates/       # 模板预览图
│   └── {templateId}/preview.png
│   └── {templateId}/thumbnail.png
└── temp/            # 临时文件（24h 自动清理）
    └── {uuid}.{ext}
```

---

## 6. 数据备份策略

- PostgreSQL: 每日全量备份 + 实时 WAL 归档（PITR）
- Redis: RDB 快照（每小时）+ AOF 日志
- MinIO: 跨区域复制（生产环境）
- 备份保留: 30天全量 + 7天增量

---

## 7. 数据迁移规范

使用 Prisma Migrate（Node.js 服务）和 Alembic（Python 服务）管理数据库变更：

```bash
# Node.js 服务迁移
npx prisma migrate dev --name add_resume_share_token

# Python 服务迁移
alembic revision --autogenerate -m "add resume share token"
alembic upgrade head
```

---

*关联文档: [后端服务](../03-backend/BACKEND.md) | [安全合规](../09-security/SECURITY.md)*
