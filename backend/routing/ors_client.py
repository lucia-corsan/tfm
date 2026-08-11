"""Asynchronous and privacy-preserving client for ORS pedestrian routes."""

import asyncio
from collections.abc import Sequence
from typing import Optional

import httpx
from pydantic import SecretStr, ValidationError

from backend.domain import GeoPoint
from backend.routing.ors_cache import OrsRouteCache
from backend.routing.ors_models import (
    OrsRouteCollection,
    build_ors_route_request,
    validate_ors_route_collection,
)

ORS_DIRECTIONS_URL = (
    "https://api.openrouteservice.org/v2/directions/foot-walking/geojson"
)


class OrsClientError(RuntimeError):
    """Base class for sanitized ORS integration failures."""


class OrsAuthenticationError(OrsClientError):
    """Raised when ORS rejects the configured credential."""


class OrsRequestRejectedError(OrsClientError):
    """Raised when ORS rejects a non-transient route request."""


class OrsServiceUnavailableError(OrsClientError):
    """Raised when ORS cannot answer after bounded retries."""


class OrsInvalidResponseError(OrsClientError):
    """Raised when ORS returns malformed or incompatible route data."""


class OrsClient:
    """Fetch and validate pedestrian alternatives without logging request data."""

    def __init__(
        self,
        api_key: SecretStr,
        *,
        http_client: Optional[httpx.AsyncClient] = None,
        timeout_seconds: float = 20.0,
        retry_delays: Sequence[float] = (0.5, 1.5),
        directions_url: str = ORS_DIRECTIONS_URL,
        route_cache: Optional[OrsRouteCache] = None,
    ) -> None:
        """Configure the ORS client and bounded transient retries.

        Args:
            api_key: Backend-only ORS credential.
            http_client: Optional shared client, primarily for tests and composition.
            timeout_seconds: Maximum duration of each HTTP attempt.
            retry_delays: Delays before retrying transient failures.
            directions_url: ORS GeoJSON directions endpoint.
            route_cache: Optional private local cache for validated responses.

        Raises:
            ValueError: If configuration values are empty or outside safe bounds.
        """

        if not api_key.get_secret_value().strip():
            raise ValueError("ORS API key must not be empty")
        if timeout_seconds <= 0.0:
            raise ValueError("ORS timeout must be greater than zero")
        if any(delay < 0.0 for delay in retry_delays):
            raise ValueError("ORS retry delays must not be negative")
        if not directions_url.startswith("https://"):
            raise ValueError("ORS directions URL must use HTTPS")

        self._api_key = api_key
        self._http_client = http_client
        self._timeout = httpx.Timeout(timeout_seconds)
        self._retry_delays = tuple(retry_delays)
        self._directions_url = directions_url
        self._route_cache = route_cache

    async def fetch_routes(
        self,
        origin: GeoPoint,
        destination: GeoPoint,
        *,
        avoid_steps: bool,
    ) -> OrsRouteCollection:
        """Request validated pedestrian alternatives from ORS.

        Args:
            origin: Route origin in application coordinate order.
            destination: Route destination in application coordinate order.
            avoid_steps: Whether known steps must be avoided during generation.

        Returns:
            Validated GeoJSON route collection.

        Raises:
            OrsAuthenticationError: If the credential is rejected.
            OrsRequestRejectedError: If ORS rejects the route parameters.
            OrsServiceUnavailableError: If transient failures exhaust retries.
            OrsInvalidResponseError: If a successful response is incompatible.
        """

        request = build_ors_route_request(
            origin,
            destination,
            avoid_steps=avoid_steps,
        )
        if self._route_cache is not None:
            cached = self._route_cache.load(request)
            if cached is not None:
                return cached

        payload = request.model_dump(mode="json", exclude_none=True)
        headers = {
            "Authorization": self._api_key.get_secret_value(),
            "Accept": "application/geo+json",
            "Content-Type": "application/json",
        }

        if self._http_client is not None:
            response = await self._post_with_retries(
                self._http_client,
                payload=payload,
                headers=headers,
            )
        else:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await self._post_with_retries(
                    client,
                    payload=payload,
                    headers=headers,
                )

        try:
            decoded = response.json()
            routes = validate_ors_route_collection(decoded)
        except (ValueError, ValidationError):
            raise OrsInvalidResponseError("ORS returned an invalid response") from None

        if self._route_cache is not None:
            self._route_cache.save(request, routes)
        return routes

    async def _post_with_retries(
        self,
        client: httpx.AsyncClient,
        *,
        payload: dict[str, object],
        headers: dict[str, str],
    ) -> httpx.Response:
        """Send one request and retry only transient failures."""

        attempt_count = len(self._retry_delays) + 1
        for attempt in range(attempt_count):
            try:
                response = await client.post(
                    self._directions_url,
                    json=payload,
                    headers=headers,
                    timeout=self._timeout,
                )
            except (httpx.TimeoutException, httpx.NetworkError):
                if attempt == attempt_count - 1:
                    raise OrsServiceUnavailableError(
                        "ORS service is temporarily unavailable"
                    ) from None
            else:
                if response.status_code in (401, 403):
                    raise OrsAuthenticationError("ORS authentication failed")
                if response.status_code == 429 or response.status_code >= 500:
                    if attempt == attempt_count - 1:
                        raise OrsServiceUnavailableError(
                            "ORS service is temporarily unavailable"
                        )
                elif 400 <= response.status_code:
                    raise OrsRequestRejectedError("ORS rejected the route request")
                else:
                    return response

            if attempt < len(self._retry_delays):
                await asyncio.sleep(self._retry_delays[attempt])

        raise OrsServiceUnavailableError("ORS service is temporarily unavailable")
