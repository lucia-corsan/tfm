"""Associate conservative OSM accessibility events with ORS instructions."""

from collections.abc import Sequence
from dataclasses import dataclass

from shapely.ops import nearest_points

from backend.domain import (
    AccessibilityAttribute,
    DataSource,
    EvidenceState,
    NavigationAccessibilityDetail,
    NavigationAccessibilityEvent,
    NavigationManeuver,
)
from backend.enrichment.osm_mapping import (
    OsmFeatureFamily,
    OsmTagIndicator,
    families_for_tags,
    interpret_tag_value,
)
from backend.enrichment.route_association import (
    OsmRouteMatch,
    RouteCorridorAssociation,
)
from backend.enrichment.spatial_index import OsmSpatialIndex
from backend.routing.ors_models import OrsBaseRoute

CROSSING_SUPPORT_DISTANCE_M = 12.0
CROSSING_DEDUPLICATION_DISTANCE_M = 1.0
_POSITION_EPSILON_M = 0.25


@dataclass(frozen=True)
class _EventDraft:
    """Internal event awaiting stable ordering within one instruction."""

    distance_m: float
    text: str
    details: tuple[NavigationAccessibilityDetail, ...]


@dataclass(frozen=True)
class CrossingCluster:
    """OSM objects that describe one crossing at the same route position."""

    position_m: float
    matches: tuple[OsmRouteMatch, ...]

    @property
    def representative(self) -> OsmRouteMatch:
        """Return the most informative stable object for route-level metrics."""

        return min(
            self.matches,
            key=lambda match: (
                -len(match.element.tags),
                match.distance_to_route_m,
                match.element.osm_type,
                match.element.osm_id,
            ),
        )


def _matches_for_family(
    association: RouteCorridorAssociation,
    family: OsmFeatureFamily,
) -> list[OsmRouteMatch]:
    """Return route matches classified into one OSM evidence family."""

    return [
        match
        for match in association.matches
        if family in families_for_tags(match.element.tags)
    ]


def _related_matches(
    crossings: Sequence[OsmRouteMatch],
    candidates: Sequence[OsmRouteMatch],
    spatial_index: OsmSpatialIndex,
) -> list[OsmRouteMatch]:
    """Return support objects close enough to one mapped crossing."""

    crossing_geometries = [
        spatial_index.metric_geometry(crossing.element) for crossing in crossings
    ]
    return [
        match
        for match in candidates
        if any(
            spatial_index.metric_geometry(match.element).distance(crossing_geometry)
            <= CROSSING_SUPPORT_DISTANCE_M
            for crossing_geometry in crossing_geometries
        )
    ]


def _state_for_keys(
    matches: Sequence[OsmRouteMatch],
    keys: Sequence[str],
) -> EvidenceState:
    """Aggregate explicit tag meanings while preserving contradictions as unknown."""

    indicators = {
        interpret_tag_value(key, match.element.tags[key])
        for match in matches
        for key in keys
        if key in match.element.tags
    }
    has_positive = OsmTagIndicator.POSITIVE in indicators
    has_negative = OsmTagIndicator.NEGATIVE in indicators
    if has_positive and has_negative:
        return EvidenceState.UNKNOWN
    if has_negative:
        return EvidenceState.UNFAVORABLE
    if has_positive:
        return EvidenceState.FAVORABLE
    return EvidenceState.UNKNOWN


def _detail(
    attribute: AccessibilityAttribute,
    state: EvidenceState,
    text: str,
) -> NavigationAccessibilityDetail:
    """Build one validated detail for a navigation event."""

    return NavigationAccessibilityDetail(
        attribute=attribute,
        state=state,
        text=text,
    )


def _crossing_detail(
    crossings: Sequence[OsmRouteMatch],
) -> NavigationAccessibilityDetail:
    """Describe crossing objects grouped at one route position."""

    values = {
        crossing.element.tags.get("crossing", "").casefold()
        for crossing in crossings
    }
    signals = {
        crossing.element.tags.get("crossing:signals", "").casefold()
        for crossing in crossings
    }
    favorable = bool(values & {"traffic_signals", "marked", "zebra"}) or "yes" in signals
    unfavorable = bool(values & {"informal", "no"})
    if favorable and unfavorable:
        return _detail(
            AccessibilityAttribute.CROSSING_COMPATIBILITY,
            EvidenceState.UNKNOWN,
            "OSM contiene información contradictoria sobre el tipo de cruce.",
        )
    if "traffic_signals" in values or "yes" in signals:
        return _detail(
            AccessibilityAttribute.CROSSING_COMPATIBILITY,
            EvidenceState.FAVORABLE,
            "OSM declara un cruce peatonal semaforizado.",
        )
    if values & {"marked", "zebra"}:
        return _detail(
            AccessibilityAttribute.CROSSING_COMPATIBILITY,
            EvidenceState.FAVORABLE,
            "OSM declara un paso de peatones marcado.",
        )
    if unfavorable:
        return _detail(
            AccessibilityAttribute.CROSSING_COMPATIBILITY,
            EvidenceState.UNFAVORABLE,
            "OSM declara un cruce informal o no habilitado.",
        )
    return _detail(
        AccessibilityAttribute.CROSSING_COMPATIBILITY,
        EvidenceState.UNKNOWN,
        "OSM cartografía un cruce, pero no permite confirmar su tipo.",
    )


def _traffic_signal_detail(
    matches: Sequence[OsmRouteMatch],
) -> NavigationAccessibilityDetail:
    """Describe explicit pedestrian signal evidence near one crossing."""

    tags = [match.element.tags for match in matches]
    positive = any(
        item.get("highway") == "traffic_signals"
        or item.get("crossing") == "traffic_signals"
        or item.get("crossing:signals") == "yes"
        for item in tags
    )
    negative = any(item.get("crossing:signals") == "no" for item in tags)
    if positive and negative:
        state = EvidenceState.UNKNOWN
        text = "OSM contiene información contradictoria sobre el semáforo del cruce."
    elif positive:
        state = EvidenceState.FAVORABLE
        text = "OSM declara semáforo asociado al cruce."
    elif negative:
        state = EvidenceState.UNFAVORABLE
        text = "OSM declara que el cruce no está semaforizado."
    else:
        state = EvidenceState.UNKNOWN
        text = "OSM no permite confirmar si el cruce está semaforizado."
    return _detail(AccessibilityAttribute.TRAFFIC_SIGNALS, state, text)


def _signal_assistance_detail(
    matches: Sequence[OsmRouteMatch],
) -> NavigationAccessibilityDetail:
    """Describe acoustic and vibratory signal evidence without filling gaps."""

    tags = [match.element.tags for match in matches]
    sound_positive = any(
        item.get("traffic_signals:sound") in {"yes", "walk"} for item in tags
    )
    sound_negative = any(
        item.get("traffic_signals:sound") == "no" for item in tags
    )
    vibration_positive = any(
        item.get("traffic_signals:vibration") == "yes"
        or item.get("traffic_signals:floor_vibration") == "yes"
        for item in tags
    )
    vibration_negative = any(
        item.get("traffic_signals:vibration") == "no"
        or item.get("traffic_signals:floor_vibration") == "no"
        for item in tags
    )

    if sound_positive and vibration_positive:
        state = EvidenceState.FAVORABLE
        text = "OSM declara señal acústica y ayuda vibratoria en el cruce."
    elif sound_positive:
        state = EvidenceState.FAVORABLE
        text = "OSM declara señal acústica en el cruce."
    elif vibration_positive:
        state = EvidenceState.FAVORABLE
        if sound_negative:
            text = (
                "OSM declara ayuda vibratoria y ausencia de señal acústica "
                "en el cruce."
            )
        else:
            text = (
                "OSM declara ayuda vibratoria; la señal acústica no está "
                "confirmada."
            )
    elif sound_negative:
        state = EvidenceState.UNFAVORABLE
        if vibration_negative:
            text = "OSM declara ausencia de señal acústica y ayuda vibratoria."
        else:
            text = (
                "OSM declara ausencia de señal acústica; la ayuda vibratoria "
                "no está confirmada."
            )
    else:
        state = EvidenceState.UNKNOWN
        text = "OSM no permite confirmar señal acústica ni ayuda vibratoria."
    return _detail(AccessibilityAttribute.AUDIBLE_SIGNALS, state, text)


def _mapped_support_detail(
    matches: Sequence[OsmRouteMatch],
    *,
    attribute: AccessibilityAttribute,
    keys: Sequence[str],
    favorable_text: str,
    unfavorable_text: str,
    unknown_text: str,
) -> NavigationAccessibilityDetail:
    """Describe one support family from explicit positive or negative tags."""

    state = _state_for_keys(matches, keys)
    text_by_state = {
        EvidenceState.FAVORABLE: favorable_text,
        EvidenceState.UNFAVORABLE: unfavorable_text,
        EvidenceState.UNKNOWN: unknown_text,
    }
    return _detail(attribute, state, text_by_state[state])


def _crossing_summary(crossings: Sequence[OsmRouteMatch]) -> str:
    """Return a short neutral heading for one grouped crossing."""

    values = {
        crossing.element.tags.get("crossing", "").casefold()
        for crossing in crossings
    }
    signals = {
        crossing.element.tags.get("crossing:signals", "").casefold()
        for crossing in crossings
    }
    if "traffic_signals" in values or "yes" in signals:
        return "Cruce peatonal semaforizado próximo."
    if values & {"marked", "zebra"}:
        return "Paso de peatones marcado próximo."
    if values & {"informal", "no"}:
        return "Cruce informal o no habilitado próximo."
    return "Cruce peatonal cartografiado próximo."


def _crossing_details(
    crossings: Sequence[OsmRouteMatch],
    association: RouteCorridorAssociation,
    spatial_index: OsmSpatialIndex,
) -> tuple[NavigationAccessibilityDetail, ...]:
    """Build independently readable evidence details for one crossing."""

    signal_matches = _related_matches(
        crossings,
        _matches_for_family(association, OsmFeatureFamily.TRAFFIC_SIGNALS),
        spatial_index,
    )
    assistance_matches = _related_matches(
        crossings,
        _matches_for_family(association, OsmFeatureFamily.SIGNAL_ASSISTANCE),
        spatial_index,
    )
    tactile_matches = _related_matches(
        crossings,
        _matches_for_family(association, OsmFeatureFamily.TACTILE_PAVING),
        spatial_index,
    )
    kerb_matches = _related_matches(
        crossings,
        _matches_for_family(association, OsmFeatureFamily.KERBS),
        spatial_index,
    )
    ramp_matches = _related_matches(
        crossings,
        _matches_for_family(
            association,
            OsmFeatureFamily.RAMPS_OR_WHEELCHAIR,
        ),
        spatial_index,
    )
    return (
        _crossing_detail(crossings),
        _traffic_signal_detail(signal_matches),
        _signal_assistance_detail(assistance_matches),
        _mapped_support_detail(
            tactile_matches,
            attribute=AccessibilityAttribute.TACTILE_PAVING,
            keys=("tactile_paving",),
            favorable_text="OSM declara pavimento podotáctil en el cruce.",
            unfavorable_text=(
                "OSM declara ausencia o colocación incorrecta de pavimento "
                "podotáctil."
            ),
            unknown_text="OSM no permite confirmar el pavimento podotáctil.",
        ),
        _mapped_support_detail(
            kerb_matches,
            attribute=AccessibilityAttribute.KERB,
            keys=("kerb",),
            favorable_text="OSM declara un bordillo rebajado o a nivel.",
            unfavorable_text="OSM declara un bordillo elevado en el cruce.",
            unknown_text="OSM no permite confirmar la altura del bordillo.",
        ),
        _mapped_support_detail(
            ramp_matches,
            attribute=AccessibilityAttribute.RAMP_ACCESS,
            keys=("ramp", "ramp:wheelchair", "wheelchair"),
            favorable_text="OSM declara una rampa compatible próxima al cruce.",
            unfavorable_text="OSM declara ausencia de una rampa compatible.",
            unknown_text="OSM no permite confirmar una rampa compatible.",
        ),
    )


def _route_position_m(
    match: OsmRouteMatch,
    route: OrsBaseRoute,
    spatial_index: OsmSpatialIndex,
) -> float:
    """Project one matched OSM object onto the route's cumulative distance."""

    metric_route = spatial_index.project_route(route.geometry)
    point_on_route, _point_on_element = nearest_points(
        metric_route,
        spatial_index.metric_geometry(match.element),
    )
    return float(metric_route.project(point_on_route))


def group_crossing_matches(
    route: OrsBaseRoute,
    matches: Sequence[OsmRouteMatch],
    spatial_index: OsmSpatialIndex,
) -> list[CrossingCluster]:
    """Group duplicate OSM representations of a crossing by route position.

    OSM may represent one physical crossing both as a node and as a short way.
    Objects whose projections differ by at most one metre are therefore treated
    as one navigational event while preserving all their tags as evidence.

    Args:
        route: Route used to calculate cumulative positions.
        matches: Objects already classified as crossings.
        spatial_index: Metric geometries used for projection.

    Returns:
        Stable clusters ordered from the start to the end of the route.
    """

    positioned = sorted(
        ((_route_position_m(match, route, spatial_index), match) for match in matches),
        key=lambda item: (
            item[0],
            item[1].element.osm_type,
            item[1].element.osm_id,
        ),
    )
    clusters: list[CrossingCluster] = []
    current: list[OsmRouteMatch] = []
    current_position = 0.0
    for position, match in positioned:
        if current and position - current_position > CROSSING_DEDUPLICATION_DISTANCE_M:
            clusters.append(
                CrossingCluster(position_m=current_position, matches=tuple(current))
            )
            current = []
        if not current:
            current_position = position
        current.append(match)
    if current:
        clusters.append(
            CrossingCluster(position_m=current_position, matches=tuple(current))
        )
    return clusters


def _instruction_index_for_position(
    position_m: float,
    route: OrsBaseRoute,
    spatial_index: OsmSpatialIndex,
) -> tuple[int, float]:
    """Select the latest non-arrival instruction starting before one event."""

    metric_route = spatial_index.project_route(route.geometry)
    start_positions = [
        float(
            metric_route.project(
                spatial_index.project_point(
                    route.geometry[instruction.geometry_start_index]
                )
            )
        )
        for instruction in route.instructions
    ]
    eligible = [
        index
        for index, (instruction, start) in enumerate(
            zip(route.instructions, start_positions)
        )
        if instruction.maneuver is not NavigationManeuver.ARRIVE
        and start <= position_m + _POSITION_EPSILON_M
    ]
    instruction_index = eligible[-1] if eligible else 0
    distance = max(position_m - start_positions[instruction_index], 0.0)
    return instruction_index, distance


def build_instruction_accessibility_events(
    route: OrsBaseRoute,
    association: RouteCorridorAssociation,
    spatial_index: OsmSpatialIndex,
    *,
    confirmed_step_matches: Sequence[OsmRouteMatch],
) -> dict[int, list[NavigationAccessibilityEvent]]:
    """Build ordered OSM context for each ORS instruction sequence.

    Args:
        route: Validated ORS route whose instructions define route segments.
        association: OSM objects inside the calibrated route corridor.
        spatial_index: Shared metric geometries for distance calculations.
        confirmed_step_matches: Strictly aligned step barriers only.

    Returns:
        Mapping from one-based instruction sequence to ordered events.
    """

    drafts_by_index: dict[int, list[_EventDraft]] = {
        index: [] for index in range(len(route.instructions))
    }
    crossing_matches = _matches_for_family(
        association,
        OsmFeatureFamily.CROSSINGS,
    )
    crossing_clusters = group_crossing_matches(
        route,
        crossing_matches,
        spatial_index,
    )
    for cluster in crossing_clusters:
        position = cluster.position_m
        instruction_index, distance = _instruction_index_for_position(
            position,
            route,
            spatial_index,
        )
        drafts_by_index[instruction_index].append(
            _EventDraft(
                distance_m=distance,
                text=_crossing_summary(cluster.matches),
                details=_crossing_details(
                    cluster.matches,
                    association,
                    spatial_index,
                ),
            )
        )

    for step_match in confirmed_step_matches:
        position = _route_position_m(step_match, route, spatial_index)
        instruction_index, distance = _instruction_index_for_position(
            position,
            route,
            spatial_index,
        )
        drafts_by_index[instruction_index].append(
            _EventDraft(
                distance_m=distance,
                text="Tramo con escalones declarado próximo.",
                details=(
                    _detail(
                        AccessibilityAttribute.STEP_FREE,
                        EvidenceState.UNFAVORABLE,
                        "OSM declara escalones alineados con el recorrido.",
                    ),
                ),
            )
        )

    result: dict[int, list[NavigationAccessibilityEvent]] = {}
    for instruction_index, drafts in drafts_by_index.items():
        ordered = sorted(drafts, key=lambda item: (item.distance_m, item.text))
        result[instruction_index + 1] = [
            NavigationAccessibilityEvent(
                sequence=sequence,
                distance_from_instruction_start_m=round(draft.distance_m, 1),
                text=draft.text,
                source=DataSource.OSM,
                details=list(draft.details),
            )
            for sequence, draft in enumerate(ordered, start=1)
        ]
    return result
