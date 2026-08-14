"""HTTP tests for profile-aware route comparison."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from backend.config import Settings, get_settings
from backend.domain import PreferenceWeights
from backend.main import app
from backend.routing.fixtures import load_pilot_route_scenario

client = TestClient(app)


@pytest.fixture(autouse=True)
def _use_fixture_provider() -> Iterator[None]:
    """Isolate deterministic API tests from the developer's local provider."""

    app.dependency_overrides[get_settings] = lambda: Settings(
        routing_provider="fixture",
        _env_file=None,
    )
    try:
        yield
    finally:
        app.dependency_overrides.clear()


def _valid_payload() -> dict[str, object]:
    """Return a valid JSON-compatible request for the pilot fixture."""

    scenario = load_pilot_route_scenario()
    return {
        "origin": scenario.origin.model_dump(mode="json"),
        "destination": scenario.destination.model_dump(mode="json"),
        "profile": {
            "profile_id": "api_default",
            "avoid_steps": True,
            "require_pedestrian_access": True,
            "avoid_incompatible_crossings": True,
            "maximum_slope_percent": None,
            "maximum_detour_ratio": 1.5,
            "declared_weights": PreferenceWeights().model_dump(mode="json"),
        },
    }


def test_compare_endpoint_returns_ranked_and_rejected_routes() -> None:
    """The public endpoint exposes a complete default fixture comparison."""

    response = client.post("/api/v1/routes/compare", json=_valid_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["scenario_id"] == "moncloa_principe_pio"
    assert [route["route_id"] for route in body["routes"]] == [
        "balanced_route",
        "fewer_crossings_route",
    ]
    assert [route["route_id"] for route in body["rejected_routes"]] == ["simple_route"]
    assert body["routes"][0]["score"]["adequacy"] == 0.8030555555555556
    assert body["routes"][0]["score"]["confidence"] == 0.754090909090909
    assert body["routes"][0]["score"]["uncertainty"] == 0.0
    assert len(body["routes"][0]["instructions"]) == 12
    assert body["routes"][0]["instructions"][-1]["maneuver"] == "arrive"


def test_compare_endpoint_applies_custom_profile_weights() -> None:
    """Weights sent by the app change the order through the shared backend logic."""

    payload = _valid_payload()
    weights = {name: 0.0 for name in PreferenceWeights.model_fields}
    weights["complex_crossings"] = 1.0
    payload["profile"]["declared_weights"] = weights

    response = client.post("/api/v1/routes/compare", json=payload)

    assert response.status_code == 200
    assert response.json()["routes"][0]["route_id"] == "fewer_crossings_route"


def test_compare_endpoint_returns_422_for_invalid_request() -> None:
    """Invalid input is rejected without echoing submitted coordinate values."""

    payload = _valid_payload()
    payload["origin"] = {"latitude": 120.0, "longitude": -3.7}

    response = client.post("/api/v1/routes/compare", json=payload)

    assert response.status_code == 422
    assert response.json() == {"code": "invalid_request"}
    assert "120.0" not in response.text


def test_compare_endpoint_returns_sanitized_404_for_unknown_route() -> None:
    """Missing fixtures do not echo requested coordinates in the API error."""

    payload = _valid_payload()
    payload["origin"] = {"latitude": 40.0, "longitude": -3.0}

    response = client.post("/api/v1/routes/compare", json=payload)

    assert response.status_code == 404
    assert response.json() == {"code": "route_scenario_not_found"}
    assert "40.0" not in response.text


def test_compare_endpoint_returns_sanitized_503_for_unavailable_provider() -> None:
    """An unavailable configured provider produces a stable non-secret error."""

    app.dependency_overrides[get_settings] = lambda: Settings(
        routing_provider="ors",
        _env_file=None,
    )
    try:
        response = client.post("/api/v1/routes/compare", json=_valid_payload())
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {"code": "routing_provider_unavailable"}
    assert "ORS_API_KEY" not in response.text


def test_compare_endpoint_is_reproducible_over_http() -> None:
    """Identical HTTP requests produce exactly the same serialized response."""

    payload = _valid_payload()

    first = client.post("/api/v1/routes/compare", json=payload)
    second = client.post("/api/v1/routes/compare", json=payload)

    assert first.status_code == 200
    assert first.content == second.content


def test_openapi_describes_comparison_and_sanitized_errors() -> None:
    """Generated API documentation exposes stable app-facing response models."""

    response = client.get("/openapi.json")

    assert response.status_code == 200
    schema = response.json()
    operation = schema["paths"]["/api/v1/routes/compare"]["post"]
    assert operation["requestBody"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/RouteCompareRequest"
    }
    assert operation["responses"]["200"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/RouteCompareResponse"
    }
    for status_code in ("404", "422", "503"):
        assert operation["responses"][status_code]["content"]["application/json"]["schema"] == {
            "$ref": "#/components/schemas/ErrorResponse"
        }
    assert "ORS_API_KEY" not in response.text
