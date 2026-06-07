"""
ResumeAI Analytics Service — Database Layer
ClickHouse for production, MemoryDB for testing
"""

from __future__ import annotations

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from collections import defaultdict


# Category -> daily_stats metric mapping
_CATEGORY_METRICS = {
    'page_view': 'page_views',
    'ai_generation': 'ai_calls',
    'export': 'exports',
    'sign_up': 'signups',
    'payment': 'payments',
}


class AnalyticsDB:
    """Base analytics database interface"""

    async def init(self) -> None:
        pass

    async def close(self) -> None:
        pass

    async def track_event(self, record: dict) -> None:
        raise NotImplementedError

    async def batch_track(self, records: list) -> int:
        count = 0
        for r in records:
            await self.track_event(r)
            count += 1
        return count

    async def query_events(
        self, since: str, category: str = None, event: str = None
    ) -> list:
        raise NotImplementedError

    async def get_today_stats(self) -> dict:
        raise NotImplementedError

    async def get_hour_events(self, today: str, hour: int) -> list:
        raise NotImplementedError

    async def get_active_users_count(self, since: str) -> int:
        raise NotImplementedError

    async def get_total_events(self) -> int:
        raise NotImplementedError

    async def get_daily_trends(self, start: str, days: int) -> list:
        raise NotImplementedError

    def clear(self) -> None:
        pass


# ============================================================
#  MemoryDB — In-memory implementation (for testing)
# ============================================================

class MemoryDB(AnalyticsDB):
    """In-memory analytics backend — replicates original dict-based behavior"""

    def __init__(self):
        self.events: List[Dict] = []
        self.daily_stats: Dict[str, Dict[str, Any]] = {}
        self.model_usage: Dict[str, Dict] = defaultdict(
            lambda: {"calls": 0, "tokens": 0, "cost": 0.0}
        )

    async def init(self) -> None:
        pass

    async def track_event(self, record: dict) -> None:
        self.events.append(record)

        # Update daily stats
        today = datetime.utcnow().strftime("%Y-%m-%d")
        if today not in self.daily_stats:
            self.daily_stats[today] = {
                "page_views": 0, "ai_calls": 0, "exports": 0,
                "signups": 0, "payments": 0, "revenue": 0.0,
            }

        category = record.get("category", "")
        metric = _CATEGORY_METRICS.get(category)
        if metric:
            self.daily_stats[today][metric] += 1

        if category == "ai_generation":
            props = record.get("properties", {})
            model = props.get("model", "unknown")
            self.model_usage[model]["calls"] += 1
            self.model_usage[model]["tokens"] += props.get("tokens", 0)
            self.model_usage[model]["cost"] += props.get("cost", 0.0)

        if category == "payment":
            self.daily_stats[today]["revenue"] += record.get("properties", {}).get("amount", 0.0)

    async def batch_track(self, records: list) -> int:
        for r in records:
            await self.track_event(r)
        return len(records)

    async def query_events(
        self, since: str, category: str = None, event: str = None
    ) -> list:
        result = [e for e in self.events if e.get("timestamp", "") >= since]
        if category:
            result = [e for e in result if e.get("category") == category]
        if event:
            result = [e for e in result if e.get("event") == event]
        return result

    async def get_today_stats(self) -> dict:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        return dict(self.daily_stats.get(today, {
            "page_views": 0, "ai_calls": 0, "exports": 0,
            "signups": 0, "payments": 0, "revenue": 0.0,
        }))

    async def get_hour_events(self, today: str, hour: int) -> list:
        prefix = f"{today}T{hour:02d}"
        return [e for e in self.events if e.get("timestamp", "").startswith(prefix)]

    async def get_active_users_count(self, since: str) -> int:
        return len(set(
            e.get("session_id", "")
            for e in self.events
            if e.get("timestamp", "") > since
        ))

    async def get_total_events(self) -> int:
        return len(self.events)

    async def get_daily_trends(self, start: str, days: int) -> list:
        result = []
        base = datetime.strptime(start, "%Y-%m-%d")
        for i in range(days):
            date = (base + timedelta(days=i)).strftime("%Y-%m-%d")
            stats = dict(self.daily_stats.get(date, {
                "page_views": 0, "ai_calls": 0, "exports": 0,
                "signups": 0, "payments": 0, "revenue": 0.0,
            }))
            result.append({"date": date, **stats})
        return result

    def clear(self) -> None:
        self.events.clear()
        self.daily_stats.clear()
        self.model_usage.clear()


# ============================================================
#  ClickHouseDB — Production implementation
# ============================================================

class ClickHouseDB(AnalyticsDB):
    """ClickHouse analytics backend — column-oriented OLAP for event analytics"""

    def __init__(self):
        self._client = None
        self._database = os.getenv("CLICKHOUSE_DATABASE", "resumeai_analytics")

    async def init(self) -> None:
        import clickhouse_connect

        self._client = await clickhouse_connect.get_async_client(
            host=os.getenv("CLICKHOUSE_HOST", "clickhouse"),
            port=int(os.getenv("CLICKHOUSE_HTTP_PORT", "8123")),
            username=os.getenv("CLICKHOUSE_USER", "default"),
            password=os.getenv("CLICKHOUSE_PASSWORD", ""),
        )

        db = self._database
        # Create database
        await self._client.command(f"CREATE DATABASE IF NOT EXISTS {db}")

        # Analytics events table — partitioned by month, TTL 2 years
        await self._client.command(f"""
            CREATE TABLE IF NOT EXISTS {db}.analytics_events (
                id UUID DEFAULT generateUUIDv4(),
                user_id Nullable(String),
                session_id String,
                category LowCardinality(String),
                event LowCardinality(String),
                properties String DEFAULT '',
                timestamp DateTime DEFAULT now()
            ) ENGINE = MergeTree()
            PARTITION BY toYYYYMM(timestamp)
            ORDER BY (category, event, timestamp, session_id)
            TTL timestamp + INTERVAL 2 YEAR
        """)

        # Daily stats table — SummingMergeTree for auto-aggregation
        await self._client.command(f"""
            CREATE TABLE IF NOT EXISTS {db}.daily_stats (
                stat_date Date,
                category LowCardinality(String),
                metric String,
                value Int64,
                updated_at DateTime DEFAULT now()
            ) ENGINE = SummingMergeTree(updated_at)
            ORDER BY (stat_date, category, metric)
        """)

    async def close(self) -> None:
        if self._client:
            await self._client.close()

    async def track_event(self, record: dict) -> None:
        db = self._database
        ts = record.get("timestamp", datetime.utcnow().isoformat())
        if "T" in ts:
            ts = ts.replace("T", " ")[:19]

        # Insert event
        await self._client.insert(
            f"{db}.analytics_events",
            [{
                "id": record.get("id", str(uuid.uuid4())),
                "user_id": record.get("user_id"),
                "session_id": record["session_id"],
                "category": record["category"],
                "event": record["event"],
                "properties": json.dumps(record.get("properties", {}), ensure_ascii=False),
                "timestamp": ts,
            }],
            column_names=[
                "id", "user_id", "session_id", "category",
                "event", "properties", "timestamp",
            ],
        )

        # Update daily stats
        today = datetime.utcnow().strftime("%Y-%m-%d")
        category = record["category"]
        metric = _CATEGORY_METRICS.get(category)
        if metric:
            await self._client.insert(
                f"{db}.daily_stats",
                [{"stat_date": today, "category": category, "metric": metric, "value": 1}],
                column_names=["stat_date", "category", "metric", "value"],
            )

        # Revenue tracking (store in cents for precision)
        if category == "payment":
            amount = record.get("properties", {}).get("amount", 0)
            if amount:
                await self._client.insert(
                    f"{db}.daily_stats",
                    [{
                        "stat_date": today,
                        "category": "payment",
                        "metric": "revenue",
                        "value": int(amount * 100),
                    }],
                    column_names=["stat_date", "category", "metric", "value"],
                )

    async def query_events(
        self, since: str, category: str = None, event: str = None
    ) -> list:
        db = self._database
        since_fmt = since.replace("T", " ")[:19]
        conditions = [f"timestamp >= '{since_fmt}'"]
        if category:
            conditions.append(f"category = '{category}'")
        if event:
            conditions.append(f"event = '{event}'")
        where = " AND ".join(conditions)

        result = await self._client.query(
            f"SELECT id, user_id, session_id, category, event, properties, timestamp "
            f"FROM {db}.analytics_events WHERE {where}"
        )
        return [
            {
                "id": str(row[0]),
                "user_id": row[1],
                "session_id": row[2],
                "category": row[3],
                "event": row[4],
                "properties": json.loads(row[5]) if row[5] else {},
                "timestamp": str(row[6]).replace(" ", "T"),
            }
            for row in result.result_rows
        ]

    async def get_today_stats(self) -> dict:
        db = self._database
        today = datetime.utcnow().strftime("%Y-%m-%d")
        result = await self._client.query(
            f"SELECT metric, sum(value) FROM {db}.daily_stats "
            f"WHERE stat_date = '{today}' GROUP BY metric"
        )
        stats = {
            "page_views": 0, "ai_calls": 0, "exports": 0,
            "signups": 0, "payments": 0, "revenue": 0.0,
        }
        for row in result.result_rows:
            metric, value = row[0], row[1]
            if metric == "revenue":
                stats["revenue"] = value / 100.0
            else:
                stats[metric] = value
        return stats

    async def get_hour_events(self, today: str, hour: int) -> list:
        db = self._database
        since = f"{today} {hour:02d}:00:00"
        until = f"{today} {hour:02d}:59:59"
        result = await self._client.query(
            f"SELECT id, user_id, session_id, category, event, properties, timestamp "
            f"FROM {db}.analytics_events "
            f"WHERE timestamp >= '{since}' AND timestamp <= '{until}'"
        )
        return [
            {
                "id": str(row[0]), "user_id": row[1], "session_id": row[2],
                "category": row[3], "event": row[4],
                "properties": json.loads(row[5]) if row[5] else {},
                "timestamp": str(row[6]).replace(" ", "T"),
            }
            for row in result.result_rows
        ]

    async def get_active_users_count(self, since: str) -> int:
        db = self._database
        since_fmt = since.replace("T", " ")[:19]
        result = await self._client.query(
            f"SELECT count(DISTINCT session_id) FROM {db}.analytics_events "
            f"WHERE timestamp >= '{since_fmt}'"
        )
        return result.result_rows[0][0] if result.result_rows else 0

    async def get_total_events(self) -> int:
        db = self._database
        result = await self._client.query(
            f"SELECT count() FROM {db}.analytics_events"
        )
        return result.result_rows[0][0] if result.result_rows else 0

    async def get_daily_trends(self, start: str, days: int) -> list:
        db = self._database
        result = await self._client.query(
            f"SELECT stat_date, metric, sum(value) FROM {db}.daily_stats "
            f"WHERE stat_date >= '{start}' "
            f"GROUP BY stat_date, metric ORDER BY stat_date"
        )
        # Build date -> metric -> value mapping
        data: Dict[str, dict] = {}
        for row in result.result_rows:
            date_str, metric, value = str(row[0]), row[1], row[2]
            if date_str not in data:
                data[date_str] = {
                    "page_views": 0, "ai_calls": 0, "exports": 0,
                    "signups": 0, "payments": 0, "revenue": 0.0,
                }
            if metric == "revenue":
                data[date_str]["revenue"] = value / 100.0
            else:
                data[date_str][metric] = value

        result_list = []
        base = datetime.strptime(start, "%Y-%m-%d")
        for i in range(days):
            date = (base + timedelta(days=i)).strftime("%Y-%m-%d")
            defaults = {
                "page_views": 0, "ai_calls": 0, "exports": 0,
                "signups": 0, "payments": 0, "revenue": 0.0,
            }
            result_list.append({"date": date, **data.get(date, defaults)})
        return result_list

    async def clear(self) -> None:
        if self._client:
            db = self._database
            try:
                await self._client.command(f"TRUNCATE TABLE {db}.analytics_events")
                await self._client.command(f"TRUNCATE TABLE {db}.daily_stats")
            except Exception:
                pass


# ============================================================
#  Global DB instance management
# ============================================================

_db_instance: Optional[AnalyticsDB] = None


def get_db() -> AnalyticsDB:
    global _db_instance
    if _db_instance is None:
        if os.getenv("ANALYTICS_DB_BACKEND") == "clickhouse":
            _db_instance = ClickHouseDB()
        else:
            _db_instance = MemoryDB()
    return _db_instance


def set_db(db_instance: AnalyticsDB) -> None:
    global _db_instance
    _db_instance = db_instance


async def init_db() -> None:
    db = get_db()
    await db.init()


async def close_db() -> None:
    db = get_db()
    await db.close()
