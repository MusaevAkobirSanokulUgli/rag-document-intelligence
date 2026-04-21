import asyncio
import hashlib
import logging
from uuid import UUID, uuid4
from datetime import datetime, timezone

from app.models.schemas import DocumentStatus, ChunkingStrategy
from app.services.embeddings import EmbeddingService
from app.services.vectorstore import VectorStoreService
from app.utils.chunking import TextChunker

logger = logging.getLogger(__name__)


class IngestionPipeline:
    """
    Async document ingestion pipeline with concurrent processing and BM25 sync.

    Pipeline stages:
        1. Chunk — split document text using the specified strategy
        2. Embed — generate vector embeddings in batched async calls
        3. Index — upsert chunks into vector store and BM25 index
    """

    def __init__(
        self,
        embedding_service: EmbeddingService,
        vectorstore: VectorStoreService,
        bm25_index=None,
        max_concurrent: int = 5,
    ) -> None:
        self.embedding_service = embedding_service
        self.vectorstore = vectorstore
        self.bm25_index = bm25_index  # Optional: sync BM25 alongside vector store
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._processing: dict[UUID, DocumentStatus] = {}

    async def ingest_document(
        self,
        document_id: UUID,
        content: str,
        strategy: ChunkingStrategy = ChunkingStrategy.RECURSIVE,
        metadata: dict | None = None,
    ) -> dict:
        """
        Ingest a single document through the full pipeline.

        Args:
            document_id: Unique identifier for the document.
            content: Raw text content to index.
            strategy: Chunking strategy to apply.
            metadata: Additional metadata to attach to every chunk.

        Returns:
            Dict with document_id, status, chunk_count, and indexed_at timestamp.
        """
        async with self._semaphore:
            self._processing[document_id] = DocumentStatus.PROCESSING
            try:
                # Stage 1: Chunk the document
                chunker = TextChunker(strategy=strategy)
                chunks = chunker.chunk(content)
                logger.info(f"Document {document_id}: created {len(chunks)} chunks")

                if not chunks:
                    raise ValueError("Document produced no usable chunks after processing")

                # Stage 2: Generate embeddings concurrently in batches
                chunk_texts = [c.text for c in chunks]
                embeddings = await self.embedding_service.embed_documents(chunk_texts)

                # Stage 3: Build chunk IDs and metadata records
                chunk_ids = [
                    f"{document_id}_{hashlib.md5(c.text.encode()).hexdigest()[:8]}"
                    for c in chunks
                ]

                chunk_metadatas = [
                    {
                        "document_id": str(document_id),
                        "chunk_index": str(i),
                        "char_start": str(c.start),
                        "char_end": str(c.end),
                        **(metadata or {}),
                    }
                    for i, c in enumerate(chunks)
                ]

                # Stage 4: Upsert into vector store
                await self.vectorstore.add_documents(
                    ids=chunk_ids,
                    embeddings=embeddings,
                    documents=chunk_texts,
                    metadatas=chunk_metadatas,
                )

                # Stage 5: Sync BM25 index if available
                if self.bm25_index is not None:
                    for chunk_id, text in zip(chunk_ids, chunk_texts):
                        self.bm25_index.add_document(chunk_id, text)

                self._processing[document_id] = DocumentStatus.INDEXED
                logger.info(
                    f"Document {document_id} indexed successfully: {len(chunks)} chunks"
                )
                return {
                    "document_id": str(document_id),
                    "status": DocumentStatus.INDEXED,
                    "chunk_count": len(chunks),
                    "indexed_at": datetime.now(timezone.utc).isoformat(),
                }

            except Exception as e:
                self._processing[document_id] = DocumentStatus.FAILED
                logger.error(f"Ingestion failed for document {document_id}: {e}", exc_info=True)
                raise

    async def ingest_batch(self, documents: list[dict]) -> list[dict]:
        """
        Ingest multiple documents concurrently, respecting the semaphore limit.

        Each document dict must have a 'content' key. Optional keys:
        'id' (UUID), 'strategy' (ChunkingStrategy), 'metadata' (dict).

        Returns a list of results (or error dicts for failed items).
        """
        tasks = [
            self.ingest_document(
                document_id=doc.get("id", uuid4()),
                content=doc["content"],
                strategy=doc.get("strategy", ChunkingStrategy.RECURSIVE),
                metadata=doc.get("metadata"),
            )
            for doc in documents
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return [
            r if not isinstance(r, Exception) else {"error": str(r)} for r in results
        ]

    def get_status(self, document_id: UUID) -> DocumentStatus | None:
        """Return the current processing status for a document."""
        return self._processing.get(document_id)

    def clear_status(self, document_id: UUID) -> None:
        """Remove a document's status entry (cleanup after processing)."""
        self._processing.pop(document_id, None)
