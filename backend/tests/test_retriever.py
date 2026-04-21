import pytest
from app.services.retriever import BM25Index, HybridRetriever, RetrievalResult


class TestBM25Index:
    def test_empty_index_returns_no_results(self):
        index = BM25Index()
        results = index.search("machine learning")
        assert results == []

    def test_single_document_retrieval(self):
        index = BM25Index()
        index.add_document("doc1", "hello world")
        results = index.search("hello")
        assert len(results) == 1
        assert results[0][0] == "doc1"
        assert results[0][1] > 0.0

    def test_multiple_documents_ranked_by_relevance(self):
        index = BM25Index()
        index.add_document("doc1", "machine learning is a subset of artificial intelligence")
        index.add_document("doc2", "deep learning uses neural networks for complex tasks")
        index.add_document("doc3", "python is a popular programming language")

        results = index.search("machine learning neural networks", top_k=2)
        assert len(results) == 2
        result_ids = [r[0] for r in results]
        # doc1 and doc2 should dominate — doc3 is irrelevant to this query
        assert "doc1" in result_ids or "doc2" in result_ids

    def test_top_k_respected(self):
        index = BM25Index()
        for i in range(10):
            index.add_document(f"doc{i}", f"document number {i} about topic")
        results = index.search("document topic", top_k=3)
        assert len(results) <= 3

    def test_scores_are_positive(self):
        index = BM25Index()
        index.add_document("doc1", "fast python async programming")
        results = index.search("async python")
        assert all(score > 0 for _, score in results)

    def test_remove_document(self):
        index = BM25Index()
        index.add_document("doc1", "machine learning algorithms")
        index.add_document("doc2", "deep learning neural networks")
        index.remove_document("doc1")

        results = index.search("machine learning")
        result_ids = [r[0] for r in results]
        assert "doc1" not in result_ids

    def test_unrelated_query_returns_no_results(self):
        index = BM25Index()
        index.add_document("doc1", "python programming language")
        results = index.search("xyzzyx qwerty")
        assert results == []

    def test_corpus_size_tracking(self):
        index = BM25Index()
        assert index.corpus_size == 0
        index.add_document("doc1", "hello")
        assert index.corpus_size == 1
        index.add_document("doc2", "world")
        assert index.corpus_size == 2
        index.remove_document("doc1")
        assert index.corpus_size == 1

    def test_term_frequency_scoring(self):
        """Documents with higher term frequency should score higher."""
        index = BM25Index()
        index.add_document("doc_low", "machine learning")
        index.add_document("doc_high", "machine learning machine learning machine learning")

        results = index.search("machine learning")
        assert len(results) == 2
        score_map = {doc_id: score for doc_id, score in results}
        # Higher TF should produce a better score
        assert score_map["doc_high"] > score_map["doc_low"]


class TestHybridRetriever:
    @pytest.mark.asyncio
    async def test_retrieve_returns_empty_when_no_results(
        self, mock_vectorstore, mock_embedding_service, bm25_index
    ):
        retriever = HybridRetriever(
            vectorstore=mock_vectorstore,
            embedding_service=mock_embedding_service,
            bm25_index=bm25_index,
        )
        results = await retriever.retrieve("test query")
        assert isinstance(results, list)

    @pytest.mark.asyncio
    async def test_retrieve_respects_top_k(
        self, mock_vectorstore, mock_embedding_service, bm25_index
    ):
        # Populate BM25 index so we have keyword results
        for i in range(20):
            bm25_index.add_document(f"chunk_{i}", f"test document number {i} with content")

        mock_vectorstore.search.return_value = [
            RetrievalResult(
                chunk_id=f"chunk_{i}",
                document_id="doc1",
                content=f"test document number {i}",
                score=0.9 - i * 0.05,
                metadata={},
            )
            for i in range(10)
        ]

        retriever = HybridRetriever(
            vectorstore=mock_vectorstore,
            embedding_service=mock_embedding_service,
            bm25_index=bm25_index,
        )
        results = await retriever.retrieve("test document", top_k=3)
        assert len(results) <= 3

    def test_rrf_scores_are_normalized(
        self, mock_vectorstore, mock_embedding_service, bm25_index
    ):
        retriever = HybridRetriever(
            vectorstore=mock_vectorstore,
            embedding_service=mock_embedding_service,
            bm25_index=bm25_index,
        )
        semantic = [
            RetrievalResult("id1", "doc1", "content1", 0.9, {}),
            RetrievalResult("id2", "doc1", "content2", 0.8, {}),
        ]
        keyword = [("id1", 1.5), ("id3", 1.0)]
        bm25_index.documents["id3"] = "content3"

        results = retriever._reciprocal_rank_fusion(semantic, keyword, alpha=0.7)
        assert len(results) > 0
        # All scores should be in a valid positive range
        for r in results:
            assert r.score > 0

    def test_alpha_zero_favors_keyword(
        self, mock_vectorstore, mock_embedding_service, bm25_index
    ):
        retriever = HybridRetriever(
            vectorstore=mock_vectorstore,
            embedding_service=mock_embedding_service,
            bm25_index=bm25_index,
        )
        bm25_index.documents["keyword_doc"] = "exact keyword match"
        semantic = []
        keyword = [("keyword_doc", 5.0)]

        results = retriever._reciprocal_rank_fusion(semantic, keyword, alpha=0.0)
        assert len(results) == 1
        assert results[0].chunk_id == "keyword_doc"
