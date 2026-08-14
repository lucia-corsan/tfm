"""Deterministic Spanish templates for pedestrian navigation instructions."""

from collections.abc import Sequence
from typing import Optional

from backend.domain import (
    AccessibilityAttribute,
    EvidenceState,
    NavigationAccessibilityEvent,
    NavigationManeuver,
)

_BASE_TEMPLATES: dict[NavigationManeuver, str] = {
    NavigationManeuver.DEPART: "Empieza el recorrido",
    NavigationManeuver.TURN_LEFT: "Gira a la izquierda",
    NavigationManeuver.TURN_RIGHT: "Gira a la derecha",
    NavigationManeuver.TURN_SHARP_LEFT: "Gira de forma pronunciada a la izquierda",
    NavigationManeuver.TURN_SHARP_RIGHT: "Gira de forma pronunciada a la derecha",
    NavigationManeuver.TURN_SLIGHT_LEFT: "Gira ligeramente a la izquierda",
    NavigationManeuver.TURN_SLIGHT_RIGHT: "Gira ligeramente a la derecha",
    NavigationManeuver.CONTINUE_STRAIGHT: "Continúa recto",
    NavigationManeuver.ENTER_ROUNDABOUT: "Entra en la glorieta",
    NavigationManeuver.EXIT_ROUNDABOUT: "Sal de la glorieta",
    NavigationManeuver.U_TURN: "Cambia de sentido",
    NavigationManeuver.ARRIVE: "Has llegado al destino",
    NavigationManeuver.KEEP_LEFT: "Mantente a la izquierda",
    NavigationManeuver.KEEP_RIGHT: "Mantente a la derecha",
}

_FEMININE_ROAD_TYPES = (
    "avenida ",
    "calle ",
    "carretera ",
    "cuesta ",
    "glorieta ",
    "plaza ",
    "ronda ",
    "travesía ",
)
_MASCULINE_ROAD_TYPES = ("camino ", "paseo ", "puente ")
_INVALID_STREET_REFERENCES = frozenset(
    {
        "-",
        "–",
        "—",
        "n/a",
        "na",
        "none",
        "null",
        "sin nombre",
        "unknown",
        "unnamed",
    }
)
_TURN_MANEUVERS = frozenset(
    {
        NavigationManeuver.TURN_LEFT,
        NavigationManeuver.TURN_RIGHT,
        NavigationManeuver.TURN_SHARP_LEFT,
        NavigationManeuver.TURN_SHARP_RIGHT,
        NavigationManeuver.TURN_SLIGHT_LEFT,
        NavigationManeuver.TURN_SLIGHT_RIGHT,
        NavigationManeuver.U_TURN,
    }
)


def normalize_street_reference(street_name: Optional[str]) -> Optional[str]:
    """Return a usable provider reference or ``None`` for placeholders.

    Args:
        street_name: Optional name received from a routing provider.

    Returns:
        Whitespace-normalized reference, or ``None`` when it is not meaningful.
    """

    if street_name is None:
        return None
    normalized = " ".join(street_name.split())
    if not normalized or normalized.casefold() in _INVALID_STREET_REFERENCES:
        return None
    return normalized


def _spoken_reference(street_name: str) -> tuple[str, bool]:
    """Add a predictable Spanish article to common road names."""

    normalized = " ".join(street_name.split())
    lowercase = normalized.casefold()
    if lowercase.startswith(("el ", "la ", "los ", "las ")):
        return normalized, True
    if lowercase.startswith(_FEMININE_ROAD_TYPES):
        return f"la {normalized}", True
    if lowercase.startswith(_MASCULINE_ROAD_TYPES):
        return f"el {normalized}", True
    return normalized, False


def narrate_maneuver(
    maneuver: NavigationManeuver,
    street_name: Optional[str] = None,
) -> str:
    """Return one reproducible Spanish sentence for a validated maneuver.

    Args:
        maneuver: Provider-neutral movement to communicate.
        street_name: Optional provider-supplied road or place name.

    Returns:
        Complete sentence suitable for screen readers and future TTS.
    """

    base = _BASE_TEMPLATES[maneuver]
    normalized_street = normalize_street_reference(street_name)
    if normalized_street and maneuver is not NavigationManeuver.ARRIVE:
        reference, is_road = _spoken_reference(normalized_street)
        if maneuver is NavigationManeuver.CONTINUE_STRAIGHT:
            connector = "por" if is_road else "hacia"
            return f"{base} {connector} {reference}."
        if maneuver in {NavigationManeuver.KEEP_LEFT, NavigationManeuver.KEEP_RIGHT}:
            connector = "para seguir por" if is_road else "para continuar hacia"
            return f"{base} {connector} {reference}."
        return f"{base} hacia {reference}."
    return f"{base}."


def _format_spoken_distance(distance_m: float) -> str:
    """Return a short distance expression suitable for Spanish speech."""

    rounded = max(round(distance_m), 1)
    return "1 metro" if rounded == 1 else f"{rounded} metros"


def _distance_guidance(
    maneuver: NavigationManeuver,
    distance_m: float,
) -> str:
    """Explain how far the current instruction continues after its action."""

    if maneuver is NavigationManeuver.ARRIVE or distance_m <= 0.0:
        return ""
    prefix = "Después del giro, avanza" if maneuver in _TURN_MANEUVERS else "Avanza"
    return f"{prefix} {_format_spoken_distance(distance_m)}."


def _event_location(event: NavigationAccessibilityEvent) -> str:
    """Describe one event position relative to the current route segment."""

    if event.distance_from_instruction_start_m <= 2.0:
        return "Al comenzar este tramo"
    return (
        "A unos "
        f"{_format_spoken_distance(event.distance_from_instruction_start_m)}"
    )


def _event_object(event: NavigationAccessibilityEvent) -> str:
    """Turn the validated event heading into a concise spoken object."""

    lowered = event.text.casefold()
    if "escalones" in lowered:
        return "un tramo con escalones declarados"
    if "semaforizado" in lowered:
        return "un cruce peatonal semaforizado"
    if "marcado" in lowered:
        return "un paso de peatones marcado"
    if "informal" in lowered or "no habilitado" in lowered:
        return "un cruce informal o no habilitado"
    return "un cruce peatonal"


def _favorable_characteristics(event: NavigationAccessibilityEvent) -> list[str]:
    """Return only explicitly favorable non-visual aids for the short summary."""

    favorable = {
        detail.attribute: detail
        for detail in event.details
        if detail.state is EvidenceState.FAVORABLE
    }
    labels: list[str] = []
    if (
        AccessibilityAttribute.TRAFFIC_SIGNALS in favorable
        and "semaforizado" not in event.text.casefold()
    ):
        labels.append("semáforo")
    assistance = favorable.get(AccessibilityAttribute.AUDIBLE_SIGNALS)
    if assistance is not None:
        assistance_text = assistance.text.casefold()
        if "señal acústica" in assistance_text:
            labels.append("señal acústica")
        if "vibratoria" in assistance_text:
            labels.append("ayuda vibratoria")
    if AccessibilityAttribute.TACTILE_PAVING in favorable:
        labels.append("pavimento podotáctil")
    if AccessibilityAttribute.KERB in favorable:
        labels.append("bordillo rebajado o a nivel")
    if AccessibilityAttribute.RAMP_ACCESS in favorable:
        labels.append("rampa compatible")
    return labels


def _join_spanish(items: list[str]) -> str:
    """Join short labels with Spanish punctuation and conjunction."""

    if len(items) < 2:
        return "".join(items)
    return f"{', '.join(items[:-1])} y {items[-1]}"


def _event_guidance(event: NavigationAccessibilityEvent) -> str:
    """Summarize one positioned event without converting unknown into absence."""

    sentences = [
        f"{_event_location(event)}, los datos sitúan {_event_object(event)}."
    ]
    favorable = _favorable_characteristics(event)
    if favorable:
        sentences.append(
            f"Constan estas características: {_join_spanish(favorable)}."
        )
    unfavorable = [
        detail.text
        for detail in event.details
        if detail.state is EvidenceState.UNFAVORABLE
        and detail.attribute
        not in {
            AccessibilityAttribute.CROSSING_COMPATIBILITY,
            AccessibilityAttribute.STEP_FREE,
        }
    ]
    if unfavorable:
        sentences.append(f"Aviso: {' '.join(unfavorable)}")
    return " ".join(sentences)


def _is_crossing_event(event: NavigationAccessibilityEvent) -> bool:
    """Return whether an event heading describes a mapped crossing."""

    lowered = event.text.casefold()
    return "cruce" in lowered or "paso de peatones" in lowered


def _additional_events_guidance(
    events: list[NavigationAccessibilityEvent],
) -> str:
    """Name and locate remaining events instead of calling them references."""

    distances = [
        _format_spoken_distance(event.distance_from_instruction_start_m)
        for event in events
    ]
    count = len(events)
    is_crossing_group = all(_is_crossing_event(event) for event in events)
    singular = "cruce peatonal" if is_crossing_group else "punto de accesibilidad"
    plural = "cruces peatonales" if is_crossing_group else "puntos de accesibilidad"
    if count == 1:
        return (
            f"Más adelante, los datos sitúan otro {singular}, a unos {distances[0]} "
            "desde el inicio del tramo."
        )
    if count == 2:
        return (
            f"Más adelante, los datos sitúan otros dos {plural}: uno a unos "
            f"{distances[0]} y otro a unos {distances[1]} desde el inicio del tramo."
        )
    return (
        f"Más adelante, los datos sitúan otros {count} {plural}, aproximadamente "
        f"a {_join_spanish(distances)} "
        "desde el inicio del tramo."
    )


def narrate_compound_instruction(
    actions: Sequence[tuple[NavigationManeuver, Optional[str], float]],
    accessibility_events: list[NavigationAccessibilityEvent],
) -> str:
    """Compose several nearby maneuvers as one navigational instruction.

    Args:
        actions: Ordered maneuvers with their street reference and following distance.
        accessibility_events: OSM events relocated to the combined instruction.

    Returns:
        One sequential summary that avoids isolated one-to-nine-metre steps.

    Raises:
        ValueError: If no maneuver is supplied.
    """

    if not actions:
        raise ValueError("a compound instruction requires at least one action")
    if len(actions) == 1:
        maneuver, street_name, distance_m = actions[0]
        return narrate_instruction(
            maneuver,
            street_name,
            distance_m,
            accessibility_events,
        )

    first_maneuver, first_street, _first_distance = actions[0]
    parts = [narrate_maneuver(first_maneuver, first_street)]
    for index, (maneuver, _street_name, distance_m) in enumerate(actions):
        is_last = index == len(actions) - 1
        if is_last:
            if distance_guidance := _distance_guidance(maneuver, distance_m):
                parts.append(distance_guidance)
            break
        next_maneuver, next_street, _next_distance = actions[index + 1]
        next_action = narrate_maneuver(next_maneuver, next_street)
        next_action = next_action[0].lower() + next_action[1:]
        parts.append(
            f"Tras avanzar {_format_spoken_distance(distance_m)}, {next_action}"
        )

    if accessibility_events:
        parts.append(_event_guidance(accessibility_events[0]))
        if remaining_events := accessibility_events[1:]:
            parts.append(_additional_events_guidance(remaining_events))
    return " ".join(parts)


def narrate_instruction(
    maneuver: NavigationManeuver,
    street_name: Optional[str],
    distance_m: float,
    accessibility_events: list[NavigationAccessibilityEvent],
) -> str:
    """Compose action, travelled distance, and nearby verified context.

    Args:
        maneuver: Provider-neutral movement to communicate first.
        street_name: Optional provider reference after normalization.
        distance_m: Length covered after executing the maneuver.
        accessibility_events: Ordered OSM events assigned to this instruction.

    Returns:
        One deterministic operational summary for TalkBack and future TTS.
    """

    parts = [narrate_maneuver(maneuver, street_name)]
    if distance_guidance := _distance_guidance(maneuver, distance_m):
        parts.append(distance_guidance)
    if accessibility_events:
        parts.append(_event_guidance(accessibility_events[0]))
        if remaining_events := accessibility_events[1:]:
            parts.append(_additional_events_guidance(remaining_events))
    return " ".join(parts)
