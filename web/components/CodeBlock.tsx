'use client'

import { useState } from 'react'
import { Copy, Check, Terminal } from 'lucide-react'

interface CodeBlockProps {
  title: string
  language: string
  code: string
}

// Minimal syntax highlighter — no external deps, uses regex token colorization
function tokenize(code: string, language: string): string {
  if (language === 'bash') {
    return code
      .replace(/(&amp;|&lt;|&gt;)/g, (m) => m) // keep entities
      .replace(/(#.+$)/gm, '<span class="text-slate-500">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-emerald-300">$1</span>')
      .replace(/(\'(?:[^\'\\]|\\.)*\')/g, '<span class="text-emerald-300">$1</span>')
      .replace(/\b(curl|POST|GET|DELETE|PUT)\b/g, '<span class="text-indigo-400 font-semibold">$1</span>')
      .replace(/(-[A-Za-z]+|--[a-z-]+)/g, '<span class="text-yellow-300">$1</span>')
      .replace(/(https?:\/\/[^\s]+)/g, '<span class="text-cyan-300">$1</span>')
      .replace(/(\{|\}|\[|\])/g, '<span class="text-slate-400">$1</span>')
      .replace(/"([^"]*)":/g, '<span class="text-sky-300">"$1"</span>:')
  }

  if (language === 'python') {
    return code
      .replace(/(#.+$)/gm, '<span class="text-slate-500 italic">$1</span>')
      .replace(/("""[\s\S]*?""")/g, '<span class="text-emerald-300/80">$1</span>')
      .replace(/\b(async|await|def|class|return|from|import|if|else|for|in|not|and|or|True|False|None|with|yield|raise|try|except)\b/g,
        '<span class="text-indigo-300 font-medium">$1</span>')
      .replace(/\b(self|cls)\b/g, '<span class="text-orange-300">$1</span>')
      .replace(/(f?"|')(?:[^"'\\]|\\.)*\1/g, '<span class="text-emerald-300">$&</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-yellow-300">$1</span>')
      .replace(/(@\w+)/g, '<span class="text-pink-400">$1</span>')
      .replace(/\b(str|int|float|bool|list|dict|tuple|UUID|None|datetime)\b/g,
        '<span class="text-cyan-300">$1</span>')
  }

  return code
}

export default function CodeBlock({ title, language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const highlighted = tokenize(
    code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;'),
    language
  )

  return (
    <div className="glass rounded-xl overflow-hidden border border-slate-700/50">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3
                      bg-slate-800/60 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Terminal className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{title}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-600 uppercase tracking-wider">{language}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200
                       px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700
                       transition-all duration-150"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className="p-5 text-sm code-block leading-relaxed">
          <code
            dangerouslySetInnerHTML={{ __html: highlighted }}
            className="text-slate-300"
          />
        </pre>
      </div>
    </div>
  )
}
