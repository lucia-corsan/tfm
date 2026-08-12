"""Public API models for profile-aware route comparison."""

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator

from backend.domain import (
    GeoPoint,
    MobilityProfile,
    RouteCategory,
    RouteSource,
)
from backend.scoring import (
    ConstraintViolation,
    RouteReason,
    RouteScore,
    RouteWarning,
)


class ApiModel(BaseModel):
    """Base API model that rejects undocumented fields."""

    model_config = ConfigDict(extra="forbid")


class RouteCompareRequest(ApiModel):
    """Origin, destination, and local profile used to compare routes."""

    origin: GeoPoint
    destination: GeoPoint
    profile: MobilityProfile

    @model_validator(mode="after")
    def require_distinct_endpoints(self) -> "RouteCompareRequest":
        """Reject a comparison whose origin and destination are identical."""

        if self.origin == self.destination:
            raise ValueError("origin and destination must be different")
        return self


class ComparedRouteResponse(ApiModel):
    """Accepted route details and explainable ranking output."""

    route_id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=100)
    rank: int = Field(ge=1, le=3)
    category: RouteCategory
    source: RouteSource
    is_synthetic: bool
    geometry: list[GeoPoint] = Field(min_length=2)
    distance_m: float = Field(gt=0.0)
    duration_s: float = Field(gt=0.0)
    score: RouteScore
    reasons: list[RouteReason] = Field(min_length=1, max_length=3)
    warnings: list[RouteWarning] = Field(default_factory=list)

    @model_validator(mode="after")
    def require_matching_score_route(self) -> "ComparedRouteResponse":
        """Keep route details and their computed score tied to one identifier."""

        if self.route_id != self.score.route_id:
            raise ValueError("route response and score identifiers must match")
        return self


class RejectedRouteResponse(ApiModel):
    """Route details excluded by confirmed critical incompatibilities."""

    route_id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=100)
    category: RouteCategory
    source: RouteSource
    is_synthetic: bool
    violations: list[ConstraintViolation] = Field(min_length=1)


class RouteCompareResponse(ApiModel):
    """Complete route comparison returned to the mobile application."""

    scenario_id: str = Field(min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    scenario_name: str = Field(min_length=1, max_length=120)
    origin: GeoPoint
    destination: GeoPoint
    profile_id: str = Field(min_length=1, max_length=64)
    routes: list[ComparedRouteResponse] = Field(default_factory=list, max_length=3)
    rejected_routes: list[RejectedRouteResponse] = Field(default_factory=list, max_length=3)

    @model_validator(mode="after")
    def validate_complete_candidate_set(self) -> "RouteCompareResponse":
        """Require unique candidates and consecutive accepted-route ranks."""

        route_ids = [route.route_id for route in self.routes]
        route_ids.extend(route.route_id for route in self.rejected_routes)
        if len(route_ids) > 3:
            raise ValueError("a comparison cannot contain more than three candidates")
        if len(route_ids) != len(set(route_ids)):
            raise ValueError("accepted and rejected route identifiers must be unique")
        if [route.rank for route in self.routes] != list(range(1, len(self.routes) + 1)):
            raise ValueError("accepted route ranks must be consecutive and ordered")
        return self


class ApiErrorCode(str, Enum):
    """Stable error identifiers translated by the mobile application."""

    INVALID_REQUEST = "invalid_request"
    ROUTE_SCENARIO_NOT_FOUND = "route_scenario_not_found"
    ROUTING_PROVIDER_UNAVAILABLE = "routing_provider_unavailable"
    PLACE_SEARCH_UNAVAILABLE = "place_search_unavailable"


class ErrorResponse(ApiModel):
    """Sanitized API error without coordinates, URLs, or credentials."""

    code: ApiErrorCode
