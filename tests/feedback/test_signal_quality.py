"""Tests for the structural information diagnostic."""

from backend.feedback import (
    ComparedRoute,
    PairwiseChoice,
    SignalQualityReason,
    assess_signal_quality,
)
from backend.feedback.learner import PREFERENCE_DIMENSIONS
from backend.scoring import RouteCosts


def _costs(values: list[float]) -> RouteCosts:
    """Build route costs in the documented dimension order."""

    return RouteCosts(**dict(zip(PREFERENCE_DIMENSIONS, values)))


def _varied_choices(count: int = 8) -> list[PairwiseChoice]:
    """Create distinct trade-offs spanning the nine preference dimensions."""

    choices: list[PairwiseChoice] = []
    chosen_values = [0.5] * len(PREFERENCE_DIMENSIONS)
    for choice_index in range(count):
        alternatives: list[ComparedRoute] = []
        for alternative_index in range(2):
            vector = chosen_values.copy()
            primary = (2 * choice_index + alternative_index) % len(vector)
            secondary = (primary + choice_index + 1) % len(vector)
            vector[primary] += 0.12 + choice_index * 0.005
            vector[secondary] -= 0.08
            alternatives.append(
                ComparedRoute(
                    route_id=f"alternative_{choice_index}_{alternative_index}",
                    costs=_costs(vector),
                )
            )
        choices.append(
            PairwiseChoice(
                chosen=ComparedRoute(
                    route_id=f"chosen_{choice_index}",
                    costs=_costs(chosen_values),
                ),
                unchosen=alternatives,
            )
        )
    return choices


def test_short_history_reports_every_relevant_reason() -> None:
    """A short history must not be mistaken for sufficient evidence."""

    assessment = assess_signal_quality([])

    assert not assessment.sufficient
    assert assessment.choice_count == 0
    assert assessment.pair_count == 0
    assert set(assessment.reasons) == set(SignalQualityReason)


def test_varied_history_meets_the_structural_thresholds() -> None:
    """Eight diverse choices should pass every documented condition."""

    assessment = assess_signal_quality(_varied_choices())

    assert assessment.sufficient
    assert assessment.choice_count == 8
    assert assessment.informative_pair_count == 16
    assert assessment.unique_comparison_count == 16
    assert len(assessment.active_dimensions) == 9
    assert assessment.comparison_rank >= 6
    assert assessment.reasons == []


def test_repeating_one_comparison_does_not_create_false_diversity() -> None:
    """Many copies of one comparison must remain structurally insufficient."""

    repeated = [_varied_choices(1)[0] for _ in range(60)]
    assessment = assess_signal_quality(repeated)

    assert not assessment.sufficient
    assert assessment.choice_count == 60
    assert assessment.unique_comparison_count == 2
    assert SignalQualityReason.TOO_FEW_UNIQUE_COMPARISONS in assessment.reasons
    assert SignalQualityReason.LOW_COMPARISON_RANK in assessment.reasons


def test_nearly_identical_routes_are_not_informative_pairs() -> None:
    """Tiny differences should be excluded before diversity is assessed."""

    chosen = ComparedRoute(route_id="chosen", costs=_costs([0.5] * 9))
    alternative = ComparedRoute(route_id="other", costs=_costs([0.505] * 9))
    choices = [
        PairwiseChoice(
            chosen=chosen.model_copy(update={"route_id": f"chosen_{index}"}),
            unchosen=[
                alternative.model_copy(update={"route_id": f"other_{index}"})
            ],
        )
        for index in range(20)
    ]

    assessment = assess_signal_quality(choices)

    assert assessment.informative_pair_count == 0
    assert SignalQualityReason.TOO_FEW_INFORMATIVE_PAIRS in assessment.reasons


def test_order_does_not_change_the_structural_assessment() -> None:
    """The diagnostic should summarize evidence, not its presentation order."""

    choices = _varied_choices()
    forward = assess_signal_quality(choices)
    backward = assess_signal_quality(list(reversed(choices)))

    assert forward == backward


def test_assessment_does_not_mutate_choice_costs() -> None:
    """A diagnostic must not alter the learning input or route costs."""

    choices = _varied_choices()
    before = [choice.model_dump() for choice in choices]

    assess_signal_quality(choices)

    assert [choice.model_dump() for choice in choices] == before
