-- ResumeAI 数据库初始化脚本
-- PostgreSQL 16
-- 覆盖: 用户 / 简历 / 模板 / 导出 / AI日志 / 支付 / 数据分析

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 模糊搜索

-- ═══════════════════════════════════════════════════════════
-- 用户系统
-- ═══════════════════════════════════════════════════════════

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar TEXT,
    oauth_provider VARCHAR(20),              -- wechat/apple/google/github
    oauth_provider_id VARCHAR(255),
    subscription VARCHAR(20) DEFAULT 'free' CHECK (subscription IN ('free', 'basic', 'pro', 'enterprise')),
    stripe_customer_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- 简历系统
-- ═══════════════════════════════════════════════════════════

-- 简历主表
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    company_type VARCHAR(20) NOT NULL CHECK (company_type IN ('internet_giant', 'foreign_company', 'state_owned', 'startup', 'consulting')),
    style VARCHAR(20) DEFAULT 'modern',
    data JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    ats_score INTEGER CHECK (ats_score >= 0 AND ats_score <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 简历版本表
CREATE TABLE IF NOT EXISTS resume_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    company_type VARCHAR(20) NOT NULL,
    style VARCHAR(20) DEFAULT 'modern',
    data JSONB,
    ats_score INTEGER CHECK (ats_score >= 0 AND ats_score <= 100),
    keywords TEXT[],
    model_used VARCHAR(50),
    tokens_used INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 模板表
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,             -- 行业分类
    style VARCHAR(20) NOT NULL,                -- 风格
    thumbnail TEXT NOT NULL,
    description TEXT,
    css TEXT NOT NULL DEFAULT '',
    html_template TEXT DEFAULT '',              -- 完整 HTML 模板
    is_premium BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    rating DECIMAL(2, 1) DEFAULT 0.0,         -- 平均评分 (0-5)
    rating_count INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 导出记录表
CREATE TABLE IF NOT EXISTS export_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    version_id UUID REFERENCES resume_versions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    format VARCHAR(10) NOT NULL CHECK (format IN ('pdf', 'docx', 'pptx', 'png', 'jpg', 'html', 'markdown')),
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI 使用日志表
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL,
    model VARCHAR(50) NOT NULL,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost DECIMAL(8, 6) DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- 支付系统
-- ═══════════════════════════════════════════════════════════

-- 订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
    payment_provider VARCHAR(20),              -- wechat/alipay/apple/stripe
    payment_provider_subscription_id VARCHAR(255),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    price_cents INTEGER NOT NULL DEFAULT 0,     -- 价格（分）
    currency VARCHAR(3) DEFAULT 'CNY',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, status)                     -- 每用户只能有一个活跃订阅
);

-- 交易记录表
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    payment_provider VARCHAR(20) NOT NULL,
    provider_transaction_id VARCHAR(255),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    description VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 发票表
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount_cents INTEGER NOT NULL,
    tax_cents INTEGER DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'CNY',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'void')),
    billing_info JSONB DEFAULT '{}',            -- {name, email, phone, address}
    pdf_url TEXT,
    issued_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用量追踪表
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,                  -- 计费周期开始日
    period_end DATE NOT NULL,                    -- 计费周期结束日
    ai_generations INTEGER DEFAULT 0,
    ai_generations_limit INTEGER DEFAULT 5,
    exports INTEGER DEFAULT 0,
    exports_limit INTEGER DEFAULT 10,
    premium_templates_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, period_start)
);

-- ═══════════════════════════════════════════════════════════
-- 数据分析系统
-- ═══════════════════════════════════════════════════════════

-- 事件追踪表
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(64),
    event_category VARCHAR(30) NOT NULL,        -- page_view / signup / login / ai_generate / export / payment
    event_type VARCHAR(50) NOT NULL,            -- 具体事件类型
    properties JSONB DEFAULT '{}',               -- 事件属性
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 每日统计汇总表
CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stat_date DATE NOT NULL,
    stat_type VARCHAR(30) NOT NULL,              -- signups / logins / ai_generations / exports / revenue / dau / template_views
    metric_key VARCHAR(50) NOT NULL,             -- 细分维度 (如 model_name, company_type)
    value BIGINT NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stat_date, stat_type, metric_key)
);

-- ═══════════════════════════════════════════════════════════
-- 索引
-- ═══════════════════════════════════════════════════════════

-- 用户
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_provider_id) WHERE oauth_provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription);

-- 简历
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_company_type ON resumes(company_type);
CREATE INDEX IF NOT EXISTS idx_resumes_data_gin ON resumes USING gin(data jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes(created_at DESC);

-- 简历版本
CREATE INDEX IF NOT EXISTS idx_resume_versions_resume_id ON resume_versions(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_is_active ON resume_versions(is_active);

-- 模板
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_style ON templates(style);
CREATE INDEX IF NOT EXISTS idx_templates_premium ON templates(is_premium);
CREATE INDEX IF NOT EXISTS idx_templates_rating ON templates(rating DESC);

-- 导出
CREATE INDEX IF NOT EXISTS idx_export_records_user_id ON export_records(user_id);
CREATE INDEX IF NOT EXISTS idx_export_records_created_at ON export_records(created_at DESC);

-- AI日志
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model ON ai_usage_logs(model, created_at DESC);

-- 支付
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON usage_tracking(user_id, period_start);

-- 分析
CREATE INDEX IF NOT EXISTS idx_events_user_created ON analytics_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_category ON analytics_events(event_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_type ON daily_stats(stat_type, stat_date DESC);

-- 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_templates_name_trgm ON templates USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_templates_desc_trgm ON templates USING gin (description gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════
-- 自动更新 updated_at 触发器
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════
-- 种子数据 — 模板
-- ═══════════════════════════════════════════════════════════

INSERT INTO templates (name, category, style, thumbnail, description, tags) VALUES
('现代简约 - 蓝色', '互联网', 'modern', '/templates/modern-blue.png', '适合互联网公司，清新大方', ARRAY['互联网', '前端', '后端']),
('经典商务 - 黑白', '外企', 'classic', '/templates/classic-bw.png', '传统正式风格，适合国企外企', ARRAY['国企', '外企', '金融']),
('极简清新', '创业', 'minimal', '/templates/minimal.png', '少即是多，突出核心信息', ARRAY['设计', '产品', '创业']),
('创意设计', '设计', 'creative', '/templates/creative.png', '独特设计感，适合创意行业', ARRAY['设计', 'UI', '广告']),
('学术严谨', '学术', 'academic', '/templates/academic.png', '适合学术科研岗位', ARRAY['学术', '科研', '博士']),
('高管精英', '管理', 'executive', '/templates/executive.png', '高管级别，大气沉稳', ARRAY['管理', '总监', 'VP']),
('互联网技术岗', '互联网', 'modern', '/templates/tech-internet.png', '面向互联网大厂技术岗位，突出项目成果', ARRAY['后端', '前端', '全栈', '架构']),
('外企商务岗', '外企', 'international', '/templates/foreign-biz.png', '国际化风格，适合跨国企业商务岗位', ARRAY['商务', 'BD', '销售']),
('国企公务员', '国企', 'classic', '/templates/state-owned.png', '规范正式，突出稳定性和专业资质', ARRAY['公务员', '国企', '央企']),
('金融分析', '金融', 'business', '/templates/finance.png', '数据驱动，适合金融和咨询行业', ARRAY['金融', '分析', '投行', '咨询']);

-- ═══════════════════════════════════════════════════════════
-- 种子数据 — 套餐定价
-- ═══════════════════════════════════════════════════════════

-- 通过 daily_stats 表记录初始套餐配置（供 payment-service 查询）
INSERT INTO daily_stats (stat_date, stat_type, metric_key, value, metadata) VALUES
('2000-01-01', 'pricing', 'free', 0, '{"name":"Free","ai_generations":3,"exports":5,"premium_templates":false}'),
('2000-01-01', 'pricing', 'basic', 2900, '{"name":"Basic","ai_generations":30,"exports":30,"premium_templates":true}'),
('2000-01-01', 'pricing', 'pro', 7900, '{"name":"Pro","ai_generations":999,"exports":999,"premium_templates":true,"ats_optimization":true}'),
('2000-01-01', 'pricing', 'enterprise', 0, '{"name":"Enterprise","ai_generations":-1,"exports":-1,"premium_templates":true,"ats_optimization":true,"custom_branding":true}');
