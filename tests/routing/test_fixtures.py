"""Tests for the synthetic area-pilot route scenario."""

import pytest

from backend.domain import RouteCategory, RouteSource
from backend.routing.fixtures import load_pilot_route_scenario


def test_pilot_fixture_contains_three_distinct_alternatives() -> None:
    """The local scenario must cover the three intended comparison roles."""

    scenario = load_pilot_route_scenario()

    assert scenario.scenario_id == "moncloa_principe_pio"
    assert len(scenario.routes) == 3
    assert {route.category for route in scenario.routes} == set(RouteCategory)
    assert all(route.source is RouteSource.FIXTURE for route in scenario.routes)
    assert all(route.is_synthetic for route in scenario.routes)


def test_pilot_fixture_exposes_increasing_uncertainty() -> None:
    """Fixture alternatives must include known and unknown evidence cases."""

    scenario = load_pilot_route_scenario()
    uncertainty_by_route = {
        route.route_id: route.uncertainty.unknown_ratio for route in scenario.routes
    }

    assert uncertainty_by_route == {
        "balanced_route": pytest.approx(0.0),
        "fewer_crossings_route": pytest.approx(0.2),
        "simple_route": pytest.approx(0.4),
    }


def test_computed_uncertainty_is_in_serialized_contract() -> None:
    """API serialization must expose the uncertainty ratio to the app."""

    route = load_pilot_route_scenario().routes[1]

    assert route.model_dump(mode="json")["uncertainty"]["unknown_ratio"] == pytest.approx(0.2)
