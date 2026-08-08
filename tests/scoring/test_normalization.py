"""Tests for preference and evidence normalization."""

import pytest

from backend.domain import AccessibilityEvidence, EvidenceState, PreferenceWeights
from backend.scoring import evidence_cost, normalize_weights


def test_normalized_weights_sum_to_one_and_preserve_proportions() -> None:
    """Normalization must preserve intent without mutating declared values."""

    declared = PreferenceWeights(
        distance=2.0,
        complex_crossings=1.0,
        crossing_support=1.0,
        sidewalk_evidence=0.0,
        steps=0.0,
        surface=0.0,
        orientation_complexity=0.0,
        slope=0.0,
        uncertainty=0.0,
    )

    normalized = normalize_weights(declared)

    assert sum(normalized.model_dump().values()) == pytest.approx(1.0)
    assert normalized.distance == pytest.approx(0.5)
    assert normalized.complex_crossings == pytest.approx(0.25)
    assert normalized.crossing_support == pytest.approx(0.25)
    assert declared.distance == 2.0


def test_favorable_evidence_only_reduces_cost_for_covered_portion() -> None:
    """Missing coverage cannot be silently treated as favorable evidence."""

    full = AccessibilityEvidence(state=EvidenceState.FAVORABLE, coverage_ratio=1.0)
    partial = AccessibilityEvidence(state=EvidenceState.FAVORABLE, coverage_ratio=0.4)

    assert evidence_cost(full) == pytest.approx(0.0)
    assert evidence_cost(partial) == pytest.approx(0.3)


def test_unknown_evidence_never_improves_a_favorable_attribute() -> None:
    """Unknown evidence must cost at least as much as favorable evidence."""

    favorable = AccessibilityEvidence(state=EvidenceState.FAVORABLE, coverage_ratio=0.8)
    unknown = AccessibilityEvidence(state=EvidenceState.UNKNOWN, coverage_ratio=0.8)

    assert evidence_cost(unknown) == pytest.approx(0.5)
    assert evidence_cost(unknown) > evidence_cost(favorable)


def test_unfavorable_evidence_costs_more_as_coverage_increases() -> None:
    """Confirmed adverse coverage must increase rather than dilute its cost."""

    partial = AccessibilityEvidence(state=EvidenceState.UNFAVORABLE, coverage_ratio=0.4)
    full = AccessibilityEvidence(state=EvidenceState.UNFAVORABLE, coverage_ratio=1.0)

    assert evidence_cost(partial) == pytest.approx(0.7)
    assert evidence_cost(full) == pytest.approx(1.0)
    assert evidence_cost(full) > evidence_cost(partial)
