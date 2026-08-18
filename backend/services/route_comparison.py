"""Application service for complete profile-aware route comparison."""

from backend.api.models import (
    ComparedRouteResponse,
    RejectedRouteResponse,
    RouteCompareRequest,
    RouteCompareResponse,
    RouteRerouteRequest,
)
from backend.routing.providers import RouteScenarioProvider
from backend.scoring import rank_routes


async def compare_routes(
    request: RouteCompareRequest,
    provider: RouteScenarioProvider,
) -> RouteCompareResponse:
    """Resolve candidates, apply safety rules, and build the API response.

    Args:
        request: Validated origin, destination, and mobility profile.
        provider: Configured source of candidate route scenarios.

    Returns:
        Complete accepted and rejected route comparison.

    Raises:
        RouteScenarioNotFoundError: If the provider cannot resolve the endpoints.
    """

    scenario = await provider.get_scenario(
        request.origin,
        request.destination,
        request.profile,
    )
    ranking = rank_routes(
        request.profile,
        scenario.routes,
        effective_weights=request.effective_weights,
    )
    candidates = {route.route_id: route for route in scenario.routes}
    accepted_routes = [
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
            instructions=candidates[result.route_id].instructions,
            score=result.score,
            reasons=result.reasons,
            warnings=result.warnings,
        )
        for result in ranking.routes
    ]
    rejected_routes = [
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

    return RouteCompareResponse(
        scenario_id=scenario.scenario_id,
        scenario_name=scenario.name,
        origin=scenario.origin,
        destination=scenario.destination,
        profile_id=request.profile.profile_id,
        routes=accepted_routes,
        rejected_routes=rejected_routes,
    )


async def reroute_routes(
    request: RouteRerouteRequest,
    provider: RouteScenarioProvider,
) -> RouteCompareResponse:
    """Recalculate ranked routes from a user-confirmed current position.

    Args:
        request: Confirmed position, original destination, and unchanged profile.
        provider: Configured source of candidate route scenarios.

    Returns:
        A complete comparison whose origin is the confirmed current position.
    """

    return await compare_routes(
        RouteCompareRequest(
            origin=request.current_position,
            destination=request.destination,
            profile=request.profile,
            effective_weights=request.effective_weights,
        ),
        provider,
    )
