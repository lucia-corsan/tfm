"""Tests for critical route constraints."""

from backend.domain import AccessibilityEvidence, EvidenceState, MobilityProfile
from backend.routing.fixtures import load_pilot_route_scenario
from backend.scoring import ConstraintCode, evaluate_constraints


def test_default_profile_rejects_only_confirmed_incompatible_crossings() -> None:
    """The default profile rejects the fixture with a confirmed crossing issue."""

    scenario = load_pilot_route_scenario()
    profile = MobilityProfile(profile_id="default")

    results = {route.route_id: evaluate_constraints(profile, route) for route in scenario.routes}

    assert results["balanced_route"].accepted
    assert results["fewer_crossings_route"].accepted
    assert not results["simple_route"].accepted
    assert [violation.code for violation in results["simple_route"].violations] == [
        ConstraintCode.INCOMPATIBLE_CROSSINGS
    ]


def test_confirmed_steps_are_critical_when_profile_avoids_them() -> None:
    """Known steps cannot be compensated by favorable route characteristics."""

    route = load_pilot_route_scenario().routes[0]
    features = route.features.model_copy(
        update={
            "step_count": 2,
            "step_free": AccessibilityEvidence(
                state=EvidenceState.UNFAVORABLE,
                coverage_ratio=1.0,
                sources=[],
            ),
        }
    )
    route_with_steps = route.model_copy(update={"features": features})

    result = evaluate_constraints(MobilityProfile(profile_id="no_steps"), route_with_steps)

    assert not result.accepted
    assert result.violations[0].code is ConstraintCode.STEPS
    assert result.violations[0].actual_value == 2.0


def test_confirmed_missing_pedestrian_access_rejects_route() -> None:
    """Confirmed lack of pedestrian access fails the corresponding restriction."""

    route = load_pilot_route_scenario().routes[0]
    features = route.features.model_copy(
        update={
            "pedestrian_access": AccessibilityEvidence(
                state=EvidenceState.UNFAVORABLE,
                coverage_ratio=1.0,
                sources=[],
            )
        }
    )
    inaccessible_route = route.model_copy(update={"features": features})

    result = evaluate_constraints(MobilityProfile(profile_id="pedestrian"), inaccessible_route)

    assert not result.accepted
    assert result.violations[0].code is ConstraintCode.PEDESTRIAN_ACCESS


def test_known_slope_above_profile_limit_rejects_route() -> None:
    """A measured slope above the declared maximum is a critical violation."""

    route = load_pilot_route_scenario().routes[0]
    profile = MobilityProfile(profile_id="slope_limit", maximum_slope_percent=6.0)

    result = evaluate_constraints(profile, route)

    assert not result.accepted
    assert result.violations[0].code is ConstraintCode.MAXIMUM_SLOPE
    assert result.violations[0].actual_value == 7.0
    assert result.violations[0].limit_value == 6.0


def test_route_above_detour_limit_is_rejected() -> None:
    """A route cannot exceed the maximum detour declared by the user."""

    route = load_pilot_route_scenario().routes[1]
    profile = MobilityProfile(profile_id="short_detour", maximum_detour_ratio=1.1)

    result = evaluate_constraints(profile, route)

    assert not result.accepted
    assert result.violations[0].code is ConstraintCode.MAXIMUM_DETOUR
    assert result.violations[0].actual_value == 1.18
    assert result.violations[0].limit_value == 1.1


def test_unknown_slope_does_not_create_confirmed_violation() -> None:
    """Missing slope evidence remains uncertainty instead of becoming a barrier."""

    route = load_pilot_route_scenario().routes[1]
    profile = MobilityProfile(profile_id="unknown_slope", maximum_slope_percent=6.0)

    result = evaluate_constraints(profile, route)

    assert result.accepted
    assert result.violations == []


def test_disabled_restrictions_keep_known_issues_as_gradual_costs() -> None:
    """A profile may keep a candidate when the corresponding rule is disabled."""

    route = load_pilot_route_scenario().routes[2]
    profile = MobilityProfile(
        profile_id="permissive",
        avoid_steps=False,
        avoid_incompatible_crossings=False,
    )

    result = evaluate_constraints(profile, route)

    assert result.accepted
