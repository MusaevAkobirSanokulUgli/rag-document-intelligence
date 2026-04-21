import asyncio
import math
from dataclasses import dataclass
from collections import defaultdict


@dataclass
class RetrievalResult:
    """A single retrieval result from the hybrid search pipeline."""

    chunk_id: str
    document_id: str
    content: str
    score: float
    metadata: dict


class BM25Index:
    """In-memory BM25 index for fast keyword-based search."""

    def __init__(self, k1: float = 1.5, b: float = 0.75) -> None:
        self.k1 = k1
        self.b = b
        self.doc_freqs: dict[str, int] = defaultdict(int)
        self.doc_lens: dict[str, int] = {}
        self.avg_doc_len: float = 0.0
        self.corpus_size: int = 0
        self.tf: dict[str, dict[str, int]] = {}
        self.documents: dict[str, str] = {}

    def add_document(self, doc_id: str, text: str) -> None:
        """Index a document into the BM25 index."""
        tokens = self._tokenize(text)
        self.documents[doc_id] = text
        self.doc_lens[doc_id] = len(tokens)
        self.corpus_size += 1
        self.avg_doc_len = sum(self.doc_lens.values()) / self.corpus_size

        tf: dict[str, int] = defaultdict(int)
        for token in tokens:
            tf[token] += 1
        self.tf[doc_id] = dict(tf)

        seen: set[str] = set()
        for token in tokens:
            if token not in seen:
                self.doc_freqs[token] += 1
                seen.add(token)

    def remove_document(self, doc_id: str) -> None:
        """Remove a document from the BM25 index."""
        if doc_id not in self.documents:
            return

        tokens = self._tokenize(self.documents[doc_id])
        seen: set[str] = set()
        for token in tokens:
            if token not in seen:
                self.doc_freqs[token] = max(0, self.doc_freqs[token] - 1)
                seen.add(token)

        del self.documents[doc_id]
        del self.doc_lens[doc_id]
        del self.tf[doc_id]
        self.corpus_size -= 1
        if self.corpus_size > 0:
            self.avg_doc_len = sum(self.doc_lens.values()) / self.corpus_size
        else:
            self.avg_doc_len = 0.0

    def search(self, query: str, top_k: int = 5) -> list[tuple[str, float]]:
        """Search the index and return (doc_id, score) pairs sorted by relevance."""
        if self.corpus_size == 0:
            return []

        query_tokens = self._tokenize(query)
        scores: dict[str, float] = defaultdict(float)

        for token in query_tokens:
            if token not in self.doc_freqs:
                continue
            idf = math.log(
                (self.corpus_size - self.doc_freqs[token] + 0.5)
                / (self.doc_freqs[token] + 0.5)
                + 1
            )

            for doc_id, tf_dict in self.tf.items():
                if token in tf_dict:
                    tf_val = tf_dict[token]
                    doc_len = self.doc_lens[doc_id]
                    numerator = tf_val * (self.k1 + 1)
                    denominator = tf_val + self.k1 * (
                        1 - self.b + self.b * doc_len / max(self.avg_doc_len, 1e-9)
                    )
                    scores[doc_id] += idf * numerator / denominator

        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_scores[:top_k]

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        """Simple whitespace tokenizer with lowercasing."""
        return text.lower().split()


class HybridRetriever:
    """
    Combines semantic vector search with BM25 keyword search using
    Reciprocal Rank Fusion (RRF) for superior retrieval quality.
    """

    def __init__(
        self,
        vectorstore,
        embedding_service,
        bm25_index: BM25Index,
    ) -> None:
        self.vectorstore = vectorstore
        self.embedding_service = embedding_service
        self.bm25_index = bm25_index

    async def retrieve(
        self,
        query: str,
        top_k: int = 5,
        alpha: float = 0.7,
        filters: dict | None = None,
    ) -> list[RetrievalResult]:
        """
        Retrieve relevant document chunks using hybrid search.

        Args:
            query: Natural language query string.
            top_k: Number of results to return.
            alpha: Weight for semantic search (1-alpha goes to BM25).
            filters: Optional metadata filters for vector search.

        Returns:
            List of RetrievalResult sorted by fused relevance score.
        """
        # Run semantic and keyword search concurrently
        semantic_task = self._semantic_search(query, top_k * 2, filters)
        keyword_task = asyncio.to_thread(self.bm25_index.search, query, top_k * 2)

        semantic_results, keyword_results = await asyncio.gather(semantic_task, keyword_task)

        fused = self._reciprocal_rank_fusion(semantic_results, keyword_results, alpha=alpha)
        return fused[:top_k]

    async def _semantic_search(
        self, query: str, top_k: int, filters: dict | None
    ) -> list[RetrievalResult]:
        """Embed the query and perform vector similarity search."""
        query_embedding = await self.embedding_service.embed_query(query)
        return await self.vectorstore.search(query_embedding, top_k, filters)

    def _reciprocal_rank_fusion(
        self,
        semantic_results: list[RetrievalResult],
        keyword_results: list[tuple[str, float]],
        alpha: float = 0.7,
        k: int = 60,
    ) -> list[RetrievalResult]:
        """
        Merge semantic and keyword results using Reciprocal Rank Fusion.

        RRF score = alpha * 1/(k + rank_semantic) + (1-alpha) * 1/(k + rank_keyword)
        """
        scores: dict[str, float] = defaultdict(float)
        result_map: dict[str, RetrievalResult] = {}

        for rank, result in enumerate(semantic_results):
            scores[result.chunk_id] += alpha * (1 / (k + rank + 1))
            result_map[result.chunk_id] = result

        for rank, (chunk_id, _) in enumerate(keyword_results):
            scores[chunk_id] += (1 - alpha) * (1 / (k + rank + 1))
            if chunk_id not in result_map and chunk_id in self.bm25_index.documents:
                result_map[chunk_id] = RetrievalResult(
                    chunk_id=chunk_id,
                    document_id="",
                    content=self.bm25_index.documents[chunk_id],
                    score=0.0,
                    metadata={},
                )

        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        results = []
        for chunk_id in sorted_ids:
            if chunk_id in result_map:
                result = result_map[chunk_id]
                result.score = scores[chunk_id]
                results.append(result)

        return results
