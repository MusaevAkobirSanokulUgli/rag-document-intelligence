# RAG Document Intelligence

![Python](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![Pydantic](https://img.shields.io/badge/Pydantic-v2-E92063?logo=pydantic)
![ChromaDB](https://img.shields.io/badge/ChromaDB-vector_store-orange)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)
![Tests](https://img.shields.io/badge/Tests-pytest_asyncio-green?logo=pytest)

A production-grade Retrieval-Augmented Generation (RAG) system with hybrid semantic + BM25 search, async document ingestion, streaming chat, and a Next.js portfolio frontend.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RAG Document Intelligence                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   Client (curl / web UI)                                             │
│         │                                                             │
│         ▼                                                             │
│   ┌─────────────┐                                                    │
│   │  FastAPI     │  ← async lifespan, CORS, OpenAPI docs            │
│   │  (ASGI)      │                                                    │
│   └──────┬──────┘                                                    │
│          │                                                             │
│   ┌──────▼──────────────────────────────┐                           │
│   │         API Routes (v1)              │                           │
│   │  /documents  /search  /chat  /health│                           │
│   └──────┬──────────────────────────────┘                           │
│          │                                                             │
│   ┌──────▼───────────────────────────────────────────────────┐     │
│   │                    Service Layer                           │     │
│   │                                                            │     │
│   │  ┌─────────────┐    ┌────────────────┐                  │     │
│   │  │  Ingestion   │    │   RAG Chain    │                  │     │
│   │  │  Pipeline    │    │  (query/stream)│                  │     │
│   │  └──────┬───────┘    └───────┬────────┘                  │     │
│   │         │                    │                            │     │
│   │  ┌──────▼──────┐  ┌─────────▼────────┐                  │     │
│   │  │  Embedding   │  │ Hybrid Retriever │                  │     │
│   │  │  Service     │  │                  │                  │     │
│   │  │  (OpenAI /   │  │  Semantic Search │                  │     │
│   │  │   Local)     │  │  +  BM25 Index   │                  │     │
│   │  └──────┬───────┘  │  → RRF Fusion   │                  │     │
│   │         │          └─────────┬────────┘                  │     │
│   │         │                    │                            │     │
│   │  ┌──────▼────────────────────▼──────┐                   │     │
│   │  │         VectorStoreService        │                   │     │
│   │  │         (ChromaDB / Ephemeral)    │                   │     │
│   │  └──────────────────────────────────┘                   │     │
│   └──────────────────────────────────────────────────────────┘     │
│                                                                       │
│   ┌────────────────────────────────────────────────────────────┐   │
│   │                    Utilities                                 │   │
│   │   TextExtractor (PDF/HTML/TXT)   TextChunker (3 strategies) │   │
│   └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

- **Async FastAPI** with lifespan context manager for clean resource management
- **Pydantic v2** — full model validation with `ConfigDict`, `field_validator`, and strict typing
- **Hybrid Search** — semantic (vector cosine) + BM25 keyword search fused with Reciprocal Rank Fusion
- **Streaming Chat** — real-time SSE token streaming from GPT-4o via AsyncOpenAI
- **Three Chunking Strategies** — recursive (hierarchy of separators), sentence, and semantic
- **Async Ingestion Pipeline** — concurrent multi-document processing with semaphore-based rate limiting
- **Provider Abstraction** — swap OpenAI embeddings for local sentence-transformers via Protocol
- **ChromaDB Integration** — persistent vector store with cosine similarity, fallback to EphemeralClient
- **BM25 In-Memory Index** — full TF-IDF-based keyword retrieval without external dependencies
- **Docker Compose** — one-command startup for API + ChromaDB with health checks
- **Full Test Suite** — pytest-asyncio with mocked services, unit + integration tests

---

## Tech Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI 0.115 |
| Validation | Pydantic v2 + pydantic-settings |
| LLM | OpenAI GPT-4o (async streaming) |
| Embeddings | OpenAI text-embedding-3-small / sentence-transformers |
| Vector Store | ChromaDB (cosine similarity, HNSW index) |
| Keyword Search | BM25 (in-memory, custom implementation) |
| Async Runtime | Python asyncio + uvicorn |
| Testing | pytest + pytest-asyncio + httpx |
| Linting | Ruff + mypy |
| Containerization | Docker + Docker Compose |
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |

---

## Quick Start

### Option 1: Docker Compose (recommended)

```bash
# Clone and configure
git clone <repo>
cd rag-document-intelligence
cp backend/.env.example backend/.env
# Edit backend/.env — add your RAG_OPENAI_API_KEY

# Start everything
docker compose up -d

# API: http://localhost:8000
# Docs: http://localhost:8000/docs
# ChromaDB: http://localhost:8001
```

### Option 2: Local Development

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -e ".[dev]"

# Start ChromaDB (Docker)
docker run -p 8001:8000 chromadb/chroma:latest

# Start API
cp .env.example .env            # Add RAG_OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

### Run Tests

```bash
cd backend
pytest -v
```

---

## API Documentation

Interactive Swagger UI is available at `http://localhost:8000/docs`.

### Endpoints

#### Health
```
GET  /api/v1/health          — Liveness probe with uptime and vector store status
GET  /api/v1/health/ready    — Readiness probe
```

#### Documents
```
POST   /api/v1/documents/upload        — Upload and index a document (multipart/form-data)
GET    /api/v1/documents/              — List documents (pagination + status filter)
GET    /api/v1/documents/{id}          — Get document status
DELETE /api/v1/documents/{id}          — Delete document and its chunks
```

#### Search
```
POST /api/v1/search/                   — Hybrid search
GET  /api/v1/search/document/{id}      — Get all chunks for a document
```

#### Chat
```
POST /api/v1/chat/                     — RAG question answering (+ SSE streaming)
```

### Example: Upload a Document

```bash
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -F "file=@report.pdf" \
  -F "title=Q3 Financial Report" \
  -F "chunking_strategy=recursive"
```

### Example: Hybrid Search

```bash
curl -X POST http://localhost:8000/api/v1/search/ \
  -H "Content-Type: application/json" \
  -d '{
    "query": "revenue growth Q3",
    "top_k": 5,
    "hybrid_alpha": 0.7
  }'
```

### Example: Streaming Chat

```bash
curl -X POST http://localhost:8000/api/v1/chat/ \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What were the key findings in Q3?",
    "top_k": 5,
    "stream": true
  }'
```

---

## How Hybrid Search Works

```
User Query
    │
    ├─── Embed query ──────────────────► Semantic Search (ChromaDB)
    │                                         │ cosine similarity
    │                                         ▼
    │                              ranked semantic results
    │
    ├─── Tokenize query ───────────────► BM25 Search (in-memory)
    │                                         │ TF-IDF scoring
    │                                         ▼
    │                              ranked keyword results
    │
    └─── Reciprocal Rank Fusion ──────► Fused result list
              score = α × 1/(k+rank_sem) + (1-α) × 1/(k+rank_bm25)

              α=0.7 → 70% semantic, 30% keyword
```

**Why Hybrid?** Pure semantic search struggles with exact terminology, acronyms, and rare proper nouns. Pure keyword search misses paraphrases and synonyms. RRF fusion consistently outperforms either approach alone without requiring score normalization.

---

## Chunking Strategies

| Strategy | Best For | Description |
|---|---|---|
| `recursive` | General documents | Hierarchical split: `\n\n` → `\n` → `.` → space → char |
| `sentence` | Articles, reports | Groups complete sentences within chunk_size |
| `semantic` | Dense technical text | Falls back to recursive (embeddings required for true semantic) |

Overlap between chunks (`chunk_overlap=50`) ensures context continuity at boundaries.

---

## Project Structure

```
rag-document-intelligence/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, lifespan context
│   │   ├── config.py            # Pydantic BaseSettings
│   │   ├── models/
│   │   │   ├── schemas.py       # Pydantic v2 request/response models
│   │   │   └── documents.py     # Internal document dataclasses
│   │   ├── services/
│   │   │   ├── embeddings.py    # OpenAI + local embedding providers
│   │   │   ├── vectorstore.py   # ChromaDB async wrapper
│   │   │   ├── retriever.py     # BM25Index + HybridRetriever (RRF)
│   │   │   ├── llm.py           # LLM service with streaming
│   │   │   ├── ingestion.py     # Async ingestion pipeline
│   │   │   └── rag_chain.py     # RAG orchestration + prompt building
│   │   ├── api/
│   │   │   ├── routes/          # documents, search, chat, health
│   │   │   └── dependencies.py  # FastAPI dependency injection
│   │   └── utils/
│   │       ├── chunking.py      # TextChunker (3 strategies)
│   │       └── text_processing.py # TextExtractor, TextCleaner
│   ├── tests/
│   │   ├── conftest.py          # Fixtures with mocked services
│   │   ├── test_api.py          # HTTP endpoint tests
│   │   ├── test_retriever.py    # BM25 + hybrid retrieval tests
│   │   └── test_ingestion.py    # Chunking + pipeline tests
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── .env.example
├── web/                         # Next.js portfolio showcase
├── docker-compose.yml
└── README.md
```

---

## Performance Considerations

- **Semaphore rate limiting** on embedding API calls prevents token-per-minute exhaustion
- **Batch embedding** (100 texts per request) minimizes OpenAI API round trips
- **asyncio.gather** runs semantic + keyword search concurrently, halving retrieval latency
- **asyncio.to_thread** wraps all ChromaDB calls to keep the event loop non-blocking
- **Ephemeral ChromaDB fallback** enables zero-dependency local development/testing
- **Fire-and-forget ingestion** (asyncio.create_task) returns document ID immediately without blocking upload response

---

## License

MIT
