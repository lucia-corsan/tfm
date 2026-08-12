"""Private cache for validated public geocoding results."""

import hashlib
import json
import os
import tempfile
import unicodedata
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, ConfigDict, ValidationError

from backend.enrichment.osm_snapshot import OsmBoundingBox
from backend.places.models import PlaceResult

_CACHE_SCHEMA_VERSION = "ors-geocoding-cache-v1"


class GeocodingCacheError(RuntimeError):
    """Raised when a geocoding cache entry cannot be trusted."""


class _GeocodingCacheRecord(BaseModel):
    """Versioned public data stored for one opaque request hash."""

    model_config = ConfigDict(extra="forbid")

    schema_version: str
    request_hash: str
    places: list[PlaceResult]


def _normalize_query(query: str) -> str:
    """Create a stable accent-insensitive cache representation."""

    decomposed = unicodedata.normalize("NFKD", " ".join(query.casefold().split()))
    return "".join(
        character for character in decomposed if not unicodedata.combining(character)
    )


class GeocodingCache:
    """Atomically persist bounded geocoding results with private permissions."""

    def __init__(
        self,
        root: Path,
        *,
        schema_version: str = _CACHE_SCHEMA_VERSION,
    ) -> None:
        """Configure an ignored local cache directory."""

        if not schema_version.strip():
            raise ValueError("geocoding cache schema version must not be empty")
        self._root = root
        self._schema_version = schema_version

    def key_for(self, query: str, limit: int, bbox: OsmBoundingBox) -> str:
        """Return an opaque SHA-256 key for one credential-free request."""

        canonical = json.dumps(
            {
                "bbox": bbox.model_dump(mode="json"),
                "limit": limit,
                "query": _normalize_query(query),
                "schema_version": self._schema_version,
            },
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    def path_for(self, query: str, limit: int, bbox: OsmBoundingBox) -> Path:
        """Return a path containing only the opaque request digest."""

        return self._root / f"{self.key_for(query, limit, bbox)}.json"

    def load(
        self,
        query: str,
        limit: int,
        bbox: OsmBoundingBox,
    ) -> Optional[list[PlaceResult]]:
        """Load a validated matching record, or ``None`` when absent."""

        expected_hash = self.key_for(query, limit, bbox)
        path = self.path_for(query, limit, bbox)
        if not path.is_file():
            return None
        try:
            record = _GeocodingCacheRecord.model_validate_json(
                path.read_text(encoding="utf-8")
            )
        except (OSError, ValueError, ValidationError):
            raise GeocodingCacheError("geocoding cache entry is invalid") from None
        if (
            record.schema_version != self._schema_version
            or record.request_hash != expected_hash
        ):
            raise GeocodingCacheError("geocoding cache entry is invalid")
        return record.places

    def save(
        self,
        query: str,
        limit: int,
        bbox: OsmBoundingBox,
        places: list[PlaceResult],
    ) -> Path:
        """Atomically store one validated result set using mode ``0600``."""

        request_hash = self.key_for(query, limit, bbox)
        path = self.path_for(query, limit, bbox)
        record = _GeocodingCacheRecord(
            schema_version=self._schema_version,
            request_hash=request_hash,
            places=places,
        )
        temporary_path: Optional[Path] = None
        try:
            self._root.mkdir(mode=0o700, parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=self._root,
                prefix=".geocoding-",
                suffix=".tmp",
                delete=False,
            ) as temporary:
                temporary.write(record.model_dump_json(indent=2))
                temporary.flush()
                os.fsync(temporary.fileno())
                temporary_path = Path(temporary.name)
            temporary_path.chmod(0o600)
            temporary_path.replace(path)
        except OSError:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
            raise GeocodingCacheError(
                "geocoding cache entry could not be written"
            ) from None
        return path
