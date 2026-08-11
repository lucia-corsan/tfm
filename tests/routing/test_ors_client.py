"""Tests for the asynchronous OpenRouteService HTTP client."""

import json
from pathlib import Path

import httpx
import pytest
from pydantic import SecretStr

from backend.domain import GeoPoint
from backend.routing.ors_cache import OrsRouteCache
from backend.routing.ors_client import (
    ORS_DIRECTIONS_URL,
    OrsAuthenticationError,
    OrsClient,
    OrsInvalidResponseError,
    OrsRequestRejectedError,
    OrsServiceUnavailableError,
)


def _valid_response() -> dict[str, object]:
    """Return a valid minimal ORS route collection for client tests."""

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-3.7191, 40.4353], [-3.7206, 40.4211]],
                },
                "properties": {
                    "summary": {"distance": 1800.0, "duration": 1500.0},
                    "segments": [
                        {
                            "distance": 1800.0,
                            "duration": 1500.0,
                            "steps": [
                                {
                                    "distance": 1800.0,
                                    "duration": 1500.0,
                                    "type": 10,
                                    "instruction": "Has llegado a tu destino",
                                    "way_points": [0, 1],
                                }
                            ],
                        }
                    ],
                },
            }
        ],
    }


def _points() -> tuple[GeoPoint, GeoPoint]:
    """Return stable pilot-area coordinates."""

    return (
        GeoPoint(latitude=40.4353, longitude=-3.7191),
        GeoPoint(latitude=40.4211, longitude=-3.7206),
    )


@pytest.mark.asyncio
async def test_client_sends_secret_in_header_and_validated_body() -> None:
    """The credential stays in the header and coordinates use ORS order."""

    captured_request: httpx.Request | None = None

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_request
        captured_request = request
        return httpx.Response(200, json=_valid_response())

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        client = OrsClient(
            SecretStr("private-test-key"),
            http_client=http_client,
            retry_delays=(),
        )
        origin, destination = _points()

        result = await client.fetch_routes(origin, destination, avoid_steps=True)

    assert len(result.features) == 1
    assert captured_request is not None
    assert str(captured_request.url) == ORS_DIRECTIONS_URL
    assert captured_request.headers["Authorization"] == "private-test-key"
    body = json.loads(captured_request.content)
    assert body["coordinates"] == [[-3.7191, 40.4353], [-3.7206, 40.4211]]
    assert body["options"] == {"avoid_features": ["steps"]}
    assert "private-test-key" not in captured_request.content.decode()
    assert "private-test-key" not in str(captured_request.url)


@pytest.mark.asyncio
async def test_client_retries_transient_response_then_succeeds() -> None:
    """A temporary ORS failure is retried a bounded number of times."""

    attempts = 0

    async def handler(_request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(503, json={"error": "temporary"})
        return httpx.Response(200, json=_valid_response())

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = OrsClient(
            SecretStr("test-key"),
            http_client=http_client,
            retry_delays=(0.0,),
        )
        origin, destination = _points()

        result = await client.fetch_routes(origin, destination, avoid_steps=False)

    assert attempts == 2
    assert len(result.features) == 1


@pytest.mark.asyncio
async def test_client_saves_then_reuses_validated_cache(tmp_path: Path) -> None:
    """An identical second request is served locally without another HTTP call."""

    attempts = 0

    async def handler(_request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        return httpx.Response(200, json=_valid_response())

    cache = OrsRouteCache(tmp_path / "ors")
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = OrsClient(
            SecretStr("test-key"),
            http_client=http_client,
            retry_delays=(),
            route_cache=cache,
        )
        origin, destination = _points()

        downloaded = await client.fetch_routes(origin, destination, avoid_steps=True)
        restored = await client.fetch_routes(origin, destination, avoid_steps=True)

    assert attempts == 1
    assert restored == downloaded
    assert len(list((tmp_path / "ors").glob("*.json"))) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize("status_code", [429, 500, 503])
async def test_client_sanitizes_exhausted_transient_errors(status_code: int) -> None:
    """Retry exhaustion exposes neither provider payload nor request data."""

    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, text="secret provider detail")

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = OrsClient(
            SecretStr("private-test-key"),
            http_client=http_client,
            retry_delays=(0.0,),
        )
        origin, destination = _points()

        with pytest.raises(OrsServiceUnavailableError) as error:
            await client.fetch_routes(origin, destination, avoid_steps=True)

    message = str(error.value)
    assert message == "ORS service is temporarily unavailable"
    assert "private-test-key" not in message
    assert "40.4353" not in message
    assert "secret provider detail" not in message


@pytest.mark.asyncio
async def test_client_sanitizes_network_timeout() -> None:
    """Repeated timeouts become one stable provider error."""

    async def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("request details", request=request)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = OrsClient(
            SecretStr("test-key"),
            http_client=http_client,
            retry_delays=(0.0,),
        )
        origin, destination = _points()

        with pytest.raises(OrsServiceUnavailableError, match="temporarily unavailable"):
            await client.fetch_routes(origin, destination, avoid_steps=True)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("status_code", "error_type"),
    [(400, OrsRequestRejectedError), (403, OrsAuthenticationError)],
)
async def test_client_does_not_retry_permanent_errors(
    status_code: int, error_type: type[Exception]
) -> None:
    """Invalid requests and credentials fail once with stable error classes."""

    attempts = 0

    async def handler(_request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        return httpx.Response(status_code, text="provider detail")

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = OrsClient(
            SecretStr("test-key"),
            http_client=http_client,
            retry_delays=(0.0, 0.0),
        )
        origin, destination = _points()

        with pytest.raises(error_type):
            await client.fetch_routes(origin, destination, avoid_steps=True)

    assert attempts == 1


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(200, content=b"not-json"),
        httpx.Response(200, json={"type": "FeatureCollection", "features": []}),
    ],
)
async def test_client_rejects_invalid_success_responses(response: httpx.Response) -> None:
    """Malformed successful responses never enter route processing."""

    async def handler(_request: httpx.Request) -> httpx.Response:
        return response

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = OrsClient(
            SecretStr("test-key"),
            http_client=http_client,
            retry_delays=(),
        )
        origin, destination = _points()

        with pytest.raises(OrsInvalidResponseError) as error:
            await client.fetch_routes(origin, destination, avoid_steps=True)

    assert str(error.value) == "ORS returned an invalid response"
