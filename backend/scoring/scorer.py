"""Explainable adequacy, confidence, and uncertainty calculations."""

from statistics import fmean
from typing import Optional

from backend.domain import EvidenceState, MobilityProfile, PreferenceWeights, RouteCandidate
from backend.scoring.costs import compute_route_costs
from backend.scoring.models import RouteCosts, RouteScore
from backend.scoring.normalization import normalize_weights


def score_route(
    profile: MobilityProfile,
    route: RouteCandidate,
    effective_weights: Optional[PreferenceWeights] = None,
) -> RouteScore:
    """Score gradual route adequacy and evidence quality for one profile.

    Critical constraints are intentionally evaluated outside this function. This
    keeps gradual preference calculations unable to compensate for a confirmed
    safety violation.

    Args:
        profile: Declared gradual preferences and separate critical restrictions.
        route: Validated candidate route with explicit evidence.
        effective_weights: Optional explicit weights after local adaptation. If
            omitted, the profile's declared preferences are used.

    Returns:
        Adequacy inputs, confidence, and uncertainty for the candidate.
    """

    normalized_weights = normalize_weights(effective_weights or profile.declared_weights)
    costs = compute_route_costs(route)
    weight_values = normalized_weights.model_dump()
    cost_values = costs.model_dump()
    contributions = RouteCosts(
        **{name: weight_values[name] * cost for name, cost in cost_values.items()}
    )
    confidence = fmean(
        evidence.coverage_ratio if evidence.state is not EvidenceState.UNKNOWN else 0.0
        for evidence in route.features.evidence_by_attribute().values()
    )

    return RouteScore(
        route_id=route.route_id,
        normalized_weights=normalized_weights,
        costs=costs,
        contributions=contributions,
        confidence=confidence,
        uncertainty=route.uncertainty.unknown_ratio,
    )
