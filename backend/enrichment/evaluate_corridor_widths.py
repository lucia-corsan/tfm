"""Reproducible sensitivity evaluation for OSM route-corridor widths."""

import asyncio
import csv
import logging
from collections.abc import Sequence
from pathlib import Path
from statistics import fmean
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.config import get_settings
from backend.domain import GeoPoint, MobilityProfile
from backend.enrichment.osm_snapshot import (
    PILOT_ROUTING_BBOX,
    OsmRoutingSnapshot,
    OsmSnapshotInvalidError,
    OsmSnapshotStore,
    build_overpass_query,
    query_sha256,
)
from backend.enrichment.route_association import (
    CORRIDOR_WIDTH_CANDIDATES_M,
    associate_route_corridor,
)
from backend.enrichment.route_enrichment import enrich_ors_route_set
from backend.enrichment.spatial_index import OsmSpatialIndex
from backend.routing.ors_models import OrsBaseRoute
from backend.routing.ors_provider import create_ors_base_route_provider
from backend.scoring import rank_routes

LOGGER = logging.getLogger(__name__)
OUTPUT_DIRECTORY = Path("docs/evaluation/artifacts")
ROUTE_RESULTS_NAME = "enriquecimiento-corredores-rutas.csv"
SUMMARY_RESULTS_NAME = "enriquecimiento-corredores-resumen.csv"
PILOT_ORIGIN = GeoPoint(latitude=40.4353, longitude=-3.7191)
PILOT_DESTINATION = GeoPoint(latitude=40.4211, longitude=-3.7206)


class CorridorEvaluationModel(BaseModel):
    """Base evaluation model with stable serialized fields."""

    model_config = ConfigDict(extra="forbid")


class CorridorRouteResult(CorridorEvaluationModel):
    """Metrics for one route and one corridor width."""

    corridor_width_m: float = Field(gt=0.0)
    route_id: str
    matched_element_count: int = Field(ge=0)
    crossing_count: int = Field(ge=0)
    signalized_crossing_count: int = Field(ge=0)
    audible_signal_crossing_count: int = Field(ge=0)
    tactile_paving_crossing_count: int = Field(ge=0)
    confirmed_step_count: Optional[int] = Field(default=None, ge=0)
    sidewalk_coverage_ratio: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    surface_coverage_ratio: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    unknown_ratio: float = Field(ge=0.0, le=1.0)
    accepted: bool
    rank: Optional[int] = Field(default=None, ge=1, le=3)
    adequacy: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class CorridorWidthSummary(CorridorEvaluationModel):
    """Aggregate comparison metrics for one corridor width."""

    corridor_width_m: float = Field(gt=0.0)
    unique_matched_element_count: int = Field(ge=0)
    accepted_route_count: int = Field(ge=0, le=3)
    mean_confidence: float = Field(ge=0.0, le=1.0)
    mean_unknown_ratio: float = Field(ge=0.0, le=1.0)
    ranking_order: str


class CorridorEvaluation(CorridorEvaluationModel):
    """Complete route-level and aggregate sensitivity results."""

    route_results: list[CorridorRouteResult]
    summaries: list[CorridorWidthSummary]


def evaluate_corridor_widths(
    routes: Sequence[OrsBaseRoute],
    snapshot: OsmRoutingSnapshot,
    profile: MobilityProfile,
    *,
    widths_m: Sequence[float] = CORRIDOR_WIDTH_CANDIDATES_M,
) -> CorridorEvaluation:
    """Evaluate corridor widths with identical routes, evidence and profile.

    Args:
        routes: Fixed ORS candidate routes.
        snapshot: Fixed OSM evidence snapshot.
        profile: Fixed safety restrictions and gradual preferences.
        widths_m: Metric widths to compare in ascending order.

    Returns:
        Route-level metrics and one aggregate summary per width.

    Raises:
        ValueError: If widths are empty, repeated or unordered.
    """

    if not widths_m or list(widths_m) != sorted(set(widths_m)):
        raise ValueError("corridor widths must be unique and sorted")
    spatial_index = OsmSpatialIndex(snapshot)
    route_results: list[CorridorRouteResult] = []
    summaries: list[CorridorWidthSummary] = []
    for width in widths_m:
        associations = [
            associate_route_corridor(
                route,
                spatial_index,
                corridor_width_m=width,
            )
            for route in routes
        ]
        candidates = enrich_ors_route_set(routes, associations, spatial_index)
        ranking = rank_routes(profile, candidates)
        ranked_by_id = {result.route_id: result for result in ranking.routes}
        association_by_id = {
            association.route_id: association for association in associations
        }
        for candidate in candidates:
            ranked = ranked_by_id.get(candidate.route_id)
            route_results.append(
                CorridorRouteResult(
                    corridor_width_m=width,
                    route_id=candidate.route_id,
                    matched_element_count=len(
                        association_by_id[candidate.route_id].matches
                    ),
                    crossing_count=candidate.features.crossing_count,
                    signalized_crossing_count=(
                        candidate.features.signalized_crossing_count
                    ),
                    audible_signal_crossing_count=(
                        candidate.features.audible_signal_crossing_count
                    ),
                    tactile_paving_crossing_count=(
                        candidate.features.tactile_paving_crossing_count
                    ),
                    confirmed_step_count=candidate.features.step_count,
                    sidewalk_coverage_ratio=(
                        candidate.features.sidewalk_coverage_ratio
                    ),
                    surface_coverage_ratio=(
                        candidate.features.surface_coverage_ratio
                    ),
                    unknown_ratio=candidate.uncertainty.unknown_ratio,
                    accepted=ranked is not None,
                    rank=ranked.rank if ranked is not None else None,
                    adequacy=ranked.score.adequacy if ranked is not None else None,
                    confidence=ranked.score.confidence if ranked is not None else None,
                )
            )
        unique_ids = {
            (match.element.osm_type, match.element.osm_id)
            for association in associations
            for match in association.matches
        }
        accepted_scores = [result.score for result in ranking.routes]
        summaries.append(
            CorridorWidthSummary(
                corridor_width_m=width,
                unique_matched_element_count=len(unique_ids),
                accepted_route_count=len(ranking.routes),
                mean_confidence=(
                    fmean(score.confidence for score in accepted_scores)
                    if accepted_scores
                    else 0.0
                ),
                mean_unknown_ratio=fmean(
                    candidate.uncertainty.unknown_ratio for candidate in candidates
                ),
                ranking_order="|".join(result.route_id for result in ranking.routes),
            )
        )
    return CorridorEvaluation(route_results=route_results, summaries=summaries)


def _write_models(path: Path, models: Sequence[CorridorEvaluationModel]) -> None:
    """Write one homogeneous model sequence as UTF-8 CSV."""

    path.parent.mkdir(parents=True, exist_ok=True)
    rows = [model.model_dump(mode="json") for model in models]
    if not rows:
        raise ValueError("evaluation output cannot be empty")
    with path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def save_corridor_evaluation(
    evaluation: CorridorEvaluation,
    output_directory: Path,
) -> tuple[Path, Path]:
    """Persist detailed and aggregate sensitivity results as CSV files."""

    route_path = output_directory / ROUTE_RESULTS_NAME
    summary_path = output_directory / SUMMARY_RESULTS_NAME
    _write_models(route_path, evaluation.route_results)
    _write_models(summary_path, evaluation.summaries)
    return route_path, summary_path


async def run_pilot_evaluation() -> tuple[Path, Path]:
    """Evaluate cached real pilot routes against the fixed OSM snapshot."""

    settings = get_settings()
    expected_query = build_overpass_query(PILOT_ROUTING_BBOX)
    snapshot = OsmSnapshotStore(settings.osm_snapshot_path).load(
        expected_query_sha256=query_sha256(expected_query)
    )
    if snapshot is None:
        raise OsmSnapshotInvalidError("local OSM snapshot is missing")
    profile = MobilityProfile(profile_id="evaluacion_corredores")
    route_set = await create_ors_base_route_provider(settings).get_base_routes(
        PILOT_ORIGIN,
        PILOT_DESTINATION,
        profile,
    )
    evaluation = evaluate_corridor_widths(
        route_set.routes,
        snapshot,
        profile,
    )
    return save_corridor_evaluation(evaluation, OUTPUT_DIRECTORY)


def main() -> None:
    """Generate evaluator-facing CSV evidence with sanitized logs."""

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    route_path, summary_path = asyncio.run(run_pilot_evaluation())
    LOGGER.info("Resultados por ruta guardados en %s", route_path)
    LOGGER.info("Resumen por ancho guardado en %s", summary_path)


if __name__ == "__main__":
    main()
