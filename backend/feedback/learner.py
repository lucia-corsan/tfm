"""Pure and bounded online learning from explicit route choices."""

import math
from collections.abc import Sequence
from typing import Optional

from backend.domain import PreferenceWeights
from backend.feedback.models import (
    ComparedRoute,
    LearningConfig,
    LearningUpdateStatus,
    PairwiseChoice,
    PreferenceLearningState,
    PreferenceUpdate,
    WeightChange,
)
from backend.scoring import (
    NormalizedWeights,
    RouteCosts,
    RouteRanking,
    ScoringDimension,
    normalize_weights,
)

PREFERENCE_DIMENSIONS: tuple[str, ...] = tuple(
    dimension.value for dimension in ScoringDimension
)


def _as_vector(values: PreferenceWeights) -> list[float]:
    """Return preference values in one stable, documented order."""

    payload = values.model_dump()
    return [payload[name] for name in PREFERENCE_DIMENSIONS]


def _cost_vector(costs: RouteCosts) -> list[float]:
    """Return route costs in the same order as preference values."""

    payload = costs.model_dump()
    return [payload[name] for name in PREFERENCE_DIMENSIONS]


def _normalized_weights(values: Sequence[float]) -> NormalizedWeights:
    """Build validated normalized weights from an ordered vector."""

    total = sum(values)
    if total <= 0.0:
        raise ValueError("at least one projected weight must be positive")
    normalized = [max(value, 0.0) / total for value in values]
    return NormalizedWeights(**dict(zip(PREFERENCE_DIMENSIONS, normalized)))


def _project_to_simplex(values: Sequence[float]) -> list[float]:
    """Project arbitrary values onto the non-negative unit simplex."""

    if not values:
        raise ValueError("cannot project an empty vector")
    ordered = sorted(values, reverse=True)
    cumulative = 0.0
    threshold_index = 0
    threshold = 0.0
    for index, value in enumerate(ordered, start=1):
        cumulative += value
        candidate = (cumulative - 1.0) / index
        if value - candidate > 0.0:
            threshold_index = index
            threshold = candidate
    if threshold_index == 0:
        return [1.0 / len(values)] * len(values)
    projected = [max(value - threshold, 0.0) for value in values]
    total = sum(projected)
    return [value / total for value in projected]


def _sigmoid(value: float) -> float:
    """Return a numerically stable logistic probability."""

    if value >= 0.0:
        negative_exp = math.exp(-value)
        return 1.0 / (1.0 + negative_exp)
    positive_exp = math.exp(value)
    return positive_exp / (1.0 + positive_exp)


def _logistic_loss(margin: float) -> float:
    """Return the stable negative log-likelihood for a chosen route."""

    if margin >= 0.0:
        return math.log1p(math.exp(-margin))
    return -margin + math.log1p(math.exp(margin))


def effective_influence(
    config: LearningConfig,
    choice_count: int,
    enabled: bool = True,
) -> float:
    """Calculate how much learned weights may influence the next ranking.

    Args:
        config: Validated observation, growth, and cap parameters.
        choice_count: Number of explicit choices observed so far.
        enabled: Whether adaptive learning is currently enabled.

    Returns:
        Mixing coefficient between zero and the configured maximum.
    """

    if not enabled or choice_count <= config.observation_choices:
        return 0.0
    return min(
        config.maximum_influence,
        (choice_count - config.observation_choices) * config.influence_step,
    )


def _mix_effective_weights(
    declared: NormalizedWeights,
    learned: NormalizedWeights,
    influence: float,
) -> NormalizedWeights:
    """Combine declared and learned preferences without mutating either."""

    if influence <= 0.0:
        return declared
    declared_vector = _as_vector(declared)
    learned_vector = _as_vector(learned)
    mixed = [
        (1.0 - influence) * declared_value + influence * learned_value
        for declared_value, learned_value in zip(declared_vector, learned_vector)
    ]
    return _normalized_weights(mixed)


def initialize_learning(
    declared_weights: PreferenceWeights,
    config: Optional[LearningConfig] = None,
    enabled: bool = False,
) -> PreferenceLearningState:
    """Create a local learner anchored to declared preferences.

    Args:
        declared_weights: Initial user priorities before normalization.
        config: Bounded learning hyperparameters, or defaults when omitted.
        enabled: Whether future choices may affect recommendations. It defaults
            to false so that adaptation always requires explicit activation.

    Returns:
        A validated state with no observed choices.
    """

    resolved_config = config or LearningConfig()
    declared = normalize_weights(declared_weights)
    return PreferenceLearningState(
        declared_weights=declared,
        learned_weights=declared,
        effective_weights=declared,
        choice_count=0,
        enabled=enabled,
        config=resolved_config,
    )


def build_pairwise_choice(
    ranking: RouteRanking,
    chosen_route_id: str,
) -> PairwiseChoice:
    """Build learning input only from accepted routes in one shown ranking.

    Args:
        ranking: Complete result whose ``routes`` already passed every critical
            constraint and were eligible to be shown together.
        chosen_route_id: Identifier explicitly selected by the person.

    Returns:
        A validated comparison containing the chosen route and every accepted
        alternative that was not selected.

    Raises:
        ValueError: If fewer than two routes were accepted or the selected
            identifier was not part of the accepted ranking.
    """

    if len(ranking.routes) < 2:
        raise ValueError("learning requires at least two accepted routes")
    accepted = {route.route_id: route for route in ranking.routes}
    if chosen_route_id not in accepted:
        raise ValueError("chosen route must belong to the accepted ranking")
    chosen = accepted[chosen_route_id]
    return PairwiseChoice(
        chosen=ComparedRoute(route_id=chosen.route_id, costs=chosen.score.costs),
        unchosen=[
            ComparedRoute(route_id=route.route_id, costs=route.score.costs)
            for route in ranking.routes
            if route.route_id != chosen_route_id
        ],
    )


def preference_cost(weights: PreferenceWeights, costs: RouteCosts) -> float:
    """Calculate the weighted cost used to compare one route.

    Args:
        weights: Non-negative preference weights.
        costs: Normalized route costs, where lower is preferable.

    Returns:
        Weighted route cost between zero and one.
    """

    normalized = normalize_weights(weights)
    return sum(
        weight * cost
        for weight, cost in zip(_as_vector(normalized), _cost_vector(costs))
    )


def pairwise_choice_probability(
    weights: PreferenceWeights,
    chosen_costs: RouteCosts,
    unchosen_costs: RouteCosts,
    inverse_temperature: float,
) -> float:
    """Estimate the probability of preferring the chosen lower-cost route.

    Args:
        weights: Current preference weights.
        chosen_costs: Costs of the explicitly selected route.
        unchosen_costs: Costs of one accepted alternative not selected.
        inverse_temperature: Sensitivity of probability to cost differences.

    Returns:
        Bradley--Terry/logistic probability assigned to the observed choice.
    """

    if inverse_temperature <= 0.0:
        raise ValueError("inverse temperature must be positive")
    normalized = normalize_weights(weights)
    delta = [
        unchosen - chosen
        for chosen, unchosen in zip(
            _cost_vector(chosen_costs),
            _cost_vector(unchosen_costs),
        )
    ]
    margin = inverse_temperature * sum(
        weight * difference for weight, difference in zip(_as_vector(normalized), delta)
    )
    return _sigmoid(margin)


def _choice_statistics(
    weights: NormalizedWeights,
    choice: PairwiseChoice,
    inverse_temperature: float,
) -> tuple[float, float]:
    """Return mean probability and loss across accepted unchosen alternatives."""

    probabilities: list[float] = []
    losses: list[float] = []
    weight_vector = _as_vector(weights)
    chosen = _cost_vector(choice.chosen.costs)
    for alternative in choice.unchosen:
        delta = [
            unchosen - selected
            for selected, unchosen in zip(chosen, _cost_vector(alternative.costs))
        ]
        margin = inverse_temperature * sum(
            weight * difference for weight, difference in zip(weight_vector, delta)
        )
        probabilities.append(_sigmoid(margin))
        losses.append(_logistic_loss(margin))
    return sum(probabilities) / len(probabilities), sum(losses) / len(losses)


def update_preferences(
    state: PreferenceLearningState,
    choice: PairwiseChoice,
) -> PreferenceUpdate:
    """Apply one bounded online update from an explicit route choice.

    The chosen route is compared with every accepted alternative that was shown.
    Their gradients are averaged, so seeing two unchosen routes does not double
    the maximum influence of one user interaction.

    Args:
        state: Current declared, learned, and effective weights.
        choice: Explicit selection and the accepted alternatives not chosen.

    Returns:
        New validated state plus auditable learning diagnostics.
    """

    config = state.config
    probability_before, loss_before = _choice_statistics(
        state.learned_weights,
        choice,
        config.inverse_temperature,
    )
    if not state.enabled:
        changes = _build_changes(state, state)
        return PreferenceUpdate(
            status=LearningUpdateStatus.DISABLED,
            previous_state=state,
            updated_state=state,
            pairs_used=0,
            mean_choice_probability_before=probability_before,
            mean_choice_probability_after=probability_before,
            mean_pairwise_logistic_loss_before=loss_before,
            mean_pairwise_logistic_loss_after=loss_before,
            learned_change_l1=0.0,
            effective_change_l1=0.0,
            changes=changes,
        )

    learned_before = _as_vector(state.learned_weights)
    declared = _as_vector(state.declared_weights)
    chosen = _cost_vector(choice.chosen.costs)
    gradient = [0.0] * len(PREFERENCE_DIMENSIONS)

    for alternative in choice.unchosen:
        delta = [
            unchosen - selected
            for selected, unchosen in zip(chosen, _cost_vector(alternative.costs))
        ]
        margin = config.inverse_temperature * sum(
            weight * difference for weight, difference in zip(learned_before, delta)
        )
        probability = _sigmoid(margin)
        for index, difference in enumerate(delta):
            gradient[index] += (probability - 1.0) * config.inverse_temperature * difference

    pair_count = len(choice.unchosen)
    gradient = [value / pair_count for value in gradient]
    gradient = [
        value
        + config.regularization_strength * (learned_before[index] - declared[index])
        for index, value in enumerate(gradient)
    ]
    unprojected = [
        value - config.learning_rate * gradient[index]
        for index, value in enumerate(learned_before)
    ]
    projected = _project_to_simplex(unprojected)

    proposed_change = sum(
        abs(after - before) for before, after in zip(learned_before, projected)
    )
    if proposed_change > config.maximum_learned_update_l1:
        fraction = config.maximum_learned_update_l1 / proposed_change
        projected = [
            before + fraction * (after - before)
            for before, after in zip(learned_before, projected)
        ]

    learned_after = _normalized_weights(projected)
    choice_count = state.choice_count + 1
    influence = effective_influence(config, choice_count, enabled=True)
    effective_after = _mix_effective_weights(
        state.declared_weights,
        learned_after,
        influence,
    )
    updated_state = PreferenceLearningState(
        declared_weights=state.declared_weights,
        learned_weights=learned_after,
        effective_weights=effective_after,
        choice_count=choice_count,
        enabled=True,
        config=config,
    )
    probability_after, loss_after = _choice_statistics(
        learned_after,
        choice,
        config.inverse_temperature,
    )
    learned_change = sum(
        abs(after - before)
        for before, after in zip(learned_before, _as_vector(learned_after))
    )
    effective_change = sum(
        abs(after - before)
        for before, after in zip(
            _as_vector(state.effective_weights),
            _as_vector(effective_after),
        )
    )
    status = (
        LearningUpdateStatus.OBSERVATION
        if choice_count <= config.observation_choices
        else LearningUpdateStatus.INFLUENTIAL
    )
    return PreferenceUpdate(
        status=status,
        previous_state=state,
        updated_state=updated_state,
        pairs_used=pair_count,
        mean_choice_probability_before=probability_before,
        mean_choice_probability_after=probability_after,
        mean_pairwise_logistic_loss_before=loss_before,
        mean_pairwise_logistic_loss_after=loss_after,
        learned_change_l1=learned_change,
        effective_change_l1=effective_change,
        changes=_build_changes(state, updated_state),
    )


def set_learning_enabled(
    state: PreferenceLearningState,
    enabled: bool,
) -> PreferenceLearningState:
    """Enable or disable learned influence without deleting prior observations.

    Args:
        state: Current local learning state.
        enabled: Desired learning setting.

    Returns:
        State whose effective weights respect the desired setting.
    """

    influence = effective_influence(state.config, state.choice_count, enabled)
    effective = _mix_effective_weights(
        state.declared_weights,
        state.learned_weights,
        influence,
    )
    return PreferenceLearningState(
        declared_weights=state.declared_weights,
        learned_weights=state.learned_weights,
        effective_weights=effective,
        choice_count=state.choice_count,
        enabled=enabled,
        config=state.config,
    )


def reset_learning(state: PreferenceLearningState) -> PreferenceLearningState:
    """Forget observations and restore declared preferences exactly.

    Args:
        state: Current local learning state.

    Returns:
        State with zero observations and declared weights in every layer.
    """

    return PreferenceLearningState(
        declared_weights=state.declared_weights,
        learned_weights=state.declared_weights,
        effective_weights=state.declared_weights,
        choice_count=0,
        enabled=state.enabled,
        config=state.config,
    )


def _build_changes(
    previous: PreferenceLearningState,
    updated: PreferenceLearningState,
) -> list[WeightChange]:
    """Create one traceable change record per preference dimension."""

    learned_before = previous.learned_weights.model_dump()
    learned_after = updated.learned_weights.model_dump()
    effective_before = previous.effective_weights.model_dump()
    effective_after = updated.effective_weights.model_dump()
    return [
        WeightChange(
            dimension=ScoringDimension(name),
            learned_before=learned_before[name],
            learned_after=learned_after[name],
            effective_before=effective_before[name],
            effective_after=effective_after[name],
        )
        for name in PREFERENCE_DIMENSIONS
    ]
