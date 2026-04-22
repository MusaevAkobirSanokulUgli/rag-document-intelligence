import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LiveRAG from "@/components/LiveRAG";
import { ArrowLeft, Flame } from "lucide-react";

export const metadata = {
  title: "Live Demo — RAG Document Intelligence",
  description: "Real retrieval-augmented generation powered by DeepSeek.",
};

export default function LivePage() {
  return (
    <div className="min-h-screen bg-[#020617] grid-bg">
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/demo" className="inline-flex items-center gap-2 text-sm mb-6" style={{ color: "#64748B" }}>
            <ArrowLeft className="w-4 h-4" /> Back to Architecture Overview
          </Link>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
              style={{ backgroundColor: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.3)", color: "#7DD3FC" }}>
              <Flame className="w-3 h-3" /> Live DeepSeek-Powered RAG
            </div>
            <h1 className="text-3xl sm:text-4xl font-black mb-3" style={{ color: "#F0F9FF" }}>
              Document Q&A with Hybrid Retrieval
            </h1>
            <p className="text-sm max-w-2xl" style={{ color: "#94A3B8" }}>
              O'zingizning hujjatingizni paste qiling, savol yozing. Tizim 800-token chunk'larga bo'ladi,
              BM25 + keyword overlap orqali top-K retrieval qiladi, keyin DeepSeek grounded javob beradi
              [Source N] citationlar bilan.
            </p>
          </div>

          <LiveRAG />
        </div>
      </main>
      <Footer />
    </div>
  );
}
