"""Pure diagnostics for the structural information in route choices."""

from collections.abc import Sequence
from typing import Optional

from backend.feedback.learner import PREFERENCE_DIMENSIONS
from backend.feedback.models import (
    PairwiseChoice,
    SignalQualityAssessment,
    SignalQualityConfig,
    SignalQualityReason,
)
from backend.scoring import ScoringDimension


def _difference_vectors(choices: Sequence[PairwiseChoice]) -> list[list[float]]:
    """Return unchosen-minus-chosen costs in the canonical dimension order."""

    vectors: list[list[float]] = []
    for choice in choices:
        chosen = choice.chosen.costs.model_dump()
        for alternative in choice.unchosen:
            unchosen = alternative.costs.model_dump()
            vectors.append(
                [unchosen[name] - chosen[name] for name in PREFERENCE_DIMENSIONS]
            )
    return vectors


def _l1_norm(values: Sequence[float]) -> float:
    """Return the sum of absolute components in one difference vector."""

    return sum(abs(value) for value in values)


def _matrix_rank(rows: Sequence[Sequence[float]], tolerance: float = 1e-10) -> int:
    """Calculate a small matrix rank with deterministic Gaussian elimination."""

    if not rows:
        return 0
    matrix = [list(row) for row in rows]
    row_count = len(matrix)
    column_count = len(matrix[0])
    rank = 0
    for column in range(column_count):
        pivot = max(range(rank, row_count), key=lambda index: abs(matrix[index][column]))
        if abs(matrix[pivot][column]) <= tolerance:
            continue
        matrix[rank], matrix[pivot] = matrix[pivot], matrix[rank]
        pivot_value = matrix[rank][column]
        matrix[rank] = [value / pivot_value for value in matrix[rank]]
        for row_index in range(row_count):
            if row_index == rank:
                continue
            factor = matrix[row_index][column]
            if abs(factor) <= tolerance:
                continue
            matrix[row_index] = [
                value - factor * pivot_component
                for value, pivot_component in zip(matrix[row_index], matrix[rank])
            ]
        rank += 1
        if rank == row_count:
            break
    return rank


def assess_signal_quality(
    choices: Sequence[PairwiseChoice],
    config: Optional[SignalQualityConfig] = None,
) -> SignalQualityAssessment:
    """Assess whether accepted-route choices contain varied cost contrasts.

    Args:
        choices: Explicit selections and accepted alternatives not chosen.
        config: Conservative structural thresholds fixed for the assessment.

    Returns:
        Counts, active dimensions, matrix rank, and every unmet condition.
    """

    resolved_config = config or SignalQualityConfig()
    vectors = _difference_vectors(choices)
    informative = [
        vector
        for vector in vectors
        if _l1_norm(vector) >= resolved_config.minimum_pair_l1
    ]
    signatures = {
        tuple(round(value, resolved_config.signature_decimals) for value in vector)
        for vector in informative
    }
    active_dimensions = [
        ScoringDimension(name)
        for index, name in enumerate(PREFERENCE_DIMENSIONS)
        if any(
            abs(vector[index]) >= resolved_config.minimum_dimension_contrast
            for vector in informative
        )
    ]
    comparison_rank = _matrix_rank(informative)

    reasons: list[SignalQualityReason] = []
    if len(choices) < resolved_config.minimum_choices:
        reasons.append(SignalQualityReason.TOO_FEW_CHOICES)
    if len(informative) < resolved_config.minimum_informative_pairs:
        reasons.append(SignalQualityReason.TOO_FEW_INFORMATIVE_PAIRS)
    if len(signatures) < resolved_config.minimum_unique_comparisons:
        reasons.append(SignalQualityReason.TOO_FEW_UNIQUE_COMPARISONS)
    if len(active_dimensions) < resolved_config.minimum_active_dimensions:
        reasons.append(SignalQualityReason.TOO_FEW_ACTIVE_DIMENSIONS)
    if comparison_rank < resolved_config.minimum_comparison_rank:
        reasons.append(SignalQualityReason.LOW_COMPARISON_RANK)

    return SignalQualityAssessment(
        sufficient=not reasons,
        choice_count=len(choices),
        pair_count=len(vectors),
        informative_pair_count=len(informative),
        unique_comparison_count=len(signatures),
        active_dimensions=active_dimensions,
        comparison_rank=comparison_rank,
        reasons=reasons,
    )
