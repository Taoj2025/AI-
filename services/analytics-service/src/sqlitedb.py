"""
SqliteAnalyticsDB — 无需 Docker 的 SQLite 开发数据库
"""
from __future__ import annotations

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from collections import defaultdict

from .db import AnalyticsDB


class SqliteAnalyticsDB(AnalyticsDB):
    """SQLite analytics backend — 开发环境零依赖"""

    def __init__(self):
        self._conn = None

    async def init(self) -> None:
        import aiosqlite
        db_path = os.getenv("ANALYTICS_DB_PATH", os.path.join(os.path.dirname(__file__), "..", "data", "analytics.db"))
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._conn = await aiosqlite.connect(db_path)
        self._conn.row_factory = aiosqlite.Row
        await self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'general',
                metadata TEXT DEFAULT '{}',
                session_id TEXT,
                ip_address TEXT,
                user_agent TEXT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS daily_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                page_views INTEGER DEFAULT 0,
                ai_calls INTEGER DEFAULT 0,
                exports INTEGER DEFAULT 0,
                signups INTEGER DEFAULT 0,
                payments INTEGER DEFAULT 0,
                active_users INTEGER DEFAULT 0,
                UNIQUE(date)
            );
            CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
            CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
            CREATE INDEX IF NOT EXISTS idx_events_ts ON events(timestamp);
        """)
        await self._conn.commit()

    async def close(self) -> None:
        if self._conn:
            await self._conn.close()
            self._conn = None

    async def track_event(self, record: dict) -> None:
        event_id = str(uuid.uuid4())
        today = datetime.utcnow().strftime("%Y-%m-%d")
        await self._conn.execute(
            """INSERT INTO events
               (id, user_id, event_type, category, metadata, session_id, ip_address, user_agent)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (event_id, record["user_id"], record.get("event_type", ""),
             record.get("category", "general"),
             json.dumps(record.get("metadata", {})),
             record.get("session_id"), record.get("ip_address"), record.get("user_agent")),
        )
        # Update daily stats
        await self._conn.execute(
            """INSERT INTO daily_stats (date, active_users)
               VALUES (?, 1)
               ON CONFLICT(date) DO UPDATE SET
                   active_users = active_users + 1,
                   page_views = page_views + CASE WHEN ? = 'page_view' OR ? = '' THEN 1 ELSE 0 END,
                   ai_calls = ai_calls + CASE WHEN ? = 'ai_generation' THEN 1 ELSE 0 END,
                   exports = exports + CASE WHEN ? = 'export' THEN 1 ELSE 0 END,
                   signups = signups + CASE WHEN ? = 'sign_up' THEN 1 ELSE 0 END,
                   payments = payments + CASE WHEN ? = 'payment' THEN 1 ELSE 0 END""",
            (today, record.get("category", ""), record.get("category", ""),
             record.get("category", ""), record.get("category", ""),
             record.get("category", ""), record.get("category", "")),
        )
        await self._conn.commit()

    async def batch_track(self, records: list) -> int:
        count = 0
        for r in records:
            await self.track_event(r)
            count += 1
        return count

    async def query_events(
        self, event_type: str = None, user_id: str = None,
        start: str = None, end: str = None, limit: int = 100,
    ) -> list:
        conditions, params = [], []
        if event_type:
            conditions.append("event_type = ?"); params.append(event_type)
        if user_id:
            conditions.append("user_id = ?"); params.append(user_id)
        if start:
            conditions.append("timestamp >= ?"); params.append(start)
        if end:
            conditions.append("timestamp <= ?"); params.append(end)
        where = " AND ".join(conditions) if conditions else "1=1"
        cursor = await self._conn.execute(
            f"SELECT * FROM events WHERE {where} ORDER BY timestamp DESC LIMIT ?",
            params + [limit],
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

    async def get_today_stats(self) -> dict:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        cursor = await self._conn.execute(
            "SELECT * FROM daily_stats WHERE date = ?", (today,)
        )
        row = await cursor.fetchone()
        if row is None:
            return {
                "date": today, "page_views": 0, "ai_calls": 0, "exports": 0,
                "signups": 0, "payments": 0, "active_users": 0,
            }
        return dict(row)

    async def get_total_events(self) -> int:
        cursor = await self._conn.execute("SELECT COUNT(*) as cnt FROM events")
        row = await cursor.fetchone()
        return row["cnt"] if row else 0

    async def get_active_users_count(self, since: str) -> int:
        cursor = await self._conn.execute(
            "SELECT COUNT(DISTINCT user_id) as cnt FROM events WHERE timestamp >= ?", (since,)
        )
        row = await cursor.fetchone()
        return row["cnt"] if row else 0

    async def get_daily_trends(self, start: str, days: int) -> list:
        cursor = await self._conn.execute(
            """SELECT * FROM daily_stats
               WHERE date >= ? ORDER BY date ASC LIMIT ?""",
            (start, days),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

    async def clear(self) -> None:
        if self._conn:
            await self._conn.execute("DELETE FROM events")
            await self._conn.execute("DELETE FROM daily_stats")
            await self._conn.commit()
