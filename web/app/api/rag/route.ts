import { NextRequest, NextResponse } from "next/server";
import { chatComplete, DeepSeekError } from "@/lib/deepseek";

export const runtime = "nodejs";
export const maxDuration = 90;

function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= chunkSize) return [normalized];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end === normalized.length) break;
    start = end - overlap;
  }
  return chunks;
}

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((t) => t.length > 2);
}

function bm25Score(query: string[], doc: string, corpus: string[]): number {
  const k1 = 1.5, b = 0.75;
  const docTokens = tokenize(doc);
  const avgDocLen = corpus.reduce((s, d) => s + tokenize(d).length, 0) / Math.max(corpus.length, 1);
  const docLen = docTokens.length || 1;
  let score = 0;
  for (const term of query) {
    const tf = docTokens.filter((t) => t === term).length;
    if (tf === 0) continue;
    const df = corpus.filter((d) => tokenize(d).includes(term)).length;
    const idf = Math.log((corpus.length - df + 0.5) / (df + 0.5) + 1);
    score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLen))));
  }
  return score;
}

function keywordOverlap(query: string[], doc: string): number {
  const docSet = new Set(tokenize(doc));
  return query.filter((t) => docSet.has(t)).length / Math.max(query.length, 1);
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const docText = (body?.document ?? "").toString();
  const question = (body?.question ?? "").toString().trim();
  const topK = Math.max(1, Math.min(8, Number(body?.topK ?? 3)));

  if (!docText.trim()) return NextResponse.json({ error: "document text required" }, { status: 400 });
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });
  if (docText.length > 200_000) return NextResponse.json({ error: "document too large (max 200k chars)" }, { status: 413 });

  const t0 = Date.now();
  const chunks = chunkText(docText, 800, 100);
  const chunkTime = Date.now() - t0;

  const t1 = Date.now();
  const qTokens = tokenize(question);
  const scored = chunks.map((c, i) => ({
    id: i,
    text: c,
    bm25: bm25Score(qTokens, c, chunks),
    overlap: keywordOverlap(qTokens, c),
  }));
  for (const s of scored) (s as any).score = 0.6 * s.bm25 + 0.4 * s.overlap;
  scored.sort((a: any, b: any) => b.score - a.score);
  const top = scored.slice(0, topK);
  const retrievalTime = Date.now() - t1;

  const context = top
    .map((c, idx) => `[Source ${idx + 1}]\n${c.text}`)
    .join("\n\n---\n\n");

  const system = `You are a document Q&A assistant. Answer using ONLY the provided sources. Cite sources as [Source N] inline where relevant. If the sources do not contain the answer, say so.`;
  const user = `Sources:\n\n${context}\n\nQuestion: ${question}`;

  try {
    const r = await chatComplete(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.2, max_tokens: 800 }
    );
    return NextResponse.json({
      answer: r.content,
      sources: top.map((c, idx) => ({ id: idx + 1, score: (c as any).score.toFixed(3), excerpt: c.text.slice(0, 300) + (c.text.length > 300 ? "..." : "") })),
      stats: {
        chunk_count: chunks.length,
        chunking_ms: chunkTime,
        retrieval_ms: retrievalTime,
        generation_ms: r.latency_ms,
        total_tokens: r.usage.total_tokens,
      },
    });
  } catch (e) {
    if (e instanceof DeepSeekError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
