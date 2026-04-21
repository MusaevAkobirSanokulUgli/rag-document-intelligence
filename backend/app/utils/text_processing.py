import re
from pathlib import Path


class TextExtractor:
    """Extract text content from various file formats (TXT, MD, PDF, HTML)."""

    @staticmethod
    async def extract(content: bytes, filename: str) -> str:
        """
        Dispatch to the appropriate extractor based on file extension.

        Args:
            content: Raw file bytes.
            filename: Original filename used to determine the file type.

        Returns:
            Extracted plain text string.
        """
        suffix = Path(filename).suffix.lower()

        match suffix:
            case ".txt" | ".md" | ".rst" | ".text":
                return content.decode("utf-8", errors="replace")
            case ".pdf":
                return await TextExtractor._extract_pdf(content)
            case ".html" | ".htm":
                return TextExtractor._extract_html(content)
            case ".json":
                return TextExtractor._extract_json(content)
            case _:
                # Best-effort UTF-8 decode for unknown formats
                return content.decode("utf-8", errors="replace")

    @staticmethod
    async def _extract_pdf(content: bytes) -> str:
        """Extract text from a PDF using pypdf."""
        try:
            import io
            import pypdf

            reader = pypdf.PdfReader(io.BytesIO(content))
            text_parts = []
            for page_num, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                if page_text.strip():
                    text_parts.append(f"[Page {page_num + 1}]\n{page_text}")
            return "\n\n".join(text_parts)
        except ImportError as e:
            raise RuntimeError(
                "pypdf is required for PDF processing. Install with: pip install pypdf"
            ) from e

    @staticmethod
    def _extract_html(content: bytes) -> str:
        """Strip HTML tags and extract readable text content."""
        text = content.decode("utf-8", errors="replace")
        # Remove script and style blocks entirely
        text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
        # Replace block-level tags with newlines for readability
        text = re.sub(r"<(?:br|p|div|h[1-6]|li|tr)[^>]*>", "\n", text, flags=re.IGNORECASE)
        # Strip remaining tags
        text = re.sub(r"<[^>]+>", " ", text)
        # Decode common HTML entities
        text = re.sub(r"&nbsp;", " ", text)
        text = re.sub(r"&amp;", "&", text)
        text = re.sub(r"&lt;", "<", text)
        text = re.sub(r"&gt;", ">", text)
        text = re.sub(r"&quot;", '"', text)
        return re.sub(r"\s+", " ", text).strip()

    @staticmethod
    def _extract_json(content: bytes) -> str:
        """Convert JSON to a human-readable text representation."""
        import json

        try:
            data = json.loads(content.decode("utf-8", errors="replace"))
            return json.dumps(data, indent=2, ensure_ascii=False)
        except json.JSONDecodeError:
            return content.decode("utf-8", errors="replace")


class TextCleaner:
    """Clean and normalize extracted text for consistent chunking and embedding."""

    @staticmethod
    def clean(text: str) -> str:
        """
        Apply a sequence of normalizations to improve text quality.

        Operations:
        - Remove null bytes
        - Normalize line endings
        - Collapse excessive blank lines (max 2 consecutive)
        - Collapse multiple spaces
        - Strip leading/trailing whitespace
        """
        # Remove null bytes and other control characters
        text = re.sub(r"\x00", "", text)
        text = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

        # Normalize line endings
        text = re.sub(r"\r\n", "\n", text)
        text = re.sub(r"\r", "\n", text)

        # Collapse excessive blank lines to at most two
        text = re.sub(r"\n{3,}", "\n\n", text)

        # Collapse multiple spaces (but preserve newlines)
        text = re.sub(r"[ \t]{2,}", " ", text)

        # Clean up spaces around newlines
        text = re.sub(r" +\n", "\n", text)
        text = re.sub(r"\n +", "\n", text)

        return text.strip()

    @staticmethod
    def remove_boilerplate(text: str) -> str:
        """
        Remove common document boilerplate patterns (headers, footers, page numbers).
        Useful for improving chunk quality in corporate documents.
        """
        # Remove standalone page numbers
        text = re.sub(r"\n\s*\d+\s*\n", "\n", text)
        # Remove "Page X of Y" patterns
        text = re.sub(r"\bPage\s+\d+\s+of\s+\d+\b", "", text, flags=re.IGNORECASE)
        # Remove repeated dashes/underscores used as separators
        text = re.sub(r"[-_=]{4,}", "", text)
        return text.strip()
