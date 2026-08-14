"""Tests for the internal ORS base-route provider."""

import copy
from pathlib import Path
from typing import Optional

import pytest
from pydantic import SecretStr

from backend.config import Settings
from backend.domain import GeoPoint, MobilityProfile
from backend.routing.ors_models import OrsRouteCollection, validate_ors_route_collection
from backend.routing.ors_provider import (
    OrsBaseRouteProvider,
    OrsConfigurationError,
    create_ors_base_route_provider,
)


def _response() -> OrsRouteCollection:
    """Return one validated ORS collection for provider tests."""

    return validate_ors_route_collection(
        {
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
    )


class _FakeFetcher:
    """Record provider parameters while returning validated local data."""

    def __init__(self, response: Optional[OrsRouteCollection] = None) -> None:
        self.avoid_steps: Optional[bool] = None
        self.response = response or _response()

    async def fetch_routes(
        self,
        origin: GeoPoint,
        destination: GeoPoint,
        *,
        avoid_steps: bool,
    ) -> OrsRouteCollection:
        """Return local routes and record the propagated critical restriction."""

        del origin, destination
        self.avoid_steps = avoid_steps
        return self.response


@pytest.mark.asyncio
async def test_provider_returns_base_routes_and_propagates_step_rule() -> None:
    """The provider extracts neutral facts and forwards the critical step rule."""

    fetcher = _FakeFetcher()
    provider = OrsBaseRouteProvider(fetcher)
    origin = GeoPoint(latitude=40.4353, longitude=-3.7191)
    destination = GeoPoint(latitude=40.4211, longitude=-3.7206)

    result = await provider.get_base_routes(
        origin,
        destination,
        MobilityProfile(profile_id="test", avoid_steps=True),
    )

    assert fetcher.avoid_steps is True
    assert result.routes[0].route_id == "ors_route_1"
    assert result.routes[0].instructions[0].maneuver.value == "arrive"
    assert "crossing_count" not in result.routes[0].model_dump()


@pytest.mark.asyncio
async def test_provider_removes_exact_duplicate_routes_before_extraction() -> None:
    """Only the first occurrence of an identical ORS geometry is exposed."""

    response = _response()
    duplicate = response.features[0].model_copy(
        update={
            "properties": response.features[0].properties.model_copy(
                update={
                    "summary": response.features[0].properties.summary.model_copy(
                        update={"distance": 1801.0}
                    )
                }
            )
        }
    )
    collection = OrsRouteCollection(
        type="FeatureCollection",
        features=[response.features[0], duplicate],
    )
    provider = OrsBaseRouteProvider(_FakeFetcher(collection))

    result = await provider.get_base_routes(
        GeoPoint(latitude=40.4353, longitude=-3.7191),
        GeoPoint(latitude=40.4211, longitude=-3.7206),
        MobilityProfile(profile_id="test"),
    )

    assert len(result.routes) == 1
    assert result.routes[0].distance_m == 1800.0


@pytest.mark.asyncio
async def test_provider_removes_calibrated_near_duplicate_before_extraction() -> None:
    """Different vertex sampling of the same path becomes one base route."""

    response = _response()
    payload = response.model_dump(mode="json")
    densified = copy.deepcopy(payload["features"][0])
    densified["geometry"]["coordinates"] = [
        [-3.7191, 40.4353],
        [-3.71985, 40.4282],
        [-3.7206, 40.4211],
    ]
    densified["properties"]["segments"][0]["steps"][0]["way_points"] = [0, 2]
    payload["features"].append(densified)
    collection = OrsRouteCollection.model_validate(payload)
    provider = OrsBaseRouteProvider(_FakeFetcher(collection))

    result = await provider.get_base_routes(
        GeoPoint(latitude=40.4353, longitude=-3.7191),
        GeoPoint(latitude=40.4211, longitude=-3.7206),
        MobilityProfile(profile_id="test"),
    )

    assert len(result.routes) == 1


def test_factory_requires_backend_credential_without_naming_the_variable(
    tmp_path: Path,
) -> None:
    """Missing configuration fails before HTTP without exposing secret names."""

    settings = Settings(ors_cache_dir=tmp_path, _env_file=None)

    with pytest.raises(OrsConfigurationError) as error:
        create_ors_base_route_provider(settings)

    assert str(error.value) == "ORS is not configured"
    assert "ORS_API_KEY" not in str(error.value)


def test_factory_builds_provider_with_private_settings(tmp_path: Path) -> None:
    """A configured key and cache directory create the internal provider."""

    settings = Settings(
        ors_api_key=SecretStr("private-test-key"),
        ors_cache_dir=tmp_path,
        ors_timeout_seconds=5.0,
        _env_file=None,
    )

    provider = create_ors_base_route_provider(settings)

    assert isinstance(provider, OrsBaseRouteProvider)
    assert "private-test-key" not in repr(provider)
