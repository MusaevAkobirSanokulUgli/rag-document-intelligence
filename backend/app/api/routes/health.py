import time
from fastapi import APIRouter, Request

router = APIRouter()

_startup_time = time.time()


@router.get("/health")
async def health_check(request: Request):
    """
    Health check endpoint.

    Returns service status, uptime, and basic diagnostics.
    Used by load balancers and container orchestration for liveness probes.
    """
    uptime_seconds = round(time.time() - _startup_time, 1)

    # Check vector store connectivity
    vectorstore_status = "unavailable"
    chunk_count = 0
    try:
        vectorstore = getattr(request.app.state, "vectorstore", None)
        if vectorstore is not None:
            chunk_count = await vectorstore.count()
            vectorstore_status = "healthy"
    except Exception:
        vectorstore_status = "degraded"

    return {
        "status": "healthy",
        "service": "rag-document-intelligence",
        "version": "1.0.0",
        "uptime_seconds": uptime_seconds,
        "vectorstore": vectorstore_status,
        "indexed_chunks": chunk_count,
    }


@router.get("/health/ready")
async def readiness_check(request: Request):
    """
    Readiness probe — confirms the service is ready to accept traffic.
    Returns 503 if critical dependencies are unavailable.
    """
    from fastapi import HTTPException

    vectorstore = getattr(request.app.state, "vectorstore", None)
    embedding_service = getattr(request.app.state, "embedding_service", None)

    if vectorstore is None or embedding_service is None:
        raise HTTPException(status_code=503, detail="Service not fully initialized")

    return {"status": "ready"}
