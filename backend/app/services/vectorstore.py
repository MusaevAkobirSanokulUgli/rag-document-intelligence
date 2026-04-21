import asyncio
import logging

import chromadb
from app.config import settings
from app.services.retriever import RetrievalResult

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Async wrapper around ChromaDB for vector storage and similarity search."""

    def __init__(self, client: chromadb.ClientAPI, collection) -> None:
        self._client = client
        self._collection = collection

    @classmethod
    async def initialize(cls) -> "VectorStoreService":
        """
        Initialize ChromaDB client and create/get the document collection.
        Uses asyncio.to_thread to avoid blocking the event loop during startup.
        """
        try:
            client = await asyncio.to_thread(
                chromadb.HttpClient,
                host=settings.chroma_host,
                port=settings.chroma_port,
            )
            collection = await asyncio.to_thread(
                client.get_or_create_collection,
                name=settings.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(
                f"Connected to ChromaDB at {settings.chroma_host}:{settings.chroma_port}, "
                f"collection='{settings.collection_name}'"
            )
            return cls(client, collection)
        except Exception as e:
            logger.warning(
                f"ChromaDB connection failed ({e}). Falling back to in-memory client."
            )
            client = await asyncio.to_thread(chromadb.EphemeralClient)
            collection = await asyncio.to_thread(
                client.get_or_create_collection,
                name=settings.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            return cls(client, collection)

    async def add_documents(
        self,
        ids: list[str],
        embeddings: list[list[float]],
        documents: list[str],
        metadatas: list[dict] | None = None,
    ) -> None:
        """Add document chunks with their embeddings to the vector store."""
        await asyncio.to_thread(
            self._collection.add,
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )
        logger.debug(f"Added {len(ids)} chunks to vector store")

    async def search(
        self,
        query_embedding: list[float],
        top_k: int = 5,
        filters: dict | None = None,
    ) -> list[RetrievalResult]:
        """
        Perform approximate nearest-neighbor search using cosine similarity.

        Returns a list of RetrievalResult objects sorted by descending similarity score.
        """
        where = filters if filters else None
        results = await asyncio.to_thread(
            self._collection.query,
            query_embeddings=[query_embedding],
            n_results=min(top_k, max(self._collection.count(), 1)),
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        retrieval_results: list[RetrievalResult] = []
        if results["ids"] and results["ids"][0]:
            for i, chunk_id in enumerate(results["ids"][0]):
                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                retrieval_results.append(
                    RetrievalResult(
                        chunk_id=chunk_id,
                        document_id=str(metadata.get("document_id", "")),
                        content=results["documents"][0][i],
                        score=1 - results["distances"][0][i],  # distance → similarity
                        metadata={k: str(v) for k, v in metadata.items()},
                    )
                )

        return retrieval_results

    async def get_by_document_id(self, document_id: str) -> list[RetrievalResult]:
        """Retrieve all chunks belonging to a specific document."""
        results = await asyncio.to_thread(
            self._collection.get,
            where={"document_id": document_id},
            include=["documents", "metadatas"],
        )

        chunks: list[RetrievalResult] = []
        if results["ids"]:
            for i, chunk_id in enumerate(results["ids"]):
                metadata = results["metadatas"][i] if results["metadatas"] else {}
                chunks.append(
                    RetrievalResult(
                        chunk_id=chunk_id,
                        document_id=document_id,
                        content=results["documents"][i],
                        score=1.0,
                        metadata={k: str(v) for k, v in metadata.items()},
                    )
                )
        return chunks

    async def delete_document(self, document_id: str) -> None:
        """Delete all chunks associated with a document ID."""
        await asyncio.to_thread(
            self._collection.delete,
            where={"document_id": document_id},
        )
        logger.info(f"Deleted all chunks for document {document_id}")

    async def count(self) -> int:
        """Return total number of chunks in the collection."""
        return await asyncio.to_thread(self._collection.count)

    async def close(self) -> None:
        """ChromaDB HTTP client does not require explicit teardown."""
        pass
