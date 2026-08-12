"""Privacy-preserving local place-search endpoint."""

from typing import Annotated, Union

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse

from backend.api.models import ApiErrorCode, ErrorResponse, PlaceSearchResponse
from backend.config import Settings, get_settings
from backend.places import (
    PlaceSearchUnavailableError,
    create_place_search_provider,
)

router = APIRouter(prefix="/places", tags=["places"])


@router.get(
    "/search",
    response_model=PlaceSearchResponse,
    responses={
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"model": ErrorResponse},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse},
    },
    summary="Search places and addresses inside the pilot area",
)
async def search_places(
    settings: Annotated[Settings, Depends(get_settings)],
    q: Annotated[
        str,
        Query(min_length=2, max_length=80, pattern=r".*\S.*"),
    ],
    limit: Annotated[int, Query(ge=1, le=10)] = 5,
) -> Union[PlaceSearchResponse, JSONResponse]:
    """Return local or geocoded pilot-area places with a safe fallback.

    Args:
        q: Case- and accent-insensitive place text.
        limit: Maximum number of returned matches.

    Returns:
        Ordered place results or one sanitized availability error.
    """

    try:
        provider = create_place_search_provider(settings)
        places = await provider.search(q, limit=limit)
    except PlaceSearchUnavailableError:
        error = ErrorResponse(code=ApiErrorCode.PLACE_SEARCH_UNAVAILABLE)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=error.model_dump(mode="json"),
        )
    return PlaceSearchResponse(places=places)
