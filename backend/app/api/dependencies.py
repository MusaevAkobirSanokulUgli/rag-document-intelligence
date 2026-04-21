from fastapi import Request, HTTPException

from app.services.embeddings import EmbeddingService
from app.services.vectorstore import VectorStoreService
from app.services.retriever import HybridRetriever
from app.services.rag_chain import RAGChain


def get_embedding_service(request: Request) -> EmbeddingService:
    """Dependency: return the shared EmbeddingService from application state."""
    service = getattr(request.app.state, "embedding_service", None)
    if service is None:
        raise HTTPException(status_code=503, detail="Embedding service not initialized")
    return service


def get_vectorstore(request: Request) -> VectorStoreService:
    """Dependency: return the shared VectorStoreService from application state."""
    vectorstore = getattr(request.app.state, "vectorstore", None)
    if vectorstore is None:
        raise HTTPException(status_code=503, detail="Vector store not initialized")
    return vectorstore


def get_retriever(request: Request) -> HybridRetriever:
    """Dependency: return the shared HybridRetriever from application state."""
    retriever = getattr(request.app.state, "retriever", None)
    if retriever is None:
        raise HTTPException(status_code=503, detail="Retriever not initialized")
    return retriever


def get_rag_chain(request: Request) -> RAGChain:
    """Dependency: return the shared RAGChain from application state."""
    rag_chain = getattr(request.app.state, "rag_chain", None)
    if rag_chain is None:
        raise HTTPException(status_code=503, detail="RAG chain not initialized")
    return rag_chain
