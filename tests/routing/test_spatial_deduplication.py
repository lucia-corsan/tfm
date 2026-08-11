"""Tests for metric similarity and conservative spatial deduplication."""

import pytest
from pyproj import Transformer

from backend.routing.ors_models import OrsLineString, OrsRouteFeature
from backend.routing.spatial_deduplication import (
    SpatialDeduplicationConfig,
    compare_route_geometries,
    deduplicate_spatial_route_features,
)

ETRS89_UTM30_TO_WGS84 = Transformer.from_crs(
    "EPSG:25830", "EPSG:4326", always_xy=True
)


def _geometry(points_m: list[tuple[float, float]]) -> OrsLineString:
    """Convert synthetic Madrid metric points into a validated WGS84 route."""

    return OrsLineString(
        type="LineString",
        coordinates=[ETRS89_UTM30_TO_WGS84.transform(x, y) for x, y in points_m],
    )


def _feature(points_m: list[tuple[float, float]]) -> OrsRouteFeature:
    """Build one valid ORS feature from synthetic metric coordinates."""

    geometry = _geometry(points_m)
    return OrsRouteFeature.model_validate(
        {
            "type": "Feature",
            "geometry": geometry.model_dump(mode="json"),
            "properties": {
                "summary": {"distance": 1000.0, "duration": 800.0},
                "segments": [
                    {
                        "distance": 1000.0,
                        "duration": 800.0,
                        "steps": [
                            {
                                "distance": 1000.0,
                                "duration": 800.0,
                                "type": 10,
                                "instruction": "Has llegado a tu destino",
                                "way_points": [0, len(points_m) - 1],
                            }
                        ],
                    }
                ],
            },
        }
    )


def test_densified_same_line_has_complete_symmetric_overlap() -> None:
    """Different vertex sampling does not hide the same physical line."""

    sparse = _geometry([(440000.0, 4475000.0), (441000.0, 4475000.0)])
    dense = _geometry(
        [
            (440000.0, 4475000.0),
            (440250.0, 4475000.0),
            (440500.0, 4475000.0),
            (440750.0, 4475000.0),
            (441000.0, 4475000.0),
        ]
    )

    similarity = compare_route_geometries(sparse, dense, tolerance_m=1.0)

    assert similarity.overlap_ratio == pytest.approx(1.0)
    assert similarity.relative_length_difference == pytest.approx(0.0)


def test_symmetric_overlap_rejects_short_route_inside_longer_route() -> None:
    """Containment alone cannot classify routes of very different extent as equal."""

    long_route = _geometry([(440000.0, 4475000.0), (441000.0, 4475000.0)])
    short_route = _geometry([(440000.0, 4475000.0), (440500.0, 4475000.0)])

    similarity = compare_route_geometries(long_route, short_route, tolerance_m=3.0)

    assert similarity.overlap_ratio == pytest.approx(0.503, abs=0.005)
    assert similarity.relative_length_difference == pytest.approx(1.0, abs=0.01)


def test_parallel_route_outside_tolerance_remains_distinct() -> None:
    """A nearby parallel path is not merged when it lies outside the corridor."""

    first = _geometry([(440000.0, 4475000.0), (441000.0, 4475000.0)])
    parallel = _geometry([(440000.0, 4475006.0), (441000.0, 4475006.0)])

    similarity = compare_route_geometries(first, parallel, tolerance_m=3.0)

    assert similarity.overlap_ratio == pytest.approx(0.0)


def test_local_branch_reduces_overlap_below_conservative_threshold() -> None:
    """A meaningful divergence around one decision point preserves both routes."""

    direct = _geometry([(440000.0, 4475000.0), (441000.0, 4475000.0)])
    branch = _geometry(
        [
            (440000.0, 4475000.0),
            (440400.0, 4475000.0),
            (440500.0, 4475080.0),
            (440600.0, 4475000.0),
            (441000.0, 4475000.0),
        ]
    )

    similarity = compare_route_geometries(direct, branch, tolerance_m=3.0)

    assert similarity.overlap_ratio < 0.9


def test_spatial_deduplication_keeps_first_and_preserves_order() -> None:
    """Near duplicates are traced without reordering surviving routes."""

    first = _feature([(440000.0, 4475000.0), (441000.0, 4475000.0)])
    densified = _feature(
        [
            (440000.0, 4475000.0),
            (440500.0, 4475000.0),
            (441000.0, 4475000.0),
        ]
    )
    distinct = _feature([(440000.0, 4475020.0), (441000.0, 4475020.0)])
    config = SpatialDeduplicationConfig(
        tolerance_m=3.0,
        minimum_overlap_ratio=0.95,
        maximum_length_difference_ratio=0.05,
    )

    result = deduplicate_spatial_route_features([first, densified, distinct], config)

    assert result.unique_features == [first, distinct]
    assert result.duplicate_count == 1
    assert result.duplicates[0].kept_index == 0
    assert result.duplicates[0].duplicate_index == 1


def test_invalid_tolerance_is_rejected() -> None:
    """A non-positive spatial corridor cannot enter metric comparison."""

    route = _geometry([(440000.0, 4475000.0), (441000.0, 4475000.0)])

    with pytest.raises(ValueError, match="greater than zero"):
        compare_route_geometries(route, route, tolerance_m=0.0)
