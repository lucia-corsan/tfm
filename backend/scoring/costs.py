"""Transform validated route features into normalized gradual costs."""

from statistics import fmean

from backend.domain import RouteCandidate
from backend.scoring.models import RouteCosts
from backend.scoring.normalization import evidence_cost

_MAX_CROSSING_COUNT = 20
_MAX_INSTRUCTION_COUNT = 20
_MAX_TURN_COUNT = 15
_MAX_SLOPE_PERCENT = 30.0


def _bounded_ratio(value: float, maximum: float) -> float:
    """Return a non-negative ratio capped at one."""

    return min(max(value / maximum, 0.0), 1.0)


def compute_route_costs(route: RouteCandidate) -> RouteCosts:
    """Compute reproducible costs for one unscored candidate route.

    Args:
        route: Validated route with numeric features and thematic evidence.

    Returns:
        One normalized cost for every gradual preference dimension.
    """

    features = route.features
    complex_crossing_ratio = (
        features.complex_crossing_count / features.crossing_count
        if features.crossing_count
        else 0.0
    )
    crossing_burden = fmean(
        [
            _bounded_ratio(features.crossing_count, _MAX_CROSSING_COUNT),
            complex_crossing_ratio,
        ]
    )
    crossing_support = fmean(
        evidence_cost(evidence)
        for evidence in (
            features.crossing_compatibility,
            features.traffic_signals,
            features.audible_signals,
            features.tactile_paving,
            features.kerb,
        )
    )
    sidewalk_evidence = fmean(
        evidence_cost(evidence) for evidence in (features.sidewalk, features.pedestrian_access)
    )
    step_free = fmean(
        evidence_cost(evidence) for evidence in (features.step_free, features.ramp_access)
    )
    orientation_complexity = fmean(
        [
            _bounded_ratio(features.instruction_count, _MAX_INSTRUCTION_COUNT),
            _bounded_ratio(features.turn_count, _MAX_TURN_COUNT),
        ]
    )
    slope_components = [evidence_cost(features.slope)]
    if features.maximum_slope_percent is not None:
        slope_components.append(_bounded_ratio(features.maximum_slope_percent, _MAX_SLOPE_PERCENT))

    return RouteCosts(
        distance=(features.detour_ratio - 1.0) / 2.0,
        complex_crossings=crossing_burden,
        crossing_support=crossing_support,
        sidewalk_evidence=sidewalk_evidence,
        steps=step_free,
        surface=evidence_cost(features.surface),
        orientation_complexity=orientation_complexity,
        slope=fmean(slope_components),
        uncertainty=route.uncertainty.unknown_ratio,
    )
