"""Tests for the reproducible synthetic adaptive-learning experiment."""

import pytest

from backend.feedback import LearningConfig
from ml.adaptive_preferences.evaluation import (
    _dominates,
    _seed_cluster_means,
    build_synthetic_profiles,
    generate_choice_sets,
    run_simulation,
)


def test_synthetic_choice_sets_are_seeded_and_non_dominated() -> None:
    """Equal seeds reproduce informative route trade-offs exactly."""

    first = generate_choice_sets(123, 5)
    second = generate_choice_sets(123, 5)

    assert first == second
    assert len(first) == 5
    assert all(len(choice_set) == 3 for choice_set in first)
    assert not any(
        _dominates(candidate, alternative)
        for choice_set in first
        for candidate_index, candidate in enumerate(choice_set)
        for alternative_index, alternative in enumerate(choice_set)
        if candidate_index != alternative_index
    )


def test_questionnaire_signal_endpoints_are_interpretable() -> None:
    """Zero signal is uniform and full signal reproduces latent preferences."""

    uniform_profile = build_synthetic_profiles(declared_signal=0.0)[0]
    exact_profile = build_synthetic_profiles(declared_signal=1.0)[0]

    uniform_values = list(uniform_profile.declared_weights.model_dump().values())
    assert max(uniform_values) == pytest.approx(min(uniform_values))
    assert exact_profile.declared_weights == exact_profile.true_weights


def test_simulation_is_reproducible_and_uses_all_three_baselines() -> None:
    """A small experiment has stable outputs for every comparison system."""

    profile = build_synthetic_profiles()[0]
    first = run_simulation(
        profile,
        seed=456,
        config=LearningConfig(),
        noise=0.1,
        training_choices=5,
        evaluation_sets=10,
    )
    second = run_simulation(
        profile,
        seed=456,
        config=LearningConfig(),
        noise=0.1,
        training_choices=5,
        evaluation_sets=10,
    )

    assert first == second
    assert {point.model for point in first.curve} == {"shortest", "fixed", "adaptive"}
    assert first.final_state.choice_count == 5


def test_adaptation_recovers_a_known_synthetic_preference_signal() -> None:
    """On unseen choices, adaptation improves over its fixed declaration."""

    profile = build_synthetic_profiles()[1]
    result = run_simulation(
        profile,
        seed=999,
        config=LearningConfig(),
        noise=0.0,
        training_choices=40,
        evaluation_sets=100,
    )
    final = {
        point.model: point
        for point in result.curve
        if point.choice_count == 40
    }

    assert final["adaptive"].top1_accuracy > final["fixed"].top1_accuracy
    assert final["adaptive"].mean_regret < final["fixed"].mean_regret


def test_confidence_interval_units_are_averaged_within_seed() -> None:
    """Profiles sharing generated routes count as one seed cluster for intervals."""

    rows = [
        {"seed": 10, "top1_accuracy": 0.2},
        {"seed": 10, "top1_accuracy": 0.8},
        {"seed": 20, "top1_accuracy": 0.4},
        {"seed": 20, "top1_accuracy": 0.6},
    ]

    assert _seed_cluster_means(rows, "top1_accuracy") == [0.5, 0.5]
