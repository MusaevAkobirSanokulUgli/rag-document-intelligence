import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock

from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.embeddings import EmbeddingService
from app.services.vectorstore import VectorStoreService
from app.services.retriever import BM25Index, HybridRetriever
from app.services.rag_chain import RAGChain


@pytest.fixture(scope="session")
def event_loop():
    """Provide a session-scoped event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_embedding_service():
    """Return a mock EmbeddingService that produces deterministic 4-dim embeddings."""
    service = AsyncMock(spec=EmbeddingService)
    service.embed_documents.return_value = [[0.1, 0.2, 0.3, 0.4]]
    service.embed_query.return_value = [0.1, 0.2, 0.3, 0.4]
    return service


@pytest.fixture
def mock_vectorstore():
    """Return a mock VectorStoreService with no-op operations."""
    vs = AsyncMock(spec=VectorStoreService)
    vs.add_documents.return_value = None
    vs.search.return_value = []
    vs.get_by_document_id.return_value = []
    vs.delete_document.return_value = None
    vs.count.return_value = 0
    vs.close.return_value = None
    return vs


@pytest.fixture
def bm25_index():
    """Return a fresh BM25Index for testing."""
    return BM25Index()


@pytest.fixture
def mock_retriever(mock_vectorstore, mock_embedding_service, bm25_index):
    """Return a HybridRetriever using mock dependencies."""
    return HybridRetriever(
        vectorstore=mock_vectorstore,
        embedding_service=mock_embedding_service,
        bm25_index=bm25_index,
    )


@pytest.fixture
async def client(mock_embedding_service, mock_vectorstore, mock_retriever):
    """
    Provide an async test client with mocked application state.
    Bypasses real ChromaDB and OpenAI calls.
    """
    app.state.embedding_service = mock_embedding_service
    app.state.vectorstore = mock_vectorstore
    app.state.bm25_index = BM25Index()
    app.state.retriever = mock_retriever
    app.state.rag_chain = MagicMock()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
