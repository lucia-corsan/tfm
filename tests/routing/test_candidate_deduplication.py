"""Tests for deterministic exact deduplication of ORS candidates."""

from backend.routing.candidate_deduplication import (
    deduplicate_exact_route_features,
    geometry_fingerprint,
)
from backend.routing.ors_models import OrsRouteFeature


def _feature(
    coordinates: list[list[float]],
    *,
    distance_m: float = 1000.0,
) -> OrsRouteFeature:
    """Build one valid ORS feature with configurable geometry and summary."""

    return OrsRouteFeature.model_validate(
        {
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coordinates},
            "properties": {
                "summary": {"distance": distance_m, "duration": 800.0},
                "segments": [
                    {
                        "distance": distance_m,
                        "duration": 800.0,
                        "steps": [
                            {
                                "distance": distance_m,
                                "duration": 800.0,
                                "type": 10,
                                "instruction": "Has llegado a tu destino",
                                "way_points": [0, len(coordinates) - 1],
                            }
                        ],
                    }
                ],
            },
        }
    )


def test_exact_geometry_keeps_first_candidate_and_records_duplicate() -> None:
    """Equal paths collapse even when their routing summaries differ."""

    first = _feature([[-3.7191, 40.4353], [-3.7206, 40.4211]])
    repeated = _feature(
        [[-3.7191, 40.4353], [-3.7206, 40.4211]],
        distance_m=1001.0,
    )

    result = deduplicate_exact_route_features([first, repeated])

    assert result.unique_features == [first]
    assert result.duplicate_count == 1
    assert result.duplicates[0].duplicate_index == 1
    assert result.duplicates[0].kept_index == 0
    assert result.duplicates[0].geometry_fingerprint == geometry_fingerprint(
        first.geometry
    )


def test_numeric_serialization_does_not_change_fingerprint() -> None:
    """Equivalent integer and float JSON values become one typed geometry."""

    integer_form = _feature([[-3, 40], [-4, 41]])
    float_form = _feature([[-3.0, 40.0], [-4.0, 41.0]])

    assert geometry_fingerprint(integer_form.geometry) == geometry_fingerprint(
        float_form.geometry
    )


def test_reversed_geometry_is_not_an_exact_directional_duplicate() -> None:
    """The same corridor in the opposite direction remains a distinct route."""

    forward = _feature([[-3.7191, 40.4353], [-3.7206, 40.4211]])
    reversed_route = _feature([[-3.7206, 40.4211], [-3.7191, 40.4353]])

    result = deduplicate_exact_route_features([forward, reversed_route])

    assert result.unique_features == [forward, reversed_route]
    assert result.duplicate_count == 0


def test_additional_vertex_remains_distinct_without_spatial_inference() -> None:
    """Exact deduplication does not merge differently sampled geometries."""

    direct = _feature([[-3.7191, 40.4353], [-3.7206, 40.4211]])
    densified = _feature(
        [
            [-3.7191, 40.4353],
            [-3.71985, 40.4282],
            [-3.7206, 40.4211],
        ]
    )

    result = deduplicate_exact_route_features([direct, densified])

    assert result.unique_features == [direct, densified]
    assert result.duplicate_count == 0


def test_unique_routes_keep_provider_order() -> None:
    """Removing duplicates never reorders the surviving candidates."""

    first = _feature([[-3.71, 40.43], [-3.72, 40.42]])
    second = _feature([[-3.71, 40.43], [-3.73, 40.42]])
    repeated_first = _feature([[-3.71, 40.43], [-3.72, 40.42]])

    result = deduplicate_exact_route_features([first, second, repeated_first])

    assert result.unique_features == [first, second]
    assert result.duplicates[0].kept_index == 0
    assert result.duplicates[0].duplicate_index == 2
