"""Validated domain models shared by the accessible-routing backend."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator


class DomainModel(BaseModel):
    """Base model that rejects undocumented input fields."""

    model_config = ConfigDict(extra="forbid")


class EvidenceState(str, Enum):
    """State of the available evidence for one accessibility attribute."""

    FAVORABLE = "favorable"
    UNFAVORABLE = "unfavorable"
    UNKNOWN = "unknown"


class DataSource(str, Enum):
    """Provenance of evidence used to characterize a route."""

    FIXTURE = "fixture"
    OSM = "osm"
    ORS = "ors"
    MAPILLARY_METADATA = "mapillary_metadata"
    MANUAL_REVIEW = "manual_review"


class AccessibilityAttribute(str, Enum):
    """Accessibility dimensions whose missing evidence must be exposed."""

    SIDEWALK = "sidewalk"
    STEP_FREE = "step_free"
    PEDESTRIAN_ACCESS = "pedestrian_access"
    CROSSING_COMPATIBILITY = "crossing_compatibility"
    SLOPE = "slope"


class RouteSource(str, Enum):
    """Provider that produced a route candidate."""

    FIXTURE = "fixture"
    ORS = "ors"


class RouteCategory(str, Enum):
    """Purpose of an alternative shown in route comparison."""

    BALANCED = "balanced"
    FEWER_COMPLEX_CROSSINGS = "fewer_complex_crossings"
    SIMPLE_OR_SHORT = "simple_or_short"


class GeoPoint(DomainModel):
    """Geographic coordinate in WGS84 latitude/longitude order."""

    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)


class AccessibilityEvidence(DomainModel):
    """Tri-state evidence with explicit coverage and provenance."""

    state: EvidenceState
    coverage_ratio: float = Field(ge=0.0, le=1.0)
    sources: list[DataSource] = Field(default_factory=list)
    note: Optional[str] = Field(default=None, min_length=1, max_length=240)


class PreferenceWeights(DomainModel):
    """Declared importance of the route costs that can be personalized."""

    distance: float = Field(default=1.0, ge=0.0)
    complex_crossings: float = Field(default=1.0, ge=0.0)
    sidewalk_evidence: float = Field(default=1.0, ge=0.0)
    steps: float = Field(default=1.0, ge=0.0)
    orientation_complexity: float = Field(default=1.0, ge=0.0)
    slope: float = Field(default=1.0, ge=0.0)
    uncertainty: float = Field(default=1.0, ge=0.0)

    @model_validator(mode="after")
    def require_active_preference(self) -> "PreferenceWeights":
        """Reject a profile that has no active gradual preference.

        Returns:
            The validated preference weights.

        Raises:
            ValueError: If every weight is zero.
        """

        if sum(self.model_dump().values()) <= 0.0:
            raise ValueError("at least one preference weight must be greater than zero")
        return self


class MobilityProfile(DomainModel):
    """Safety restrictions and gradual preferences for one local profile."""

    profile_id: str = Field(min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    avoid_steps: bool = True
    require_pedestrian_access: bool = True
    avoid_incompatible_crossings: bool = True
    maximum_slope_percent: Optional[float] = Field(default=None, ge=0.0, le=30.0)
    maximum_detour_ratio: float = Field(default=1.5, ge=1.0, le=3.0)
    declared_weights: PreferenceWeights = Field(default_factory=PreferenceWeights)


class RouteFeatures(DomainModel):
    """Measured and evidenced characteristics of a route candidate."""

    distance_m: float = Field(gt=0.0)
    duration_s: float = Field(gt=0.0)
    detour_ratio: float = Field(ge=1.0, le=3.0)
    crossing_count: int = Field(ge=0)
    signalized_crossing_count: int = Field(ge=0)
    complex_crossing_count: int = Field(ge=0)
    instruction_count: int = Field(ge=1)
    turn_count: int = Field(ge=0)
    sidewalk_coverage_ratio: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    maximum_slope_percent: Optional[float] = Field(default=None, ge=0.0, le=30.0)
    sidewalk: AccessibilityEvidence
    step_free: AccessibilityEvidence
    pedestrian_access: AccessibilityEvidence
    crossing_compatibility: AccessibilityEvidence
    slope: AccessibilityEvidence

    @model_validator(mode="after")
    def validate_feature_counts(self) -> "RouteFeatures":
        """Ensure that feature counts cannot contradict their totals.

        Returns:
            The validated route features.

        Raises:
            ValueError: If a subset count exceeds its corresponding total.
        """

        if self.signalized_crossing_count > self.crossing_count:
            raise ValueError("signalized crossings cannot exceed total crossings")
        if self.complex_crossing_count > self.crossing_count:
            raise ValueError("complex crossings cannot exceed total crossings")
        if self.turn_count > self.instruction_count:
            raise ValueError("turn count cannot exceed instruction count")
        return self

    def evidence_by_attribute(
        self,
    ) -> dict[AccessibilityAttribute, AccessibilityEvidence]:
        """Return each accessibility dimension and its evidence.

        Returns:
            Mapping from accessibility attribute to its evidence object.
        """

        return {
            AccessibilityAttribute.SIDEWALK: self.sidewalk,
            AccessibilityAttribute.STEP_FREE: self.step_free,
            AccessibilityAttribute.PEDESTRIAN_ACCESS: self.pedestrian_access,
            AccessibilityAttribute.CROSSING_COMPATIBILITY: self.crossing_compatibility,
            AccessibilityAttribute.SLOPE: self.slope,
        }


class UncertaintySummary(DomainModel):
    """Missing route attributes and concrete limitations visible to users."""

    unknown_attributes: list[AccessibilityAttribute] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)

    @computed_field(return_type=float)
    @property
    def unknown_ratio(self) -> float:
        """Return the fraction of modeled attributes with unknown evidence."""

        return len(self.unknown_attributes) / len(AccessibilityAttribute)

    @model_validator(mode="after")
    def validate_uncertainty_details(self) -> "UncertaintySummary":
        """Require unique attributes and an explanation for uncertainty.

        Returns:
            The validated uncertainty summary.

        Raises:
            ValueError: If attributes repeat or uncertainty has no limitation.
        """

        if len(self.unknown_attributes) != len(set(self.unknown_attributes)):
            raise ValueError("unknown attributes must be unique")
        if self.unknown_attributes and not self.limitations:
            raise ValueError("unknown attributes require at least one limitation")
        return self


class RouteCandidate(DomainModel):
    """Unscored route alternative with geometry and explicit uncertainty."""

    route_id: str = Field(min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    name: str = Field(min_length=1, max_length=100)
    source: RouteSource
    category: RouteCategory
    is_synthetic: bool = False
    geometry: list[GeoPoint] = Field(min_length=2)
    features: RouteFeatures
    uncertainty: UncertaintySummary

    @model_validator(mode="after")
    def validate_provenance_and_uncertainty(self) -> "RouteCandidate":
        """Prevent synthetic data and missing evidence from being hidden.

        Returns:
            The validated route candidate.

        Raises:
            ValueError: If fixture provenance or unknown evidence is inconsistent.
        """

        if self.source is RouteSource.FIXTURE and not self.is_synthetic:
            raise ValueError("fixture routes must be marked as synthetic")

        expected_unknown: set[AccessibilityAttribute] = {
            attribute
            for attribute, evidence in self.features.evidence_by_attribute().items()
            if evidence.state is EvidenceState.UNKNOWN
        }
        declared_unknown = set(self.uncertainty.unknown_attributes)
        if expected_unknown != declared_unknown:
            raise ValueError(
                "uncertainty must list exactly the attributes with unknown evidence"
            )
        return self


class RouteScenario(DomainModel):
    """Reproducible origin-destination scenario with route alternatives."""

    scenario_id: str = Field(min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=400)
    origin: GeoPoint
    destination: GeoPoint
    routes: list[RouteCandidate] = Field(min_length=1, max_length=3)

    @model_validator(mode="after")
    def require_unique_routes(self) -> "RouteScenario":
        """Ensure route identifiers and categories do not repeat.

        Returns:
            The validated route scenario.

        Raises:
            ValueError: If the scenario contains duplicate alternatives.
        """

        route_ids = [route.route_id for route in self.routes]
        categories = [route.category for route in self.routes]
        if len(route_ids) != len(set(route_ids)):
            raise ValueError("route identifiers must be unique within a scenario")
        if len(categories) != len(set(categories)):
            raise ValueError("route categories must be unique within a scenario")
        return self
