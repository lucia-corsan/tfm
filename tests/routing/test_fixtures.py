"""Tests for the synthetic area-pilot route scenario."""

import pytest

from backend.domain import AccessibilityAttribute, RouteCategory, RouteSource
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
        "fewer_crossings_route": pytest.approx(1 / 11),
        "simple_route": pytest.approx(4 / 11),
    }


def test_computed_uncertainty_is_in_serialized_contract() -> None:
    """API serialization must expose the uncertainty ratio to the app."""

    route = load_pilot_route_scenario().routes[1]

    assert route.model_dump(mode="json")["uncertainty"]["unknown_ratio"] == pytest.approx(1 / 11)


def test_fixture_features_cover_all_modeled_accessibility_attributes() -> None:
    """Every synthetic route must expose evidence for the complete OSM mapping."""

    scenario = load_pilot_route_scenario()

    for route in scenario.routes:
        assert set(route.features.evidence_by_attribute()) == set(AccessibilityAttribute)


def test_fixture_represents_all_ten_osm_study_categories() -> None:
    """The fixture contract must retain every category from the density study."""

    route = load_pilot_route_scenario().routes[0]
    features = route.features

    assert features.crossing_count >= features.signalized_crossing_count
    assert features.audible_signal_crossing_count >= features.vibration_signal_crossing_count
    assert features.tactile_paving_crossing_count > 0
    assert features.compatible_kerb_crossing_count is not None
    assert features.sidewalk_coverage_ratio is not None
    assert features.ramp_count is not None
    assert features.step_count is not None
    assert features.surface_coverage_ratio is not None
    assert features.maximum_slope_percent is not None
