"""Conservative metric association between routes and nearby OSM evidence."""

from pydantic import BaseModel, ConfigDict, Field, model_validator

from backend.enrichment.osm_snapshot import OsmRoutingElement
from backend.enrichment.spatial_index import OsmSpatialIndex
from backend.routing.ors_models import OrsBaseRoute

CORRIDOR_WIDTH_CANDIDATES_M = (5.0, 10.0, 15.0, 20.0)
DEFAULT_CORRIDOR_WIDTH_M = 5.0
_DISTANCE_EPSILON_M = 1e-6


class RouteAssociationModel(BaseModel):
    """Base association model that rejects undocumented fields."""

    model_config = ConfigDict(extra="forbid")


class OsmRouteMatch(RouteAssociationModel):
    """One OSM element spatially associated with a route corridor."""

    element: OsmRoutingElement
    distance_to_route_m: float = Field(ge=0.0)
    covered_route_length_m: float = Field(ge=0.0)


class RouteCorridorAssociation(RouteAssociationModel):
    """Auditable result of applying one corridor width to one route."""

    route_id: str = Field(pattern=r"^ors_route_[1-3]$")
    corridor_width_m: float = Field(ge=1.0, le=50.0)
    metric_route_length_m: float = Field(gt=0.0)
    matches: list[OsmRouteMatch] = Field(default_factory=list)

    @model_validator(mode="after")
    def require_unique_matches(self) -> "RouteCorridorAssociation":
        """Prevent one OSM object from being counted twice.

        Returns:
            Validated route association.

        Raises:
            ValueError: If an OSM identifier appears more than once.
        """

        identifiers = [
            (match.element.osm_type, match.element.osm_id) for match in self.matches
        ]
        if len(identifiers) != len(set(identifiers)):
            raise ValueError("route association matches must be unique")
        if any(
            match.covered_route_length_m > self.metric_route_length_m + _DISTANCE_EPSILON_M
            for match in self.matches
        ):
            raise ValueError("matched coverage cannot exceed route length")
        return self


def associate_route_corridor(
    route: OrsBaseRoute,
    spatial_index: OsmSpatialIndex,
    *,
    corridor_width_m: float = DEFAULT_CORRIDOR_WIDTH_M,
) -> RouteCorridorAssociation:
    """Associate nearby OSM elements with one metric route corridor.

    Args:
        route: Validated ORS base route awaiting accessibility enrichment.
        spatial_index: Metric index built from the pilot OSM snapshot.
        corridor_width_m: Maximum geometric distance to the route in metres.

    Returns:
        Stable matches with exact distance and route-length coverage.

    Raises:
        ValueError: If the corridor width falls outside the supported range.
    """

    if not 1.0 <= corridor_width_m <= 50.0:
        raise ValueError("corridor width must be between 1 and 50 metres")

    metric_route = spatial_index.project_route(route.geometry)
    corridor = metric_route.buffer(corridor_width_m, cap_style="flat")
    matches: list[OsmRouteMatch] = []
    for element in spatial_index.query_intersecting(corridor):
        element_geometry = spatial_index.metric_geometry(element)
        distance = metric_route.distance(element_geometry)
        if distance > corridor_width_m + _DISTANCE_EPSILON_M:
            continue
        covered_length = 0.0
        if element.osm_type == "way":
            covered_length = metric_route.intersection(
                element_geometry.buffer(corridor_width_m, cap_style="flat")
            ).length
        matches.append(
            OsmRouteMatch(
                element=element,
                distance_to_route_m=distance,
                covered_route_length_m=min(covered_length, metric_route.length),
            )
        )

    return RouteCorridorAssociation(
        route_id=route.route_id,
        corridor_width_m=corridor_width_m,
        metric_route_length_m=metric_route.length,
        matches=matches,
    )
