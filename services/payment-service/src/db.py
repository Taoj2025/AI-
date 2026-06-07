"""
ResumeAI Payment Service — Database Layer
PostgreSQL for production (asyncpg), MemoryDB for testing, Stripe API integration
"""

from __future__ import annotations

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any


# ============================================================
#  MemoryDB — In-memory implementation (for testing)
# ============================================================

class PaymentDB:
    """Base payment database interface"""

    async def init(self) -> None:
        pass

    async def close(self) -> None:
        pass

    # -- Subscription --
    async def get_or_create_subscription(self, user_id: str) -> dict:
        raise NotImplementedError

    async def get_subscription(self, user_id: str) -> Optional[dict]:
        raise NotImplementedError

    async def update_subscription(self, user_id: str, **fields) -> None:
        raise NotImplementedError

    # -- Transaction --
    async def create_transaction(self, tx: dict) -> dict:
        raise NotImplementedError

    async def get_transaction(self, tx_id: str) -> Optional[dict]:
        raise NotImplementedError

    async def get_user_transactions(self, user_id: str) -> list:
        raise NotImplementedError

    async def update_transaction(self, tx_id: str, **fields) -> None:
        raise NotImplementedError

    # -- Invoice --
    async def create_invoice(self, invoice: dict) -> dict:
        raise NotImplementedError

    async def get_user_invoices(self, user_id: str) -> list:
        raise NotImplementedError

    # -- Usage --
    async def record_usage(self, record: dict) -> dict:
        raise NotImplementedError

    async def get_user_usage(self, user_id: str) -> list:
        raise NotImplementedError

    async def get_month_usage(self, user_id: str, category: str) -> int:
        raise NotImplementedError

    def clear(self) -> None:
        pass


class MemoryPaymentDB(PaymentDB):
    """In-memory payment backend — replicates original dict-based behavior"""

    def __init__(self):
        self.subscriptions: Dict[str, Dict] = {}
        self.transactions: Dict[str, Dict] = {}
        self.invoices: Dict[str, Dict] = {}
        self.usage_records: Dict[str, List[Dict]] = {}

    async def get_or_create_subscription(self, user_id: str) -> dict:
        if user_id not in self.subscriptions:
            self.subscriptions[user_id] = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "plan": "free",
                "status": "active",
                "current_period_start": datetime.utcnow().isoformat(),
                "current_period_end": (datetime.utcnow() + timedelta(days=365)).isoformat(),
                "cancel_at_period_end": False,
                "stripe_subscription_id": None,
                "trial_end": None,
                "created_at": datetime.utcnow().isoformat(),
            }
        return self.subscriptions[user_id]

    async def get_subscription(self, user_id: str) -> Optional[dict]:
        return self.subscriptions.get(user_id)

    async def update_subscription(self, user_id: str, **fields) -> None:
        if user_id in self.subscriptions:
            self.subscriptions[user_id].update(fields)

    async def create_transaction(self, tx: dict) -> dict:
        if "created_at" not in tx:
            tx["created_at"] = datetime.utcnow().isoformat()
        self.transactions[tx["id"]] = tx
        return tx

    async def get_transaction(self, tx_id: str) -> Optional[dict]:
        return self.transactions.get(tx_id)

    async def get_user_transactions(self, user_id: str) -> list:
        return sorted(
            [tx for tx in self.transactions.values() if tx["user_id"] == user_id],
            key=lambda x: x["created_at"],
            reverse=True,
        )

    async def update_transaction(self, tx_id: str, **fields) -> None:
        if tx_id in self.transactions:
            self.transactions[tx_id].update(fields)

    async def create_invoice(self, invoice: dict) -> dict:
        self.invoices[invoice["id"]] = invoice
        return invoice

    async def get_user_invoices(self, user_id: str) -> list:
        return sorted(
            [inv for inv in self.invoices.values() if inv["user_id"] == user_id],
            key=lambda x: x["created_at"],
            reverse=True,
        )

    async def record_usage(self, record: dict) -> dict:
        user_id = record["user_id"]
        if user_id not in self.usage_records:
            self.usage_records[user_id] = []
        entry = {**record, "id": str(uuid.uuid4()), "created_at": datetime.utcnow().isoformat()}
        self.usage_records[user_id].append(entry)
        return entry

    async def get_user_usage(self, user_id: str) -> list:
        return self.usage_records.get(user_id, [])

    async def get_month_usage(self, user_id: str, category: str) -> int:
        month_start = datetime.utcnow().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        ).isoformat()
        records = self.usage_records.get(user_id, [])
        month_records = [r for r in records if r["created_at"] >= month_start]
        return sum(r["amount"] for r in month_records if r["category"] == category)

    def clear(self) -> None:
        self.subscriptions.clear()
        self.transactions.clear()
        self.invoices.clear()
        self.usage_records.clear()


# ============================================================
#  PostgresPaymentDB — Production PostgreSQL implementation
# ============================================================

class PostgresPaymentDB(PaymentDB):
    """PostgreSQL payment backend — asyncpg connection pool"""

    def __init__(self):
        self._pool = None

    async def init(self) -> None:
        import asyncpg

        self._pool = await asyncpg.create_pool(
            host=os.getenv("POSTGRES_HOST", "postgres"),
            port=int(os.getenv("POSTGRES_PORT", "5432")),
            user=os.getenv("POSTGRES_USER", "resumeai"),
            password=os.getenv("POSTGRES_PASSWORD", "password"),
            database=os.getenv("POSTGRES_DB", "resumeai_db"),
            min_size=2,
            max_size=10,
        )

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()

    def _conn(self):
        return self._pool.acquire()

    async def get_or_create_subscription(self, user_id: str) -> dict:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active'",
                user_id,
            )
            if row:
                return dict(row)

            # Auto-create free subscription
            now = datetime.utcnow()
            period_end = now + timedelta(days=365)
            row = await conn.fetchrow(
                """INSERT INTO subscriptions
                   (user_id, tier, status, payment_provider, current_period_start,
                    current_period_end, cancel_at_period_end, price_cents, currency)
                   VALUES ($1, 'free', 'active', NULL, $2, $3, false, 0, 'CNY')
                   RETURNING *""",
                user_id, now.isoformat(), period_end.isoformat(),
            )
            return dict(row)

    async def get_subscription(self, user_id: str) -> Optional[dict]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
                user_id,
            )
            return dict(row) if row else None

    # 允许更新的字段白名单
    _ALLOWED_SUBSCRIPTION_FIELDS = frozenset({
        "tier", "status", "payment_provider", "stripe_subscription_id",
        "current_period_start", "current_period_end",
        "cancel_at_period_end", "price_cents", "currency",
    })

    _ALLOWED_TRANSACTION_FIELDS = frozenset({
        "status", "paid_at", "provider_transaction_id", "metadata",
    })

    async def update_subscription(self, user_id: str, **fields) -> None:
        if not fields:
            return
        # 白名单校验，防止 SQL 注入
        safe_fields = {k: v for k, v in fields.items() if k in self._ALLOWED_SUBSCRIPTION_FIELDS}
        if not safe_fields:
            return
        set_clauses = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(safe_fields.keys()))
        values = list(safe_fields.values()) + [user_id]
        async with self._pool.acquire() as conn:
            await conn.execute(
                f"UPDATE subscriptions SET {set_clauses} WHERE user_id = $1",
                user_id, *values,
            )

    async def create_transaction(self, tx: dict) -> dict:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """INSERT INTO transactions
                   (user_id, payment_provider, provider_transaction_id,
                    amount_cents, currency, status, description, metadata)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                   RETURNING *""",
                tx["user_id"], tx.get("provider"), tx.get("provider_transaction_id"),
                tx.get("amount_cents", 0), tx.get("currency", "CNY"),
                tx.get("status", "pending"), tx.get("description", ""),
                json.dumps(tx.get("metadata", {})),
            )
            return dict(row)

    async def get_transaction(self, tx_id: str) -> Optional[dict]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM transactions WHERE id = $1", tx_id)
            return dict(row) if row else None

    async def get_user_transactions(self, user_id: str) -> list:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC",
                user_id,
            )
            return [dict(r) for r in rows]

    async def update_transaction(self, tx_id: str, **fields) -> None:
        if not fields:
            return
        # 白名单校验，防止 SQL 注入
        safe_fields = {k: v for k, v in fields.items() if k in self._ALLOWED_TRANSACTION_FIELDS}
        if not safe_fields:
            return
        set_clauses = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(safe_fields.keys()))
        values = list(safe_fields.values()) + [tx_id]
        async with self._pool.acquire() as conn:
            await conn.execute(
                f"UPDATE transactions SET {set_clauses} WHERE id = $1",
                tx_id, *values,
            )

    async def create_invoice(self, invoice: dict) -> dict:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """INSERT INTO invoices
                   (user_id, transaction_id, subscription_id, invoice_number,
                    amount_cents, currency, status, billing_info)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                   RETURNING *""",
                invoice["user_id"], invoice.get("transaction_id"),
                invoice.get("subscription_id"), invoice.get("invoice_number"),
                invoice.get("amount_cents", 0), invoice.get("currency", "CNY"),
                invoice.get("status", "pending"), invoice.get("billing_info", ""),
            )
            return dict(row)

    async def get_user_invoices(self, user_id: str) -> list:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC",
                user_id,
            )
            return [dict(r) for r in rows]

    async def record_usage(self, record: dict) -> dict:
        user_id = record["user_id"]
        month_start = datetime.utcnow().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        ).strftime("%Y-%m-%d")
        month_end = (datetime.utcnow().replace(day=28) + timedelta(days=4)).replace(day=1).strftime("%Y-%m-%d")

        async with self._pool.acquire() as conn:
            # Upsert usage tracking
            await conn.execute(
                """INSERT INTO usage_tracking
                   (user_id, period_start, period_end, ai_generations, ai_generations_limit,
                    exports, exports_limit, premium_templates_used)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                   ON CONFLICT (user_id, period_start) DO UPDATE SET
                       ai_generations = usage_tracking.ai_generations + $4,
                       exports = usage_tracking.exports + $6""",
                user_id, month_start, month_end,
                1 if record["category"] == "ai_generation" else 0,
                0,
                1 if record["category"] == "export" else 0,
                0,
                1 if record["category"] == "template" else 0,
            )

            return {
                **record,
                "id": str(uuid.uuid4()),
                "created_at": datetime.utcnow().isoformat(),
            }

    async def get_month_usage(self, user_id: str, category: str) -> int:
        month_start = datetime.utcnow().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        ).strftime("%Y-%m-%d")
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM usage_tracking WHERE user_id = $1 AND period_start = $2",
                user_id, month_start,
            )
            if not row:
                return 0
            row_dict = dict(row)
            if category == "ai_generation":
                return row_dict.get("ai_generations", 0)
            elif category == "export":
                return row_dict.get("exports", 0)
            return 0

    async def get_user_usage(self, user_id: str) -> list:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM usage_tracking WHERE user_id = $1 ORDER BY period_start DESC",
                user_id,
            )
            return [dict(r) for r in rows]

    async def clear(self) -> None:
        pass


# ============================================================
#  Global DB instance management
# ============================================================

_db_instance: Optional[PaymentDB] = None


def get_db() -> PaymentDB:
    global _db_instance
    if _db_instance is None:
        if os.getenv("PAYMENT_DB_BACKEND") == "postgres":
            _db_instance = PostgresPaymentDB()
        else:
            _db_instance = MemoryPaymentDB()
    return _db_instance


def set_db(db_instance: PaymentDB) -> None:
    global _db_instance
    _db_instance = db_instance


async def init_db() -> None:
    db = get_db()
    await db.init()


async def close_db() -> None:
    db = get_db()
    await db.close()
