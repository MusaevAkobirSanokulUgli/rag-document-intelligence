'use client'

import { ArrowDown, ArrowRight, Database, Cpu, Search, FileText, Zap, GitMerge } from 'lucide-react'

interface ArchitectureDiagramProps {
  compact?: boolean
}

const PIPELINE_LAYERS = [
  {
    label: 'Client',
    icon: <Zap className="w-4 h-4" />,
    items: ['curl / HTTP client', 'Next.js frontend', 'SSE consumer'],
    color: 'from-slate-700/40 to-slate-800/40 border-slate-600/30',
    textColor: 'text-slate-400',
  },
  {
    label: 'FastAPI (ASGI)',
    icon: <Cpu className="w-4 h-4" />,
    items: ['Pydantic v2 validation', 'CORS middleware', 'lifespan context', 'OpenAPI docs'],
    color: 'from-teal-900/30 to-teal-800/20 border-teal-600/30',
    textColor: 'text-teal-400',
  },
  {
    label: 'Service Layer',
    icon: <GitMerge className="w-4 h-4" />,
    items: ['IngestionPipeline', 'HybridRetriever (RRF)', 'RAGChain + streaming', 'EmbeddingService'],
    color: 'from-indigo-900/30 to-indigo-800/20 border-indigo-600/30',
    textColor: 'text-indigo-400',
  },
  {
    label: 'Storage',
    icon: <Database className="w-4 h-4" />,
    items: ['ChromaDB (cosine/HNSW)', 'BM25 in-memory index', 'Document registry'],
    color: 'from-purple-900/30 to-purple-800/20 border-purple-600/30',
    textColor: 'text-purple-400',
  },
]

const HYBRID_FLOW = [
  { label: 'User Query', bg: 'bg-slate-700/40 border-slate-600/30', text: 'text-slate-300' },
  { label: 'Embed → Vec Search', bg: 'bg-indigo-900/40 border-indigo-600/30', text: 'text-indigo-300' },
  { label: 'Tokenize → BM25', bg: 'bg-purple-900/40 border-purple-600/30', text: 'text-purple-300' },
  { label: 'RRF Fusion', bg: 'bg-emerald-900/40 border-emerald-600/30', text: 'text-emerald-300' },
  { label: 'LLM Generation', bg: 'bg-yellow-900/40 border-yellow-600/30', text: 'text-yellow-300' },
  { label: 'Grounded Answer', bg: 'bg-cyan-900/40 border-cyan-600/30', text: 'text-cyan-300' },
]

export default function ArchitectureDiagram({ compact = false }: ArchitectureDiagramProps) {
  return (
    <div className="space-y-8">
      {/* RAG Pipeline Flow */}
      <div className="glass rounded-2xl p-6 md:p-8 border border-indigo-500/15">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
          <Search className="w-4 h-4 text-indigo-400" />
          RAG Pipeline — Query Flow
        </h3>

        {/* Horizontal flow */}
        <div className="flex flex-wrap items-center gap-2 justify-center">
          {HYBRID_FLOW.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div
                className={`px-3 py-2 rounded-lg border text-xs font-medium
                             ${step.bg} ${step.text} text-center min-w-[110px]`}
              >
                {step.label}
              </div>
              {i < HYBRID_FLOW.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Concurrent annotation */}
        <div className="mt-6 flex justify-center">
          <div className="flex items-start gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Vec Search runs concurrently with BM25 via asyncio.gather
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              RRF fusion: α × 1/(k+rank_sem) + (1-α) × 1/(k+rank_bm25)
            </div>
          </div>
        </div>
      </div>

      {/* System Layers */}
      <div className="glass rounded-2xl p-6 md:p-8 border border-purple-500/15">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-400" />
          System Layers
        </h3>

        <div className="flex flex-col gap-3">
          {PIPELINE_LAYERS.map((layer, i) => (
            <div key={layer.label}>
              <div
                className={`rounded-xl p-4 border bg-gradient-to-r ${layer.color}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={layer.textColor}>{layer.icon}</span>
                  <span className={`font-semibold text-sm ${layer.textColor}`}>
                    {layer.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {layer.items.map((item) => (
                    <span
                      key={item}
                      className="text-xs px-2 py-0.5 rounded bg-black/20 text-slate-400"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              {i < PIPELINE_LAYERS.length - 1 && (
                <div className="flex justify-center my-1">
                  <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ingestion pipeline (shown only in non-compact mode) */}
      {!compact && (
        <div className="glass rounded-2xl p-6 md:p-8 border border-emerald-500/15">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            Async Ingestion Pipeline
          </h3>

          <div className="flex flex-wrap items-center gap-2 justify-center">
            {[
              { label: 'Upload', detail: 'multipart/form-data', color: 'border-slate-600/30 text-slate-300' },
              { label: 'Extract', detail: 'PDF / HTML / TXT', color: 'border-cyan-600/30 text-cyan-300' },
              { label: 'Clean', detail: 'normalize text', color: 'border-blue-600/30 text-blue-300' },
              { label: 'Chunk', detail: '3 strategies', color: 'border-indigo-600/30 text-indigo-300' },
              { label: 'Embed', detail: 'batch=100', color: 'border-purple-600/30 text-purple-300' },
              { label: 'Index', detail: 'ChromaDB + BM25', color: 'border-emerald-600/30 text-emerald-300' },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className={`glass border rounded-lg px-3 py-2 text-center min-w-[90px] ${step.color}`}>
                  <div className="text-xs font-semibold">{step.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{step.detail}</div>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 text-center mt-4">
            Upload returns immediately (status=pending) · Semaphore(5) limits concurrent ingestions ·
            asyncio.create_task runs pipeline in background
          </p>
        </div>
      )}
    </div>
  )
}
