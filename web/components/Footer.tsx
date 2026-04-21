import Link from 'next/link'
import { Database, GitBranch, ExternalLink } from 'lucide-react'

const TECH_STACK = [
  { name: 'FastAPI', color: 'text-teal-400 border-teal-500/20 bg-teal-500/5' },
  { name: 'Pydantic v2', color: 'text-rose-400 border-rose-500/20 bg-rose-500/5' },
  { name: 'ChromaDB', color: 'text-orange-400 border-orange-500/20 bg-orange-500/5' },
  { name: 'GPT-4o', color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5' },
  { name: 'asyncio', color: 'text-sky-400 border-sky-500/20 bg-sky-500/5' },
  { name: 'Docker', color: 'text-blue-400 border-blue-500/20 bg-blue-500/5' },
]

export default function Footer() {
  return (
    <footer className="border-t border-cyan-500/8 bg-[#020617]">
      {/* Top section */}
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/25
                              flex items-center justify-center">
                <Database className="w-3 h-3 text-cyan-400" />
              </div>
              <span className="font-bold text-slate-300 text-sm tracking-wide">
                RAG Document Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs">
              Production-grade Retrieval-Augmented Generation pipeline demonstrating
              senior Python and AI engineering capabilities.
            </p>
          </div>

          {/* Navigation column */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Navigation
            </div>
            <div className="space-y-2">
              {[
                { href: '/', label: 'Overview' },
                { href: '/demo', label: 'Live Demo' },
                { href: '/architecture', label: 'Architecture' },
              ].map(({ href, label }) => (
                <div key={href}>
                  <Link
                    href={href}
                    className="text-xs text-slate-500 hover:text-cyan-400 transition-colors duration-150"
                  >
                    {label}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Resources column */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Resources
            </div>
            <div className="space-y-2">
              <a
                href="https://github.com/MusaevAkobirSanokulUgli/rag-document-intelligence"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors duration-150"
              >
                <GitBranch className="w-3 h-3" />
                Source Code
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Tech stack */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TECH_STACK.map((tech) => (
            <span
              key={tech.name}
              className={`px-2 py-0.5 text-[10px] font-mono rounded border ${tech.color}`}
            >
              {tech.name}
            </span>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center
                        justify-between gap-3">
          <p className="text-[11px] text-slate-700 font-mono">
            FastAPI · Pydantic v2 · asyncio · RAG · Hybrid Search · SSE Streaming
          </p>
          <p className="text-[11px] text-slate-700">
            Portfolio — Senior Python + AI Engineer
          </p>
        </div>
      </div>
    </footer>
  )
}
