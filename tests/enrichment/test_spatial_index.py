"""Tests for the metric OSM spatial index."""

from datetime import datetime, timezone

import pytest

from backend.domain import GeoPoint
from backend.enrichment.osm_snapshot import (
    OsmBoundingBox,
    OsmRoutingElement,
    OsmRoutingSnapshot,
)
from backend.enrichment.spatial_index import MADRID_METRIC_CRS, OsmSpatialIndex


def _snapshot() -> OsmRoutingSnapshot:
    """Build a small deterministic snapshot around one Madrid street."""

    timestamp = datetime(2026, 8, 11, tzinfo=timezone.utc)
    return OsmRoutingSnapshot(
        schema_version="osm-routing-snapshot-v1",
        study_area_id="test_area",
        bbox=OsmBoundingBox(
            south=40.42,
            west=-3.73,
            north=40.44,
            east=-3.71,
        ),
        query_sha256="a" * 64,
        osm_base_timestamp=timestamp,
        downloaded_at=timestamp,
        elements=[
            OsmRoutingElement(
                osm_type="node",
                osm_id=20,
                tags={"highway": "crossing"},
                geometry=[GeoPoint(latitude=40.4300, longitude=-3.7200)],
            ),
            OsmRoutingElement(
                osm_type="way",
                osm_id=10,
                tags={"highway": "footway", "surface": "asphalt"},
                geometry=[
                    GeoPoint(latitude=40.4298, longitude=-3.7201),
                    GeoPoint(latitude=40.4302, longitude=-3.7199),
                ],
            ),
            OsmRoutingElement(
                osm_type="node",
                osm_id=30,
                tags={"highway": "traffic_signals"},
                geometry=[GeoPoint(latitude=40.4350, longitude=-3.7250)],
            ),
        ],
    )


def test_index_projects_every_element_in_madrid_metric_crs() -> None:
    """All snapshot elements are indexed using a CRS measured in metres."""

    snapshot = _snapshot()
    index = OsmSpatialIndex(snapshot)

    assert index.element_count == 3
    assert index.metric_crs == MADRID_METRIC_CRS
    point = index.project_point(snapshot.elements[0].geometry[0])
    assert 430_000 < point.x < 450_000
    assert 4_470_000 < point.y < 4_490_000


def test_index_returns_only_intersecting_elements_in_stable_order() -> None:
    """A metric search excludes distant objects and has reproducible ordering."""

    snapshot = _snapshot()
    index = OsmSpatialIndex(snapshot)
    route = index.project_route(
        [
            GeoPoint(latitude=40.4297, longitude=-3.7202),
            GeoPoint(latitude=40.4303, longitude=-3.7198),
        ]
    )

    matches = index.query_intersecting(route.buffer(12.0))

    assert [(match.osm_type, match.osm_id) for match in matches] == [
        ("node", 20),
        ("way", 10),
    ]


def test_route_projection_rejects_an_incomplete_geometry() -> None:
    """Metric route construction cannot silently accept a single vertex."""

    index = OsmSpatialIndex(_snapshot())

    with pytest.raises(ValueError, match="at least two"):
        index.project_route([GeoPoint(latitude=40.43, longitude=-3.72)])


def test_metric_geometry_rejects_elements_from_another_snapshot() -> None:
    """Geometry lookup cannot accidentally mix snapshots."""

    index = OsmSpatialIndex(_snapshot())
    foreign = OsmRoutingElement(
        osm_type="node",
        osm_id=999,
        tags={"highway": "crossing"},
        geometry=[GeoPoint(latitude=40.43, longitude=-3.72)],
    )

    with pytest.raises(KeyError, match="not present"):
        index.metric_geometry(foreign)
