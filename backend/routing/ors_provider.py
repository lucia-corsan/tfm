"""Internal ORS provider for real routes awaiting OSM enrichment."""

from typing import Protocol

from backend.config import Settings
from backend.domain import GeoPoint, MobilityProfile
from backend.routing.candidate_deduplication import deduplicate_exact_route_features
from backend.routing.ors_cache import OrsRouteCache
from backend.routing.ors_client import OrsClient
from backend.routing.ors_models import (
    OrsBaseRouteSet,
    OrsRouteCollection,
    extract_ors_base_routes,
)
from backend.routing.spatial_deduplication import (
    CALIBRATED_SPATIAL_DEDUPLICATION_CONFIG,
    SpatialDeduplicationConfig,
    deduplicate_spatial_route_features,
)


class OrsConfigurationError(RuntimeError):
    """Raised when the backend lacks safe ORS configuration."""


class OrsRouteFetcher(Protocol):
    """Minimal asynchronous client interface required by the base provider."""

    async def fetch_routes(
        self,
        origin: GeoPoint,
        destination: GeoPoint,
        *,
        avoid_steps: bool,
    ) -> OrsRouteCollection:
        """Return validated raw ORS alternatives."""


class OrsBaseRouteProvider:
    """Fetch ORS routes and expose only neutral facts for later enrichment."""

    def __init__(
        self,
        fetcher: OrsRouteFetcher,
        spatial_deduplication_config: SpatialDeduplicationConfig = (
            CALIBRATED_SPATIAL_DEDUPLICATION_CONFIG
        ),
    ) -> None:
        """Configure the validated ORS response fetcher.

        Args:
            fetcher: Asynchronous source of validated ORS collections.
            spatial_deduplication_config: Calibrated conservative similarity policy.
        """

        self._fetcher = fetcher
        self._spatial_deduplication_config = spatial_deduplication_config

    async def get_base_routes(
        self,
        origin: GeoPoint,
        destination: GeoPoint,
        profile: MobilityProfile,
    ) -> OrsBaseRouteSet:
        """Return real routing facts without accessibility scoring.

        Args:
            origin: Requested route origin.
            destination: Requested route destination.
            profile: Local mobility profile whose critical step rule is applied.

        Returns:
            Real route alternatives ready for OSM enrichment.
        """

        collection = await self._fetcher.fetch_routes(
            origin,
            destination,
            avoid_steps=profile.avoid_steps,
        )
        deduplicated = deduplicate_exact_route_features(collection.features)
        spatially_deduplicated = deduplicate_spatial_route_features(
            deduplicated.unique_features,
            self._spatial_deduplication_config,
        )
        unique_collection = collection.model_copy(
            update={"features": spatially_deduplicated.unique_features}
        )
        return extract_ors_base_routes(unique_collection)


def create_ors_base_route_provider(settings: Settings) -> OrsBaseRouteProvider:
    """Create the internal ORS provider from backend-only settings.

    Args:
        settings: Validated backend configuration.

    Returns:
        Provider with private local cache and bounded HTTP timeout.

    Raises:
        OrsConfigurationError: If no ORS credential is configured.
    """

    if settings.ors_api_key is None:
        raise OrsConfigurationError("ORS is not configured")

    cache = OrsRouteCache(settings.ors_cache_dir)
    client = OrsClient(
        settings.ors_api_key,
        timeout_seconds=settings.ors_timeout_seconds,
        route_cache=cache,
    )
    return OrsBaseRouteProvider(client)
