from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4
from app.models.schemas import DocumentStatus, ChunkingStrategy


@dataclass
class DocumentRecord:
    """Internal document record stored in application state."""

    id: UUID = field(default_factory=uuid4)
    title: str = ""
    status: DocumentStatus = DocumentStatus.PENDING
    chunk_count: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, str] = field(default_factory=dict)
    chunking_strategy: ChunkingStrategy = ChunkingStrategy.RECURSIVE
    content_hash: str = ""
    file_size_bytes: int = 0
    content_type: str = ""

    def mark_processing(self) -> None:
        self.status = DocumentStatus.PROCESSING
        self.updated_at = datetime.now(timezone.utc)

    def mark_indexed(self, chunk_count: int) -> None:
        self.status = DocumentStatus.INDEXED
        self.chunk_count = chunk_count
        self.updated_at = datetime.now(timezone.utc)

    def mark_failed(self) -> None:
        self.status = DocumentStatus.FAILED
        self.updated_at = datetime.now(timezone.utc)


@dataclass
class DocumentChunk:
    """A single chunk of a document with its embedding metadata."""

    chunk_id: str
    document_id: UUID
    content: str
    chunk_index: int
    char_start: int
    char_end: int
    token_count: int = 0
    metadata: dict[str, str] = field(default_factory=dict)
