"""Pure normalization utilities for declared preferences and evidence."""

from backend.domain import AccessibilityEvidence, EvidenceState, PreferenceWeights
from backend.scoring.models import NormalizedWeights

_UNKNOWN_COST = 0.5
_STATE_COST = {
    EvidenceState.FAVORABLE: 0.0,
    EvidenceState.UNFAVORABLE: 1.0,
    EvidenceState.UNKNOWN: _UNKNOWN_COST,
}


def normalize_weights(weights: PreferenceWeights) -> NormalizedWeights:
    """Normalize declared gradual weights without mutating the profile.

    Args:
        weights: Validated non-negative declared preference weights.

    Returns:
        A new weight object whose values sum to one.
    """

    values = weights.model_dump()
    total = sum(values.values())
    return NormalizedWeights(**{name: value / total for name, value in values.items()})


def evidence_cost(evidence: AccessibilityEvidence) -> float:
    """Convert tri-state evidence and coverage into a normalized cost.

    Uncovered evidence and explicitly unknown evidence use a neutral uncertainty
    cost of 0.5. Favorable evidence can only reduce the cost for the proportion
    of the route that it actually covers.

    Args:
        evidence: Validated state, coverage, and provenance for one attribute.

    Returns:
        Cost between zero and one.
    """

    observed_cost = _STATE_COST[evidence.state]
    return evidence.coverage_ratio * observed_cost + (1.0 - evidence.coverage_ratio) * _UNKNOWN_COST
