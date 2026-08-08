"""Validation tests for accessible-routing domain models."""

import pytest
from pydantic import ValidationError

from backend.domain import GeoPoint, PreferenceWeights, RouteCandidate, RouteFeatures
from backend.routing.fixtures import load_pilot_route_scenario


def test_geo_point_rejects_invalid_latitude_and_extra_fields() -> None:
    """Coordinates outside WGS84 and undocumented fields must fail validation."""

    with pytest.raises(ValidationError):
        GeoPoint(latitude=91.0, longitude=-3.7)

    with pytest.raises(ValidationError):
        GeoPoint.model_validate({"latitude": 40.4, "longitude": -3.7, "altitude": 600})


def test_preference_weights_require_one_active_dimension() -> None:
    """A profile cannot disable every gradual preference."""

    with pytest.raises(ValidationError, match="at least one preference"):
        PreferenceWeights(
            distance=0.0,
            complex_crossings=0.0,
            sidewalk_evidence=0.0,
            steps=0.0,
            orientation_complexity=0.0,
            slope=0.0,
            uncertainty=0.0,
        )


def test_route_features_reject_impossible_crossing_counts() -> None:
    """A crossing subset cannot contain more records than the total count."""

    route = load_pilot_route_scenario().routes[0]
    payload = route.features.model_dump(mode="json")
    payload["signalized_crossing_count"] = payload["crossing_count"] + 1

    with pytest.raises(ValidationError, match="cannot exceed total crossings"):
        RouteFeatures.model_validate(payload)


def test_route_cannot_hide_unknown_evidence() -> None:
    """Every unknown evidence state must be listed in route uncertainty."""

    route = load_pilot_route_scenario().routes[1]
    payload = route.model_dump(mode="json")
    payload["uncertainty"].pop("unknown_ratio")
    payload["uncertainty"] = {"unknown_attributes": [], "limitations": []}

    with pytest.raises(ValidationError, match="must list exactly"):
        RouteCandidate.model_validate(payload)


def test_fixture_route_must_be_marked_as_synthetic() -> None:
    """Fixture data must never look like observed evidence."""

    route = load_pilot_route_scenario().routes[0]
    payload = route.model_dump(mode="json")
    payload["uncertainty"].pop("unknown_ratio")
    payload["is_synthetic"] = False

    with pytest.raises(ValidationError, match="must be marked as synthetic"):
        RouteCandidate.model_validate(payload)
