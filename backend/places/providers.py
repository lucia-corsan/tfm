"""Interchangeable local and external place-search providers."""

import unicodedata
from typing import Protocol

from backend.config import Settings
from backend.places.catalog import search_pilot_places
from backend.places.geocoding_cache import GeocodingCache
from backend.places.models import PlaceResult
from backend.places.ors_geocoder import OrsGeocoderClient, OrsGeocoderError


class PlaceSearchUnavailableError(RuntimeError):
    """Raised when a free-text search has no usable provider."""


class PlaceSearchProvider(Protocol):
    """Interface shared by deterministic and external place search."""

    async def search(self, query: str, *, limit: int = 5) -> list[PlaceResult]:
        """Return validated results for one explicit search."""


class GeocoderProvider(Protocol):
    """Minimal external geocoder behavior required by the hybrid provider."""

    async def search(self, query: str, *, limit: int = 5) -> list[PlaceResult]:
        """Return validated external matches for one explicit search."""


class _UnavailableGeocoder:
    """Represent missing external configuration behind the shared interface."""

    async def search(self, query: str, *, limit: int = 5) -> list[PlaceResult]:
        """Raise a sanitized failure without retaining query data."""

        del query, limit
        raise OrsGeocoderError("ORS geocoder unavailable")


class CatalogPlaceSearchProvider:
    """Expose only the deterministic pilot catalog."""

    async def search(self, query: str, *, limit: int = 5) -> list[PlaceResult]:
        """Return local matches without external traffic."""

        return search_pilot_places(query, limit=limit)


def _normalized_name(place: PlaceResult) -> str:
    """Return an accent-insensitive name used only for deduplication."""

    decomposed = unicodedata.normalize("NFKD", place.name.casefold())
    return "".join(
        character for character in decomposed if not unicodedata.combining(character)
    )


class HybridPlaceSearchProvider:
    """Combine stable catalog matches with bounded ORS geocoding."""

    def __init__(self, geocoder: GeocoderProvider) -> None:
        """Store the external client behind the shared interface."""

        self._geocoder = geocoder

    async def search(self, query: str, *, limit: int = 5) -> list[PlaceResult]:
        """Return local-first results and a safe fallback on external failure."""

        local = search_pilot_places(query, limit=limit)
        try:
            external = await self._geocoder.search(query, limit=limit)
        except OrsGeocoderError:
            if local:
                return local
            raise PlaceSearchUnavailableError("place search unavailable") from None

        combined: list[PlaceResult] = []
        seen_names: set[str] = set()
        for place in [*local, *external]:
            normalized_name = _normalized_name(place)
            if normalized_name in seen_names:
                continue
            seen_names.add(normalized_name)
            combined.append(place)
            if len(combined) == limit:
                break
        return combined


def create_place_search_provider(settings: Settings) -> PlaceSearchProvider:
    """Create the configured place provider without exposing credentials."""

    if settings.place_search_provider == "catalog":
        return CatalogPlaceSearchProvider()
    if settings.ors_api_key is None:
        return HybridPlaceSearchProvider(_UnavailableGeocoder())
    geocoder = OrsGeocoderClient(
        settings.ors_api_key,
        timeout_seconds=settings.ors_geocode_timeout_seconds,
        cache=GeocodingCache(settings.ors_geocode_cache_dir),
    )
    return HybridPlaceSearchProvider(geocoder)
