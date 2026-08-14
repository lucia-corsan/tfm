"""Tests for conservative OSM route evidence aggregation."""

from datetime import datetime, timezone

import pytest

from backend.domain import EvidenceState, GeoPoint, NavigationManeuver, RouteCategory
from backend.enrichment.osm_snapshot import (
    OsmBoundingBox,
    OsmRoutingElement,
    OsmRoutingSnapshot,
)
from backend.enrichment.route_association import associate_route_corridor
from backend.enrichment.route_enrichment import enrich_ors_route, enrich_ors_route_set
from backend.enrichment.spatial_index import OsmSpatialIndex
from backend.routing.ors_models import OrsBaseInstruction, OrsBaseRoute


def _route(route_id: str = "ors_route_1", longitude: float = -3.7200) -> OrsBaseRoute:
    """Return one short deterministic route."""

    return OrsBaseRoute(
        route_id=route_id,
        distance_m=120.0 if route_id == "ors_route_1" else 130.0,
        duration_s=90.0,
        detour_ratio=1.0 if route_id == "ors_route_1" else 1.08,
        geometry=[
            GeoPoint(latitude=40.4300, longitude=longitude),
            GeoPoint(latitude=40.4310, longitude=longitude),
        ],
        instructions=[
            OrsBaseInstruction(
                instruction_type=11,
                maneuver=NavigationManeuver.DEPART,
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


def _snapshot(*elements: OsmRoutingElement) -> OsmRoutingSnapshot:
    """Build a valid snapshot containing supplied elements."""

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
        query_sha256="c" * 64,
        osm_base_timestamp=timestamp,
        downloaded_at=timestamp,
        elements=list(elements),
    )


def _point(osm_id: int, tags: dict[str, str], longitude: float = -3.7200) -> OsmRoutingElement:
    return OsmRoutingElement(
        osm_type="node",
        osm_id=osm_id,
        tags=tags,
        geometry=[GeoPoint(latitude=40.4305, longitude=longitude)],
    )


def _way(osm_id: int, tags: dict[str, str], longitude: float = -3.7200) -> OsmRoutingElement:
    return OsmRoutingElement(
        osm_type="way",
        osm_id=osm_id,
        tags=tags,
        geometry=[
            GeoPoint(latitude=40.4300, longitude=longitude),
            GeoPoint(latitude=40.4310, longitude=longitude),
        ],
    )


def test_enrichment_combines_supported_crossing_and_linear_coverage() -> None:
    """Explicit favorable evidence becomes covered route characteristics."""

    snapshot = _snapshot(
        _point(
            1,
            {
                "highway": "crossing",
                "crossing": "traffic_signals",
                "crossing:signals": "yes",
                "traffic_signals:sound": "yes",
                "traffic_signals:vibration": "yes",
                "tactile_paving": "yes",
                "kerb": "lowered",
            },
        ),
        _way(
            2,
            {
                "highway": "footway",
                "footway": "sidewalk",
                "surface": "asphalt",
                "smoothness": "good",
                "foot": "designated",
                "incline": "4%",
                "ramp:wheelchair": "yes",
            },
        ),
    )
    index = OsmSpatialIndex(snapshot)
    route = _route()
    association = associate_route_corridor(route, index, corridor_width_m=5.0)

    candidate = enrich_ors_route(
        route,
        association,
        index,
        category=RouteCategory.BALANCED,
        name="Alternativa de prueba",
    )

    assert candidate.source.value == "ors"
    assert candidate.is_synthetic is False
    assert candidate.features.crossing_count == 1
    assert candidate.features.signalized_crossing_count == 1
    assert candidate.features.audible_signal_crossing_count == 1
    assert candidate.features.vibration_signal_crossing_count == 1
    assert candidate.features.tactile_paving_crossing_count == 1
    assert candidate.features.compatible_kerb_crossing_count == 1
    assert candidate.features.complex_crossing_count == 0
    assert candidate.features.sidewalk.state is EvidenceState.FAVORABLE
    assert candidate.features.sidewalk_coverage_ratio == pytest.approx(1.0)
    assert candidate.features.surface.state is EvidenceState.FAVORABLE
    assert candidate.features.maximum_slope_percent == 4.0
    assert candidate.features.slope.state is EvidenceState.FAVORABLE
    assert candidate.features.step_free.state is EvidenceState.UNKNOWN
    assert candidate.uncertainty.unknown_ratio > 0.0
    event = candidate.instructions[0].accessibility_events[0]
    details = {detail.attribute.value: detail for detail in event.details}
    assert event.text == "Cruce peatonal semaforizado próximo."
    assert event.source.value == "osm"
    assert details["traffic_signals"].state is EvidenceState.FAVORABLE
    assert details["audible_signals"].state is EvidenceState.FAVORABLE
    assert "señal acústica" in details["audible_signals"].text
    assert details["tactile_paving"].state is EvidenceState.FAVORABLE
    assert details["kerb"].state is EvidenceState.FAVORABLE
    assert details["ramp_access"].state is EvidenceState.FAVORABLE


def test_confirmed_close_barriers_are_unfavorable_but_absence_is_unknown() -> None:
    """Critical negatives require close evidence and missing tags stay unknown."""

    snapshot = _snapshot(
        _point(1, {"highway": "crossing", "crossing": "informal"}),
        _way(2, {"highway": "steps", "surface": "cobblestone"}),
        _way(3, {"highway": "footway", "foot": "no", "incline": "12%"}),
    )
    index = OsmSpatialIndex(snapshot)
    route = _route()

    candidate = enrich_ors_route(
        route,
        associate_route_corridor(route, index, corridor_width_m=10.0),
        index,
        category=RouteCategory.BALANCED,
        name="Alternativa con barreras",
    )

    assert candidate.features.crossing_compatibility.state is EvidenceState.UNFAVORABLE
    assert candidate.features.step_free.state is EvidenceState.UNFAVORABLE
    assert candidate.features.step_count == 1
    assert candidate.features.pedestrian_access.state is EvidenceState.UNFAVORABLE
    assert candidate.features.surface.state is EvidenceState.UNFAVORABLE
    assert candidate.features.slope.state is EvidenceState.UNFAVORABLE
    assert candidate.features.maximum_slope_percent == 12.0
    step_details = [
        detail
        for event in candidate.instructions[0].accessibility_events
        for detail in event.details
        if detail.attribute.value == "step_free"
    ]
    assert len(step_details) == 1
    assert step_details[0].state is EvidenceState.UNFAVORABLE

    empty_snapshot = _snapshot(
        _way(9, {"highway": "footway"}),
    )
    empty_index = OsmSpatialIndex(empty_snapshot)
    unknown = enrich_ors_route(
        route,
        associate_route_corridor(route, empty_index, corridor_width_m=10.0),
        empty_index,
        category=RouteCategory.BALANCED,
        name="Alternativa sin etiquetas",
    )

    assert all(
        evidence.state is EvidenceState.UNKNOWN
        for evidence in unknown.features.evidence_by_attribute().values()
    )
    assert unknown.features.step_count is None
    assert unknown.uncertainty.unknown_ratio == 1.0


def test_missing_crossing_support_is_exposed_as_unknown_not_absent() -> None:
    """Missing OSM tags produce explicit uncertainty at the relevant crossing."""

    snapshot = _snapshot(_point(1, {"highway": "crossing"}))
    index = OsmSpatialIndex(snapshot)
    route = _route()

    candidate = enrich_ors_route(
        route,
        associate_route_corridor(route, index, corridor_width_m=5.0),
        index,
        category=RouteCategory.BALANCED,
        name="Alternativa con cruce sin detalle",
    )

    event = candidate.instructions[0].accessibility_events[0]
    details = {detail.attribute.value: detail for detail in event.details}
    assert len(details) == 6
    assert all(detail.state is EvidenceState.UNKNOWN for detail in details.values())
    assert details["audible_signals"].text == (
        "OSM no permite confirmar señal acústica ni ayuda vibratoria."
    )
    assert "ausencia" not in details["audible_signals"].text.casefold()


def test_crossing_event_is_attached_to_the_segment_that_contains_it() -> None:
    """Along-route position selects the correct ORS instruction, not every step."""

    route = OrsBaseRoute(
        route_id="ors_route_1",
        distance_m=120.0,
        duration_s=90.0,
        detour_ratio=1.0,
        geometry=[
            GeoPoint(latitude=40.4300, longitude=-3.7200),
            GeoPoint(latitude=40.4305, longitude=-3.7200),
            GeoPoint(latitude=40.4310, longitude=-3.7200),
        ],
        instructions=[
            OrsBaseInstruction(
                instruction_type=11,
                maneuver=NavigationManeuver.DEPART,
                text="Empieza",
                distance_m=60.0,
                duration_s=45.0,
                geometry_start_index=0,
                geometry_end_index=1,
            ),
            OrsBaseInstruction(
                instruction_type=6,
                maneuver=NavigationManeuver.CONTINUE_STRAIGHT,
                text="Continúa",
                distance_m=60.0,
                duration_s=45.0,
                geometry_start_index=1,
                geometry_end_index=2,
            ),
        ],
        instruction_count=2,
        turn_count=0,
    )
    crossing = OsmRoutingElement(
        osm_type="node",
        osm_id=1,
        tags={"highway": "crossing", "crossing": "marked"},
        geometry=[GeoPoint(latitude=40.43075, longitude=-3.7200)],
    )
    snapshot = _snapshot(crossing)
    index = OsmSpatialIndex(snapshot)

    candidate = enrich_ors_route(
        route,
        associate_route_corridor(route, index, corridor_width_m=5.0),
        index,
        category=RouteCategory.BALANCED,
        name="Alternativa de dos tramos",
    )

    assert candidate.instructions[0].accessibility_events == []
    assert len(candidate.instructions[1].accessibility_events) == 1


def test_node_and_way_at_same_route_position_form_one_crossing() -> None:
    """Two OSM geometries for one physical crossing cannot be narrated twice."""

    node = _point(
        1,
        {
            "highway": "crossing",
            "crossing": "uncontrolled",
            "tactile_paving": "yes",
        },
    )
    way = OsmRoutingElement(
        osm_type="way",
        osm_id=2,
        tags={"highway": "footway", "crossing": "uncontrolled"},
        geometry=[
            GeoPoint(latitude=40.4305, longitude=-3.72002),
            GeoPoint(latitude=40.4305, longitude=-3.71998),
        ],
    )
    snapshot = _snapshot(node, way)
    index = OsmSpatialIndex(snapshot)
    route = _route()

    candidate = enrich_ors_route(
        route,
        associate_route_corridor(route, index, corridor_width_m=5.0),
        index,
        category=RouteCategory.BALANCED,
        name="Alternativa con cruce duplicado en OSM",
    )

    assert candidate.features.crossing_count == 1
    assert len(candidate.instructions[0].accessibility_events) == 1
    tactile = next(
        detail
        for detail in candidate.instructions[0].accessibility_events[0].details
        if detail.attribute.value == "tactile_paving"
    )
    assert tactile.state is EvidenceState.FAVORABLE


def test_very_short_segments_are_grouped_with_the_following_maneuver() -> None:
    """A two-metre ORS segment remains audible without becoming its own step."""

    route = OrsBaseRoute(
        route_id="ors_route_1",
        distance_m=102.0,
        duration_s=75.0,
        detour_ratio=1.0,
        geometry=[
            GeoPoint(latitude=40.4300, longitude=-3.7200),
            GeoPoint(latitude=40.43002, longitude=-3.7200),
            GeoPoint(latitude=40.43002, longitude=-3.7190),
            GeoPoint(latitude=40.43003, longitude=-3.7190),
        ],
        instructions=[
            OrsBaseInstruction(
                instruction_type=1,
                maneuver=NavigationManeuver.TURN_RIGHT,
                text="Gira a la derecha",
                street_name="",
                distance_m=2.0,
                duration_s=2.0,
                geometry_start_index=0,
                geometry_end_index=1,
            ),
            OrsBaseInstruction(
                instruction_type=4,
                maneuver=NavigationManeuver.TURN_SLIGHT_LEFT,
                text="Gira ligeramente a la izquierda",
                street_name="Calle de prueba",
                distance_m=100.0,
                duration_s=72.0,
                geometry_start_index=1,
                geometry_end_index=2,
            ),
            OrsBaseInstruction(
                instruction_type=10,
                maneuver=NavigationManeuver.ARRIVE,
                text="Has llegado",
                street_name="",
                distance_m=0.0,
                duration_s=1.0,
                geometry_start_index=2,
                geometry_end_index=3,
            ),
        ],
        instruction_count=3,
        turn_count=2,
    )
    snapshot = _snapshot(_way(9, {"highway": "footway"}))
    index = OsmSpatialIndex(snapshot)

    candidate = enrich_ors_route(
        route,
        associate_route_corridor(route, index, corridor_width_m=5.0),
        index,
        category=RouteCategory.BALANCED,
        name="Alternativa con maniobra breve",
    )

    assert len(candidate.instructions) == 2
    assert candidate.features.instruction_count == 3
    assert candidate.instructions[0].distance_m == 102.0
    assert candidate.instructions[0].text == (
        "Gira a la derecha. Tras avanzar 2 metros, gira ligeramente a la "
        "izquierda hacia la Calle de prueba. Después del giro, avanza 100 metros."
    )
    assert all(
        instruction.distance_m >= 10.0
        or instruction.maneuver is NavigationManeuver.ARRIVE
        for instruction in candidate.instructions
    )


def test_provider_placeholder_is_removed_from_text_and_reference() -> None:
    """An ORS missing-name marker cannot reach either navigation channel."""

    route = _route().model_copy(
        update={
            "instructions": [
                _route().instructions[0].model_copy(update={"street_name": "-"})
            ]
        }
    )
    snapshot = _snapshot(_way(1, {"highway": "footway"}))
    index = OsmSpatialIndex(snapshot)

    candidate = enrich_ors_route(
        route,
        associate_route_corridor(route, index, corridor_width_m=5.0),
        index,
        category=RouteCategory.BALANCED,
        name="Alternativa sin nombre de vía",
    )

    assert candidate.instructions[0].text == (
        "Empieza el recorrido. Avanza 120 metros."
    )
    assert candidate.instructions[0].street_name is None


def test_route_set_assigns_unique_descriptive_categories() -> None:
    """Real alternatives retain unique categories required by the public model."""

    snapshot = _snapshot(
        _point(1, {"highway": "crossing"}, longitude=-3.7200),
        _way(2, {"highway": "footway", "surface": "asphalt"}, longitude=-3.7200),
        _way(3, {"highway": "footway", "surface": "asphalt"}, longitude=-3.7197),
    )
    index = OsmSpatialIndex(snapshot)
    routes = [_route(), _route("ors_route_2", longitude=-3.7197)]
    associations = [
        associate_route_corridor(route, index, corridor_width_m=5.0)
        for route in routes
    ]

    candidates = enrich_ors_route_set(routes, associations, index)

    assert [candidate.category for candidate in candidates] == [
        RouteCategory.SIMPLE_OR_SHORT,
        RouteCategory.FEWER_COMPLEX_CROSSINGS,
    ]
    assert len({candidate.name for candidate in candidates}) == 2


def test_vehicle_signal_away_from_crossing_is_not_pedestrian_support() -> None:
    """A signal in the corridor only counts when linked to a mapped crossing."""

    snapshot = _snapshot(
        OsmRoutingElement(
            osm_type="node",
            osm_id=1,
            tags={"highway": "crossing"},
            geometry=[GeoPoint(latitude=40.4301, longitude=-3.7200)],
        ),
        OsmRoutingElement(
            osm_type="node",
            osm_id=2,
            tags={"highway": "traffic_signals"},
            geometry=[GeoPoint(latitude=40.4309, longitude=-3.7200)],
        ),
    )
    index = OsmSpatialIndex(snapshot)
    route = _route()

    candidate = enrich_ors_route(
        route,
        associate_route_corridor(route, index, corridor_width_m=5.0),
        index,
        category=RouteCategory.BALANCED,
        name="Alternativa de control",
    )

    assert candidate.features.crossing_count == 1
    assert candidate.features.signalized_crossing_count == 0
    assert candidate.features.traffic_signals.state is EvidenceState.UNKNOWN


def test_parallel_nearby_steps_do_not_become_a_confirmed_route_barrier() -> None:
    """A nearby aligned staircase is contextual evidence unless the route overlaps it."""

    nearby_steps = _way(
        1,
        {"highway": "steps"},
        longitude=-3.71999,
    )
    snapshot = _snapshot(nearby_steps)
    index = OsmSpatialIndex(snapshot)
    route = _route()

    candidate = enrich_ors_route(
        route,
        associate_route_corridor(route, index, corridor_width_m=10.0),
        index,
        category=RouteCategory.BALANCED,
        name="Alternativa paralela",
    )

    assert candidate.features.step_count is None
    assert candidate.features.step_free.state is EvidenceState.UNKNOWN


def test_nearby_negative_access_and_crossing_remain_unknown_without_alignment() -> None:
    """Contextual negative tags cannot trigger critical exclusions on proximity alone."""

    snapshot = _snapshot(
        _point(
            1,
            {"highway": "crossing", "crossing": "informal"},
            longitude=-3.71994,
        ),
        _way(
            2,
            {"highway": "service", "access": "no"},
            longitude=-3.71999,
        ),
    )
    index = OsmSpatialIndex(snapshot)
    route = _route()

    candidate = enrich_ors_route(
        route,
        associate_route_corridor(route, index, corridor_width_m=10.0),
        index,
        category=RouteCategory.BALANCED,
        name="Alternativa con contexto próximo",
    )

    assert candidate.features.crossing_compatibility.state is EvidenceState.UNKNOWN
    assert candidate.features.pedestrian_access.state is EvidenceState.UNKNOWN


def test_route_set_requires_one_association_per_route() -> None:
    """Mismatched route evidence cannot be silently combined."""

    snapshot = _snapshot(_way(1, {"highway": "footway"}))
    index = OsmSpatialIndex(snapshot)

    with pytest.raises(ValueError, match="exactly one"):
        enrich_ors_route_set([_route()], [], index)


def test_linear_coverage_unions_overlapping_intervals_without_double_counting() -> None:
    """Overlapping OSM ways cover their one-dimensional route union only once."""

    route = _route()
    snapshot = _snapshot(
        OsmRoutingElement(
            osm_type="way",
            osm_id=1,
            tags={"highway": "footway", "surface": "asphalt"},
            geometry=[
                GeoPoint(latitude=40.4300, longitude=-3.7200),
                GeoPoint(latitude=40.4304, longitude=-3.7200),
            ],
        ),
        OsmRoutingElement(
            osm_type="way",
            osm_id=2,
            tags={"highway": "footway", "surface": "asphalt"},
            geometry=[
                GeoPoint(latitude=40.4302, longitude=-3.7200),
                GeoPoint(latitude=40.4306, longitude=-3.7200),
            ],
        ),
    )
    index = OsmSpatialIndex(snapshot)

    candidate = enrich_ors_route(
        route,
        associate_route_corridor(route, index, corridor_width_m=5.0),
        index,
        category=RouteCategory.BALANCED,
        name="Alternativa con tramos solapados",
    )

    assert candidate.features.surface_coverage_ratio == pytest.approx(0.6, abs=0.01)


def test_linear_coverage_does_not_decrease_when_corridor_grows() -> None:
    """A wider nested corridor cannot reduce the union covered on one route."""

    route = _route()
    snapshot = _snapshot(
        _way(1, {"highway": "footway", "surface": "asphalt"}),
        _way(
            2,
            {"highway": "footway", "footway": "sidewalk"},
            longitude=-3.71992,
        ),
    )
    index = OsmSpatialIndex(snapshot)
    coverage_by_width = []
    for width in (5.0, 10.0, 20.0):
        candidate = enrich_ors_route(
            route,
            associate_route_corridor(route, index, corridor_width_m=width),
            index,
            category=RouteCategory.BALANCED,
            name="Alternativa para comprobar monotonía",
        )
        coverage_by_width.append(candidate.features.sidewalk_coverage_ratio or 0.0)

    assert coverage_by_width == sorted(coverage_by_width)
