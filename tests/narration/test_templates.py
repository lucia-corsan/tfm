"""Tests for deterministic Spanish navigation templates."""

import pytest

from backend.domain import (
    AccessibilityAttribute,
    DataSource,
    EvidenceState,
    NavigationAccessibilityDetail,
    NavigationAccessibilityEvent,
    NavigationManeuver,
)
from backend.narration import (
    narrate_instruction,
    narrate_maneuver,
    normalize_street_reference,
)


@pytest.mark.parametrize(
    ("maneuver", "expected"),
    [
        (NavigationManeuver.DEPART, "Empieza el recorrido."),
        (NavigationManeuver.TURN_LEFT, "Gira a la izquierda."),
        (NavigationManeuver.TURN_RIGHT, "Gira a la derecha."),
        (
            NavigationManeuver.TURN_SHARP_LEFT,
            "Gira de forma pronunciada a la izquierda.",
        ),
        (
            NavigationManeuver.TURN_SHARP_RIGHT,
            "Gira de forma pronunciada a la derecha.",
        ),
        (
            NavigationManeuver.TURN_SLIGHT_LEFT,
            "Gira ligeramente a la izquierda.",
        ),
        (
            NavigationManeuver.TURN_SLIGHT_RIGHT,
            "Gira ligeramente a la derecha.",
        ),
        (NavigationManeuver.CONTINUE_STRAIGHT, "Continúa recto."),
        (NavigationManeuver.ENTER_ROUNDABOUT, "Entra en la glorieta."),
        (NavigationManeuver.EXIT_ROUNDABOUT, "Sal de la glorieta."),
        (NavigationManeuver.U_TURN, "Cambia de sentido."),
        (NavigationManeuver.ARRIVE, "Has llegado al destino."),
        (NavigationManeuver.KEEP_LEFT, "Mantente a la izquierda."),
        (NavigationManeuver.KEEP_RIGHT, "Mantente a la derecha."),
    ],
)
def test_every_maneuver_has_a_complete_spanish_sentence(
    maneuver: NavigationManeuver,
    expected: str,
) -> None:
    """Every documented ORS maneuver maps to explicit reproducible wording."""

    assert narrate_maneuver(maneuver) == expected


@pytest.mark.parametrize(
    ("maneuver", "street_name", "expected"),
    [
        (
            NavigationManeuver.TURN_LEFT,
            "  calle de Ferraz  ",
            "Gira a la izquierda hacia la calle de Ferraz.",
        ),
        (
            NavigationManeuver.CONTINUE_STRAIGHT,
            "paseo del Rey",
            "Continúa recto por el paseo del Rey.",
        ),
        (
            NavigationManeuver.KEEP_RIGHT,
            "avenida de la Memoria",
            "Mantente a la derecha para seguir por la avenida de la Memoria.",
        ),
        (
            NavigationManeuver.KEEP_LEFT,
            "Príncipe Pío",
            "Mantente a la izquierda para continuar hacia Príncipe Pío.",
        ),
    ],
)
def test_references_use_predictable_natural_spanish(
    maneuver: NavigationManeuver,
    street_name: str,
    expected: str,
) -> None:
    """Road names gain only the article and connector required by Spanish."""

    assert narrate_maneuver(maneuver, street_name) == expected


def test_arrival_does_not_append_a_provider_street_name() -> None:
    """The final instruction remains unambiguous even if ORS supplies a name."""

    assert (
        narrate_maneuver(NavigationManeuver.ARRIVE, "Príncipe Pío")
        == "Has llegado al destino."
    )


@pytest.mark.parametrize(
    "placeholder",
    ["", "  ", "-", "–", "—", "N/A", "unknown", "unnamed", "sin nombre"],
)
def test_provider_placeholders_are_not_spoken_or_exposed(placeholder: str) -> None:
    """Common missing-name markers cannot become navigation references."""

    assert normalize_street_reference(placeholder) is None
    assert (
        narrate_maneuver(NavigationManeuver.TURN_RIGHT, placeholder)
        == "Gira a la derecha."
    )


def test_valid_reference_collapses_repeated_whitespace() -> None:
    """A real provider name keeps its words while normalizing whitespace."""

    assert normalize_street_reference("  calle   de Ferraz ") == "calle de Ferraz"


def test_operational_summary_combines_turn_distance_and_non_visual_landmark() -> None:
    """A blind pedestrian receives one actionable summary before the details."""

    event = NavigationAccessibilityEvent(
        sequence=1,
        distance_from_instruction_start_m=0.0,
        text="Cruce peatonal cartografiado próximo.",
        source=DataSource.OSM,
        details=[
            NavigationAccessibilityDetail(
                attribute=AccessibilityAttribute.CROSSING_COMPATIBILITY,
                state=EvidenceState.UNKNOWN,
                text="OSM no permite confirmar el tipo de cruce.",
            ),
            NavigationAccessibilityDetail(
                attribute=AccessibilityAttribute.TRAFFIC_SIGNALS,
                state=EvidenceState.FAVORABLE,
                text="OSM declara semáforo asociado al cruce.",
            ),
            NavigationAccessibilityDetail(
                attribute=AccessibilityAttribute.AUDIBLE_SIGNALS,
                state=EvidenceState.FAVORABLE,
                text="OSM declara señal acústica en el cruce.",
            ),
        ],
    )

    assert narrate_instruction(
        NavigationManeuver.TURN_RIGHT,
        None,
        34.0,
        [event],
    ) == (
        "Gira a la derecha. Después del giro, avanza 34 metros. "
        "Al comenzar este tramo, los datos sitúan un cruce peatonal. "
        "Constan estas características: semáforo y señal acústica."
    )


def test_operational_summary_does_not_promise_unknown_or_live_conditions() -> None:
    """Missing OSM tags stay in details and cannot become spoken promises."""

    event = NavigationAccessibilityEvent(
        sequence=1,
        distance_from_instruction_start_m=28.0,
        text="Paso de peatones marcado próximo.",
        source=DataSource.OSM,
        details=[
            NavigationAccessibilityDetail(
                attribute=AccessibilityAttribute.AUDIBLE_SIGNALS,
                state=EvidenceState.UNKNOWN,
                text="OSM no permite confirmar señal acústica ni vibración.",
            )
        ],
    )

    summary = narrate_instruction(
        NavigationManeuver.CONTINUE_STRAIGHT,
        "calle de Ferraz",
        50.0,
        [event],
    )

    assert summary == (
        "Continúa recto por la calle de Ferraz. Avanza 50 metros. "
        "A unos 28 metros, los datos sitúan un paso de peatones marcado."
    )
    assert "escucharás" not in summary
    assert "señal acústica" not in summary


def test_operational_summary_names_and_locates_additional_crossings() -> None:
    """Several crossings are not hidden behind an ambiguous reference count."""

    def crossing(sequence: int, distance_m: float) -> NavigationAccessibilityEvent:
        return NavigationAccessibilityEvent(
            sequence=sequence,
            distance_from_instruction_start_m=distance_m,
            text="Cruce peatonal semaforizado próximo.",
            source=DataSource.OSM,
            details=[
                NavigationAccessibilityDetail(
                    attribute=AccessibilityAttribute.TRAFFIC_SIGNALS,
                    state=EvidenceState.FAVORABLE,
                    text="OSM declara semáforo asociado al cruce.",
                )
            ],
        )

    summary = narrate_instruction(
        NavigationManeuver.TURN_RIGHT,
        None,
        23.0,
        [crossing(1, 6.0), crossing(2, 11.0), crossing(3, 15.9)],
    )

    assert summary.endswith(
        "Más adelante, los datos sitúan otros dos cruces peatonales: uno a unos "
        "11 metros y otro a unos 16 metros desde el inicio del tramo."
    )
    assert "referencias adicionales" not in summary
