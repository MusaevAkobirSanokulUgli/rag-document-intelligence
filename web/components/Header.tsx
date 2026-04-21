'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Database, GitBranch, Activity } from 'lucide-react'

const NAV_LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/demo', label: 'Live Demo' },
  { href: '/architecture', label: 'Architecture' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-cyan-500/10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/30
                          flex items-center justify-center group-hover:bg-cyan-500/20
                          transition-all duration-200">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-cyan-400 rounded-full
                             opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-slate-200 text-xs leading-none tracking-wide">
              RAG<span className="text-cyan-400">·</span>INTELLIGENCE
            </span>
            <span className="text-[10px] text-slate-600 leading-none mt-0.5 font-mono">
              document intelligence system
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                  ${isActive
                    ? 'nav-active'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                  }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full
                          bg-cyan-500/5 border border-cyan-500/15 text-xs text-slate-500">
            <Activity className="w-3 h-3 text-cyan-500" />
            <span className="font-mono">v1.0.0</span>
          </div>

          {/* GitHub */}
          <a
            href="https://github.com/MusaevAkobirSanokulUgli/rag-document-intelligence"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-slate-500
                       hover:text-slate-300 hover:bg-white/[0.04] transition-all duration-200"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span className="hidden sm:block">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  )
}
