"""Tests for the public health-check endpoint."""

import logging

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


def test_request_info_logs_are_disabled_for_private_search_queries() -> None:
    """HTTP client and access INFO records cannot expose searched addresses."""

    assert logging.getLogger("httpx").getEffectiveLevel() >= logging.WARNING
    assert logging.getLogger("uvicorn.access").getEffectiveLevel() >= logging.WARNING
