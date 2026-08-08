"""Validated outputs produced by accessibility safety constraints."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator

from backend.domain import AccessibilityAttribute, EvidenceState, PreferenceWeights


class ConstraintCode(str, Enum):
    """Stable reason codes for rejecting a route candidate."""

    STEPS = "steps"
    PEDESTRIAN_ACCESS = "pedestrian_access"
    INCOMPATIBLE_CROSSINGS = "incompatible_crossings"
    MAXIMUM_SLOPE = "maximum_slope"
    MAXIMUM_DETOUR = "maximum_detour"


class ConstraintViolation(BaseModel):
    """One confirmed incompatibility between a profile and a route."""

    model_config = ConfigDict(extra="forbid")

    code: ConstraintCode
    actual_value: Optional[float] = Field(default=None, ge=0.0)
    limit_value: Optional[float] = Field(default=None, ge=0.0)


class ConstraintEvaluation(BaseModel):
    """Complete critical-constraint result for one route candidate."""

    model_config = ConfigDict(extra="forbid")

    violations: list[ConstraintViolation] = Field(default_factory=list)

    @computed_field(return_type=bool)
    @property
    def accepted(self) -> bool:
        """Return whether the route passes every critical constraint."""

        return not self.violations


class RouteCosts(BaseModel):
    """Normalized gradual costs used by the explainable scoring formula."""

    model_config = ConfigDict(extra="forbid")

    distance: float = Field(ge=0.0, le=1.0)
    complex_crossings: float = Field(ge=0.0, le=1.0)
    crossing_support: float = Field(ge=0.0, le=1.0)
    sidewalk_evidence: float = Field(ge=0.0, le=1.0)
    steps: float = Field(ge=0.0, le=1.0)
    surface: float = Field(ge=0.0, le=1.0)
    orientation_complexity: float = Field(ge=0.0, le=1.0)
    slope: float = Field(ge=0.0, le=1.0)
    uncertainty: float = Field(ge=0.0, le=1.0)


class NormalizedWeights(PreferenceWeights):
    """Gradual preference coefficients constrained to sum to one."""

    @model_validator(mode="after")
    def require_unit_sum(self) -> "NormalizedWeights":
        """Reject coefficients that do not form a normalized distribution."""

        if abs(sum(self.model_dump().values()) - 1.0) > 1e-9:
            raise ValueError("normalized weights must sum to one")
        return self


class RouteScore(BaseModel):
    """Separate explainable metrics for one route and one profile."""

    model_config = ConfigDict(extra="forbid")

    route_id: str = Field(min_length=1, max_length=64)
    normalized_weights: NormalizedWeights
    costs: RouteCosts
    contributions: RouteCosts
    confidence: float = Field(ge=0.0, le=1.0)
    uncertainty: float = Field(ge=0.0, le=1.0)

    @computed_field(return_type=float)
    @property
    def total_cost(self) -> float:
        """Return the weighted sum of normalized route costs."""

        total = sum(self.contributions.model_dump().values())
        return min(max(total, 0.0), 1.0)

    @computed_field(return_type=float)
    @property
    def adequacy(self) -> float:
        """Return gradual profile adequacy without implying route safety."""

        return 1.0 - self.total_cost


class ScoringDimension(str, Enum):
    """Gradual dimensions that can appear in a route explanation."""

    DISTANCE = "distance"
    COMPLEX_CROSSINGS = "complex_crossings"
    CROSSING_SUPPORT = "crossing_support"
    SIDEWALK_EVIDENCE = "sidewalk_evidence"
    STEPS = "steps"
    SURFACE = "surface"
    ORIENTATION_COMPLEXITY = "orientation_complexity"
    SLOPE = "slope"
    UNCERTAINTY = "uncertainty"


class ReasonKind(str, Enum):
    """Traceable basis for selecting an explanatory factor."""

    RELATIVE_ADVANTAGE = "relative_advantage"
    LOW_ABSOLUTE_COST = "low_absolute_cost"
    LEAST_COSTLY_ACTIVE_FACTOR = "least_costly_active_factor"


class RouteReason(BaseModel):
    """One scoring factor selected for deterministic presentation."""

    model_config = ConfigDict(extra="forbid")

    kind: ReasonKind
    dimension: ScoringDimension
    cost: float = Field(ge=0.0, le=1.0)
    contribution: float = Field(ge=0.0, le=1.0)
    comparison_cost: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class RouteWarning(BaseModel):
    """Unknown or unfavorable evidence that must remain visible."""

    model_config = ConfigDict(extra="forbid")

    attribute: AccessibilityAttribute
    state: EvidenceState
    coverage_ratio: float = Field(ge=0.0, le=1.0)
    note: Optional[str] = Field(default=None, min_length=1, max_length=240)

    @model_validator(mode="after")
    def reject_favorable_warning(self) -> "RouteWarning":
        """Ensure favorable evidence is never mislabeled as a warning."""

        if self.state is EvidenceState.FAVORABLE:
            raise ValueError("route warnings require unknown or unfavorable evidence")
        return self


class RankedRoute(BaseModel):
    """Accepted route with deterministic rank and traceable presentation data."""

    model_config = ConfigDict(extra="forbid")

    route_id: str = Field(min_length=1, max_length=64)
    rank: int = Field(ge=1)
    score: RouteScore
    reasons: list[RouteReason] = Field(min_length=1, max_length=3)
    warnings: list[RouteWarning] = Field(default_factory=list)


class RejectedRoute(BaseModel):
    """Candidate excluded by one or more critical constraints."""

    model_config = ConfigDict(extra="forbid")

    route_id: str = Field(min_length=1, max_length=64)
    violations: list[ConstraintViolation] = Field(min_length=1)


class RouteRanking(BaseModel):
    """Complete accepted and rejected result for one profile comparison."""

    model_config = ConfigDict(extra="forbid")

    profile_id: str = Field(min_length=1, max_length=64)
    routes: list[RankedRoute] = Field(default_factory=list, max_length=3)
    rejected_routes: list[RejectedRoute] = Field(default_factory=list, max_length=3)

    @model_validator(mode="after")
    def require_unique_candidates(self) -> "RouteRanking":
        """Prevent a candidate from appearing twice or in both result groups."""

        route_ids = [route.route_id for route in self.routes]
        route_ids.extend(route.route_id for route in self.rejected_routes)
        if len(route_ids) > 3:
            raise ValueError("a route ranking cannot contain more than three candidates")
        if len(route_ids) != len(set(route_ids)):
            raise ValueError("ranked and rejected route identifiers must be unique")
        expected_ranks = list(range(1, len(self.routes) + 1))
        if [route.rank for route in self.routes] != expected_ranks:
            raise ValueError("accepted route ranks must be consecutive and ordered")
        return self
