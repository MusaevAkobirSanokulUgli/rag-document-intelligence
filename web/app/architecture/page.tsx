'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ArchitectureDiagram from '@/components/ArchitectureDiagram'
import CodeBlock from '@/components/CodeBlock'
import { Database, ChevronRight } from 'lucide-react'

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

const DESIGN_DECISIONS = [
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
]

const CODE_SECTIONS = [
  {
    num: '01',
    title: 'FastAPI Lifespan — Resource Management',
    desc: 'All services are initialized once at startup using the async lifespan context manager (FastAPI 0.93+ pattern). This avoids global state and ensures graceful shutdown of resources.',
    file: 'app/main.py',
    code: LIFESPAN_CODE,
    lang: 'python',
  },
  {
    num: '02',
    title: 'Hybrid Retrieval — Concurrent Search + RRF',
    desc: 'Semantic and keyword search run in parallel via asyncio.gather. asyncio.to_thread wraps the synchronous BM25 search to keep the event loop free.',
    file: 'app/services/retriever.py',
    code: RETRIEVER_CODE,
    lang: 'python',
  },
  {
    num: '03',
    title: 'Async Ingestion Pipeline — Concurrent + Rate Limited',
    desc: 'Documents are chunked, embedded in batches of 100, and indexed into both the vector store and BM25 in a single pipeline. A semaphore limits concurrency to prevent API rate limit violations.',
    file: 'app/services/ingestion.py',
    code: INGESTION_CODE,
    lang: 'python',
  },
  {
    num: '04',
    title: 'Pydantic v2 — Validation + Configuration',
    desc: 'Every request and response is validated with Pydantic v2 models using ConfigDict, field_validator, and constraint fields. Settings use BaseSettings with env_prefix for 12-factor config management.',
    file: 'app/models/schemas.py',
    code: PYDANTIC_CODE,
    lang: 'python',
  },
  {
    num: '05',
    title: 'SSE Streaming — Real-Time Token Delivery',
    desc: 'The chat endpoint supports Server-Sent Events streaming. Tokens are JSON-encoded to safely handle special characters, with a [DONE] sentinel and error recovery.',
    file: 'app/api/routes/chat.py',
    code: STREAMING_CODE,
    lang: 'python',
  },
]

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-[#020617] grid-bg">
      <Header />

      <main className="pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto">

          {/* Page header */}
          <div className="pt-6 pb-10">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-cyan-500/60" />
              <span className="text-xs font-mono text-cyan-500/50 uppercase tracking-widest">
                System Design
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="gradient-text">System Architecture</span>
            </h1>
            <p className="text-slate-500 max-w-2xl text-sm">
              A deep dive into every design decision — from async lifespan management
              to Reciprocal Rank Fusion. Every component is production-grade.
            </p>
          </div>

          {/* Full architecture diagram */}
          <ArchitectureDiagram compact={false} />

          {/* Code sections */}
          <div className="mt-16 space-y-14">
            {CODE_SECTIONS.map((section) => (
              <div key={section.num}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/8 border border-cyan-500/20
                                  flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold font-mono text-cyan-400">{section.num}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-100 mb-1">
                      {section.title}
                    </h2>
                    <p className="text-slate-500 text-sm">{section.desc}</p>
                  </div>
                </div>
                <CodeBlock title={section.file} language={section.lang} code={section.code} />
              </div>
            ))}
          </div>

          {/* Design decisions */}
          <div className="mt-16">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-cyan-500/50 uppercase tracking-widest">
                Engineering Decisions
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-6 text-slate-100">Key Design Decisions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DESIGN_DECISIONS.map(({ title, desc }) => (
                <div
                  key={title}
                  className="glass-card rounded-xl p-5 border border-cyan-500/8
                             hover:border-cyan-500/20 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-2.5">
                    <ChevronRight className="w-3.5 h-3.5 text-cyan-500/50 flex-shrink-0 mt-0.5
                                            group-hover:text-cyan-400 transition-colors" />
                    <div>
                      <div className="font-semibold text-cyan-400/80 mb-1.5 text-sm">{title}</div>
                      <div className="text-xs text-slate-500 leading-relaxed">{desc}</div>
                    </div>
                  </div>
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
