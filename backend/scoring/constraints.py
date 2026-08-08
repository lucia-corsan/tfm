"""Pure safety-constraint evaluation for route candidates."""

from backend.domain import EvidenceState, MobilityProfile, RouteCandidate
from backend.scoring.models import (
    ConstraintCode,
    ConstraintEvaluation,
    ConstraintViolation,
)


def evaluate_constraints(
    profile: MobilityProfile,
    route: RouteCandidate,
) -> ConstraintEvaluation:
    """Evaluate confirmed critical incompatibilities for one route.

    Unknown evidence never creates a violation because it does not confirm that
    a barrier exists. It is handled later through confidence and uncertainty.

    Args:
        profile: Local mobility restrictions declared by the user.
        route: Validated candidate route to evaluate.

    Returns:
        Stable violation codes and values for every failed restriction.
    """

    features = route.features
    violations: list[ConstraintViolation] = []

    has_confirmed_steps = (
        features.step_free.state is EvidenceState.UNFAVORABLE
        or features.step_count is not None
        and features.step_count > 0
    )
    if profile.avoid_steps and has_confirmed_steps:
        violations.append(
            ConstraintViolation(
                code=ConstraintCode.STEPS,
                actual_value=float(features.step_count)
                if features.step_count is not None
                else None,
            )
        )

    if (
        profile.require_pedestrian_access
        and features.pedestrian_access.state is EvidenceState.UNFAVORABLE
    ):
        violations.append(ConstraintViolation(code=ConstraintCode.PEDESTRIAN_ACCESS))

    if (
        profile.avoid_incompatible_crossings
        and features.crossing_compatibility.state is EvidenceState.UNFAVORABLE
    ):
        violations.append(ConstraintViolation(code=ConstraintCode.INCOMPATIBLE_CROSSINGS))

    if (
        profile.maximum_slope_percent is not None
        and features.maximum_slope_percent is not None
        and features.maximum_slope_percent > profile.maximum_slope_percent
    ):
        violations.append(
            ConstraintViolation(
                code=ConstraintCode.MAXIMUM_SLOPE,
                actual_value=features.maximum_slope_percent,
                limit_value=profile.maximum_slope_percent,
            )
        )

    if features.detour_ratio > profile.maximum_detour_ratio:
        violations.append(
            ConstraintViolation(
                code=ConstraintCode.MAXIMUM_DETOUR,
                actual_value=features.detour_ratio,
                limit_value=profile.maximum_detour_ratio,
            )
        )

    return ConstraintEvaluation(violations=violations)
