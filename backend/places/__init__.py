"""Local and future external place-search providers."""

from backend.places.catalog import search_pilot_places
from backend.places.models import PlaceResult

__all__ = ["PlaceResult", "search_pilot_places"]
