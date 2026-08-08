"""Tests for the public health-check endpoint."""

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health_returns_stable_public_metadata() -> None:
    """The health endpoint returns no configuration or secret values."""

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "accessible-madrid-routing-api",
        "version": "0.1.0",
    }
