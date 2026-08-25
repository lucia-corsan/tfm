"""Evaluate adaptive learning with profiles produced by the real questionnaire."""

import csv
import logging
import math
import random
import statistics
from collections import defaultdict
from collections.abc import Sequence
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from backend.domain import MobilityProfile, PreferenceWeights
from backend.feedback import (
    PREFERENCE_DIMENSIONS,
    ComparedRoute,
    PairwiseChoice,
    initialize_learning,
    update_preferences,
)
from backend.scoring import normalize_weights
from ml.adaptive_preferences.evaluation import (
    CHECKPOINTS,
    CurvePoint,
    SyntheticProfile,
    run_simulation,
)
from ml.adaptive_preferences.real_routes_evaluation import (
    EVALUATION_SEEDS,
    MODEL_LABELS,
    REAL_ROUTE_LEARNING_CONFIG,
    RealRouteCostRecord,
    _balanced_training_sequence,
    _best_route_index,
    _evaluate_model,
    _shortest_route_index,
    _weighted_cost,
    load_cost_records,
)

LOGGER = logging.getLogger(__name__)

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
SHARED_CASES_PATH = REPOSITORY_ROOT / "shared" / "onboarding-questionnaire-evaluation.json"
ARTIFACTS_DIR = REPOSITORY_ROOT / "docs" / "evaluation" / "artifacts"
FIGURES_DIR = REPOSITORY_ROOT / "docs" / "figures"
PROFILES_PATH = ARTIFACTS_DIR / "aprendizaje-cuestionario-perfiles.csv"
RUNS_PATH = ARTIFACTS_DIR / "aprendizaje-cuestionario-ejecuciones.csv"
SUMMARY_PATH = ARTIFACTS_DIR / "aprendizaje-cuestionario-resumen.csv"
COMPARISONS_PATH = ARTIFACTS_DIR / "aprendizaje-cuestionario-comparaciones.csv"
AVAILABILITY_PATH = ARTIFACTS_DIR / "aprendizaje-cuestionario-disponibilidad.csv"
FIGURE_PATH = FIGURES_DIR / "aprendizaje-cuestionario.png"

QUESTIONNAIRE_SCHEMA_VERSION = "onboarding-questionnaire-evaluation-v1"
TRAINING_CHOICES = 60
EVALUATION_SETS = 160
NOISE = 0.10
CONDITIONS = ("exact", "latent_refinement")
BANK_LABELS = {
    "synthetic_informative": "Situaciones sintéticas informativas",
    "real_limited": "Rutas ORS+OSM limitadas",
}
CONDITION_LABELS = {
    "exact": "Cuestionario coherente",
    "latent_refinement": "Preferencia fina no expresada",
}


class EvaluationModel(BaseModel):
    """Strict base model for versioned questionnaire evaluation records."""

    model_config = ConfigDict(extra="forbid")


class QuestionnaireAnswers(EvaluationModel):
    """Complete answers required by the fourteen-question onboarding flow."""

    adaptiveLearning: bool
    detour: Literal["ten", "twentyFive", "fifty", "double"]
    presentation: Literal["system", "largeText", "highContrast", "both"]
    profileMode: Literal["personalized"]
    priorities: dict[str, Literal["none", "low", "medium", "high"]]
    speech: Literal["automatic", "onDemand", "never"]
    speechRate: Literal["slow", "normal", "fast", "very_fast"]
    steps: Literal["exclude", "avoid", "inform"]

    @model_validator(mode="after")
    def require_all_route_priorities(self) -> "QuestionnaireAnswers":
        """Reject fixtures that omit or invent one route-ranking question."""

        expected = set(PREFERENCE_DIMENSIONS) - {"steps"}
        if set(self.priorities) != expected:
            raise ValueError("questionnaire priorities do not match ranking dimensions")
        return self


class QuestionnaireCase(EvaluationModel):
    """One complete mathematical questionnaire configuration."""

    profile_id: str = Field(pattern=r"^questionnaire_[a-z_]+$")
    name: str = Field(min_length=1)
    answers: QuestionnaireAnswers
    expected_profile: MobilityProfile
    latent_refinement_weights: PreferenceWeights


class QuestionnaireFixture(EvaluationModel):
    """Versioned collection shared with the production TypeScript mapper."""

    schema_version: str
    description: str = Field(min_length=1)
    profiles: tuple[QuestionnaireCase, ...] = Field(min_length=4, max_length=4)

    @model_validator(mode="after")
    def require_unique_profiles(self) -> "QuestionnaireFixture":
        """Require the frozen schema and four unique mathematical cases."""

        if self.schema_version != QUESTIONNAIRE_SCHEMA_VERSION:
            raise ValueError("unexpected questionnaire evaluation schema")
        identifiers = [profile.profile_id for profile in self.profiles]
        if len(identifiers) != len(set(identifiers)):
            raise ValueError("questionnaire evaluation profiles must be unique")
        return self


class QuestionnaireRun(EvaluationModel):
    """One model result at one learning checkpoint."""

    bank: Literal["synthetic_informative", "real_limited"]
    bank_label: str
    condition: Literal["exact", "latent_refinement"]
    condition_label: str
    profile_id: str
    seed: int
    model: Literal["shortest", "fixed", "adaptive"]
    model_label: str
    choice_count: int = Field(ge=0)
    training_scenario_count: int = Field(ge=1)
    evaluation_scenario_count: int = Field(ge=1)
    top1_accuracy: float = Field(ge=0.0, le=1.0)
    pairwise_accuracy: float = Field(ge=0.0, le=1.0)
    mean_regret: float = Field(ge=0.0)
    cumulative_training_regret: float = Field(ge=0.0)
    maximum_learned_jump_l1: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    maximum_effective_jump_l1: Optional[float] = Field(default=None, ge=0.0, le=2.0)


PRIORITY_VALUES = {"none": 0.0, "low": 1.0, "medium": 2.0, "high": 3.0}
DETOUR_RATIOS = {"ten": 1.10, "twentyFive": 1.25, "fifty": 1.50, "double": 2.0}


def build_profile_from_answers(answers: QuestionnaireAnswers) -> MobilityProfile:
    """Mirror the production questionnaire mapping for independent validation."""

    raw_weights = {
        name: PRIORITY_VALUES[answers.priorities[name]]
        for name in PREFERENCE_DIMENSIONS
        if name != "steps"
    }
    raw_weights["steps"] = 0.0 if answers.steps == "inform" else 3.0
    if sum(raw_weights.values()) == 0.0:
        raw_weights = {name: 1.0 for name in PREFERENCE_DIMENSIONS}
    return MobilityProfile(
        profile_id="onboarding_profile",
        avoid_steps=answers.steps == "exclude",
        require_pedestrian_access=True,
        avoid_incompatible_crossings=True,
        maximum_slope_percent=None,
        maximum_detour_ratio=DETOUR_RATIOS[answers.detour],
        declared_weights=PreferenceWeights(**raw_weights),
    )


def load_questionnaire_fixture(path: Path = SHARED_CASES_PATH) -> QuestionnaireFixture:
    """Load shared cases and verify the Python mapping against expected profiles."""

    fixture = QuestionnaireFixture.model_validate_json(path.read_text(encoding="utf-8"))
    for case in fixture.profiles:
        derived = build_profile_from_answers(case.answers)
        if derived != case.expected_profile:
            raise ValueError(f"questionnaire mapping mismatch for {case.profile_id}")
    return fixture


def profile_for_condition(
    case: QuestionnaireCase,
    condition: Literal["exact", "latent_refinement"],
) -> SyntheticProfile:
    """Convert one real questionnaire result into a simulation profile."""

    declared = normalize_weights(case.expected_profile.declared_weights)
    true_weights = (
        declared
        if condition == "exact"
        else normalize_weights(case.latent_refinement_weights)
    )
    return SyntheticProfile(
        profile_id=case.profile_id,
        name=case.name,
        true_weights=true_weights,
        declared_weights=declared,
    )


def _route_is_eligible(
    route: RealRouteCostRecord,
    scenario_minimum_distance: float,
    profile: MobilityProfile,
) -> bool:
    """Reapply profile-dependent restrictions to one stored real route."""

    violations = set(route.violation_codes)
    always_critical = {"pedestrian_access", "incompatible_crossings", "maximum_slope"}
    if violations & always_critical:
        return False
    if profile.avoid_steps and "steps" in violations:
        return False
    if route.distance_m / scenario_minimum_distance > profile.maximum_detour_ratio + 1e-9:
        return False
    documented = always_critical | {"steps", "maximum_detour"}
    return not bool(violations - documented)


def questionnaire_real_scenarios(
    records: Sequence[RealRouteCostRecord],
    profile: MobilityProfile,
    split: Literal["training", "evaluation"],
) -> dict[str, tuple[RealRouteCostRecord, ...]]:
    """Build eligible real-route alternatives under one questionnaire profile."""

    all_by_scenario: dict[str, list[RealRouteCostRecord]] = defaultdict(list)
    for record in records:
        if record.split == split:
            all_by_scenario[record.scenario_id].append(record)
    result: dict[str, tuple[RealRouteCostRecord, ...]] = {}
    for scenario_id, routes in all_by_scenario.items():
        minimum_distance = min(route.distance_m for route in routes)
        eligible = tuple(
            sorted(
                (
                    route
                    for route in routes
                    if _route_is_eligible(route, minimum_distance, profile)
                ),
                key=lambda route: route.route_id,
            )
        )
        if len(eligible) >= 2:
            result[scenario_id] = eligible
    return result


def availability_rows(
    records: Sequence[RealRouteCostRecord],
    fixture: QuestionnaireFixture,
) -> list[dict[str, object]]:
    """Describe profile-specific route availability without exposing geometry."""

    rows: list[dict[str, object]] = []
    scenario_ids = sorted({record.scenario_id for record in records})
    split_by_scenario = {
        record.scenario_id: record.split for record in records
    }
    for case in fixture.profiles:
        profile = case.expected_profile
        for split in ("training", "evaluation"):
            eligible = questionnaire_real_scenarios(records, profile, split)
            for scenario_id in scenario_ids:
                if split_by_scenario[scenario_id] != split:
                    continue
                rows.append(
                    {
                        "profile_id": case.profile_id,
                        "split": split,
                        "scenario_id": scenario_id,
                        "eligible_alternative_count": len(eligible.get(scenario_id, ())),
                        "eligible_for_comparison": scenario_id in eligible,
                    }
                )
    return rows


def _real_route_curve(
    records: Sequence[RealRouteCostRecord],
    case: QuestionnaireCase,
    condition: Literal["exact", "latent_refinement"],
    seed: int,
) -> tuple[QuestionnaireRun, ...]:
    """Train and evaluate one questionnaire profile on fixed real-route costs."""

    profile = profile_for_condition(case, condition)
    training = questionnaire_real_scenarios(records, case.expected_profile, "training")
    evaluation = questionnaire_real_scenarios(records, case.expected_profile, "evaluation")
    if not training or not evaluation:
        raise ValueError("questionnaire real evaluation requires both protocol splits")
    order = _balanced_training_sequence(
        tuple(training), TRAINING_CHOICES, random.Random(seed)
    )
    noise_source = random.Random(seed + 10_000_000)
    state = initialize_learning(
        profile.declared_weights,
        config=REAL_ROUTE_LEARNING_CONFIG,
        enabled=True,
    )
    cumulative = {model: 0.0 for model in MODEL_LABELS}
    maximum_learned_jump = 0.0
    maximum_effective_jump = 0.0
    runs: list[QuestionnaireRun] = []

    def record_checkpoint(choice_count: int) -> None:
        model_weights = {
            "shortest": profile.declared_weights,
            "fixed": profile.declared_weights,
            "adaptive": state.effective_weights,
        }
        for model, weights in model_weights.items():
            top1, pairwise, regret = _evaluate_model(
                weights,
                profile.true_weights,
                evaluation.values(),
                shortest=model == "shortest",
            )
            runs.append(
                QuestionnaireRun(
                    bank="real_limited",
                    bank_label=BANK_LABELS["real_limited"],
                    condition=condition,
                    condition_label=CONDITION_LABELS[condition],
                    profile_id=case.profile_id,
                    seed=seed,
                    model=model,
                    model_label=MODEL_LABELS[model],
                    choice_count=choice_count,
                    training_scenario_count=len(training),
                    evaluation_scenario_count=len(evaluation),
                    top1_accuracy=top1,
                    pairwise_accuracy=pairwise,
                    mean_regret=max(regret, 0.0),
                    cumulative_training_regret=max(cumulative[model], 0.0),
                    maximum_learned_jump_l1=(
                        maximum_learned_jump if model == "adaptive" else None
                    ),
                    maximum_effective_jump_l1=(
                        maximum_effective_jump if model == "adaptive" else None
                    ),
                )
            )

    record_checkpoint(0)
    for choice_number, scenario_id in enumerate(order, start=1):
        routes = training[scenario_id]
        preferred = _best_route_index(profile.true_weights, routes)
        predictions = {
            "shortest": _shortest_route_index(routes),
            "fixed": _best_route_index(profile.declared_weights, routes),
            "adaptive": _best_route_index(state.effective_weights, routes),
        }
        best_cost = _weighted_cost(profile.true_weights, routes[preferred])
        for model, predicted in predictions.items():
            cumulative[model] += (
                _weighted_cost(profile.true_weights, routes[predicted]) - best_cost
            )
        chosen = preferred
        if noise_source.random() < NOISE:
            chosen = noise_source.choice(
                [index for index in range(len(routes)) if index != preferred]
            )
        compared = [
            ComparedRoute(
                route_id=f"{scenario_id}_{route.route_id}",
                costs=route.costs,
            )
            for route in routes
        ]
        update = update_preferences(
            state,
            PairwiseChoice(
                chosen=compared[chosen],
                unchosen=[
                    route for index, route in enumerate(compared) if index != chosen
                ],
            ),
        )
        state = update.updated_state
        maximum_learned_jump = max(maximum_learned_jump, update.learned_change_l1)
        maximum_effective_jump = max(maximum_effective_jump, update.effective_change_l1)
        if choice_number in CHECKPOINTS:
            record_checkpoint(choice_number)
    return tuple(runs)


def _synthetic_runs(
    fixture: QuestionnaireFixture,
) -> tuple[QuestionnaireRun, ...]:
    """Run questionnaire profiles on independent informative choice sets."""

    runs: list[QuestionnaireRun] = []
    for case in fixture.profiles:
        for condition in CONDITIONS:
            profile = profile_for_condition(case, condition)
            for seed in EVALUATION_SEEDS:
                result = run_simulation(
                    profile,
                    seed,
                    REAL_ROUTE_LEARNING_CONFIG,
                    NOISE,
                    training_choices=TRAINING_CHOICES,
                    evaluation_sets=EVALUATION_SETS,
                )
                for point in result.curve:
                    runs.append(
                        _synthetic_run_record(
                            point,
                            condition,
                            result.maximum_learned_jump_l1,
                            result.maximum_effective_jump_l1,
                        )
                    )
    return tuple(runs)


def _synthetic_run_record(
    point: CurvePoint,
    condition: Literal["exact", "latent_refinement"],
    maximum_learned_jump: float,
    maximum_effective_jump: float,
) -> QuestionnaireRun:
    """Translate one existing simulation point into the shared result schema."""

    return QuestionnaireRun(
        bank="synthetic_informative",
        bank_label=BANK_LABELS["synthetic_informative"],
        condition=condition,
        condition_label=CONDITION_LABELS[condition],
        profile_id=point.profile_id,
        seed=point.seed,
        model=point.model,
        model_label=MODEL_LABELS[point.model],
        choice_count=point.choice_count,
        training_scenario_count=TRAINING_CHOICES,
        evaluation_scenario_count=EVALUATION_SETS,
        top1_accuracy=point.top1_accuracy,
        pairwise_accuracy=point.pairwise_accuracy,
        mean_regret=max(point.mean_regret, 0.0),
        cumulative_training_regret=max(point.cumulative_training_regret, 0.0),
        maximum_learned_jump_l1=(
            maximum_learned_jump if point.model == "adaptive" else None
        ),
        maximum_effective_jump_l1=(
            maximum_effective_jump if point.model == "adaptive" else None
        ),
    )


def evaluate_questionnaire(
    real_records: Sequence[RealRouteCostRecord],
    fixture: Optional[QuestionnaireFixture] = None,
) -> tuple[QuestionnaireRun, ...]:
    """Evaluate all profiles, conditions, seeds, checkpoints, and data banks."""

    selected_fixture = fixture or load_questionnaire_fixture()
    real_runs = tuple(
        run
        for case in selected_fixture.profiles
        for condition in CONDITIONS
        for seed in EVALUATION_SEEDS
        for run in _real_route_curve(real_records, case, condition, seed)
    )
    return (*_synthetic_runs(selected_fixture), *real_runs)


def _mean(values: Sequence[float]) -> float:
    """Return the arithmetic mean while rejecting empty groups."""

    if not values:
        raise ValueError("cannot summarize an empty group")
    return statistics.fmean(values)


def _clustered_interval(values_by_seed: dict[int, list[float]]) -> tuple[float, float, float]:
    """Return mean and normal 95 percent interval over independent seed clusters."""

    clustered = [_mean(values_by_seed[seed]) for seed in sorted(values_by_seed)]
    mean = _mean(clustered)
    if len(clustered) < 2:
        return mean, mean, mean
    margin = 1.96 * statistics.stdev(clustered) / math.sqrt(len(clustered))
    return mean, mean - margin, mean + margin


def summarize_runs(runs: Sequence[QuestionnaireRun]) -> list[dict[str, object]]:
    """Aggregate metrics by bank, condition, checkpoint, and model."""

    grouped: dict[tuple[str, str, int, str], list[QuestionnaireRun]] = defaultdict(list)
    for run in runs:
        grouped[(run.bank, run.condition, run.choice_count, run.model)].append(run)
    rows: list[dict[str, object]] = []
    for (bank, condition, choice_count, model), selected in sorted(grouped.items()):
        top1_by_seed: dict[int, list[float]] = defaultdict(list)
        pairwise_by_seed: dict[int, list[float]] = defaultdict(list)
        for run in selected:
            top1_by_seed[run.seed].append(run.top1_accuracy)
            pairwise_by_seed[run.seed].append(run.pairwise_accuracy)
        top1, top1_low, top1_high = _clustered_interval(top1_by_seed)
        pairwise, pairwise_low, pairwise_high = _clustered_interval(pairwise_by_seed)
        adaptive = [run for run in selected if run.model == "adaptive"]
        rows.append(
            {
                "bank": bank,
                "bank_label": BANK_LABELS[bank],
                "condition": condition,
                "condition_label": CONDITION_LABELS[condition],
                "choice_count": choice_count,
                "model": model,
                "model_label": MODEL_LABELS[model],
                "runs": len(selected),
                "seed_clusters": len(top1_by_seed),
                "top1_mean": top1,
                "top1_ci95_low": max(0.0, top1_low),
                "top1_ci95_high": min(1.0, top1_high),
                "pairwise_mean": pairwise,
                "pairwise_ci95_low": max(0.0, pairwise_low),
                "pairwise_ci95_high": min(1.0, pairwise_high),
                "mean_regret": _mean([run.mean_regret for run in selected]),
                "mean_cumulative_training_regret": _mean(
                    [run.cumulative_training_regret for run in selected]
                ),
                "maximum_effective_jump_l1": (
                    max(run.maximum_effective_jump_l1 or 0.0 for run in adaptive)
                    if adaptive
                    else ""
                ),
            }
        )
    return rows


def paired_comparisons(runs: Sequence[QuestionnaireRun]) -> list[dict[str, object]]:
    """Compare final adaptive and fixed results on identical profiles and seeds."""

    final = [run for run in runs if run.choice_count == TRAINING_CHOICES]
    index = {
        (run.bank, run.condition, run.profile_id, run.seed, run.model): run
        for run in final
    }
    rows: list[dict[str, object]] = []
    observed_groups = sorted({(run.bank, run.condition) for run in final})
    for bank, condition in observed_groups:
            differences_by_seed: dict[int, list[float]] = defaultdict(list)
            regret_reductions: list[float] = []
            wins = ties = losses = 0
            selected_keys = sorted(
                {
                    (run.profile_id, run.seed)
                    for run in final
                    if run.bank == bank and run.condition == condition
                }
            )
            for profile_id, seed in selected_keys:
                fixed = index[(bank, condition, profile_id, seed, "fixed")]
                adaptive = index[(bank, condition, profile_id, seed, "adaptive")]
                difference = adaptive.top1_accuracy - fixed.top1_accuracy
                differences_by_seed[seed].append(difference)
                regret_reductions.append(fixed.mean_regret - adaptive.mean_regret)
                wins += int(difference > 0.0)
                ties += int(difference == 0.0)
                losses += int(difference < 0.0)
            difference, low, high = _clustered_interval(differences_by_seed)
            rows.append(
                {
                    "bank": bank,
                    "bank_label": BANK_LABELS[bank],
                    "condition": condition,
                    "condition_label": CONDITION_LABELS[condition],
                    "paired_runs": len(selected_keys),
                    "seed_clusters": len(differences_by_seed),
                    "adaptive_top1_improvement": difference,
                    "adaptive_top1_improvement_ci95_low": low,
                    "adaptive_top1_improvement_ci95_high": high,
                    "mean_regret_reduction": _mean(regret_reductions),
                    "adaptive_wins": wins,
                    "ties": ties,
                    "adaptive_losses": losses,
                }
            )
    return rows


def profile_rows(fixture: QuestionnaireFixture) -> list[dict[str, object]]:
    """Flatten questionnaire-derived profiles for transparent inspection."""

    rows: list[dict[str, object]] = []
    for case in fixture.profiles:
        declared = normalize_weights(case.expected_profile.declared_weights).model_dump()
        latent = normalize_weights(case.latent_refinement_weights).model_dump()
        for dimension in PREFERENCE_DIMENSIONS:
            rows.append(
                {
                    "profile_id": case.profile_id,
                    "profile_name": case.name,
                    "steps_answer": case.answers.steps,
                    "detour_answer": case.answers.detour,
                    "maximum_detour_ratio": case.expected_profile.maximum_detour_ratio,
                    "dimension": dimension,
                    "declared_weight": declared[dimension],
                    "latent_refinement_weight": latent[dimension],
                }
            )
    return rows


def _save_rows(rows: Sequence[dict[str, object]], path: Path) -> Path:
    """Write one stable CSV artifact."""

    if not rows:
        raise ValueError("cannot save an empty questionnaire artifact")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=list(rows[0]),
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(rows)
    return path


def plot_final_results(summary: Sequence[dict[str, object]]) -> Path:
    """Create a concise two-panel comparison of final fixed and adaptive accuracy."""

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.ticker import PercentFormatter

    final = [
        row
        for row in summary
        if int(row["choice_count"]) == TRAINING_CHOICES
        and row["model"] in {"fixed", "adaptive"}
    ]
    colors = {"fixed": "#008C72", "adaptive": "#7651D9"}
    figure, axes = plt.subplots(1, 2, figsize=(12.2, 5.8), sharey=True)
    figure.patch.set_facecolor("#FAF9FE")
    for axis, bank in zip(axes, BANK_LABELS):
        axis.set_facecolor("#FAF9FE")
        for condition_index, condition in enumerate(CONDITIONS):
            for model_index, model in enumerate(("fixed", "adaptive")):
                row = next(
                    item
                    for item in final
                    if item["bank"] == bank
                    and item["condition"] == condition
                    and item["model"] == model
                )
                x = condition_index + (-0.18 if model_index == 0 else 0.18)
                value = float(row["top1_mean"])
                axis.bar(
                    x,
                    value,
                    width=0.32,
                    color=colors[model],
                    label=MODEL_LABELS[model] if condition_index == 0 else None,
                )
                axis.text(x, value + 0.025, f"{value:.1%}", ha="center", fontsize=10)
        axis.set_title(BANK_LABELS[bank], fontsize=13, fontweight="bold", color="#17213A")
        axis.set_xticks(range(len(CONDITIONS)), [CONDITION_LABELS[item] for item in CONDITIONS])
        axis.set_ylim(0.0, 1.08)
        axis.yaxis.set_major_formatter(PercentFormatter(1.0))
        axis.grid(axis="y", color="#D9DCE7", linewidth=0.9)
        axis.spines[["top", "right"]].set_visible(False)
    axes[0].set_ylabel("Exactitud media de la primera ruta")
    axes[0].legend(frameon=False, loc="lower left")
    figure.suptitle(
        "El valor del aprendizaje depende del perfil inicial y de las rutas observadas",
        fontsize=16,
        fontweight="bold",
        color="#17213A",
    )
    figure.text(
        0.5,
        0.015,
        "Cuatro configuraciones del cuestionario, veinte semillas y 10 % de "
        "elecciones inconsistentes. Datos simulados; no es un estudio con participantes.",
        ha="center",
        fontsize=9.2,
        color="#69748A",
    )
    figure.tight_layout(rect=(0, 0.06, 1, 0.92))
    FIGURE_PATH.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(FIGURE_PATH, dpi=300, bbox_inches="tight")
    plt.close(figure)
    return FIGURE_PATH


def run_evaluation() -> tuple[Path, ...]:
    """Execute the frozen protocol and persist all sanitized artifacts."""

    fixture = load_questionnaire_fixture()
    records = load_cost_records()
    runs = evaluate_questionnaire(records, fixture)
    summary = summarize_runs(runs)
    comparisons = paired_comparisons(runs)
    paths = (
        _save_rows(profile_rows(fixture), PROFILES_PATH),
        _save_rows([run.model_dump() for run in runs], RUNS_PATH),
        _save_rows(summary, SUMMARY_PATH),
        _save_rows(comparisons, COMPARISONS_PATH),
        _save_rows(availability_rows(records, fixture), AVAILABILITY_PATH),
        plot_final_results(summary),
    )
    return paths


def main() -> None:
    """Run the questionnaire evaluation from versioned local inputs."""

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    for path in run_evaluation():
        LOGGER.info("Resultado guardado en %s.", path)


if __name__ == "__main__":
    main()
