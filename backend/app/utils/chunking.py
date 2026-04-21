import re
from dataclasses import dataclass

from app.models.schemas import ChunkingStrategy
from app.config import settings


@dataclass
class TextChunk:
    """A single chunk of text with positional metadata."""

    text: str
    start: int
    end: int
    index: int


class TextChunker:
    """
    Multi-strategy text chunker supporting recursive, sentence, and semantic splitting.

    Recursive chunking (default):
        Splits text using a hierarchy of separators (paragraphs → sentences → words → chars),
        guaranteeing that no chunk exceeds chunk_size while preserving semantic boundaries.

    Sentence chunking:
        Groups complete sentences into chunks without exceeding chunk_size.

    Semantic chunking:
        Falls back to recursive — full semantic chunking requires embeddings
        (out of scope for the chunker utility itself).
    """

    RECURSIVE_SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""]

    def __init__(
        self,
        strategy: ChunkingStrategy = ChunkingStrategy.RECURSIVE,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
    ) -> None:
        self.strategy = strategy
        self.chunk_size = chunk_size if chunk_size is not None else settings.chunk_size
        self.chunk_overlap = (
            chunk_overlap if chunk_overlap is not None else settings.chunk_overlap
        )

    def chunk(self, text: str) -> list[TextChunk]:
        """Split the input text into chunks using the configured strategy."""
        if not text or not text.strip():
            return []

        match self.strategy:
            case ChunkingStrategy.RECURSIVE:
                return self._recursive_chunk(text)
            case ChunkingStrategy.SENTENCE:
                return self._sentence_chunk(text)
            case ChunkingStrategy.SEMANTIC:
                return self._semantic_chunk(text)

    # -----------------------------------------------------------------------
    # Recursive chunking
    # -----------------------------------------------------------------------

    def _recursive_chunk(self, text: str) -> list[TextChunk]:
        raw = self._split_recursive(text, self.RECURSIVE_SEPARATORS, 0)
        # Re-index after splitting
        for i, chunk in enumerate(raw):
            chunk.index = i
        return raw

    def _split_recursive(
        self, text: str, separators: list[str], offset: int
    ) -> list[TextChunk]:
        if not text.strip():
            return []

        if len(text) <= self.chunk_size:
            return [
                TextChunk(
                    text=text.strip(),
                    start=offset,
                    end=offset + len(text),
                    index=0,
                )
            ]

        separator = separators[0] if separators else ""
        remaining_separators = separators[1:] if len(separators) > 1 else [""]

        # Character-level split (last resort)
        if not separator:
            return self._char_split(text, offset)

        parts = text.split(separator)
        chunks: list[TextChunk] = []
        current_chunk = ""
        current_start = offset

        for part in parts:
            candidate = (current_chunk + separator + part) if current_chunk else part

            if len(candidate) <= self.chunk_size:
                current_chunk = candidate
            else:
                if current_chunk.strip():
                    if len(current_chunk) > self.chunk_size:
                        sub = self._split_recursive(
                            current_chunk, remaining_separators, current_start
                        )
                        chunks.extend(sub)
                    else:
                        chunks.append(
                            TextChunk(
                                text=current_chunk.strip(),
                                start=current_start,
                                end=current_start + len(current_chunk),
                                index=len(chunks),
                            )
                        )
                    # Overlap: carry the tail of the current chunk into the next
                    overlap = (
                        current_chunk[-self.chunk_overlap :]
                        if len(current_chunk) > self.chunk_overlap
                        else ""
                    )
                    current_start = current_start + len(current_chunk) - len(overlap)
                    current_chunk = (overlap + part) if overlap else part
                else:
                    current_chunk = part

        if current_chunk.strip():
            if len(current_chunk) > self.chunk_size:
                sub = self._split_recursive(
                    current_chunk, remaining_separators, current_start
                )
                chunks.extend(sub)
            else:
                chunks.append(
                    TextChunk(
                        text=current_chunk.strip(),
                        start=current_start,
                        end=current_start + len(current_chunk),
                        index=len(chunks),
                    )
                )

        return chunks

    def _char_split(self, text: str, offset: int) -> list[TextChunk]:
        """Fall-back character-level splitting with overlap."""
        chunks = []
        step = max(1, self.chunk_size - self.chunk_overlap)
        for i, start in enumerate(range(0, len(text), step)):
            part = text[start : start + self.chunk_size]
            if part.strip():
                chunks.append(
                    TextChunk(
                        text=part.strip(),
                        start=offset + start,
                        end=offset + start + len(part),
                        index=i,
                    )
                )
        return chunks

    # -----------------------------------------------------------------------
    # Sentence chunking
    # -----------------------------------------------------------------------

    def _sentence_chunk(self, text: str) -> list[TextChunk]:
        """Group sentences into chunks that stay within chunk_size."""
        sentence_pattern = re.compile(r"(?<=[.!?])\s+")
        sentences = sentence_pattern.split(text)

        chunks: list[TextChunk] = []
        current = ""
        char_pos = 0
        start = 0

        for sentence in sentences:
            candidate = (current + " " + sentence).strip() if current else sentence.strip()

            if len(candidate) <= self.chunk_size:
                if not current:
                    start = char_pos
                current = candidate
            else:
                if current:
                    chunks.append(
                        TextChunk(
                            text=current,
                            start=start,
                            end=start + len(current),
                            index=len(chunks),
                        )
                    )
                    char_pos = start + len(current) + 1
                start = char_pos
                current = sentence.strip()

            char_pos += len(sentence) + 1  # +1 for the space/separator

        if current:
            chunks.append(
                TextChunk(
                    text=current,
                    start=start,
                    end=start + len(current),
                    index=len(chunks),
                )
            )

        return chunks

    # -----------------------------------------------------------------------
    # Semantic chunking (falls back to recursive without embeddings)
    # -----------------------------------------------------------------------

    def _semantic_chunk(self, text: str) -> list[TextChunk]:
        """
        Semantic chunking groups sentences by embedding similarity.
        Requires embeddings at chunk time — falls back to recursive splitting
        unless an external embedding callback is injected.
        """
        return self._recursive_chunk(text)
