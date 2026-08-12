"""Privacy-preserving local place-search endpoint."""

from typing import Annotated

from fastapi import APIRouter, Query, status

from backend.api.models import ErrorResponse, PlaceSearchResponse
from backend.places import search_pilot_places

router = APIRouter(prefix="/places", tags=["places"])


@router.get(
    "/search",
    response_model=PlaceSearchResponse,
    responses={status.HTTP_422_UNPROCESSABLE_ENTITY: {"model": ErrorResponse}},
    summary="Search reproducible places inside the pilot area",
)
async def search_places(
    q: Annotated[
        str,
        Query(min_length=2, max_length=80, pattern=r".*\S.*"),
    ],
    limit: Annotated[int, Query(ge=1, le=10)] = 5,
) -> PlaceSearchResponse:
    """Return matching pilot places without contacting an external service.

    Args:
        q: Case- and accent-insensitive place text.
        limit: Maximum number of returned matches.

    Returns:
        Deterministically ordered local place results.
    """

    return PlaceSearchResponse(places=search_pilot_places(q, limit=limit))
