'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brain, GitBranch } from 'lucide-react'

const NAV_LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/demo', label: 'Demo' },
  { href: '/architecture', label: 'Architecture' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-indigo-500/10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40
                          flex items-center justify-center group-hover:bg-indigo-600/50
                          transition-colors duration-200">
            <Brain className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="font-bold text-slate-200 text-sm hidden sm:block">
            RAG<span className="text-indigo-400">·</span>Intelligence
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* GitHub link */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400
                     hover:text-slate-200 hover:bg-white/5 transition-all duration-200"
        >
          <GitBranch className="w-4 h-4" />
          <span className="hidden sm:block">GitHub</span>
        </a>
      </div>
    </header>
  )
}
