'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ChatInterface from '@/components/ChatInterface'
import { Search, FileText, Cpu, Zap, Database } from 'lucide-react'

const PIPELINE_STEPS = [
  {
    icon: <FileText className="w-4 h-4" />,
    title: 'Upload & Extract',
    desc: 'PDF, TXT, MD, DOCX parsed and text extracted with boilerplate removal',
    color: 'text-cyan-400 bg-cyan-500/8 border-cyan-500/20',
  },
  {
    icon: <Zap className="w-4 h-4" />,
    title: 'Chunk & Embed',
    desc: '512-token recursive chunks with 50-token overlap · OpenAI embeddings (1536d)',
    color: 'text-sky-400 bg-sky-500/8 border-sky-500/20',
  },
  {
    icon: <Search className="w-4 h-4" />,
    title: 'Hybrid Retrieval',
    desc: 'Semantic + BM25 search run concurrently · fused via Reciprocal Rank Fusion',
    color: 'text-teal-400 bg-teal-500/8 border-teal-500/20',
  },
  {
    icon: <Cpu className="w-4 h-4" />,
    title: 'Grounded Answer',
    desc: 'GPT-4o generates response with [Source N] citations from retrieved chunks',
    color: 'text-blue-400 bg-blue-500/8 border-blue-500/20',
  },
]

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#020617] grid-bg">
      <Header />

      <main className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">

          {/* Live DeepSeek banner */}
          <a href="/live" className="block mt-6 p-4 rounded-2xl transition-all hover:scale-[1.01]"
            style={{ background: "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(14,165,233,0.06))",
              border: "1px solid rgba(56,189,248,0.3)" }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: "#7DD3FC" }}>
                  🔥 Live DeepSeek-Powered RAG — Now Available
                </div>
                <div className="text-xs" style={{ color: "#94A3B8" }}>
                  Paste your own document, ask questions, get grounded answers with [Source N] citations.
                </div>
              </div>
              <span className="text-xs font-bold px-4 py-2 rounded-xl" style={{ background: "#38BDF8", color: "#0C4A6E" }}>
                Try it →
              </span>
            </div>
          </a>

          {/* Page header */}
          <div className="pt-6 pb-8">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-cyan-500/60" />
              <span className="text-xs font-mono text-cyan-500/50 uppercase tracking-widest">
                Interactive Demo
              </span>
            </div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2">
                  Document<span className="gradient-text"> RAG Chat</span>
                </h1>
                <p className="text-slate-500 text-sm max-w-lg">
                  Upload any document — the system chunks it, embeds it, then answers questions
                  using hybrid search with real source citations.
                </p>
              </div>

              {/* Pipeline steps pill row */}
              <div className="hidden lg:flex items-center gap-2">
                {PIPELINE_STEPS.map((step, i) => (
                  <div key={step.title} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border
                                    text-[11px] font-medium ${step.color}`}>
                      {step.icon}
                      <span>{step.title}</span>
                    </div>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <span className="text-slate-700">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pipeline steps — mobile */}
          <div className="lg:hidden grid grid-cols-2 gap-3 mb-6">
            {PIPELINE_STEPS.map((step) => (
              <div key={step.title}
                className={`glass-card rounded-xl p-3.5 border flex gap-2.5 ${step.color}`}>
                <div className="flex-shrink-0 mt-0.5">{step.icon}</div>
                <div>
                  <div className="text-[11px] font-semibold mb-0.5">{step.title}</div>
                  <div className="text-[10px] text-slate-600">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Main split-screen interface */}
          <ChatInterface />

          {/* Footer info */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-700 font-mono">
            <div className="flex items-center gap-4">
              <span>Embedding: text-embedding-3-small (1536d)</span>
              <span>·</span>
              <span>LLM: GPT-4o (simulated)</span>
              <span>·</span>
              <span>Vector DB: ChromaDB HNSW</span>
            </div>
            <span>Client-side simulation — production system connects to FastAPI backend</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
