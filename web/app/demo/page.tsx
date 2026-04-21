'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ChatInterface from '@/components/ChatInterface'
import { FileText, Search, Cpu } from 'lucide-react'

export default function DemoPage() {
  return (
    <div className="min-h-screen grid-bg">
      <Header />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Page header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                            bg-emerald-500/10 border border-emerald-500/30
                            text-emerald-300 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Interactive Demo — Client-Side Simulation
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">RAG Chat Demo</span>
            </h1>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Experience the RAG pipeline in action. Ask questions about documents from a
              simulated knowledge base covering AI systems, FastAPI architecture, and more.
            </p>
          </div>

          {/* How it works strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {[
              {
                icon: <Search className="w-5 h-5 text-indigo-400" />,
                title: 'Hybrid Retrieval',
                desc: 'Semantic + BM25 search fused with RRF to find the most relevant chunks',
                bg: 'bg-indigo-500/10 border-indigo-500/20',
              },
              {
                icon: <FileText className="w-5 h-5 text-purple-400" />,
                title: 'Context Assembly',
                desc: 'Top-k chunks injected into the prompt with [Source N] reference markers',
                bg: 'bg-purple-500/10 border-purple-500/20',
              },
              {
                icon: <Cpu className="w-5 h-5 text-emerald-400" />,
                title: 'Grounded Generation',
                desc: 'GPT-4o generates answers citing specific sources from your documents',
                bg: 'bg-emerald-500/10 border-emerald-500/20',
              },
            ].map(({ icon, title, desc, bg }) => (
              <div key={title} className={`glass rounded-xl p-4 border ${bg} flex gap-3`}>
                <div className="flex-shrink-0 mt-0.5">{icon}</div>
                <div>
                  <div className="font-semibold text-slate-200 text-sm">{title}</div>
                  <div className="text-xs text-slate-400 mt-1">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Main chat interface */}
          <ChatInterface />
        </div>
      </main>

      <Footer />
    </div>
  )
}
