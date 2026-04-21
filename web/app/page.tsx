'use client'

import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FeatureCard from '@/components/FeatureCard'
import CodeBlock from '@/components/CodeBlock'
import ArchitectureDiagram from '@/components/ArchitectureDiagram'
import type { ComponentProps } from 'react'
import {
  Zap,
  Search,
  MessageSquare,
  FileText,
  GitBranch,
  Shield,
  Layers,
  BarChart3,
  ArrowRight,
  ChevronDown,
} from 'lucide-react'

type FeatureColor = ComponentProps<typeof FeatureCard>['color']

const FEATURES: Array<ComponentProps<typeof FeatureCard>> = [
  {
    icon: <Search className="w-6 h-6" />,
    title: 'Hybrid Search',
    description:
      'Combines semantic vector search with BM25 keyword retrieval. Fused using Reciprocal Rank Fusion for state-of-the-art retrieval accuracy.',
    badge: 'Core',
    color: 'indigo' as FeatureColor,
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: 'Streaming Chat',
    description:
      'Real-time token streaming via Server-Sent Events. GPT-4o generates grounded answers with [Source N] citations from your documents.',
    badge: 'LLM',
    color: 'purple' as FeatureColor,
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Async Ingestion',
    description:
      'Concurrent document processing with asyncio.Semaphore rate limiting. Fire-and-forget upload with background indexing and status polling.',
    badge: 'Async',
    color: 'emerald' as FeatureColor,
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Multi-Format',
    description:
      'Supports PDF (pypdf), HTML, Markdown, plain text, and JSON. Intelligent text extraction with boilerplate removal.',
    badge: 'Docs',
    color: 'cyan' as FeatureColor,
  },
  {
    icon: <GitBranch className="w-6 h-6" />,
    title: 'Smart Chunking',
    description:
      'Three strategies: recursive (hierarchical separators), sentence-aware, and semantic. Configurable size and overlap per document.',
    badge: 'NLP',
    color: 'indigo' as FeatureColor,
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: 'Pydantic v2',
    description:
      'Full validation with ConfigDict, field_validator, and strict typing. Pydantic BaseSettings for 12-factor config management.',
    badge: 'Validation',
    color: 'purple' as FeatureColor,
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Production Ready',
    description:
      'Docker Compose with health checks, non-root container user, CORS middleware, structured logging, and graceful lifespan shutdown.',
    badge: 'DevOps',
    color: 'emerald' as FeatureColor,
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Provider Agnostic',
    description:
      'EmbeddingProvider Protocol enables hot-swapping OpenAI for local sentence-transformers. ChromaDB falls back to EphemeralClient for CI.',
    badge: 'Design',
    color: 'cyan' as FeatureColor,
  },
]

const UPLOAD_EXAMPLE = `# Upload a document
curl -X POST http://localhost:8000/api/v1/documents/upload \\
  -F "file=@technical_spec.pdf" \\
  -F "title=Q4 Architecture RFC" \\
  -F "chunking_strategy=recursive"

# Response (immediate, indexing runs async)
{
  "id": "a1b2c3d4-...",
  "title": "Q4 Architecture RFC",
  "status": "pending",
  "chunk_count": 0,
  "created_at": "2025-01-15T10:30:00Z"
}`

const SEARCH_EXAMPLE = `# Hybrid search (70% semantic + 30% BM25)
curl -X POST http://localhost:8000/api/v1/search/ \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "microservices authentication flow",
    "top_k": 5,
    "hybrid_alpha": 0.7
  }'

# Response
{
  "query": "microservices authentication flow",
  "results": [
    {
      "chunk_id": "a1b2c3d4_f3e2a1b0",
      "document_id": "a1b2c3d4-...",
      "content": "The JWT authentication middleware validates...",
      "score": 0.847,
      "metadata": { "chunk_index": "12", "char_start": "4521" }
    }
  ],
  "total_results": 5,
  "search_time_ms": 23.4
}`

const CHAT_EXAMPLE = `# Streaming RAG chat
curl -X POST http://localhost:8000/api/v1/chat/ \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "How does the auth middleware handle token expiry?",
    "top_k": 5,
    "stream": true
  }'

# SSE stream response
data: "Based"
data: " on"
data: " [Source"
data: " 1],"
data: " the JWT middleware..."
data: [DONE]`

export default function HomePage() {
  return (
    <div className="min-h-screen grid-bg">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Production-Grade Portfolio Project — Senior Python + AI Engineer
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
            <span className="gradient-text">RAG Document</span>
            <br />
            <span className="text-slate-100">Intelligence</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-400 mb-4 max-w-3xl mx-auto leading-relaxed">
            Production-grade RAG pipeline with{' '}
            <span className="text-indigo-400 font-medium">hybrid semantic + BM25 search</span>,
            async document ingestion, and{' '}
            <span className="text-emerald-400 font-medium">GPT-4o streaming chat</span>.
          </p>

          <p className="text-slate-500 mb-10 max-w-2xl mx-auto">
            FastAPI · Pydantic v2 · ChromaDB · OpenAI · asyncio · Docker
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500
                         text-white font-semibold rounded-xl transition-all duration-200
                         hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5"
            >
              Try Live Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/architecture"
              className="inline-flex items-center gap-2 px-8 py-4 glass hover:bg-white/5
                         text-slate-200 font-semibold rounded-xl transition-all duration-200
                         hover:-translate-y-0.5"
            >
              Architecture
              <Layers className="w-4 h-4" />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 glass hover:bg-white/5
                         text-slate-300 font-semibold rounded-xl transition-all duration-200
                         hover:-translate-y-0.5"
            >
              View Source
              <GitBranch className="w-4 h-4" />
            </a>
          </div>

          {/* Scroll hint */}
          <div className="mt-20 flex justify-center">
            <ChevronDown className="w-6 h-6 text-slate-600 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="py-12 px-4 border-y border-indigo-500/10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '< 30ms', label: 'Hybrid Search Latency' },
            { value: '3', label: 'Chunking Strategies' },
            { value: 'RRF', label: 'Rank Fusion Algorithm' },
            { value: 'SSE', label: 'Streaming Protocol' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-bold gradient-text mb-1">{value}</div>
              <div className="text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              System Architecture
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Every component is designed for production: async throughout, provider-agnostic
              abstractions, and clean separation of concerns.
            </p>
          </div>
          <ArchitectureDiagram compact />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-[#1a1a2e]/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What This Demonstrates
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Every capability a Senior Python + AI Engineer needs to show.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* How Hybrid Search Works */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How Hybrid Search Works
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Reciprocal Rank Fusion consistently outperforms either search approach alone —
              no score normalization required.
            </p>
          </div>

          <div className="glass rounded-2xl p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-start gap-8">
              {/* Left: Flow */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/30
                                  flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">
                    1
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">Semantic Search</div>
                    <div className="text-sm text-slate-400">
                      Query embedded via text-embedding-3-small → cosine similarity in ChromaDB HNSW index
                    </div>
                  </div>
                </div>

                <div className="ml-5 w-px h-6 bg-indigo-500/20" />

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30
                                  flex items-center justify-center text-purple-400 font-bold text-sm flex-shrink-0">
                    2
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">BM25 Keyword Search</div>
                    <div className="text-sm text-slate-400">
                      Tokenized query → TF-IDF scoring over in-memory inverted index (run concurrently)
                    </div>
                  </div>
                </div>

                <div className="ml-5 w-px h-6 bg-purple-500/20" />

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30
                                  flex items-center justify-center text-emerald-400 font-bold text-sm flex-shrink-0">
                    3
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">RRF Fusion</div>
                    <div className="text-sm text-slate-400">
                      score = α × 1/(k+rank_sem) + (1-α) × 1/(k+rank_bm25) — merged and re-ranked
                    </div>
                  </div>
                </div>

                <div className="ml-5 w-px h-6 bg-emerald-500/20" />

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30
                                  flex items-center justify-center text-cyan-400 font-bold text-sm flex-shrink-0">
                    4
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">LLM Generation</div>
                    <div className="text-sm text-slate-400">
                      Top-k chunks injected as context → GPT-4o generates grounded answer with citations
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: RRF formula */}
              <div className="md:w-72 glass rounded-xl p-6 border border-emerald-500/20">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                  RRF Formula
                </div>
                <div className="font-mono text-sm text-emerald-300 leading-relaxed">
                  <div className="text-slate-400 mb-1">{'// α = hybrid_alpha (0.7 default)'}</div>
                  <div className="text-slate-400 mb-3">{'// k = 60 (rank smoothing)'}</div>
                  <div>score =</div>
                  <div className="pl-4">α × 1/(k + rank_sem)</div>
                  <div>+</div>
                  <div className="pl-4">(1-α) × 1/(k + rank_bm25)</div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-2">Why it works:</div>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• No score normalization needed</li>
                    <li>• Handles different score scales</li>
                    <li>• Robust to outlier scores</li>
                    <li>• O(n) computation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-[#1a1a2e]/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">API Examples</h2>
            <p className="text-slate-400">Clean REST API with full OpenAPI documentation.</p>
          </div>

          <div className="space-y-6">
            <CodeBlock
              title="Upload Document"
              language="bash"
              code={UPLOAD_EXAMPLE}
            />
            <CodeBlock
              title="Hybrid Search"
              language="bash"
              code={SEARCH_EXAMPLE}
            />
            <CodeBlock
              title="Streaming Chat"
              language="bash"
              code={CHAT_EXAMPLE}
            />
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tech Stack</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'FastAPI', detail: '0.115', color: 'from-teal-500/20 to-teal-600/10', text: 'text-teal-400', border: 'border-teal-500/20' },
              { name: 'Pydantic v2', detail: '2.9+', color: 'from-rose-500/20 to-rose-600/10', text: 'text-rose-400', border: 'border-rose-500/20' },
              { name: 'OpenAI', detail: 'GPT-4o', color: 'from-indigo-500/20 to-indigo-600/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
              { name: 'ChromaDB', detail: 'Vector DB', color: 'from-orange-500/20 to-orange-600/10', text: 'text-orange-400', border: 'border-orange-500/20' },
              { name: 'asyncio', detail: 'Python 3.11', color: 'from-yellow-500/20 to-yellow-600/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
              { name: 'Docker', detail: 'Compose', color: 'from-sky-500/20 to-sky-600/10', text: 'text-sky-400', border: 'border-sky-500/20' },
            ].map(({ name, detail, color, text, border }) => (
              <div
                key={name}
                className={`glass rounded-xl p-4 text-center border ${border}
                            bg-gradient-to-br ${color} hover:scale-105 transition-transform duration-200`}
              >
                <div className={`font-bold text-sm ${text}`}>{name}</div>
                <div className="text-xs text-slate-500 mt-1">{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass rounded-2xl p-10 border border-indigo-500/20 glow-indigo">
            <h2 className="text-3xl font-bold mb-4 gradient-text">
              Try the Interactive Demo
            </h2>
            <p className="text-slate-400 mb-8">
              See hybrid search and RAG in action — no API key required.
              The demo simulates realistic retrieval and generation.
            </p>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500
                         text-white font-semibold rounded-xl transition-all duration-200
                         hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5"
            >
              Open Demo Chat
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
