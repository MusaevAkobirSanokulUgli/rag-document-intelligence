import asyncio
from typing import Protocol, runtime_checkable
import numpy as np
from openai import AsyncOpenAI
from app.config import settings


@runtime_checkable
class EmbeddingProvider(Protocol):
    async def embed_texts(self, texts: list[str]) -> list[list[float]]: ...
    async def embed_query(self, query: str) -> list[float]: ...


class OpenAIEmbeddingService:
    """Async OpenAI embedding service with rate limiting and batching."""

    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.embedding_model
        self._semaphore = asyncio.Semaphore(10)  # Rate limiting: max 10 concurrent requests

    async def embed_texts(self, texts: list[str], batch_size: int = 100) -> list[list[float]]:
        all_embeddings: list[list[float]] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            async with self._semaphore:
                response = await self.client.embeddings.create(
                    model=self.model,
                    input=batch,
                    dimensions=settings.embedding_dimensions,
                )
                all_embeddings.extend([e.embedding for e in response.data])
        return all_embeddings

    async def embed_query(self, query: str) -> list[float]:
        result = await self.embed_texts([query])
        return result[0]


class LocalEmbeddingService:
    """Fallback local embedding using sentence-transformers when OpenAI key is unavailable."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self._model_name = model_name
        self._model = None

    def _load_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer

                self._model = SentenceTransformer(self._model_name)
            except ImportError as e:
                raise RuntimeError(
                    "sentence-transformers is required for local embeddings. "
                    "Install with: pip install sentence-transformers"
                ) from e
        return self._model

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        model = self._load_model()
        embeddings = await asyncio.to_thread(model.encode, texts, convert_to_numpy=True)
        return embeddings.tolist()

    async def embed_query(self, query: str) -> list[float]:
        result = await self.embed_texts([query])
        return result[0]


class EmbeddingService:
    """Unified embedding service supporting multiple providers."""

    def __init__(self, provider: EmbeddingProvider | None = None) -> None:
        if provider is not None:
            self.provider = provider
        elif settings.openai_api_key:
            self.provider: EmbeddingProvider = OpenAIEmbeddingService()
        else:
            self.provider = LocalEmbeddingService()

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of document texts for indexing."""
        return await self.provider.embed_texts(texts)

    async def embed_query(self, query: str) -> list[float]:
        """Embed a single query string for retrieval."""
        return await self.provider.embed_query(query)

    @staticmethod
    def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
        """Compute cosine similarity between two embedding vectors."""
        a = np.array(vec_a)
        b = np.array(vec_b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))
