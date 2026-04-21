import logging
from collections.abc import AsyncGenerator

from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """
    Async LLM service with support for both standard completions and streaming.
    Wraps OpenAI's async client with error handling and token tracking.
    """

    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.llm_model

    async def complete(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        max_tokens: int = 1500,
    ) -> dict:
        """
        Send a chat completion request and return the full response.

        Returns:
            dict with keys: content (str), tokens_used (int), finish_reason (str)
        """
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return {
            "content": response.choices[0].message.content or "",
            "tokens_used": response.usage.total_tokens if response.usage else None,
            "finish_reason": response.choices[0].finish_reason,
        }

    async def stream(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        max_tokens: int = 1500,
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat completion tokens as they are generated.

        Yields individual text tokens for real-time response streaming.
        """
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            delta_content = chunk.choices[0].delta.content if chunk.choices else None
            if delta_content:
                yield delta_content

    async def count_tokens(self, text: str) -> int:
        """
        Estimate token count for the given text using tiktoken if available,
        otherwise fall back to a word-based approximation.
        """
        try:
            import tiktoken

            enc = tiktoken.encoding_for_model(self.model)
            return len(enc.encode(text))
        except (ImportError, KeyError):
            # Approximate: ~1.3 tokens per word for English text
            return int(len(text.split()) * 1.3)
