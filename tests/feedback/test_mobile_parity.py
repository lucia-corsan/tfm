"""Cross-language golden case for adaptive learning integration."""

import json
from pathlib import Path

import pytest

from backend.domain import PreferenceWeights
from backend.feedback import (
    ComparedRoute,
    PairwiseChoice,
    initialize_learning,
    update_preferences,
)
from backend.scoring import RouteCosts


def test_python_reference_matches_shared_mobile_golden_case() -> None:
    """The versioned fixture must remain identical to the Python reference."""

    fixture_path = (
        Path(__file__).parents[2] / "shared" / "adaptive-preference-golden-case.json"
    )
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    choice = PairwiseChoice(
        chosen=ComparedRoute(
            route_id=fixture["choice"]["chosen"]["route_id"],
            costs=RouteCosts(**fixture["choice"]["chosen"]["costs"]),
        ),
        unchosen=[
            ComparedRoute(
                route_id=route["route_id"],
                costs=RouteCosts(**route["costs"]),
            )
            for route in fixture["choice"]["unchosen"]
        ],
    )
    state = initialize_learning(
        PreferenceWeights(**fixture["declared_weights"]),
        enabled=True,
    )

    for _ in range(fixture["repetitions"]):
        update = update_preferences(state, choice)
        state = update.updated_state

    expected = fixture["expected"]
    assert state.choice_count == expected["choice_count"]
    assert update.status.value == expected["status"]
    assert state.learned_weights.model_dump() == pytest.approx(
        expected["learned_weights"]
    )
    assert state.effective_weights.model_dump() == pytest.approx(
        expected["effective_weights"]
    )
    assert update.mean_choice_probability_before == pytest.approx(
        expected["mean_choice_probability_before"]
    )
    assert update.mean_choice_probability_after == pytest.approx(
        expected["mean_choice_probability_after"]
    )
    assert update.learned_change_l1 == pytest.approx(expected["learned_change_l1"])
    assert update.effective_change_l1 == pytest.approx(
        expected["effective_change_l1"]
    )
