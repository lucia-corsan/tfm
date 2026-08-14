"""Tests for validated OpenRouteService transport models."""

import json

import pytest
from pydantic import ValidationError

from backend.domain import GeoPoint, NavigationManeuver
from backend.routing.ors_models import (
    build_ors_route_request,
    extract_ors_base_routes,
    validate_ors_route_collection,
)


def _valid_response() -> dict[str, object]:
    """Return a minimal representative ORS GeoJSON response."""

    return {
        "type": "FeatureCollection",
        "metadata": {
            "attribution": "openrouteservice.org | OpenStreetMap contributors",
            "service": "routing",
            "engine": {"version": "9.7.1", "graph_date": "2026-08-01"},
            "query": {"profile": "foot-walking"},
        },
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [-3.7191, 40.4353],
                        [-3.7200, 40.4300],
                        [-3.7206, 40.4211],
                    ],
                },
                "properties": {
                    "summary": {"distance": 1800.0, "duration": 1500.0},
                    "segments": [
                        {
                            "distance": 1800.0,
                            "duration": 1500.0,
                            "steps": [
                                {
                                    "distance": 900.0,
                                    "duration": 750.0,
                                    "type": 11,
                                    "instruction": "Dirígete al sur",
                                    "name": "Calle de ejemplo",
                                    "way_points": [0, 1],
                                },
                                {
                                    "distance": 900.0,
                                    "duration": 750.0,
                                    "type": 10,
                                    "instruction": "Has llegado a tu destino",
                                    "name": "",
                                    "way_points": [1, 2],
                                },
                            ],
                        }
                    ],
                    "extras": {
                        "surface": {
                            "values": [[0, 2, 1]],
                            "summary": [
                                {"value": 1, "distance": 1800.0, "amount": 100.0}
                            ],
                        }
                    },
                    "way_points": [0, 2],
                },
            }
        ],
    }


def test_request_uses_ors_coordinate_order_and_accessibility_option() -> None:
    """The canonical request sends longitude first and known step avoidance."""

    request = build_ors_route_request(
        GeoPoint(latitude=40.4353, longitude=-3.7191),
        GeoPoint(latitude=40.4211, longitude=-3.7206),
        avoid_steps=True,
    )

    assert request.coordinates == [(-3.7191, 40.4353), (-3.7206, 40.4211)]
    assert request.options is not None
    assert request.options.avoid_features == ["steps"]
    assert request.extra_info == ["steepness", "surface", "waytype"]
    assert request.alternative_routes.target_count == 3


def test_request_omits_empty_options_when_steps_are_allowed() -> None:
    """A profile that allows steps does not send an empty options object."""

    request = build_ors_route_request(
        GeoPoint(latitude=40.4353, longitude=-3.7191),
        GeoPoint(latitude=40.4211, longitude=-3.7206),
        avoid_steps=False,
    )

    assert request.options is None
    assert "options" not in request.model_dump(exclude_none=True)


def test_response_keeps_geometry_instructions_extras_and_provenance() -> None:
    """Required real-route data survives validation without accessibility inference."""

    collection = validate_ors_route_collection(_valid_response())
    route = collection.features[0]

    assert route.geometry.coordinates[0] == (-3.7191, 40.4353)
    assert route.properties.summary.distance == 1800.0
    assert route.properties.segments[0].steps[0].type == 11
    assert route.properties.extras["surface"].summary[0].amount == 100.0
    assert collection.metadata is not None
    assert collection.metadata.engine is not None
    assert collection.metadata.engine.version == "9.7.1"


@pytest.mark.parametrize(
    ("field_path", "invalid_value"),
    [
        (("features", 0, "geometry", "type"), "Point"),
        (("features", 0, "geometry", "coordinates"), [[-3.7, 95.0], [-3.6, 40.4]]),
        (("features", 0, "properties", "summary", "distance"), 0.0),
        (("features", 0, "properties", "segments", 0, "steps", 0, "type"), 99),
    ],
)
def test_response_rejects_invalid_required_route_data(
    field_path: tuple[object, ...], invalid_value: object
) -> None:
    """Invalid geometry, metrics, or instructions cannot enter the backend."""

    payload: object = _valid_response()
    current = payload
    for part in field_path[:-1]:
        current = current[part]  # type: ignore[index]
    current[field_path[-1]] = invalid_value  # type: ignore[index]

    with pytest.raises(ValidationError):
        validate_ors_route_collection(payload)


def test_response_rejects_empty_or_excessive_alternative_sets() -> None:
    """ORS must provide between one and three candidate routes."""

    empty = _valid_response()
    empty["features"] = []

    with pytest.raises(ValidationError):
        validate_ors_route_collection(empty)

    excessive = _valid_response()
    excessive["features"] = excessive["features"] * 4

    with pytest.raises(ValidationError):
        validate_ors_route_collection(excessive)


def test_response_tolerates_documented_metadata_not_used_by_the_backend() -> None:
    """Changing optional ORS metadata does not break required route validation."""

    payload = _valid_response()
    payload["bbox"] = [-3.73, 40.42, -3.71, 40.44]
    payload["metadata"]["timestamp"] = 1786300000000  # type: ignore[index]

    collection = validate_ors_route_collection(payload)

    assert len(collection.features) == 1


def test_response_rejects_instruction_outside_route_geometry() -> None:
    """Navigation instructions cannot reference a missing route vertex."""

    payload = _valid_response()
    payload["features"][0]["properties"]["segments"][0]["steps"][0][  # type: ignore[index]
        "way_points"
    ] = [0, 20]

    with pytest.raises(ValidationError, match="missing geometry"):
        validate_ors_route_collection(payload)


def test_extraction_builds_neutral_base_route_without_accessibility_claims() -> None:
    """Validated ORS data becomes routing facts, not scored accessibility evidence."""

    collection = validate_ors_route_collection(_valid_response())

    result = extract_ors_base_routes(collection)
    route = result.routes[0]

    assert route.route_id == "ors_route_1"
    assert route.geometry[0] == GeoPoint(latitude=40.4353, longitude=-3.7191)
    assert route.distance_m == 1800.0
    assert route.duration_s == 1500.0
    assert route.detour_ratio == 1.0
    assert route.instruction_count == 2
    assert route.turn_count == 0
    assert route.instructions[0].text == "Dirígete al sur"
    assert route.extras["surface"].summary[0].amount == 100.0
    assert result.engine_version == "9.7.1"
    assert "crossing_count" not in route.model_dump()
    assert "accessibility" not in route.model_dump_json()


@pytest.mark.parametrize(
    ("instruction_type", "expected"),
    [
        (0, NavigationManeuver.TURN_LEFT),
        (1, NavigationManeuver.TURN_RIGHT),
        (2, NavigationManeuver.TURN_SHARP_LEFT),
        (3, NavigationManeuver.TURN_SHARP_RIGHT),
        (4, NavigationManeuver.TURN_SLIGHT_LEFT),
        (5, NavigationManeuver.TURN_SLIGHT_RIGHT),
        (6, NavigationManeuver.CONTINUE_STRAIGHT),
        (7, NavigationManeuver.ENTER_ROUNDABOUT),
        (8, NavigationManeuver.EXIT_ROUNDABOUT),
        (9, NavigationManeuver.U_TURN),
        (10, NavigationManeuver.ARRIVE),
        (11, NavigationManeuver.DEPART),
        (12, NavigationManeuver.KEEP_LEFT),
        (13, NavigationManeuver.KEEP_RIGHT),
    ],
)
def test_every_documented_ors_type_has_a_provider_neutral_maneuver(
    instruction_type: int,
    expected: NavigationManeuver,
) -> None:
    """All ORS instruction codes are translated at the provider boundary."""

    payload = _valid_response()
    payload["features"][0]["properties"]["segments"][0]["steps"][0][  # type: ignore[index]
        "type"
    ] = instruction_type

    routes = extract_ors_base_routes(validate_ors_route_collection(payload))

    assert routes.routes[0].instructions[0].maneuver is expected


def test_extraction_calculates_detour_ratio_against_shortest_returned_route() -> None:
    """Alternative detours are relative to the shortest route in the same response."""

    payload = _valid_response()
    alternative = json.loads(json.dumps(payload["features"][0]))  # type: ignore[index]
    alternative["properties"]["summary"]["distance"] = 2160.0
    payload["features"].append(alternative)  # type: ignore[union-attr]
    collection = validate_ors_route_collection(payload)

    result = extract_ors_base_routes(collection)

    assert [route.detour_ratio for route in result.routes] == [1.0, 1.2]
