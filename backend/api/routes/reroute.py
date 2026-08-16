"""Confirmed profile-aware rerouting endpoint."""

from typing import Annotated, Union

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from backend.api.models import (
    ApiErrorCode,
    ErrorResponse,
    RouteCompareResponse,
    RouteRerouteRequest,
)
from backend.config import Settings, get_settings
from backend.routing.providers import (
    RouteScenarioNotFoundError,
    RoutingProviderUnavailableError,
    create_route_scenario_provider,
)
from backend.services import reroute_routes as reroute_routes_service

router = APIRouter(prefix="/routes", tags=["routes"])

_ERROR_RESPONSES = {
    status.HTTP_422_UNPROCESSABLE_ENTITY: {"model": ErrorResponse},
    status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse},
}


@router.post(
    "/reroute",
    response_model=RouteCompareResponse,
    responses=_ERROR_RESPONSES,
    summary="Recalculate pedestrian routes after a confirmed deviation",
)
async def reroute_routes(
    request: RouteRerouteRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> Union[RouteCompareResponse, JSONResponse]:
    """Return reranked alternatives without persisting the submitted position.

    Args:
        request: Confirmed position, destination, and unchanged mobility profile.
        settings: Backend-only provider configuration.

    Returns:
        Complete rerouting comparison or a stable sanitized error code.
    """

    try:
        provider = create_route_scenario_provider(settings)
        return await reroute_routes_service(request, provider)
    except RouteScenarioNotFoundError:
        error = ErrorResponse(code=ApiErrorCode.ROUTE_SCENARIO_NOT_FOUND)
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error.model_dump(mode="json"),
        )
    except RoutingProviderUnavailableError:
        error = ErrorResponse(code=ApiErrorCode.ROUTING_PROVIDER_UNAVAILABLE)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=error.model_dump(mode="json"),
        )
