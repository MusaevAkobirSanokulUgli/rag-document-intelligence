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
  Database,
  TrendingUp,
  Clock,
  Activity,
} from 'lucide-react'

type FeatureColor = ComponentProps<typeof FeatureCard>['color']

const FEATURES: Array<ComponentProps<typeof FeatureCard>> = [
  {
    icon: <Search className="w-5 h-5" />,
    title: 'Hybrid Search',
    description:
      'Combines semantic vector search with BM25 keyword retrieval. Fused using Reciprocal Rank Fusion for state-of-the-art retrieval accuracy.',
    badge: 'Core',
    color: 'cyan' as FeatureColor,
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Streaming Chat',
    description:
      'Real-time token streaming via Server-Sent Events. GPT-4o generates grounded answers with [Source N] citations from your documents.',
    badge: 'LLM',
    color: 'sky' as FeatureColor,
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Async Ingestion',
    description:
      'Concurrent document processing with asyncio.Semaphore rate limiting. Fire-and-forget upload with background indexing and status polling.',
    badge: 'Async',
    color: 'teal' as FeatureColor,
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: 'Multi-Format',
    description:
      'Supports PDF (pypdf), HTML, Markdown, plain text, and JSON. Intelligent text extraction with boilerplate removal.',
    badge: 'Docs',
    color: 'cyan' as FeatureColor,
  },
  {
    icon: <GitBranch className="w-5 h-5" />,
    title: 'Smart Chunking',
    description:
      'Three strategies: recursive (hierarchical separators), sentence-aware, and semantic. Configurable size and overlap per document.',
    badge: 'NLP',
    color: 'sky' as FeatureColor,
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: 'Pydantic v2',
    description:
      'Full validation with ConfigDict, field_validator, and strict typing. Pydantic BaseSettings for 12-factor config management.',
    badge: 'Validation',
    color: 'blue' as FeatureColor,
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Production Ready',
    description:
      'Docker Compose with health checks, non-root container user, CORS middleware, structured logging, and graceful lifespan shutdown.',
    badge: 'DevOps',
    color: 'teal' as FeatureColor,
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: 'Provider Agnostic',
    description:
      'EmbeddingProvider Protocol enables hot-swapping OpenAI for local sentence-transformers. ChromaDB falls back to EphemeralClient for CI.',
    badge: 'Design',
    color: 'sky' as FeatureColor,
  },
]

const UPLOAD_EXAMPLE = `# Upload a document
curl -X POST http://localhost:8000/api/v1/documents/upload \\
  -F "file=@technical_spec.pdf" \\
  -F "title=Q4 Architecture RFC" \\
  -F "chunking_strategy=recursive"

# Response (immediate — indexing runs async)
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
  "results": [
    {
      "chunk_id": "a1b2c3d4_f3e2a1b0",
      "content": "The JWT authentication middleware validates...",
      "score": 0.847,
      "metadata": { "chunk_index": "12" }
    }
  ],
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
data: " [Source 1],"
data: " the JWT middleware..."
data: [DONE]`

const METRICS = [
  { value: '< 30ms', label: 'Hybrid Search', icon: <Clock className="w-4 h-4" /> },
  { value: 'RRF', label: 'Rank Fusion', icon: <TrendingUp className="w-4 h-4" /> },
  { value: '3', label: 'Chunk Strategies', icon: <Layers className="w-4 h-4" /> },
  { value: 'SSE', label: 'Stream Protocol', icon: <Activity className="w-4 h-4" /> },
]

const TECH_ITEMS = [
  { name: 'FastAPI', detail: '0.115', colorClass: 'text-teal-400 border-teal-500/20 bg-teal-500/5' },
  { name: 'Pydantic v2', detail: '2.9+', colorClass: 'text-rose-400 border-rose-500/20 bg-rose-500/5' },
  { name: 'OpenAI', detail: 'GPT-4o', colorClass: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5' },
  { name: 'ChromaDB', detail: 'Vector DB', colorClass: 'text-orange-400 border-orange-500/20 bg-orange-500/5' },
  { name: 'asyncio', detail: 'Python 3.11', colorClass: 'text-sky-400 border-sky-500/20 bg-sky-500/5' },
  { name: 'Docker', detail: 'Compose', colorClass: 'text-blue-400 border-blue-500/20 bg-blue-500/5' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#020617] grid-bg">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]
                        bg-cyan-500/6 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-72 h-72 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-teal-500/4 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full
                          bg-cyan-500/5 border border-cyan-500/20 text-cyan-400/80 text-xs
                          font-mono mb-10 tracking-wide">
            <span className="status-active flex-shrink-0" />
            Production-Grade · Senior Python + AI Engineer Portfolio
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
            <span className="gradient-text">RAG Document</span>
            <br />
            <span className="text-slate-100">Intelligence</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-slate-400 mb-3 max-w-2xl mx-auto leading-relaxed">
            Production-grade pipeline with{' '}
            <span className="text-cyan-400 font-medium">hybrid semantic + BM25 search</span>,
            async document ingestion, and{' '}
            <span className="text-sky-400 font-medium">GPT-4o streaming chat</span>.
          </p>

          <p className="text-sm text-slate-600 mb-10 font-mono tracking-wide">
            FastAPI · Pydantic v2 · ChromaDB · OpenAI · asyncio · Docker
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/demo"
              className="btn-cyan inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold"
            >
              Upload & Chat Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/architecture"
              className="inline-flex items-center gap-2 px-7 py-3.5 glass-card hover:border-cyan-500/25
                         text-slate-300 font-semibold rounded-xl transition-all duration-200
                         hover:-translate-y-0.5 text-sm border border-slate-800/80"
            >
              Architecture
              <Layers className="w-4 h-4 text-cyan-500" />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 glass-card hover:border-cyan-500/20
                         text-slate-400 font-semibold rounded-xl transition-all duration-200
                         hover:-translate-y-0.5 text-sm border border-slate-800/80"
            >
              View Source
              <GitBranch className="w-4 h-4" />
            </a>
          </div>

          {/* Scroll hint */}
          <div className="mt-16 flex flex-col items-center gap-2">
            <div className="text-[11px] text-slate-700 font-mono uppercase tracking-widest">scroll</div>
            <ChevronDown className="w-4 h-4 text-slate-700 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Metrics Strip */}
      <section className="py-10 px-4 border-y border-cyan-500/8">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {METRICS.map(({ value, label, icon }) => (
            <div key={label} className="metric-card rounded-xl p-5 text-center">
              <div className="flex justify-center mb-2 text-cyan-500/60">{icon}</div>
              <div className="text-2xl font-bold gradient-text mb-1 font-mono">{value}</div>
              <div className="text-xs text-slate-600">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture Preview */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-cyan-500/60
                            uppercase tracking-widest mb-3">
              <Database className="w-3.5 h-3.5" />
              System Design
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-100">
              System Architecture
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">
              Every component is designed for production — async throughout, provider-agnostic
              abstractions, and clean separation of concerns.
            </p>
          </div>
          <ArchitectureDiagram compact />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 border-t border-cyan-500/6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-cyan-500/60
                            uppercase tracking-widest mb-3">
              <BarChart3 className="w-3.5 h-3.5" />
              Capabilities
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-100">
              What This Demonstrates
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">
              Every capability a Senior Python + AI Engineer needs to show.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* How Hybrid Search Works */}
      <section className="py-20 px-4 border-t border-cyan-500/6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-cyan-500/60
                            uppercase tracking-widest mb-3">
              <Search className="w-3.5 h-3.5" />
              Algorithm
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-100">
              How Hybrid Search Works
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">
              Reciprocal Rank Fusion consistently outperforms either search approach alone —
              no score normalization required.
            </p>
          </div>

          <div className="glass-card rounded-xl p-8 border border-cyan-500/12">
            <div className="flex flex-col md:flex-row items-start gap-8">
              {/* Flow steps */}
              <div className="flex-1 space-y-5">
                {[
                  {
                    num: '01',
                    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
                    title: 'Semantic Search',
                    desc: 'Query embedded via text-embedding-3-small → cosine similarity in ChromaDB HNSW index',
                  },
                  {
                    num: '02',
                    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
                    title: 'BM25 Keyword Search',
                    desc: 'Tokenized query → TF-IDF scoring over in-memory inverted index (run concurrently)',
                  },
                  {
                    num: '03',
                    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
                    title: 'RRF Fusion',
                    desc: 'score = α × 1/(k+rank_sem) + (1-α) × 1/(k+rank_bm25) — merged and re-ranked',
                  },
                  {
                    num: '04',
                    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                    title: 'LLM Generation',
                    desc: 'Top-k chunks injected as context → GPT-4o generates grounded answer with citations',
                  },
                ].map((step, i) => (
                  <div key={step.num} className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center
                                    flex-shrink-0 text-xs font-bold font-mono ${step.color}`}>
                      {step.num}
                    </div>
                    <div className="pt-0.5">
                      <div className="font-semibold text-slate-200 text-sm mb-0.5">{step.title}</div>
                      <div className="text-xs text-slate-500">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* RRF formula */}
              <div className="md:w-64 glass-dark rounded-xl p-5 border border-cyan-500/15">
                <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-3 font-mono">
                  RRF Formula
                </div>
                <div className="font-mono text-xs text-cyan-300 leading-relaxed">
                  <div className="text-slate-600 mb-1">{'// α = hybrid_alpha (0.7)'}</div>
                  <div className="text-slate-600 mb-3">{'// k = 60 (rank smoothing)'}</div>
                  <div className="text-slate-400">score =</div>
                  <div className="pl-4 text-cyan-300">α × 1/(k + rank_sem)</div>
                  <div className="text-slate-500">+</div>
                  <div className="pl-4 text-sky-300">(1-α) × 1/(k + rank_bm25)</div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800/80">
                  <div className="text-[10px] text-slate-600 mb-2 font-mono">Why it works:</div>
                  <ul className="text-[11px] text-slate-500 space-y-1">
                    <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-cyan-500/50" />No score normalization needed</li>
                    <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-cyan-500/50" />Handles different score scales</li>
                    <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-cyan-500/50" />Robust to outlier scores</li>
                    <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-cyan-500/50" />O(n) computation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API Code Examples */}
      <section className="py-20 px-4 border-t border-cyan-500/6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-cyan-500/60
                            uppercase tracking-widest mb-3">
              <Activity className="w-3.5 h-3.5" />
              API Reference
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-100">API Examples</h2>
            <p className="text-slate-500 text-sm">Clean REST API with full OpenAPI documentation.</p>
          </div>

          <div className="space-y-5">
            <CodeBlock title="Upload Document" language="bash" code={UPLOAD_EXAMPLE} />
            <CodeBlock title="Hybrid Search" language="bash" code={SEARCH_EXAMPLE} />
            <CodeBlock title="Streaming Chat" language="bash" code={CHAT_EXAMPLE} />
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-4 border-t border-cyan-500/6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-100">Tech Stack</h2>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {TECH_ITEMS.map(({ name, detail, colorClass }) => (
              <div
                key={name}
                className={`glass-card rounded-xl p-4 text-center border hover:scale-105
                            transition-transform duration-200 ${colorClass}`}
              >
                <div className={`font-bold text-xs font-mono`}>{name}</div>
                <div className="text-[10px] text-slate-600 mt-1">{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-cyan-500/6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card rounded-2xl p-10 border border-cyan-500/15 glow-cyan">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-cyan-500/60
                            uppercase tracking-widest mb-4">
              <span className="status-active" />
              Interactive Demo Ready
            </div>
            <h2 className="text-3xl font-bold mb-3 gradient-text">
              Try the Interactive Demo
            </h2>
            <p className="text-slate-500 mb-8 text-sm max-w-md mx-auto">
              Upload your own PDF or document, watch it get chunked in real-time,
              then ask questions with full RAG and source citations.
            </p>
            <Link
              href="/demo"
              className="btn-cyan inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold"
            >
              Upload Document & Chat
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
