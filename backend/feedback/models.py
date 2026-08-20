"""Validated models for local adaptive preference learning."""

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator

from backend.scoring.models import NormalizedWeights, RouteCosts, ScoringDimension


class FeedbackModel(BaseModel):
    """Base feedback model that rejects undocumented fields."""

    model_config = ConfigDict(extra="forbid")


class LearningConfig(FeedbackModel):
    """Bounded hyperparameters for one online preference learner."""

    learning_rate: float = Field(default=0.06, gt=0.0, le=1.0)
    inverse_temperature: float = Field(default=3.0, gt=0.0, le=50.0)
    regularization_strength: float = Field(default=0.05, ge=0.0, le=10.0)
    observation_choices: int = Field(default=3, ge=0, le=100)
    influence_step: float = Field(default=0.10, gt=0.0, le=0.50)
    maximum_influence: float = Field(default=0.50, gt=0.0, le=0.50)
    maximum_learned_update_l1: float = Field(default=0.12, gt=0.0, le=2.0)


class ComparedRoute(FeedbackModel):
    """Minimal route representation required to learn from one choice."""

    route_id: str = Field(min_length=1, max_length=64)
    costs: RouteCosts


class PairwiseChoice(FeedbackModel):
    """Explicitly chosen route and the accepted alternatives not selected."""

    chosen: ComparedRoute
    unchosen: list[ComparedRoute] = Field(min_length=1, max_length=2)

    @model_validator(mode="after")
    def require_unique_routes(self) -> "PairwiseChoice":
        """Reject repeated alternatives and self-comparisons.

        Returns:
            The validated explicit choice.

        Raises:
            ValueError: If a route identifier appears more than once.
        """

        route_ids = [self.chosen.route_id]
        route_ids.extend(route.route_id for route in self.unchosen)
        if len(route_ids) != len(set(route_ids)):
            raise ValueError("pairwise choices require unique route identifiers")
        return self


class LearningUpdateStatus(str, Enum):
    """Effect that one explicit choice has on the effective ranking weights."""

    DISABLED = "disabled"
    OBSERVATION = "observation"
    INFLUENTIAL = "influential"


class SignalQualityReason(str, Enum):
    """Explain why a choice history is not yet structurally informative."""

    TOO_FEW_CHOICES = "too_few_choices"
    TOO_FEW_INFORMATIVE_PAIRS = "too_few_informative_pairs"
    TOO_FEW_UNIQUE_COMPARISONS = "too_few_unique_comparisons"
    TOO_FEW_ACTIVE_DIMENSIONS = "too_few_active_dimensions"
    LOW_COMPARISON_RANK = "low_comparison_rank"


class SignalQualityConfig(FeedbackModel):
    """Conservative thresholds for structural choice-history diagnostics."""

    minimum_choices: int = Field(default=8, ge=1, le=200)
    minimum_pair_l1: float = Field(default=0.10, gt=0.0, le=9.0)
    minimum_informative_pairs: int = Field(default=12, ge=1, le=400)
    minimum_unique_comparisons: int = Field(default=12, ge=1, le=400)
    minimum_dimension_contrast: float = Field(default=0.03, gt=0.0, le=1.0)
    minimum_active_dimensions: int = Field(default=6, ge=1, le=9)
    minimum_comparison_rank: int = Field(default=6, ge=1, le=9)
    signature_decimals: int = Field(default=3, ge=1, le=9)


class SignalQualityAssessment(FeedbackModel):
    """Auditable structural summary of explicit accepted-route choices."""

    sufficient: bool
    choice_count: int = Field(ge=0)
    pair_count: int = Field(ge=0)
    informative_pair_count: int = Field(ge=0)
    unique_comparison_count: int = Field(ge=0)
    active_dimensions: list[ScoringDimension]
    comparison_rank: int = Field(ge=0, le=9)
    reasons: list[SignalQualityReason]


class PreferenceLearningState(FeedbackModel):
    """Complete, serializable state of one local preference learner."""

    declared_weights: NormalizedWeights
    learned_weights: NormalizedWeights
    effective_weights: NormalizedWeights
    choice_count: int = Field(default=0, ge=0)
    enabled: bool = False
    config: LearningConfig = Field(default_factory=LearningConfig)

    @model_validator(mode="after")
    def require_consistent_effective_weights(self) -> "PreferenceLearningState":
        """Ensure effective weights match the documented mixing schedule.

        Returns:
            The validated learning state.

        Raises:
            ValueError: If effective weights are inconsistent with the state.
        """

        if not self.enabled or self.choice_count <= self.config.observation_choices:
            influence = 0.0
        else:
            influence = min(
                self.config.maximum_influence,
                (self.choice_count - self.config.observation_choices)
                * self.config.influence_step,
            )

        declared = self.declared_weights.model_dump()
        learned = self.learned_weights.model_dump()
        effective = self.effective_weights.model_dump()
        expected = {
            name: (1.0 - influence) * declared[name] + influence * learned[name]
            for name in declared
        }
        if any(abs(effective[name] - expected[name]) > 1e-9 for name in expected):
            raise ValueError("effective weights do not match the learning schedule")
        return self


class WeightChange(FeedbackModel):
    """Auditable before-and-after values for one preference dimension."""

    dimension: ScoringDimension
    learned_before: float = Field(ge=0.0, le=1.0)
    learned_after: float = Field(ge=0.0, le=1.0)
    effective_before: float = Field(ge=0.0, le=1.0)
    effective_after: float = Field(ge=0.0, le=1.0)


class PreferenceUpdate(FeedbackModel):
    """Traceable result of applying one explicit route choice."""

    status: LearningUpdateStatus
    previous_state: PreferenceLearningState
    updated_state: PreferenceLearningState
    pairs_used: int = Field(ge=0)
    mean_choice_probability_before: float = Field(ge=0.0, le=1.0)
    mean_choice_probability_after: float = Field(ge=0.0, le=1.0)
    mean_pairwise_logistic_loss_before: float = Field(ge=0.0)
    mean_pairwise_logistic_loss_after: float = Field(ge=0.0)
    learned_change_l1: float = Field(ge=0.0, le=2.0)
    effective_change_l1: float = Field(ge=0.0, le=2.0)
    changes: list[WeightChange]
