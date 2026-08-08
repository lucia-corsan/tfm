"""Profile-aware route-comparison endpoint."""

from typing import Annotated, Union

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from backend.api.models import (
    ApiErrorCode,
    ErrorResponse,
    RouteCompareRequest,
    RouteCompareResponse,
)
from backend.config import Settings, get_settings
from backend.routing.providers import (
    RouteScenarioNotFoundError,
    RoutingProviderUnavailableError,
    create_route_scenario_provider,
)
from backend.services import compare_routes as compare_routes_service

router = APIRouter(prefix="/routes", tags=["routes"])

_ERROR_RESPONSES = {
    status.HTTP_422_UNPROCESSABLE_ENTITY: {"model": ErrorResponse},
    status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
    status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse},
}


@router.post(
    "/compare",
    response_model=RouteCompareResponse,
    responses=_ERROR_RESPONSES,
    summary="Compare pedestrian routes for an accessibility profile",
)
async def compare_routes(
    request: RouteCompareRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> Union[RouteCompareResponse, JSONResponse]:
    """Return ranked fixture routes or a sanitized provider error.

    Args:
        request: Validated endpoints and local mobility profile.
        settings: Backend-only provider configuration.

    Returns:
        Complete route comparison or a stable sanitized error code.
    """

    try:
        provider = create_route_scenario_provider(settings.routing_provider)
        return compare_routes_service(request, provider)
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
