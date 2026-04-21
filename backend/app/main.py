from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import documents, search, chat, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize vector store and embedding model
    from app.services.vectorstore import VectorStoreService
    from app.services.embeddings import EmbeddingService
    from app.services.retriever import BM25Index, HybridRetriever
    from app.services.rag_chain import RAGChain

    app.state.embedding_service = EmbeddingService()
    app.state.vectorstore = await VectorStoreService.initialize()

    # Initialize BM25 index and hybrid retriever
    app.state.bm25_index = BM25Index()
    app.state.retriever = HybridRetriever(
        vectorstore=app.state.vectorstore,
        embedding_service=app.state.embedding_service,
        bm25_index=app.state.bm25_index,
    )

    # Initialize RAG chain
    app.state.rag_chain = RAGChain(retriever=app.state.retriever)

    yield

    # Cleanup
    await app.state.vectorstore.close()


app = FastAPI(
    title="RAG Document Intelligence",
    description=(
        "Production-grade RAG pipeline with hybrid search and "
        "multi-modal document processing"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(documents.router, prefix="/api/v1", tags=["documents"])
app.include_router(search.router, prefix="/api/v1", tags=["search"])
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
