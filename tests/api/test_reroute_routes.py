"""HTTP tests for confirmed profile-aware rerouting."""

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
    """Keep rerouting API tests deterministic and independent of ORS."""

    app.dependency_overrides[get_settings] = lambda: Settings(
        routing_provider="fixture",
        _env_file=None,
    )
    try:
        yield
    finally:
        app.dependency_overrides.clear()


def _valid_payload() -> dict[str, object]:
    """Build a valid confirmed-position request for the pilot fixture."""

    scenario = load_pilot_route_scenario()
    return {
        "current_position": scenario.origin.model_dump(mode="json"),
        "destination": scenario.destination.model_dump(mode="json"),
        "profile": {
            "profile_id": "reroute_default",
            "avoid_steps": True,
            "require_pedestrian_access": True,
            "avoid_incompatible_crossings": True,
            "maximum_slope_percent": None,
            "maximum_detour_ratio": 1.5,
            "declared_weights": PreferenceWeights().model_dump(mode="json"),
        },
    }


def test_reroute_endpoint_reuses_ranking_and_returns_valid_routes() -> None:
    """A confirmed position is treated as the new origin of the same pipeline."""

    payload = _valid_payload()
    response = client.post("/api/v1/routes/reroute", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["origin"] == payload["current_position"]
    assert body["destination"] == payload["destination"]
    assert body["profile_id"] == "reroute_default"
    assert [route["rank"] for route in body["routes"]] == [1, 2]
    assert body["routes"][0]["route_id"] == "balanced_route"


def test_reroute_endpoint_preserves_custom_profile_weights() -> None:
    """The rerouted ranking applies the exact declared preference weights."""

    payload = _valid_payload()
    weights = {name: 0.0 for name in PreferenceWeights.model_fields}
    weights["complex_crossings"] = 1.0
    payload["profile"]["declared_weights"] = weights

    response = client.post("/api/v1/routes/reroute", json=payload)

    assert response.status_code == 200
    assert response.json()["routes"][0]["route_id"] == "fewer_crossings_route"


def test_reroute_endpoint_rejects_invalid_input_without_echoing_coordinates() -> None:
    """Validation errors cannot expose the submitted position."""

    payload = _valid_payload()
    payload["current_position"] = payload["destination"]

    response = client.post("/api/v1/routes/reroute", json=payload)

    assert response.status_code == 422
    assert response.json() == {"code": "invalid_request"}
    assert "40.4211" not in response.text


def test_reroute_endpoint_returns_sanitized_404_outside_fixture() -> None:
    """Unknown current positions produce a stable non-coordinate error."""

    payload = _valid_payload()
    payload["current_position"] = {"latitude": 40.0, "longitude": -3.0}

    response = client.post("/api/v1/routes/reroute", json=payload)

    assert response.status_code == 404
    assert response.json() == {"code": "route_scenario_not_found"}
    assert "40.0" not in response.text


def test_reroute_openapi_exposes_request_response_and_sanitized_errors() -> None:
    """OpenAPI documents the dedicated input and shared validated output."""

    response = client.get("/openapi.json")

    assert response.status_code == 200
    operation = response.json()["paths"]["/api/v1/routes/reroute"]["post"]
    assert operation["requestBody"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/RouteRerouteRequest"
    }
    assert operation["responses"]["200"]["content"]["application/json"][
        "schema"
    ] == {"$ref": "#/components/schemas/RouteCompareResponse"}
    for status_code in ("404", "422", "503"):
        assert operation["responses"][status_code]["content"]["application/json"][
            "schema"
        ] == {"$ref": "#/components/schemas/ErrorResponse"}
