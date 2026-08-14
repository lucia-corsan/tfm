"""Load deterministic route scenarios used for local development and tests."""

from pathlib import Path

from backend.domain import RouteScenario
from backend.narration import narrate_instruction, normalize_street_reference

_FIXTURE_PATH = Path(__file__).with_name("fixture_data") / "moncloa_principe_pio.json"


def load_pilot_route_scenario() -> RouteScenario:
    """Load the synthetic Moncloa–Príncipe Pío route scenario.

    Returns:
        Validated route alternatives for deterministic local development.
    """

    scenario = RouteScenario.model_validate_json(_FIXTURE_PATH.read_text(encoding="utf-8"))
    routes = [
        route.model_copy(
            update={
                "instructions": [
                    instruction.model_copy(
                        update={
                            "text": narrate_instruction(
                                instruction.maneuver,
                                normalize_street_reference(
                                    instruction.street_name
                                ),
                                instruction.distance_m,
                                instruction.accessibility_events,
                            ),
                            "street_name": normalize_street_reference(
                                instruction.street_name
                            ),
                        }
                    )
                    for instruction in route.instructions
                ]
            }
        )
        for route in scenario.routes
    ]
    return scenario.model_copy(update={"routes": routes})
