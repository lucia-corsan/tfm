"""Reproducibility tests for EXP-008."""

from backend.feedback import SignalQualityReason
from ml.adaptive_preferences.real_routes_evaluation import load_cost_records
from ml.adaptive_preferences.signal_quality_evaluation import (
    CHECKPOINTS,
    evaluate_signal_quality,
    summarize_results,
)


def test_signal_evaluation_is_deterministic_and_complete() -> None:
    """Every fixed profile, seed, bank, and checkpoint must be represented."""

    records = evaluate_signal_quality(load_cost_records())
    repeated = evaluate_signal_quality(load_cost_records())

    assert records == repeated
    assert len(records) == 4 * 20 * len(CHECKPOINTS) * 2
    assert {record.dataset for record in records} == {
        "synthetic_informative",
        "real_limited",
    }


def test_structural_rule_separates_the_contrasting_banks_after_eight_choices() -> None:
    """The fixed rule should accept informative and reject limited histories."""

    records = evaluate_signal_quality(load_cost_records())
    after_minimum = [record for record in records if record.choice_count >= 8]
    synthetic = [
        record for record in after_minimum if record.dataset == "synthetic_informative"
    ]
    real = [record for record in after_minimum if record.dataset == "real_limited"]

    assert all(record.structural_sufficient for record in synthetic)
    assert all(not record.structural_sufficient for record in real)
    assert all(record.active_dimension_count == 5 for record in real)
    assert all(
        SignalQualityReason.TOO_FEW_ACTIVE_DIMENSIONS in record.reasons
        for record in real
    )


def test_count_only_baseline_accepts_both_banks() -> None:
    """Eight repeated choices expose the weakness of the count-only rule."""

    records = evaluate_signal_quality(load_cost_records())
    at_eight = [record for record in records if record.choice_count == 8]

    assert all(record.naive_sufficient for record in at_eight)
    assert {record.structural_sufficient for record in at_eight} == {False, True}


def test_summary_keeps_eighty_histories_per_bank_and_checkpoint() -> None:
    """Aggregates must not mistake profile-seed combinations for new streets."""

    summary = summarize_results(evaluate_signal_quality(load_cost_records()))

    assert len(summary) == len(CHECKPOINTS) * 2
    assert all(row["history_count"] == 80 for row in summary)
