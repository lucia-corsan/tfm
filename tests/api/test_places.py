"""HTTP tests for local pilot-place search."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from backend.config import Settings, get_settings
from backend.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _use_catalog_provider() -> Iterator[None]:
    """Keep local endpoint tests independent from the developer's ``.env``."""

    app.dependency_overrides[get_settings] = lambda: Settings(
        place_search_provider="catalog",
        _env_file=None,
    )
    try:
        yield
    finally:
        app.dependency_overrides.clear()


def test_places_endpoint_finds_unaccented_query() -> None:
    """The API returns validated WGS84 results without requiring accent input."""

    response = client.get("/api/v1/places/search", params={"q": "principe"})

    assert response.status_code == 200
    assert response.json() == {
        "places": [
            {
                "place_id": "principe_pio",
                "name": "Príncipe Pío",
                "description": (
                    "Intercambiador y entorno de la estación de Príncipe Pío."
                ),
                "location": {"latitude": 40.4211, "longitude": -3.7206},
                "source": "pilot_catalog",
            }
        ]
    }


def test_places_endpoint_returns_empty_result_without_external_fallback() -> None:
    """Unknown text does not trigger network traffic or fabricate coordinates."""

    response = client.get("/api/v1/places/search", params={"q": "Atocha"})

    assert response.status_code == 200
    assert response.json() == {"places": []}


def test_places_endpoint_applies_limit() -> None:
    """The public limit bounds broad local results."""

    response = client.get(
        "/api/v1/places/search",
        params={"q": "estacion", "limit": 2},
    )

    assert response.status_code == 200
    assert len(response.json()["places"]) == 2


def test_places_endpoint_sanitizes_invalid_query_and_limit() -> None:
    """Validation errors use the common body and do not echo user text."""

    query_response = client.get("/api/v1/places/search", params={"q": "x"})
    limit_response = client.get(
        "/api/v1/places/search",
        params={"q": "Moncloa", "limit": 20},
    )

    assert query_response.status_code == 422
    assert query_response.json() == {"code": "invalid_request"}
    assert limit_response.status_code == 422
    assert limit_response.json() == {"code": "invalid_request"}


def test_external_search_configuration_keeps_local_fallback() -> None:
    """A known catalog place remains available without an external credential."""

    app.dependency_overrides[get_settings] = lambda: Settings(
        place_search_provider="ors",
        _env_file=None,
    )

    response = client.get("/api/v1/places/search", params={"q": "Moncloa"})

    assert response.status_code == 200
    assert response.json()["places"][0]["place_id"] == "moncloa"


def test_external_search_failure_is_not_presented_as_an_empty_result() -> None:
    """Free text without a usable geocoder produces a retryable safe error."""

    app.dependency_overrides[get_settings] = lambda: Settings(
        place_search_provider="ors",
        _env_file=None,
    )

    response = client.get("/api/v1/places/search", params={"q": "Ferraz 22"})

    assert response.status_code == 503
    assert response.json() == {"code": "place_search_unavailable"}
    assert "Ferraz" not in response.text


def test_openapi_documents_place_search_response_and_validation_error() -> None:
    """The generated API schema exposes the stable mobile-facing place models."""

    response = client.get("/openapi.json")

    assert response.status_code == 200
    operation = response.json()["paths"]["/api/v1/places/search"]["get"]
    assert operation["responses"]["200"]["content"]["application/json"][
        "schema"
    ] == {"$ref": "#/components/schemas/PlaceSearchResponse"}
    assert operation["responses"]["422"]["content"]["application/json"][
        "schema"
    ] == {"$ref": "#/components/schemas/ErrorResponse"}
    assert operation["responses"]["503"]["content"]["application/json"][
        "schema"
    ] == {"$ref": "#/components/schemas/ErrorResponse"}
