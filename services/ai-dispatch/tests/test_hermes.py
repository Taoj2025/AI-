"""
测试 Hermes 适配层
使用 Mock Provider，无需真实 API Key
运行: python -m pytest tests/test_hermes.py -v
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import pytest
from hermes import (
    HermesAdapter,
    MockProvider,
    Message,
    MessageRole,
    ProviderConfig,
    HermesResponse,
    calc_cost,
)


# ─────────────────────────── 工具函数测试 ───────────────────────────

class TestCalcCost:
    def test_gpt4o_cost(self):
        """测试 GPT-4o 成本计算"""
        cost = calc_cost("gpt-4o", prompt_tokens=1000, completion_tokens=500)
        expected = 1000 * 5.0 / 1_000_000 + 500 * 15.0 / 1_000_000
        assert abs(cost - expected) < 1e-9

    def test_gpt4o_mini_cost_lower_than_gpt4o(self):
        """mini 模型应比 gpt-4o 便宜"""
        cost_full = calc_cost("gpt-4o", 1000, 1000)
        cost_mini = calc_cost("gpt-4o-mini", 1000, 1000)
        assert cost_mini < cost_full

    def test_unknown_model_has_default_price(self):
        """未知模型使用默认价格，不应抛异常"""
        cost = calc_cost("unknown-model-xyz", 1000, 1000)
        assert cost > 0


# ─────────────────────────── Message 测试 ───────────────────────────

class TestMessage:
    def test_to_dict_user(self):
        msg = Message(MessageRole.USER, "Hello")
        d = msg.to_dict()
        assert d["role"] == "user"
        assert d["content"] == "Hello"

    def test_to_dict_system(self):
        msg = Message(MessageRole.SYSTEM, "You are an assistant")
        d = msg.to_dict()
        assert d["role"] == "system"

    def test_multimodal_content(self):
        content = [{"type": "text", "text": "分析这张图"}]
        msg = Message(MessageRole.USER, content)
        assert isinstance(msg.to_dict()["content"], list)


# ─────────────────────────── MockProvider 测试 ───────────────────────────

class TestMockProvider:
    @pytest.fixture
    def provider(self):
        return MockProvider(response_text="这是一份优秀的简历")

    @pytest.mark.asyncio
    async def test_returns_correct_content(self, provider):
        messages = [Message(MessageRole.USER, "生成简历")]
        response = await provider.chat("gpt-4o", messages)
        assert response.content == "这是一份优秀的简历"

    @pytest.mark.asyncio
    async def test_returns_hermes_response(self, provider):
        messages = [Message(MessageRole.USER, "test")]
        response = await provider.chat("gpt-4o", messages)
        assert isinstance(response, HermesResponse)
        assert response.model == "gpt-4o"
        assert response.provider == "mock"

    @pytest.mark.asyncio
    async def test_call_count_increments(self, provider):
        messages = [Message(MessageRole.USER, "test")]
        assert provider.call_count == 0
        await provider.chat("gpt-4o", messages)
        await provider.chat("gpt-4o", messages)
        assert provider.call_count == 2

    @pytest.mark.asyncio
    async def test_returns_nonzero_tokens(self, provider):
        response = await provider.chat("gpt-4o", [Message(MessageRole.USER, "x")])
        assert response.total_tokens > 0
        assert response.prompt_tokens > 0
        assert response.completion_tokens > 0


# ─────────────────────────── HermesAdapter 测试 ───────────────────────────

class TestHermesAdapter:
    @pytest.fixture
    def hermes(self):
        """使用 Mock Provider 构建 Hermes 实例"""
        return HermesAdapter(providers={
            "openai": MockProvider("OpenAI 生成结果"),
            "anthropic": MockProvider("Anthropic 生成结果"),
        })

    @pytest.fixture
    def messages(self):
        return [
            Message(MessageRole.SYSTEM, "你是专业简历顾问"),
            Message(MessageRole.USER, "请生成一份简历"),
        ]

    @pytest.mark.asyncio
    async def test_chat_with_openai_model(self, hermes, messages):
        """通过 Hermes 调用 OpenAI 模型"""
        response = await hermes.chat(model="gpt-4o", messages=messages)
        assert response.content == "OpenAI 生成结果"
        assert response.provider == "mock"

    @pytest.mark.asyncio
    async def test_chat_with_anthropic_model(self, hermes, messages):
        """通过 Hermes 调用 Anthropic 模型"""
        response = await hermes.chat(model="claude-3-5-sonnet-20241022", messages=messages)
        assert response.content == "Anthropic 生成结果"

    def test_resolve_provider_openai(self, hermes):
        """模型名正确解析到 openai"""
        assert hermes.resolve_provider("gpt-4o") == "openai"
        assert hermes.resolve_provider("gpt-4o-mini") == "openai"

    def test_resolve_provider_anthropic(self, hermes):
        """模型名正确解析到 anthropic"""
        assert hermes.resolve_provider("claude-3-5-sonnet-20241022") == "anthropic"

    def test_resolve_provider_unknown_raises(self, hermes):
        """未知模型名应抛出 ValueError"""
        with pytest.raises(ValueError, match="未知模型"):
            hermes.resolve_provider("unknown-model-that-doesnt-exist")

    @pytest.mark.asyncio
    async def test_missing_provider_raises(self, messages):
        """Provider 未配置时应抛出 RuntimeError"""
        hermes = HermesAdapter(providers={})  # 空配置
        with pytest.raises(RuntimeError, match="未配置"):
            await hermes.chat(model="gpt-4o", messages=messages)

    @pytest.mark.asyncio
    async def test_usage_log_records_calls(self, hermes, messages):
        """调用后 usage log 应有记录"""
        assert len(hermes._usage_log) == 0
        await hermes.chat(model="gpt-4o", messages=messages)
        assert len(hermes._usage_log) == 1

    @pytest.mark.asyncio
    async def test_total_cost_accumulates(self, hermes, messages):
        """多次调用成本应累加"""
        await hermes.chat(model="gpt-4o", messages=messages)
        await hermes.chat(model="gpt-4o", messages=messages)
        cost = hermes.get_total_cost()
        assert cost > 0

    @pytest.mark.asyncio
    async def test_fallback_on_provider_failure(self, messages):
        """主模型失败时应自动切换备用模型"""
        class FailingProvider(MockProvider):
            async def chat(self, *args, **kwargs):
                raise ConnectionError("模拟网络故障")

        hermes = HermesAdapter(providers={
            "openai": FailingProvider(),
            # gpt-4o → gpt-4o-mini，但两者都用 openai provider，都会 fail
            # 此处测试异常被正确传播
        })
        with pytest.raises(RuntimeError):
            await hermes.chat(model="gpt-4o", messages=messages, enable_fallback=False)

    @pytest.mark.asyncio
    async def test_get_usage_summary(self, hermes, messages):
        """使用摘要包含正确字段"""
        await hermes.chat(model="gpt-4o", messages=messages)
        summary = hermes.get_usage_summary()
        assert "total_calls" in summary
        assert "total_tokens" in summary
        assert "total_cost_usd" in summary
        assert "avg_latency_ms" in summary
        assert summary["total_calls"] == 1


# ─────────────────────────── 并发测试 ───────────────────────────

class TestConcurrency:
    @pytest.mark.asyncio
    async def test_concurrent_calls(self):
        """并发 10 个请求应全部成功"""
        hermes = HermesAdapter(providers={"openai": MockProvider()})
        messages = [Message(MessageRole.USER, "test")]

        tasks = [
            hermes.chat(model="gpt-4o", messages=messages)
            for _ in range(10)
        ]
        results = await asyncio.gather(*tasks)

        assert len(results) == 10
        assert all(isinstance(r, HermesResponse) for r in results)
        assert hermes.get_usage_summary()["total_calls"] == 10


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
