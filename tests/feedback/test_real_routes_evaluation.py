"""Tests for adaptive-learning evaluation on real-route cost vectors."""

from datetime import datetime, timezone
from pathlib import Path

from backend.scoring import RouteCosts
from ml.adaptive_preferences.evaluation import build_synthetic_profiles
from ml.adaptive_preferences.real_routes_evaluation import (
    REAL_ROUTE_SCENARIOS,
    RealRouteCostRecord,
    _accepted_scenarios,
    load_cost_records,
    preference_diagnostics,
    run_real_route_simulation,
    save_cost_records,
    summarize_dimensions,
    summarize_runs,
    validate_route_metadata,
    validate_scenario_protocol,
)

HASH = "a" * 64


def _costs(distance: float, crossings: float, orientation: float) -> RouteCosts:
    """Build a compact but non-constant nine-dimensional route vector."""

    return RouteCosts(
        distance=distance,
        complex_crossings=crossings,
        crossing_support=crossings,
        sidewalk_evidence=0.2 + distance / 10,
        steps=0.1,
        surface=0.3,
        orientation_complexity=orientation,
        slope=0.4 - distance / 10,
        uncertainty=0.2 + crossings / 10,
    )


def _record(
    scenario_id: str,
    split: str,
    route_number: int,
    costs: RouteCosts,
    *,
    accepted: bool = True,
) -> RealRouteCostRecord:
    """Build one sanitized record resembling the versioned CSV."""

    return RealRouteCostRecord(
        scenario_id=scenario_id,
        split=split,
        request_sha256=HASH,
        osm_query_sha256=HASH,
        osm_base_timestamp=datetime(2026, 8, 11, tzinfo=timezone.utc),
        route_id=f"ors_route_{route_number}",
        candidate_count=3,
        distance_m=800.0 + 100.0 * route_number,
        duration_s=600.0 + 50.0 * route_number,
        accepted=accepted,
        violation_codes=[] if accepted else ["steps"],
        costs=costs,
    )


def _records() -> tuple[RealRouteCostRecord, ...]:
    """Return eligible training and evaluation scenarios plus one rejection."""

    return (
        _record("rr01", "training", 1, _costs(0.1, 0.8, 0.7)),
        _record("rr01", "training", 2, _costs(0.5, 0.2, 0.3)),
        _record("rr01", "training", 3, _costs(0.8, 0.4, 0.1), accepted=False),
        _record("rr02", "training", 1, _costs(0.2, 0.7, 0.6)),
        _record("rr02", "training", 2, _costs(0.6, 0.1, 0.2)),
        _record("rr02", "training", 3, _costs(0.8, 0.5, 0.4), accepted=False),
        _record("rr09", "evaluation", 1, _costs(0.1, 0.9, 0.7)),
        _record("rr09", "evaluation", 2, _costs(0.7, 0.1, 0.2)),
        _record("rr09", "evaluation", 3, _costs(0.9, 0.6, 0.5), accepted=False),
        _record("rr10", "evaluation", 1, _costs(0.2, 0.7, 0.8)),
        _record("rr10", "evaluation", 2, _costs(0.8, 0.2, 0.1)),
        _record("rr10", "evaluation", 3, _costs(0.9, 0.5, 0.6), accepted=False),
    )


def test_preregistered_scenarios_are_unique_inside_the_snapshot() -> None:
    """The fixed protocol contains eight training and four evaluation pairs."""

    validate_scenario_protocol()

    assert len(REAL_ROUTE_SCENARIOS) == 12
    assert sum(item.split == "training" for item in REAL_ROUTE_SCENARIOS) == 8
    assert sum(item.split == "evaluation" for item in REAL_ROUTE_SCENARIOS) == 4


def test_cost_csv_round_trip_is_sanitized(tmp_path: Path) -> None:
    """The public derivative contains costs but no coordinates or geometries."""

    path = save_cost_records(_records(), tmp_path / "costs.csv")
    serialized = path.read_text(encoding="utf-8")

    assert load_cost_records(path) == _records()
    assert "latitude" not in serialized
    assert "longitude" not in serialized
    assert "geometry" not in serialized
    assert "api_key" not in serialized


def test_rejected_routes_never_enter_learning_sets() -> None:
    """Only accepted alternatives can form pairwise observations."""

    training = _accepted_scenarios(_records(), "training")

    assert set(training) == {"rr01", "rr02"}
    assert all(route.accepted for routes in training.values() for route in routes)
    assert {route.route_id for route in training["rr01"]} == {
        "ors_route_1",
        "ors_route_2",
    }


def test_route_metadata_rejects_mixed_graph_versions() -> None:
    """One experiment cannot silently combine different ORS graph dates."""

    first, second, *remaining = _records()
    first = first.model_copy(update={"ors_graph_date": "2026-08-10"})
    second = second.model_copy(update={"ors_graph_date": "2026-08-11"})

    try:
        validate_route_metadata((first, second, *remaining))
    except ValueError as error:
        assert "graph dates" in str(error)
    else:
        raise AssertionError("mixed ORS graph dates must be rejected")


def test_real_route_simulation_is_reproducible_and_compares_three_models() -> None:
    """A fixed seed reproduces all systems on held-out route pairs."""

    profile = build_synthetic_profiles()[1]
    first = run_real_route_simulation(_records(), profile, seed=42, choice_count=12)
    second = run_real_route_simulation(_records(), profile, seed=42, choice_count=12)

    assert first == second
    assert {run.model for run in first} == {"shortest", "fixed", "adaptive"}
    assert all(run.training_scenario_count == 2 for run in first)
    assert all(run.evaluation_scenario_count == 2 for run in first)
    assert first[2].maximum_learned_jump_l1 is not None


def test_zero_choice_checkpoint_matches_fixed_declared_weights() -> None:
    """Before observing choices, the adaptive result equals the fixed baseline."""

    profile = build_synthetic_profiles()[2]
    runs = run_real_route_simulation(_records(), profile, seed=42, choice_count=0)
    by_model = {run.model: run for run in runs}

    assert by_model["adaptive"].top1_accuracy == by_model["fixed"].top1_accuracy
    assert by_model["adaptive"].pairwise_accuracy == by_model["fixed"].pairwise_accuracy
    assert by_model["adaptive"].maximum_learned_jump_l1 == 0.0


def test_summaries_preserve_profile_and_seed_clustering() -> None:
    """Run and dimension summaries remain explicit and interpretable."""

    profile = build_synthetic_profiles()[0]
    runs = [
        *run_real_route_simulation(_records(), profile, seed=42, choice_count=8),
        *run_real_route_simulation(_records(), profile, seed=43, choice_count=8),
    ]

    summary = summarize_runs(runs)
    dimensions = summarize_dimensions(_records())

    selected = [
        row
        for row in summary
        if row["profile_id"] == profile.profile_id and row["model"] == "adaptive"
    ]
    assert selected[0]["runs"] == 2
    assert selected[0]["seed_clusters"] == 2
    assert {row["dimension"] for row in dimensions} == set(RouteCosts.model_fields)
    assert {row["scenario_id"] for row in preference_diagnostics(_records())} == {
        "rr01",
        "rr02",
        "rr09",
        "rr10",
    }
