"""Public response models for place search."""

from pydantic import BaseModel, ConfigDict

from backend.places import PlaceResult


class PlaceSearchResponse(BaseModel):
    """Bounded local place-search response."""

    model_config = ConfigDict(extra="forbid")

    places: list[PlaceResult]
