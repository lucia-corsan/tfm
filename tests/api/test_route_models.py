"""Tests for public route-comparison request and response models."""

import pytest
from pydantic import ValidationError

from backend.api.models import (
    ComparedRouteResponse,
    RejectedRouteResponse,
    RouteCompareRequest,
    RouteCompareResponse,
)
from backend.domain import MobilityProfile
from backend.routing.fixtures import load_pilot_route_scenario
from backend.scoring import rank_routes


def test_compare_request_rejects_identical_origin_and_destination() -> None:
    """A zero-length comparison is invalid before reaching a route provider."""

    scenario = load_pilot_route_scenario()

    with pytest.raises(ValidationError, match="must be different"):
        RouteCompareRequest(
            origin=scenario.origin,
            destination=scenario.origin,
            profile=MobilityProfile(profile_id="same_point"),
        )


def test_compare_request_rejects_undocumented_fields() -> None:
    """The public request must fail rather than silently ignore unknown data."""

    scenario = load_pilot_route_scenario()
    payload = {
        "origin": scenario.origin.model_dump(),
        "destination": scenario.destination.model_dump(),
        "profile": MobilityProfile(profile_id="strict").model_dump(),
        "provider": "ors",
    }

    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        RouteCompareRequest.model_validate(payload)


def test_compare_response_keeps_route_details_and_scores_together() -> None:
    """The serialized API result exposes complete accepted and rejected routes."""

    scenario = load_pilot_route_scenario()
    profile = MobilityProfile(profile_id="response")
    ranking = rank_routes(profile, scenario.routes)
    candidates = {route.route_id: route for route in scenario.routes}
    accepted = [
        ComparedRouteResponse(
            route_id=result.route_id,
            name=candidates[result.route_id].name,
            rank=result.rank,
            category=candidates[result.route_id].category,
            source=candidates[result.route_id].source,
            is_synthetic=candidates[result.route_id].is_synthetic,
            geometry=candidates[result.route_id].geometry,
            distance_m=candidates[result.route_id].features.distance_m,
            duration_s=candidates[result.route_id].features.duration_s,
            score=result.score,
            reasons=result.reasons,
            warnings=result.warnings,
        )
        for result in ranking.routes
    ]
    rejected = [
        RejectedRouteResponse(
            route_id=result.route_id,
            name=candidates[result.route_id].name,
            category=candidates[result.route_id].category,
            source=candidates[result.route_id].source,
            is_synthetic=candidates[result.route_id].is_synthetic,
            violations=result.violations,
        )
        for result in ranking.rejected_routes
    ]

    response = RouteCompareResponse(
        scenario_id=scenario.scenario_id,
        scenario_name=scenario.name,
        origin=scenario.origin,
        destination=scenario.destination,
        profile_id=profile.profile_id,
        routes=accepted,
        rejected_routes=rejected,
    ).model_dump(mode="json")

    assert response["routes"][0]["route_id"] == "balanced_route"
    assert response["routes"][0]["score"]["adequacy"] == pytest.approx(0.8031, abs=1e-4)
    assert response["routes"][0]["is_synthetic"] is True
    assert response["rejected_routes"][0]["route_id"] == "simple_route"


def test_route_response_rejects_score_from_another_candidate() -> None:
    """A route cannot accidentally expose metrics calculated for another route."""

    scenario = load_pilot_route_scenario()
    ranking = rank_routes(MobilityProfile(profile_id="mismatch"), scenario.routes)
    candidate = scenario.routes[0]

    with pytest.raises(ValidationError, match="identifiers must match"):
        ComparedRouteResponse(
            route_id="different_route",
            name=candidate.name,
            rank=1,
            category=candidate.category,
            source=candidate.source,
            is_synthetic=candidate.is_synthetic,
            geometry=candidate.geometry,
            distance_m=candidate.features.distance_m,
            duration_s=candidate.features.duration_s,
            score=ranking.routes[0].score,
            reasons=ranking.routes[0].reasons,
            warnings=ranking.routes[0].warnings,
        )
