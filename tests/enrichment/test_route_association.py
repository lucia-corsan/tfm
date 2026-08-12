"""Tests for conservative route-corridor association."""

from datetime import datetime, timezone

import pytest

from backend.domain import GeoPoint
from backend.enrichment.osm_snapshot import (
    OsmBoundingBox,
    OsmRoutingElement,
    OsmRoutingSnapshot,
)
from backend.enrichment.route_association import associate_route_corridor
from backend.enrichment.spatial_index import OsmSpatialIndex
from backend.routing.ors_models import OrsBaseInstruction, OrsBaseRoute


def _route() -> OrsBaseRoute:
    """Return a short north-south route in Madrid."""

    return OrsBaseRoute(
        route_id="ors_route_1",
        distance_m=111.0,
        duration_s=80.0,
        detour_ratio=1.0,
        geometry=[
            GeoPoint(latitude=40.4300, longitude=-3.7200),
            GeoPoint(latitude=40.4310, longitude=-3.7200),
        ],
        instructions=[
            OrsBaseInstruction(
                instruction_type=11,
                text="Continúa recto",
                distance_m=111.0,
                duration_s=80.0,
                geometry_start_index=0,
                geometry_end_index=1,
            )
        ],
        instruction_count=1,
        turn_count=0,
    )


def _snapshot() -> OsmRoutingSnapshot:
    """Return evidence at different lateral distances from the route."""

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
        query_sha256="b" * 64,
        osm_base_timestamp=timestamp,
        downloaded_at=timestamp,
        elements=[
            OsmRoutingElement(
                osm_type="node",
                osm_id=1,
                tags={"highway": "crossing"},
                geometry=[GeoPoint(latitude=40.4305, longitude=-3.71996)],
            ),
            OsmRoutingElement(
                osm_type="node",
                osm_id=2,
                tags={"highway": "traffic_signals"},
                geometry=[GeoPoint(latitude=40.4305, longitude=-3.71985)],
            ),
            OsmRoutingElement(
                osm_type="way",
                osm_id=3,
                tags={"highway": "footway", "surface": "asphalt"},
                geometry=[
                    GeoPoint(latitude=40.4302, longitude=-3.72002),
                    GeoPoint(latitude=40.4308, longitude=-3.72002),
                ],
            ),
            OsmRoutingElement(
                osm_type="node",
                osm_id=4,
                tags={"highway": "crossing"},
                geometry=[GeoPoint(latitude=40.4350, longitude=-3.7250)],
            ),
        ],
    )


def test_narrow_and_wide_corridors_have_monotonic_unique_matches() -> None:
    """Increasing width may add evidence but never duplicates prior objects."""

    index = OsmSpatialIndex(_snapshot())

    narrow = associate_route_corridor(_route(), index, corridor_width_m=5.0)
    wide = associate_route_corridor(_route(), index, corridor_width_m=15.0)

    narrow_ids = {(match.element.osm_type, match.element.osm_id) for match in narrow.matches}
    wide_ids = {(match.element.osm_type, match.element.osm_id) for match in wide.matches}
    assert narrow_ids == {("node", 1), ("way", 3)}
    assert wide_ids == {("node", 1), ("node", 2), ("way", 3)}
    assert narrow_ids < wide_ids
    assert len(wide_ids) == len(wide.matches)


def test_association_preserves_distance_and_bounded_line_coverage() -> None:
    """Matches expose metric evidence needed for calibration and aggregation."""

    association = associate_route_corridor(
        _route(),
        OsmSpatialIndex(_snapshot()),
        corridor_width_m=10.0,
    )
    by_id = {match.element.osm_id: match for match in association.matches}

    assert 2.0 < by_id[1].distance_to_route_m < 5.0
    assert by_id[3].covered_route_length_m > 50.0
    assert by_id[3].covered_route_length_m <= association.metric_route_length_m
    assert by_id[1].covered_route_length_m == 0.0


@pytest.mark.parametrize("width", [0.0, 0.9, 50.1])
def test_association_rejects_unsupported_corridor_widths(width: float) -> None:
    """Uncalibrated extreme widths cannot enter the enrichment silently."""

    with pytest.raises(ValueError, match="between 1 and 50"):
        associate_route_corridor(
            _route(),
            OsmSpatialIndex(_snapshot()),
            corridor_width_m=width,
        )
