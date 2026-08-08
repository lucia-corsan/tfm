"""Deterministic scoring factors and evidence warnings for presentation."""

from collections.abc import Sequence
from statistics import fmean

from backend.domain import EvidenceState, RouteCandidate
from backend.scoring.models import (
    ReasonKind,
    RouteReason,
    RouteScore,
    RouteWarning,
    ScoringDimension,
)

_MAX_REASONS = 3
_LOW_COST_THRESHOLD = 0.5
_ADVANTAGE_EPSILON = 1e-12


def build_route_reasons(
    score: RouteScore,
    other_scores: Sequence[RouteScore],
) -> list[RouteReason]:
    """Select up to three factors grounded in costs and active weights.

    Args:
        score: Score whose explanatory factors are required.
        other_scores: Other accepted alternatives used for relative comparison.

    Returns:
        Deterministically ordered traceable scoring factors.
    """

    weights = score.normalized_weights.model_dump()
    costs = score.costs.model_dump()
    contributions = score.contributions.model_dump()
    active_dimensions = [name for name, weight in weights.items() if weight > 0.0]
    relative_candidates: list[tuple[float, RouteReason]] = []

    if other_scores:
        other_costs = [other.costs.model_dump() for other in other_scores]
        for name in active_dimensions:
            comparison_cost = fmean(values[name] for values in other_costs)
            advantage = comparison_cost - costs[name]
            if advantage > _ADVANTAGE_EPSILON:
                relative_candidates.append(
                    (
                        advantage * weights[name],
                        RouteReason(
                            kind=ReasonKind.RELATIVE_ADVANTAGE,
                            dimension=ScoringDimension(name),
                            cost=costs[name],
                            contribution=contributions[name],
                            comparison_cost=comparison_cost,
                        ),
                    )
                )

    if relative_candidates:
        relative_candidates.sort(key=lambda item: (-item[0], item[1].dimension.value))
        return [reason for _, reason in relative_candidates[:_MAX_REASONS]]

    absolute_candidates = sorted(
        active_dimensions,
        key=lambda name: (costs[name], contributions[name], name),
    )
    low_cost_dimensions = [
        name for name in absolute_candidates if costs[name] <= _LOW_COST_THRESHOLD
    ]
    selected = low_cost_dimensions or absolute_candidates[:1]
    kind = (
        ReasonKind.LOW_ABSOLUTE_COST
        if low_cost_dimensions
        else ReasonKind.LEAST_COSTLY_ACTIVE_FACTOR
    )
    return [
        RouteReason(
            kind=kind,
            dimension=ScoringDimension(name),
            cost=costs[name],
            contribution=contributions[name],
        )
        for name in selected[:_MAX_REASONS]
    ]


def build_route_warnings(route: RouteCandidate) -> list[RouteWarning]:
    """Expose every unknown or unfavorable thematic evidence item.

    Args:
        route: Candidate whose evidence limitations must be presented.

    Returns:
        Stable warnings ordered by accessibility attribute identifier.
    """

    warnings = [
        RouteWarning(
            attribute=attribute,
            state=evidence.state,
            coverage_ratio=evidence.coverage_ratio,
            note=evidence.note,
        )
        for attribute, evidence in route.features.evidence_by_attribute().items()
        if evidence.state is not EvidenceState.FAVORABLE
    ]
    return sorted(warnings, key=lambda warning: warning.attribute.value)
