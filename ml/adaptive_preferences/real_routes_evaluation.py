"""Evaluate adaptive preferences on fixed ORS routes enriched with OSM."""

import argparse
import asyncio
import csv
import logging
import math
import random
import statistics
from collections import defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from backend.config import Settings, get_settings
from backend.domain import GeoPoint, MobilityProfile, PreferenceWeights
from backend.enrichment.osm_snapshot import (
    PILOT_ROUTING_BBOX,
    OsmSnapshotInvalidError,
    OsmSnapshotStore,
    build_overpass_query,
    query_sha256,
)
from backend.enrichment.route_association import DEFAULT_CORRIDOR_WIDTH_M, associate_route_corridor
from backend.enrichment.route_enrichment import enrich_ors_route_set
from backend.enrichment.spatial_index import OsmSpatialIndex
from backend.feedback import (
    PREFERENCE_DIMENSIONS,
    ComparedRoute,
    LearningConfig,
    PairwiseChoice,
    initialize_learning,
    update_preferences,
)
from backend.routing.ors_cache import OrsRouteCache
from backend.routing.ors_models import build_ors_route_request
from backend.routing.ors_provider import create_ors_base_route_provider
from backend.scoring import NormalizedWeights, RouteCosts, compute_route_costs, normalize_weights
from backend.scoring.constraints import evaluate_constraints
from ml.adaptive_preferences.evaluation import SyntheticProfile, build_synthetic_profiles

LOGGER = logging.getLogger(__name__)

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = REPOSITORY_ROOT / "docs" / "evaluation" / "artifacts"
REAL_EVALUATION_CACHE_DIR = REPOSITORY_ROOT / "data" / "raw" / "ors-real-evaluation"
COSTS_PATH = ARTIFACTS_DIR / "aprendizaje-rutas-reales-costes.csv"
RUNS_PATH = ARTIFACTS_DIR / "aprendizaje-rutas-reales-ejecuciones.csv"
SUMMARY_PATH = ARTIFACTS_DIR / "aprendizaje-rutas-reales-resumen.csv"
DIMENSIONS_PATH = ARTIFACTS_DIR / "aprendizaje-rutas-reales-dimensiones.csv"
SCENARIOS_PATH = ARTIFACTS_DIR / "aprendizaje-rutas-reales-escenarios.csv"
CURVE_PATH = ARTIFACTS_DIR / "aprendizaje-rutas-reales-curva.csv"
PREFERENCES_PATH = ARTIFACTS_DIR / "aprendizaje-rutas-reales-preferencias.csv"
FIGURE_PATH = REPOSITORY_ROOT / "docs" / "figures" / "aprendizaje-rutas-reales.png"

TRAINING_CHOICES = 60
CHECKPOINTS = (0, 3, 5, 10, 20, 40, 60)
EVALUATION_SEEDS = tuple(range(2026081901, 2026081921))
CHOICE_NOISE = 0.10
REAL_ROUTE_LEARNING_CONFIG = LearningConfig(
    learning_rate=0.06,
    inverse_temperature=3.0,
    regularization_strength=0.05,
    observation_choices=3,
    influence_step=0.10,
    maximum_influence=0.50,
    maximum_learned_update_l1=0.12,
)

MODEL_LABELS = {
    "shortest": "Ruta más corta",
    "fixed": "Pesos declarados fijos",
    "adaptive": "Clasificación adaptativa",
}


@dataclass(frozen=True)
class RealRouteScenario:
    """One preregistered public origin-destination pair."""

    scenario_id: str
    split: Literal["training", "evaluation"]
    origin: GeoPoint
    destination: GeoPoint


REAL_ROUTE_SCENARIOS = (
    RealRouteScenario(
        "rr01",
        "training",
        GeoPoint(latitude=40.4353, longitude=-3.7191),
        GeoPoint(latitude=40.4211, longitude=-3.7206),
    ),
    RealRouteScenario(
        "rr02",
        "training",
        GeoPoint(latitude=40.4365, longitude=-3.7255),
        GeoPoint(latitude=40.4195, longitude=-3.7120),
    ),
    RealRouteScenario(
        "rr03",
        "training",
        GeoPoint(latitude=40.4365, longitude=-3.7120),
        GeoPoint(latitude=40.4195, longitude=-3.7255),
    ),
    RealRouteScenario(
        "rr04",
        "training",
        GeoPoint(latitude=40.4360, longitude=-3.7160),
        GeoPoint(latitude=40.4195, longitude=-3.7170),
    ),
    RealRouteScenario(
        "rr05",
        "training",
        GeoPoint(latitude=40.4365, longitude=-3.7255),
        GeoPoint(latitude=40.4280, longitude=-3.7120),
    ),
    RealRouteScenario(
        "rr06",
        "training",
        GeoPoint(latitude=40.4290, longitude=-3.7255),
        GeoPoint(latitude=40.4195, longitude=-3.7120),
    ),
    RealRouteScenario(
        "rr07",
        "training",
        GeoPoint(latitude=40.4365, longitude=-3.7120),
        GeoPoint(latitude=40.4250, longitude=-3.7240),
    ),
    RealRouteScenario(
        "rr08",
        "training",
        GeoPoint(latitude=40.4353, longitude=-3.7191),
        GeoPoint(latitude=40.4195, longitude=-3.7255),
    ),
    RealRouteScenario(
        "rr09",
        "evaluation",
        GeoPoint(latitude=40.4360, longitude=-3.7160),
        GeoPoint(latitude=40.4195, longitude=-3.7120),
    ),
    RealRouteScenario(
        "rr10",
        "evaluation",
        GeoPoint(latitude=40.4365, longitude=-3.7255),
        GeoPoint(latitude=40.4211, longitude=-3.7206),
    ),
    RealRouteScenario(
        "rr11",
        "evaluation",
        GeoPoint(latitude=40.4290, longitude=-3.7255),
        GeoPoint(latitude=40.4195, longitude=-3.7170),
    ),
    RealRouteScenario(
        "rr12",
        "evaluation",
        GeoPoint(latitude=40.4365, longitude=-3.7120),
        GeoPoint(latitude=40.4211, longitude=-3.7206),
    ),
)


class EvaluationModel(BaseModel):
    """Strict base model for evaluator-facing records."""

    model_config = ConfigDict(extra="forbid")


class RealRouteCostRecord(EvaluationModel):
    """Sanitized facts and normalized costs for one real route."""

    scenario_id: str = Field(pattern=r"^rr(0[1-9]|1[0-2])$")
    split: Literal["training", "evaluation"]
    request_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    osm_query_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    osm_base_timestamp: datetime
    ors_engine_version: Optional[str] = None
    ors_graph_date: Optional[str] = None
    route_id: str = Field(pattern=r"^ors_route_[1-3]$")
    candidate_count: int = Field(ge=1, le=3)
    distance_m: float = Field(gt=0.0)
    duration_s: float = Field(gt=0.0)
    accepted: bool
    violation_codes: list[str] = Field(default_factory=list)
    costs: RouteCosts

    @model_validator(mode="after")
    def keep_acceptance_consistent(self) -> "RealRouteCostRecord":
        """Ensure accepted routes have no violation and rejected routes do."""

        if self.accepted == bool(self.violation_codes):
            raise ValueError("acceptance and violation codes are inconsistent")
        return self


class ScenarioCollectionRecord(EvaluationModel):
    """Sanitized collection outcome for one preregistered route pair."""

    scenario_id: str = Field(pattern=r"^rr(0[1-9]|1[0-2])$")
    split: Literal["training", "evaluation"]
    request_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    status: Literal[
        "complete",
        "invalid_response",
        "service_unavailable",
        "request_rejected",
    ]
    candidate_count: int = Field(ge=0, le=3)
    accepted_count: int = Field(ge=0, le=3)
    eligible: bool

    @model_validator(mode="after")
    def keep_counts_and_status_consistent(self) -> "ScenarioCollectionRecord":
        """Require counts, eligibility, and provider status to agree."""

        if self.accepted_count > self.candidate_count:
            raise ValueError("accepted count cannot exceed candidate count")
        if self.eligible != (self.accepted_count >= 2):
            raise ValueError("eligibility requires at least two accepted routes")
        if self.status != "complete" and self.candidate_count != 0:
            raise ValueError("failed collections cannot claim route candidates")
        return self


class RealRouteDataset(EvaluationModel):
    """Complete sanitized dataset plus coverage of every fixed scenario."""

    routes: tuple[RealRouteCostRecord, ...]
    scenarios: tuple[ScenarioCollectionRecord, ...] = Field(min_length=12, max_length=12)


class RealRouteRun(EvaluationModel):
    """Metrics for one profile, seed, and comparison system."""

    profile_id: str
    seed: int
    noise: float = Field(ge=0.0, lt=1.0)
    model: Literal["shortest", "fixed", "adaptive"]
    model_label: str
    training_scenario_count: int = Field(ge=1)
    evaluation_scenario_count: int = Field(ge=1)
    choice_count: int = Field(ge=0)
    top1_accuracy: float = Field(ge=0.0, le=1.0)
    pairwise_accuracy: float = Field(ge=0.0, le=1.0)
    mean_regret: float = Field(ge=0.0)
    cumulative_training_regret: float = Field(ge=0.0)
    maximum_learned_jump_l1: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    maximum_effective_jump_l1: Optional[float] = Field(default=None, ge=0.0, le=2.0)


def validate_scenario_protocol(
    scenarios: Sequence[RealRouteScenario] = REAL_ROUTE_SCENARIOS,
) -> None:
    """Validate uniqueness, split size, and containment of fixed route pairs."""

    if len(scenarios) != 12:
        raise ValueError("the real-route protocol requires exactly twelve pairs")
    identifiers = [scenario.scenario_id for scenario in scenarios]
    pairs = [
        (
            scenario.origin.latitude,
            scenario.origin.longitude,
            scenario.destination.latitude,
            scenario.destination.longitude,
        )
        for scenario in scenarios
    ]
    if len(identifiers) != len(set(identifiers)) or len(pairs) != len(set(pairs)):
        raise ValueError("real-route scenarios and pairs must be unique")
    if sum(scenario.split == "training" for scenario in scenarios) != 8:
        raise ValueError("the protocol requires eight training pairs")
    if sum(scenario.split == "evaluation" for scenario in scenarios) != 4:
        raise ValueError("the protocol requires four evaluation pairs")
    for scenario in scenarios:
        for point in (scenario.origin, scenario.destination):
            if not (
                PILOT_ROUTING_BBOX.south <= point.latitude <= PILOT_ROUTING_BBOX.north
                and PILOT_ROUTING_BBOX.west <= point.longitude <= PILOT_ROUTING_BBOX.east
            ):
                raise ValueError("every fixed point must lie inside the OSM snapshot")


def _record_to_row(record: RealRouteCostRecord) -> dict[str, object]:
    """Flatten one validated route record for a stable CSV schema."""

    return {
        "scenario_id": record.scenario_id,
        "split": record.split,
        "request_sha256": record.request_sha256,
        "osm_query_sha256": record.osm_query_sha256,
        "osm_base_timestamp": record.osm_base_timestamp.isoformat(),
        "ors_engine_version": record.ors_engine_version or "",
        "ors_graph_date": record.ors_graph_date or "",
        "route_id": record.route_id,
        "candidate_count": record.candidate_count,
        "distance_m": record.distance_m,
        "duration_s": record.duration_s,
        "accepted": record.accepted,
        "violation_codes": "|".join(record.violation_codes),
        **record.costs.model_dump(),
    }


def _row_to_record(row: dict[str, str]) -> RealRouteCostRecord:
    """Validate one flattened CSV row without accepting undocumented fields."""

    expected = {
        "scenario_id",
        "split",
        "request_sha256",
        "osm_query_sha256",
        "osm_base_timestamp",
        "ors_engine_version",
        "ors_graph_date",
        "route_id",
        "candidate_count",
        "distance_m",
        "duration_s",
        "accepted",
        "violation_codes",
        *PREFERENCE_DIMENSIONS,
    }
    if set(row) != expected:
        raise ValueError("real-route cost CSV has an unexpected schema")
    return RealRouteCostRecord(
        scenario_id=row["scenario_id"],
        split=row["split"],
        request_sha256=row["request_sha256"],
        osm_query_sha256=row["osm_query_sha256"],
        osm_base_timestamp=datetime.fromisoformat(row["osm_base_timestamp"]),
        ors_engine_version=row["ors_engine_version"] or None,
        ors_graph_date=row["ors_graph_date"] or None,
        route_id=row["route_id"],
        candidate_count=int(row["candidate_count"]),
        distance_m=float(row["distance_m"]),
        duration_s=float(row["duration_s"]),
        accepted=row["accepted"].lower() == "true",
        violation_codes=[value for value in row["violation_codes"].split("|") if value],
        costs=RouteCosts(**{name: float(row[name]) for name in PREFERENCE_DIMENSIONS}),
    )


def save_cost_records(records: Sequence[RealRouteCostRecord], path: Path = COSTS_PATH) -> Path:
    """Write sanitized route costs without coordinates or geometries."""

    if not records:
        raise ValueError("at least one real route record is required")
    rows = [_record_to_row(record) for record in records]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    return path


def load_cost_records(path: Path = COSTS_PATH) -> tuple[RealRouteCostRecord, ...]:
    """Load and validate the versioned real-route cost dataset."""

    with path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise ValueError("real-route cost CSV is empty")
    records = tuple(_row_to_record(row) for row in rows)
    keys = [(record.scenario_id, record.route_id) for record in records]
    if len(keys) != len(set(keys)):
        raise ValueError("real-route cost CSV repeats a route")
    validate_route_metadata(records)
    return records


def validate_route_metadata(records: Sequence[RealRouteCostRecord]) -> None:
    """Reject datasets that mix incompatible external-data versions."""

    if not records:
        raise ValueError("real-route metadata requires at least one route")
    osm_versions = {
        (record.osm_query_sha256, record.osm_base_timestamp) for record in records
    }
    engine_versions = {
        record.ors_engine_version for record in records if record.ors_engine_version
    }
    graph_dates = {record.ors_graph_date for record in records if record.ors_graph_date}
    if len(osm_versions) != 1:
        raise ValueError("real-route costs mix OSM snapshot versions")
    if len(engine_versions) > 1:
        raise ValueError("real-route costs mix ORS engine versions")
    if len(graph_dates) > 1:
        raise ValueError("real-route costs mix ORS graph dates")

    grouped: dict[str, list[RealRouteCostRecord]] = defaultdict(list)
    for record in records:
        grouped[record.scenario_id].append(record)
    for scenario_records in grouped.values():
        request_hashes = {record.request_sha256 for record in scenario_records}
        candidate_counts = {record.candidate_count for record in scenario_records}
        if len(request_hashes) != 1 or len(candidate_counts) != 1:
            raise ValueError("one real-route scenario has inconsistent metadata")
        if scenario_records[0].candidate_count != len(scenario_records):
            raise ValueError("candidate count does not match the stored scenario routes")


async def collect_real_route_costs(settings: Settings) -> RealRouteDataset:
    """Fetch or reuse ORS routes and derive sanitized OSM-enriched costs."""

    from backend.routing.ors_client import (
        OrsInvalidResponseError,
        OrsRequestRejectedError,
        OrsServiceUnavailableError,
    )

    validate_scenario_protocol()
    expected_query = build_overpass_query(PILOT_ROUTING_BBOX)
    expected_query_hash = query_sha256(expected_query)
    snapshot = OsmSnapshotStore(settings.osm_snapshot_path).load(
        expected_query_sha256=expected_query_hash
    )
    if snapshot is None:
        raise OsmSnapshotInvalidError("local OSM snapshot is missing")

    profile = MobilityProfile(profile_id="evaluacion_rutas_reales")
    provider = create_ors_base_route_provider(settings)
    cache = OrsRouteCache(settings.ors_cache_dir)
    spatial_index = OsmSpatialIndex(snapshot)
    records: list[RealRouteCostRecord] = []
    scenario_records: list[ScenarioCollectionRecord] = []

    for scenario in REAL_ROUTE_SCENARIOS:
        request = build_ors_route_request(
            scenario.origin,
            scenario.destination,
            avoid_steps=profile.avoid_steps,
        )
        request_hash = cache.key_for(request)
        try:
            route_set = await provider.get_base_routes(
                scenario.origin,
                scenario.destination,
                profile,
            )
        except OrsInvalidResponseError:
            failure_status = "invalid_response"
        except OrsServiceUnavailableError:
            failure_status = "service_unavailable"
        except OrsRequestRejectedError:
            failure_status = "request_rejected"
        else:
            failure_status = None

        if failure_status is not None:
            scenario_records.append(
                ScenarioCollectionRecord(
                    scenario_id=scenario.scenario_id,
                    split=scenario.split,
                    request_sha256=request_hash,
                    status=failure_status,
                    candidate_count=0,
                    accepted_count=0,
                    eligible=False,
                )
            )
            LOGGER.warning(
                "%s: colección no disponible (%s).",
                scenario.scenario_id,
                failure_status,
            )
            continue

        associations = [
            associate_route_corridor(
                route,
                spatial_index,
                corridor_width_m=DEFAULT_CORRIDOR_WIDTH_M,
            )
            for route in route_set.routes
        ]
        candidates = enrich_ors_route_set(route_set.routes, associations, spatial_index)
        accepted_count = 0
        for candidate in candidates:
            constraint_result = evaluate_constraints(profile, candidate)
            accepted_count += int(constraint_result.accepted)
            records.append(
                RealRouteCostRecord(
                    scenario_id=scenario.scenario_id,
                    split=scenario.split,
                    request_sha256=request_hash,
                    osm_query_sha256=snapshot.query_sha256,
                    osm_base_timestamp=snapshot.osm_base_timestamp,
                    ors_engine_version=route_set.engine_version,
                    ors_graph_date=route_set.graph_date,
                    route_id=candidate.route_id,
                    candidate_count=len(candidates),
                    distance_m=candidate.features.distance_m,
                    duration_s=candidate.features.duration_s,
                    accepted=constraint_result.accepted,
                    violation_codes=[
                        violation.code.value for violation in constraint_result.violations
                    ],
                    costs=compute_route_costs(candidate),
                )
            )
        scenario_records.append(
            ScenarioCollectionRecord(
                scenario_id=scenario.scenario_id,
                split=scenario.split,
                request_sha256=request_hash,
                status="complete",
                candidate_count=len(candidates),
                accepted_count=accepted_count,
                eligible=accepted_count >= 2,
            )
        )
        LOGGER.info(
            "%s: %d candidata(s), %d aceptada(s).",
            scenario.scenario_id,
            len(candidates),
            accepted_count,
        )
    validate_route_metadata(records)
    return RealRouteDataset(routes=tuple(records), scenarios=tuple(scenario_records))


def _normalized_vector(weights: PreferenceWeights) -> tuple[float, ...]:
    """Return normalized weights in the canonical preference order."""

    normalized = weights if isinstance(weights, NormalizedWeights) else normalize_weights(weights)
    payload = normalized.model_dump()
    return tuple(payload[name] for name in PREFERENCE_DIMENSIONS)


def _weighted_cost(weights: PreferenceWeights, route: RealRouteCostRecord) -> float:
    """Return the latent scalar cost of one accepted route."""

    payload = route.costs.model_dump()
    return sum(
        weight * payload[name]
        for weight, name in zip(_normalized_vector(weights), PREFERENCE_DIMENSIONS)
    )


def _accepted_scenarios(
    records: Sequence[RealRouteCostRecord],
    split: Literal["training", "evaluation"],
) -> dict[str, tuple[RealRouteCostRecord, ...]]:
    """Group only eligible accepted alternatives in one protocol split."""

    grouped: dict[str, list[RealRouteCostRecord]] = defaultdict(list)
    for record in records:
        if record.split == split and record.accepted:
            grouped[record.scenario_id].append(record)
    return {
        scenario_id: tuple(sorted(routes, key=lambda route: route.route_id))
        for scenario_id, routes in grouped.items()
        if len(routes) >= 2
    }


def _best_route_index(
    weights: PreferenceWeights,
    routes: Sequence[RealRouteCostRecord],
) -> int:
    """Return a stable index for the lowest weighted route cost."""

    return min(
        range(len(routes)),
        key=lambda index: (_weighted_cost(weights, routes[index]), routes[index].route_id),
    )


def _shortest_route_index(routes: Sequence[RealRouteCostRecord]) -> int:
    """Return a stable index for the physically shortest accepted route."""

    return min(
        range(len(routes)),
        key=lambda index: (routes[index].distance_m, routes[index].route_id),
    )


def _balanced_training_sequence(
    scenario_ids: Sequence[str],
    count: int,
    random_source: random.Random,
) -> tuple[str, ...]:
    """Build a reproducible sequence with near-equal exposure per scenario."""

    if not scenario_ids or count <= 0:
        raise ValueError("training sequence requires scenarios and positive count")
    result: list[str] = []
    stable_ids = sorted(scenario_ids)
    while len(result) < count:
        cycle = stable_ids.copy()
        random_source.shuffle(cycle)
        result.extend(cycle)
    return tuple(result[:count])


def _evaluate_model(
    weights: PreferenceWeights,
    true_weights: PreferenceWeights,
    scenarios: Iterable[Sequence[RealRouteCostRecord]],
    *,
    shortest: bool = False,
) -> tuple[float, float, float]:
    """Measure top-1 accuracy, pairwise order, and latent regret."""

    scenario_list = list(scenarios)
    top1_correct = 0
    pairwise_correct = 0
    pair_count = 0
    regret = 0.0
    for routes in scenario_list:
        predicted = (
            _shortest_route_index(routes) if shortest else _best_route_index(weights, routes)
        )
        preferred = _best_route_index(true_weights, routes)
        top1_correct += int(predicted == preferred)
        best_cost = _weighted_cost(true_weights, routes[preferred])
        regret += _weighted_cost(true_weights, routes[predicted]) - best_cost
        predicted_costs = (
            [route.distance_m for route in routes]
            if shortest
            else [_weighted_cost(weights, route) for route in routes]
        )
        true_costs = [_weighted_cost(true_weights, route) for route in routes]
        for first in range(len(routes)):
            for second in range(first + 1, len(routes)):
                pairwise_correct += int(
                    (predicted_costs[first] <= predicted_costs[second])
                    == (true_costs[first] <= true_costs[second])
                )
                pair_count += 1
    return (
        top1_correct / len(scenario_list),
        pairwise_correct / pair_count,
        regret / len(scenario_list),
    )


def run_real_route_simulation(
    records: Sequence[RealRouteCostRecord],
    profile: SyntheticProfile,
    seed: int,
    *,
    noise: float = CHOICE_NOISE,
    choice_count: int = TRAINING_CHOICES,
) -> tuple[RealRouteRun, RealRouteRun, RealRouteRun]:
    """Train on fixed real scenarios and evaluate on held-out real scenarios."""

    if not 0.0 <= noise < 1.0:
        raise ValueError("choice noise must be between zero and one")
    training = _accepted_scenarios(records, "training")
    evaluation = _accepted_scenarios(records, "evaluation")
    if not training or not evaluation:
        raise ValueError("real-route evaluation requires eligible scenarios in both splits")

    order_source = random.Random(seed)
    noise_source = random.Random(seed + 10_000_000)
    order = (
        _balanced_training_sequence(tuple(training), choice_count, order_source)
        if choice_count > 0
        else ()
    )
    state = initialize_learning(
        profile.declared_weights,
        config=REAL_ROUTE_LEARNING_CONFIG,
        enabled=True,
    )
    cumulative = {model: 0.0 for model in MODEL_LABELS}
    maximum_learned_jump = 0.0
    maximum_effective_jump = 0.0

    for scenario_id in order:
        routes = training[scenario_id]
        preferred = _best_route_index(profile.true_weights, routes)
        predictions = {
            "shortest": _shortest_route_index(routes),
            "fixed": _best_route_index(profile.declared_weights, routes),
            "adaptive": _best_route_index(state.effective_weights, routes),
        }
        best_cost = _weighted_cost(profile.true_weights, routes[preferred])
        for model, predicted in predictions.items():
            cumulative[model] += _weighted_cost(profile.true_weights, routes[predicted]) - best_cost

        chosen = preferred
        if noise_source.random() < noise:
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
                unchosen=[route for index, route in enumerate(compared) if index != chosen],
            ),
        )
        state = update.updated_state
        maximum_learned_jump = max(maximum_learned_jump, update.learned_change_l1)
        maximum_effective_jump = max(maximum_effective_jump, update.effective_change_l1)

    model_weights = {
        "shortest": profile.declared_weights,
        "fixed": profile.declared_weights,
        "adaptive": state.effective_weights,
    }
    runs: list[RealRouteRun] = []
    for model, weights in model_weights.items():
        top1, pairwise, regret = _evaluate_model(
            weights,
            profile.true_weights,
            evaluation.values(),
            shortest=model == "shortest",
        )
        runs.append(
            RealRouteRun(
                profile_id=profile.profile_id,
                seed=seed,
                noise=noise,
                model=model,
                model_label=MODEL_LABELS[model],
                training_scenario_count=len(training),
                evaluation_scenario_count=len(evaluation),
                choice_count=choice_count,
                top1_accuracy=top1,
                pairwise_accuracy=pairwise,
                mean_regret=max(regret, 0.0),
                cumulative_training_regret=max(cumulative[model], 0.0),
                maximum_learned_jump_l1=(maximum_learned_jump if model == "adaptive" else None),
                maximum_effective_jump_l1=(maximum_effective_jump if model == "adaptive" else None),
            )
        )
    return runs[0], runs[1], runs[2]


def evaluate_real_routes(
    records: Sequence[RealRouteCostRecord],
) -> tuple[RealRouteRun, ...]:
    """Run every fixed learning checkpoint for four profiles and twenty seeds."""

    return tuple(
        run
        for profile in build_synthetic_profiles()
        for seed in EVALUATION_SEEDS
        for checkpoint in CHECKPOINTS
        for run in run_real_route_simulation(
            records,
            profile,
            seed,
            choice_count=checkpoint,
        )
    )


def _mean(values: Sequence[float]) -> float:
    """Return a mean while rejecting an empty metric collection."""

    if not values:
        raise ValueError("cannot average an empty sequence")
    return statistics.fmean(values)


def _interval(values: Sequence[float]) -> tuple[float, float, float]:
    """Return mean and an explicitly approximate normal 95% interval."""

    mean = _mean(values)
    if len(values) < 2:
        return mean, mean, mean
    margin = 1.96 * statistics.stdev(values) / math.sqrt(len(values))
    return mean, mean - margin, mean + margin


def summarize_runs(runs: Sequence[RealRouteRun]) -> list[dict[str, object]]:
    """Aggregate metrics without treating shared profile routes as independent."""

    profile_ids = [profile.profile_id for profile in build_synthetic_profiles()]
    rows: list[dict[str, object]] = []
    for scope in [*profile_ids, "all_profiles"]:
        for model in MODEL_LABELS:
            selected = [
                run
                for run in runs
                if run.model == model and (scope == "all_profiles" or run.profile_id == scope)
            ]
            if not selected:
                continue
            by_seed: dict[int, list[RealRouteRun]] = defaultdict(list)
            for run in selected:
                by_seed[run.seed].append(run)
            top1_by_seed = [
                _mean([run.top1_accuracy for run in by_seed[seed]]) for seed in sorted(by_seed)
            ]
            pairwise_by_seed = [
                _mean([run.pairwise_accuracy for run in by_seed[seed]]) for seed in sorted(by_seed)
            ]
            top1, top1_low, top1_high = _interval(top1_by_seed)
            pairwise, pairwise_low, pairwise_high = _interval(pairwise_by_seed)
            adaptive = [run for run in selected if run.maximum_effective_jump_l1 is not None]
            rows.append(
                {
                    "profile_id": scope,
                    "model": model,
                    "model_label": MODEL_LABELS[model],
                    "runs": len(selected),
                    "seed_clusters": len(by_seed),
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
                    "maximum_learned_jump_l1": (
                        max(run.maximum_learned_jump_l1 or 0.0 for run in adaptive)
                        if adaptive
                        else ""
                    ),
                    "maximum_effective_jump_l1": (
                        max(run.maximum_effective_jump_l1 or 0.0 for run in adaptive)
                        if adaptive
                        else ""
                    ),
                }
            )
    return rows


def summarize_curve(runs: Sequence[RealRouteRun]) -> list[dict[str, object]]:
    """Aggregate the real-route learning curve by independent seed cluster."""

    rows: list[dict[str, object]] = []
    for choice_count in CHECKPOINTS:
        for model in MODEL_LABELS:
            selected = [
                run for run in runs if run.choice_count == choice_count and run.model == model
            ]
            by_seed: dict[int, list[RealRouteRun]] = defaultdict(list)
            for run in selected:
                by_seed[run.seed].append(run)
            top1_by_seed = [
                _mean([run.top1_accuracy for run in by_seed[seed]]) for seed in sorted(by_seed)
            ]
            pairwise_by_seed = [
                _mean([run.pairwise_accuracy for run in by_seed[seed]]) for seed in sorted(by_seed)
            ]
            top1, top1_low, top1_high = _interval(top1_by_seed)
            pairwise, pairwise_low, pairwise_high = _interval(pairwise_by_seed)
            rows.append(
                {
                    "choice_count": choice_count,
                    "model": model,
                    "model_label": MODEL_LABELS[model],
                    "runs": len(selected),
                    "seed_clusters": len(by_seed),
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
                }
            )
    return rows


def plot_real_route_curve(rows: Sequence[dict[str, object]]) -> Path:
    """Plot the held-out accuracy without hiding the negative result."""

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.ticker import PercentFormatter

    colors = {
        "shortest": "#D97706",
        "fixed": "#008C95",
        "adaptive": "#7651D9",
    }
    markers = {"shortest": "s", "fixed": "o", "adaptive": "D"}
    figure, axis = plt.subplots(figsize=(10.5, 6.4))
    figure.patch.set_facecolor("#FAF9FE")
    axis.set_facecolor("#FAF9FE")
    axis.axvspan(0, 3, color="#E8E3F5", alpha=0.7, zorder=0)
    axis.text(
        1.5,
        0.06,
        "Observación",
        transform=axis.get_xaxis_transform(),
        ha="center",
        va="bottom",
        fontsize=9,
        color="#625A78",
    )
    for model in MODEL_LABELS:
        selected = [row for row in rows if row["model"] == model]
        axis.plot(
            [int(row["choice_count"]) for row in selected],
            [float(row["top1_mean"]) for row in selected],
            color=colors[model],
            marker=markers[model],
            linewidth=2.8,
            markersize=7,
            label=MODEL_LABELS[model],
        )
    axis.set_title(
        "El ajuste aprendido no se transfiere a los trayectos reservados",
        fontsize=16.5,
        fontweight="bold",
        color="#17213A",
        pad=18,
    )
    axis.text(
        0.0,
        1.02,
        "Exactitud media en 3 pares ORS+OSM no usados para actualizar pesos",
        transform=axis.transAxes,
        fontsize=11,
        color="#526079",
    )
    axis.set_xlabel("Elecciones sintéticas observadas sobre 4 pares de aprendizaje")
    axis.set_ylabel("Exactitud de la primera ruta")
    axis.set_xticks(CHECKPOINTS)
    axis.set_ylim(0.45, 1.04)
    axis.yaxis.set_major_formatter(PercentFormatter(1.0))
    axis.grid(axis="y", color="#D9DCE7", linewidth=0.9)
    axis.spines[["top", "right"]].set_visible(False)
    axis.legend(frameon=False, ncol=3, loc="lower left")
    axis.text(
        0.0,
        -0.20,
        "4 perfiles y 20 semillas; las semillas comparten las mismas rutas reales. "
        "No es un estudio con participantes.",
        transform=axis.transAxes,
        fontsize=9.3,
        color="#69748A",
    )
    FIGURE_PATH.parent.mkdir(parents=True, exist_ok=True)
    figure.tight_layout()
    figure.savefig(FIGURE_PATH, dpi=300, bbox_inches="tight")
    plt.close(figure)
    return FIGURE_PATH


def summarize_dimensions(
    records: Sequence[RealRouteCostRecord],
) -> list[dict[str, object]]:
    """Describe whether each learned dimension varies in accepted real routes."""

    accepted = [record for record in records if record.accepted]
    rows: list[dict[str, object]] = []
    for dimension in PREFERENCE_DIMENSIONS:
        values = [record.costs.model_dump()[dimension] for record in accepted]
        rows.append(
            {
                "dimension": dimension,
                "accepted_routes": len(values),
                "minimum": min(values),
                "maximum": max(values),
                "range": max(values) - min(values),
                "mean": _mean(values),
                "standard_deviation": statistics.pstdev(values),
                "constant": max(values) == min(values),
            }
        )
    return rows


def preference_diagnostics(
    records: Sequence[RealRouteCostRecord],
) -> list[dict[str, object]]:
    """Expose whether real scenarios distinguish the four latent profiles."""

    profiles = build_synthetic_profiles()
    rows: list[dict[str, object]] = []
    for split in ("training", "evaluation"):
        scenarios = _accepted_scenarios(records, split)
        for scenario_id, routes in sorted(scenarios.items()):
            shortest_route_id = routes[_shortest_route_index(routes)].route_id
            for profile in profiles:
                true_route_id = routes[_best_route_index(profile.true_weights, routes)].route_id
                fixed_route_id = routes[
                    _best_route_index(profile.declared_weights, routes)
                ].route_id
                rows.append(
                    {
                        "scenario_id": scenario_id,
                        "split": split,
                        "profile_id": profile.profile_id,
                        "shortest_route_id": shortest_route_id,
                        "latent_preferred_route_id": true_route_id,
                        "fixed_preferred_route_id": fixed_route_id,
                        "fixed_matches_latent": fixed_route_id == true_route_id,
                    }
                )
    return rows


def _write_dict_rows(path: Path, rows: Sequence[dict[str, object]]) -> Path:
    """Write non-empty dictionaries to a stable UTF-8 CSV."""

    if not rows:
        raise ValueError("evaluation output cannot be empty")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    return path


def save_scenario_records(
    records: Sequence[ScenarioCollectionRecord],
    path: Path = SCENARIOS_PATH,
) -> Path:
    """Persist provider coverage for all fixed origin-destination pairs."""

    return _write_dict_rows(
        path,
        [record.model_dump(mode="json") for record in records],
    )


def save_evaluation(
    runs: Sequence[RealRouteRun],
    records: Sequence[RealRouteCostRecord],
) -> tuple[Path, Path, Path, Path, Path, Path]:
    """Persist run-level, aggregate, and dimensional evidence."""

    final_runs = [run for run in runs if run.choice_count == TRAINING_CHOICES]
    run_rows = [run.model_dump(mode="json") for run in final_runs]
    curve_rows = summarize_curve(runs)
    return (
        _write_dict_rows(RUNS_PATH, run_rows),
        _write_dict_rows(SUMMARY_PATH, summarize_runs(final_runs)),
        _write_dict_rows(DIMENSIONS_PATH, summarize_dimensions(records)),
        _write_dict_rows(CURVE_PATH, curve_rows),
        _write_dict_rows(PREFERENCES_PATH, preference_diagnostics(records)),
        plot_real_route_curve(curve_rows),
    )


async def collect_command(settings: Settings) -> tuple[Path, Path]:
    """Collect and save the fixed real-route dataset."""

    experiment_settings = Settings.model_validate(
        {
            **settings.model_dump(),
            "ors_cache_dir": REAL_EVALUATION_CACHE_DIR,
        }
    )
    dataset = await collect_real_route_costs(experiment_settings)
    return (
        save_cost_records(dataset.routes),
        save_scenario_records(dataset.scenarios),
    )


def evaluate_command() -> tuple[Path, Path, Path, Path, Path, Path]:
    """Evaluate the frozen learner from the versioned real-route costs."""

    records = load_cost_records()
    runs = evaluate_real_routes(records)
    return save_evaluation(runs, records)


def main() -> None:
    """Run data collection or offline evaluation with sanitized logs."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("collect", "evaluate", "all"))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    if args.command in {"collect", "all"}:
        for path in asyncio.run(collect_command(get_settings())):
            LOGGER.info("Dato sanitizado guardado en %s.", path)
    if args.command in {"evaluate", "all"}:
        for path in evaluate_command():
            LOGGER.info("Resultado guardado en %s.", path)


if __name__ == "__main__":
    main()
