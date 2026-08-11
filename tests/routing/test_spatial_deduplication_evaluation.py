"""Tests for reproducible spatial-deduplication calibration."""

from pathlib import Path

from backend.routing.evaluate_spatial_deduplication import (
    LENGTH_DIFFERENCE_THRESHOLDS,
    OVERLAP_THRESHOLDS,
    TOLERANCES_M,
    build_calibration_cases,
    evaluate_parameter_grid,
    run_evaluation,
    select_conservative_configuration,
)


def test_calibration_set_is_balanced_and_has_stable_identifiers() -> None:
    """Accuracy is computed over five positive and five negative cases."""

    cases = build_calibration_cases()

    assert [case.case_id for case in cases] == [
        "P1",
        "P2",
        "P3",
        "P4",
        "P5",
        "N1",
        "N2",
        "N3",
        "N4",
        "N5",
    ]
    assert sum(case.expected_duplicate for case in cases) == 5


def test_parameter_grid_contains_every_declared_combination() -> None:
    """No tolerance or overlap threshold disappears from the experiment."""

    summaries, predictions = evaluate_parameter_grid()

    assert len(summaries) == (
        len(TOLERANCES_M)
        * len(OVERLAP_THRESHOLDS)
        * len(LENGTH_DIFFERENCE_THRESHOLDS)
    )
    assert len(predictions) == len(summaries) * len(build_calibration_cases())


def test_selection_prioritizes_zero_false_positives() -> None:
    """Safety-critical route preservation takes priority over raw accuracy."""

    selected = select_conservative_configuration(
        [
            {
                "accuracy": 1.0,
                "recall": 1.0,
                "false_positives": 1,
                "tolerance_m": 5.0,
                "overlap_threshold": 0.9,
                "maximum_length_difference_ratio": 0.05,
            },
            {
                "accuracy": 0.9,
                "recall": 0.8,
                "false_positives": 0,
                "tolerance_m": 3.0,
                "overlap_threshold": 0.95,
                "maximum_length_difference_ratio": 0.05,
            },
        ]
    )

    assert selected["false_positives"] == 0


def test_evaluation_writes_complete_public_artifacts(tmp_path: Path) -> None:
    """The experiment produces both complete result tables."""

    selected = run_evaluation(tmp_path)

    assert selected["false_positives"] == 0
    assert (tmp_path / "deduplicacion-espacial-parametros.csv").is_file()
    assert (tmp_path / "deduplicacion-espacial-predicciones.csv").is_file()
