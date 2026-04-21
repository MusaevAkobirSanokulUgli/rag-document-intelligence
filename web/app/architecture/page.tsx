'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ArchitectureDiagram from '@/components/ArchitectureDiagram'
import CodeBlock from '@/components/CodeBlock'

const LIFESPAN_CODE = `@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize all services at startup
    app.state.embedding_service = EmbeddingService()
    app.state.vectorstore = await VectorStoreService.initialize()
    app.state.bm25_index = BM25Index()
    app.state.retriever = HybridRetriever(
        vectorstore=app.state.vectorstore,
        embedding_service=app.state.embedding_service,
        bm25_index=app.state.bm25_index,
    )
    app.state.rag_chain = RAGChain(retriever=app.state.retriever)
    yield
    await app.state.vectorstore.close()  # Graceful shutdown`

const RETRIEVER_CODE = `class HybridRetriever:
    async def retrieve(
        self, query: str, top_k: int = 5, alpha: float = 0.7
    ) -> list[RetrievalResult]:
        # Run semantic + keyword search concurrently
        semantic_task = self._semantic_search(query, top_k * 2, filters)
        keyword_task = asyncio.to_thread(self.bm25_index.search, query, top_k * 2)

        semantic_results, keyword_results = await asyncio.gather(
            semantic_task, keyword_task
        )

        # Fuse with Reciprocal Rank Fusion
        fused = self._reciprocal_rank_fusion(
            semantic_results, keyword_results, alpha=alpha
        )
        return fused[:top_k]`

const INGESTION_CODE = `class IngestionPipeline:
    async def ingest_document(
        self, document_id: UUID, content: str, strategy: ChunkingStrategy
    ) -> dict:
        async with self._semaphore:  # Max 5 concurrent ingestions
            # Stage 1: Smart chunking
            chunks = TextChunker(strategy=strategy).chunk(content)

            # Stage 2: Batch embedding (100 texts per API call)
            embeddings = await self.embedding_service.embed_documents(
                [c.text for c in chunks]
            )

            # Stage 3: Index into vector store + BM25
            await self.vectorstore.add_documents(
                ids=chunk_ids, embeddings=embeddings,
                documents=texts, metadatas=metadatas
            )
            if self.bm25_index:
                for chunk_id, text in zip(chunk_ids, texts):
                    self.bm25_index.add_document(chunk_id, text)`

const PYDANTIC_CODE = `class SearchQuery(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    top_k: int = Field(default=5, ge=1, le=50)
    hybrid_alpha: float = Field(default=0.7, ge=0.0, le=1.0)
    filters: dict[str, str] = Field(default_factory=dict)

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Query cannot be empty or whitespace")
        return v.strip()

class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_prefix": "RAG_"}
    openai_api_key: str = ""
    llm_model: str = "gpt-4o"
    hybrid_alpha: float = 0.7`

const STREAMING_CODE = `# Streaming response via Server-Sent Events
@router.post("/chat/")
async def chat(chat_request: ChatRequest, request: Request):
    if chat_request.stream:
        return StreamingResponse(
            _stream_response(rag_chain, chat_request, history),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

async def _stream_response(rag_chain, request, history):
    async for token in rag_chain.stream(
        question=request.message,
        conversation_history=history,
        top_k=request.top_k,
    ):
        yield f"data: {json.dumps(token)}\\n\\n"
    yield "data: [DONE]\\n\\n"`

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen grid-bg">
      <Header />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">System Architecture</span>
            </h1>
            <p className="text-slate-400 max-w-2xl mx-auto">
              A deep dive into every design decision — from async lifespan management
              to Reciprocal Rank Fusion.
            </p>
          </div>

          {/* Full architecture diagram */}
          <ArchitectureDiagram compact={false} />

          {/* Component deep dives */}
          <div className="mt-16 space-y-12">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-slate-100">
                1. FastAPI Lifespan — Resource Management
              </h2>
              <p className="text-slate-400 mb-4">
                All services are initialized once at startup using the async lifespan context
                manager (FastAPI 0.93+ pattern). This avoids global state and ensures graceful
                shutdown of resources.
              </p>
              <CodeBlock title="app/main.py" language="python" code={LIFESPAN_CODE} />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2 text-slate-100">
                2. Hybrid Retrieval — Concurrent Search + RRF
              </h2>
              <p className="text-slate-400 mb-4">
                Semantic and keyword search run in parallel via asyncio.gather.
                asyncio.to_thread wraps the synchronous BM25 search to keep the event loop free.
              </p>
              <CodeBlock title="app/services/retriever.py" language="python" code={RETRIEVER_CODE} />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2 text-slate-100">
                3. Async Ingestion Pipeline — Concurrent + Rate Limited
              </h2>
              <p className="text-slate-400 mb-4">
                Documents are chunked, embedded in batches of 100, and indexed into both the
                vector store and BM25 in a single pipeline. A semaphore limits concurrency to
                prevent API rate limit violations.
              </p>
              <CodeBlock title="app/services/ingestion.py" language="python" code={INGESTION_CODE} />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2 text-slate-100">
                4. Pydantic v2 — Validation + Configuration
              </h2>
              <p className="text-slate-400 mb-4">
                Every request and response is validated with Pydantic v2 models using ConfigDict,
                field_validator, and constraint fields. Settings use BaseSettings with env_prefix
                for 12-factor config management.
              </p>
              <CodeBlock title="app/models/schemas.py + config.py" language="python" code={PYDANTIC_CODE} />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2 text-slate-100">
                5. SSE Streaming — Real-Time Token Delivery
              </h2>
              <p className="text-slate-400 mb-4">
                The chat endpoint supports Server-Sent Events streaming. Tokens are JSON-encoded
                to safely handle special characters, with a [DONE] sentinel and error recovery.
              </p>
              <CodeBlock title="app/api/routes/chat.py" language="python" code={STREAMING_CODE} />
            </div>
          </div>

          {/* Design decisions */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6 text-slate-100">Key Design Decisions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: 'Protocol for EmbeddingProvider',
                  desc: 'Structural subtyping via Protocol enables swapping OpenAI for local sentence-transformers without modifying call sites.',
                },
                {
                  title: 'EphemeralClient Fallback',
                  desc: 'VectorStoreService.initialize() catches connection errors and falls back to an in-memory ChromaDB client, making tests and CI work without Docker.',
                },
                {
                  title: 'Fire-and-Forget Ingestion',
                  desc: 'asyncio.create_task() immediately returns the document record with status=pending. Clients poll GET /documents/{id} for completion.',
                },
                {
                  title: 'Metadata as str dict',
                  desc: 'ChromaDB requires all metadata values to be strings. Explicit str() conversion prevents runtime errors for numeric chunk indices.',
                },
                {
                  title: 'BM25 Concurrent with Semantic',
                  desc: 'asyncio.to_thread wraps the synchronous BM25 search so it runs concurrently with the async vector store query via asyncio.gather.',
                },
                {
                  title: 'Semaphore Rate Limiting',
                  desc: 'A single asyncio.Semaphore(10) on the embedding client prevents overwhelming the OpenAI tokens-per-minute limit during batch ingestion.',
                },
              ].map(({ title, desc }) => (
                <div key={title} className="glass rounded-xl p-5 border border-indigo-500/10">
                  <div className="font-semibold text-indigo-300 mb-2 text-sm">{title}</div>
                  <div className="text-sm text-slate-400">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
