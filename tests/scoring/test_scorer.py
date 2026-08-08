"""Tests for adequacy, confidence, and uncertainty calculations."""

import pytest

from backend.domain import AccessibilityAttribute, MobilityProfile, PreferenceWeights
from backend.routing.fixtures import load_pilot_route_scenario
from backend.scoring import score_route


def test_score_separates_adequacy_confidence_and_uncertainty() -> None:
    """The public score exposes three metrics with distinct meanings."""

    route = load_pilot_route_scenario().routes[0]

    score = score_route(MobilityProfile(profile_id="default"), route)

    assert 0.0 <= score.adequacy <= 1.0
    assert 0.0 <= score.confidence < 1.0
    assert score.uncertainty == 0.0
    assert score.confidence != 1.0 - score.uncertainty


def test_total_cost_equals_sum_of_weighted_contributions() -> None:
    """Every contribution must be traceable to its exact weight and cost."""

    route = load_pilot_route_scenario().routes[0]
    score = score_route(MobilityProfile(profile_id="traceable"), route)

    weights = score.normalized_weights.model_dump()
    costs = score.costs.model_dump()
    contributions = score.contributions.model_dump()

    for name, contribution in contributions.items():
        assert contribution == pytest.approx(weights[name] * costs[name])
    assert score.total_cost == pytest.approx(sum(contributions.values()))
    assert score.adequacy == pytest.approx(1.0 - score.total_cost)


def test_unknown_evidence_cannot_improve_route_adequacy() -> None:
    """Replacing favorable evidence with unknown evidence never raises adequacy."""

    route = load_pilot_route_scenario().routes[0]
    payload = route.model_dump(mode="json")
    payload["uncertainty"].pop("unknown_ratio")
    payload["features"]["tactile_paving"] = {
        "state": "unknown",
        "coverage_ratio": 0.0,
        "sources": [],
        "note": "No se dispone de evidencia sintética.",
    }
    payload["uncertainty"] = {
        "unknown_attributes": [AccessibilityAttribute.TACTILE_PAVING.value],
        "limitations": ["No se dispone de evidencia sintética sobre pavimento podotáctil."],
    }
    route_with_unknown = type(route).model_validate(payload)
    profile = MobilityProfile(profile_id="unknown_test")

    known_score = score_route(profile, route)
    unknown_score = score_route(profile, route_with_unknown)

    assert unknown_score.adequacy < known_score.adequacy
    assert unknown_score.confidence < known_score.confidence
    assert unknown_score.uncertainty > known_score.uncertainty


def test_declared_weights_change_only_the_gradual_adequacy() -> None:
    """Different declared priorities must alter the weighted route result."""

    route = load_pilot_route_scenario().routes[0]
    distance_profile = MobilityProfile(
        profile_id="distance",
        declared_weights=PreferenceWeights(
            distance=1.0,
            complex_crossings=0.0,
            crossing_support=0.0,
            sidewalk_evidence=0.0,
            steps=0.0,
            surface=0.0,
            orientation_complexity=0.0,
            slope=0.0,
            uncertainty=0.0,
        ),
    )
    crossing_profile = MobilityProfile(
        profile_id="crossings",
        declared_weights=PreferenceWeights(
            distance=0.0,
            complex_crossings=1.0,
            crossing_support=0.0,
            sidewalk_evidence=0.0,
            steps=0.0,
            surface=0.0,
            orientation_complexity=0.0,
            slope=0.0,
            uncertainty=0.0,
        ),
    )

    distance_score = score_route(distance_profile, route)
    crossing_score = score_route(crossing_profile, route)

    assert distance_score.adequacy != crossing_score.adequacy
    assert distance_score.confidence == crossing_score.confidence
    assert distance_score.uncertainty == crossing_score.uncertainty


def test_floating_point_rounding_cannot_escape_public_metric_bounds() -> None:
    """Computed adequacy remains within 0..1 even at the maximum total cost."""

    route = load_pilot_route_scenario().routes[0]
    score = score_route(MobilityProfile(profile_id="bounded"), route)
    maximum_contributions = score.contributions.model_copy(
        update={name: weight for name, weight in score.normalized_weights.model_dump().items()}
    )
    maximum_cost_score = score.model_copy(update={"contributions": maximum_contributions})

    assert maximum_cost_score.total_cost == 1.0
    assert maximum_cost_score.adequacy == 0.0
