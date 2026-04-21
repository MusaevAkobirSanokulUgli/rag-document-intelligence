import asyncio
import logging
from uuid import UUID, uuid4
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request, Query

from app.models.schemas import (
    DocumentResponse,
    DocumentStatus,
    ChunkingStrategy,
)
from app.services.ingestion import IngestionPipeline
from app.utils.text_processing import TextExtractor, TextCleaner

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents")

# In-memory document registry (production: swap for a database)
_documents: dict[UUID, DocumentResponse] = {}

ALLOWED_CONTENT_TYPES = {
    "text/plain",
    "text/markdown",
    "text/html",
    "application/pdf",
    "application/json",
    "application/octet-stream",
}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(..., min_length=1, max_length=200),
    description: str = Form(None),
    chunking_strategy: ChunkingStrategy = Form(ChunkingStrategy.RECURSIVE),
) -> DocumentResponse:
    """
    Upload and asynchronously index a document.

    Supported formats: TXT, MD, PDF, HTML, JSON.
    Returns immediately with status=pending; indexing runs in the background.
    Poll GET /documents/{id} to track progress.
    """
    content = await file.read()

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 50 MB)")

    filename = file.filename or "document.txt"
    text = await TextExtractor.extract(content, filename)
    text = TextCleaner.clean(text)

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="No extractable text found in the uploaded document",
        )

    doc_id = uuid4()
    doc = DocumentResponse(
        id=doc_id,
        title=title,
        status=DocumentStatus.PENDING,
        created_at=datetime.now(timezone.utc),
        metadata={
            "filename": filename,
            "description": description or "",
            "chunking_strategy": chunking_strategy.value,
            "content_length": str(len(text)),
        },
    )
    _documents[doc_id] = doc

    bm25_index = getattr(request.app.state, "bm25_index", None)
    pipeline = IngestionPipeline(
        embedding_service=request.app.state.embedding_service,
        vectorstore=request.app.state.vectorstore,
        bm25_index=bm25_index,
    )

    # Fire-and-forget background ingestion
    asyncio.create_task(
        _process_document(pipeline, doc_id, text, chunking_strategy),
        name=f"ingest-{doc_id}",
    )

    logger.info(f"Document upload accepted: id={doc_id}, title={title!r}")
    return doc


async def _process_document(
    pipeline: IngestionPipeline,
    doc_id: UUID,
    text: str,
    strategy: ChunkingStrategy,
) -> None:
    """Background task: run ingestion pipeline and update document status."""
    if doc_id in _documents:
        _documents[doc_id].status = DocumentStatus.PROCESSING

    try:
        result = await pipeline.ingest_document(doc_id, text, strategy)
        if doc_id in _documents:
            _documents[doc_id].status = DocumentStatus.INDEXED
            _documents[doc_id].chunk_count = result["chunk_count"]
    except Exception as e:
        logger.error(f"Background ingestion failed for {doc_id}: {e}", exc_info=True)
        if doc_id in _documents:
            _documents[doc_id].status = DocumentStatus.FAILED


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: DocumentStatus | None = Query(None),
) -> list[DocumentResponse]:
    """
    List all documents with optional status filtering and pagination.
    """
    docs = list(_documents.values())
    if status is not None:
        docs = [d for d in docs if d.status == status]
    return docs[skip : skip + limit]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: UUID) -> DocumentResponse:
    """Retrieve a document's metadata and current indexing status."""
    if document_id not in _documents:
        raise HTTPException(status_code=404, detail="Document not found")
    return _documents[document_id]


@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: UUID, request: Request) -> None:
    """
    Delete a document and all its indexed chunks from the vector store.
    """
    if document_id not in _documents:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        await request.app.state.vectorstore.delete_document(str(document_id))
    except Exception as e:
        logger.error(f"Failed to delete chunks for {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove document from vector store")

    del _documents[document_id]
    logger.info(f"Document {document_id} deleted")
