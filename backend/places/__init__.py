"""Local and future external place-search providers."""

from backend.places.catalog import search_pilot_places
from backend.places.geocoding_cache import GeocodingCache, GeocodingCacheError
from backend.places.models import PlaceResult
from backend.places.ors_geocoder import OrsGeocoderClient, OrsGeocoderError
from backend.places.providers import (
    PlaceSearchProvider,
    PlaceSearchUnavailableError,
    create_place_search_provider,
)

__all__ = [
    "OrsGeocoderClient",
    "OrsGeocoderError",
    "GeocodingCache",
    "GeocodingCacheError",
    "PlaceSearchProvider",
    "PlaceSearchUnavailableError",
    "PlaceResult",
    "create_place_search_provider",
    "search_pilot_places",
]
