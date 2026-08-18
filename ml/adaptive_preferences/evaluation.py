"""Reproducible calibration and evaluation of adaptive route preferences."""

import csv
import logging
import math
import random
import statistics
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from itertools import product
from pathlib import Path
from typing import Optional

from backend.domain import PreferenceWeights
from backend.feedback import (
    PREFERENCE_DIMENSIONS,
    ComparedRoute,
    LearningConfig,
    PairwiseChoice,
    PreferenceLearningState,
    initialize_learning,
    update_preferences,
)
from backend.scoring import NormalizedWeights, RouteCosts, normalize_weights

LOGGER = logging.getLogger(__name__)

TRAINING_CHOICES = 60
EVALUATION_SETS = 160
CHECKPOINTS = (0, 3, 5, 10, 20, 40, 60)
CALIBRATION_SEEDS = (2026081701, 2026081702, 2026081703)
EVALUATION_SEEDS = tuple(range(2026081801, 2026081821))
NOISE_LEVELS = (0.0, 0.10, 0.20)
CALIBRATION_NOISE = 0.10
STABILITY_TOLERANCE = 0.02
DEFAULT_DECLARATION_SIGNAL = 0.25
DECLARATION_SIGNALS = (0.0, 0.25, 0.50, 0.75, 1.0)
CALIBRATION_PROFILE_IDS = {
    "distance_priority",
    "crossing_support_priority",
    "orientation_priority",
}

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = REPOSITORY_ROOT / "docs" / "evaluation" / "artifacts"
FIGURES_DIR = REPOSITORY_ROOT / "docs" / "figures"

MODEL_LABELS = {
    "shortest": "Ruta más corta",
    "fixed": "Pesos declarados fijos",
    "adaptive": "Clasificación adaptativa",
}


@dataclass(frozen=True)
class SyntheticProfile:
    """Known latent preferences and deliberately incomplete declarations."""

    profile_id: str
    name: str
    true_weights: NormalizedWeights
    declared_weights: NormalizedWeights


@dataclass(frozen=True)
class CurvePoint:
    """Metrics from one model at one learning checkpoint."""

    profile_id: str
    seed: int
    noise: float
    choice_count: int
    model: str
    top1_accuracy: float
    pairwise_accuracy: float
    mean_regret: float
    cumulative_training_regret: float


@dataclass(frozen=True)
class SimulationResult:
    """Complete result of one profile, seed, noise, and configuration."""

    curve: tuple[CurvePoint, ...]
    final_state: PreferenceLearningState
    true_weights: NormalizedWeights
    maximum_learned_jump_l1: float
    maximum_effective_jump_l1: float
    first_near_final_checkpoint: Optional[int]


def _weights(values: Sequence[float]) -> NormalizedWeights:
    """Create normalized weights in the documented dimension order."""

    return normalize_weights(PreferenceWeights(**dict(zip(PREFERENCE_DIMENSIONS, values))))


def _partially_declared(
    true_weights: NormalizedWeights,
    declared_signal: float,
) -> NormalizedWeights:
    """Blend latent preferences with a coarse initial questionnaire result."""

    if not 0.0 <= declared_signal <= 1.0:
        raise ValueError("declared signal must be between zero and one")
    uniform = 1.0 / len(PREFERENCE_DIMENSIONS)
    true_values = true_weights.model_dump()
    return _weights(
        [
            declared_signal * true_values[name]
            + (1.0 - declared_signal) * uniform
            for name in PREFERENCE_DIMENSIONS
        ]
    )


def build_synthetic_profiles(
    declared_signal: float = DEFAULT_DECLARATION_SIGNAL,
) -> tuple[SyntheticProfile, ...]:
    """Return four distinct and reproducible latent preference profiles.

    Args:
        declared_signal: Fraction of latent signal represented by the simulated
            initial questionnaire; the remainder is uniform.

    Returns:
        Profiles for distance, crossing support, orientation, and continuity.
    """

    definitions = (
        (
            "distance_priority",
            "Prioridad latente a la distancia",
            (0.40, 0.08, 0.08, 0.06, 0.04, 0.04, 0.08, 0.07, 0.15),
        ),
        (
            "crossing_support_priority",
            "Prioridad latente a cruces y ayudas",
            (0.08, 0.25, 0.30, 0.07, 0.05, 0.03, 0.05, 0.05, 0.12),
        ),
        (
            "orientation_priority",
            "Prioridad latente a orientación y certeza",
            (0.08, 0.08, 0.10, 0.05, 0.04, 0.03, 0.32, 0.08, 0.22),
        ),
        (
            "pedestrian_continuity_priority",
            "Prioridad latente a continuidad peatonal",
            (0.08, 0.06, 0.10, 0.22, 0.18, 0.14, 0.05, 0.10, 0.07),
        ),
    )
    profiles: list[SyntheticProfile] = []
    for profile_id, name, values in definitions:
        true_weights = _weights(values)
        profiles.append(
            SyntheticProfile(
                profile_id=profile_id,
                name=name,
                true_weights=true_weights,
                declared_weights=_partially_declared(true_weights, declared_signal),
            )
        )
    return tuple(profiles)


def _dominates(first: RouteCosts, second: RouteCosts) -> bool:
    """Return whether the first route is no worse in every dimension."""

    first_payload = first.model_dump()
    second_payload = second.model_dump()
    first_values = [first_payload[name] for name in PREFERENCE_DIMENSIONS]
    second_values = [second_payload[name] for name in PREFERENCE_DIMENSIONS]
    return all(a <= b for a, b in zip(first_values, second_values)) and any(
        a < b for a, b in zip(first_values, second_values)
    )


def generate_choice_sets(
    seed: int,
    count: int,
) -> tuple[tuple[RouteCosts, RouteCosts, RouteCosts], ...]:
    """Generate informative three-route trade-offs with a fixed seed.

    Completely dominated alternatives are excluded because they reveal almost
    nothing about the relative importance of preference dimensions.

    Args:
        seed: Independent deterministic random seed.
        count: Number of three-alternative choice situations.

    Returns:
        Synthetic normalized cost vectors with no dominated route.
    """

    if count <= 0:
        raise ValueError("choice set count must be positive")
    random_source = random.Random(seed)
    choice_sets: list[tuple[RouteCosts, RouteCosts, RouteCosts]] = []
    attempts = 0
    while len(choice_sets) < count:
        attempts += 1
        if attempts > count * 100:
            raise RuntimeError("could not generate enough non-dominated choice sets")
        alternatives = tuple(
            RouteCosts(
                **{
                    name: 0.05 + 0.90 * random_source.betavariate(1.5, 1.5)
                    for name in PREFERENCE_DIMENSIONS
                }
            )
            for _ in range(3)
        )
        if any(
            _dominates(first, second)
            for first_index, first in enumerate(alternatives)
            for second_index, second in enumerate(alternatives)
            if first_index != second_index
        ):
            continue
        choice_sets.append(alternatives)
    return tuple(choice_sets)


def _weight_vector(weights: PreferenceWeights) -> list[float]:
    """Return normalized values in the documented dimension order."""

    normalized = (
        weights if isinstance(weights, NormalizedWeights) else normalize_weights(weights)
    )
    payload = normalized.model_dump()
    return [payload[name] for name in PREFERENCE_DIMENSIONS]


def _route_cost(weights: PreferenceWeights, route: RouteCosts) -> float:
    """Return the scalar cost of one synthetic route."""

    route_values = route.model_dump()
    return sum(
        weight * route_values[name]
        for weight, name in zip(_weight_vector(weights), PREFERENCE_DIMENSIONS)
    )


def _vector_cost(weight_vector: Sequence[float], route: RouteCosts) -> float:
    """Return a scalar cost without repeatedly validating fixed weights."""

    route_values = route.model_dump()
    return sum(
        weight * route_values[name]
        for weight, name in zip(weight_vector, PREFERENCE_DIMENSIONS)
    )


def _best_route(weights: PreferenceWeights, routes: Sequence[RouteCosts]) -> int:
    """Return the stable index of the lowest-cost route."""

    return min(range(len(routes)), key=lambda index: (_route_cost(weights, routes[index]), index))


def _evaluate_weights(
    predicted_weights: PreferenceWeights,
    true_weights: PreferenceWeights,
    choice_sets: Sequence[Sequence[RouteCosts]],
) -> tuple[float, float, float]:
    """Evaluate top-1, pairwise order, and regret on held-out choices."""

    predicted_vector = _weight_vector(predicted_weights)
    true_vector = _weight_vector(true_weights)
    top1_correct = 0
    pairwise_correct = 0
    pair_count = 0
    regret = 0.0
    for routes in choice_sets:
        predicted_costs = [_vector_cost(predicted_vector, route) for route in routes]
        true_costs = [_vector_cost(true_vector, route) for route in routes]
        predicted = min(range(len(routes)), key=lambda index: (predicted_costs[index], index))
        preferred = min(range(len(routes)), key=lambda index: (true_costs[index], index))
        top1_correct += int(predicted == preferred)
        regret += true_costs[predicted] - true_costs[preferred]
        for first in range(len(routes)):
            for second in range(first + 1, len(routes)):
                predicted_order = predicted_costs[first] <= predicted_costs[second]
                true_order = true_costs[first] <= true_costs[second]
                pairwise_correct += int(predicted_order == true_order)
                pair_count += 1
    return (
        top1_correct / len(choice_sets),
        pairwise_correct / pair_count,
        regret / len(choice_sets),
    )


def _distance_weights() -> NormalizedWeights:
    """Return the shortest-route system-of-reference weights."""

    return _weights([1.0] + [0.0] * (len(PREFERENCE_DIMENSIONS) - 1))


def _observed_choice(
    routes: Sequence[RouteCosts],
    true_weights: PreferenceWeights,
    noise: float,
    random_source: random.Random,
) -> int:
    """Simulate an explicit choice with optional inconsistent behavior."""

    preferred = _best_route(true_weights, routes)
    if random_source.random() >= noise:
        return preferred
    alternatives = [index for index in range(len(routes)) if index != preferred]
    return random_source.choice(alternatives)


def _pairwise_choice(
    routes: Sequence[RouteCosts],
    chosen_index: int,
    choice_number: int,
) -> PairwiseChoice:
    """Build the production learning input for one synthetic choice."""

    compared = [
        ComparedRoute(route_id=f"choice_{choice_number}_route_{index}", costs=route)
        for index, route in enumerate(routes)
    ]
    return PairwiseChoice(
        chosen=compared[chosen_index],
        unchosen=[route for index, route in enumerate(compared) if index != chosen_index],
    )


def _l1_distance(first: PreferenceWeights, second: PreferenceWeights) -> float:
    """Return total absolute difference between normalized weight vectors."""

    return sum(
        abs(a - b) for a, b in zip(_weight_vector(first), _weight_vector(second))
    )


def _first_near_final_checkpoint(curve: Sequence[CurvePoint]) -> Optional[int]:
    """Find the first checkpoint that stays near the last observed value."""

    adaptive = [point for point in curve if point.model == "adaptive"]
    final_accuracy = adaptive[-1].top1_accuracy
    for index, point in enumerate(adaptive):
        remaining = adaptive[index:]
        if all(
            abs(candidate.top1_accuracy - final_accuracy) <= STABILITY_TOLERANCE
            for candidate in remaining
        ):
            return point.choice_count
    return None


def run_simulation(
    profile: SyntheticProfile,
    seed: int,
    config: LearningConfig,
    noise: float,
    training_choices: int = TRAINING_CHOICES,
    evaluation_sets: int = EVALUATION_SETS,
) -> SimulationResult:
    """Run one deterministic online-learning simulation.

    Args:
        profile: Known latent and declared preference weights.
        seed: Seed for routes and noisy observations.
        config: Learning hyperparameters under evaluation.
        noise: Probability of choosing a non-optimal synthetic alternative.
        training_choices: Number of explicit choices shown to the learner.
        evaluation_sets: Held-out route sets per checkpoint.

    Returns:
        Learning curve, final weights, stability, and maximum changes.
    """

    if not 0.0 <= noise < 1.0:
        raise ValueError("choice noise must be between zero and one")
    training = generate_choice_sets(seed, training_choices)
    evaluation = generate_choice_sets(seed + 10_000_000, evaluation_sets)
    noise_source = random.Random(seed + 20_000_000)
    state = initialize_learning(profile.declared_weights, config=config, enabled=True)
    cumulative_regret = {model: 0.0 for model in MODEL_LABELS}
    maximum_learned_jump = 0.0
    maximum_effective_jump = 0.0
    curve: list[CurvePoint] = []

    def record_checkpoint(choice_count: int) -> None:
        model_weights = {
            "shortest": _distance_weights(),
            "fixed": profile.declared_weights,
            "adaptive": state.effective_weights,
        }
        for model, weights in model_weights.items():
            top1, pairwise, regret = _evaluate_weights(
                weights,
                profile.true_weights,
                evaluation,
            )
            curve.append(
                CurvePoint(
                    profile_id=profile.profile_id,
                    seed=seed,
                    noise=noise,
                    choice_count=choice_count,
                    model=model,
                    top1_accuracy=top1,
                    pairwise_accuracy=pairwise,
                    mean_regret=regret,
                    cumulative_training_regret=cumulative_regret[model],
                )
            )

    record_checkpoint(0)
    for choice_number, routes in enumerate(training, start=1):
        true_preferred = _best_route(profile.true_weights, routes)
        predictions = {
            "shortest": _best_route(_distance_weights(), routes),
            "fixed": _best_route(profile.declared_weights, routes),
            "adaptive": _best_route(state.effective_weights, routes),
        }
        best_true_cost = _route_cost(profile.true_weights, routes[true_preferred])
        for model, predicted in predictions.items():
            cumulative_regret[model] += (
                _route_cost(profile.true_weights, routes[predicted]) - best_true_cost
            )

        chosen = _observed_choice(routes, profile.true_weights, noise, noise_source)
        update = update_preferences(
            state,
            _pairwise_choice(routes, chosen, choice_number),
        )
        state = update.updated_state
        maximum_learned_jump = max(maximum_learned_jump, update.learned_change_l1)
        maximum_effective_jump = max(maximum_effective_jump, update.effective_change_l1)
        if choice_number in CHECKPOINTS:
            record_checkpoint(choice_number)

    result_curve = tuple(curve)
    return SimulationResult(
        curve=result_curve,
        final_state=state,
        true_weights=profile.true_weights,
        maximum_learned_jump_l1=maximum_learned_jump,
        maximum_effective_jump_l1=maximum_effective_jump,
        first_near_final_checkpoint=_first_near_final_checkpoint(result_curve),
    )


def _candidate_configurations() -> Iterable[LearningConfig]:
    """Yield the preregistered finite hyperparameter search space."""

    for learning_rate, inverse_temperature, regularization, max_update, influence_step in product(
        (0.03, 0.06, 0.10, 0.16),
        (3.0, 6.0, 9.0),
        (0.0, 0.05, 0.15),
        (0.04, 0.08, 0.12),
        (0.05, 0.10),
    ):
        yield LearningConfig(
            learning_rate=learning_rate,
            inverse_temperature=inverse_temperature,
            regularization_strength=regularization,
            maximum_learned_update_l1=max_update,
            influence_step=influence_step,
        )


def _mean(values: Sequence[float]) -> float:
    """Return an arithmetic mean with an explicit non-empty requirement."""

    if not values:
        raise ValueError("cannot average an empty sequence")
    return statistics.fmean(values)


def calibrate() -> tuple[LearningConfig, list[dict[str, object]]]:
    """Select hyperparameters on fixed calibration seeds and profiles.

    Returns:
        Selected configuration and all summarized grid-search rows.
    """

    profiles = tuple(
        profile
        for profile in build_synthetic_profiles()
        if profile.profile_id in CALIBRATION_PROFILE_IDS
    )
    rows: list[dict[str, object]] = []
    for config_id, config in enumerate(_candidate_configurations(), start=1):
        results = [
            run_simulation(
                profile,
                seed,
                config,
                CALIBRATION_NOISE,
                evaluation_sets=100,
            )
            for profile in profiles
            for seed in CALIBRATION_SEEDS
        ]
        learning_accuracies = [
            point.top1_accuracy
            for result in results
            for point in result.curve
            if point.model == "adaptive" and point.choice_count in (10, 20, 40, 60)
        ]
        final_points = [
            point
            for result in results
            for point in result.curve
            if point.model == "adaptive" and point.choice_count == TRAINING_CHOICES
        ]
        rows.append(
            {
                "config_id": config_id,
                **config.model_dump(),
                "mean_learning_accuracy": _mean(learning_accuracies),
                "mean_final_accuracy": _mean(
                    [point.top1_accuracy for point in final_points]
                ),
                "mean_final_regret": _mean([point.mean_regret for point in final_points]),
                "mean_cumulative_regret": _mean(
                    [point.cumulative_training_regret for point in final_points]
                ),
                "maximum_effective_jump_l1": max(
                    result.maximum_effective_jump_l1 for result in results
                ),
            }
        )

    rows.sort(
        key=lambda row: (
            -float(row["mean_learning_accuracy"]),
            float(row["mean_final_regret"]),
            float(row["maximum_effective_jump_l1"]),
            float(row["learning_rate"]),
            -float(row["regularization_strength"]),
        )
    )
    selected_row = rows[0]
    selected_row["selected"] = True
    for row in rows[1:]:
        row["selected"] = False
    selected = LearningConfig(
        learning_rate=float(selected_row["learning_rate"]),
        inverse_temperature=float(selected_row["inverse_temperature"]),
        regularization_strength=float(selected_row["regularization_strength"]),
        observation_choices=int(selected_row["observation_choices"]),
        influence_step=float(selected_row["influence_step"]),
        maximum_influence=float(selected_row["maximum_influence"]),
        maximum_learned_update_l1=float(
            selected_row["maximum_learned_update_l1"]
        ),
    )
    rows.sort(key=lambda row: int(row["config_id"]))
    return selected, rows


def evaluate(
    config: LearningConfig,
) -> list[SimulationResult]:
    """Evaluate the selected configuration on unseen fixed seeds."""

    return [
        run_simulation(profile, seed, config, noise)
        for noise in NOISE_LEVELS
        for profile in build_synthetic_profiles()
        for seed in EVALUATION_SEEDS
    ]


def evaluate_declaration_quality(
    config: LearningConfig,
    default_results: Optional[Sequence[SimulationResult]] = None,
) -> list[dict[str, object]]:
    """Measure dependence on the simulated initial questionnaire quality.

    Args:
        config: Frozen learning configuration selected during calibration.
        default_results: Optional final-evaluation results whose ten-percent
            noise condition can be reused for the default 25% signal.

    Returns:
        One transparent summary row per assumed questionnaire signal.
    """

    rows: list[dict[str, object]] = []
    for declared_signal in DECLARATION_SIGNALS:
        if declared_signal == DEFAULT_DECLARATION_SIGNAL and default_results:
            simulations = [
                result
                for result in default_results
                if result.curve[0].noise == CALIBRATION_NOISE
            ]
        else:
            simulations = [
                run_simulation(profile, seed, config, CALIBRATION_NOISE)
                for profile in build_synthetic_profiles(declared_signal)
                for seed in EVALUATION_SEEDS
            ]

        fixed_accuracy: list[float] = []
        adaptive_accuracy: list[float] = []
        fixed_regret: list[float] = []
        adaptive_regret: list[float] = []
        differences_by_seed: dict[int, list[float]] = {}
        for result in simulations:
            final = {
                point.model: point
                for point in result.curve
                if point.choice_count == TRAINING_CHOICES
            }
            fixed_accuracy.append(final["fixed"].top1_accuracy)
            adaptive_accuracy.append(final["adaptive"].top1_accuracy)
            fixed_regret.append(final["fixed"].mean_regret)
            adaptive_regret.append(final["adaptive"].mean_regret)
            differences_by_seed.setdefault(final["adaptive"].seed, []).append(
                final["adaptive"].top1_accuracy - final["fixed"].top1_accuracy
            )

        clustered_differences = [
            _mean(differences_by_seed[seed]) for seed in sorted(differences_by_seed)
        ]
        improvement, improvement_low, improvement_high = (
            _unbounded_confidence_interval(clustered_differences)
        )
        rows.append(
            {
                "declared_signal": declared_signal,
                "uniform_fraction": 1.0 - declared_signal,
                "noise": CALIBRATION_NOISE,
                "runs": len(simulations),
                "independent_seed_clusters": len(clustered_differences),
                "fixed_top1_accuracy": _mean(fixed_accuracy),
                "adaptive_top1_accuracy": _mean(adaptive_accuracy),
                "top1_improvement": improvement,
                "top1_improvement_ci95_low": improvement_low,
                "top1_improvement_ci95_high": improvement_high,
                "fixed_mean_regret": _mean(fixed_regret),
                "adaptive_mean_regret": _mean(adaptive_regret),
            }
        )
    return rows


def _confidence_interval(values: Sequence[float]) -> tuple[float, float, float]:
    """Return mean and an approximate normal 95% confidence interval."""

    mean = _mean(values)
    if len(values) < 2:
        return mean, mean, mean
    margin = 1.96 * statistics.stdev(values) / math.sqrt(len(values))
    return mean, max(0.0, mean - margin), min(1.0, mean + margin)


def _unbounded_confidence_interval(
    values: Sequence[float],
) -> tuple[float, float, float]:
    """Return mean and an approximate 95% interval for signed differences."""

    mean = _mean(values)
    if len(values) < 2:
        return mean, mean, mean
    margin = 1.96 * statistics.stdev(values) / math.sqrt(len(values))
    return mean, mean - margin, mean + margin


def _seed_cluster_means(
    rows: Sequence[dict[str, object]],
    field: str,
) -> list[float]:
    """Average one run-level metric within each independent random seed.

    The same generated route sets are evaluated against several synthetic
    profiles.  Those profile--seed rows are therefore paired observations, not
    fully independent replicates.  Confidence intervals use one mean per seed
    to avoid overstating precision.

    Args:
        rows: Run-level records containing ``seed`` and the requested field.
        field: Numeric metric to average within each seed cluster.

    Returns:
        One arithmetic mean per seed, ordered reproducibly.
    """

    grouped: dict[int, list[float]] = {}
    for row in rows:
        grouped.setdefault(int(row["seed"]), []).append(float(row[field]))
    return [_mean(grouped[seed]) for seed in sorted(grouped)]


def _summarize_curve(results: Sequence[SimulationResult]) -> list[dict[str, object]]:
    """Aggregate learning curves across profiles and unseen seeds."""

    points = [point for result in results for point in result.curve]
    rows: list[dict[str, object]] = []
    for noise, choice_count, model in product(NOISE_LEVELS, CHECKPOINTS, MODEL_LABELS):
        selected = [
            point
            for point in points
            if point.noise == noise
            and point.choice_count == choice_count
            and point.model == model
        ]
        seed_ids = sorted({point.seed for point in selected})
        accuracy_by_seed = [
            _mean(
                [
                    point.top1_accuracy
                    for point in selected
                    if point.seed == seed
                ]
            )
            for seed in seed_ids
        ]
        pairwise_by_seed = [
            _mean(
                [
                    point.pairwise_accuracy
                    for point in selected
                    if point.seed == seed
                ]
            )
            for seed in seed_ids
        ]
        accuracy_mean, accuracy_low, accuracy_high = _confidence_interval(
            accuracy_by_seed
        )
        pairwise_mean, pairwise_low, pairwise_high = _confidence_interval(
            pairwise_by_seed
        )
        regret_values = [point.mean_regret for point in selected]
        cumulative_values = [point.cumulative_training_regret for point in selected]
        rows.append(
            {
                "noise": noise,
                "choice_count": choice_count,
                "model": model,
                "model_label": MODEL_LABELS[model],
                "runs": len(selected),
                "independent_seed_clusters": len(seed_ids),
                "top1_mean": accuracy_mean,
                "top1_ci95_low": accuracy_low,
                "top1_ci95_high": accuracy_high,
                "pairwise_mean": pairwise_mean,
                "pairwise_ci95_low": pairwise_low,
                "pairwise_ci95_high": pairwise_high,
                "mean_regret": _mean(regret_values),
                "cumulative_training_regret": _mean(cumulative_values),
            }
        )
    return rows


def _final_run_rows(results: Sequence[SimulationResult]) -> list[dict[str, object]]:
    """Return run-level final metrics for transparent reanalysis."""

    rows: list[dict[str, object]] = []
    for result in results:
        final_points = {
            point.model: point
            for point in result.curve
            if point.choice_count == TRAINING_CHOICES
        }
        profile_id = next(iter(final_points.values())).profile_id
        seed = next(iter(final_points.values())).seed
        noise = next(iter(final_points.values())).noise
        for model, point in final_points.items():
            rows.append(
                {
                    "profile_id": profile_id,
                    "seed": seed,
                    "noise": noise,
                    "model": model,
                    "top1_accuracy": point.top1_accuracy,
                    "pairwise_accuracy": point.pairwise_accuracy,
                    "mean_regret": point.mean_regret,
                    "cumulative_training_regret": point.cumulative_training_regret,
                    "weight_error_l1": (
                        _l1_distance(result.final_state.effective_weights, result.true_weights)
                        if model == "adaptive"
                        else ""
                    ),
                    "maximum_learned_jump_l1": (
                        result.maximum_learned_jump_l1 if model == "adaptive" else ""
                    ),
                    "maximum_effective_jump_l1": (
                        result.maximum_effective_jump_l1 if model == "adaptive" else ""
                    ),
                    "first_near_final_checkpoint": (
                        result.first_near_final_checkpoint if model == "adaptive" else ""
                    ),
                }
            )
    return rows


def _summarize_final_runs(
    run_rows: Sequence[dict[str, object]],
) -> list[dict[str, object]]:
    """Aggregate final metrics by profile and across all synthetic profiles."""

    rows: list[dict[str, object]] = []
    profile_ids = [profile.profile_id for profile in build_synthetic_profiles()]
    for noise, scope, model in product(
        NOISE_LEVELS,
        [*profile_ids, "all_profiles"],
        MODEL_LABELS,
    ):
        selected = [
            row
            for row in run_rows
            if float(row["noise"]) == noise
            and row["model"] == model
            and (scope == "all_profiles" or row["profile_id"] == scope)
        ]
        accuracy_by_seed = _seed_cluster_means(selected, "top1_accuracy")
        pairwise_by_seed = _seed_cluster_means(selected, "pairwise_accuracy")
        accuracy_mean, accuracy_low, accuracy_high = _confidence_interval(
            accuracy_by_seed
        )
        pairwise_mean, pairwise_low, pairwise_high = _confidence_interval(
            pairwise_by_seed
        )
        adaptive_rows = [row for row in selected if row["weight_error_l1"] != ""]
        near_final_checkpoints = [
            int(row["first_near_final_checkpoint"])
            for row in adaptive_rows
            if row["first_near_final_checkpoint"] != ""
        ]
        rows.append(
            {
                "noise": noise,
                "profile_id": scope,
                "model": model,
                "model_label": MODEL_LABELS[model],
                "runs": len(selected),
                "independent_seed_clusters": len(accuracy_by_seed),
                "top1_mean": accuracy_mean,
                "top1_ci95_low": accuracy_low,
                "top1_ci95_high": accuracy_high,
                "pairwise_mean": pairwise_mean,
                "pairwise_ci95_low": pairwise_low,
                "pairwise_ci95_high": pairwise_high,
                "mean_regret": _mean([float(row["mean_regret"]) for row in selected]),
                "mean_cumulative_regret": _mean(
                    [float(row["cumulative_training_regret"]) for row in selected]
                ),
                "mean_weight_error_l1": (
                    _mean([float(row["weight_error_l1"]) for row in adaptive_rows])
                    if adaptive_rows
                    else ""
                ),
                "median_first_near_final_checkpoint": (
                    statistics.median(near_final_checkpoints)
                    if near_final_checkpoints
                    else ""
                ),
                "maximum_effective_jump_l1": (
                    max(float(row["maximum_effective_jump_l1"]) for row in adaptive_rows)
                    if adaptive_rows
                    else ""
                ),
            }
        )
    return rows


def _paired_improvement_rows(
    run_rows: Sequence[dict[str, object]],
) -> list[dict[str, object]]:
    """Compare adaptive results with baselines on identical seeds and profiles."""

    profiles = [profile.profile_id for profile in build_synthetic_profiles()]
    index = {
        (
            float(row["noise"]),
            str(row["profile_id"]),
            int(row["seed"]),
            str(row["model"]),
        ): row
        for row in run_rows
    }
    rows: list[dict[str, object]] = []
    for noise, scope, baseline in product(
        NOISE_LEVELS,
        [*profiles, "all_profiles"],
        ("shortest", "fixed"),
    ):
        differences: list[float] = []
        regret_reductions: list[float] = []
        cumulative_reductions: list[float] = []
        differences_by_seed: dict[int, list[float]] = {}
        for profile_id in profiles:
            if scope != "all_profiles" and profile_id != scope:
                continue
            for seed in EVALUATION_SEEDS:
                adaptive = index[(noise, profile_id, seed, "adaptive")]
                reference = index[(noise, profile_id, seed, baseline)]
                difference = float(adaptive["top1_accuracy"]) - float(
                    reference["top1_accuracy"]
                )
                differences.append(difference)
                differences_by_seed.setdefault(seed, []).append(difference)
                regret_reductions.append(
                    float(reference["mean_regret"]) - float(adaptive["mean_regret"])
                )
                cumulative_reductions.append(
                    float(reference["cumulative_training_regret"])
                    - float(adaptive["cumulative_training_regret"])
                )
        clustered_differences = [
            _mean(differences_by_seed[seed]) for seed in sorted(differences_by_seed)
        ]
        mean_difference, difference_low, difference_high = (
            _unbounded_confidence_interval(clustered_differences)
        )
        rows.append(
            {
                "noise": noise,
                "profile_id": scope,
                "baseline": baseline,
                "baseline_label": MODEL_LABELS[baseline],
                "paired_runs": len(differences),
                "independent_seed_clusters": len(clustered_differences),
                "top1_improvement": mean_difference,
                "top1_improvement_ci95_low": difference_low,
                "top1_improvement_ci95_high": difference_high,
                "mean_regret_reduction": _mean(regret_reductions),
                "mean_cumulative_regret_reduction": _mean(cumulative_reductions),
                "adaptive_wins": sum(value > 0.0 for value in differences),
                "ties": sum(value == 0.0 for value in differences),
                "adaptive_losses": sum(value < 0.0 for value in differences),
            }
        )
    return rows


def _weight_rows(results: Sequence[SimulationResult]) -> list[dict[str, object]]:
    """Summarize true, declared, learned, and effective final weights."""

    rows: list[dict[str, object]] = []
    profiles = {profile.profile_id: profile for profile in build_synthetic_profiles()}
    for profile_id, profile in profiles.items():
        selected = [
            result
            for result in results
            if result.curve[0].profile_id == profile_id
            and result.curve[0].noise == CALIBRATION_NOISE
        ]
        for dimension in PREFERENCE_DIMENSIONS:
            rows.append(
                {
                    "profile_id": profile_id,
                    "profile_name": profile.name,
                    "noise": CALIBRATION_NOISE,
                    "runs": len(selected),
                    "independent_seed_clusters": len(
                        {result.curve[0].seed for result in selected}
                    ),
                    "dimension": dimension,
                    "true_weight": profile.true_weights.model_dump()[dimension],
                    "declared_weight": profile.declared_weights.model_dump()[dimension],
                    "mean_learned_weight": _mean(
                        [
                            result.final_state.learned_weights.model_dump()[dimension]
                            for result in selected
                        ]
                    ),
                    "mean_effective_weight": _mean(
                        [
                            result.final_state.effective_weights.model_dump()[dimension]
                            for result in selected
                        ]
                    ),
                }
            )
    return rows


def _write_csv(path: Path, rows: Sequence[dict[str, object]]) -> None:
    """Write a stable UTF-8 CSV with one header row."""

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def _plot_learning_curves(curve_rows: Sequence[dict[str, object]]) -> None:
    """Create two accessible figures for the ten-percent-noise condition."""

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.ticker import PercentFormatter

    colors = {
        "shortest": "#D97706",
        "fixed": "#008C95",
        "adaptive": "#6D4AFF",
    }
    markers = {"shortest": "s", "fixed": "o", "adaptive": "D"}
    selected = [row for row in curve_rows if float(row["noise"]) == CALIBRATION_NOISE]

    figure, axis = plt.subplots(figsize=(11, 6.5))
    figure.patch.set_facecolor("#FAF9FE")
    axis.set_facecolor("#FAF9FE")
    axis.axvspan(0, 3, color="#E8E3F5", alpha=0.65, zorder=0)
    axis.text(
        1.5,
        0.97,
        "Observación",
        transform=axis.get_xaxis_transform(),
        ha="center",
        va="top",
        fontsize=9,
        color="#625A78",
    )
    for model in MODEL_LABELS:
        rows = [row for row in selected if row["model"] == model]
        x_values = [int(row["choice_count"]) for row in rows]
        means = [float(row["top1_mean"]) for row in rows]
        lows = [float(row["top1_ci95_low"]) for row in rows]
        highs = [float(row["top1_ci95_high"]) for row in rows]
        axis.plot(
            x_values,
            means,
            color=colors[model],
            marker=markers[model],
            linewidth=2.8,
            markersize=7,
            label=MODEL_LABELS[model],
        )
        axis.fill_between(x_values, lows, highs, color=colors[model], alpha=0.12)
    axis.set_title(
        "El aprendizaje mejora la elección cuando el cuestionario inicial es impreciso",
        fontsize=17,
        fontweight="bold",
        color="#17213A",
        pad=18,
    )
    axis.text(
        0.0,
        1.02,
        "Exactitud sobre rutas nuevas · 10 % de elecciones sintéticas inconsistentes",
        transform=axis.transAxes,
        fontsize=11.5,
        color="#526079",
    )
    axis.set_xlabel("Elecciones explícitas observadas", fontsize=12)
    axis.set_ylabel("Exactitud top-1", fontsize=12)
    axis.yaxis.set_major_formatter(PercentFormatter(1.0))
    axis.set_xticks(CHECKPOINTS)
    axis.set_ylim(0.25, 1.01)
    axis.grid(axis="y", color="#D9DCE7", linewidth=0.9)
    axis.spines[["top", "right"]].set_visible(False)
    axis.legend(frameon=False, ncol=3, loc="lower right", fontsize=10.5)
    axis.text(
        0.0,
        -0.19,
        "80 combinaciones perfil–semilla; intervalos agrupados por 20 semillas independientes.",
        transform=axis.transAxes,
        fontsize=9.5,
        color="#69748A",
    )
    figure.tight_layout()
    figure.savefig(FIGURES_DIR / "aprendizaje-exactitud.png", dpi=300, bbox_inches="tight")
    plt.close(figure)

    figure, axis = plt.subplots(figsize=(11, 6.5))
    figure.patch.set_facecolor("#FAF9FE")
    axis.set_facecolor("#FAF9FE")
    axis.axvspan(0, 3, color="#E8E3F5", alpha=0.65, zorder=0)
    axis.text(
        1.5,
        0.82,
        "Observación",
        transform=axis.get_xaxis_transform(),
        ha="center",
        va="top",
        fontsize=9,
        color="#625A78",
    )
    for model in MODEL_LABELS:
        rows = [row for row in selected if row["model"] == model]
        axis.plot(
            [int(row["choice_count"]) for row in rows],
            [float(row["cumulative_training_regret"]) for row in rows],
            color=colors[model],
            marker=markers[model],
            linewidth=2.8,
            markersize=7,
            label=MODEL_LABELS[model],
        )
    axis.set_title(
        "El coste de elegir una ruta subóptima crece más despacio al aprender",
        fontsize=17,
        fontweight="bold",
        color="#17213A",
        pad=18,
    )
    axis.text(
        0.0,
        1.02,
        "Arrepentimiento acumulado · menor es mejor · ruido sintético del 10 %",
        transform=axis.transAxes,
        fontsize=11.5,
        color="#526079",
    )
    axis.set_xlabel("Elecciones explícitas observadas", fontsize=12)
    axis.set_ylabel("Arrepentimiento acumulado", fontsize=12)
    axis.set_xticks(CHECKPOINTS)
    axis.set_ylim(bottom=0.0)
    axis.grid(axis="y", color="#D9DCE7", linewidth=0.9)
    axis.spines[["top", "right"]].set_visible(False)
    axis.legend(frameon=False, ncol=3, loc="upper left", fontsize=10.5)
    axis.text(
        0.0,
        -0.19,
        "Diferencia entre el coste latente de la ruta elegida por cada sistema "
        "y el óptimo sintético.",
        transform=axis.transAxes,
        fontsize=9.5,
        color="#69748A",
    )
    figure.tight_layout()
    figure.savefig(FIGURES_DIR / "aprendizaje-arrepentimiento.png", dpi=300, bbox_inches="tight")
    plt.close(figure)


def main() -> None:
    """Calibrate, evaluate, persist tables, and render final figures."""

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    LOGGER.info("Calibrando configuraciones de aprendizaje...")
    selected_config, calibration_rows = calibrate()
    LOGGER.info("Configuración seleccionada: %s", selected_config.model_dump())
    LOGGER.info("Evaluando sobre semillas no usadas durante la calibración...")
    results = evaluate(selected_config)
    declaration_quality_rows = evaluate_declaration_quality(
        selected_config,
        default_results=results,
    )
    curve_rows = _summarize_curve(results)
    final_run_rows = _final_run_rows(results)
    _write_csv(ARTIFACTS_DIR / "aprendizaje-calibracion.csv", calibration_rows)
    _write_csv(ARTIFACTS_DIR / "aprendizaje-curva.csv", curve_rows)
    _write_csv(ARTIFACTS_DIR / "aprendizaje-ejecuciones-finales.csv", final_run_rows)
    _write_csv(
        ARTIFACTS_DIR / "aprendizaje-resultados.csv",
        _summarize_final_runs(final_run_rows),
    )
    _write_csv(
        ARTIFACTS_DIR / "aprendizaje-mejoras-emparejadas.csv",
        _paired_improvement_rows(final_run_rows),
    )
    _write_csv(ARTIFACTS_DIR / "aprendizaje-pesos.csv", _weight_rows(results))
    _write_csv(
        ARTIFACTS_DIR / "aprendizaje-sensibilidad-cuestionario.csv",
        declaration_quality_rows,
    )
    _plot_learning_curves(curve_rows)
    LOGGER.info("Artefactos guardados en docs/evaluation/artifacts y docs/figures.")


if __name__ == "__main__":
    main()
