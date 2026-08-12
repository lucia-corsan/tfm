"""Deterministic privacy-preserving place catalog for the pilot area."""

import unicodedata
from dataclasses import dataclass
from typing import Optional

from backend.domain import GeoPoint
from backend.places.models import PlaceResult


@dataclass(frozen=True)
class _PlaceRecord:
    """Internal catalog entry with non-public search aliases."""

    result: PlaceResult
    aliases: tuple[str, ...] = ()


_PILOT_PLACES = (
    _PlaceRecord(
        result=PlaceResult(
            place_id="moncloa",
            name="Moncloa",
            description="Intercambiador y entorno de la plaza de Moncloa.",
            location=GeoPoint(latitude=40.4353, longitude=-3.7191),
        ),
        aliases=("intercambiador de moncloa", "plaza de moncloa"),
    ),
    _PlaceRecord(
        result=PlaceResult(
            place_id="arguelles",
            name="Argüelles",
            description="Entorno de la estación de Argüelles.",
            location=GeoPoint(latitude=40.4304497, longitude=-3.7155854),
        ),
        aliases=("estacion de arguelles", "metro arguelles"),
    ),
    _PlaceRecord(
        result=PlaceResult(
            place_id="principe_pio",
            name="Príncipe Pío",
            description="Intercambiador y entorno de la estación de Príncipe Pío.",
            location=GeoPoint(latitude=40.4211, longitude=-3.7206),
        ),
        aliases=("estacion de principe pio", "intercambiador de principe pio"),
    ),
    _PlaceRecord(
        result=PlaceResult(
            place_id="plaza_espana",
            name="Plaza de España",
            description="Entorno de la estación y la plaza de España.",
            location=GeoPoint(latitude=40.4246983, longitude=-3.7118298),
        ),
        aliases=("plaza espana", "metro plaza de espana"),
    ),
)


def _normalize_search_text(value: str) -> str:
    """Normalize accents, case and repeated whitespace for local matching."""

    decomposed = unicodedata.normalize("NFKD", value.casefold())
    without_marks = "".join(
        character
        for character in decomposed
        if not unicodedata.combining(character)
    )
    return " ".join(without_marks.split())


def _match_priority(
    query: str,
    record: _PlaceRecord,
) -> Optional[tuple[int, str, str]]:
    """Return deterministic relevance fields or no match for one record."""

    searchable = (
        _normalize_search_text(record.result.name),
        *(_normalize_search_text(alias) for alias in record.aliases),
    )
    if query in searchable:
        priority = 0
    elif any(text.startswith(query) for text in searchable):
        priority = 1
    elif any(
        word.startswith(query)
        for text in searchable
        for word in text.split()
    ):
        priority = 2
    elif any(query in text for text in searchable):
        priority = 3
    else:
        return None
    return (
        priority,
        _normalize_search_text(record.result.name),
        record.result.place_id,
    )


def search_pilot_places(query: str, *, limit: int = 5) -> list[PlaceResult]:
    """Search the fixed pilot catalog without network traffic.

    Args:
        query: User text already constrained by the API.
        limit: Maximum number of results between one and ten.

    Returns:
        Stable public place results ordered by local relevance.

    Raises:
        ValueError: If the normalized query or limit is outside supported bounds.
    """

    normalized_query = _normalize_search_text(query)
    if not 2 <= len(normalized_query) <= 80:
        raise ValueError("place query must contain between 2 and 80 characters")
    if not 1 <= limit <= 10:
        raise ValueError("place result limit must be between 1 and 10")
    matches = [
        (priority, record.result)
        for record in _PILOT_PLACES
        if (priority := _match_priority(normalized_query, record)) is not None
    ]
    return [result for _priority, result in sorted(matches, key=lambda item: item[0])][
        :limit
    ]
