"""Tests for interchangeable route scenario providers."""

from datetime import datetime, timezone
from typing import Optional

import pytest

from backend.domain import GeoPoint, MobilityProfile, NavigationManeuver, RouteSource
from backend.enrichment.osm_snapshot import (
    OsmBoundingBox,
    OsmRoutingElement,
    OsmRoutingSnapshot,
)
from backend.routing.fixtures import load_pilot_route_scenario
from backend.routing.ors_models import (
    OrsBaseInstruction,
    OrsBaseRoute,
    OrsBaseRouteSet,
)
from backend.routing.providers import (
    FixtureRouteScenarioProvider,
    OrsEnrichedRouteScenarioProvider,
    RouteScenarioNotFoundError,
)


@pytest.mark.asyncio
async def test_fixture_provider_resolves_pilot_endpoints() -> None:
    """The local provider returns the reproducible pilot scenario."""

    expected = load_pilot_route_scenario()
    provider = FixtureRouteScenarioProvider()

    scenario = await provider.get_scenario(
        expected.origin,
        expected.destination,
        MobilityProfile(profile_id="test"),
    )

    assert scenario == expected


@pytest.mark.asyncio
async def test_fixture_provider_accepts_small_coordinate_rounding() -> None:
    """Serialization rounding below the documented tolerance remains supported."""

    expected = load_pilot_route_scenario()
    provider = FixtureRouteScenarioProvider()
    rounded_origin = GeoPoint(
        latitude=expected.origin.latitude + 0.000001,
        longitude=expected.origin.longitude - 0.000001,
    )

    scenario = await provider.get_scenario(
        rounded_origin,
        expected.destination,
        MobilityProfile(profile_id="test"),
    )

    assert scenario.scenario_id == expected.scenario_id


@pytest.mark.asyncio
async def test_fixture_provider_rejects_unknown_endpoints_without_echoing_them() -> None:
    """A missing fixture produces a sanitized internal error."""

    provider = FixtureRouteScenarioProvider()
    origin = GeoPoint(latitude=40.0, longitude=-3.0)
    destination = GeoPoint(latitude=41.0, longitude=-4.0)

    with pytest.raises(RouteScenarioNotFoundError) as error:
        await provider.get_scenario(
            origin,
            destination,
            MobilityProfile(profile_id="test"),
        )

    assert str(error.value) == "route scenario not found"
    assert "40.0" not in str(error.value)


class _FakeBaseRouteProvider:
    """Return one local ORS route while recording the received profile."""

    def __init__(self) -> None:
        self.profile: Optional[MobilityProfile] = None

    async def get_base_routes(
        self,
        origin: GeoPoint,
        destination: GeoPoint,
        profile: MobilityProfile,
    ) -> OrsBaseRouteSet:
        """Return a route whose geometry follows the requested endpoints."""

        self.profile = profile
        return OrsBaseRouteSet(
            routes=[
                OrsBaseRoute(
                    route_id="ors_route_1",
                    distance_m=1800.0,
                    duration_s=1500.0,
                    detour_ratio=1.0,
                    geometry=[origin, destination],
                    instructions=[
                        OrsBaseInstruction(
                            instruction_type=10,
                            maneuver=NavigationManeuver.ARRIVE,
                            text="Has llegado a tu destino",
                            distance_m=1800.0,
                            duration_s=1500.0,
                            geometry_start_index=0,
                            geometry_end_index=1,
                        )
                    ],
                    instruction_count=1,
                    turn_count=0,
                )
            ]
        )


def _real_provider_snapshot() -> OsmRoutingSnapshot:
    """Build route-oriented evidence covering the pilot endpoints."""

    timestamp = datetime(2026, 8, 11, tzinfo=timezone.utc)
    return OsmRoutingSnapshot(
        schema_version="osm-routing-snapshot-v1",
        study_area_id="moncloa_principe_pio",
        bbox=OsmBoundingBox(
            south=40.4175,
            west=-3.728,
            north=40.4385,
            east=-3.7105,
        ),
        query_sha256="d" * 64,
        osm_base_timestamp=timestamp,
        downloaded_at=timestamp,
        elements=[
            OsmRoutingElement(
                osm_type="way",
                osm_id=1,
                tags={
                    "highway": "footway",
                    "surface": "asphalt",
                    "foot": "designated",
                },
                geometry=[
                    GeoPoint(latitude=40.4353, longitude=-3.7191),
                    GeoPoint(latitude=40.4211, longitude=-3.7206),
                ],
            )
        ],
    )


@pytest.mark.asyncio
async def test_real_provider_enriches_routes_and_propagates_profile() -> None:
    """ORS geometry becomes non-synthetic evidence before ranking."""

    base_provider = _FakeBaseRouteProvider()
    provider = OrsEnrichedRouteScenarioProvider(
        base_provider,
        _real_provider_snapshot(),
        corridor_width_m=10.0,
    )
    profile = MobilityProfile(profile_id="real_test", avoid_steps=False)

    scenario = await provider.get_scenario(
        GeoPoint(latitude=40.4353, longitude=-3.7191),
        GeoPoint(latitude=40.4211, longitude=-3.7206),
        profile,
    )

    assert base_provider.profile == profile
    assert len(scenario.routes) == 1
    assert scenario.routes[0].source is RouteSource.ORS
    assert scenario.routes[0].is_synthetic is False
    assert scenario.routes[0].features.surface_coverage_ratio == pytest.approx(1.0)
    assert scenario.routes[0].features.step_free.state.value == "unknown"


@pytest.mark.asyncio
async def test_real_provider_rejects_endpoints_outside_snapshot() -> None:
    """A pilot snapshot cannot support route claims outside its extent."""

    provider = OrsEnrichedRouteScenarioProvider(
        _FakeBaseRouteProvider(),
        _real_provider_snapshot(),
        corridor_width_m=10.0,
    )

    with pytest.raises(RouteScenarioNotFoundError, match="route scenario not found"):
        await provider.get_scenario(
            GeoPoint(latitude=40.0, longitude=-3.0),
            GeoPoint(latitude=40.4211, longitude=-3.7206),
            MobilityProfile(profile_id="outside"),
        )
