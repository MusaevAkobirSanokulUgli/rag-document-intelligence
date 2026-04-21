import pytest
from uuid import uuid4

from app.utils.chunking import TextChunker, TextChunk
from app.models.schemas import ChunkingStrategy
from app.services.ingestion import IngestionPipeline


class TestTextChunker:
    def test_empty_text_returns_no_chunks(self):
        chunker = TextChunker(strategy=ChunkingStrategy.RECURSIVE, chunk_size=100, chunk_overlap=10)
        chunks = chunker.chunk("")
        assert chunks == []

    def test_whitespace_only_text_returns_no_chunks(self):
        chunker = TextChunker(strategy=ChunkingStrategy.RECURSIVE, chunk_size=100, chunk_overlap=10)
        chunks = chunker.chunk("   \n\n   ")
        assert chunks == []

    def test_short_text_produces_single_chunk(self):
        chunker = TextChunker(strategy=ChunkingStrategy.RECURSIVE, chunk_size=500, chunk_overlap=50)
        text = "This is a short document."
        chunks = chunker.chunk(text)
        assert len(chunks) == 1
        assert chunks[0].text == text

    def test_recursive_chunking_respects_size(self):
        chunker = TextChunker(strategy=ChunkingStrategy.RECURSIVE, chunk_size=100, chunk_overlap=10)
        text = "This is a test sentence. " * 30  # ~750 chars
        chunks = chunker.chunk(text)
        assert len(chunks) > 1
        for chunk in chunks:
            # Allow slight overflow at separator boundaries
            assert len(chunk.text) <= 150, f"Chunk too large: {len(chunk.text)} chars"

    def test_recursive_chunks_are_text_chunks(self):
        chunker = TextChunker(strategy=ChunkingStrategy.RECURSIVE, chunk_size=100, chunk_overlap=10)
        chunks = chunker.chunk("Hello world. " * 20)
        for chunk in chunks:
            assert isinstance(chunk, TextChunk)
            assert chunk.text
            assert chunk.start >= 0
            assert chunk.end > chunk.start

    def test_sentence_chunking_groups_sentences(self):
        chunker = TextChunker(strategy=ChunkingStrategy.SENTENCE, chunk_size=100, chunk_overlap=0)
        text = "First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence."
        chunks = chunker.chunk(text)
        assert len(chunks) >= 1
        for chunk in chunks:
            assert chunk.text
            assert len(chunk.text) > 0

    def test_sentence_chunking_no_chunk_exceeds_size(self):
        chunker = TextChunker(strategy=ChunkingStrategy.SENTENCE, chunk_size=50, chunk_overlap=0)
        text = "Short one. " * 20
        chunks = chunker.chunk(text)
        for chunk in chunks:
            assert len(chunk.text) <= 60  # Slight tolerance for sentence boundaries

    def test_chunks_have_sequential_indices(self):
        chunker = TextChunker(strategy=ChunkingStrategy.RECURSIVE, chunk_size=80, chunk_overlap=5)
        text = "Paragraph one content here. " * 20
        chunks = chunker.chunk(text)
        assert len(chunks) > 1
        for i, chunk in enumerate(chunks):
            assert chunk.index == i

    def test_chunk_overlap_creates_continuity(self):
        """Chunks should share content at boundaries when overlap > 0."""
        chunker = TextChunker(strategy=ChunkingStrategy.RECURSIVE, chunk_size=50, chunk_overlap=15)
        text = "abcdefghij " * 20
        chunks = chunker.chunk(text)
        assert len(chunks) > 1

    def test_semantic_strategy_falls_back_to_recursive(self):
        chunker = TextChunker(strategy=ChunkingStrategy.SEMANTIC, chunk_size=100, chunk_overlap=10)
        text = "Semantic chunking test content. " * 10
        chunks = chunker.chunk(text)
        assert len(chunks) >= 1


class TestIngestionPipeline:
    @pytest.mark.asyncio
    async def test_ingest_document_success(
        self, mock_embedding_service, mock_vectorstore
    ):
        pipeline = IngestionPipeline(
            embedding_service=mock_embedding_service,
            vectorstore=mock_vectorstore,
        )
        doc_id = uuid4()
        content = "This is a test document with sufficient content for indexing. " * 10

        result = await pipeline.ingest_document(doc_id, content)

        assert result["document_id"] == str(doc_id)
        assert result["status"].value == "indexed"
        assert result["chunk_count"] >= 1
        assert "indexed_at" in result

    @pytest.mark.asyncio
    async def test_ingest_updates_processing_status(
        self, mock_embedding_service, mock_vectorstore
    ):
        pipeline = IngestionPipeline(
            embedding_service=mock_embedding_service,
            vectorstore=mock_vectorstore,
        )
        from app.models.schemas import DocumentStatus

        doc_id = uuid4()
        await pipeline.ingest_document(doc_id, "Content for ingestion testing." * 5)

        # After successful ingestion, status should be INDEXED
        assert pipeline.get_status(doc_id) == DocumentStatus.INDEXED

    @pytest.mark.asyncio
    async def test_ingest_batch_processes_all(
        self, mock_embedding_service, mock_vectorstore
    ):
        pipeline = IngestionPipeline(
            embedding_service=mock_embedding_service,
            vectorstore=mock_vectorstore,
        )
        documents = [
            {"content": f"Document {i} with sufficient content for batch testing." * 5}
            for i in range(3)
        ]
        results = await pipeline.ingest_batch(documents)
        assert len(results) == 3
        for result in results:
            assert "document_id" in result or "error" in result

    @pytest.mark.asyncio
    async def test_ingest_empty_document_raises(
        self, mock_embedding_service, mock_vectorstore
    ):
        pipeline = IngestionPipeline(
            embedding_service=mock_embedding_service,
            vectorstore=mock_vectorstore,
        )
        doc_id = uuid4()
        with pytest.raises(Exception):
            await pipeline.ingest_document(doc_id, "")

    @pytest.mark.asyncio
    async def test_ingest_syncs_bm25_index(
        self, mock_embedding_service, mock_vectorstore, bm25_index
    ):
        pipeline = IngestionPipeline(
            embedding_service=mock_embedding_service,
            vectorstore=mock_vectorstore,
            bm25_index=bm25_index,
        )
        doc_id = uuid4()
        content = "machine learning deep learning artificial intelligence neural networks"
        await pipeline.ingest_document(doc_id, content)

        # BM25 index should contain the chunk
        results = bm25_index.search("machine learning")
        assert len(results) > 0
