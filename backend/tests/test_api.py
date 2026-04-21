import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Health endpoint returns 200 with correct service name."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "rag-document-intelligence"


@pytest.mark.asyncio
async def test_health_check_includes_uptime(client: AsyncClient):
    """Health endpoint includes uptime in seconds."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "uptime_seconds" in data
    assert isinstance(data["uptime_seconds"], float)


@pytest.mark.asyncio
async def test_list_documents_empty(client: AsyncClient):
    """Listing documents on a fresh store returns an empty array."""
    response = await client.get("/api/v1/documents/")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_documents_pagination(client: AsyncClient):
    """Pagination parameters are accepted without error."""
    response = await client.get("/api/v1/documents/?skip=0&limit=10")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_get_nonexistent_document(client: AsyncClient):
    """Requesting a document that doesn't exist returns 404."""
    response = await client.get("/api/v1/documents/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_search_returns_structure(client: AsyncClient):
    """Search endpoint returns expected response structure."""
    payload = {"query": "machine learning", "top_k": 3}
    response = await client.post("/api/v1/search/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "query" in data
    assert "results" in data
    assert "total_results" in data
    assert "search_time_ms" in data
    assert data["query"] == "machine learning"
    assert isinstance(data["results"], list)


@pytest.mark.asyncio
async def test_search_empty_query_rejected(client: AsyncClient):
    """Search endpoint rejects an empty query string."""
    payload = {"query": "   ", "top_k": 5}
    response = await client.post("/api/v1/search/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_search_top_k_bounds(client: AsyncClient):
    """Search endpoint rejects top_k values outside the valid range."""
    payload = {"query": "test", "top_k": 0}
    response = await client.post("/api/v1/search/", json=payload)
    assert response.status_code == 422

    payload = {"query": "test", "top_k": 100}
    response = await client.post("/api/v1/search/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_search_hybrid_alpha_bounds(client: AsyncClient):
    """Search endpoint rejects hybrid_alpha values outside [0, 1]."""
    payload = {"query": "test", "hybrid_alpha": 1.5}
    response = await client.post("/api/v1/search/", json=payload)
    assert response.status_code == 422

    payload = {"query": "test", "hybrid_alpha": -0.1}
    response = await client.post("/api/v1/search/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_delete_nonexistent_document(client: AsyncClient):
    """Deleting a document that doesn't exist returns 404."""
    response = await client.delete("/api/v1/documents/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
