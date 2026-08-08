"""Tests for deterministic ranking and traceable explanations."""

import pytest
from pydantic import ValidationError

from backend.domain import EvidenceState, MobilityProfile, PreferenceWeights
from backend.routing.fixtures import load_pilot_route_scenario
from backend.scoring import (
    ConstraintCode,
    ReasonKind,
    RouteRanking,
    ScoringDimension,
    rank_routes,
)


def _single_weight_profile(dimension: str, **profile_overrides: object) -> MobilityProfile:
    """Create a profile that isolates one gradual scoring dimension."""

    weight_values = {name: 0.0 for name in PreferenceWeights.model_fields}
    weight_values[dimension] = 1.0
    return MobilityProfile(
        profile_id=f"only_{dimension}",
        declared_weights=PreferenceWeights(**weight_values),
        **profile_overrides,
    )


def test_default_profile_ranks_accepted_routes_and_separates_rejection() -> None:
    """Critical violations are never compensated by a high gradual score."""

    scenario = load_pilot_route_scenario()

    result = rank_routes(MobilityProfile(profile_id="default"), scenario.routes)

    assert [route.route_id for route in result.routes] == [
        "balanced_route",
        "fewer_crossings_route",
    ]
    assert [route.rank for route in result.routes] == [1, 2]
    assert [route.route_id for route in result.rejected_routes] == ["simple_route"]
    assert result.rejected_routes[0].violations[0].code is (ConstraintCode.INCOMPATIBLE_CROSSINGS)


def test_profile_priorities_change_ranking_in_expected_direction() -> None:
    """A crossing-focused profile prefers the route with fewer complex crossings."""

    scenario = load_pilot_route_scenario()
    profile = _single_weight_profile("complex_crossings")

    result = rank_routes(profile, scenario.routes)

    assert result.routes[0].route_id == "fewer_crossings_route"
    assert result.routes[0].score.adequacy > result.routes[1].score.adequacy


def test_disabling_crossing_restriction_allows_distance_profile_to_choose_shortest() -> None:
    """A disabled rule remains separate from the user's gradual distance priority."""

    scenario = load_pilot_route_scenario()
    profile = _single_weight_profile(
        "distance",
        avoid_incompatible_crossings=False,
    )

    result = rank_routes(profile, scenario.routes)

    assert result.routes[0].route_id == "simple_route"
    assert result.rejected_routes == []


def test_reasons_are_exactly_grounded_in_score_values() -> None:
    """Every displayed factor must expose the cost and contribution actually used."""

    scenario = load_pilot_route_scenario()
    result = rank_routes(MobilityProfile(profile_id="reasons"), scenario.routes)

    for ranked_route in result.routes:
        costs = ranked_route.score.costs.model_dump()
        contributions = ranked_route.score.contributions.model_dump()
        for reason in ranked_route.reasons:
            assert reason.cost == pytest.approx(costs[reason.dimension.value])
            assert reason.contribution == pytest.approx(contributions[reason.dimension.value])
            assert reason.kind in set(ReasonKind)


def test_warnings_expose_unknown_and_unfavorable_evidence() -> None:
    """Ranking cannot hide known adverse evidence or missing attributes."""

    scenario = load_pilot_route_scenario()
    result = rank_routes(MobilityProfile(profile_id="warnings"), scenario.routes)
    routes = {route.route_id: route for route in result.routes}

    balanced_warnings = routes["balanced_route"].warnings
    fewer_crossings_warnings = routes["fewer_crossings_route"].warnings

    assert [(warning.attribute.value, warning.state) for warning in balanced_warnings] == [
        ("slope", EvidenceState.UNFAVORABLE)
    ]
    assert [(warning.attribute.value, warning.state) for warning in fewer_crossings_warnings] == [
        ("slope", EvidenceState.UNKNOWN)
    ]


def test_ranking_is_deterministic_and_serializable() -> None:
    """Repeated evaluation of identical inputs must produce identical API data."""

    scenario = load_pilot_route_scenario()
    profile = MobilityProfile(profile_id="stable")

    first = rank_routes(profile, scenario.routes).model_dump(mode="json")
    second = rank_routes(profile, scenario.routes).model_dump(mode="json")

    assert first == second
    assert first["routes"][0]["reasons"]
    assert first["routes"][0]["reasons"][0]["dimension"] in {
        dimension.value for dimension in ScoringDimension
    }


def test_ranking_rejects_more_than_three_total_candidates() -> None:
    """Accepted and rejected groups share the public three-alternative limit."""

    scenario = load_pilot_route_scenario()
    result = rank_routes(MobilityProfile(profile_id="limit"), scenario.routes)
    extra_route = result.routes[0].model_copy(update={"route_id": "unexpected", "rank": 3})

    with pytest.raises(ValidationError, match="more than three candidates"):
        RouteRanking(
            profile_id="limit",
            routes=[*result.routes, extra_route],
            rejected_routes=result.rejected_routes,
        )
