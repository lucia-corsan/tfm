"""Deterministic profile-aware ranking for route alternatives."""

from collections.abc import Sequence

from backend.domain import MobilityProfile, RouteCandidate
from backend.scoring.constraints import evaluate_constraints
from backend.scoring.explanations import build_route_reasons, build_route_warnings
from backend.scoring.models import RankedRoute, RejectedRoute, RouteRanking, RouteScore
from backend.scoring.scorer import score_route


def rank_routes(
    profile: MobilityProfile,
    routes: Sequence[RouteCandidate],
) -> RouteRanking:
    """Apply critical constraints and rank accepted routes reproducibly.

    Args:
        profile: Critical restrictions and gradual preferences to apply.
        routes: One to three validated candidate alternatives.

    Returns:
        Accepted ranked routes and separately rejected candidates.
    """

    accepted: list[tuple[RouteCandidate, RouteScore]] = []
    rejected: list[RejectedRoute] = []

    for route in routes:
        constraint_result = evaluate_constraints(profile, route)
        if constraint_result.accepted:
            accepted.append((route, score_route(profile, route)))
        else:
            rejected.append(
                RejectedRoute(route_id=route.route_id, violations=constraint_result.violations)
            )

    accepted.sort(
        key=lambda item: (
            -item[1].adequacy,
            -item[1].confidence,
            item[1].uncertainty,
            item[0].features.distance_m,
            item[0].route_id,
        )
    )
    scores = [score for _, score in accepted]
    ranked = [
        RankedRoute(
            route_id=route.route_id,
            rank=index,
            score=score,
            reasons=build_route_reasons(
                score,
                [other_score for other_score in scores if other_score.route_id != score.route_id],
            ),
            warnings=build_route_warnings(route),
        )
        for index, (route, score) in enumerate(accepted, start=1)
    ]

    return RouteRanking(
        profile_id=profile.profile_id,
        routes=ranked,
        rejected_routes=rejected,
    )
