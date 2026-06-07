"""
Hermes — 统一 AI API 适配层
支持 OpenAI / Anthropic / Google / Baidu / Alibaba / Local (Ollama)
"""
from __future__ import annotations

import asyncio
import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncGenerator, Optional
from enum import Enum


# ─────────────────────────── 数据模型 ───────────────────────────

class MessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


@dataclass
class Message:
    role: MessageRole
    content: str | list  # str 文本 或 list 多模态

    def to_dict(self) -> dict:
        return {"role": self.role.value, "content": self.content}


@dataclass
class HermesResponse:
    content: str
    model: str
    provider: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency_ms: float = 0
    cost_usd: float = 0.0
    is_fallback: bool = False


@dataclass
class ProviderConfig:
    api_key: str
    base_url: Optional[str] = None
    timeout: int = 60
    max_retries: int = 3


# ─────────────────────────── 价格表 ───────────────────────────

MODEL_PRICING: dict[str, dict[str, float]] = {
    "gpt-4o":               {"input": 5.0,   "output": 15.0},   # per 1M tokens (USD)
    "gpt-4o-mini":          {"input": 0.15,  "output": 0.60},
    "gpt-4-turbo":          {"input": 10.0,  "output": 30.0},
    "claude-3-5-sonnet-20241022": {"input": 3.0, "output": 15.0},
    "claude-3-haiku-20240307":    {"input": 0.25, "output": 1.25},
    "gemini-1.5-pro":       {"input": 3.5,   "output": 10.5},
    "gemini-1.5-flash":     {"input": 0.075, "output": 0.30},
    "ernie-4.0":            {"input": 0.12,  "output": 0.12},   # 元/1K tokens（实际需换算）
    "qwen-max":             {"input": 0.04,  "output": 0.12},
    # MiniMax 价格（USD/1M tokens）
    "MiniMax-M3":           {"input": 2.0,   "output": 8.0},
    "MiniMax-M2.7":         {"input": 1.0,   "output": 4.0},
    "MiniMax-M2.7-highspeed": {"input": 0.5, "output": 2.0},
    "MiniMax-M2.5":         {"input": 0.8,   "output": 3.0},
    "MiniMax-M2.5-highspeed": {"input": 0.4, "output": 1.5},
    "MiniMax-M2.1":         {"input": 0.6,   "output": 2.5},
    "MiniMax-M2":           {"input": 0.4,   "output": 1.5},
}


def calc_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """计算 API 调用成本（USD）"""
    pricing = MODEL_PRICING.get(model, {"input": 0.01, "output": 0.03})
    return (
        prompt_tokens * pricing["input"] / 1_000_000
        + completion_tokens * pricing["output"] / 1_000_000
    )


# ─────────────────────────── 抽象 Provider ───────────────────────────

class BaseProvider(ABC):
    """所有 Provider 的抽象基类"""

    def __init__(self, config: ProviderConfig):
        self.config = config

    @abstractmethod
    async def chat(
        self,
        model: str,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs,
    ) -> HermesResponse | AsyncGenerator[str, None]:
        ...

    def _build_messages(self, messages: list[Message]) -> list[dict]:
        return [m.to_dict() for m in messages]


# ─────────────────────────── OpenAI Provider ───────────────────────────

class OpenAIProvider(BaseProvider):
    """OpenAI 及兼容接口（Azure OpenAI、OpenRouter 等）"""

    SUPPORTED_MODELS = {
        "gpt-4o", "gpt-4o-mini", "gpt-4-turbo",
        "gpt-3.5-turbo", "o1-preview", "o1-mini",
    }

    async def chat(
        self,
        model: str,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs,
    ) -> HermesResponse:
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise ImportError("请安装 openai: pip install openai")

        client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            timeout=self.config.timeout,
        )

        start = time.monotonic()
        response = await client.chat.completions.create(
            model=model,
            messages=self._build_messages(messages),
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
            **kwargs,
        )
        latency = (time.monotonic() - start) * 1000

        usage = response.usage
        return HermesResponse(
            content=response.choices[0].message.content,
            model=model,
            provider="openai",
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            total_tokens=usage.total_tokens,
            latency_ms=latency,
            cost_usd=calc_cost(model, usage.prompt_tokens, usage.completion_tokens),
        )


# ─────────────────────────── Anthropic Provider ───────────────────────────

class AnthropicProvider(BaseProvider):
    """Anthropic Claude 系列"""

    SUPPORTED_MODELS = {
        "claude-3-5-sonnet-20241022",
        "claude-3-haiku-20240307",
        "claude-3-opus-20240229",
    }

    async def chat(
        self,
        model: str,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs,
    ) -> HermesResponse:
        try:
            import anthropic
        except ImportError:
            raise ImportError("请安装 anthropic: pip install anthropic")

        client = anthropic.AsyncAnthropic(
            api_key=self.config.api_key,
            timeout=self.config.timeout,
        )

        # Anthropic API 需要将 system 消息单独提取
        system_msg = next(
            (m.content for m in messages if m.role == MessageRole.SYSTEM), None
        )
        chat_messages = [
            m.to_dict() for m in messages if m.role != MessageRole.SYSTEM
        ]

        start = time.monotonic()
        kwargs_extra = {}
        if system_msg:
            kwargs_extra["system"] = system_msg

        response = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=chat_messages,
            temperature=temperature,
            **kwargs_extra,
        )
        latency = (time.monotonic() - start) * 1000

        usage = response.usage
        return HermesResponse(
            content=response.content[0].text,
            model=model,
            provider="anthropic",
            prompt_tokens=usage.input_tokens,
            completion_tokens=usage.output_tokens,
            total_tokens=usage.input_tokens + usage.output_tokens,
            latency_ms=latency,
            cost_usd=calc_cost(model, usage.input_tokens, usage.output_tokens),
        )


# ─────────────────────────── MiniMax Provider ───────────────────────────

class MiniMaxProvider(BaseProvider):
    """MiniMax 系列（OpenAI 兼容接口）"""

    SUPPORTED_MODELS = {
        "MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2.7-highspeed",
        "MiniMax-M2.5", "MiniMax-M2.5-highspeed",
        "MiniMax-M2.1", "MiniMax-M2.1-highspeed",
        "MiniMax-M2",
    }

    async def chat(
        self,
        model: str,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs,
    ) -> HermesResponse:
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise ImportError("请安装 openai: pip install openai")

        client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url or "https://api.minimaxi.com/v1",
            timeout=self.config.timeout,
        )

        start = time.monotonic()
        response = await client.chat.completions.create(
            model=model,
            messages=self._build_messages(messages),
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
            **kwargs,
        )
        latency = (time.monotonic() - start) * 1000

        usage = response.usage
        return HermesResponse(
            content=response.choices[0].message.content,
            model=model,
            provider="minimax",
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            total_tokens=usage.total_tokens if usage else 0,
            latency_ms=latency,
            cost_usd=calc_cost(model,
                               usage.prompt_tokens if usage else 0,
                               usage.completion_tokens if usage else 0),
        )


# ─────────────────────────── Mock Provider（测试用）───────────────────────────

class MockProvider(BaseProvider):
    """测试用 Mock Provider，无需真实 API Key"""

    def __init__(self, response_text: str = "Mock 简历内容"):
        super().__init__(ProviderConfig(api_key="mock"))
        self.response_text = response_text
        self.call_count = 0

    async def chat(
        self,
        model: str,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False,
        **kwargs,
    ) -> HermesResponse:
        self.call_count += 1
        await asyncio.sleep(0.01)  # 模拟网络延迟
        return HermesResponse(
            content=self.response_text,
            model=model,
            provider="mock",
            prompt_tokens=100,
            completion_tokens=200,
            total_tokens=300,
            latency_ms=10.0,
            cost_usd=0.001,
        )


# ─────────────────────────── Hermes 核心 ───────────────────────────

class HermesAdapter:
    """
    统一 AI API 适配层

    使用示例:
        hermes = HermesAdapter()
        response = await hermes.chat(
            model="gpt-4o",
            messages=[Message(MessageRole.USER, "帮我生成一份简历")]
        )
    """

    # 模型名 → Provider 类型映射
    MODEL_PROVIDER_MAP: dict[str, str] = {
        "gpt-4o": "openai",
        "gpt-4o-mini": "openai",
        "gpt-4-turbo": "openai",
        "gpt-3.5-turbo": "openai",
        "claude-3-5-sonnet-20241022": "anthropic",
        "claude-3-haiku-20240307": "anthropic",
        "gemini-1.5-pro": "google",
        "gemini-1.5-flash": "google",
        "ernie-4.0": "baidu",
        "qwen-max": "alibaba",
        # MiniMax
        "MiniMax-M3": "minimax",
        "MiniMax-M2.7": "minimax",
        "MiniMax-M2.7-highspeed": "minimax",
        "MiniMax-M2.5": "minimax",
        "MiniMax-M2.5-highspeed": "minimax",
        "MiniMax-M2.1": "minimax",
        "MiniMax-M2": "minimax",
    }

    # 故障转移链
    FALLBACK_CHAIN: dict[str, str] = {
        "gpt-4o": "gpt-4o-mini",
        "claude-3-5-sonnet-20241022": "claude-3-haiku-20240307",
        "gemini-1.5-pro": "gemini-1.5-flash",
    }

    def __init__(self, providers: dict[str, BaseProvider] | None = None):
        """
        providers: 可以注入 Provider 实例（用于测试 Mock）
        不传时从环境变量读取 API Key 自动初始化
        """
        if providers is not None:
            self._providers = providers
        else:
            self._providers = self._init_providers_from_env()
        
        self._usage_log: list[dict] = []

    def _init_providers_from_env(self) -> dict[str, BaseProvider]:
        providers: dict[str, BaseProvider] = {}

        if key := os.getenv("OPENAI_API_KEY"):
            providers["openai"] = OpenAIProvider(ProviderConfig(api_key=key))

        if key := os.getenv("ANTHROPIC_API_KEY"):
            providers["anthropic"] = AnthropicProvider(ProviderConfig(api_key=key))

        if key := os.getenv("MINIMAX_API_KEY"):
            providers["minimax"] = MiniMaxProvider(
                ProviderConfig(api_key=key, base_url=os.getenv("MINIMAX_BASE_URL"))
            )

        return providers

    def resolve_provider(self, model: str) -> str:
        """解析模型名对应的 Provider 类型"""
        provider_type = self.MODEL_PROVIDER_MAP.get(model)
        if not provider_type:
            raise ValueError(f"未知模型: {model}，请检查 MODEL_PROVIDER_MAP")
        return provider_type

    async def chat(
        self,
        model: str,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        enable_fallback: bool = True,
        **kwargs,
    ) -> HermesResponse:
        """
        统一调用入口，支持自动故障转移
        """
        provider_type = self.resolve_provider(model)
        provider = self._providers.get(provider_type)

        if provider is None:
            raise RuntimeError(
                f"Provider '{provider_type}' 未配置。"
                f"请设置相应的 API Key 环境变量。"
            )

        try:
            response = await provider.chat(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs,
            )
            self._log_usage(response)
            return response

        except Exception as e:
            if enable_fallback and model in self.FALLBACK_CHAIN:
                fallback_model = self.FALLBACK_CHAIN[model]
                try:
                    fallback_response = await self.chat(
                        model=fallback_model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        enable_fallback=False,  # 避免无限递归
                        **kwargs,
                    )
                    fallback_response.is_fallback = True
                    return fallback_response
                except Exception:
                    pass
            raise RuntimeError(f"所有模型调用失败，最后错误: {e}") from e

    def _log_usage(self, response: HermesResponse) -> None:
        """记录调用日志"""
        self._usage_log.append({
            "model": response.model,
            "provider": response.provider,
            "tokens": response.total_tokens,
            "cost_usd": response.cost_usd,
            "latency_ms": response.latency_ms,
        })

    def get_total_cost(self) -> float:
        """获取本次实例总调用成本"""
        return sum(log["cost_usd"] for log in self._usage_log)

    def get_usage_summary(self) -> dict:
        """获取使用统计摘要"""
        return {
            "total_calls": len(self._usage_log),
            "total_tokens": sum(log["tokens"] for log in self._usage_log),
            "total_cost_usd": self.get_total_cost(),
            "avg_latency_ms": (
                sum(log["latency_ms"] for log in self._usage_log) / len(self._usage_log)
                if self._usage_log else 0
            ),
        }
