"""Conservative conversion of associated OSM data into route evidence."""

from collections.abc import Callable, Iterable, Iterator, Sequence
from typing import Optional

from shapely.geometry import Point
from shapely.geometry.base import BaseGeometry

from backend.domain import (
    AccessibilityEvidence,
    DataSource,
    EvidenceState,
    NavigationAccessibilityEvent,
    NavigationInstruction,
    NavigationManeuver,
    RouteCandidate,
    RouteCategory,
    RouteFeatures,
    RouteSource,
    UncertaintySummary,
)
from backend.enrichment.instruction_context import (
    build_instruction_accessibility_events,
    group_crossing_matches,
)
from backend.enrichment.osm_mapping import (
    OsmFeatureFamily,
    OsmTagIndicator,
    families_for_tags,
    interpret_tag_value,
    parse_incline_percent,
)
from backend.enrichment.route_association import (
    OsmRouteMatch,
    RouteCorridorAssociation,
)
from backend.enrichment.spatial_index import OsmSpatialIndex
from backend.narration import (
    narrate_compound_instruction,
    normalize_street_reference,
)
from backend.routing.ors_models import OrsBaseInstruction, OrsBaseRoute

CRITICAL_ALIGNMENT_DISTANCE_M = 0.5
CRITICAL_MIN_ROUTE_OVERLAP_M = 3.0
CROSSING_CONTEXT_DISTANCE_M = 12.0
FAVORABLE_SLOPE_LIMIT_PERCENT = 5.0
UNFAVORABLE_SLOPE_LIMIT_PERCENT = 8.0
MICRO_INSTRUCTION_THRESHOLD_M = 10.0


def _group_navigation_instructions(
    instructions: Sequence[OrsBaseInstruction],
) -> list[list[tuple[int, OrsBaseInstruction]]]:
    """Attach every very short segment to its following maneuver.

    ORS can return a maneuver followed only a few metres later by another one.
    Keeping both actions is important, but exposing the first as an isolated
    instruction is hard to follow. Groups stop after the first segment of at
    least ten metres or on arrival.
    """

    groups: list[list[tuple[int, OrsBaseInstruction]]] = []
    index = 0
    while index < len(instructions):
        group = [(index, instructions[index])]
        while (
            group[-1][1].distance_m < MICRO_INSTRUCTION_THRESHOLD_M
            and group[-1][1].maneuver is not NavigationManeuver.ARRIVE
            and index + 1 < len(instructions)
        ):
            index += 1
            group.append((index, instructions[index]))
        groups.append(group)
        index += 1
    return groups


def _relocate_group_events(
    group: Sequence[tuple[int, OrsBaseInstruction]],
    events_by_instruction: dict[int, list[NavigationAccessibilityEvent]],
) -> list[NavigationAccessibilityEvent]:
    """Move original events into the cumulative distance of one group."""

    offset_m = 0.0
    relocated: list[NavigationAccessibilityEvent] = []
    for original_index, instruction in group:
        for event in events_by_instruction[original_index + 1]:
            relocated.append(
                event.model_copy(
                    update={
                        "distance_from_instruction_start_m": round(
                            offset_m + event.distance_from_instruction_start_m,
                            1,
                        )
                    }
                )
            )
        offset_m += instruction.distance_m
    relocated.sort(key=lambda event: event.distance_from_instruction_start_m)
    return [
        event.model_copy(update={"sequence": sequence})
        for sequence, event in enumerate(relocated, start=1)
    ]


def _build_navigation_instructions(
    route: OrsBaseRoute,
    events_by_instruction: dict[int, list[NavigationAccessibilityEvent]],
) -> list[NavigationInstruction]:
    """Build user-facing instructions with nearby maneuvers grouped."""

    result: list[NavigationInstruction] = []
    for sequence, group in enumerate(
        _group_navigation_instructions(route.instructions),
        start=1,
    ):
        first = group[0][1]
        events = _relocate_group_events(group, events_by_instruction)
        actions = [
            (
                instruction.maneuver,
                normalize_street_reference(instruction.street_name),
                instruction.distance_m,
            )
            for _index, instruction in group
        ]
        result.append(
            NavigationInstruction(
                sequence=sequence,
                maneuver=first.maneuver,
                text=narrate_compound_instruction(actions, events),
                street_name=(
                    normalize_street_reference(first.street_name)
                    if len(group) == 1
                    else None
                ),
                distance_m=sum(instruction.distance_m for _index, instruction in group),
                duration_s=sum(instruction.duration_s for _index, instruction in group),
                geometry_index=first.geometry_start_index,
                location=route.geometry[first.geometry_start_index],
                accessibility_events=events,
            )
        )
    return result


def _evidence(
    state: EvidenceState,
    coverage_ratio: float,
    note: str,
) -> AccessibilityEvidence:
    """Build one bounded OSM evidence item."""

    return AccessibilityEvidence(
        state=state,
        coverage_ratio=min(max(coverage_ratio, 0.0), 1.0),
        sources=[DataSource.OSM],
        note=note,
    )


def _family_matches(
    association: RouteCorridorAssociation,
    family: OsmFeatureFamily,
) -> list[OsmRouteMatch]:
    """Return stable matches classified into one evidence family."""

    return [
        match
        for match in association.matches
        if family in families_for_tags(match.element.tags)
    ]


def _indicators(
    matches: Iterable[OsmRouteMatch],
    keys: Sequence[str],
) -> list[OsmTagIndicator]:
    """Interpret selected keys found in a sequence of matches."""

    return [
        interpret_tag_value(key, match.element.tags[key])
        for match in matches
        for key in keys
        if key in match.element.tags
    ]


def _state_from_indicators(
    indicators: Sequence[OsmTagIndicator],
) -> EvidenceState:
    """Aggregate indicators with negative evidence taking precedence."""

    if OsmTagIndicator.NEGATIVE in indicators:
        return EvidenceState.UNFAVORABLE
    if OsmTagIndicator.POSITIVE in indicators:
        return EvidenceState.FAVORABLE
    return EvidenceState.UNKNOWN


def _route_coverage(
    route: OrsBaseRoute,
    association: RouteCorridorAssociation,
    spatial_index: OsmSpatialIndex,
    matches: Sequence[OsmRouteMatch],
    include: Optional[Callable[[OsmRouteMatch], bool]] = None,
) -> float:
    """Measure a union of route sections covered by matching OSM ways."""

    metric_route = spatial_index.project_route(route.geometry)
    covered_intervals: list[tuple[float, float]] = []
    for match in matches:
        if match.element.osm_type != "way" or include is not None and not include(match):
            continue
        geometry = spatial_index.metric_geometry(match.element)
        covered = metric_route.intersection(
            geometry.buffer(association.corridor_width_m, cap_style="flat")
        )
        for line_part in _line_parts(covered):
            positions = [
                metric_route.project(Point(coordinate))
                for coordinate in line_part.coords
            ]
            start, end = min(positions), max(positions)
            if end > start:
                covered_intervals.append((start, end))
    if not covered_intervals:
        return 0.0
    merged_length = 0.0
    current_start, current_end = sorted(covered_intervals)[0]
    for start, end in sorted(covered_intervals)[1:]:
        if start <= current_end:
            current_end = max(current_end, end)
        else:
            merged_length += current_end - current_start
            current_start, current_end = start, end
    merged_length += current_end - current_start
    return min(merged_length / metric_route.length, 1.0)


def _line_parts(geometry: BaseGeometry) -> Iterator[BaseGeometry]:
    """Yield line components from a possibly multipart intersection geometry."""

    if geometry.is_empty:
        return
    if geometry.geom_type in {"LineString", "LinearRing"}:
        yield geometry
        return
    for part in getattr(geometry, "geoms", ()):
        yield from _line_parts(part)


def _is_confirmed_route_barrier(
    match: OsmRouteMatch,
    route: OrsBaseRoute,
    spatial_index: OsmSpatialIndex,
) -> bool:
    """Require close, sustained alignment before confirming a critical barrier."""

    if match.distance_to_route_m > CRITICAL_ALIGNMENT_DISTANCE_M:
        return False
    if match.element.osm_type == "node":
        return True
    metric_route = spatial_index.project_route(route.geometry)
    element_geometry = spatial_index.metric_geometry(match.element)
    route_overlap = metric_route.intersection(
        element_geometry.buffer(CRITICAL_ALIGNMENT_DISTANCE_M, cap_style="flat")
    ).length
    return route_overlap >= CRITICAL_MIN_ROUTE_OVERLAP_M


def _crossing_state_and_count(
    crossing_matches: Sequence[OsmRouteMatch],
) -> tuple[EvidenceState, int]:
    """Return conservative crossing compatibility and burden count."""

    if not crossing_matches:
        return EvidenceState.UNKNOWN, 0
    supported = 0
    has_negative = False
    for match in crossing_matches:
        tags = match.element.tags
        indicators = _indicators([match], ("crossing",))
        positive_control = (
            tags.get("crossing") in {"traffic_signals", "marked", "zebra"}
            or tags.get("crossing:signals") == "yes"
            or tags.get("tactile_paving") == "yes"
        )
        supported += positive_control
        has_negative = has_negative or (
            match.distance_to_route_m <= CRITICAL_ALIGNMENT_DISTANCE_M
            and OsmTagIndicator.NEGATIVE in indicators
        )
    if has_negative:
        return EvidenceState.UNFAVORABLE, len(crossing_matches) - supported
    if supported == len(crossing_matches):
        return EvidenceState.FAVORABLE, 0
    return EvidenceState.UNKNOWN, len(crossing_matches) - supported


def _crossing_support_evidence(
    crossing_count: int,
    matches: Sequence[OsmRouteMatch],
    *,
    keys: Sequence[str],
    positive_count: int,
    note: str,
) -> AccessibilityEvidence:
    """Build support evidence whose coverage is relative to mapped crossings."""

    if crossing_count == 0:
        return _evidence(EvidenceState.UNKNOWN, 0.0, note)
    indicators = _indicators(matches, keys)
    return _evidence(
        _state_from_indicators(indicators),
        positive_count / crossing_count,
        note,
    )


def _matches_near_crossings(
    crossing_matches: Sequence[OsmRouteMatch],
    support_matches: Sequence[OsmRouteMatch],
    spatial_index: OsmSpatialIndex,
) -> list[OsmRouteMatch]:
    """Keep support objects that are spatially linked to a mapped crossing."""

    crossing_geometries = [
        spatial_index.metric_geometry(match.element) for match in crossing_matches
    ]
    return [
        match
        for match in support_matches
        if any(
            spatial_index.metric_geometry(match.element).distance(crossing_geometry)
            <= CROSSING_CONTEXT_DISTANCE_M
            for crossing_geometry in crossing_geometries
        )
    ]


def _supported_crossing_count(
    crossing_matches: Sequence[OsmRouteMatch],
    support_matches: Sequence[OsmRouteMatch],
    spatial_index: OsmSpatialIndex,
    is_positive: Callable[[OsmRouteMatch], bool],
) -> int:
    """Count crossings with at least one nearby explicitly positive support."""

    positive_geometries = [
        spatial_index.metric_geometry(match.element)
        for match in support_matches
        if is_positive(match)
    ]
    return sum(
        any(
            spatial_index.metric_geometry(crossing.element).distance(support)
            <= CROSSING_CONTEXT_DISTANCE_M
            for support in positive_geometries
        )
        for crossing in crossing_matches
    )


def enrich_ors_route(
    route: OrsBaseRoute,
    association: RouteCorridorAssociation,
    spatial_index: OsmSpatialIndex,
    *,
    category: RouteCategory,
    name: str,
) -> RouteCandidate:
    """Build a scoreable real candidate from ORS facts and OSM evidence.

    Args:
        route: Neutral routing facts returned by ORS.
        association: OSM objects located within the selected route corridor.
        spatial_index: Metric geometries used for union-based coverage.
        category: Unique presentation category assigned within the route set.
        name: Descriptive non-safety route label.

    Returns:
        Validated candidate with explicit favorable, unfavorable and unknown data.
    """

    raw_crossing_matches = _family_matches(
        association,
        OsmFeatureFamily.CROSSINGS,
    )
    crossing_clusters = group_crossing_matches(
        route,
        raw_crossing_matches,
        spatial_index,
    )
    crossing_matches = [cluster.representative for cluster in crossing_clusters]
    signal_matches = _family_matches(association, OsmFeatureFamily.TRAFFIC_SIGNALS)
    assistance_matches = _family_matches(association, OsmFeatureFamily.SIGNAL_ASSISTANCE)
    tactile_matches = _family_matches(association, OsmFeatureFamily.TACTILE_PAVING)
    kerb_matches = _family_matches(association, OsmFeatureFamily.KERBS)
    sidewalk_matches = _family_matches(association, OsmFeatureFamily.SIDEWALKS)
    ramp_matches = _family_matches(association, OsmFeatureFamily.RAMPS_OR_WHEELCHAIR)
    step_matches = [
        match
        for match in _family_matches(association, OsmFeatureFamily.STEPS)
        if _is_confirmed_route_barrier(match, route, spatial_index)
    ]
    surface_matches = _family_matches(association, OsmFeatureFamily.SURFACE)
    incline_matches = _family_matches(association, OsmFeatureFamily.INCLINE)
    access_matches = _family_matches(association, OsmFeatureFamily.PEDESTRIAN_ACCESS)

    crossing_count = len(crossing_matches)
    crossing_state, complex_crossing_count = _crossing_state_and_count(crossing_matches)
    signal_matches = _matches_near_crossings(
        crossing_matches,
        signal_matches,
        spatial_index,
    )
    assistance_matches = _matches_near_crossings(
        crossing_matches,
        assistance_matches,
        spatial_index,
    )
    tactile_matches = _matches_near_crossings(
        crossing_matches,
        tactile_matches,
        spatial_index,
    )
    kerb_matches = _matches_near_crossings(
        crossing_matches,
        kerb_matches,
        spatial_index,
    )
    signalized_crossing_count = _supported_crossing_count(
        crossing_matches,
        signal_matches,
        spatial_index,
        lambda match: (
            match.element.tags.get("highway") == "traffic_signals"
            or match.element.tags.get("crossing") == "traffic_signals"
            or match.element.tags.get("crossing:signals") == "yes"
        ),
    )
    audible_count = _supported_crossing_count(
        crossing_matches,
        assistance_matches,
        spatial_index,
        lambda match: match.element.tags.get("traffic_signals:sound")
        in {"yes", "walk"},
    )
    vibration_count = _supported_crossing_count(
        crossing_matches,
        assistance_matches,
        spatial_index,
        lambda match: (
            match.element.tags.get("traffic_signals:vibration") == "yes"
            or match.element.tags.get("traffic_signals:floor_vibration") == "yes"
        ),
    )
    tactile_count = _supported_crossing_count(
        crossing_matches,
        tactile_matches,
        spatial_index,
        lambda match: match.element.tags.get("tactile_paving") == "yes",
    )
    compatible_kerb_count = _supported_crossing_count(
        crossing_matches,
        kerb_matches,
        spatial_index,
        lambda match: match.element.tags.get("kerb") in {"lowered", "no"},
    )

    sidewalk_indicators = _indicators(
        sidewalk_matches,
        ("sidewalk", "sidewalk:left", "sidewalk:right", "sidewalk:both"),
    )
    if any(match.element.tags.get("footway") == "sidewalk" for match in sidewalk_matches):
        sidewalk_indicators.append(OsmTagIndicator.POSITIVE)
    sidewalk_coverage = _route_coverage(
        route,
        association,
        spatial_index,
        sidewalk_matches,
    )

    access_indicators = _indicators(access_matches, ("foot", "access"))
    critical_access_indicators = _indicators(
        [
            match
            for match in access_matches
            if _is_confirmed_route_barrier(match, route, spatial_index)
        ],
        ("foot", "access"),
    )
    if OsmTagIndicator.NEGATIVE in critical_access_indicators:
        access_state = EvidenceState.UNFAVORABLE
    elif OsmTagIndicator.POSITIVE in access_indicators:
        access_state = EvidenceState.FAVORABLE
    else:
        access_state = EvidenceState.UNKNOWN
    access_coverage = _route_coverage(
        route,
        association,
        spatial_index,
        access_matches,
    )

    surface_indicators = _indicators(surface_matches, ("surface", "smoothness"))
    surface_coverage = _route_coverage(
        route,
        association,
        spatial_index,
        surface_matches,
    )

    confirmed_incline_matches = [
        match
        for match in incline_matches
        if _is_confirmed_route_barrier(match, route, spatial_index)
    ]
    incline_values = [
        parsed
        for match in confirmed_incline_matches
        if (parsed := parse_incline_percent(match.element.tags.get("incline", "")))
        is not None
    ]
    maximum_slope = max(incline_values, default=None)
    slope_coverage = _route_coverage(
        route,
        association,
        spatial_index,
        confirmed_incline_matches,
        include=lambda match: parse_incline_percent(
            match.element.tags.get("incline", "")
        )
        is not None,
    )
    if maximum_slope is None or (
        FAVORABLE_SLOPE_LIMIT_PERCENT
        < maximum_slope
        < UNFAVORABLE_SLOPE_LIMIT_PERCENT
    ):
        slope_state = EvidenceState.UNKNOWN
    elif maximum_slope <= FAVORABLE_SLOPE_LIMIT_PERCENT:
        slope_state = EvidenceState.FAVORABLE
    else:
        slope_state = EvidenceState.UNFAVORABLE

    ramp_indicators = _indicators(
        ramp_matches,
        ("ramp", "ramp:wheelchair", "wheelchair"),
    )
    step_state = EvidenceState.UNFAVORABLE if step_matches else EvidenceState.UNKNOWN
    features = RouteFeatures(
        distance_m=route.distance_m,
        duration_s=route.duration_s,
        detour_ratio=route.detour_ratio,
        crossing_count=crossing_count,
        signalized_crossing_count=signalized_crossing_count,
        audible_signal_crossing_count=audible_count,
        vibration_signal_crossing_count=vibration_count,
        tactile_paving_crossing_count=tactile_count,
        compatible_kerb_crossing_count=compatible_kerb_count,
        complex_crossing_count=complex_crossing_count,
        step_count=len(step_matches) if step_matches else None,
        ramp_count=len(ramp_matches) if ramp_matches else None,
        instruction_count=route.instruction_count,
        turn_count=route.turn_count,
        sidewalk_coverage_ratio=sidewalk_coverage or None,
        surface_coverage_ratio=surface_coverage or None,
        maximum_slope_percent=maximum_slope,
        sidewalk=_evidence(
            _state_from_indicators(sidewalk_indicators),
            sidewalk_coverage,
            "Cobertura de aceras declarada en OSM dentro del corredor analizado.",
        ),
        step_free=_evidence(
            step_state,
            1.0 if step_matches else 0.0,
            "La ausencia de escalones cartografiados no confirma una ruta sin escalones.",
        ),
        pedestrian_access=_evidence(
            access_state,
            access_coverage,
            "Permisos peatonales explícitos asociados al recorrido.",
        ),
        crossing_compatibility=_evidence(
            crossing_state,
            (crossing_count - complex_crossing_count) / crossing_count
            if crossing_count
            else 0.0,
            "Compatibilidad estimada solo a partir de cruces peatonales declarados.",
        ),
        traffic_signals=_crossing_support_evidence(
            crossing_count,
            signal_matches,
            keys=("highway", "crossing", "crossing:signals"),
            positive_count=signalized_crossing_count,
            note="Semáforos próximos a cruces cartografiados en el corredor.",
        ),
        audible_signals=_crossing_support_evidence(
            crossing_count,
            assistance_matches,
            keys=(
                "traffic_signals:sound",
                "traffic_signals:vibration",
                "traffic_signals:floor_vibration",
            ),
            positive_count=min(audible_count + vibration_count, crossing_count),
            note="Ayudas acústicas o vibratorias declaradas en OSM.",
        ),
        tactile_paving=_crossing_support_evidence(
            crossing_count,
            tactile_matches,
            keys=("tactile_paving",),
            positive_count=tactile_count,
            note="Pavimento podotáctil declarado en cruces próximos a la ruta.",
        ),
        kerb=_crossing_support_evidence(
            crossing_count,
            kerb_matches,
            keys=("kerb",),
            positive_count=compatible_kerb_count,
            note="Bordillos declarados; los valores ambiguos conservan incertidumbre.",
        ),
        ramp_access=_evidence(
            _state_from_indicators(ramp_indicators),
            min(len(ramp_matches) / crossing_count, 1.0) if crossing_count else 0.0,
            "Rampas o acceso en silla de ruedas declarados cerca del recorrido.",
        ),
        surface=_evidence(
            _state_from_indicators(surface_indicators),
            surface_coverage,
            "Cobertura del recorrido con superficie o regularidad declarada.",
        ),
        slope=_evidence(
            slope_state,
            slope_coverage,
            "Pendiente numérica declarada; valores direccionales permanecen desconocidos.",
        ),
    )
    unknown_attributes = [
        attribute
        for attribute, evidence in features.evidence_by_attribute().items()
        if evidence.state is EvidenceState.UNKNOWN
    ]
    limitations = []
    if unknown_attributes:
        limitations.append(
            "OSM no ofrece evidencia concluyente para todos los atributos del recorrido."
        )
    if association.corridor_width_m > CRITICAL_ALIGNMENT_DISTANCE_M:
        limitations.append(
            "La proximidad espacial no demuestra por sí sola que un elemento "
            "pertenezca al lado recorrido."
        )
    events_by_instruction = build_instruction_accessibility_events(
        route,
        association,
        spatial_index,
        confirmed_step_matches=step_matches,
    )
    return RouteCandidate(
        route_id=route.route_id,
        name=name,
        source=RouteSource.ORS,
        category=category,
        is_synthetic=False,
        geometry=route.geometry,
        instructions=_build_navigation_instructions(route, events_by_instruction),
        features=features,
        uncertainty=UncertaintySummary(
            unknown_attributes=unknown_attributes,
            limitations=limitations,
        ),
    )


def enrich_ors_route_set(
    routes: Sequence[OrsBaseRoute],
    associations: Sequence[RouteCorridorAssociation],
    spatial_index: OsmSpatialIndex,
) -> list[RouteCandidate]:
    """Enrich up to three ORS routes with stable unique presentation categories.

    Args:
        routes: Base routes in provider order.
        associations: One matching corridor result for every route.
        spatial_index: Shared metric OSM index.

    Returns:
        Scoreable candidates in the original provider order.

    Raises:
        ValueError: If route and association identifiers do not match.
    """

    association_by_id = {association.route_id: association for association in associations}
    if set(association_by_id) != {route.route_id for route in routes}:
        raise ValueError("every ORS route requires exactly one matching association")

    shortest_id = min(routes, key=lambda route: (route.distance_m, route.route_id)).route_id
    remaining = [route for route in routes if route.route_id != shortest_id]
    fewer_crossings_id: Optional[str] = None
    if remaining:
        fewer_crossings_id = min(
            remaining,
            key=lambda route: (
                len(
                    group_crossing_matches(
                        route,
                        _family_matches(
                            association_by_id[route.route_id],
                            OsmFeatureFamily.CROSSINGS,
                        ),
                        spatial_index,
                    )
                ),
                route.distance_m,
                route.route_id,
            ),
        ).route_id

    candidates: list[RouteCandidate] = []
    for route in routes:
        if route.route_id == shortest_id:
            category = RouteCategory.SIMPLE_OR_SHORT
            name = "Alternativa más corta"
        elif route.route_id == fewer_crossings_id:
            category = RouteCategory.FEWER_COMPLEX_CROSSINGS
            name = "Alternativa con menos cruces cartografiados"
        else:
            category = RouteCategory.BALANCED
            name = "Alternativa equilibrada"
        candidates.append(
            enrich_ors_route(
                route,
                association_by_id[route.route_id],
                spatial_index,
                category=category,
                name=name,
            )
        )
    return candidates
