"""Tests for validated adaptive-learning data structures."""

import pytest
from pydantic import ValidationError

from backend.domain import PreferenceWeights
from backend.feedback import (
    ComparedRoute,
    LearningConfig,
    PairwiseChoice,
    PreferenceLearningState,
    initialize_learning,
)
from backend.scoring import RouteCosts


def _costs(**overrides: float) -> RouteCosts:
    """Create a complete normalized cost vector."""

    values = {name: 0.5 for name in RouteCosts.model_fields}
    values.update(overrides)
    return RouteCosts(**values)


def test_pairwise_choice_rejects_repeated_route_identifiers() -> None:
    """A route cannot be compared with itself or appear twice."""

    route = ComparedRoute(route_id="same", costs=_costs())

    with pytest.raises(ValidationError, match="unique route identifiers"):
        PairwiseChoice(chosen=route, unchosen=[route])


def test_pairwise_choice_accepts_at_most_two_unchosen_routes() -> None:
    """The MVP shows at most three accepted routes in one comparison."""

    chosen = ComparedRoute(route_id="chosen", costs=_costs())
    alternatives = [
        ComparedRoute(route_id=f"alternative_{index}", costs=_costs())
        for index in range(3)
    ]

    with pytest.raises(ValidationError, match="at most 2"):
        PairwiseChoice(chosen=chosen, unchosen=alternatives)


def test_learning_configuration_caps_adaptive_influence_at_one_half() -> None:
    """Configuration cannot let learned preferences dominate declarations."""

    with pytest.raises(ValidationError):
        LearningConfig(maximum_influence=0.51)


def test_learning_requires_explicit_activation() -> None:
    """A new local learner must not adapt until the person opts in."""

    inactive = initialize_learning(PreferenceWeights())
    active = initialize_learning(PreferenceWeights(), enabled=True)

    assert inactive.enabled is False
    assert inactive.effective_weights == inactive.declared_weights
    assert active.enabled is True


def test_state_rejects_effective_weights_that_do_not_match_schedule() -> None:
    """Stored state cannot silently replace the documented weight mixture."""

    state = initialize_learning(PreferenceWeights())
    distance_only = state.declared_weights.model_copy(
        update={
            name: 1.0 if name == "distance" else 0.0
            for name in state.declared_weights.model_fields
        }
    )

    with pytest.raises(ValidationError, match="learning schedule"):
        PreferenceLearningState(
            declared_weights=state.declared_weights,
            learned_weights=state.learned_weights,
            effective_weights=distance_only,
            choice_count=0,
            enabled=True,
            config=state.config,
        )


def test_learning_models_reject_undocumented_fields() -> None:
    """Feedback records cannot accept accidental personal or location data."""

    with pytest.raises(ValidationError, match="extra"):
        ComparedRoute.model_validate(
            {
                "route_id": "route_a",
                "costs": _costs().model_dump(),
                "coordinates": [40.4, -3.7],
            }
        )
