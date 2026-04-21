'use client'

import { useState } from 'react'
import { Copy, Check, Terminal } from 'lucide-react'

interface CodeBlockProps {
  title: string
  language: string
  code: string
}

function tokenize(code: string, language: string): string {
  if (language === 'bash') {
    return code
      .replace(/(#.+$)/gm, '<span class="text-slate-600 italic">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-teal-300">$1</span>')
      .replace(/(\'(?:[^\'\\]|\\.)*\')/g, '<span class="text-teal-300">$1</span>')
      .replace(/\b(curl|POST|GET|DELETE|PUT|PATCH)\b/g, '<span class="text-cyan-400 font-semibold">$1</span>')
      .replace(/(-[A-Za-z]+|--[a-z-]+)/g, '<span class="text-sky-300">$1</span>')
      .replace(/(https?:\/\/[^\s"\\]+)/g, '<span class="text-cyan-300">$1</span>')
      .replace(/(\{|\}|\[|\])/g, '<span class="text-slate-500">$1</span>')
      .replace(/"([^"<>{}[\]]+)":/g, '<span class="text-sky-300">"$1"</span>:')
  }

  if (language === 'python') {
    return code
      .replace(/(#.+$)/gm, '<span class="text-slate-600 italic">$1</span>')
      .replace(/("""[\s\S]*?""")/g, '<span class="text-teal-300/80">$1</span>')
      .replace(/\b(async|await|def|class|return|from|import|if|else|elif|for|in|not|and|or|True|False|None|with|yield|raise|try|except|finally|pass|break|continue|lambda|as|is)\b/g,
        '<span class="text-cyan-400 font-medium">$1</span>')
      .replace(/\b(self|cls)\b/g, '<span class="text-orange-300">$1</span>')
      .replace(/(f?"|')(?:[^"'\\]|\\.)*\1/g, '<span class="text-teal-300">$&</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-sky-300">$1</span>')
      .replace(/(@\w+)/g, '<span class="text-pink-400">$1</span>')
      .replace(/\b(str|int|float|bool|list|dict|tuple|UUID|None|datetime|Optional|List|Dict|Any|Union)\b/g,
        '<span class="text-sky-400">$1</span>')
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
    <div className="glass-card rounded-xl overflow-hidden border border-cyan-500/10">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5
                      bg-navy-900/80 border-b border-cyan-500/8">
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Terminal className="w-3 h-3" />
            <span className="text-xs font-mono text-slate-400">{title}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-700 uppercase tracking-wider font-mono">{language}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400
                       px-2.5 py-1 rounded-md bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10
                       hover:border-cyan-500/20 transition-all duration-150"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-teal-400" />
                <span className="text-teal-400">Copied</span>
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
        <pre className="p-5 text-sm code-block leading-relaxed bg-[#020617]">
          <code
            dangerouslySetInnerHTML={{ __html: highlighted }}
            className="text-slate-400"
          />
        </pre>
      </div>
    </div>
  )
}
