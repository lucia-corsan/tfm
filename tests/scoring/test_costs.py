"""Tests for normalized route cost extraction."""

from backend.domain import PreferenceWeights
from backend.routing.fixtures import load_pilot_route_scenario
from backend.scoring import RouteCosts, compute_route_costs


def test_route_costs_match_every_gradual_preference() -> None:
    """Adding a preference must require an explicit corresponding route cost."""

    assert set(PreferenceWeights.model_fields) == set(RouteCosts.model_fields)


def test_every_fixture_cost_is_bounded() -> None:
    """All normalized fixture costs must remain within the public 0..1 contract."""

    scenario = load_pilot_route_scenario()

    for route in scenario.routes:
        costs = compute_route_costs(route)
        assert all(0.0 <= value <= 1.0 for value in costs.model_dump().values())


def test_fixture_costs_preserve_intended_route_tradeoffs() -> None:
    """Synthetic alternatives must create meaningful competing advantages."""

    scenario = load_pilot_route_scenario()
    costs = {route.route_id: compute_route_costs(route) for route in scenario.routes}

    assert (
        costs["fewer_crossings_route"].complex_crossings < costs["balanced_route"].complex_crossings
    )
    assert (
        costs["simple_route"].orientation_complexity
        < costs["balanced_route"].orientation_complexity
    )
    assert costs["balanced_route"].crossing_support < costs["simple_route"].crossing_support
    assert costs["balanced_route"].surface < costs["simple_route"].surface
    assert costs["balanced_route"].uncertainty < costs["simple_route"].uncertainty
