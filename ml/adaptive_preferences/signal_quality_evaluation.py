"""Evaluate structural signal diagnostics on informative and limited histories."""

import csv
import random
import statistics
from collections import defaultdict
from collections.abc import Sequence
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from backend.feedback import (
    ComparedRoute,
    PairwiseChoice,
    SignalQualityAssessment,
    SignalQualityReason,
    assess_signal_quality,
)
from ml.adaptive_preferences.evaluation import (
    SyntheticProfile,
    _observed_choice,
    _pairwise_choice,
    build_synthetic_profiles,
    generate_choice_sets,
)
from ml.adaptive_preferences.real_routes_evaluation import (
    CHOICE_NOISE,
    RealRouteCostRecord,
    _accepted_scenarios,
    _balanced_training_sequence,
    _best_route_index,
    load_cost_records,
)

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = REPOSITORY_ROOT / "docs" / "evaluation" / "artifacts"
FIGURES_DIR = REPOSITORY_ROOT / "docs" / "figures"
HISTORIES_PATH = ARTIFACTS_DIR / "aprendizaje-senal-historiales.csv"
SUMMARY_PATH = ARTIFACTS_DIR / "aprendizaje-senal-resumen.csv"
FIGURE_PATH = FIGURES_DIR / "capacidad-informativa-aprendizaje.png"

CHECKPOINTS = (4, 8, 12, 20, 60)
SYNTHETIC_SEEDS = tuple(range(2026082001, 2026082021))
REAL_SEEDS = tuple(range(2026081901, 2026081921))

DATASET_LABELS = {
    "synthetic_informative": "Banco sintético informativo",
    "real_limited": "Banco ORS y OSM limitado",
}


class EvaluationRecord(BaseModel):
    """One validated history-level diagnostic result."""

    model_config = ConfigDict(extra="forbid")

    dataset: str
    dataset_label: str
    expected_sufficient: bool
    profile_id: str
    seed: int
    choice_count: int = Field(ge=0)
    naive_sufficient: bool
    structural_sufficient: bool
    pair_count: int = Field(ge=0)
    informative_pair_count: int = Field(ge=0)
    unique_comparison_count: int = Field(ge=0)
    active_dimension_count: int = Field(ge=0, le=9)
    comparison_rank: int = Field(ge=0, le=9)
    reasons: list[SignalQualityReason]


def _record(
    dataset: str,
    profile: SyntheticProfile,
    seed: int,
    assessment: SignalQualityAssessment,
    expected_sufficient: bool,
) -> EvaluationRecord:
    """Create one stable result record from a validated assessment."""

    return EvaluationRecord(
        dataset=dataset,
        dataset_label=DATASET_LABELS[dataset],
        expected_sufficient=expected_sufficient,
        profile_id=profile.profile_id,
        seed=seed,
        choice_count=assessment.choice_count,
        naive_sufficient=assessment.choice_count >= 8,
        structural_sufficient=assessment.sufficient,
        pair_count=assessment.pair_count,
        informative_pair_count=assessment.informative_pair_count,
        unique_comparison_count=assessment.unique_comparison_count,
        active_dimension_count=len(assessment.active_dimensions),
        comparison_rank=assessment.comparison_rank,
        reasons=assessment.reasons,
    )


def _synthetic_history(
    profile: SyntheticProfile,
    seed: int,
    choice_count: int,
) -> list[PairwiseChoice]:
    """Generate one informative noisy history from the EXP-002 mechanism."""

    route_sets = generate_choice_sets(seed, choice_count)
    noise_source = random.Random(seed + 20_000_000)
    return [
        _pairwise_choice(
            routes,
            _observed_choice(
                routes,
                profile.true_weights,
                CHOICE_NOISE,
                noise_source,
            ),
            choice_number,
        )
        for choice_number, routes in enumerate(route_sets, start=1)
    ]


def _real_history(
    records: Sequence[RealRouteCostRecord],
    profile: SyntheticProfile,
    seed: int,
    choice_count: int,
) -> list[PairwiseChoice]:
    """Build one noisy repeated history from eligible EXP-007 scenarios."""

    training = _accepted_scenarios(records, "training")
    if not training:
        raise ValueError("signal evaluation requires eligible real training scenarios")
    order = _balanced_training_sequence(
        tuple(training),
        choice_count,
        random.Random(seed),
    )
    noise_source = random.Random(seed + 10_000_000)
    history: list[PairwiseChoice] = []
    for scenario_id in order:
        routes = training[scenario_id]
        preferred = _best_route_index(profile.true_weights, routes)
        chosen = preferred
        if noise_source.random() < CHOICE_NOISE:
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
        history.append(
            PairwiseChoice(
                chosen=compared[chosen],
                unchosen=[
                    route for index, route in enumerate(compared) if index != chosen
                ],
            )
        )
    return history


def evaluate_signal_quality(
    real_records: Sequence[RealRouteCostRecord],
) -> tuple[EvaluationRecord, ...]:
    """Evaluate every profile, seed, checkpoint, and contrasting data bank."""

    results: list[EvaluationRecord] = []
    for profile in build_synthetic_profiles():
        for seed in SYNTHETIC_SEEDS:
            for checkpoint in CHECKPOINTS:
                assessment = assess_signal_quality(
                    _synthetic_history(profile, seed, checkpoint)
                )
                results.append(
                    _record(
                        "synthetic_informative",
                        profile,
                        seed,
                        assessment,
                        expected_sufficient=True,
                    )
                )
        for seed in REAL_SEEDS:
            for checkpoint in CHECKPOINTS:
                assessment = assess_signal_quality(
                    _real_history(real_records, profile, seed, checkpoint)
                )
                results.append(
                    _record(
                        "real_limited",
                        profile,
                        seed,
                        assessment,
                        expected_sufficient=False,
                    )
                )
    return tuple(results)


def _mean(values: Sequence[float]) -> float:
    """Return a mean while rejecting an empty collection."""

    if not values:
        raise ValueError("cannot summarize an empty metric collection")
    return statistics.fmean(values)


def summarize_results(records: Sequence[EvaluationRecord]) -> list[dict[str, object]]:
    """Aggregate readiness and diagnostics by bank and choice checkpoint."""

    grouped: dict[tuple[str, int], list[EvaluationRecord]] = defaultdict(list)
    for record in records:
        grouped[(record.dataset, record.choice_count)].append(record)

    rows: list[dict[str, object]] = []
    for (dataset, choice_count), group in sorted(grouped.items()):
        row: dict[str, object] = {
            "dataset": dataset,
            "dataset_label": DATASET_LABELS[dataset],
            "choice_count": choice_count,
            "history_count": len(group),
            "expected_sufficient": group[0].expected_sufficient,
            "naive_sufficient_rate": _mean(
                [float(item.naive_sufficient) for item in group]
            ),
            "structural_sufficient_rate": _mean(
                [float(item.structural_sufficient) for item in group]
            ),
            "structural_accuracy": _mean(
                [
                    float(item.structural_sufficient == item.expected_sufficient)
                    for item in group
                ]
            ),
            "mean_informative_pairs": _mean(
                [item.informative_pair_count for item in group]
            ),
            "mean_unique_comparisons": _mean(
                [item.unique_comparison_count for item in group]
            ),
            "mean_active_dimensions": _mean(
                [item.active_dimension_count for item in group]
            ),
            "mean_comparison_rank": _mean(
                [item.comparison_rank for item in group]
            ),
        }
        for reason in SignalQualityReason:
            row[f"reason_{reason.value}_rate"] = _mean(
                [float(reason in item.reasons) for item in group]
            )
        rows.append(row)
    return rows


def _history_rows(records: Sequence[EvaluationRecord]) -> list[dict[str, object]]:
    """Flatten history records into a self-explanatory CSV schema."""

    return [
        {
            **record.model_dump(exclude={"reasons"}),
            "reasons": "|".join(reason.value for reason in record.reasons),
        }
        for record in records
    ]


def _write_csv(path: Path, rows: Sequence[dict[str, object]]) -> None:
    """Write non-empty dictionaries with a stable header."""

    if not rows:
        raise ValueError("cannot write an empty evaluation artifact")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def plot_results(summary: Sequence[dict[str, object]]) -> Path:
    """Create a two-panel comparison of a count-only and structural rule."""

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    figure, axes = plt.subplots(1, 2, figsize=(12, 5.6), sharey=True)
    colors = {
        "synthetic_informative": "#7251D6",
        "real_limited": "#7A8293",
    }
    panels = (
        ("naive_sufficient_rate", "Solo contar elecciones"),
        ("structural_sufficient_rate", "Comprobar variedad y contraste"),
    )
    for axis, (metric, title) in zip(axes, panels):
        for dataset in DATASET_LABELS:
            selected = [row for row in summary if row["dataset"] == dataset]
            offset = -0.12 if dataset == "synthetic_informative" else 0.12
            axis.plot(
                [int(row["choice_count"]) + offset for row in selected],
                [100.0 * float(row[metric]) for row in selected],
                marker="o",
                linewidth=2.5,
                color=colors[dataset],
                label=DATASET_LABELS[dataset],
            )
        axis.axvline(8, color="#D4A72C", linestyle="--", linewidth=1.5)
        axis.set_title(title, fontweight="bold")
        axis.set_xlabel("Elecciones observadas")
        axis.set_xticks(CHECKPOINTS)
        axis.set_ylim(-5, 105)
        axis.grid(axis="y", alpha=0.25)
    axes[0].set_ylabel("Historiales considerados suficientes (%)")
    handles, labels = axes[1].get_legend_handles_labels()
    figure.legend(
        handles,
        labels,
        loc="lower center",
        bbox_to_anchor=(0.5, 0.075),
        ncol=2,
        frameon=False,
    )
    figure.suptitle(
        "La cantidad de elecciones no sustituye su capacidad informativa",
        fontsize=15,
        fontweight="bold",
    )
    figure.text(
        0.5,
        0.025,
        "La línea discontinua marca el mínimo de 8 elecciones; 80 historiales por banco y punto.",
        ha="center",
        color="#596174",
    )
    figure.tight_layout(rect=(0, 0.17, 1, 0.92))
    figure.savefig(FIGURE_PATH, dpi=200, bbox_inches="tight")
    plt.close(figure)
    return FIGURE_PATH


def main() -> None:
    """Run EXP-008 from versioned costs and write all sanitized evidence."""

    records = evaluate_signal_quality(load_cost_records())
    summary = summarize_results(records)
    _write_csv(HISTORIES_PATH, _history_rows(records))
    _write_csv(SUMMARY_PATH, summary)
    plot_results(summary)


if __name__ == "__main__":
    main()
