"""Metric spatial similarity and conservative deduplication for ORS routes."""

from collections.abc import Sequence

from pydantic import BaseModel, ConfigDict, Field, computed_field
from pyproj import Transformer
from shapely.geometry import LineString

from backend.routing.ors_models import OrsLineString, OrsRouteFeature

WGS84_TO_ETRS89_UTM30 = Transformer.from_crs("EPSG:4326", "EPSG:25830", always_xy=True)


class SpatialDeduplicationConfig(BaseModel):
    """Thresholds used to classify two route geometries as near duplicates."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    tolerance_m: float = Field(gt=0.0, le=50.0)
    minimum_overlap_ratio: float = Field(gt=0.0, le=1.0)
    maximum_length_difference_ratio: float = Field(ge=0.0, le=0.5)


CALIBRATED_SPATIAL_DEDUPLICATION_CONFIG = SpatialDeduplicationConfig(
    tolerance_m=2.0,
    minimum_overlap_ratio=0.98,
    maximum_length_difference_ratio=0.03,
)


class RouteSpatialSimilarity(BaseModel):
    """Symmetric overlap and length difference between two routes."""

    model_config = ConfigDict(extra="forbid")

    first_length_m: float = Field(gt=0.0)
    second_length_m: float = Field(gt=0.0)
    overlap_ratio: float = Field(ge=0.0, le=1.0)
    relative_length_difference: float = Field(ge=0.0)


class SpatialDuplicateRecord(BaseModel):
    """Trace a discarded near duplicate to the earlier route that retained it."""

    model_config = ConfigDict(extra="forbid")

    duplicate_index: int = Field(ge=0)
    kept_index: int = Field(ge=0)
    similarity: RouteSpatialSimilarity


class SpatialDeduplicationResult(BaseModel):
    """Unique routes and auditable near-duplicate decisions."""

    model_config = ConfigDict(extra="forbid")

    unique_features: list[OrsRouteFeature] = Field(default_factory=list)
    duplicates: list[SpatialDuplicateRecord] = Field(default_factory=list)

    @computed_field(return_type=int)
    @property
    def duplicate_count(self) -> int:
        """Return the number of spatially redundant candidates."""

        return len(self.duplicates)


def project_route_geometry(geometry: OrsLineString) -> LineString:
    """Project a validated WGS84 route to ETRS89 / UTM zone 30N.

    Args:
        geometry: ORS route in longitude-latitude order.

    Returns:
        Metric Shapely LineString suitable for length and buffer operations.

    Raises:
        ValueError: If projection produces an empty or zero-length line.
    """

    projected = LineString(
        [
            WGS84_TO_ETRS89_UTM30.transform(longitude, latitude)
            for longitude, latitude in geometry.coordinates
        ]
    )
    if projected.is_empty or projected.length <= 0.0:
        raise ValueError("projected route geometry must have positive length")
    return projected


def compare_route_geometries(
    first: OrsLineString,
    second: OrsLineString,
    *,
    tolerance_m: float,
) -> RouteSpatialSimilarity:
    """Measure conservative symmetric corridor overlap in metric units.

    Each route is intersected with a buffer around the other. The smaller of
    the two covered-length ratios is used so a short route contained within a
    much longer one cannot appear fully equivalent.

    Args:
        first: First validated route geometry.
        second: Second validated route geometry.
        tolerance_m: Buffer radius in metres around each route.

    Returns:
        Symmetric overlap and relative length difference.

    Raises:
        ValueError: If tolerance is not strictly positive.
    """

    if tolerance_m <= 0.0:
        raise ValueError("spatial tolerance must be greater than zero")

    first_metric = project_route_geometry(first)
    second_metric = project_route_geometry(second)
    first_covered = first_metric.intersection(second_metric.buffer(tolerance_m)).length
    second_covered = second_metric.intersection(first_metric.buffer(tolerance_m)).length
    first_ratio = min(1.0, first_covered / first_metric.length)
    second_ratio = min(1.0, second_covered / second_metric.length)
    shortest_length = min(first_metric.length, second_metric.length)

    return RouteSpatialSimilarity(
        first_length_m=first_metric.length,
        second_length_m=second_metric.length,
        overlap_ratio=min(first_ratio, second_ratio),
        relative_length_difference=(
            abs(first_metric.length - second_metric.length) / shortest_length
        ),
    )


def is_spatial_duplicate(
    similarity: RouteSpatialSimilarity,
    config: SpatialDeduplicationConfig,
) -> bool:
    """Apply calibrated thresholds to one pairwise similarity result.

    Args:
        similarity: Metric comparison of two route geometries.
        config: Overlap, length and tolerance policy.

    Returns:
        Whether the pair satisfies both near-duplicate conditions.
    """

    return (
        similarity.overlap_ratio >= config.minimum_overlap_ratio
        and similarity.relative_length_difference
        <= config.maximum_length_difference_ratio
    )


def deduplicate_spatial_route_features(
    features: Sequence[OrsRouteFeature],
    config: SpatialDeduplicationConfig,
) -> SpatialDeduplicationResult:
    """Greedily keep the first candidate from each near-duplicate group.

    Args:
        features: Routes already deduplicated by exact geometry.
        config: Calibrated spatial classification thresholds.

    Returns:
        Surviving routes in provider order and auditable duplicate records.
    """

    unique_features: list[OrsRouteFeature] = []
    unique_original_indices: list[int] = []
    duplicates: list[SpatialDuplicateRecord] = []

    for candidate_index, feature in enumerate(features):
        for kept_index, kept_feature in zip(unique_original_indices, unique_features):
            similarity = compare_route_geometries(
                kept_feature.geometry,
                feature.geometry,
                tolerance_m=config.tolerance_m,
            )
            if is_spatial_duplicate(similarity, config):
                duplicates.append(
                    SpatialDuplicateRecord(
                        duplicate_index=candidate_index,
                        kept_index=kept_index,
                        similarity=similarity,
                    )
                )
                break
        else:
            unique_features.append(feature)
            unique_original_indices.append(candidate_index)

    return SpatialDeduplicationResult(
        unique_features=unique_features,
        duplicates=duplicates,
    )
