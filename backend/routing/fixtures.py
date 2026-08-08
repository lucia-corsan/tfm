"""Load deterministic route scenarios used for local development and tests."""

from pathlib import Path

from backend.domain import RouteScenario

_FIXTURE_PATH = Path(__file__).with_name("fixture_data") / "moncloa_principe_pio.json"


def load_pilot_route_scenario() -> RouteScenario:
    """Load the synthetic Moncloa–Príncipe Pío route scenario.

    Returns:
        Validated route alternatives for deterministic local development.
    """

    return RouteScenario.model_validate_json(_FIXTURE_PATH.read_text(encoding="utf-8"))
