-- ResumeAI ClickHouse 初始化脚本
-- 在 ClickHouse 容器启动时自动执行

-- 创建 analytics 数据库
CREATE DATABASE IF NOT EXISTS resumeai_analytics;

-- 使用目标数据库
USE resumeai_analytics;

-- 
-- analytics_events：用户行为事件表
-- MergeTree 引擎，按月分区，TTL 2年
--
CREATE TABLE IF NOT EXISTS analytics_events (
    id          UUID DEFAULT generateUUIDv4(),
    user_id     Nullable(String),
    session_id  String,
    category    LowCardinality(String),
    event       LowCardinality(String),
    properties  String   DEFAULT '',
    timestamp    DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (category, event, timestamp, session_id)
TTL timestamp + INTERVAL 2 YEAR;

--
-- daily_stats：每日聚合指标表
-- SummingMergeTree 自动合并相同 key 的数值
--
CREATE TABLE IF NOT EXISTS daily_stats (
    stat_date   Date,
    category    LowCardinality(String),
    metric      String,
    value       Int64,
    updated_at  DateTime DEFAULT now()
) ENGINE = SummingMergeTree(updated_at)
ORDER BY (stat_date, category, metric);

-- 可选：创建分布式表（多分片时）
-- CREATE TABLE IF NOT EXISTS analytics_events_distributed
-- ENGINE = Distributed('cluster_name', 'resumeai_analytics', 'analytics_events', rand());
