"""Tests for route-oriented OSM snapshot generation and storage."""

import json
import stat
from datetime import datetime, timezone
from pathlib import Path

import httpx
import pytest
from pydantic import ValidationError

from backend.enrichment.osm_mapping import all_overpass_selectors
from backend.enrichment.osm_snapshot import (
    OSM_SNAPSHOT_SCHEMA_VERSION,
    OsmBoundingBox,
    OsmRoutingSnapshot,
    OsmSnapshotInvalidError,
    OsmSnapshotStore,
    OverpassSnapshotClient,
    build_overpass_query,
    parse_overpass_snapshot,
    query_sha256,
)

TEST_BBOX = OsmBoundingBox(
    south=40.42,
    west=-3.73,
    north=40.44,
    east=-3.71,
)
TEST_QUERY = build_overpass_query(TEST_BBOX)


def _payload() -> dict[str, object]:
    return {
        "version": 0.6,
        "generator": "Overpass API",
        "osm3s": {"timestamp_osm_base": "2026-08-10T12:00:00Z"},
        "elements": [
            {
                "type": "node",
                "id": 101,
                "lat": 40.43,
                "lon": -3.72,
                "tags": {"highway": "crossing", "tactile_paving": "yes"},
            },
            {
                "type": "way",
                "id": 202,
                "tags": {"highway": "footway", "surface": "asphalt"},
                "geometry": [
                    {"lat": 40.43, "lon": -3.72},
                    {"lat": 40.431, "lon": -3.721},
                ],
            },
        ],
    }


def _snapshot() -> OsmRoutingSnapshot:
    return parse_overpass_snapshot(
        _payload(),
        study_area_id="test_area",
        bbox=TEST_BBOX,
        query=TEST_QUERY,
        downloaded_at=datetime(2026, 8, 10, 12, 5, tzinfo=timezone.utc),
    )


def test_bbox_and_query_are_ordered_and_request_complete_geometry() -> None:
    """The query is stable and cannot fall back to representative centers."""

    assert TEST_BBOX.as_overpass() == "40.42,-3.73,40.44,-3.71"
    assert TEST_QUERY.endswith("out body geom;")
    assert TEST_QUERY.count(TEST_BBOX.as_overpass()) == len(all_overpass_selectors())
    assert query_sha256(TEST_QUERY) == query_sha256(build_overpass_query(TEST_BBOX))

    with pytest.raises(ValidationError):
        OsmBoundingBox(south=40.44, west=-3.73, north=40.42, east=-3.71)


def test_parser_normalizes_nodes_and_ways_with_provenance() -> None:
    """Raw Overpass fields become validated point and line elements."""

    snapshot = _snapshot()

    assert snapshot.schema_version == OSM_SNAPSHOT_SCHEMA_VERSION
    assert snapshot.query_sha256 == query_sha256(TEST_QUERY)
    assert snapshot.osm_base_timestamp == datetime(
        2026, 8, 10, 12, 0, tzinfo=timezone.utc
    )
    assert snapshot.elements[0].geometry[0].latitude == 40.43
    assert len(snapshot.elements[1].geometry) == 2


def test_parser_rejects_missing_way_geometry_and_duplicate_elements() -> None:
    """The preparation step fails visibly instead of losing spatial evidence."""

    missing_geometry = _payload()
    del missing_geometry["elements"][1]["geometry"]  # type: ignore[index]
    with pytest.raises(OsmSnapshotInvalidError):
        parse_overpass_snapshot(
            missing_geometry,
            study_area_id="test_area",
            bbox=TEST_BBOX,
            query=TEST_QUERY,
        )

    duplicate = _payload()
    duplicate["elements"].append(duplicate["elements"][0])  # type: ignore[union-attr,index]
    with pytest.raises(OsmSnapshotInvalidError):
        parse_overpass_snapshot(
            duplicate,
            study_area_id="test_area",
            bbox=TEST_BBOX,
            query=TEST_QUERY,
        )


def test_store_round_trip_validates_query_and_private_permissions(tmp_path: Path) -> None:
    """A local snapshot is atomic, private and tied to its exact query."""

    path = tmp_path / "snapshot.json"
    store = OsmSnapshotStore(path)
    snapshot = _snapshot()

    assert store.load(expected_query_sha256=snapshot.query_sha256) is None
    assert store.save(snapshot) == path
    loaded = store.load(expected_query_sha256=snapshot.query_sha256)

    assert loaded == snapshot
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    with pytest.raises(OsmSnapshotInvalidError, match="different query"):
        store.load(expected_query_sha256="0" * 64)


@pytest.mark.asyncio
async def test_client_uses_cache_without_a_network_request(tmp_path: Path) -> None:
    """Repeated preparation is reproducible and gentle with public Overpass."""

    snapshot = _snapshot()
    store = OsmSnapshotStore(tmp_path / "snapshot.json")
    store.save(snapshot)

    def fail_if_called(_request: httpx.Request) -> httpx.Response:
        raise AssertionError("network must not be used on a cache hit")

    async with httpx.AsyncClient(transport=httpx.MockTransport(fail_if_called)) as http:
        client = OverpassSnapshotClient(
            snapshot_store=store,
            http_client=http,
            endpoints=("https://overpass.test/api/interpreter",),
            retry_delay_seconds=0.0,
        )
        loaded = await client.fetch(study_area_id="test_area", bbox=TEST_BBOX)

    assert loaded == snapshot


@pytest.mark.asyncio
async def test_client_falls_back_and_persists_valid_response(tmp_path: Path) -> None:
    """One transient endpoint failure does not discard a valid second response."""

    requested_hosts: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requested_hosts.append(request.url.host)
        if request.url.host == "first.test":
            return httpx.Response(504, text="timeout")
        return httpx.Response(200, json=_payload())

    path = tmp_path / "snapshot.json"
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
        client = OverpassSnapshotClient(
            snapshot_store=OsmSnapshotStore(path),
            http_client=http,
            endpoints=(
                "https://first.test/api/interpreter",
                "https://second.test/api/interpreter",
            ),
            retry_delay_seconds=0.0,
        )
        snapshot = await client.fetch(study_area_id="test_area", bbox=TEST_BBOX)

    assert requested_hosts == ["first.test", "second.test"]
    assert len(snapshot.elements) == 2
    assert json.loads(path.read_text(encoding="utf-8"))["study_area_id"] == "test_area"
