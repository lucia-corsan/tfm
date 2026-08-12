"""Tests for reproducible real-route corridor sensitivity evaluation."""

from datetime import datetime, timezone
from pathlib import Path

import pytest

from backend.domain import GeoPoint, MobilityProfile
from backend.enrichment.evaluate_corridor_widths import (
    ROUTE_RESULTS_NAME,
    SUMMARY_RESULTS_NAME,
    evaluate_corridor_widths,
    save_corridor_evaluation,
)
from backend.enrichment.osm_snapshot import (
    OsmBoundingBox,
    OsmRoutingElement,
    OsmRoutingSnapshot,
)
from backend.routing.ors_models import OrsBaseInstruction, OrsBaseRoute


def _inputs() -> tuple[list[OrsBaseRoute], OsmRoutingSnapshot]:
    """Build one route and evidence at narrow and wide distances."""

    route = OrsBaseRoute(
        route_id="ors_route_1",
        distance_m=120.0,
        duration_s=90.0,
        detour_ratio=1.0,
        geometry=[
            GeoPoint(latitude=40.4300, longitude=-3.7200),
            GeoPoint(latitude=40.4310, longitude=-3.7200),
        ],
        instructions=[
            OrsBaseInstruction(
                instruction_type=11,
                text="Continúa recto",
                distance_m=120.0,
                duration_s=90.0,
                geometry_start_index=0,
                geometry_end_index=1,
            )
        ],
        instruction_count=1,
        turn_count=0,
    )
    timestamp = datetime(2026, 8, 11, tzinfo=timezone.utc)
    snapshot = OsmRoutingSnapshot(
        schema_version="osm-routing-snapshot-v1",
        study_area_id="test_area",
        bbox=OsmBoundingBox(
            south=40.42,
            west=-3.73,
            north=40.44,
            east=-3.71,
        ),
        query_sha256="f" * 64,
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
                geometry=route.geometry,
            ),
        ],
    )
    return [route], snapshot


def test_evaluation_compares_sorted_widths_without_changing_routes() -> None:
    """Wider corridors add contextual evidence under one fixed route set."""

    routes, snapshot = _inputs()

    evaluation = evaluate_corridor_widths(
        routes,
        snapshot,
        MobilityProfile(profile_id="evaluation_test"),
        widths_m=(5.0, 15.0),
    )

    assert len(evaluation.route_results) == 2
    assert len(evaluation.summaries) == 2
    narrow, wide = evaluation.route_results
    assert narrow.route_id == wide.route_id == "ors_route_1"
    assert narrow.matched_element_count < wide.matched_element_count
    assert narrow.accepted and wide.accepted
    assert evaluation.summaries[0].ranking_order == "ors_route_1"


@pytest.mark.parametrize("widths", [(), (10.0, 5.0), (5.0, 5.0)])
def test_evaluation_rejects_empty_unsorted_or_repeated_widths(
    widths: tuple[float, ...],
) -> None:
    """Sensitivity rows cannot silently change order or repeat settings."""

    routes, snapshot = _inputs()

    with pytest.raises(ValueError, match="unique and sorted"):
        evaluate_corridor_widths(
            routes,
            snapshot,
            MobilityProfile(profile_id="invalid_widths"),
            widths_m=widths,
        )


def test_evaluation_saves_detailed_and_summary_csv(tmp_path: Path) -> None:
    """Both evaluator-facing tables are reproducible and non-empty."""

    routes, snapshot = _inputs()
    evaluation = evaluate_corridor_widths(
        routes,
        snapshot,
        MobilityProfile(profile_id="save_test"),
        widths_m=(5.0, 10.0),
    )

    route_path, summary_path = save_corridor_evaluation(evaluation, tmp_path)

    assert route_path.name == ROUTE_RESULTS_NAME
    assert summary_path.name == SUMMARY_RESULTS_NAME
    assert route_path.read_text(encoding="utf-8").count("\n") == 3
    assert summary_path.read_text(encoding="utf-8").count("\n") == 3
