'use client'

import { useState, useRef, useEffect, useCallback, DragEvent } from 'react'
import {
  Send,
  Bot,
  User,
  FileText,
  Search,
  Zap,
  RefreshCw,
  Upload,
  X,
  CheckCircle,
  Layers,
  Hash,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'

/* ─────────────────────────── Types ─────────────────────────── */

interface DocumentChunk {
  id: string
  index: number
  text: string
  tokens: number
  charStart: number
  charEnd: number
}

interface UploadedDocument {
  name: string
  size: number
  type: string
  content: string // simulated extracted text
  chunks: DocumentChunk[]
  status: 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'indexed'
  progress: number
}

interface Source {
  chunk_id: string
  chunk_index: number
  content: string
  score: number
  relevance: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  isStreaming?: boolean
  search_time_ms?: number
}

/* ─────────────────────────── Constants ─────────────────────────── */

const ACCEPTED_TYPES = ['.pdf', '.txt', '.md', '.docx']
const ACCEPTED_MIME = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

// Simulated document corpus that adapts to the uploaded file name
function generateDocumentContent(filename: string): string {
  const baseName = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
  return `${baseName} — Technical Documentation

Executive Summary
This document provides a comprehensive overview of the ${baseName} system architecture, implementation details, and operational guidelines. The system is designed to handle high-throughput workloads with sub-second latency requirements.

System Architecture
The ${baseName} platform is built on a microservices architecture with the following core components:
- API Gateway: Handles authentication, rate limiting, and request routing
- Service Mesh: Manages inter-service communication with mTLS encryption
- Event Bus: Apache Kafka for asynchronous event streaming
- Data Layer: PostgreSQL for transactional data, Redis for caching

Authentication and Authorization
The authentication subsystem implements OAuth 2.0 with JWT tokens. Access tokens expire after 15 minutes; refresh tokens are valid for 7 days. Token rotation occurs automatically on each refresh. The JWT middleware validates the signature using RS256, checks expiration, and verifies the issuer claim before forwarding requests to downstream services.

When a token expires, the middleware returns a 401 Unauthorized response with a WWW-Authenticate header. Client applications must detect this response and initiate the refresh flow. If the refresh token is also expired, the user is redirected to the login page.

Data Processing Pipeline
Documents ingested into the ${baseName} system pass through a multi-stage pipeline:
1. Extraction: Raw bytes parsed using format-specific extractors (PDF, DOCX, HTML)
2. Normalization: Text cleaned, whitespace collapsed, encoding standardized to UTF-8
3. Chunking: Text split into 512-token chunks with 50-token overlap using recursive separators
4. Embedding: Chunks vectorized using text-embedding-3-small (1536 dimensions)
5. Indexing: Vectors stored in ChromaDB with HNSW index; BM25 inverted index updated

Performance Characteristics
Benchmark results on production hardware (32 vCPUs, 128GB RAM):
- Document ingestion: 2.4 seconds per MB of text
- Hybrid search latency: 18–34ms (p50), 67ms (p99)
- Concurrent ingestion limit: 5 documents via asyncio.Semaphore
- Embedding throughput: 100 texts per API call, 3 calls/second sustained

Error Handling and Resilience
The system implements circuit breakers on all external service calls. If the embedding API fails, the ingestion pipeline retries with exponential backoff (max 3 attempts). Failed documents are marked with status=failed and a detailed error message is stored for debugging.

ChromaDB connection failures trigger automatic fallback to an in-memory EphemeralClient, ensuring the service remains operational for testing and CI environments.

Deployment Configuration
Production deployment uses Docker Compose with the following services:
- api: FastAPI application running on Uvicorn with 4 workers
- chromadb: Persistent vector store with volume mount
- redis: Session cache and rate limiter
- nginx: Reverse proxy with SSL termination

Health checks are configured with 30-second intervals. Non-root container users (UID 1000) are enforced for security compliance.

API Reference
POST /api/v1/documents/upload — Upload and ingest a document
GET /api/v1/documents/{id} — Retrieve document status and metadata
POST /api/v1/search/ — Perform hybrid semantic + BM25 search
POST /api/v1/chat/ — Streaming RAG chat with source citations
DELETE /api/v1/documents/{id} — Remove document and all chunks`
}

function chunkDocument(content: string): DocumentChunk[] {
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 50)
  const chunks: DocumentChunk[] = []
  let charStart = 0
  const chunkSize = 512

  let buffer = ''
  let bufferStart = 0

  for (const para of paragraphs) {
    const words = para.split(/\s+/)
    for (const word of words) {
      if (buffer.length + word.length + 1 > chunkSize && buffer.length > 200) {
        const estimatedTokens = Math.round(buffer.length / 4)
        chunks.push({
          id: `chunk-${chunks.length.toString().padStart(3, '0')}`,
          index: chunks.length,
          text: buffer.trim(),
          tokens: estimatedTokens,
          charStart: bufferStart,
          charEnd: bufferStart + buffer.length,
        })
        // 50-token overlap
        const overlapWords = buffer.split(/\s+/).slice(-12).join(' ')
        buffer = overlapWords + ' ' + word
        bufferStart = charStart - overlapWords.length
      } else {
        buffer += (buffer ? ' ' : '') + word
      }
      charStart += word.length + 1
    }
    buffer += '\n\n'
  }

  if (buffer.trim().length > 30) {
    chunks.push({
      id: `chunk-${chunks.length.toString().padStart(3, '0')}`,
      index: chunks.length,
      text: buffer.trim(),
      tokens: Math.round(buffer.length / 4),
      charStart: bufferStart,
      charEnd: bufferStart + buffer.length,
    })
  }

  return chunks
}

/* ─────────────────────── RAG Simulation ──────────────────────── */

function hybridSearch(query: string, chunks: DocumentChunk[], topK = 3): Source[] {
  if (chunks.length === 0) return []
  const queryTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)

  const scored = chunks.map((chunk, idx) => {
    const text = chunk.text.toLowerCase()
    const matchCount = queryTokens.filter((t) => text.includes(t)).length
    const bm25 = matchCount / (queryTokens.length + 1)
    const semantic = Math.max(0, 1 - Math.abs(idx - chunks.length / 2) / chunks.length) * 0.3 + bm25 * 0.7
    return { chunk, bm25, semantic, idx }
  })

  const semSorted = [...scored].sort((a, b) => b.semantic - a.semantic)
  const bm25Sorted = [...scored].sort((a, b) => b.bm25 - a.bm25)

  const alpha = 0.7
  const k = 60
  const rfScores = new Map<string, number>()

  semSorted.forEach((item, rank) => {
    rfScores.set(item.chunk.id, (rfScores.get(item.chunk.id) || 0) + alpha * (1 / (k + rank + 1)))
  })
  bm25Sorted.forEach((item, rank) => {
    rfScores.set(item.chunk.id, (rfScores.get(item.chunk.id) || 0) + (1 - alpha) * (1 / (k + rank + 1)))
  })

  return scored
    .sort((a, b) => (rfScores.get(b.chunk.id) || 0) - (rfScores.get(a.chunk.id) || 0))
    .slice(0, topK)
    .filter((s) => (rfScores.get(s.chunk.id) || 0) > 0.005)
    .map((s) => ({
      chunk_id: s.chunk.id,
      chunk_index: s.chunk.index,
      content: s.chunk.text,
      score: parseFloat(((rfScores.get(s.chunk.id) || 0) * 12).toFixed(4)),
      relevance: parseFloat((bm25Sorted.findIndex((x) => x.chunk.id === s.chunk.id) === 0 ? 0.94 : 0.72 + Math.random() * 0.2).toFixed(3)),
    }))
}

function generateAnswer(question: string, sources: Source[], docName: string): string {
  if (sources.length === 0) {
    return `I couldn't find a highly relevant section in **${docName}** for that question. Try asking about authentication, the data pipeline, performance characteristics, deployment, or the API endpoints.`
  }

  const q = question.toLowerCase()
  const docShort = docName.replace(/\.[^.]+$/, '')

  if (q.includes('auth') || q.includes('token') || q.includes('jwt') || q.includes('login') || q.includes('oauth')) {
    return `Based on **${docShort}** [Source 1], the authentication system implements:

**OAuth 2.0 with JWT Tokens** — Access tokens expire after **15 minutes**; refresh tokens are valid for 7 days. Token rotation is automatic on each refresh.

**Token Expiry Handling** [Source 1]: The JWT middleware returns a \`401 Unauthorized\` response with a \`WWW-Authenticate\` header when a token expires. Client applications detect this and initiate the refresh flow. If the refresh token is also expired, users are redirected to the login page.

**Signing Algorithm**: RS256 (asymmetric) — validates signature, expiration, and issuer claim before forwarding to downstream services.`
  }

  if (q.includes('chunk') || q.includes('split') || q.includes('ingest') || q.includes('pipeline') || q.includes('process')) {
    return `**${docShort}** describes a 5-stage ingestion pipeline [Source 1]:

1. **Extraction** — Format-specific extractors for PDF, DOCX, HTML
2. **Normalization** — UTF-8 standardization, whitespace collapse
3. **Chunking** — 512-token chunks with 50-token overlap using recursive separators [Source 1]
4. **Embedding** — \`text-embedding-3-small\` (1536 dimensions), 100 texts per batch
5. **Indexing** — ChromaDB HNSW + BM25 inverted index updated atomically

[Source 2] notes that failed ingestions are retried with exponential backoff (max 3 attempts), and documents transition through statuses: \`pending → extracting → chunking → embedding → indexed\`.`
  }

  if (q.includes('performance') || q.includes('latency') || q.includes('speed') || q.includes('benchmark') || q.includes('fast')) {
    return `**Performance benchmarks** from [Source 1] (32 vCPUs, 128GB RAM):

| Metric | Value |
|--------|-------|
| Document ingestion | 2.4s per MB of text |
| Search latency p50 | **18–34ms** |
| Search latency p99 | 67ms |
| Concurrent ingestion | 5 docs (Semaphore) |
| Embedding throughput | 100 texts/call, 3 calls/sec |

[Source 1] achieves sub-30ms search via **asyncio.gather()** running semantic and BM25 search concurrently, then fusing with Reciprocal Rank Fusion.`
  }

  if (q.includes('deploy') || q.includes('docker') || q.includes('container') || q.includes('production') || q.includes('infra')) {
    return `**Deployment configuration** from [Source 2]:

**Docker Compose services:**
- \`api\` — FastAPI on Uvicorn, **4 workers**
- \`chromadb\` — Persistent vector store with volume mount
- \`redis\` — Session cache and rate limiter
- \`nginx\` — Reverse proxy with SSL termination

**Security** [Source 2]: Non-root container users (UID 1000) enforced. Health checks run every 30 seconds. CORS middleware configured per environment.

**Resilience**: Circuit breakers on all external calls. ChromaDB connection failures trigger automatic fallback to \`EphemeralClient\` for CI compatibility.`
  }

  if (q.includes('api') || q.includes('endpoint') || q.includes('route') || q.includes('curl') || q.includes('request')) {
    return `**API endpoints** documented in [Source 1]:

\`\`\`
POST /api/v1/documents/upload  — Upload & ingest (async)
GET  /api/v1/documents/{id}    — Status + metadata polling
POST /api/v1/search/           — Hybrid semantic + BM25 search
POST /api/v1/chat/             — Streaming RAG chat (SSE)
DELETE /api/v1/documents/{id}  — Remove document + chunks
\`\`\`

The chat endpoint supports **Server-Sent Events streaming** [Source 1]. Upload returns immediately with \`status: "pending"\` — clients poll for completion via GET.`
  }

  // Generic answer using source content
  const preview = sources[0].content.slice(0, 350)
  const more = sources.length > 1 ? `\n\n[Source 2] from the same document provides additional context on this topic.` : ''
  return `Based on **${docShort}** [Source 1]:\n\n${preview}...${more}\n\nThis section covers the relevant information from your uploaded document.`
}

const DEFAULT_QUESTIONS = [
  'How does authentication handle token expiry?',
  'Explain the document ingestion pipeline',
  'What are the performance benchmarks?',
  'How is the system deployed?',
  'What API endpoints are available?',
]

/* ─────────────────────── File Upload State ────────────────────── */

const STATUS_STEPS: Array<UploadedDocument['status']> = [
  'uploading', 'extracting', 'chunking', 'embedding', 'indexed',
]

const STATUS_LABELS: Record<UploadedDocument['status'], string> = {
  uploading: 'Uploading file...',
  extracting: 'Extracting text content...',
  chunking: 'Chunking document (512 tokens, 50 overlap)...',
  embedding: 'Generating embeddings...',
  indexed: 'Document indexed and ready',
}

/* ─────────────────────── Main Component ──────────────────────── */

export default function ChatInterface() {
  const [document, setDocument] = useState<UploadedDocument | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [processingChunkIdx, setProcessingChunkIdx] = useState(0)
  const [visibleChunks, setVisibleChunks] = useState<DocumentChunk[]>([])

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFile = useCallback(async (file: File) => {
    // Validate type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_TYPES.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
      return
    }

    const content = generateDocumentContent(file.name)
    const chunks = chunkDocument(content)

    const doc: UploadedDocument = {
      name: file.name,
      size: file.size,
      type: file.type || `application/${ext.slice(1)}`,
      content,
      chunks,
      status: 'uploading',
      progress: 0,
    }

    setDocument(doc)
    setVisibleChunks([])
    setMessages([])

    // Simulate processing pipeline
    const steps: Array<{ status: UploadedDocument['status']; duration: number; progress: number }> = [
      { status: 'uploading', duration: 600, progress: 20 },
      { status: 'extracting', duration: 800, progress: 40 },
      { status: 'chunking', duration: 0, progress: 60 }, // handled separately
      { status: 'embedding', duration: 1200, progress: 90 },
      { status: 'indexed', duration: 300, progress: 100 },
    ]

    for (const step of steps) {
      setDocument((prev) => prev ? { ...prev, status: step.status, progress: step.progress } : null)

      if (step.status === 'chunking') {
        // Animate chunks appearing one by one
        for (let i = 0; i < chunks.length; i++) {
          await new Promise((r) => setTimeout(r, 120))
          setVisibleChunks((prev) => [...prev, chunks[i]])
          setProcessingChunkIdx(i)
        }
        await new Promise((r) => setTimeout(r, 400))
      } else {
        await new Promise((r) => setTimeout(r, step.duration))
      }
    }

    // Welcome message
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Document **${file.name}** has been indexed with **${chunks.length} chunks** (avg ${Math.round(chunks.reduce((s, c) => s + c.tokens, 0) / chunks.length)} tokens each).\n\nHybrid search is active — ask me anything about this document and I'll retrieve the most relevant chunks with source citations.`,
    }])
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  const simulateStreaming = useCallback(async (messageId: string, fullText: string) => {
    const words = fullText.split(' ')
    let current = ''
    for (let i = 0; i < words.length; i++) {
      current += (i > 0 ? ' ' : '') + words[i]
      const snapshot = current
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: snapshot } : m))
      )
      const delay = words[i].includes('\n') ? 25 : Math.random() * 20 + 8
      await new Promise((r) => setTimeout(r, delay))
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isStreaming: false } : m))
    )
  }, [])

  const handleSend = useCallback(async (question?: string) => {
    const text = (question || input).trim()
    if (!text || isProcessing || !document) return

    setInput('')
    setIsProcessing(true)

    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])

    await new Promise((r) => setTimeout(r, 350 + Math.random() * 300))

    const startTime = performance.now()
    const sources = hybridSearch(text, document.chunks)
    const elapsed = performance.now() - startTime
    const simulatedMs = elapsed + 14 + Math.random() * 12

    const assistantId = `assistant-${Date.now()}`
    const answer = generateAnswer(text, sources, document.name)

    setMessages((prev) => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      sources,
      isStreaming: true,
      search_time_ms: simulatedMs,
    }])

    await new Promise((r) => setTimeout(r, 150))
    await simulateStreaming(assistantId, answer)
    setIsProcessing(false)
  }, [input, isProcessing, document, simulateStreaming])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReset = () => {
    setDocument(null)
    setMessages([])
    setVisibleChunks([])
    setInput('')
  }

  const isIndexed = document?.status === 'indexed'
  const isProcessingDoc = document && !isIndexed

  return (
    <div className="flex flex-col lg:flex-row gap-0 h-[780px] glass-card rounded-xl border border-cyan-500/12 overflow-hidden">

      {/* ─────────────── LEFT: Document Panel ─────────────── */}
      <div className="lg:w-[380px] flex-shrink-0 flex flex-col border-r border-cyan-500/10 bg-[#020617]">

        {/* Panel header */}
        <div className="px-5 py-3.5 border-b border-cyan-500/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-cyan-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Document
            </span>
          </div>
          {document && (
            <button
              onClick={handleReset}
              className="text-slate-600 hover:text-slate-400 transition-colors"
              title="Remove document"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Upload zone or document view */}
        {!document ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`drop-zone w-full flex-1 rounded-xl flex flex-col items-center
                          justify-center cursor-pointer transition-all duration-200
                          ${isDragOver ? 'drag-over' : ''}`}
            >
              <div className="flex flex-col items-center gap-4 text-center p-8">
                <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center
                                transition-all duration-200
                                ${isDragOver
                                  ? 'border-cyan-400/60 bg-cyan-500/10'
                                  : 'border-cyan-500/20 bg-cyan-500/5'}`}>
                  <Upload className={`w-6 h-6 transition-colors ${isDragOver ? 'text-cyan-300' : 'text-cyan-500/60'}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-300 mb-1">
                    {isDragOver ? 'Drop to upload' : 'Drop your document here'}
                  </div>
                  <div className="text-xs text-slate-600">or click to browse files</div>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {ACCEPTED_TYPES.map((t) => (
                    <span key={t}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/5
                                 border border-cyan-500/15 text-cyan-600 font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {/* Demo hint */}
            <div className="mt-4 p-3 rounded-lg bg-cyan-500/4 border border-cyan-500/10 w-full">
              <div className="text-[11px] text-slate-600 text-center">
                No file? The demo generates realistic content from any filename.
                Any PDF, TXT, MD, or DOCX works.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* File info */}
            <div className="px-5 py-3 border-b border-cyan-500/8">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20
                                flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-200 truncate">{document.name}</div>
                  <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                    {(document.size / 1024).toFixed(1)} KB · {document.type.split('/').pop()?.toUpperCase()}
                  </div>
                </div>
                {isIndexed && (
                  <CheckCircle className="w-4 h-4 text-teal-400 flex-shrink-0 mt-1" />
                )}
              </div>
            </div>

            {/* Processing status */}
            {isProcessingDoc && (
              <div className="px-5 py-3 border-b border-cyan-500/8">
                {/* Progress bar */}
                <div className="h-0.5 bg-slate-800 rounded-full mb-2 overflow-hidden">
                  <div
                    className="progress-bar h-full rounded-full transition-all duration-500"
                    style={{ width: `${document.progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="status-active flex-shrink-0" />
                  <span className="text-[11px] text-slate-500 font-mono">
                    {STATUS_LABELS[document.status]}
                  </span>
                </div>
              </div>
            )}

            {/* Indexed status bar */}
            {isIndexed && (
              <div className="px-5 py-2.5 border-b border-cyan-500/8 bg-teal-500/4">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-teal-400">
                    <CheckCircle className="w-3 h-3" />
                    <span className="font-mono">Indexed — ready for queries</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 font-mono">
                    <span><span className="text-cyan-400">{document.chunks.length}</span> chunks</span>
                  </div>
                </div>
              </div>
            )}

            {/* Chunks viewer */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-3 border-b border-cyan-500/8 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <Layers className="w-3 h-3 text-cyan-500/60" />
                  <span className="font-mono uppercase tracking-wider">Document Chunks</span>
                </div>
                <span className="text-[11px] text-cyan-500/60 font-mono">
                  {visibleChunks.length}/{document.chunks.length}
                </span>
              </div>

              <div className="p-3 space-y-2">
                {visibleChunks.map((chunk, i) => (
                  <div
                    key={chunk.id}
                    className="chunk-card rounded-lg p-3 animate-[chunkAppear_0.3s_ease-out_forwards]"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-2.5 h-2.5 text-cyan-500/60" />
                        <span className="text-[10px] font-mono text-cyan-500/70">{chunk.id}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-700 font-mono">
                        <span>{chunk.tokens} tok</span>
                        {i === processingChunkIdx && document.status === 'chunking' && (
                          <span className="text-cyan-500 animate-pulse">●</span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {chunk.text}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-700 font-mono">
                      <span>chars {chunk.charStart}–{chunk.charEnd}</span>
                    </div>
                  </div>
                ))}

                {/* Placeholder chunks while chunking */}
                {document.status === 'chunking' && visibleChunks.length < document.chunks.length && (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="chunk-card rounded-lg p-3">
                        <div className="shimmer h-3 w-1/3 rounded mb-2" />
                        <div className="shimmer h-2 w-full rounded mb-1" />
                        <div className="shimmer h-2 w-3/4 rounded" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────── RIGHT: Chat Panel ─────────────── */}
      <div className="flex-1 flex flex-col bg-[#0F172A] min-w-0">

        {/* Chat header */}
        <div className="px-5 py-3.5 border-b border-cyan-500/8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20
                            flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-300">RAG Assistant</div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-mono">
                {isIndexed
                  ? <><span className="w-1.5 h-1.5 bg-teal-400 rounded-full" />Hybrid Search Active · GPT-4o Stream</>
                  : <><span className="w-1.5 h-1.5 bg-slate-600 rounded-full" />Upload a document to begin</>
                }
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]
                         transition-all duration-150"
              title="Clear chat"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Messages area */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-5 space-y-5">
          {!document && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/5 border border-cyan-500/15
                              flex items-center justify-center">
                <Upload className="w-7 h-7 text-cyan-500/40" />
              </div>
              <div>
                <div className="text-slate-500 text-sm font-semibold mb-1">No document loaded</div>
                <div className="text-slate-700 text-xs max-w-xs">
                  Upload a PDF, TXT, MD, or DOCX file on the left to start chatting with your document
                </div>
              </div>
            </div>
          )}

          {isProcessingDoc && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="relative w-14 h-14">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/5 border border-cyan-500/15
                                flex items-center justify-center">
                  <Zap className="w-6 h-6 text-cyan-500/60" />
                </div>
                <div className="absolute inset-0 rounded-2xl border border-cyan-400/20 animate-ping" />
              </div>
              <div>
                <div className="text-slate-400 text-sm font-semibold mb-1">Processing document...</div>
                <div className="text-slate-700 text-xs font-mono">
                  {STATUS_LABELS[document.status]}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5
                ${msg.role === 'user'
                  ? 'bg-cyan-500/15 border border-cyan-500/25'
                  : 'bg-slate-800/60 border border-slate-700/40'}`}>
                {msg.role === 'user'
                  ? <User className="w-3 h-3 text-cyan-400" />
                  : <Bot className="w-3 h-3 text-slate-500" />
                }
              </div>

              {/* Bubble */}
              <div className={`max-w-[88%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-xl px-4 py-3 text-xs leading-relaxed
                  ${msg.role === 'user'
                    ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-100'
                    : 'bg-slate-900/60 border border-slate-800/60 text-slate-300'}`}>
                  <MessageContent content={msg.content} />
                  {msg.isStreaming && (
                    <span className="inline-block w-1 h-3.5 bg-cyan-400 ml-0.5 cursor-blink" />
                  )}
                </div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && !msg.isStreaming && (
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-700 font-mono">
                      <Search className="w-2.5 h-2.5 text-cyan-500/50" />
                      Retrieved {msg.sources.length} chunks in {msg.search_time_ms?.toFixed(1)}ms · RRF α=0.7
                    </div>
                    {msg.sources.map((src, i) => (
                      <div
                        key={src.chunk_id}
                        className="chunk-card rounded-lg px-3 py-2 text-[11px]"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-cyan-400 font-bold font-mono">[{i + 1}]</span>
                            <span className="text-slate-600 font-mono">{src.chunk_id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-700 font-mono">
                              score: <span className="text-cyan-500/80">{src.score.toFixed(3)}</span>
                            </span>
                            {/* Score bar */}
                            <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="score-bar-fill h-full rounded-full"
                                style={{ width: `${Math.min(src.relevance * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <p className="text-slate-500 line-clamp-2 leading-relaxed">{src.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        {isIndexed && messages.length <= 1 && (
          <div className="px-5 pb-3 flex flex-wrap gap-1.5">
            {DEFAULT_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                disabled={isProcessing}
                className="text-[11px] text-slate-500 hover:text-cyan-400 px-2.5 py-1 rounded-lg
                           bg-cyan-500/4 hover:bg-cyan-500/8 border border-cyan-500/10
                           hover:border-cyan-500/20 transition-all duration-150
                           disabled:opacity-50 flex items-center gap-1"
              >
                <ChevronRight className="w-2.5 h-2.5" />
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Not indexed warning */}
        {document && !isIndexed && (
          <div className="mx-5 mb-3 px-3 py-2 rounded-lg bg-yellow-500/4 border border-yellow-500/15
                          flex items-center gap-2 text-[11px] text-yellow-600">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Indexing in progress — chat will be available when complete
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-cyan-500/8 flex-shrink-0">
          <div className="flex gap-2.5">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isIndexed ? `Ask about ${document?.name || 'your document'}...` : 'Upload a document to start chatting...'}
              disabled={!isIndexed}
              rows={1}
              className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-3
                         text-xs text-slate-200 placeholder-slate-700 resize-none
                         focus:outline-none focus:border-cyan-500/30 focus:bg-slate-900
                         transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ minHeight: '42px', maxHeight: '100px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isProcessing || !isIndexed}
              className="w-10 h-10 rounded-xl btn-cyan disabled:opacity-30 disabled:cursor-not-allowed
                         disabled:transform-none flex items-center justify-center flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div className="text-[10px] text-slate-700 mt-2 font-mono">
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────── Message Rendering ─────────────────── */

function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <p key={i} className="flex gap-1.5">
              <span className="text-cyan-500/70 flex-shrink-0 mt-0.5">▸</span>
              <InlineMarkdown text={line.slice(2)} />
            </p>
          )
        }
        if (line.match(/^\d+\./)) {
          const num = line.match(/^(\d+\.)/)?.[1] || ''
          return (
            <p key={i} className="flex gap-1.5">
              <span className="text-cyan-500/60 font-mono flex-shrink-0">{num}</span>
              <InlineMarkdown text={line.slice(num.length + 1)} />
            </p>
          )
        }
        if (line.startsWith('```')) return null
        if (line.trim() === '') return <div key={i} className="h-0.5" />
        return <p key={i}><InlineMarkdown text={line} /></p>
      })}
    </div>
  )
}

function InlineMarkdown({ text }: { text: string }) {
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
        <code key={key++} className="px-1.5 py-0.5 rounded bg-slate-800/80 font-mono text-[10px] text-cyan-300 border border-cyan-500/10">
          {first.match[1]}
        </code>
      )
    } else if (first.type === 'source') {
      parts.push(
        <span key={key++} className="text-cyan-400 font-bold text-[10px] font-mono bg-cyan-500/8
                                      px-1.5 py-0.5 rounded border border-cyan-500/15">
          {first.match[0]}
        </span>
      )
    }

    remaining = remaining.slice(idx + first.match[0].length)
  }

  return <>{parts}</>
}
