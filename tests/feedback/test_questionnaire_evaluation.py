"""Tests for adaptive evaluation using the real onboarding questionnaire."""

from pathlib import Path

import pytest

from ml.adaptive_preferences.questionnaire_evaluation import (
    CONDITIONS,
    QuestionnaireAnswers,
    _real_route_curve,
    availability_rows,
    build_profile_from_answers,
    load_questionnaire_fixture,
    paired_comparisons,
    profile_for_condition,
    questionnaire_real_scenarios,
    summarize_runs,
)
from ml.adaptive_preferences.real_routes_evaluation import load_cost_records


def test_shared_fixture_has_four_complete_questionnaire_profiles() -> None:
    """The experiment uses four unique complete cases and the frozen schema."""

    fixture = load_questionnaire_fixture()

    assert len(fixture.profiles) == 4
    assert len({case.profile_id for case in fixture.profiles}) == 4
    assert all(case.answers.adaptiveLearning for case in fixture.profiles)
    assert {case.answers.presentation for case in fixture.profiles} == {
        "system",
        "largeText",
        "highContrast",
        "both",
    }


def test_python_mapping_matches_every_shared_expected_profile() -> None:
    """The evaluator cannot silently use a different questionnaire mapping."""

    fixture = load_questionnaire_fixture()

    for case in fixture.profiles:
        assert build_profile_from_answers(case.answers) == case.expected_profile


def test_non_routing_answers_never_change_profile() -> None:
    """Voice, presentation, and consent are excluded from route ranking."""

    case = load_questionnaire_fixture().profiles[0]
    changed = QuestionnaireAnswers(
        **{
            **case.answers.model_dump(),
            "adaptiveLearning": False,
            "presentation": "both",
            "speech": "automatic",
            "speechRate": "very_fast",
        }
    )

    assert build_profile_from_answers(changed) == case.expected_profile


def test_exact_condition_uses_questionnaire_weights_as_ground_truth() -> None:
    """Exact consistency starts with no hidden mismatch to correct."""

    case = load_questionnaire_fixture().profiles[1]
    profile = profile_for_condition(case, "exact")

    assert profile.true_weights == profile.declared_weights


def test_refinement_condition_preserves_valid_normalized_weights() -> None:
    """Latent refinement differs without creating negative or unnormalized weights."""

    fixture = load_questionnaire_fixture()

    for case in fixture.profiles:
        profile = profile_for_condition(case, "latent_refinement")
        values = list(profile.true_weights.model_dump().values())
        assert sum(values) == pytest.approx(1.0)
        assert min(values) >= 0.0
        assert profile.true_weights != profile.declared_weights


def test_profile_restrictions_change_real_route_availability() -> None:
    """Step and detour answers are reapplied to the stored ORS alternatives."""

    records = load_cost_records()
    cases = {case.profile_id: case for case in load_questionnaire_fixture().profiles}
    distance = questionnaire_real_scenarios(
        records,
        cases["questionnaire_distance"].expected_profile,
        "evaluation",
    )
    continuity = questionnaire_real_scenarios(
        records,
        cases["questionnaire_continuity"].expected_profile,
        "evaluation",
    )

    assert len(distance["rr12"]) == 3
    assert "rr12" not in continuity
    assert all(
        "pedestrian_access" not in route.violation_codes
        and "incompatible_crossings" not in route.violation_codes
        for routes in distance.values()
        for route in routes
    )


def test_real_curve_is_reproducible_and_compares_all_models() -> None:
    """One fixed seed reproduces every checkpoint and comparison system."""

    records = load_cost_records()
    case = load_questionnaire_fixture().profiles[0]
    first = _real_route_curve(records, case, "latent_refinement", 42)
    second = _real_route_curve(records, case, "latent_refinement", 42)

    assert first == second
    assert {run.model for run in first} == {"shortest", "fixed", "adaptive"}
    assert {run.choice_count for run in first} == {0, 3, 5, 10, 20, 40, 60}
    assert all(run.training_scenario_count >= 1 for run in first)
    assert all(run.evaluation_scenario_count >= 1 for run in first)


def test_zero_checkpoint_cannot_distinguish_fixed_and_adaptive() -> None:
    """Before choices, adaptive weights equal the declaration by construction."""

    records = load_cost_records()
    case = load_questionnaire_fixture().profiles[2]
    runs = _real_route_curve(records, case, "latent_refinement", 42)
    initial = {run.model: run for run in runs if run.choice_count == 0}

    assert initial["adaptive"].top1_accuracy == initial["fixed"].top1_accuracy
    assert initial["adaptive"].pairwise_accuracy == initial["fixed"].pairwise_accuracy


def test_summary_and_paired_comparison_keep_banks_separate() -> None:
    """Aggregation cannot mix conditions or hide paired wins and losses."""

    records = load_cost_records()
    fixture = load_questionnaire_fixture()
    runs = tuple(
        run
        for condition in CONDITIONS
        for run in _real_route_curve(records, fixture.profiles[0], condition, 42)
    )
    summary = summarize_runs(runs)
    comparisons = paired_comparisons(runs)

    assert {row["condition"] for row in summary} == set(CONDITIONS)
    assert {row["bank"] for row in summary} == {"real_limited"}
    assert len(comparisons) == 2
    assert all(row["paired_runs"] == 1 for row in comparisons)


def test_public_availability_artifact_contains_no_coordinates() -> None:
    """Profile-specific availability remains sanitized and reproducible."""

    rows = availability_rows(load_cost_records(), load_questionnaire_fixture())
    serialized = str(rows).lower()

    assert rows
    assert "latitude" not in serialized
    assert "longitude" not in serialized
    assert "geometry" not in serialized


def test_fixture_path_is_repository_relative_and_versioned() -> None:
    """The shared source is part of the repository, not a local private path."""

    path = Path("shared/onboarding-questionnaire-evaluation.json")

    assert path.is_file()
    assert "onboarding-questionnaire-evaluation-v1" in path.read_text(encoding="utf-8")
