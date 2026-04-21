import json
import logging

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest, ChatResponse, SearchResult

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat")


@router.post("/", response_model=ChatResponse)
async def chat(chat_request: ChatRequest, request: Request):
    """
    Chat with your documents using RAG-powered question answering.

    Set stream=true in the request body to receive Server-Sent Events (SSE)
    for real-time token streaming.

    The endpoint retrieves relevant document chunks via hybrid search,
    then generates a grounded answer with [Source N] citations.
    """
    rag_chain = getattr(request.app.state, "rag_chain", None)
    if rag_chain is None:
        raise HTTPException(status_code=503, detail="RAG chain not available")

    history = [
        {"role": m.role, "content": m.content}
        for m in chat_request.conversation_history
    ]

    if chat_request.stream:
        return StreamingResponse(
            _stream_response(rag_chain, chat_request, history),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    result = await rag_chain.query(
        question=chat_request.message,
        conversation_history=history,
        top_k=chat_request.top_k,
    )

    return ChatResponse(
        answer=result["answer"],
        sources=[
            SearchResult(
                chunk_id=r.chunk_id,
                document_id=r.document_id,
                content=r.content,
                score=r.score,
                metadata={k: str(v) for k, v in (r.metadata or {}).items()},
            )
            for r in result["sources"]
        ],
        tokens_used=result.get("tokens_used"),
    )


async def _stream_response(rag_chain, chat_request: ChatRequest, history: list[dict]):
    """
    SSE generator for streaming chat responses.

    Yields:
        data: <token>\\n\\n for each token
        data: [DONE]\\n\\n as the final sentinel
    """
    try:
        async for token in rag_chain.stream(
            question=chat_request.message,
            conversation_history=history,
            top_k=chat_request.top_k,
        ):
            # Escape the token as JSON to handle special characters safely
            yield f"data: {json.dumps(token)}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        logger.error(f"Streaming error: {e}", exc_info=True)
        error_payload = json.dumps({"error": str(e)})
        yield f"data: {error_payload}\n\n"
        yield "data: [DONE]\n\n"
