"""Validated and privacy-conscious ORS geocoding client."""

import asyncio
import hashlib
from collections.abc import Sequence
from typing import Literal, Optional

import httpx
from pydantic import BaseModel, ConfigDict, Field, SecretStr, ValidationError

from backend.enrichment.osm_snapshot import PILOT_ROUTING_BBOX, OsmBoundingBox
from backend.places.geocoding_cache import GeocodingCache, GeocodingCacheError
from backend.places.models import PlaceResult

ORS_GEOCODE_SEARCH_URL = "https://api.openrouteservice.org/geocode/search"


class OrsGeocoderError(RuntimeError):
    """Base class for sanitized geocoding failures."""


class OrsGeocoderAuthenticationError(OrsGeocoderError):
    """Raised when ORS rejects the backend credential."""


class OrsGeocoderRejectedError(OrsGeocoderError):
    """Raised when ORS rejects a non-transient geocoding request."""


class OrsGeocoderUnavailableError(OrsGeocoderError):
    """Raised after transient geocoding failures exhaust retries."""


class OrsGeocoderInvalidResponseError(OrsGeocoderError):
    """Raised when a successful response cannot be trusted."""


class _PeliasPointGeometry(BaseModel):
    """Minimal validated GeoJSON point returned by Pelias."""

    model_config = ConfigDict(extra="ignore")

    type: Literal["Point"]
    coordinates: tuple[
        float,
        float,
    ]


class _PeliasProperties(BaseModel):
    """Minimal human-readable fields required from one Pelias result."""

    model_config = ConfigDict(extra="ignore")

    gid: str = Field(min_length=1, max_length=300)
    label: str = Field(min_length=1, max_length=300)
    name: str = Field(min_length=1, max_length=100)


class _PeliasFeature(BaseModel):
    """One validated Pelias feature."""

    model_config = ConfigDict(extra="ignore")

    type: Literal["Feature"]
    geometry: _PeliasPointGeometry
    properties: _PeliasProperties


class _PeliasFeatureCollection(BaseModel):
    """Bounded subset of the public Pelias response."""

    model_config = ConfigDict(extra="ignore")

    type: Literal["FeatureCollection"]
    features: list[_PeliasFeature] = Field(max_length=10)


def _inside_bbox(longitude: float, latitude: float, bbox: OsmBoundingBox) -> bool:
    """Return whether one coordinate is covered by the pilot snapshot."""

    return (
        bbox.west <= longitude <= bbox.east
        and bbox.south <= latitude <= bbox.north
    )


def _public_place_id(feature: _PeliasFeature) -> str:
    """Create an opaque stable identifier without exposing provider internals."""

    longitude, latitude = feature.geometry.coordinates
    canonical = f"{feature.properties.gid}|{longitude:.7f}|{latitude:.7f}"
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:24]
    return f"ors_{digest}"


def _to_public_places(
    collection: _PeliasFeatureCollection,
    bbox: OsmBoundingBox,
) -> list[PlaceResult]:
    """Transform in-bounds Pelias features into stable public results."""

    places: list[PlaceResult] = []
    seen_ids: set[str] = set()
    for feature in collection.features:
        longitude, latitude = feature.geometry.coordinates
        if not _inside_bbox(longitude, latitude, bbox):
            continue
        place_id = _public_place_id(feature)
        if place_id in seen_ids:
            continue
        seen_ids.add(place_id)
        places.append(
            PlaceResult(
                place_id=place_id,
                name=feature.properties.name,
                description=feature.properties.label[:180],
                location={"latitude": latitude, "longitude": longitude},
                source="ors_geocoder",
            )
        )
    return places


class OrsGeocoderClient:
    """Resolve explicit address searches through ORS without logging user text."""

    def __init__(
        self,
        api_key: SecretStr,
        *,
        http_client: Optional[httpx.AsyncClient] = None,
        timeout_seconds: float = 10.0,
        retry_delays: Sequence[float] = (0.5,),
        search_url: str = ORS_GEOCODE_SEARCH_URL,
        bbox: OsmBoundingBox = PILOT_ROUTING_BBOX,
        cache: Optional[GeocodingCache] = None,
    ) -> None:
        """Configure a bounded backend-only geocoding client.

        Args:
            api_key: Backend-only ORS credential.
            http_client: Optional injected client used in tests and composition.
            timeout_seconds: Maximum duration of each request.
            retry_delays: Delays before retrying transient failures.
            search_url: HTTPS ORS geocoding endpoint.
            bbox: Spatial boundary also checked after receiving results.
            cache: Optional private cache for validated public results.

        Raises:
            ValueError: If configuration is unsafe or invalid.
        """

        if not api_key.get_secret_value().strip():
            raise ValueError("ORS geocoding API key must not be empty")
        if timeout_seconds <= 0.0:
            raise ValueError("ORS geocoding timeout must be greater than zero")
        if any(delay < 0.0 for delay in retry_delays):
            raise ValueError("ORS geocoding retry delays must not be negative")
        if not search_url.startswith("https://"):
            raise ValueError("ORS geocoding URL must use HTTPS")
        self._api_key = api_key
        self._http_client = http_client
        self._timeout = httpx.Timeout(timeout_seconds)
        self._retry_delays = tuple(retry_delays)
        self._search_url = search_url
        self._bbox = bbox
        self._cache = cache

    async def search(self, query: str, *, limit: int = 5) -> list[PlaceResult]:
        """Return validated address matches located inside the pilot area.

        Args:
            query: Explicit user search text between two and eighty characters.
            limit: Maximum number of public results between one and ten.

        Returns:
            Stable, in-bounds place results in provider relevance order.

        Raises:
            ValueError: If query or limit is outside public API bounds.
            OrsGeocoderError: If the provider fails or returns invalid data.
        """

        normalized_query = " ".join(query.split())
        if not 2 <= len(normalized_query) <= 80:
            raise ValueError("geocoding query must contain between 2 and 80 characters")
        if not 1 <= limit <= 10:
            raise ValueError("geocoding result limit must be between 1 and 10")
        if self._cache is not None:
            try:
                cached = self._cache.load(normalized_query, limit, self._bbox)
            except GeocodingCacheError:
                raise OrsGeocoderInvalidResponseError(
                    "ORS geocoder cache is invalid"
                ) from None
            if cached is not None:
                return cached
        params: dict[str, object] = {
            "text": normalized_query,
            "size": limit,
            "lang": "es",
            "boundary.rect.min_lon": self._bbox.west,
            "boundary.rect.min_lat": self._bbox.south,
            "boundary.rect.max_lon": self._bbox.east,
            "boundary.rect.max_lat": self._bbox.north,
        }
        headers = {
            "Authorization": self._api_key.get_secret_value(),
            "Accept": "application/json",
        }
        if self._http_client is not None:
            response = await self._get_with_retries(
                self._http_client,
                params=params,
                headers=headers,
            )
        else:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await self._get_with_retries(
                    client,
                    params=params,
                    headers=headers,
                )
        try:
            collection = _PeliasFeatureCollection.model_validate(response.json())
            places = _to_public_places(collection, self._bbox)
        except (ValueError, ValidationError):
            raise OrsGeocoderInvalidResponseError(
                "ORS geocoder returned an invalid response"
            ) from None
        if self._cache is not None:
            try:
                self._cache.save(normalized_query, limit, self._bbox, places)
            except GeocodingCacheError:
                raise OrsGeocoderInvalidResponseError(
                    "ORS geocoder cache could not be written"
                ) from None
        return places

    async def _get_with_retries(
        self,
        client: httpx.AsyncClient,
        *,
        params: dict[str, object],
        headers: dict[str, str],
    ) -> httpx.Response:
        """Send one bounded GET request and retry transient failures only."""

        attempt_count = len(self._retry_delays) + 1
        for attempt in range(attempt_count):
            try:
                response = await client.get(
                    self._search_url,
                    params=params,
                    headers=headers,
                    timeout=self._timeout,
                )
            except (httpx.TimeoutException, httpx.NetworkError):
                if attempt == attempt_count - 1:
                    raise OrsGeocoderUnavailableError(
                        "ORS geocoder is temporarily unavailable"
                    ) from None
            else:
                if response.status_code in (401, 403):
                    raise OrsGeocoderAuthenticationError(
                        "ORS geocoder authentication failed"
                    )
                if response.status_code == 429 or response.status_code >= 500:
                    if attempt == attempt_count - 1:
                        raise OrsGeocoderUnavailableError(
                            "ORS geocoder is temporarily unavailable"
                        )
                elif 400 <= response.status_code:
                    raise OrsGeocoderRejectedError(
                        "ORS geocoder rejected the request"
                    )
                else:
                    return response
            if attempt < len(self._retry_delays):
                await asyncio.sleep(self._retry_delays[attempt])
        raise OrsGeocoderUnavailableError("ORS geocoder is temporarily unavailable")
