"""Tests for the private and reproducible ORS route cache."""

import json
import stat
from pathlib import Path

import pytest

from backend.domain import GeoPoint
from backend.routing.ors_cache import OrsCacheError, OrsRouteCache
from backend.routing.ors_models import (
    OrsRouteCollection,
    OrsRouteRequest,
    build_ors_route_request,
    validate_ors_route_collection,
)


def _request(*, avoid_steps: bool = True) -> OrsRouteRequest:
    """Build one stable credential-free ORS request."""

    return build_ors_route_request(
        GeoPoint(latitude=40.4353, longitude=-3.7191),
        GeoPoint(latitude=40.4211, longitude=-3.7206),
        avoid_steps=avoid_steps,
    )


def _response() -> OrsRouteCollection:
    """Build one validated minimal ORS response."""

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


def test_cache_key_is_stable_opaque_and_sensitive_to_request(tmp_path: Path) -> None:
    """Canonical requests produce stable opaque keys and option changes do not collide."""

    cache = OrsRouteCache(tmp_path)

    first = cache.key_for(_request(avoid_steps=True))
    repeated = cache.key_for(_request(avoid_steps=True))
    different = cache.key_for(_request(avoid_steps=False))

    assert first == repeated
    assert first != different
    assert len(first) == 64
    assert set(first) <= set("0123456789abcdef")
    assert "40.4353" not in first
    assert "3.7191" not in first


def test_cache_round_trip_preserves_validated_response_and_private_file(
    tmp_path: Path,
) -> None:
    """A saved response can be restored and its file is private to the user."""

    cache = OrsRouteCache(tmp_path / "ors")
    request = _request()
    response = _response()

    path = cache.save(request, response)
    restored = cache.load(request)

    assert restored == response
    assert path.name == f"{cache.key_for(request)}.json"
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    assert list(path.parent.glob("*.tmp")) == []


def test_cache_miss_does_not_create_directory(tmp_path: Path) -> None:
    """Reading a missing entry has no filesystem side effect."""

    root = tmp_path / "missing"
    cache = OrsRouteCache(root)

    assert cache.load(_request()) is None
    assert not root.exists()


@pytest.mark.parametrize("contents", ["not-json", "{}"])
def test_cache_rejects_malformed_entry_without_exposing_path(
    tmp_path: Path, contents: str
) -> None:
    """A corrupt local entry fails closed with a stable message."""

    cache = OrsRouteCache(tmp_path)
    request = _request()
    path = cache.path_for(request)
    path.write_text(contents, encoding="utf-8")

    with pytest.raises(OrsCacheError) as error:
        cache.load(request)

    assert str(error.value) == "ORS cache entry is invalid"
    assert str(tmp_path) not in str(error.value)
    assert "40.4353" not in str(error.value)


def test_cache_rejects_record_copied_to_another_request(tmp_path: Path) -> None:
    """The embedded request hash prevents accidental cross-request reuse."""

    cache = OrsRouteCache(tmp_path)
    original = _request(avoid_steps=True)
    different = _request(avoid_steps=False)
    original_path = cache.save(original, _response())
    copied = json.loads(original_path.read_text(encoding="utf-8"))
    cache.path_for(different).write_text(json.dumps(copied), encoding="utf-8")

    with pytest.raises(OrsCacheError, match="entry is invalid"):
        cache.load(different)


def test_cache_schema_version_invalidates_old_entries(tmp_path: Path) -> None:
    """Changing the explicit schema version produces a clean cache miss."""

    request = _request()
    first_cache = OrsRouteCache(tmp_path, schema_version="v1")
    first_cache.save(request, _response())
    second_cache = OrsRouteCache(tmp_path, schema_version="v2")

    assert second_cache.load(request) is None
