"""Deterministic exact deduplication for validated ORS route geometries."""

import hashlib
import json
from collections.abc import Sequence

from pydantic import BaseModel, ConfigDict, Field, computed_field

from backend.routing.ors_models import OrsLineString, OrsRouteFeature


class ExactDuplicateRecord(BaseModel):
    """Trace one discarded geometry back to the first matching candidate."""

    model_config = ConfigDict(extra="forbid")

    duplicate_index: int = Field(ge=0)
    kept_index: int = Field(ge=0)
    geometry_fingerprint: str = Field(pattern=r"^[0-9a-f]{64}$")


class ExactDeduplicationResult(BaseModel):
    """Unique route features plus an auditable record of exact duplicates."""

    model_config = ConfigDict(extra="forbid")

    unique_features: list[OrsRouteFeature] = Field(default_factory=list)
    duplicates: list[ExactDuplicateRecord] = Field(default_factory=list)

    @computed_field(return_type=int)
    @property
    def duplicate_count(self) -> int:
        """Return the number of discarded duplicate candidates."""

        return len(self.duplicates)


def geometry_fingerprint(geometry: OrsLineString) -> str:
    """Build a stable fingerprint from an exact, direction-sensitive geometry.

    Coordinates are already validated and converted to floats by Pydantic. No
    rounding is applied, so close but distinct paths retain different hashes.

    Args:
        geometry: Validated ORS LineString in longitude-latitude order.

    Returns:
        Lowercase SHA-256 digest of the canonical coordinate sequence.
    """

    coordinates = [
        [0.0 if longitude == 0.0 else longitude, 0.0 if latitude == 0.0 else latitude]
        for longitude, latitude in geometry.coordinates
    ]
    canonical = json.dumps(
        coordinates,
        allow_nan=False,
        ensure_ascii=True,
        separators=(",", ":"),
    ).encode("ascii")
    return hashlib.sha256(canonical).hexdigest()


def deduplicate_exact_route_features(
    features: Sequence[OrsRouteFeature],
) -> ExactDeduplicationResult:
    """Keep the first route for each exact geometry fingerprint.

    Route properties do not affect equality: two candidates following exactly
    the same ordered vertices represent one path even if their summaries or
    instructions differ.

    Args:
        features: Validated route features in provider order.

    Returns:
        Unique features in their original order and duplicate trace records.
    """

    unique_features: list[OrsRouteFeature] = []
    duplicates: list[ExactDuplicateRecord] = []
    first_index_by_fingerprint: dict[str, int] = {}

    for candidate_index, feature in enumerate(features):
        fingerprint = geometry_fingerprint(feature.geometry)
        kept_index = first_index_by_fingerprint.get(fingerprint)
        if kept_index is None:
            first_index_by_fingerprint[fingerprint] = candidate_index
            unique_features.append(feature)
            continue

        duplicates.append(
            ExactDuplicateRecord(
                duplicate_index=candidate_index,
                kept_index=kept_index,
                geometry_fingerprint=fingerprint,
            )
        )

    return ExactDeduplicationResult(
        unique_features=unique_features,
        duplicates=duplicates,
    )
