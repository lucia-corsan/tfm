"""Tests for the private geocoding result cache."""

import json
import stat
from pathlib import Path

import pytest

from backend.enrichment.osm_snapshot import PILOT_ROUTING_BBOX
from backend.places.geocoding_cache import GeocodingCache, GeocodingCacheError
from backend.places.models import PlaceResult


def _places() -> list[PlaceResult]:
    """Return one valid public geocoding result."""

    return [
        PlaceResult(
            place_id="ors_0123456789abcdef01234567",
            name="Calle de Ferraz, 22",
            description="Calle de Ferraz, 22, Madrid, España",
            location={"latitude": 40.4298, "longitude": -3.7185},
            source="ors_geocoder",
        )
    ]


def test_cache_uses_opaque_key_and_private_atomic_file(tmp_path: Path) -> None:
    """The filename hides the query and the stored file is private."""

    cache = GeocodingCache(tmp_path / "geocoding")
    path = cache.save("Calle de Ferraz 22", 5, PILOT_ROUTING_BBOX, _places())

    assert path.name.endswith(".json")
    assert len(path.stem) == 64
    assert "ferraz" not in str(path).casefold()
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    assert cache.load("calle de ferraz 22", 5, PILOT_ROUTING_BBOX) == _places()


def test_cache_normalizes_accents_and_rejects_tampering(tmp_path: Path) -> None:
    """Equivalent queries share a key and mismatched records are rejected."""

    cache = GeocodingCache(tmp_path)
    accented = cache.key_for("Príncipe Pío", 5, PILOT_ROUTING_BBOX)
    plain = cache.key_for("principe   pio", 5, PILOT_ROUTING_BBOX)
    assert accented == plain

    path = cache.save("Príncipe Pío", 5, PILOT_ROUTING_BBOX, _places())
    payload = json.loads(path.read_text(encoding="utf-8"))
    payload["request_hash"] = "0" * 64
    path.write_text(json.dumps(payload), encoding="utf-8")

    with pytest.raises(GeocodingCacheError, match="invalid"):
        cache.load("Príncipe Pío", 5, PILOT_ROUTING_BBOX)


def test_cache_distinguishes_result_limit(tmp_path: Path) -> None:
    """A result produced for one limit is not reused for another."""

    cache = GeocodingCache(tmp_path)
    cache.save("Ferraz", 3, PILOT_ROUTING_BBOX, _places())

    assert cache.load("Ferraz", 5, PILOT_ROUTING_BBOX) is None
