"""Explainable scoring and safety constraints for accessible routes."""

from backend.scoring.constraints import evaluate_constraints
from backend.scoring.costs import compute_route_costs
from backend.scoring.explanations import build_route_reasons, build_route_warnings
from backend.scoring.models import (
    ConstraintCode,
    ConstraintEvaluation,
    ConstraintViolation,
    NormalizedWeights,
    RankedRoute,
    ReasonKind,
    RejectedRoute,
    RouteCosts,
    RouteRanking,
    RouteReason,
    RouteScore,
    RouteWarning,
    ScoringDimension,
)
from backend.scoring.normalization import evidence_cost, normalize_weights
from backend.scoring.ranking import rank_routes
from backend.scoring.scorer import score_route

__all__ = [
    "ConstraintCode",
    "ConstraintEvaluation",
    "ConstraintViolation",
    "NormalizedWeights",
    "RankedRoute",
    "ReasonKind",
    "RejectedRoute",
    "RouteCosts",
    "RouteRanking",
    "RouteReason",
    "RouteScore",
    "RouteWarning",
    "ScoringDimension",
    "build_route_reasons",
    "build_route_warnings",
    "compute_route_costs",
    "evidence_cost",
    "evaluate_constraints",
    "normalize_weights",
    "rank_routes",
    "score_route",
]
