from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_prefix": "RAG_"}

    # API
    app_name: str = "RAG Document Intelligence"
    debug: bool = False
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # LLM
    openai_api_key: str = ""
    llm_model: str = "gpt-4o"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    # Vector Store
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    collection_name: str = "documents"

    # Chunking
    chunk_size: int = 512
    chunk_overlap: int = 50

    # Search
    top_k: int = 5
    hybrid_alpha: float = 0.7  # Weight for semantic vs keyword search


settings = Settings()
