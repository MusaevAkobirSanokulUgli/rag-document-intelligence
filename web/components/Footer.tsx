import Link from 'next/link'
import { Brain, GitBranch } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-indigo-500/10 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40
                            flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <span className="font-bold text-slate-300 text-sm">RAG Document Intelligence</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-300 transition-colors">Overview</Link>
            <Link href="/demo" className="hover:text-slate-300 transition-colors">Demo</Link>
            <Link href="/architecture" className="hover:text-slate-300 transition-colors">Architecture</Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-slate-300 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5" />
              Source
            </a>
          </div>

          {/* Stack badges */}
          <div className="flex flex-wrap gap-2 justify-center">
            {['FastAPI', 'Pydantic v2', 'ChromaDB', 'GPT-4o'].map((tech) => (
              <span
                key={tech}
                className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-400 border border-slate-700"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
          <p className="text-xs text-slate-600">
            Portfolio project demonstrating production-grade Python + AI engineering.
            FastAPI · Pydantic v2 · asyncio · RAG · Hybrid Search · Streaming LLM.
          </p>
        </div>
      </div>
    </footer>
  )
}
