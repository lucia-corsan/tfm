"""Tests for interchangeable route scenario providers."""

import pytest

from backend.domain import GeoPoint
from backend.routing.fixtures import load_pilot_route_scenario
from backend.routing.providers import (
    FixtureRouteScenarioProvider,
    RouteScenarioNotFoundError,
)


def test_fixture_provider_resolves_pilot_endpoints() -> None:
    """The local provider returns the reproducible pilot scenario."""

    expected = load_pilot_route_scenario()
    provider = FixtureRouteScenarioProvider()

    scenario = provider.get_scenario(expected.origin, expected.destination)

    assert scenario == expected


def test_fixture_provider_accepts_small_coordinate_rounding() -> None:
    """Serialization rounding below the documented tolerance remains supported."""

    expected = load_pilot_route_scenario()
    provider = FixtureRouteScenarioProvider()
    rounded_origin = GeoPoint(
        latitude=expected.origin.latitude + 0.000001,
        longitude=expected.origin.longitude - 0.000001,
    )

    scenario = provider.get_scenario(rounded_origin, expected.destination)

    assert scenario.scenario_id == expected.scenario_id


def test_fixture_provider_rejects_unknown_endpoints_without_echoing_them() -> None:
    """A missing fixture produces a sanitized internal error."""

    provider = FixtureRouteScenarioProvider()
    origin = GeoPoint(latitude=40.0, longitude=-3.0)
    destination = GeoPoint(latitude=41.0, longitude=-4.0)

    with pytest.raises(RouteScenarioNotFoundError) as error:
        provider.get_scenario(origin, destination)

    assert str(error.value) == "route scenario not found"
    assert "40.0" not in str(error.value)
