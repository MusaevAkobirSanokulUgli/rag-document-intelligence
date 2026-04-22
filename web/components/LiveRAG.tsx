"use client";

import { useState } from "react";
import { Loader2, FileText, Search, Cpu, AlertTriangle, Zap } from "lucide-react";

const inputStyle: React.CSSProperties = {
  backgroundColor: "rgba(2,6,23,0.8)",
  border: "1px solid rgba(56,189,248,0.25)",
  color: "#F0F9FF",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 14,
  width: "100%",
};

const SAMPLE_DOC = `AsyncIO is Python's built-in library for writing concurrent code using the async/await syntax. It was introduced in Python 3.4 and is designed for I/O-bound tasks. The event loop is the core of every asyncio application — it runs asynchronous tasks and callbacks, performs network IO operations, and runs subprocesses.

A coroutine is a specialized version of a Python generator function. It can be scheduled to run concurrently in an event loop. You create a coroutine by using the async def syntax. Calling a coroutine function does not execute it — it returns a coroutine object that must be awaited or scheduled.

Tasks are used to schedule coroutines concurrently. Use asyncio.create_task() to wrap a coroutine in a Task. Tasks run in the event loop until they complete or are cancelled. asyncio.gather() can be used to run multiple coroutines concurrently and wait for all of them to finish.

The new TaskGroup (Python 3.11+) provides structured concurrency — if any task fails, all sibling tasks are cancelled automatically. It is considered the modern replacement for asyncio.gather() in most cases. TaskGroup makes error propagation cleaner and prevents leaked tasks.

Performance-wise, asyncio shines for I/O-bound workloads such as HTTP servers, websockets, database clients, and file IO. For CPU-bound work, use multiprocessing or run blocking code in a thread executor via asyncio.to_thread() to avoid blocking the event loop.`;

export default function LiveRAG() {
  const [docText, setDocText] = useState("");
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!docText.trim() || !question.trim() || loading) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: docText, question, topK }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setResult(data);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <div className="rounded-2xl p-6 space-y-5" style={{ backgroundColor: "rgba(2,6,23,0.6)", border: "1px solid rgba(56,189,248,0.2)" }}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#64748B" }}>
            1. Document Text (o'zingiz paste qiling)
          </label>
          <button onClick={() => setDocText(SAMPLE_DOC)}
            className="text-xs px-2 py-1 rounded"
            style={{ color: "#38BDF8", backgroundColor: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)" }}>
            Sample hujjat yuklash
          </button>
        </div>
        <textarea value={docText} onChange={(e) => setDocText(e.target.value)} rows={8}
          placeholder="PDF, DOCX, TXT ekstraktini bu yerga paste qiling. Tizim uni 800-token chunk'larga bo'ladi."
          style={{ ...inputStyle, resize: "vertical", minHeight: 180, fontFamily: "monospace" }} />
        <div className="text-xs mt-1" style={{ color: "#64748B" }}>{docText.length} chars</div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: "#64748B" }}>
          2. Savol (ozingiz yozing)
        </label>
        <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
          placeholder="Masalan: TaskGroup qaysi Python versiyasida qo'shildi?"
          style={inputStyle} />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: "#64748B" }}>
          Top-K chunks: <span style={{ color: "#38BDF8" }}>{topK}</span>
        </label>
        <input type="range" min={1} max={8} step={1} value={topK}
          onChange={(e) => setTopK(parseInt(e.target.value))} style={{ width: "100%" }} />
      </div>

      <button onClick={run} disabled={loading || !docText.trim() || !question.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
        style={{
          background: loading ? "rgba(56,189,248,0.2)" : "linear-gradient(135deg, #0EA5E9, #38BDF8)",
          color: "#0C4A6E",
        }}>
        {loading ? <><Loader2 className="animate-spin w-4 h-4" /> Retrieving + Generating...</> : <><Zap className="w-4 h-4" /> Run RAG Pipeline</>}
      </button>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
          style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <Stat label="Chunks" value={result.stats.chunk_count} />
            <Stat label="Chunking" value={`${result.stats.chunking_ms}ms`} />
            <Stat label="Retrieval" value={`${result.stats.retrieval_ms}ms`} />
            <Stat label="Generation" value={`${result.stats.generation_ms}ms`} />
          </div>

          <div className="rounded-xl p-5" style={{ backgroundColor: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.25)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4" style={{ color: "#38BDF8" }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#7DD3FC" }}>Answer</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#E0F2FE", whiteSpace: "pre-wrap" }}>{result.answer}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4" style={{ color: "#38BDF8" }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#7DD3FC" }}>Retrieved Sources ({result.sources.length})</span>
            </div>
            <div className="space-y-2">
              {(result.sources as any[]).map((s) => (
                <div key={s.id} className="rounded-lg p-3"
                  style={{ backgroundColor: "rgba(2,6,23,0.6)", border: "1px solid rgba(56,189,248,0.15)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold" style={{ color: "#38BDF8" }}>Source {s.id}</span>
                    <span className="text-xs" style={{ color: "#64748B" }}>score: {s.score}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>{s.excerpt}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(2,6,23,0.6)", border: "1px solid rgba(56,189,248,0.1)" }}>
      <div className="font-bold" style={{ color: "#38BDF8" }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: "#64748B" }}>{label}</div>
    </div>
  );
}
