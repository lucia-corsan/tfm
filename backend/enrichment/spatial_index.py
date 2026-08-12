"""Metric spatial index for route-oriented OSM snapshot elements."""

from collections.abc import Sequence

from pyproj import Transformer
from shapely.geometry import LineString, Point
from shapely.geometry.base import BaseGeometry
from shapely.strtree import STRtree

from backend.domain import GeoPoint
from backend.enrichment.osm_snapshot import OsmRoutingElement, OsmRoutingSnapshot

WGS84_CRS = "EPSG:4326"
MADRID_METRIC_CRS = "EPSG:25830"


class OsmSpatialIndex:
    """Index OSM point and line geometries in a Madrid metric projection."""

    def __init__(
        self,
        snapshot: OsmRoutingSnapshot,
        *,
        metric_crs: str = MADRID_METRIC_CRS,
    ) -> None:
        """Project and index one validated OSM snapshot.

        Args:
            snapshot: Route-oriented OSM evidence with complete WGS84 geometry.
            metric_crs: Projected CRS used for metric distances and buffers.
        """

        self._snapshot = snapshot
        self._metric_crs = metric_crs
        self._transformer = Transformer.from_crs(
            WGS84_CRS,
            metric_crs,
            always_xy=True,
        )
        self._elements = tuple(snapshot.elements)
        self._element_indices = {
            (element.osm_type, element.osm_id): index
            for index, element in enumerate(self._elements)
        }
        self._geometries = tuple(
            self._project_element(element) for element in self._elements
        )
        self._tree = STRtree(self._geometries)

    @property
    def element_count(self) -> int:
        """Return the number of unique indexed OSM elements."""

        return len(self._elements)

    @property
    def metric_crs(self) -> str:
        """Return the projected CRS used by the index."""

        return self._metric_crs

    def project_point(self, point: GeoPoint) -> Point:
        """Project one WGS84 point into the index metric CRS.

        Args:
            point: Geographic point in latitude-longitude application order.

        Returns:
            Shapely point whose coordinates are expressed in metres.
        """

        x, y = self._transformer.transform(point.longitude, point.latitude)
        return Point(x, y)

    def project_route(self, points: Sequence[GeoPoint]) -> LineString:
        """Project a WGS84 route geometry into the index metric CRS.

        Args:
            points: Ordered route vertices.

        Returns:
            Metric Shapely line preserving the vertex order.

        Raises:
            ValueError: If fewer than two vertices are provided.
        """

        if len(points) < 2:
            raise ValueError("a route requires at least two points")
        return LineString([self.project_point(point).coords[0] for point in points])

    def query_intersecting(
        self,
        search_geometry: BaseGeometry,
    ) -> tuple[OsmRoutingElement, ...]:
        """Return deterministically ordered OSM elements intersecting an area.

        Args:
            search_geometry: Geometry expressed in the index metric CRS.

        Returns:
            Unique elements ordered by OSM type and identifier.
        """

        indices = self._tree.query(search_geometry, predicate="intersects")
        matches = [self._elements[int(index)] for index in indices]
        return tuple(sorted(matches, key=lambda item: (item.osm_type, item.osm_id)))

    def metric_geometry(self, element: OsmRoutingElement) -> BaseGeometry:
        """Return the indexed metric geometry for one snapshot element.

        Args:
            element: Element belonging to this index snapshot.

        Returns:
            Its projected point or line geometry.

        Raises:
            KeyError: If the element is not part of the indexed snapshot.
        """

        try:
            index = self._element_indices[(element.osm_type, element.osm_id)]
        except KeyError:
            raise KeyError("OSM element is not present in this spatial index") from None
        return self._geometries[index]

    def _project_element(self, element: OsmRoutingElement) -> BaseGeometry:
        """Project one validated OSM point or line."""

        coordinates = [self.project_point(point).coords[0] for point in element.geometry]
        if element.osm_type == "node":
            return Point(coordinates[0])
        return LineString(coordinates)
