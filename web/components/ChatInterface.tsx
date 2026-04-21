'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, FileText, Search, Zap, RefreshCw } from 'lucide-react'

interface Source {
  chunk_id: string
  document_id: string
  content: string
  score: number
  document_title: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  isStreaming?: boolean
  search_time_ms?: number
}

// Simulated knowledge base — realistic RAG content
const KNOWLEDGE_BASE: Array<{ id: string; title: string; chunks: Array<{ id: string; content: string; keywords: string[] }> }> = [
  {
    id: 'doc-rag-001',
    title: 'RAG System Design',
    chunks: [
      {
        id: 'chunk-001',
        keywords: ['rag', 'retrieval', 'augmented', 'generation', 'pipeline', 'hybrid'],
        content:
          'Retrieval-Augmented Generation (RAG) combines the strengths of retrieval-based and generation-based approaches. The system first retrieves relevant document chunks using hybrid search (semantic + keyword), then passes them as context to an LLM for grounded answer generation. This prevents hallucinations by anchoring responses to real document content.',
      },
      {
        id: 'chunk-002',
        keywords: ['hybrid', 'search', 'bm25', 'semantic', 'vector', 'fusion', 'rrf'],
        content:
          'Hybrid search combines semantic vector similarity with BM25 keyword scoring. Semantic search uses dense embeddings to capture meaning, while BM25 handles exact terminology and rare proper nouns. Reciprocal Rank Fusion (RRF) merges both ranked lists: score = α × 1/(k+rank_semantic) + (1-α) × 1/(k+rank_bm25). An alpha of 0.7 typically outperforms either method alone.',
      },
    ],
  },
  {
    id: 'doc-fastapi-002',
    title: 'FastAPI Architecture Guide',
    chunks: [
      {
        id: 'chunk-003',
        keywords: ['fastapi', 'async', 'lifespan', 'context', 'startup', 'shutdown'],
        content:
          'FastAPI uses an async lifespan context manager for resource management. Services like ChromaDB connections and embedding models are initialized once at startup and stored in app.state. This avoids global variables and ensures graceful shutdown. The pattern uses asynccontextmanager from contextlib, yielding after initialization and cleaning up in the finally block.',
      },
      {
        id: 'chunk-004',
        keywords: ['pydantic', 'validation', 'models', 'basemodel', 'field', 'validator'],
        content:
          'Pydantic v2 provides runtime validation via BaseModel subclasses. ConfigDict(str_strip_whitespace=True) auto-strips strings. field_validator decorators add custom validation logic. BaseSettings with env_prefix enables 12-factor configuration from environment variables. The model_config dict replaces the old Config class in v2.',
      },
    ],
  },
  {
    id: 'doc-vectordb-003',
    title: 'Vector Database Internals',
    chunks: [
      {
        id: 'chunk-005',
        keywords: ['chromadb', 'vector', 'hnsw', 'cosine', 'similarity', 'embedding', 'index'],
        content:
          'ChromaDB uses Hierarchical Navigable Small World (HNSW) graphs for approximate nearest neighbor search. With cosine similarity space, distances are converted to similarity scores (1 - distance). The collection is initialized with metadata {"hnsw:space": "cosine"}. ChromaDB supports both persistent HTTP client mode and ephemeral in-memory mode for testing.',
      },
      {
        id: 'chunk-006',
        keywords: ['embedding', 'openai', 'text-embedding', 'dimensions', 'batch', 'rate'],
        content:
          'OpenAI text-embedding-3-small produces 1536-dimensional vectors at low cost. Batch embedding sends up to 100 texts per API call to minimize latency. An asyncio.Semaphore(10) prevents token-per-minute rate limit violations. The EmbeddingProvider Protocol allows hot-swapping to local sentence-transformers without code changes.',
      },
    ],
  },
  {
    id: 'doc-async-004',
    title: 'Python Async Patterns',
    chunks: [
      {
        id: 'chunk-007',
        keywords: ['asyncio', 'async', 'await', 'gather', 'semaphore', 'concurrent', 'task'],
        content:
          'asyncio.gather() runs coroutines concurrently — in the hybrid retriever, semantic and BM25 search run in parallel, halving latency. asyncio.to_thread() wraps synchronous functions (like BM25 search and ChromaDB calls) to run them in a thread pool without blocking the event loop. asyncio.Semaphore(n) limits concurrency to prevent resource exhaustion.',
      },
      {
        id: 'chunk-008',
        keywords: ['streaming', 'sse', 'server-sent', 'events', 'generator', 'async'],
        content:
          'Server-Sent Events (SSE) enable real-time token streaming. FastAPI returns StreamingResponse with media_type="text/event-stream". An async generator yields "data: {token}\\n\\n" for each token, with "data: [DONE]\\n\\n" as sentinel. Tokens are JSON-encoded to handle special characters safely. Cache-Control: no-cache prevents buffering.',
      },
    ],
  },
]

// Simulate hybrid search scoring
function hybridSearch(query: string, topK: number = 3): Source[] {
  const queryTokens = query.toLowerCase().split(/\s+/)
  const scores: Array<{ source: Source; semScore: number; bm25Score: number }> = []

  for (const doc of KNOWLEDGE_BASE) {
    for (const chunk of doc.chunks) {
      // BM25-like keyword score
      const matchCount = queryTokens.filter(
        (t) =>
          chunk.keywords.some((k) => k.includes(t) || t.includes(k)) ||
          chunk.content.toLowerCase().includes(t)
      ).length
      const bm25Score = matchCount / (queryTokens.length + 1)

      // Semantic score (cosine sim approximation based on keyword overlap)
      const semanticScore =
        chunk.keywords.filter((k) =>
          queryTokens.some((t) => k.includes(t) || t.includes(k) || editDistance(k, t) <= 2)
        ).length / chunk.keywords.length

      scores.push({
        source: {
          chunk_id: chunk.id,
          document_id: doc.id,
          document_title: doc.title,
          content: chunk.content,
          score: 0,
        },
        semScore: semanticScore,
        bm25Score,
      })
    }
  }

  // RRF fusion
  const sorted = scores.sort((a, b) => b.semScore - a.semScore)
  const bm25Sorted = [...scores].sort((a, b) => b.bm25Score - a.bm25Score)

  const alpha = 0.7
  const k = 60
  const rfScores = new Map<string, number>()

  sorted.forEach((item, rank) => {
    const prev = rfScores.get(item.source.chunk_id) || 0
    rfScores.set(item.source.chunk_id, prev + alpha * (1 / (k + rank + 1)))
  })
  bm25Sorted.forEach((item, rank) => {
    const prev = rfScores.get(item.source.chunk_id) || 0
    rfScores.set(item.source.chunk_id, prev + (1 - alpha) * (1 / (k + rank + 1)))
  })

  return scores
    .sort(
      (a, b) =>
        (rfScores.get(b.source.chunk_id) || 0) - (rfScores.get(a.source.chunk_id) || 0)
    )
    .slice(0, topK)
    .filter((s) => rfScores.get(s.source.chunk_id)! > 0.001)
    .map((s) => ({
      ...s.source,
      score: parseFloat((rfScores.get(s.source.chunk_id) || 0).toFixed(4)),
    }))
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[a.length][b.length]
}

// Generate realistic RAG response
function generateAnswer(question: string, sources: Source[]): string {
  if (sources.length === 0) {
    return "I couldn't find relevant information in the knowledge base for that question. Try asking about RAG pipelines, FastAPI, vector databases, async Python, or Pydantic."
  }

  const q = question.toLowerCase()

  if (q.includes('hybrid') || q.includes('search') || q.includes('bm25') || q.includes('rrf')) {
    return `Based on the indexed documentation, hybrid search works as follows:

**Hybrid Retrieval** [Source 1] combines two complementary approaches:
- **Semantic search** uses dense embeddings (text-embedding-3-small) and cosine similarity in ChromaDB's HNSW index to find semantically related chunks
- **BM25 keyword search** uses TF-IDF scoring over an in-memory inverted index for exact terminology matching

Both searches run **concurrently** via \`asyncio.gather()\`, then results are fused using **Reciprocal Rank Fusion** [Source 1]:

\`score = α × 1/(k + rank_sem) + (1-α) × 1/(k + rank_bm25)\`

With α=0.7, semantic search gets 70% weight and BM25 gets 30%. This consistently outperforms either approach alone because semantic search handles synonyms while BM25 excels at exact term matching.`
  }

  if (q.includes('rag') || q.includes('retrieval') || q.includes('generat')) {
    return `**RAG (Retrieval-Augmented Generation)** [Source 1] works in two stages:

**Stage 1 — Retrieval**: The user query is embedded and used to retrieve the top-k most relevant document chunks via hybrid search. This grounds the LLM in factual content.

**Stage 2 — Generation**: Retrieved chunks are formatted as context and injected into the LLM prompt. GPT-4o generates an answer with [Source N] citations, preventing hallucinations by anchoring responses to real document content [Source 1].

The key advantage is that RAG systems can be updated with new knowledge by re-indexing documents, without retraining the LLM.`
  }

  if (q.includes('async') || q.includes('asyncio') || q.includes('concurr') || q.includes('semaphore')) {
    return `Python's **asyncio** is central to this system's performance [Source 2]:

- **\`asyncio.gather()\`**: Runs semantic search and BM25 search concurrently, cutting retrieval latency roughly in half
- **\`asyncio.to_thread()\`**: Wraps synchronous ChromaDB calls and BM25 search to run in a thread pool without blocking the event loop
- **\`asyncio.Semaphore(10)\`**: Limits concurrent embedding API calls to prevent OpenAI rate limit violations
- **\`asyncio.create_task()\`**: Fires document ingestion in the background, returning the upload response immediately

The streaming chat endpoint uses an **async generator** that yields SSE tokens as they arrive from the LLM [Source 2].`
  }

  if (q.includes('pydantic') || q.includes('validat') || q.includes('schema') || q.includes('model')) {
    return `**Pydantic v2** provides all data validation in this system [Source 2]:

\`\`\`python
class SearchQuery(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    top_k: int = Field(default=5, ge=1, le=50)
    hybrid_alpha: float = Field(default=0.7, ge=0.0, le=1.0)

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Query cannot be empty")
        return v.strip()
\`\`\`

**BaseSettings** uses \`env_prefix="RAG_"\` for 12-factor config management [Source 2]. The \`model_config = ConfigDict(from_attributes=True)\` enables ORM-style construction from dataclasses.`
  }

  if (q.includes('vector') || q.includes('chroma') || q.includes('embed') || q.includes('hnsw')) {
    return `**ChromaDB** serves as the vector store [Source 3]:

- Uses **HNSW (Hierarchical Navigable Small World)** graphs for approximate nearest-neighbor search with sub-linear query time
- Initialized with \`{"hnsw:space": "cosine"}\` metadata for cosine similarity
- **Distances converted to similarity**: \`score = 1 - distance\`

**Embedding pipeline** [Source 3]:
- OpenAI \`text-embedding-3-small\` produces 1536-dimensional vectors
- Batch embedding: 100 texts per API call to minimize round trips
- Falls back to local \`sentence-transformers\` when no OpenAI key is set
- \`asyncio.Semaphore(10)\` prevents rate limit violations during batch ingestion`
  }

  if (q.includes('chunk') || q.includes('split') || q.includes('ingest')) {
    return `The **ingestion pipeline** processes documents in 6 stages [Source 3]:

1. **Extract**: TextExtractor handles PDF (pypdf), HTML, Markdown, JSON
2. **Clean**: TextCleaner normalizes line endings, collapses whitespace
3. **Chunk**: Three strategies available:
   - **Recursive**: Hierarchical separators \`\\n\\n → \\n → . → space → char\`
   - **Sentence**: Groups complete sentences within chunk_size
   - **Semantic**: Falls back to recursive (requires embeddings at chunk time)
4. **Embed**: OpenAI API in batches of 100
5. **Index**: ChromaDB + BM25 updated atomically per chunk
6. **Status**: Document transitions \`pending → processing → indexed\``
  }

  // Default response using first source
  return `Based on the retrieved context [Source 1], here's what I found:

${sources[0].content}

${sources.length > 1 ? `Additionally, [Source 2] provides relevant context:\n\n${sources[1].content.slice(0, 200)}...` : ''}

This is a simulated RAG response demonstrating how the system grounds answers in retrieved document chunks with source citations.`
}

const SUGGESTED_QUESTIONS = [
  'How does hybrid search work?',
  'Explain the RRF fusion algorithm',
  'How is asyncio used in the pipeline?',
  'What Pydantic v2 features are used?',
  'How does document chunking work?',
  'Explain the vector embedding process',
]

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I\'m the RAG Document Intelligence assistant. I have access to a knowledge base covering **RAG pipelines**, **FastAPI architecture**, **vector databases**, **async Python patterns**, and **Pydantic v2**.\n\nAsk me anything — I\'ll retrieve relevant chunks and generate a grounded answer with source citations.',
    },
  ])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [retrievedSources, setRetrievedSources] = useState<Source[]>([])
  const [searchTime, setSearchTime] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const simulateStreaming = useCallback(
    async (messageId: string, fullText: string) => {
      const words = fullText.split(' ')
      let current = ''

      for (let i = 0; i < words.length; i++) {
        current += (i > 0 ? ' ' : '') + words[i]
        const snapshot = current
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, content: snapshot } : m))
        )
        // Variable delay for realistic streaming feel
        const delay = words[i].includes('\n') ? 30 : Math.random() * 25 + 10
        await new Promise((r) => setTimeout(r, delay))
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isStreaming: false } : m))
      )
    },
    []
  )

  const handleSend = useCallback(
    async (question?: string) => {
      const text = (question || input).trim()
      if (!text || isProcessing) return

      setInput('')
      setIsProcessing(true)

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
      }
      setMessages((prev) => [...prev, userMsg])

      // Simulate retrieval delay
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 400))

      const startTime = performance.now()
      const sources = hybridSearch(text)
      const elapsed = performance.now() - startTime
      const simulatedMs = elapsed + 15 + Math.random() * 10

      setRetrievedSources(sources)
      setSearchTime(simulatedMs)

      // Add streaming assistant message
      const assistantId = `assistant-${Date.now()}`
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        sources,
        isStreaming: true,
        search_time_ms: simulatedMs,
      }
      setMessages((prev) => [...prev, assistantMsg])

      const answer = generateAnswer(text, sources)

      // Simulate LLM response latency
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 300))
      await simulateStreaming(assistantId, answer)

      setIsProcessing(false)
    },
    [input, isProcessing, simulateStreaming]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: 'Conversation cleared. Ask me about RAG, FastAPI, vector databases, or async Python!',
      },
    ])
    setRetrievedSources([])
    setSearchTime(null)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main chat */}
      <div className="lg:col-span-2 glass rounded-2xl border border-indigo-500/20 flex flex-col h-[620px]">
        {/* Chat header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40
                            flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="font-semibold text-slate-200 text-sm">RAG Assistant</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Hybrid Search · GPT-4o Stream
              </div>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            title="Clear conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5
                  ${msg.role === 'user'
                    ? 'bg-indigo-600/40 border border-indigo-500/40'
                    : 'bg-slate-700/60 border border-slate-600/40'
                  }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-3.5 h-3.5 text-indigo-300" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>

              {/* Bubble */}
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                <div
                  className={`rounded-xl px-4 py-3 text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-indigo-600/30 border border-indigo-500/30 text-indigo-100'
                      : 'bg-slate-800/60 border border-slate-700/40 text-slate-300'
                    }`}
                >
                  <MessageContent content={msg.content} />
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 cursor-blink" />
                  )}
                </div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && !msg.isStreaming && (
                  <div className="space-y-1.5 w-full">
                    {msg.search_time_ms && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Search className="w-3 h-3" />
                        Retrieved {msg.sources.length} chunks in {msg.search_time_ms.toFixed(1)}ms
                      </div>
                    )}
                    {msg.sources.slice(0, 2).map((src, i) => (
                      <div
                        key={src.chunk_id}
                        className="flex items-start gap-2 px-3 py-2 rounded-lg
                                   bg-slate-900/60 border border-slate-700/30 text-xs"
                      >
                        <span className="text-indigo-400 font-bold flex-shrink-0 mt-0.5">
                          [{i + 1}]
                        </span>
                        <div>
                          <div className="text-slate-500 mb-0.5 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {src.document_title}
                            <span className="text-slate-600 ml-1">
                              score: {src.score.toFixed(4)}
                            </span>
                          </div>
                          <div className="text-slate-400 line-clamp-2">{src.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about RAG, hybrid search, FastAPI, async Python..."
              rows={1}
              className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3
                         text-sm text-slate-200 placeholder-slate-600 resize-none
                         focus:outline-none focus:border-indigo-500/50 focus:bg-slate-800
                         transition-colors duration-150"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isProcessing}
              className="w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                         disabled:cursor-not-allowed flex items-center justify-center
                         transition-all duration-150 hover:shadow-lg hover:shadow-indigo-500/25
                         flex-shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="text-xs text-slate-600 mt-2">
            Press Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-5">
        {/* Suggested questions */}
        <div className="glass rounded-xl p-5 border border-slate-700/30">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Suggested Questions
          </h3>
          <div className="space-y-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                disabled={isProcessing}
                className="w-full text-left text-xs text-slate-400 hover:text-slate-200
                           px-3 py-2 rounded-lg hover:bg-indigo-500/10 hover:border-indigo-500/20
                           border border-transparent transition-all duration-150
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Search stats */}
        {retrievedSources.length > 0 && (
          <div className="glass rounded-xl p-5 border border-emerald-500/20">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Last Retrieval
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Search time</span>
                <span className="text-emerald-400 font-mono">
                  {searchTime?.toFixed(1)}ms
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Chunks retrieved</span>
                <span className="text-indigo-400 font-mono">{retrievedSources.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Algorithm</span>
                <span className="text-purple-400 font-mono">RRF α=0.7</span>
              </div>
              <div className="pt-2 border-t border-slate-700/50 space-y-1.5">
                {retrievedSources.map((src, i) => (
                  <div key={src.chunk_id} className="flex items-center gap-2 text-xs">
                    <span className="text-indigo-400 font-bold w-4">[{i + 1}]</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-400 truncate">{src.document_title}</div>
                      <div className="text-slate-600 font-mono">
                        score: {src.score.toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* System info */}
        <div className="glass rounded-xl p-5 border border-slate-700/30">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            System Config
          </h3>
          <div className="space-y-2 text-xs">
            {[
              { key: 'Embedding', val: 'text-embedding-3-small' },
              { key: 'LLM', val: 'gpt-4o' },
              { key: 'Vector DB', val: 'ChromaDB' },
              { key: 'Keyword', val: 'BM25 (k1=1.5, b=0.75)' },
              { key: 'Chunk size', val: '512 tokens' },
              { key: 'Overlap', val: '50 tokens' },
            ].map(({ key, val }) => (
              <div key={key} className="flex justify-between">
                <span className="text-slate-600">{key}</span>
                <span className="text-slate-400 font-mono text-right">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Render markdown-like formatting without a library
function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <p key={i} className="font-semibold text-slate-200">
              {line.slice(2, -2)}
            </p>
          )
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <p key={i} className="flex gap-2">
              <span className="text-indigo-400 flex-shrink-0">•</span>
              <InlineMarkdown text={line.slice(2)} />
            </p>
          )
        }
        if (line.startsWith('```')) {
          return null
        }
        if (line.trim() === '') {
          return <div key={i} className="h-1" />
        }
        return (
          <p key={i}>
            <InlineMarkdown text={line} />
          </p>
        )
      })}
    </div>
  )
}

function InlineMarkdown({ text }: { text: string }) {
  // Process **bold**, `code`, and [Source N] citations
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
    const codeMatch = remaining.match(/`([^`]+)`/)
    const sourceMatch = remaining.match(/\[Source \d+\]/)

    const matches = [
      boldMatch ? { type: 'bold', match: boldMatch } : null,
      codeMatch ? { type: 'code', match: codeMatch } : null,
      sourceMatch ? { type: 'source', match: sourceMatch } : null,
    ]
      .filter(Boolean)
      .sort((a, b) => (a!.match.index ?? 0) - (b!.match.index ?? 0))

    if (matches.length === 0) {
      parts.push(<span key={key++}>{remaining}</span>)
      break
    }

    const first = matches[0]!
    const idx = first.match.index ?? 0

    if (idx > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>)
    }

    if (first.type === 'bold') {
      parts.push(
        <strong key={key++} className="font-semibold text-slate-200">
          {first.match[1]}
        </strong>
      )
    } else if (first.type === 'code') {
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-slate-700/70 font-mono text-xs text-emerald-300">
          {first.match[1]}
        </code>
      )
    } else if (first.type === 'source') {
      parts.push(
        <span key={key++} className="text-indigo-400 font-semibold text-xs">
          {first.match[0]}
        </span>
      )
    }

    remaining = remaining.slice(idx + first.match[0].length)
  }

  return <>{parts}</>
}
