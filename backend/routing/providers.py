"""Interchangeable providers for fixture and enriched real route scenarios."""

from math import isclose
from typing import Protocol

from backend.config import Settings
from backend.domain import GeoPoint, MobilityProfile, RouteScenario
from backend.enrichment.osm_snapshot import (
    PILOT_ROUTING_BBOX,
    PILOT_STUDY_AREA_ID,
    OsmRoutingSnapshot,
    OsmSnapshotError,
    OsmSnapshotStore,
    build_overpass_query,
    query_sha256,
)
from backend.enrichment.route_association import associate_route_corridor
from backend.enrichment.route_enrichment import enrich_ors_route_set
from backend.enrichment.spatial_index import OsmSpatialIndex
from backend.routing.fixtures import load_pilot_route_scenario
from backend.routing.ors_client import OrsClientError
from backend.routing.ors_models import OrsBaseRouteSet
from backend.routing.ors_provider import (
    OrsBaseRouteProvider,
    OrsConfigurationError,
    create_ors_base_route_provider,
)

_COORDINATE_TOLERANCE_DEGREES = 1e-5


class RouteScenarioNotFoundError(LookupError):
    """Raised when a provider cannot resolve the requested endpoints."""


class RoutingProviderUnavailableError(RuntimeError):
    """Raised when the configured route provider cannot currently be used."""


class RouteScenarioProvider(Protocol):
    """Asynchronous provider interface shared by fixture and real routing."""

    async def get_scenario(
        self,
        origin: GeoPoint,
        destination: GeoPoint,
        profile: MobilityProfile,
    ) -> RouteScenario:
        """Resolve candidate routes for an origin and destination."""


class OrsBaseRouteResolver(Protocol):
    """Minimal ORS base-provider interface used by real scenario composition."""

    async def get_base_routes(
        self,
        origin: GeoPoint,
        destination: GeoPoint,
        profile: MobilityProfile,
    ) -> OrsBaseRouteSet:
        """Return neutral ORS routes before OSM enrichment."""


def _points_match(first: GeoPoint, second: GeoPoint) -> bool:
    """Compare fixture coordinates using a small deterministic tolerance."""

    return isclose(
        first.latitude,
        second.latitude,
        rel_tol=0.0,
        abs_tol=_COORDINATE_TOLERANCE_DEGREES,
    ) and isclose(
        first.longitude,
        second.longitude,
        rel_tol=0.0,
        abs_tol=_COORDINATE_TOLERANCE_DEGREES,
    )


class FixtureRouteScenarioProvider:
    """Serve the reproducible Moncloa–Príncipe Pío development scenario."""

    async def get_scenario(
        self,
        origin: GeoPoint,
        destination: GeoPoint,
        profile: MobilityProfile,
    ) -> RouteScenario:
        """Return the pilot fixture when both endpoints match.

        Args:
            origin: Requested WGS84 origin.
            destination: Requested WGS84 destination.
            profile: Profile accepted for interface parity but not fixture generation.

        Returns:
            Synthetic route alternatives for the pilot scenario.

        Raises:
            RouteScenarioNotFoundError: If the fixture does not cover the request.
        """

        del profile
        scenario = load_pilot_route_scenario()
        if not (
            _points_match(origin, scenario.origin)
            and _points_match(destination, scenario.destination)
        ):
            raise RouteScenarioNotFoundError("route scenario not found")
        return scenario


class OrsEnrichedRouteScenarioProvider:
    """Compose ORS geometry and a fixed OSM snapshot into scoreable candidates."""

    def __init__(
        self,
        base_provider: OrsBaseRouteResolver,
        snapshot: OsmRoutingSnapshot,
        *,
        corridor_width_m: float,
    ) -> None:
        """Prepare one reusable metric index for real route comparisons.

        Args:
            base_provider: ORS source that returns neutral route facts.
            snapshot: Validated route-oriented OSM evidence.
            corridor_width_m: Selected route association width in metres.
        """

        self._base_provider = base_provider
        self._snapshot = snapshot
        self._spatial_index = OsmSpatialIndex(snapshot)
        self._corridor_width_m = corridor_width_m

    async def get_scenario(
        self,
        origin: GeoPoint,
        destination: GeoPoint,
        profile: MobilityProfile,
    ) -> RouteScenario:
        """Generate, enrich and expose one real route scenario.

        Args:
            origin: Requested WGS84 origin inside the pilot snapshot.
            destination: Requested WGS84 destination inside the pilot snapshot.
            profile: Safety restrictions propagated to ORS and later ranking.

        Returns:
            Up to three real scoreable route candidates.

        Raises:
            RouteScenarioNotFoundError: If an endpoint falls outside the pilot area.
            RoutingProviderUnavailableError: If ORS cannot produce valid routes.
        """

        endpoints_inside_snapshot = _point_inside_snapshot(
            origin,
            self._snapshot,
        ) and _point_inside_snapshot(destination, self._snapshot)
        if not endpoints_inside_snapshot:
            raise RouteScenarioNotFoundError("route scenario not found")
        try:
            route_set = await self._base_provider.get_base_routes(
                origin,
                destination,
                profile,
            )
        except OrsClientError:
            raise RoutingProviderUnavailableError(
                "routing provider unavailable"
            ) from None

        associations = [
            associate_route_corridor(
                route,
                self._spatial_index,
                corridor_width_m=self._corridor_width_m,
            )
            for route in route_set.routes
        ]
        candidates = enrich_ors_route_set(
            route_set.routes,
            associations,
            self._spatial_index,
        )
        return RouteScenario(
            scenario_id=PILOT_STUDY_AREA_ID,
            name="Comparación real Moncloa–Príncipe Pío",
            description=(
                "Rutas peatonales de ORS enriquecidas con una instantánea local de OSM; "
                "la recomendación mantiene explícita la incertidumbre de los datos."
            ),
            origin=origin,
            destination=destination,
            routes=candidates,
        )


def _point_inside_snapshot(point: GeoPoint, snapshot: OsmRoutingSnapshot) -> bool:
    """Return whether one point lies inside the non-antimeridian snapshot box."""

    bbox = snapshot.bbox
    return (
        bbox.south <= point.latitude <= bbox.north
        and bbox.west <= point.longitude <= bbox.east
    )


def _load_configured_snapshot(settings: Settings) -> OsmRoutingSnapshot:
    """Load the exact pilot snapshot required by the current mapping query."""

    expected_query = build_overpass_query(PILOT_ROUTING_BBOX)
    snapshot = OsmSnapshotStore(settings.osm_snapshot_path).load(
        expected_query_sha256=query_sha256(expected_query)
    )
    if snapshot is None:
        raise RoutingProviderUnavailableError("routing provider unavailable")
    return snapshot


def create_route_scenario_provider(settings: Settings) -> RouteScenarioProvider:
    """Create the configured route provider without exposing private settings.

    Args:
        settings: Validated backend-only provider configuration.

    Returns:
        Provider implementation used by the comparison service.

    Raises:
        RoutingProviderUnavailableError: If real routing lacks safe configuration.
    """

    if settings.routing_provider == "fixture":
        return FixtureRouteScenarioProvider()
    try:
        base_provider: OrsBaseRouteProvider = create_ors_base_route_provider(settings)
        snapshot = _load_configured_snapshot(settings)
    except (OrsConfigurationError, OsmSnapshotError):
        raise RoutingProviderUnavailableError("routing provider unavailable") from None
    return OrsEnrichedRouteScenarioProvider(
        base_provider,
        snapshot,
        corridor_width_m=settings.osm_route_corridor_width_m,
    )
