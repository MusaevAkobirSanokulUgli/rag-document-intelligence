'use client'

import { ArrowDown, ArrowRight, Database, Cpu, Search, FileText, Zap, GitMerge } from 'lucide-react'

interface ArchitectureDiagramProps {
  compact?: boolean
}

const PIPELINE_LAYERS = [
  {
    label: 'Client Layer',
    icon: <Zap className="w-3.5 h-3.5" />,
    items: ['curl / HTTP', 'Next.js UI', 'SSE consumer'],
    color: 'border-slate-700/50 bg-slate-800/20',
    textColor: 'text-slate-400',
    dotColor: 'bg-slate-500',
  },
  {
    label: 'FastAPI (ASGI)',
    icon: <Cpu className="w-3.5 h-3.5" />,
    items: ['Pydantic v2', 'CORS', 'lifespan ctx', 'OpenAPI'],
    color: 'border-teal-500/25 bg-teal-900/10',
    textColor: 'text-teal-400',
    dotColor: 'bg-teal-500',
  },
  {
    label: 'Service Layer',
    icon: <GitMerge className="w-3.5 h-3.5" />,
    items: ['IngestionPipeline', 'HybridRetriever', 'RAGChain', 'EmbeddingService'],
    color: 'border-cyan-500/25 bg-cyan-900/10',
    textColor: 'text-cyan-400',
    dotColor: 'bg-cyan-500',
  },
  {
    label: 'Storage',
    icon: <Database className="w-3.5 h-3.5" />,
    items: ['ChromaDB HNSW', 'BM25 index', 'Doc registry'],
    color: 'border-sky-500/25 bg-sky-900/10',
    textColor: 'text-sky-400',
    dotColor: 'bg-sky-500',
  },
]

const HYBRID_FLOW = [
  { label: 'User Query', bg: 'bg-slate-800/60 border-slate-700/40', text: 'text-slate-300' },
  { label: 'Vec Embed', bg: 'bg-cyan-900/30 border-cyan-600/25', text: 'text-cyan-300' },
  { label: 'BM25 Rank', bg: 'bg-sky-900/30 border-sky-600/25', text: 'text-sky-300' },
  { label: 'RRF Fusion', bg: 'bg-teal-900/30 border-teal-600/25', text: 'text-teal-300' },
  { label: 'GPT-4o', bg: 'bg-blue-900/30 border-blue-600/25', text: 'text-blue-300' },
  { label: 'Answer + Citations', bg: 'bg-cyan-900/30 border-cyan-500/40', text: 'text-cyan-300' },
]

export default function ArchitectureDiagram({ compact = false }: ArchitectureDiagramProps) {
  return (
    <div className="space-y-6">
      {/* RAG Pipeline Flow */}
      <div className="glass-card rounded-xl p-6 border border-cyan-500/12">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          <Search className="w-3.5 h-3.5 text-cyan-500" />
          RAG Pipeline — Query Flow
        </h3>

        <div className="flex flex-wrap items-center gap-2 justify-center">
          {HYBRID_FLOW.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div
                className={`px-3 py-2 rounded-lg border text-xs font-medium
                             ${step.bg} ${step.text} text-center min-w-[96px] font-mono`}
              >
                {step.label}
              </div>
              {i < HYBRID_FLOW.length - 1 && (
                <ArrowRight className="w-3 h-3 text-cyan-600/40 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/60" />
            Vec + BM25 run concurrently via asyncio.gather
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500/60" />
            RRF: α×1/(k+rank_sem) + (1-α)×1/(k+rank_bm25)
          </div>
        </div>
      </div>

      {/* System Layers */}
      <div className="glass-card rounded-xl p-6 border border-sky-500/12">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          <FileText className="w-3.5 h-3.5 text-sky-500" />
          System Layers
        </h3>

        <div className="flex flex-col gap-2">
          {PIPELINE_LAYERS.map((layer, i) => (
            <div key={layer.label}>
              <div className={`rounded-lg p-3.5 border ${layer.color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${layer.dotColor}`} />
                  <span className={`font-semibold text-xs ${layer.textColor} font-mono`}>
                    {layer.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {layer.items.map((item) => (
                    <span
                      key={item}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-black/20 text-slate-500 font-mono border border-white/[0.04]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              {i < PIPELINE_LAYERS.length - 1 && (
                <div className="flex justify-center my-1">
                  <ArrowDown className="w-3 h-3 text-cyan-600/25" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ingestion pipeline — non-compact only */}
      {!compact && (
        <div className="glass-card rounded-xl p-6 border border-teal-500/12">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            <Zap className="w-3.5 h-3.5 text-teal-500" />
            Async Ingestion Pipeline
          </h3>

          <div className="flex flex-wrap items-center gap-2 justify-center">
            {[
              { label: 'Upload', detail: 'multipart', color: 'border-slate-700/40 text-slate-400' },
              { label: 'Extract', detail: 'PDF/HTML/TXT', color: 'border-teal-600/25 text-teal-400' },
              { label: 'Clean', detail: 'normalize', color: 'border-cyan-600/25 text-cyan-400' },
              { label: 'Chunk', detail: '3 strategies', color: 'border-sky-600/25 text-sky-400' },
              { label: 'Embed', detail: 'batch=100', color: 'border-blue-600/25 text-blue-400' },
              { label: 'Index', detail: 'Chroma+BM25', color: 'border-teal-600/35 text-teal-300' },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className={`glass-dark border rounded-lg px-3 py-2 text-center min-w-[80px] ${step.color}`}>
                  <div className="text-[11px] font-semibold font-mono">{step.label}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{step.detail}</div>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-cyan-600/30 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-700 text-center mt-4 font-mono">
            Upload returns immediately (status=pending) · Semaphore(5) limits concurrency · asyncio.create_task runs pipeline
          </p>
        </div>
      )}
    </div>
  )
}
