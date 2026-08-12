"""Tests for the bounded ORS/Pelias geocoding client."""

import httpx
import pytest
from pydantic import SecretStr

from backend.places.geocoding_cache import GeocodingCache
from backend.places.ors_geocoder import (
    ORS_GEOCODE_SEARCH_URL,
    OrsGeocoderAuthenticationError,
    OrsGeocoderClient,
    OrsGeocoderInvalidResponseError,
    OrsGeocoderUnavailableError,
)


def _response() -> dict[str, object]:
    """Return one in-bounds and one out-of-bounds Pelias feature."""

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [-3.7185, 40.4298]},
                "properties": {
                    "gid": "openstreetmap:address:private-123",
                    "name": "Calle de Ferraz, 22",
                    "label": "Calle de Ferraz, 22, Madrid, España",
                    "confidence": 0.9,
                },
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [-3.6908, 40.4075]},
                "properties": {
                    "gid": "openstreetmap:address:outside",
                    "name": "Estación de Atocha",
                    "label": "Estación de Atocha, Madrid, España",
                },
            },
        ],
    }


@pytest.mark.asyncio
async def test_client_sends_bounded_search_and_returns_only_pilot_results() -> None:
    """Search uses backend auth and validates every returned coordinate."""

    captured: httpx.Request | None = None

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured
        captured = request
        return httpx.Response(200, json=_response())

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = OrsGeocoderClient(
            SecretStr("private-key"),
            http_client=http_client,
            retry_delays=(),
        )
        places = await client.search("  Ferraz   22  ", limit=3)

    assert captured is not None
    assert captured.url.copy_with(query=None) == httpx.URL(ORS_GEOCODE_SEARCH_URL)
    assert captured.headers["Authorization"] == "private-key"
    assert captured.url.params["text"] == "Ferraz 22"
    assert captured.url.params["size"] == "3"
    assert captured.url.params["lang"] == "es"
    assert captured.url.params["boundary.rect.min_lon"] == "-3.728"
    assert "private-key" not in str(captured.url)
    assert len(places) == 1
    assert places[0].source == "ors_geocoder"
    assert places[0].name == "Calle de Ferraz, 22"
    assert places[0].place_id.startswith("ors_")
    assert "private-123" not in places[0].place_id


@pytest.mark.asyncio
async def test_client_accepts_a_valid_empty_result() -> None:
    """No matches is a normal result and never creates coordinates."""

    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"type": "FeatureCollection", "features": []})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = OrsGeocoderClient(
            SecretStr("test-key"), http_client=http_client, retry_delays=()
        )
        assert await client.search("dirección inexistente") == []


@pytest.mark.asyncio
async def test_client_reuses_cached_public_results(tmp_path) -> None:
    """An identical second search avoids another provider request."""

    attempts = 0

    async def handler(_request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        return httpx.Response(200, json=_response())

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = OrsGeocoderClient(
            SecretStr("test-key"),
            http_client=http_client,
            retry_delays=(),
            cache=GeocodingCache(tmp_path),
        )
        first = await client.search("Ferraz 22")
        second = await client.search("Ferraz 22")

    assert first == second
    assert attempts == 1


@pytest.mark.asyncio
async def test_client_retries_transient_failure_without_exposing_query() -> None:
    """A provider failure becomes one sanitized stable error."""

    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="provider detail with address")

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = OrsGeocoderClient(
            SecretStr("private-key"),
            http_client=http_client,
            retry_delays=(0.0,),
        )
        with pytest.raises(OrsGeocoderUnavailableError) as error:
            await client.search("Calle privada 123")

    assert str(error.value) == "ORS geocoder is temporarily unavailable"
    assert "Calle privada" not in str(error.value)
    assert "private-key" not in str(error.value)


@pytest.mark.asyncio
async def test_client_rejects_invalid_success_and_authentication() -> None:
    """Malformed data and credentials have distinct sanitized failures."""

    responses = iter(
        [
            httpx.Response(200, json={"features": "invalid"}),
            httpx.Response(403, text="credential detail"),
        ]
    )

    async def handler(_request: httpx.Request) -> httpx.Response:
        return next(responses)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = OrsGeocoderClient(
            SecretStr("private-key"), http_client=http_client, retry_delays=()
        )
        with pytest.raises(OrsGeocoderInvalidResponseError):
            await client.search("Ferraz")
        with pytest.raises(OrsGeocoderAuthenticationError):
            await client.search("Ferraz")


@pytest.mark.parametrize(
    ("query", "limit"),
    [("x", 5), ("   ", 5), ("Ferraz", 0), ("Ferraz", 11)],
)
@pytest.mark.asyncio
async def test_client_rejects_invalid_public_bounds(query: str, limit: int) -> None:
    """Direct callers cannot bypass query and result limits."""

    client = OrsGeocoderClient(SecretStr("test-key"), retry_delays=())
    with pytest.raises(ValueError):
        await client.search(query, limit=limit)
