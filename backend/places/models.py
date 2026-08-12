"""Validated place-search results shared with the public API."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from backend.domain import GeoPoint


class PlaceResult(BaseModel):
    """One stable searchable location inside the pilot area."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    place_id: str = Field(pattern=r"^[a-z0-9_]+$")
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=180)
    location: GeoPoint
    source: Literal["pilot_catalog", "ors_geocoder"] = "pilot_catalog"
