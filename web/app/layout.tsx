import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RAG Document Intelligence — Production AI System',
  description:
    'Production-grade Retrieval-Augmented Generation pipeline with hybrid semantic + BM25 search, async document ingestion, and GPT-4o streaming. Built with FastAPI, Pydantic v2, ChromaDB, and Next.js.',
  keywords: [
    'RAG',
    'LLM',
    'FastAPI',
    'Python',
    'ChromaDB',
    'OpenAI',
    'hybrid search',
    'BM25',
    'vector database',
    'document intelligence',
  ],
  openGraph: {
    title: 'RAG Document Intelligence',
    description: 'Production-grade RAG pipeline with hybrid search and GPT-4o streaming',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#0f0f1a] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  )
}
