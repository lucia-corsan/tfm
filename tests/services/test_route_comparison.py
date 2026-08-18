"""Tests for the route-comparison application service."""

import pytest

from backend.api.models import RouteCompareRequest, RouteRerouteRequest
from backend.domain import MobilityProfile, PreferenceWeights
from backend.routing.fixtures import load_pilot_route_scenario
from backend.routing.providers import FixtureRouteScenarioProvider
from backend.services import compare_routes, reroute_routes


def _request(profile: MobilityProfile) -> RouteCompareRequest:
    """Build a valid request for the reproducible pilot scenario."""

    scenario = load_pilot_route_scenario()
    return RouteCompareRequest(
        origin=scenario.origin,
        destination=scenario.destination,
        profile=profile,
    )


@pytest.mark.asyncio
async def test_service_returns_complete_default_comparison() -> None:
    """The service combines route details, ranking, and critical exclusions."""

    response = await compare_routes(
        _request(MobilityProfile(profile_id="default")),
        FixtureRouteScenarioProvider(),
    )

    assert response.scenario_id == "moncloa_principe_pio"
    assert [route.route_id for route in response.routes] == [
        "balanced_route",
        "fewer_crossings_route",
    ]
    assert [route.route_id for route in response.rejected_routes] == ["simple_route"]
    assert all(route.is_synthetic for route in response.routes)
    assert all(route.geometry for route in response.routes)
    assert all(route.instructions for route in response.routes)
    assert response.routes[0].instructions[-1].maneuver.value == "arrive"


@pytest.mark.asyncio
async def test_service_applies_profile_weights_without_changing_provider() -> None:
    """Personalization changes ranking while candidate generation stays fixed."""

    weights = {name: 0.0 for name in PreferenceWeights.model_fields}
    weights["complex_crossings"] = 1.0
    profile = MobilityProfile(
        profile_id="crossings",
        declared_weights=PreferenceWeights(**weights),
    )

    response = await compare_routes(_request(profile), FixtureRouteScenarioProvider())

    assert response.routes[0].route_id == "fewer_crossings_route"
    assert response.routes[0].score.normalized_weights.complex_crossings == 1.0


@pytest.mark.asyncio
async def test_service_keeps_declared_and_effective_weights_separate() -> None:
    """Adaptation may reorder gradual costs without mutating critical rules."""

    declared = PreferenceWeights()
    effective_values = {name: 0.0 for name in PreferenceWeights.model_fields}
    effective_values["complex_crossings"] = 1.0
    profile = MobilityProfile(
        profile_id="adapted",
        declared_weights=declared,
        avoid_incompatible_crossings=True,
    )
    scenario = load_pilot_route_scenario()
    request = RouteCompareRequest(
        origin=scenario.origin,
        destination=scenario.destination,
        profile=profile,
        effective_weights=PreferenceWeights(**effective_values),
    )

    response = await compare_routes(request, FixtureRouteScenarioProvider())

    assert profile.declared_weights == declared
    assert response.routes[0].route_id == "fewer_crossings_route"
    assert response.routes[0].score.normalized_weights.complex_crossings == 1.0
    assert [route.route_id for route in response.rejected_routes] == ["simple_route"]


@pytest.mark.asyncio
async def test_service_response_is_reproducible() -> None:
    """Identical provider data and profile produce byte-equivalent model data."""

    request = _request(MobilityProfile(profile_id="stable"))
    provider = FixtureRouteScenarioProvider()

    first = (await compare_routes(request, provider)).model_dump_json()
    second = (await compare_routes(request, provider)).model_dump_json()

    assert first == second


@pytest.mark.asyncio
async def test_reroute_service_reuses_the_complete_comparison_pipeline() -> None:
    """Confirmed rerouting keeps the profile and produces ranked alternatives."""

    scenario = load_pilot_route_scenario()
    weights = {name: 0.0 for name in PreferenceWeights.model_fields}
    weights["complex_crossings"] = 1.0
    profile = MobilityProfile(
        profile_id="reroute_crossings",
        declared_weights=PreferenceWeights(**weights),
    )
    request = RouteRerouteRequest(
        current_position=scenario.origin,
        destination=scenario.destination,
        profile=profile,
        effective_weights=PreferenceWeights(**weights),
    )

    response = await reroute_routes(request, FixtureRouteScenarioProvider())

    assert response.origin == request.current_position
    assert response.destination == request.destination
    assert response.profile_id == profile.profile_id
    assert response.routes[0].route_id == "fewer_crossings_route"
