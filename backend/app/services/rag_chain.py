import logging
from collections.abc import AsyncGenerator

from openai import AsyncOpenAI
from app.config import settings
from app.services.retriever import HybridRetriever, RetrievalResult

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an intelligent document assistant with expertise in synthesizing information \
from multiple sources. Answer questions based strictly on the provided context.

Guidelines:
- If the context contains the answer, provide a comprehensive, well-structured response.
- If the context is insufficient, clearly state that and explain what information is missing.
- Always cite sources using [Source N] notation inline when referencing specific information.
- Keep answers concise but complete — prioritize clarity over verbosity.
- For technical questions, include relevant details and examples from the sources."""


class RAGChain:
    """
    End-to-end RAG chain that orchestrates retrieval and generation.

    Flow: query → hybrid retrieval → context formatting → LLM generation
    Supports both single-shot completion and token-by-token streaming.
    """

    def __init__(self, retriever: HybridRetriever) -> None:
        self.retriever = retriever
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def query(
        self,
        question: str,
        conversation_history: list[dict] | None = None,
        top_k: int = 5,
        alpha: float = 0.7,
    ) -> dict:
        """
        Execute a RAG query and return the full answer with source attribution.

        Args:
            question: User's question.
            conversation_history: Previous turns in [{"role": ..., "content": ...}] format.
            top_k: Number of context chunks to retrieve.
            alpha: Semantic search weight for hybrid retrieval.

        Returns:
            Dict with answer (str), sources (list[RetrievalResult]), tokens_used (int|None).
        """
        results = await self.retriever.retrieve(question, top_k=top_k, alpha=alpha)
        context = self._format_context(results)
        messages = self._build_messages(question, context, conversation_history)

        response = await self.client.chat.completions.create(
            model=settings.llm_model,
            messages=messages,
            temperature=0.3,
            max_tokens=1500,
        )

        return {
            "answer": response.choices[0].message.content or "",
            "sources": results,
            "tokens_used": response.usage.total_tokens if response.usage else None,
        }

    async def stream(
        self,
        question: str,
        conversation_history: list[dict] | None = None,
        top_k: int = 5,
        alpha: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """
        Stream the RAG answer token by token for real-time display.

        Yields individual text tokens as they arrive from the LLM.
        The retrieved context is fetched upfront before streaming begins.
        """
        results = await self.retriever.retrieve(question, top_k=top_k, alpha=alpha)
        context = self._format_context(results)
        messages = self._build_messages(question, context, conversation_history)

        stream = await self.client.chat.completions.create(
            model=settings.llm_model,
            messages=messages,
            temperature=0.3,
            max_tokens=1500,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def _format_context(self, results: list[RetrievalResult]) -> str:
        """Format retrieved chunks into a numbered context block for the LLM prompt."""
        if not results:
            return "No relevant context found in the document store."

        parts = []
        for i, r in enumerate(results, 1):
            doc_ref = f"doc:{r.document_id[:8]}" if r.document_id else "unknown"
            parts.append(
                f"[Source {i}] ({doc_ref}, relevance: {r.score:.3f})\n{r.content}"
            )
        return "\n\n---\n\n".join(parts)

    def _build_messages(
        self,
        question: str,
        context: str,
        history: list[dict] | None,
    ) -> list[dict]:
        """Construct the full message list for the chat completion API."""
        messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Include up to the last 6 messages (3 turns) for context continuity
        if history:
            messages.extend(history[-6:])

        user_message = (
            f"Context from documents:\n\n{context}\n\n"
            f"Question: {question}\n\n"
            f"Provide a comprehensive answer based on the context above. "
            f"Use [Source N] citations when referencing specific information."
        )
        messages.append({"role": "user", "content": user_message})
        return messages
