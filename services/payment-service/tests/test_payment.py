"""Payment Service 完整测试套件 v2.0
使用 MemoryPaymentDB 替代 PostgreSQL + Stripe Mock
API 行为与原版完全兼容
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import hashlib, hmac
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from src.db import MemoryPaymentDB, set_db, get_db
from src.index import app, PLANS

client = TestClient(app)

# Stripe webhook 签名测试用密钥
PAYMENT_WEBHOOK_SECRET = "demo_secret_key"


def _clear_data():
    """重置内存数据库"""
    db = get_db()
    if isinstance(db, MemoryPaymentDB):
        db.clear()
    else:
        db.clear()


def _sign_webhook(event: str, timestamp: str):
    """生成 HMAC 签名"""
    message = f"{event}:{timestamp}"
    return hmac.new(
        PAYMENT_WEBHOOK_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()


# ========== Fixtures ==========

@pytest.fixture(autouse=True)
def setup_db():
    """每个测试前自动使用 MemoryPaymentDB"""
    mem_db = MemoryPaymentDB()
    set_db(mem_db)
    yield
    pass


# ========== 套餐查询 ==========

class TestPlans:
    def test_list_all_plans(self):
        r = client.get("/api/plans")
        assert r.status_code == 200
        data = r.json()["data"]
        assert "free" in data
        assert "basic" in data
        assert "pro" in data
        assert "enterprise" in data
        assert len(data) == 4

    def test_plan_fields(self):
        r = client.get("/api/plans")
        data = r.json()["data"]
        basic = data["basic"]
        assert basic["price"] == 29
        assert basic["currency"] == "CNY"
        assert "ai_credits_monthly" in basic
        assert "features" in basic

    def test_get_single_plan(self):
        r = client.get("/api/plans/pro")
        assert r.status_code == 200
        assert r.json()["data"]["price"] == 79

    def test_plan_not_found(self):
        r = client.get("/api/plans/nonexistent")
        assert r.status_code == 404

    def test_free_plan_price(self):
        r = client.get("/api/plans/free")
        assert r.json()["data"]["price"] == 0

    def test_enterprise_plan_limits(self):
        r = client.get("/api/plans/enterprise")
        data = r.json()["data"]
        assert data["ai_credits_monthly"] == 9999


# ========== 订阅管理 ==========

class TestSubscription:
    def test_auto_create_free_subscription(self):
        r = client.get("/api/subscriptions/user_001")
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["plan"] == "free"
        assert data["status"] == "active"
        assert "plan_details" in data

    def test_get_subscription_cached(self):
        r1 = client.get("/api/subscriptions/user_002")
        r2 = client.get("/api/subscriptions/user_002")
        assert r1.json()["data"]["id"] == r2.json()["data"]["id"]

    def test_create_basic_subscription(self):
        r = client.post("/api/subscriptions", json={
            "user_id": "user_new",
            "plan": "basic",
            "provider": "wechat",
        })
        assert r.status_code == 200
        data = r.json()["data"]
        assert "order_id" in data
        assert data["amount"] == 29
        assert data["currency"] == "CNY"

    def test_create_pro_subscription(self):
        r = client.post("/api/subscriptions", json={
            "user_id": "user_pro",
            "plan": "pro",
            "provider": "alipay",
        })
        assert r.json()["data"]["amount"] == 79

    def test_duplicate_plan_error(self):
        # 先创建 basic 订阅
        client.post("/api/subscriptions", json={
            "user_id": "dup_user", "plan": "basic", "provider": "wechat",
        })
        # 再 POST 同一 plan basic → 应报错
        r = client.post("/api/subscriptions", json={
            "user_id": "dup_user", "plan": "basic", "provider": "wechat",
        })
        assert r.status_code == 400
        assert "相同套餐" in r.json()["detail"]

    def test_auto_upgrade_same_user(self):
        # GET 确保自动创建 free 订阅
        client.get("/api/subscriptions/auto_up")
        # POST basic → 从 free 升级到 basic
        r = client.post("/api/subscriptions", json={
            "user_id": "auto_up", "plan": "basic", "provider": "wechat",
        })
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["from_plan"] == "free"
        assert data["to_plan"] == "basic"


# ========== 订阅取消 ==========

class TestCancel:
    def test_cancel_subscription(self):
        client.get("/api/subscriptions/cancel_user")
        r = client.put(
            "/api/subscriptions/cancel_user/cancel",
            json={"reason": "不需要了"},
        )
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["status"] == "cancelled"
        assert data["cancel_reason"] == "不需要了"

    def test_cancel_already_cancelled(self):
        client.get("/api/subscriptions/cancel_user2")
        client.put("/api/subscriptions/cancel_user2/cancel")
        r = client.put("/api/subscriptions/cancel_user2/cancel")
        assert r.status_code == 400


# ========== 升级 ==========

class TestUpgrade:
    def test_upgrade_free_to_basic(self):
        client.get("/api/subscriptions/upgrade_user")
        r = client.put(
            "/api/subscriptions/upgrade_user/upgrade",
            json={"new_plan": "basic"},
        )
        assert r.status_code == 200
        assert r.json()["data"]["upgrade_amount"] == 29

    def test_upgrade_free_to_pro(self):
        client.get("/api/subscriptions/upgrade_user2")
        r = client.put(
            "/api/subscriptions/upgrade_user2/upgrade",
            json={"new_plan": "pro"},
        )
        assert r.json()["data"]["upgrade_amount"] == 79

    def test_upgrade_basic_to_enterprise(self):
        db = get_db()
        db.subscriptions["upgrade_user3"] = {
            "id": "sub1", "user_id": "upgrade_user3", "plan": "basic",
            "status": "active",
            "current_period_start": "2026-01-01T00:00:00",
            "current_period_end": "2027-01-01T00:00:00",
            "cancel_at_period_end": False, "trial_end": None,
            "stripe_subscription_id": None, "created_at": "2026-01-01T00:00:00",
        }
        r = client.put(
            "/api/subscriptions/upgrade_user3/upgrade",
            json={"new_plan": "enterprise"},
        )
        assert r.json()["data"]["from_plan"] == "basic"

    def test_downgrade_error(self):
        db = get_db()
        db.subscriptions["down_user"] = {
            "id": "sub2", "user_id": "down_user", "plan": "pro",
            "status": "active",
            "current_period_start": "2026-01-01T00:00:00",
            "current_period_end": "2027-01-01T00:00:00",
            "cancel_at_period_end": False, "trial_end": None,
            "stripe_subscription_id": None, "created_at": "2026-01-01T00:00:00",
        }
        r = client.put(
            "/api/subscriptions/down_user/upgrade",
            json={"new_plan": "basic"},
        )
        assert r.status_code == 400
        assert "高于" in r.json()["detail"]


# ========== 用量追踪 ==========

class TestUsage:
    def test_record_ai_usage(self):
        r = client.post("/api/usage", json={
            "user_id": "usage_user",
            "category": "ai_generation",
            "amount": 1,
        })
        assert r.status_code == 200
        assert r.json()["data"]["recorded"] is True
        assert "limits" in r.json()["data"]

    def test_record_export_usage(self):
        r = client.post("/api/usage", json={
            "user_id": "export_user",
            "category": "export",
        })
        assert r.status_code == 200
        limits = r.json()["data"]["limits"]
        assert limits["limit"] == 5  # free plan

    def test_get_usage_stats(self):
        client.post("/api/usage", json={
            "user_id": "stat_user", "category": "ai_generation",
        })
        client.post("/api/usage", json={
            "user_id": "stat_user", "category": "ai_generation",
        })
        r = client.get("/api/usage/stat_user")
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["ai_credits"]["used"] == 2
        assert data["ai_credits"]["remaining"] == 1  # free: 3 credits


# ========== 支付回调 ==========

class TestWebhook:
    def test_payment_success_webhook(self):
        # 先创建订阅
        client.post("/api/subscriptions", json={
            "user_id": "pay_user", "plan": "basic", "provider": "wechat",
        })
        # 获取订单号
        db = get_db()
        order_id = [tx["id"] for tx in db.transactions.values() if tx["user_id"] == "pay_user"][0]

        timestamp = "2026-06-07T12:00:00"
        sig = _sign_webhook("payment.success", timestamp)

        r = client.post("/api/webhooks/payment", json={
            "event": "payment.success",
            "provider": "wechat",
            "payload": {"order_id": order_id},
            "timestamp": timestamp,
            "signature": sig,
        })
        assert r.status_code == 200
        assert db.transactions[order_id]["status"] == "paid"
        assert db.subscriptions["pay_user"]["plan"] == "basic"

    def test_payment_failed_webhook(self):
        timestamp = "2026-06-07T12:00:00"
        sig = _sign_webhook("payment.failed", timestamp)

        r = client.post("/api/webhooks/payment", json={
            "event": "payment.failed",
            "provider": "alipay",
            "payload": {"order_id": "nonexistent"},
            "timestamp": timestamp,
            "signature": sig,
        })
        assert r.status_code == 200

    def test_invalid_signature(self):
        r = client.post("/api/webhooks/payment", json={
            "event": "payment.success",
            "provider": "wechat",
            "payload": {"order_id": "test"},
            "timestamp": "2026-06-07T12:00:00",
            "signature": "invalid_signature",
        })
        assert r.status_code == 401


# ========== 交易记录 ==========

class TestTransactions:
    def test_get_transactions(self):
        client.post("/api/subscriptions", json={
            "user_id": "tx_user", "plan": "basic", "provider": "wechat",
        })
        r = client.get("/api/transactions/tx_user")
        assert r.status_code == 200
        assert len(r.json()["data"]) >= 1

    def test_empty_transactions(self):
        r = client.get("/api/transactions/nobody")
        assert r.json()["data"] == []


# ========== 发票 ==========

class TestInvoices:
    def test_create_invoice(self):
        client.post("/api/subscriptions", json={
            "user_id": "inv_user", "plan": "basic", "provider": "alipay",
        })
        db = get_db()
        order_id = [tx["id"] for tx in db.transactions.values() if tx["user_id"] == "inv_user"][0]
        r = client.post(f"/api/invoices?user_id=inv_user&transaction_id={order_id}")
        assert r.status_code == 200
        assert r.json()["data"]["id"].startswith("INV_")

    def test_invoice_not_found(self):
        r = client.post("/api/invoices?user_id=inv_user&transaction_id=nonexistent")
        assert r.status_code == 404

    def test_get_invoices(self):
        r = client.get("/api/invoices/inv_user")
        assert r.status_code == 200


# ========== 支付参数生成 ==========

class TestPaymentParams:
    def test_wechat_params(self):
        from src.index import generate_payment_params, PaymentProvider
        params = generate_payment_params("ORD123", 29.0, PaymentProvider.WECHAT, "user1")
        assert "appid" in params
        assert params["total_fee"] == 2900  # 分
        assert params["trade_type"] == "APP"

    def test_alipay_params(self):
        from src.index import generate_payment_params, PaymentProvider
        params = generate_payment_params("ORD123", 79.0, PaymentProvider.ALIPAY, "user1")
        assert params["total_amount"] == "79.00"

    def test_stripe_params(self):
        from src.index import generate_payment_params, PaymentProvider
        params = generate_payment_params("ORD123", 29.0, PaymentProvider.STRIPE, "user1")
        assert params["amount"] == 2900
        assert "metadata" in params

    def test_apple_params(self):
        from src.index import generate_payment_params, PaymentProvider
        params = generate_payment_params("ORD123", 79.0, PaymentProvider.APPLE, "user1")
        assert "product_id" in params


# ========== Stripe Checkout 接入测试 ==========

class TestStripeIntegration:
    @patch("src.index.create_stripe_checkout_session")
    @patch("src.index.get_stripe_client")
    def test_create_stripe_subscription(self, mock_get_client, mock_create_session):
        """测试 Stripe Checkout 订单创建"""
        mock_session = MagicMock()
        mock_session.url = "https://checkout.stripe.com/pay/cs_test_xxx"
        mock_session.id = "cs_test_xxx"
        mock_create_session.return_value = {
            "checkout_url": mock_session.url,
            "session_id": mock_session.id,
        }

        r = client.post("/api/subscriptions", json={
            "user_id": "stripe_user",
            "plan": "basic",
            "provider": "stripe",
            "email": "test@example.com",
        })
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["provider"] == "stripe"
        assert "checkout_url" in data
        assert "session_id" in data

    @patch("src.index.verify_stripe_webhook")
    def test_stripe_webhook_handler(self, mock_verify):
        """测试 Stripe webhook 事件处理"""
        mock_event = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "metadata": {"user_id": "stripe_user", "plan": "basic"},
                    "subscription": "sub_xxx",
                }
            }
        }
        mock_verify.return_value = mock_event

        r = client.post(
            "/api/webhooks/stripe",
            json=mock_event,
            headers={"stripe-signature": "t=xxx,v1=xxx"},
        )
        assert r.status_code == 200
        assert r.json()["success"] is True
        assert r.json()["event"] == "checkout.session.completed"


# ========== 健康检查 ==========

class TestHealth:
    def test_health_check(self):
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["service"] == "payment"
        assert data["version"] == "2.0.0"
        assert data["backend"] == "MemoryPaymentDB"

    def test_health_stripe_config_check(self):
        r = client.get("/health")
        data = r.json()
        assert "stripe_configured" in data


# ========== 数据库后端切换测试 ==========

class TestDBBackendSwitch:
    def test_get_db_default(self):
        """测试默认数据库后端"""
        db = get_db()
        assert isinstance(db, MemoryPaymentDB)

    def test_set_db(self):
        """测试 set_db() 切换后端"""
        original_db = get_db()
        mock_db = MagicMock()
        set_db(mock_db)
        assert get_db() is mock_db
        # 恢复
        set_db(original_db)

    def test_memory_db_clear(self):
        """测试 MemoryPaymentDB.clear() 正确清空数据"""
        db = get_db()
        # 添加一些数据
        db.subscriptions["test_user"] = {"id": "sub1", "user_id": "test_user", "plan": "basic", "status": "active"}
        db.transactions["tx1"] = {"id": "tx1", "user_id": "test_user", "amount_cents": 2900, "status": "paid", "created_at": "2026-06-07T12:00:00"}
        db.invoices["INV1"] = {"id": "INV1", "user_id": "test_user", "transaction_id": "tx1"}
        db.usage_records["test_user:2026-06"] = [{"category": "ai_generation", "amount": 1, "timestamp": "2026-06-07T12:00:00"}]
        
        # 清空
        db.clear()
        
        assert len(db.subscriptions) == 0
        assert len(db.transactions) == 0
        assert len(db.invoices) == 0
        assert len(db.usage_records) == 0


# ========== Stripe Webhook 更多事件测试 ==========

class TestStripeWebhookMore:
    @patch("src.index.verify_stripe_webhook")
    def test_invoice_payment_failed(self, mock_verify):
        """测试 invoice.payment_failed 事件"""
        mock_event = {
            "type": "invoice.payment_failed",
            "data": {
                "object": {
                    "subscription": "sub_xxx",
                    "customer": "cus_xxx",
                }
            }
        }
        mock_verify.return_value = mock_event

        r = client.post(
            "/api/webhooks/stripe",
            json=mock_event,
            headers={"stripe-signature": "t=xxx,v1=xxx"},
        )
        assert r.status_code == 200
        assert r.json()["success"] is True
        assert r.json()["event"] == "invoice.payment_failed"

    @patch("src.index.verify_stripe_webhook")
    def test_customer_subscription_deleted(self, mock_verify):
        """测试 customer.subscription.deleted 事件"""
        mock_event = {
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "id": "sub_xxx",
                    "customer": "cus_xxx",
                }
            }
        }
        mock_verify.return_value = mock_event

        r = client.post(
            "/api/webhooks/stripe",
            json=mock_event,
            headers={"stripe-signature": "t=xxx,v1=xxx"},
        )
        assert r.status_code == 200
        assert r.json()["success"] is True
        assert r.json()["event"] == "customer.subscription.deleted"

    @patch("src.index.verify_stripe_webhook")
    def test_invalid_stripe_signature(self, mock_verify):
        """测试无效 Stripe 签名"""
        mock_verify.return_value = None  # 返回 None 表示签名验证失败
        
        r = client.post(
            "/api/webhooks/stripe",
            json={"type": "checkout.session.completed", "data": {}},
            headers={"stripe-signature": "invalid"},
        )
        assert r.status_code == 401


# ========== 边界情况测试 ==========

class TestEdgeCases:
    def test_create_subscription_missing_fields(self):
        """测试缺少必需字段"""
        r = client.post("/api/subscriptions", json={
            "user_id": "user1",
            # 缺少 plan 和 provider
        })
        assert r.status_code == 422  # FastAPI 验证错误

    def test_get_subscription_nonexistent_user(self):
        """测试获取不存在用户的订阅"""
        r = client.get("/api/subscriptions/nonexistent_user")
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["plan"] == "free"  # 自动创建 free 套餐

    def test_cancel_nonexistent_subscription(self):
        """测试取消不存在的订阅"""
        r = client.put(
            "/api/subscriptions/nonexistent_user/cancel",
            json={"reason": "test"},
        )
        assert r.status_code == 200  # 会创建 free 套餐然后取消

    def test_upgrade_nonexistent_user(self):
        """测试升级不存在的用户"""
        r = client.put(
            "/api/subscriptions/nonexistent_user/upgrade",
            json={"new_plan": "basic"},
        )
        assert r.status_code == 200  # 会创建 free 套餐然后升级

    def test_get_usage_nonexistent_user(self):
        """测试获取不存在用户的用量"""
        r = client.get("/api/usage/nonexistent_user")
        assert r.status_code == 200
        data = r.json()["data"]
        assert "ai_credits" in data

    def test_get_transactions_nonexistent_user(self):
        """测试获取不存在用户的交易记录"""
        r = client.get("/api/transactions/nonexistent_user")
        assert r.status_code == 200
        assert r.json()["data"] == []

    def test_get_invoices_nonexistent_user(self):
        """测试获取不存在用户的发票"""
        r = client.get("/api/invoices/nonexistent_user")
        assert r.status_code == 200
        assert r.json()["data"] == []
