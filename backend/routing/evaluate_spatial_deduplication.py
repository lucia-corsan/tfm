"""Reproducible threshold evaluation for spatial route deduplication."""

import csv
import logging
from dataclasses import dataclass
from pathlib import Path

from pyproj import Transformer

from backend.routing.ors_models import OrsLineString
from backend.routing.spatial_deduplication import (
    SpatialDeduplicationConfig,
    compare_route_geometries,
    is_spatial_duplicate,
)

logger = logging.getLogger(__name__)

ETRS89_UTM30_TO_WGS84 = Transformer.from_crs(
    "EPSG:25830", "EPSG:4326", always_xy=True
)
TOLERANCES_M = (1.0, 2.0, 3.0, 5.0, 8.0, 10.0)
OVERLAP_THRESHOLDS = (0.80, 0.85, 0.90, 0.95, 0.98)
LENGTH_DIFFERENCE_THRESHOLDS = (0.03, 0.05, 0.10)


@dataclass(frozen=True)
class CalibrationCase:
    """One semantically labelled pair used before fitting thresholds."""

    case_id: str
    description: str
    expected_duplicate: bool
    first_points_m: tuple[tuple[float, float], ...]
    second_points_m: tuple[tuple[float, float], ...]


@dataclass(frozen=True)
class EvaluationMetrics:
    """Binary classification metrics for one parameter combination."""

    true_positives: int
    true_negatives: int
    false_positives: int
    false_negatives: int

    @property
    def accuracy(self) -> float:
        """Return the fraction of correct classifications."""

        total = (
            self.true_positives
            + self.true_negatives
            + self.false_positives
            + self.false_negatives
        )
        return (self.true_positives + self.true_negatives) / total

    @property
    def precision(self) -> float:
        """Return precision for the duplicate class."""

        predicted_positive = self.true_positives + self.false_positives
        return self.true_positives / predicted_positive if predicted_positive else 0.0

    @property
    def recall(self) -> float:
        """Return recall for the duplicate class."""

        actual_positive = self.true_positives + self.false_negatives
        return self.true_positives / actual_positive if actual_positive else 0.0

    @property
    def f1(self) -> float:
        """Return harmonic mean of precision and recall."""

        denominator = self.precision + self.recall
        return 2 * self.precision * self.recall / denominator if denominator else 0.0


def _densify(
    points: tuple[tuple[float, float], ...]
) -> tuple[tuple[float, float], ...]:
    """Add one exact midpoint to every metric segment."""

    densified: list[tuple[float, float]] = []
    for start, end in zip(points, points[1:]):
        densified.extend(
            [start, ((start[0] + end[0]) / 2.0, (start[1] + end[1]) / 2.0)]
        )
    densified.append(points[-1])
    return tuple(densified)


def build_calibration_cases() -> tuple[CalibrationCase, ...]:
    """Return balanced, pre-labelled route pairs around a Madrid metric origin.

    Returns:
        Five duplicate and five distinct cases covering sampling, small numeric
        displacement, parallel streets and local decision-point divergences.
    """

    base = (
        (440000.0, 4475000.0),
        (440250.0, 4475000.0),
        (440500.0, 4475000.0),
        (440750.0, 4475000.0),
        (441000.0, 4475000.0),
    )
    return (
        CalibrationCase("P1", "Geometría idéntica", True, base, base),
        CalibrationCase(
            "P2", "Mismo trazado con más vértices", True, base, _densify(base)
        ),
        CalibrationCase(
            "P3",
            "Desplazamiento submétrico interior",
            True,
            base,
            (
                base[0],
                (440250.0, 4475000.8),
                (440500.0, 4475000.8),
                (440750.0, 4475000.8),
                base[-1],
            ),
        ),
        CalibrationCase(
            "P4",
            "Ruido alterno de hasta dos metros",
            True,
            base,
            (
                base[0],
                (440250.0, 4475002.0),
                (440500.0, 4474998.0),
                (440750.0, 4475002.0),
                base[-1],
            ),
        ),
        CalibrationCase(
            "P5",
            "Extremos interiores desplazados dos metros",
            True,
            base,
            (
                (440002.0, 4475000.0),
                base[1],
                base[2],
                base[3],
                (440998.0, 4475000.16),
            ),
        ),
        CalibrationCase(
            "N1",
            "Recorrido paralelo separado seis metros",
            False,
            base,
            tuple((x, y + 6.0) for x, y in base),
        ),
        CalibrationCase(
            "N2",
            "Desvío localizado en un punto de decisión",
            False,
            base,
            (
                base[0],
                base[1],
                (440430.0, 4475070.0),
                (440570.0, 4475070.0),
                base[3],
                base[-1],
            ),
        ),
        CalibrationCase(
            "N3",
            "Calle alternativa durante el tramo central",
            False,
            base,
            (
                base[0],
                (440150.0, 4475015.0),
                (440850.0, 4475035.0),
                base[-1],
            ),
        ),
        CalibrationCase(
            "N4",
            "Ramal diferente en el último quinto",
            False,
            base,
            (
                base[0],
                base[1],
                base[2],
                (440800.0, 4475008.0),
                (440950.0, 4475008.0),
                base[-1],
            ),
        ),
        CalibrationCase(
            "N5",
            "Recorrido paralelo separado veinte metros",
            False,
            base,
            tuple((x, y + 20.0) for x, y in base),
        ),
    )


def _geometry(points_m: tuple[tuple[float, float], ...]) -> OrsLineString:
    """Convert ETRS89 / UTM zone 30N points to validated WGS84 geometry."""

    return OrsLineString(
        type="LineString",
        coordinates=[ETRS89_UTM30_TO_WGS84.transform(x, y) for x, y in points_m],
    )


def _evaluate_predictions(
    cases: tuple[CalibrationCase, ...],
    *,
    tolerance_m: float,
    overlap_threshold: float,
    length_difference_threshold: float,
) -> tuple[EvaluationMetrics, list[dict[str, object]]]:
    """Classify all cases for one parameter combination."""

    config = SpatialDeduplicationConfig(
        tolerance_m=tolerance_m,
        minimum_overlap_ratio=overlap_threshold,
        maximum_length_difference_ratio=length_difference_threshold,
    )
    true_positives = true_negatives = false_positives = false_negatives = 0
    predictions: list[dict[str, object]] = []

    for case in cases:
        similarity = compare_route_geometries(
            _geometry(case.first_points_m),
            _geometry(case.second_points_m),
            tolerance_m=tolerance_m,
        )
        predicted = is_spatial_duplicate(similarity, config)
        if predicted and case.expected_duplicate:
            true_positives += 1
        elif predicted:
            false_positives += 1
        elif case.expected_duplicate:
            false_negatives += 1
        else:
            true_negatives += 1
        predictions.append(
            {
                "tolerance_m": tolerance_m,
                "overlap_threshold": overlap_threshold,
                "maximum_length_difference_ratio": length_difference_threshold,
                "case_id": case.case_id,
                "description": case.description,
                "expected_duplicate": case.expected_duplicate,
                "predicted_duplicate": predicted,
                "correct": predicted == case.expected_duplicate,
                "measured_overlap_ratio": similarity.overlap_ratio,
                "relative_length_difference": similarity.relative_length_difference,
            }
        )

    return (
        EvaluationMetrics(
            true_positives=true_positives,
            true_negatives=true_negatives,
            false_positives=false_positives,
            false_negatives=false_negatives,
        ),
        predictions,
    )


def evaluate_parameter_grid() -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    """Evaluate every declared tolerance and overlap combination.

    Returns:
        Summary metrics and case-level predictions in deterministic order.
    """

    summaries: list[dict[str, object]] = []
    all_predictions: list[dict[str, object]] = []
    cases = build_calibration_cases()
    for length_difference_threshold in LENGTH_DIFFERENCE_THRESHOLDS:
        for tolerance_m in TOLERANCES_M:
            for overlap_threshold in OVERLAP_THRESHOLDS:
                metrics, predictions = _evaluate_predictions(
                    cases,
                    tolerance_m=tolerance_m,
                    overlap_threshold=overlap_threshold,
                    length_difference_threshold=length_difference_threshold,
                )
                summaries.append(
                    {
                        "tolerance_m": tolerance_m,
                        "overlap_threshold": overlap_threshold,
                        "maximum_length_difference_ratio": (
                            length_difference_threshold
                        ),
                        "accuracy": metrics.accuracy,
                        "precision": metrics.precision,
                        "recall": metrics.recall,
                        "f1": metrics.f1,
                        "true_positives": metrics.true_positives,
                        "true_negatives": metrics.true_negatives,
                        "false_positives": metrics.false_positives,
                        "false_negatives": metrics.false_negatives,
                    }
                )
                all_predictions.extend(predictions)
    return summaries, all_predictions


def select_conservative_configuration(
    summaries: list[dict[str, object]],
) -> dict[str, object]:
    """Choose the most accurate configuration among those with no false positives.

    Ties prefer greater duplicate recall, a smaller metric tolerance and a
    stricter overlap requirement, in that order.

    Args:
        summaries: Complete parameter-grid metrics.

    Returns:
        One selected summary row.

    Raises:
        ValueError: If every configuration produces a false positive.
    """

    safe = [row for row in summaries if row["false_positives"] == 0]
    if not safe:
        raise ValueError("no evaluated configuration avoids false positives")
    return min(
        safe,
        key=lambda row: (
            -float(row["accuracy"]),
            -float(row["recall"]),
            float(row["tolerance_m"]),
            -float(row["overlap_threshold"]),
            float(row["maximum_length_difference_ratio"]),
        ),
    )


def _write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    """Write deterministic experiment rows with an explicit header."""

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as file_handle:
        writer = csv.DictWriter(file_handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)




def run_evaluation(output_dir: Path) -> dict[str, object]:
    """Run the full grid and write public, reproducible evaluation artifacts.

    Args:
        output_dir: Evaluator-facing directory for CSV outputs.

    Returns:
        Selected conservative configuration.
    """

    summaries, predictions = evaluate_parameter_grid()
    selected = select_conservative_configuration(summaries)
    marked_summaries = [
        {**row, "selected": row is selected} for row in summaries
    ]
    _write_csv(output_dir / "deduplicacion-espacial-parametros.csv", marked_summaries)
    _write_csv(output_dir / "deduplicacion-espacial-predicciones.csv", predictions)
    return selected


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    repository_root = Path(__file__).resolve().parents[2]
    chosen = run_evaluation(repository_root / "docs" / "evaluation" / "artifacts")
    logger.info(
        "Configuración seleccionada: %.0f m, solapamiento %.0f %%; exactitud %.0f %%.",
        chosen["tolerance_m"],
        100 * float(chosen["overlap_threshold"]),
        100 * float(chosen["accuracy"]),
    )
