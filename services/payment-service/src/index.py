"""
ResumeAI Payment Service — 支付订阅管理 v2.0
Stripe Checkout + Webhook 真实接入 · PostgreSQL 持久化 · 微信/支付宝 Mock 保留
"""

from __future__ import annotations

import json
import hashlib
import hmac
import uuid
import os
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any
from enum import Enum

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .db import get_db, init_db, close_db, MemoryPaymentDB, set_db


# ============================================================
#  Data Models
# ============================================================

class PlanTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class PaymentProvider(str, Enum):
    WECHAT = "wechat"
    ALIPAY = "alipay"
    APPLE = "apple"
    STRIPE = "stripe"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIALING = "trialing"

# Plan definitions
PLANS: Dict[str, Dict[str, Any]] = {
    "free": {
        "name": "免费版", "price": 0, "currency": "CNY",
        "ai_credits_monthly": 3, "exports_monthly": 5,
        "templates": 10, "features": ["基础AI生成", "5种模板", "PDF导出"],
        "max_resumes": 3,
    },
    "basic": {
        "name": "基础版", "price": 29, "currency": "CNY",
        "ai_credits_monthly": 30, "exports_monthly": 50,
        "templates": 50, "features": ["所有AI模型", "50种模板", "全格式导出", "版本管理"],
        "max_resumes": 20,
    },
    "pro": {
        "name": "专业版", "price": 79, "currency": "CNY",
        "ai_credits_monthly": 100, "exports_monthly": 999,
        "templates": 100, "features": ["全部基础版功能", "ATS优化", "公司定制", "优先客服"],
        "max_resumes": 999,
    },
    "enterprise": {
        "name": "企业版", "price": 0, "currency": "CNY",
        "ai_credits_monthly": 9999, "exports_monthly": 99999,
        "templates": 99999, "features": [
            "全部专业版功能", "团队协作", "API接入", "专属客户经理", "SLA保障"
        ],
        "max_resumes": 99999,
    },
}

# Stripe Price IDs (configured in Stripe Dashboard)
STRIPE_PRICE_IDS: Dict[str, str] = {
    "basic": os.getenv("STRIPE_BASIC_PRICE_ID", "price_basic_monthly"),
    "pro": os.getenv("STRIPE_PRO_PRICE_ID", "price_pro_monthly"),
    "enterprise": os.getenv("STRIPE_ENTERPRISE_PRICE_ID", "price_enterprise_monthly"),
}


class CreateSubscriptionReq(BaseModel):
    user_id: str
    plan: PlanTier
    provider: PaymentProvider
    payment_method_id: Optional[str] = None
    email: Optional[str] = None  # For Stripe Checkout

class CancelSubscriptionReq(BaseModel):
    reason: Optional[str] = None

class UpgradePlanReq(BaseModel):
    new_plan: PlanTier

class WebhookPayload(BaseModel):
    event: str
    provider: PaymentProvider
    payload: Dict[str, Any]
    timestamp: str
    signature: str

class UsageRecord(BaseModel):
    user_id: str
    category: str  # "ai_generation" | "export" | "template"
    amount: int = 1
    metadata: Dict[str, Any] = {}


# ============================================================
#  Stripe Client Wrapper
# ============================================================

def get_stripe_client():
    """Get Stripe API client (lazy init)"""
    api_key = os.getenv("STRIPE_SECRET_KEY")
    if not api_key:
        return None
    import stripe
    stripe.api_key = api_key
    return stripe


def create_stripe_checkout_session(
    user_id: str, plan: str, email: Optional[str] = None
) -> Optional[Dict]:
    """Create a Stripe Checkout Session for subscription"""
    stripe = get_stripe_client()
    if not stripe:
        return None

    price_id = STRIPE_PRICE_IDS.get(plan)
    if not price_id:
        return None

    success_url = os.getenv(
        "PAYMENT_SUCCESS_URL",
        "https://app.resumeai.com/payment/success?session_id={CHECKOUT_SESSION_ID}",
    )
    cancel_url = os.getenv(
        "PAYMENT_CANCEL_URL",
        "https://app.resumeai.com/payment/cancel",
    )

    session_params: Dict[str, Any] = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata": {"user_id": user_id, "plan": plan},
    }
    if email:
        session_params["customer_email"] = email

    session = stripe.checkout.Session.create(**session_params)
    return {
        "checkout_url": session.url,
        "session_id": session.id,
    }


def verify_stripe_webhook(payload: bytes, sig_header: str) -> Optional[Dict]:
    """Verify and decode a Stripe webhook event"""
    stripe = get_stripe_client()
    if not stripe:
        return None

    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    if not webhook_secret:
        return None

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        return event
    except stripe.error.SignatureVerificationError:
        return None
    except Exception:
        return None


def cancel_stripe_subscription(subscription_id: str) -> bool:
    """Cancel a Stripe subscription at period end"""
    stripe = get_stripe_client()
    if not stripe:
        return False

    try:
        stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True,
        )
        return True
    except Exception:
        return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期"""
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="ResumeAI Payment Service",
    version="2.0.0",
    description="支付订阅管理 v2 · Stripe真实接入 · PostgreSQL持久化 · 4档套餐",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------- Plans Query --------

@app.get("/api/plans")
async def list_plans():
    """获取所有套餐列表及功能对比"""
    return {"success": True, "data": PLANS}


@app.get("/api/plans/{tier}")
async def get_plan(tier: str):
    if tier not in PLANS:
        raise HTTPException(404, f"套餐 {tier} 不存在")
    return {"success": True, "data": PLANS[tier]}


# -------- Subscription Management --------

@app.get("/api/subscriptions/{user_id}")
async def get_subscription(user_id: str):
    db = get_db()
    sub = await db.get_or_create_subscription(user_id)
    plan_info = PLANS.get(sub.get("plan", "free"), PLANS["free"])
    return {"success": True, "data": {**sub, "plan_details": plan_info}}


@app.post("/api/subscriptions")
async def create_subscription(req: CreateSubscriptionReq):
    """创建订阅（Stripe Checkout / Mock 支付参数）"""
    db = get_db()

    # Check existing active/pending subscription
    existing = await db.get_subscription(req.user_id)
    if existing and existing.get("status") in ("active", "pending"):
        existing_plan = existing.get("plan", "free")
        if existing_plan == req.plan.value:
            raise HTTPException(400, "已订阅相同套餐")
        else:
            # Auto upgrade if new plan is higher tier
            tier_order = {"free": 0, "basic": 1, "pro": 2, "enterprise": 3}
            if tier_order.get(req.plan.value, 0) > tier_order.get(existing_plan, 0):
                return await _do_upgrade(req.user_id, existing_plan, req.plan.value)
            else:
                raise HTTPException(400, "新套餐等级必须高于当前套餐")

    plan = PLANS[req.plan.value]
    amount = plan["price"]

    # Create or update subscription (mark as pending until payment confirmed)
    await db.get_or_create_subscription(req.user_id)
    await db.update_subscription(
        req.user_id,
        plan=req.plan.value,
        status="pending",
    )

    # Create transaction record
    order_id = f"ORD_{uuid.uuid4().hex[:16].upper()}"

    if req.provider == PaymentProvider.STRIPE:
        # === Real Stripe Checkout ===
        checkout = create_stripe_checkout_session(
            req.user_id, req.plan.value, req.email
        )
        if checkout:
            # Record transaction with Stripe session reference
            tx = await db.create_transaction({
                "id": order_id,
                "user_id": req.user_id,
                "plan": req.plan.value,
                "amount": amount,
                "amount_cents": amount * 100,
                "currency": "CNY",
                "provider": "stripe",
                "provider_transaction_id": checkout["session_id"],
                "status": "pending",
                "description": f"ResumeAI {plan['name']} 订阅",
                "metadata": {
                    "checkout_session_id": checkout["session_id"],
                    "plan": req.plan.value,
                },
            })

            return {
                "success": True,
                "data": {
                    "order_id": order_id,
                    "amount": amount,
                    "currency": "CNY",
                    "provider": "stripe",
                    "checkout_url": checkout["checkout_url"],
                    "session_id": checkout["session_id"],
                },
            }

    # === Mock providers (wechat/alipay/apple) ===
    tx = await db.create_transaction({
        "id": order_id,
        "user_id": req.user_id,
        "plan": req.plan.value,
        "amount": amount,
        "amount_cents": amount * 100,
        "currency": "CNY",
        "provider": req.provider.value,
        "status": "pending",
        "description": f"ResumeAI {plan['name']} 订阅",
        "metadata": {"plan": req.plan.value},
    })

    payment_params = _generate_mock_payment_params(
        order_id, amount, req.provider, req.user_id
    )

    return {
        "success": True,
        "data": {
            "order_id": order_id,
            "amount": amount,
            "currency": "CNY",
            "provider": req.provider.value,
            "payment_params": payment_params,
            "payment_url": f"/api/payments/{order_id}/checkout",
        },
    }


async def _do_upgrade(user_id: str, from_plan: str, to_plan: str) -> dict:
    db = get_db()
    old_price = PLANS.get(from_plan, PLANS["free"])["price"]
    new_price = PLANS.get(to_plan, PLANS["free"])["price"]

    order_id = f"UPG_{uuid.uuid4().hex[:16].upper()}"
    await db.create_transaction({
        "id": order_id,
        "user_id": user_id,
        "plan": to_plan,
        "amount": new_price - old_price,
        "amount_cents": (new_price - old_price) * 100,
        "currency": "CNY",
        "provider": "internal",
        "status": "pending",
        "description": f"升级: {from_plan} -> {to_plan}",
        "metadata": {"from_plan": from_plan, "to_plan": to_plan, "type": "upgrade"},
    })

    return {
        "success": True,
        "data": {
            "order_id": order_id,
            "upgrade_amount": new_price - old_price,
            "from_plan": from_plan,
            "to_plan": to_plan,
        },
    }


@app.put("/api/subscriptions/{user_id}/cancel")
async def cancel_subscription(user_id: str, req: CancelSubscriptionReq = CancelSubscriptionReq()):
    db = get_db()
    sub = await db.get_or_create_subscription(user_id)
    if sub.get("status") != "active":
        raise HTTPException(400, "当前订阅状态不允许取消")

    # Cancel in Stripe if applicable
    stripe_sub_id = sub.get("stripe_subscription_id")
    if stripe_sub_id:
        cancel_stripe_subscription(stripe_sub_id)

    await db.update_subscription(
        user_id,
        status="cancelled",
        cancel_at_period_end=True,
        cancelled_at=datetime.utcnow().isoformat(),
        cancel_reason=req.reason,
    )

    updated = await db.get_subscription(user_id)
    return {"success": True, "data": updated}


@app.put("/api/subscriptions/{user_id}/upgrade")
async def upgrade_sub(user_id: str, req: UpgradePlanReq):
    db = get_db()
    sub = await db.get_or_create_subscription(user_id)
    old_plan = sub.get("plan", "free")
    new_plan = req.new_plan.value

    tier_order = {"free": 0, "basic": 1, "pro": 2, "enterprise": 3}
    if tier_order.get(new_plan, 0) <= tier_order.get(old_plan, 0):
        raise HTTPException(400, "新套餐等级必须高于当前套餐")

    return await _do_upgrade(user_id, old_plan, new_plan)


# -------- Usage Tracking --------

@app.post("/api/usage")
async def record_usage(record: UsageRecord):
    """记录使用量（AI生成/导出/模板）"""
    db = get_db()
    await db.record_usage(record.model_dump())

    # Check limits
    sub = await db.get_or_create_subscription(record.user_id)
    plan = PLANS.get(sub.get("plan", "free"), PLANS["free"])

    limits = {}
    if record.category == "ai_generation":
        used = await db.get_month_usage(record.user_id, "ai_generation")
        limits = {
            "limit": plan["ai_credits_monthly"],
            "used": used,
            "remaining": max(0, plan["ai_credits_monthly"] - used),
        }
    elif record.category == "export":
        used = await db.get_month_usage(record.user_id, "export")
        limits = {
            "limit": plan["exports_monthly"],
            "used": used,
            "remaining": max(0, plan["exports_monthly"] - used),
        }

    return {"success": True, "data": {"recorded": True, "limits": limits}}


@app.get("/api/usage/{user_id}")
async def get_usage(user_id: str):
    """获取用量统计"""
    db = get_db()
    sub = await db.get_or_create_subscription(user_id)
    plan = PLANS.get(sub.get("plan", "free"), PLANS["free"])

    ai_used = await db.get_month_usage(user_id, "ai_generation")
    export_used = await db.get_month_usage(user_id, "export")

    return {
        "success": True,
        "data": {
            "plan": sub.get("plan", "free"),
            "ai_credits": {
                "limit": plan["ai_credits_monthly"],
                "used": ai_used,
                "remaining": max(0, plan["ai_credits_monthly"] - ai_used),
            },
            "exports": {
                "limit": plan["exports_monthly"],
                "used": export_used,
                "remaining": max(0, plan["exports_monthly"] - export_used),
            },
        },
    }


# -------- Payment Webhook --------

@app.post("/api/webhooks/payment")
async def payment_webhook(payload: WebhookPayload):
    """处理支付回调（Stripe / Mock providers）"""
    db = get_db()

    if payload.provider == PaymentProvider.STRIPE:
        # Stripe webhooks use raw body + signature header
        # For internal webhook relay, verify HMAC
        pass

    # Verify HMAC signature for all providers
    if not _verify_webhook_signature(payload):
        raise HTTPException(401, "签名验证失败")

    if payload.event == "payment.success":
        order_id = payload.payload.get("order_id")
        tx = await db.get_transaction(order_id)
        if tx:
            await db.update_transaction(
                order_id,
                status="paid",
                paid_at=datetime.utcnow().isoformat(),
            )
            # Activate subscription
            sub = await db.get_or_create_subscription(tx["user_id"])
            plan = tx.get("plan", tx.get("metadata", {}).get("plan", "basic"))
            stripe_sub_id = payload.payload.get("stripe_subscription_id")
            await db.update_subscription(
                tx["user_id"],
                plan=plan,
                status="active",
                current_period_start=datetime.utcnow().isoformat(),
                current_period_end=(datetime.utcnow() + timedelta(days=30)).isoformat(),
                stripe_subscription_id=stripe_sub_id,
            )

    elif payload.event == "payment.failed":
        order_id = payload.payload.get("order_id")
        await db.update_transaction(order_id, status="failed")

    return {"success": True}


# Stripe native webhook endpoint (receives raw Stripe events)
@app.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request):
    """处理 Stripe 原生 Webhook（signature 验证 + 事件处理）"""
    db = get_db()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    event = verify_stripe_webhook(payload, sig_header)
    if not event:
        raise HTTPException(401, "Stripe webhook 签名验证失败")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        plan = session.get("metadata", {}).get("plan")
        stripe_sub_id = session.get("subscription")

        if user_id and plan:
            # Find pending transaction for this session
            # Activate subscription directly
            await db.update_subscription(
                user_id,
                plan=plan,
                status="active",
                payment_provider="stripe",
                stripe_subscription_id=stripe_sub_id,
                current_period_start=datetime.utcnow().isoformat(),
                current_period_end=(datetime.utcnow() + timedelta(days=30)).isoformat(),
            )

            # Update any pending transaction
            # (We look up by metadata since we stored session_id there)
            # For simplicity, just log the activation

    elif event["type"] == "invoice.payment_succeeded":
        # Subscription renewal successful
        invoice = event["data"]["object"]
        customer_id = invoice.get("customer")
        # Could look up user by Stripe customer ID

    elif event["type"] == "customer.subscription.deleted":
        # Subscription cancelled
        subscription = event["data"]["object"]
        user_id = subscription.get("metadata", {}).get("user_id")
        if user_id:
            await db.update_subscription(
                user_id,
                status="cancelled",
                cancel_at_period_end=True,
            )

    return {"success": True, "event": event["type"]}


# -------- Transaction History --------

@app.get("/api/transactions/{user_id}")
async def get_transactions(user_id: str):
    db = get_db()
    txs = await db.get_user_transactions(user_id)
    return {"success": True, "data": txs}


# -------- Invoices --------

@app.post("/api/invoices")
async def create_invoice(user_id: str, transaction_id: str):
    db = get_db()
    tx = await db.get_transaction(transaction_id)
    if not tx:
        raise HTTPException(404, "交易记录不存在")

    invoice_id = f"INV_{uuid.uuid4().hex[:12].upper()}"
    invoice_number = f"RMAI-{datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

    sub = await db.get_subscription(user_id)
    invoice = await db.create_invoice({
        "id": invoice_id,
        "user_id": user_id,
        "transaction_id": transaction_id,
        "subscription_id": sub.get("id") if sub else None,
        "invoice_number": invoice_number,
        "amount_cents": tx.get("amount_cents", tx.get("amount", 0) * 100),
        "currency": "CNY",
        "status": "pending",
        "billing_info": "",
    })
    return {"success": True, "data": invoice}


@app.get("/api/invoices/{user_id}")
async def get_invoices(user_id: str):
    db = get_db()
    invoices = await db.get_user_invoices(user_id)
    return {"success": True, "data": invoices}


# -------- Utility Functions --------

def _generate_mock_payment_params(
    order_id: str, amount: float, provider: PaymentProvider, user_id: str
) -> Dict:
    """Generate mock payment params for wechat/alipay/apple"""
    app_id = os.getenv("PAYMENT_APP_ID", "resumeai_demo")
    notify_url = os.getenv("PAYMENT_NOTIFY_URL", "https://api.resumeai.com/webhooks/payment")

    if provider == PaymentProvider.WECHAT:
        return {
            "appid": app_id,
            "mch_id": os.getenv("WECHAT_MCH_ID", "demo_mch"),
            "out_trade_no": order_id,
            "total_fee": int(amount * 100),
            "notify_url": notify_url,
            "trade_type": "APP",
        }
    elif provider == PaymentProvider.ALIPAY:
        return {
            "app_id": app_id,
            "out_trade_no": order_id,
            "total_amount": f"{amount:.2f}",
            "notify_url": notify_url,
            "product_name": "ResumeAI 套餐订阅",
        }
    elif provider == PaymentProvider.APPLE:
        return {"product_id": f"resumeai_{order_id}", "quantity": 1}
    return {}


def _verify_webhook_signature(payload: WebhookPayload) -> bool:
    """Verify payment webhook HMAC signature"""
    secret = os.getenv("PAYMENT_WEBHOOK_SECRET", "demo_secret_key")
    message = f"{payload.event}:{payload.timestamp}"
    expected = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, payload.signature)


# Expose for testing
def generate_payment_params(order_id: str, amount: float, provider: PaymentProvider, user_id: str) -> Dict:
    """Public wrapper for generating payment params (used in tests)"""
    if provider == PaymentProvider.STRIPE:
        return {
            "payment_method_types": ["card"],
            "amount": int(amount * 100),
            "currency": "cny",
            "metadata": {"order_id": order_id, "user_id": user_id},
        }
    return _generate_mock_payment_params(order_id, amount, provider, user_id)


# -------- Health Check --------

@app.get("/health")
async def health():
    db = get_db()
    return {
        "status": "ok",
        "service": "payment",
        "version": "2.0.0",
        "backend": type(db).__name__,
        "stripe_configured": bool(os.getenv("STRIPE_SECRET_KEY")),
    }
