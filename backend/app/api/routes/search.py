import time
import logging
from uuid import UUID

from fastapi import APIRouter, Request, HTTPException

from app.models.schemas import SearchQuery, SearchResponse, SearchResult

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search")


@router.post("/", response_model=SearchResponse)
async def search_documents(query: SearchQuery, request: Request) -> SearchResponse:
    """
    Perform hybrid semantic + BM25 search over indexed documents.

    The hybrid_alpha parameter controls the blend:
    - alpha=1.0 → pure semantic search
    - alpha=0.0 → pure keyword (BM25) search
    - alpha=0.7 → 70% semantic, 30% keyword (recommended default)

    Results are fused using Reciprocal Rank Fusion (RRF) and sorted by score.
    """
    retriever = getattr(request.app.state, "retriever", None)
    if retriever is None:
        raise HTTPException(status_code=503, detail="Retriever service not available")

    start = time.perf_counter()

    results = await retriever.retrieve(
        query=query.query,
        top_k=query.top_k,
        alpha=query.hybrid_alpha,
        filters=query.filters or None,
    )

    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        f"Search completed: query={query.query!r}, results={len(results)}, "
        f"elapsed={elapsed_ms:.1f}ms"
    )

    return SearchResponse(
        query=query.query,
        results=[
            SearchResult(
                chunk_id=r.chunk_id,
                document_id=r.document_id,
                content=r.content,
                score=r.score,
                metadata={k: str(v) for k, v in (r.metadata or {}).items()},
            )
            for r in results
        ],
        total_results=len(results),
        search_time_ms=round(elapsed_ms, 2),
    )


@router.get("/document/{document_id}", response_model=SearchResponse)
async def get_document_chunks(
    document_id: UUID,
    request: Request,
) -> SearchResponse:
    """
    Retrieve all indexed chunks for a specific document.
    Useful for inspecting how a document was chunked and indexed.
    """
    vectorstore = getattr(request.app.state, "vectorstore", None)
    if vectorstore is None:
        raise HTTPException(status_code=503, detail="Vector store not available")

    start = time.perf_counter()
    chunks = await vectorstore.get_by_document_id(str(document_id))
    elapsed_ms = (time.perf_counter() - start) * 1000

    return SearchResponse(
        query=f"document:{document_id}",
        results=[
            SearchResult(
                chunk_id=c.chunk_id,
                document_id=c.document_id,
                content=c.content,
                score=c.score,
                metadata={k: str(v) for k, v in (c.metadata or {}).items()},
            )
            for c in chunks
        ],
        total_results=len(chunks),
        search_time_ms=round(elapsed_ms, 2),
    )
