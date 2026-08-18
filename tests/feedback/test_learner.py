"""Tests for bounded online learning from explicit route choices."""

import pytest

from backend.domain import MobilityProfile, PreferenceWeights
from backend.feedback import (
    ComparedRoute,
    LearningConfig,
    LearningUpdateStatus,
    PairwiseChoice,
    build_pairwise_choice,
    effective_influence,
    initialize_learning,
    pairwise_choice_probability,
    reset_learning,
    set_learning_enabled,
    update_preferences,
)
from backend.routing.fixtures import load_pilot_route_scenario
from backend.scoring import ConstraintCode, RouteCosts, rank_routes


def _costs(**overrides: float) -> RouteCosts:
    """Create a complete cost vector with neutral defaults."""

    values = {name: 0.5 for name in RouteCosts.model_fields}
    values.update(overrides)
    return RouteCosts(**values)


def _choice(
    chosen_costs: RouteCosts,
    *unchosen_costs: RouteCosts,
) -> PairwiseChoice:
    """Create one explicit choice with unique synthetic identifiers."""

    return PairwiseChoice(
        chosen=ComparedRoute(route_id="chosen", costs=chosen_costs),
        unchosen=[
            ComparedRoute(route_id=f"alternative_{index}", costs=costs)
            for index, costs in enumerate(unchosen_costs, start=1)
        ],
    )


def test_probability_uses_lower_cost_as_the_preferred_direction() -> None:
    """The sign convention must favor the selected lower-cost alternative."""

    weights = PreferenceWeights(
        distance=1.0,
        complex_crossings=0.0,
        crossing_support=0.0,
        sidewalk_evidence=0.0,
        steps=0.0,
        surface=0.0,
        orientation_complexity=0.0,
        slope=0.0,
        uncertainty=0.0,
    )

    probability = pairwise_choice_probability(
        weights,
        _costs(distance=0.1),
        _costs(distance=0.9),
        inverse_temperature=6.0,
    )

    assert probability > 0.99


def test_first_three_choices_learn_internally_without_changing_ranking() -> None:
    """Observation collects evidence while effective weights remain declared."""

    state = initialize_learning(PreferenceWeights(), enabled=True)
    choice = _choice(_costs(distance=0.1), _costs(distance=0.9))

    for expected_count in range(1, 4):
        result = update_preferences(state, choice)
        state = result.updated_state
        assert result.status is LearningUpdateStatus.OBSERVATION
        assert state.choice_count == expected_count
        assert state.effective_weights == state.declared_weights

    assert state.learned_weights.distance > state.declared_weights.distance


def test_fourth_choice_starts_bounded_adaptive_influence() -> None:
    """The first post-observation choice affects ranking but remains capped."""

    config = LearningConfig(maximum_learned_update_l1=0.05)
    state = initialize_learning(PreferenceWeights(), config=config, enabled=True)
    choice = _choice(_costs(distance=0.0), _costs(distance=1.0))

    for _ in range(4):
        result = update_preferences(state, choice)
        state = result.updated_state

    assert result.status is LearningUpdateStatus.INFLUENTIAL
    assert effective_influence(config, state.choice_count) == pytest.approx(0.1)
    assert result.learned_change_l1 <= config.maximum_learned_update_l1 + 1e-12
    assert result.effective_change_l1 > 0.0
    assert state.effective_weights.distance > state.declared_weights.distance


def test_weights_stay_non_negative_normalized_and_stable_after_many_updates() -> None:
    """Projection and step limits must hold over a long interaction sequence."""

    config = LearningConfig(maximum_learned_update_l1=0.04)
    state = initialize_learning(PreferenceWeights(), config=config, enabled=True)
    choices = [
        _choice(
            _costs(distance=0.1, uncertainty=0.7),
            _costs(distance=0.8, uncertainty=0.2),
            _costs(distance=0.6, uncertainty=0.4),
        ),
        _choice(
            _costs(complex_crossings=0.1, crossing_support=0.2),
            _costs(complex_crossings=0.9, crossing_support=0.8),
        ),
    ]

    for index in range(500):
        result = update_preferences(state, choices[index % len(choices)])
        state = result.updated_state
        assert result.learned_change_l1 <= config.maximum_learned_update_l1 + 1e-12
        for weights in (state.learned_weights, state.effective_weights):
            values = list(weights.model_dump().values())
            assert min(values) >= 0.0
            assert sum(values) == pytest.approx(1.0)

    assert effective_influence(config, state.choice_count) == 0.5


def test_duplicate_unchosen_evidence_does_not_double_the_update() -> None:
    """Averaging pairs makes one interaction independent of alternative count."""

    state = initialize_learning(
        PreferenceWeights(),
        config=LearningConfig(maximum_learned_update_l1=0.5),
        enabled=True,
    )
    chosen = _costs(distance=0.1)
    unchosen = _costs(distance=0.9)

    single = update_preferences(state, _choice(chosen, unchosen))
    duplicate = update_preferences(state, _choice(chosen, unchosen, unchosen))

    assert duplicate.updated_state.learned_weights == single.updated_state.learned_weights
    assert duplicate.learned_change_l1 == pytest.approx(single.learned_change_l1)


def test_identical_costs_do_not_invent_a_preference() -> None:
    """A comparison without feature differences leaves weights unchanged."""

    state = initialize_learning(PreferenceWeights(), enabled=True)
    identical = _costs()

    result = update_preferences(state, _choice(identical, identical))

    assert result.updated_state.learned_weights == state.learned_weights
    assert result.learned_change_l1 == pytest.approx(0.0)


def test_disabling_and_resetting_restore_declared_effective_preferences() -> None:
    """Users can pause influence and erase all learned changes."""

    state = initialize_learning(PreferenceWeights(), enabled=True)
    choice = _choice(_costs(distance=0.1), _costs(distance=0.9))
    for _ in range(6):
        state = update_preferences(state, choice).updated_state

    disabled = set_learning_enabled(state, False)
    ignored = update_preferences(disabled, choice)
    reenabled = set_learning_enabled(disabled, True)
    reset = reset_learning(reenabled)

    assert disabled.effective_weights == disabled.declared_weights
    assert ignored.status is LearningUpdateStatus.DISABLED
    assert ignored.updated_state == disabled
    assert reenabled.effective_weights != reenabled.declared_weights
    assert reset.choice_count == 0
    assert reset.learned_weights == reset.declared_weights
    assert reset.effective_weights == reset.declared_weights


def test_adapted_weights_never_override_critical_constraints() -> None:
    """Learning may reorder accepted routes but cannot admit a forbidden one."""

    scenario = load_pilot_route_scenario()
    profile = MobilityProfile(profile_id="adaptive_safety")
    distance_only = PreferenceWeights(
        distance=1.0,
        complex_crossings=0.0,
        crossing_support=0.0,
        sidewalk_evidence=0.0,
        steps=0.0,
        surface=0.0,
        orientation_complexity=0.0,
        slope=0.0,
        uncertainty=0.0,
    )

    result = rank_routes(profile, scenario.routes, effective_weights=distance_only)

    assert [route.route_id for route in result.rejected_routes] == ["simple_route"]
    assert result.rejected_routes[0].violations[0].code is (
        ConstraintCode.INCOMPATIBLE_CROSSINGS
    )


def test_learning_choice_is_built_only_from_accepted_shown_routes() -> None:
    """The integration helper must exclude every critically rejected route."""

    scenario = load_pilot_route_scenario()
    ranking = rank_routes(MobilityProfile(profile_id="choice_source"), scenario.routes)
    chosen_id = ranking.routes[0].route_id

    choice = build_pairwise_choice(ranking, chosen_id)
    compared_ids = {choice.chosen.route_id}
    compared_ids.update(route.route_id for route in choice.unchosen)

    assert compared_ids == {route.route_id for route in ranking.routes}
    assert compared_ids.isdisjoint(
        route.route_id for route in ranking.rejected_routes
    )
    with pytest.raises(ValueError, match="accepted ranking"):
        build_pairwise_choice(ranking, ranking.rejected_routes[0].route_id)


def test_unknown_cost_remains_a_cost_under_adaptive_weights() -> None:
    """Learning cannot turn greater uncertainty into a positive feature."""

    state = initialize_learning(PreferenceWeights(), enabled=True)
    lower_unknown = _costs(uncertainty=0.1)
    higher_unknown = _costs(uncertainty=0.9)
    choice = _choice(lower_unknown, higher_unknown)

    for _ in range(8):
        state = update_preferences(state, choice).updated_state

    assert state.learned_weights.uncertainty > state.declared_weights.uncertainty
    low_cost = sum(
        state.effective_weights.model_dump()[name]
        * lower_unknown.model_dump()[name]
        for name in RouteCosts.model_fields
    )
    high_cost = sum(
        state.effective_weights.model_dump()[name]
        * higher_unknown.model_dump()[name]
        for name in RouteCosts.model_fields
    )
    assert low_cost < high_cost


def test_update_is_deterministic_and_serializable() -> None:
    """Equal inputs produce byte-equivalent structured results."""

    state = initialize_learning(PreferenceWeights(), enabled=True)
    choice = _choice(_costs(slope=0.2), _costs(slope=0.8))

    first = update_preferences(state, choice).model_dump_json()
    second = update_preferences(state, choice).model_dump_json()

    assert first == second
