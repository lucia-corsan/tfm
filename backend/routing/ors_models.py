"""Validated transport models for OpenRouteService directions data."""

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from backend.domain import GeoPoint, NavigationManeuver

_ORS_MANEUVER_BY_TYPE = {
    0: NavigationManeuver.TURN_LEFT,
    1: NavigationManeuver.TURN_RIGHT,
    2: NavigationManeuver.TURN_SHARP_LEFT,
    3: NavigationManeuver.TURN_SHARP_RIGHT,
    4: NavigationManeuver.TURN_SLIGHT_LEFT,
    5: NavigationManeuver.TURN_SLIGHT_RIGHT,
    6: NavigationManeuver.CONTINUE_STRAIGHT,
    7: NavigationManeuver.ENTER_ROUNDABOUT,
    8: NavigationManeuver.EXIT_ROUNDABOUT,
    9: NavigationManeuver.U_TURN,
    10: NavigationManeuver.ARRIVE,
    11: NavigationManeuver.DEPART,
    12: NavigationManeuver.KEEP_LEFT,
    13: NavigationManeuver.KEEP_RIGHT,
}


class OrsTransportModel(BaseModel):
    """Base model for the documented ORS fields used by the backend."""

    model_config = ConfigDict(extra="ignore")


class OrsAlternativeRoutes(BaseModel):
    """Parameters that constrain the diversity of ORS alternatives."""

    model_config = ConfigDict(extra="forbid")

    target_count: int = Field(default=3, ge=1, le=3)
    share_factor: float = Field(default=0.6, ge=0.0, le=1.0)
    weight_factor: float = Field(default=1.4, ge=1.0, le=3.0)


class OrsRouteOptions(BaseModel):
    """Advanced ORS options derived from critical profile restrictions."""

    model_config = ConfigDict(extra="forbid")

    avoid_features: list[Literal["steps"]] = Field(default_factory=list)


class OrsRouteRequest(BaseModel):
    """Canonical body sent to the ORS pedestrian GeoJSON endpoint."""

    model_config = ConfigDict(extra="forbid")

    coordinates: list[tuple[float, float]] = Field(min_length=2, max_length=2)
    language: Literal["es"] = "es"
    instructions: Literal[True] = True
    instructions_format: Literal["text"] = "text"
    extra_info: list[Literal["steepness", "surface", "waytype"]] = Field(
        default_factory=lambda: ["steepness", "surface", "waytype"]
    )
    alternative_routes: OrsAlternativeRoutes = Field(default_factory=OrsAlternativeRoutes)
    options: Optional[OrsRouteOptions] = None

    @model_validator(mode="after")
    def validate_coordinates(self) -> "OrsRouteRequest":
        """Validate each coordinate in ORS longitude-latitude order.

        Returns:
            The validated request body.

        Raises:
            ValueError: If a longitude or latitude falls outside WGS84 bounds.
        """

        for longitude, latitude in self.coordinates:
            if not -180.0 <= longitude <= 180.0:
                raise ValueError("ORS longitude must be between -180 and 180")
            if not -90.0 <= latitude <= 90.0:
                raise ValueError("ORS latitude must be between -90 and 90")
        return self


class OrsRouteSummary(OrsTransportModel):
    """Distance and duration summary for one ORS route."""

    distance: float = Field(gt=0.0)
    duration: float = Field(gt=0.0)


class OrsInstruction(OrsTransportModel):
    """One turn-by-turn instruction returned by ORS."""

    distance: float = Field(ge=0.0)
    duration: float = Field(ge=0.0)
    type: int = Field(ge=0, le=13)
    instruction: str = Field(min_length=1)
    name: str = ""
    way_points: tuple[int, int]

    @model_validator(mode="after")
    def validate_way_points(self) -> "OrsInstruction":
        """Ensure the instruction follows the route geometry forwards.

        Returns:
            The validated instruction.

        Raises:
            ValueError: If geometry indices are negative or reversed.
        """

        start, end = self.way_points
        if start < 0 or end < start:
            raise ValueError("ORS instruction way points must be ordered")
        return self


class OrsRouteSegment(OrsTransportModel):
    """One section between requested ORS waypoints."""

    distance: float = Field(gt=0.0)
    duration: float = Field(gt=0.0)
    steps: list[OrsInstruction] = Field(min_length=1)


class OrsExtraSummary(OrsTransportModel):
    """Aggregated length and coverage for one ORS extra-information value."""

    value: float
    distance: float = Field(ge=0.0)
    amount: float = Field(ge=0.0, le=100.0)


class OrsExtra(OrsTransportModel):
    """Sections and summary for an ORS extra-information dimension."""

    values: list[tuple[int, int, float]] = Field(default_factory=list)
    summary: list[OrsExtraSummary] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_sections(self) -> "OrsExtra":
        """Ensure extra-information geometry ranges are ordered.

        Returns:
            The validated extra-information collection.

        Raises:
            ValueError: If a section range is negative or reversed.
        """

        for start, end, _value in self.values:
            if start < 0 or end < start:
                raise ValueError("ORS extra-information sections must be ordered")
        return self


class OrsRouteProperties(OrsTransportModel):
    """Routing data attached to one GeoJSON feature."""

    summary: OrsRouteSummary
    segments: list[OrsRouteSegment] = Field(min_length=1)
    extras: dict[str, OrsExtra] = Field(default_factory=dict)
    way_points: list[int] = Field(default_factory=list)


class OrsLineString(OrsTransportModel):
    """Explicit ORS route geometry in GeoJSON longitude-latitude order."""

    type: Literal["LineString"]
    coordinates: list[tuple[float, float]] = Field(min_length=2)

    @model_validator(mode="after")
    def validate_coordinates(self) -> "OrsLineString":
        """Validate all route vertices as two-dimensional WGS84 positions.

        Returns:
            The validated line geometry.

        Raises:
            ValueError: If a coordinate falls outside WGS84 bounds.
        """

        for longitude, latitude in self.coordinates:
            if not -180.0 <= longitude <= 180.0:
                raise ValueError("ORS geometry longitude is outside WGS84 bounds")
            if not -90.0 <= latitude <= 90.0:
                raise ValueError("ORS geometry latitude is outside WGS84 bounds")
        return self


class OrsRouteFeature(OrsTransportModel):
    """One route alternative encoded as a GeoJSON feature."""

    type: Literal["Feature"]
    geometry: OrsLineString
    properties: OrsRouteProperties


class OrsEngineMetadata(OrsTransportModel):
    """Optional ORS engine version information useful for reproducibility."""

    version: Optional[str] = None
    build_date: Optional[str] = None
    graph_date: Optional[str] = None


class OrsResponseMetadata(OrsTransportModel):
    """Non-secret provenance returned by ORS."""

    attribution: Optional[str] = None
    service: Optional[str] = None
    engine: Optional[OrsEngineMetadata] = None


class OrsRouteCollection(OrsTransportModel):
    """Validated GeoJSON collection containing up to three ORS routes."""

    type: Literal["FeatureCollection"]
    features: list[OrsRouteFeature] = Field(min_length=1, max_length=3)
    metadata: Optional[OrsResponseMetadata] = None

    @model_validator(mode="after")
    def validate_geometry_references(self) -> "OrsRouteCollection":
        """Ensure instruction and extra ranges refer to existing vertices.

        Returns:
            The validated route collection.

        Raises:
            ValueError: If a referenced geometry index is outside its route.
        """

        for feature in self.features:
            last_index = len(feature.geometry.coordinates) - 1
            for segment in feature.properties.segments:
                for step in segment.steps:
                    if step.way_points[1] > last_index:
                        raise ValueError("ORS instruction references missing geometry")
            for extra in feature.properties.extras.values():
                for _start, end, _value in extra.values:
                    if end > last_index:
                        raise ValueError("ORS extra information references missing geometry")
        return self


class OrsBaseInstruction(BaseModel):
    """Provider-neutral navigation data extracted from one ORS instruction."""

    model_config = ConfigDict(extra="forbid")

    instruction_type: int = Field(ge=0, le=13)
    maneuver: NavigationManeuver
    text: str = Field(min_length=1)
    street_name: str = ""
    distance_m: float = Field(ge=0.0)
    duration_s: float = Field(ge=0.0)
    geometry_start_index: int = Field(ge=0)
    geometry_end_index: int = Field(ge=0)


class OrsBaseRoute(BaseModel):
    """Real ORS route before OSM accessibility enrichment and scoring."""

    model_config = ConfigDict(extra="forbid")

    route_id: str = Field(pattern=r"^ors_route_[1-3]$")
    distance_m: float = Field(gt=0.0)
    duration_s: float = Field(gt=0.0)
    detour_ratio: float = Field(ge=1.0)
    geometry: list[GeoPoint] = Field(min_length=2)
    instructions: list[OrsBaseInstruction] = Field(min_length=1)
    instruction_count: int = Field(ge=1)
    turn_count: int = Field(ge=0)
    extras: dict[str, OrsExtra] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_derived_counts(self) -> "OrsBaseRoute":
        """Keep explicit navigation counts consistent with instructions.

        Returns:
            The validated base route.

        Raises:
            ValueError: If instruction or turn counts are inconsistent.
        """

        if self.instruction_count != len(self.instructions):
            raise ValueError("ORS instruction count must match instructions")
        if self.turn_count > self.instruction_count:
            raise ValueError("ORS turn count cannot exceed instruction count")
        return self


class OrsBaseRouteSet(BaseModel):
    """Real alternatives ready for OSM enrichment but not yet for scoring."""

    model_config = ConfigDict(extra="forbid")

    routes: list[OrsBaseRoute] = Field(min_length=1, max_length=3)
    engine_version: Optional[str] = None
    graph_date: Optional[str] = None


def build_ors_route_request(
    origin: GeoPoint,
    destination: GeoPoint,
    *,
    avoid_steps: bool,
) -> OrsRouteRequest:
    """Build the canonical ORS request without credentials.

    Args:
        origin: Validated origin in application latitude-longitude order.
        destination: Validated destination in application latitude-longitude order.
        avoid_steps: Whether to ask ORS to avoid known steps.

    Returns:
        Validated request body in ORS longitude-latitude order.
    """

    options = OrsRouteOptions(avoid_features=["steps"]) if avoid_steps else None
    return OrsRouteRequest(
        coordinates=[
            (origin.longitude, origin.latitude),
            (destination.longitude, destination.latitude),
        ],
        options=options,
    )


def validate_ors_route_collection(payload: Any) -> OrsRouteCollection:
    """Validate an untrusted decoded ORS response.

    Args:
        payload: JSON-compatible value received from HTTP or local cache.

    Returns:
        Strictly typed route collection containing required routing fields.
    """

    return OrsRouteCollection.model_validate(payload)


def extract_ors_base_routes(collection: OrsRouteCollection) -> OrsBaseRouteSet:
    """Extract routing facts without inferring accessibility evidence.

    Args:
        collection: Validated ORS GeoJSON response.

    Returns:
        Provider data ready for a separate OSM enrichment phase.
    """

    shortest_distance = min(
        feature.properties.summary.distance for feature in collection.features
    )
    turn_types = {0, 1, 2, 3, 4, 5, 7, 8, 9, 12, 13}
    routes: list[OrsBaseRoute] = []

    for route_number, feature in enumerate(collection.features, start=1):
        instructions = [
            OrsBaseInstruction(
                instruction_type=step.type,
                maneuver=_ORS_MANEUVER_BY_TYPE[step.type],
                text=step.instruction,
                street_name=step.name,
                distance_m=step.distance,
                duration_s=step.duration,
                geometry_start_index=step.way_points[0],
                geometry_end_index=step.way_points[1],
            )
            for segment in feature.properties.segments
            for step in segment.steps
        ]
        routes.append(
            OrsBaseRoute(
                route_id=f"ors_route_{route_number}",
                distance_m=feature.properties.summary.distance,
                duration_s=feature.properties.summary.duration,
                detour_ratio=feature.properties.summary.distance / shortest_distance,
                geometry=[
                    GeoPoint(latitude=latitude, longitude=longitude)
                    for longitude, latitude in feature.geometry.coordinates
                ],
                instructions=instructions,
                instruction_count=len(instructions),
                turn_count=sum(
                    instruction.instruction_type in turn_types
                    for instruction in instructions
                ),
                extras=feature.properties.extras,
            )
        )

    engine = collection.metadata.engine if collection.metadata is not None else None
    return OrsBaseRouteSet(
        routes=routes,
        engine_version=engine.version if engine is not None else None,
        graph_date=engine.graph_date if engine is not None else None,
    )
