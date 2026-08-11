"""Private, deterministic local cache for validated ORS route responses."""

import hashlib
import json
import os
import tempfile
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, ConfigDict, ValidationError

from backend.routing.ors_models import OrsRouteCollection, OrsRouteRequest

_CACHE_SCHEMA_VERSION = "ors-route-cache-v1"


class OrsCacheError(RuntimeError):
    """Raised when a local ORS cache entry cannot be trusted."""


class _OrsCacheRecord(BaseModel):
    """Versioned payload stored for one canonical ORS request."""

    model_config = ConfigDict(extra="forbid")

    schema_version: str
    request_hash: str
    response: OrsRouteCollection


class OrsRouteCache:
    """Read and write validated ORS data without storing credentials."""

    def __init__(
        self,
        root: Path,
        *,
        schema_version: str = _CACHE_SCHEMA_VERSION,
    ) -> None:
        """Configure a local directory and explicit cache schema version.

        Args:
            root: Ignored local directory used for route responses.
            schema_version: Version included in both keys and stored records.

        Raises:
            ValueError: If the schema version is empty.
        """

        if not schema_version.strip():
            raise ValueError("ORS cache schema version must not be empty")
        self._root = root
        self._schema_version = schema_version

    def key_for(self, request: OrsRouteRequest) -> str:
        """Return a stable SHA-256 key for one credential-free request.

        Args:
            request: Validated canonical ORS request body.

        Returns:
            Lowercase hexadecimal cache key.
        """

        canonical = json.dumps(
            {
                "schema_version": self._schema_version,
                "profile": "foot-walking",
                "format": "geojson",
                "request": request.model_dump(mode="json", exclude_none=True),
            },
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    def path_for(self, request: OrsRouteRequest) -> Path:
        """Return the opaque file path for one request.

        Args:
            request: Validated canonical ORS request body.

        Returns:
            Cache path containing only a SHA-256 digest.
        """

        return self._root / f"{self.key_for(request)}.json"

    def load(self, request: OrsRouteRequest) -> Optional[OrsRouteCollection]:
        """Load and validate a cached response when present.

        Args:
            request: Canonical request used to select and verify the entry.

        Returns:
            Validated routes, or ``None`` when the entry does not exist.

        Raises:
            OrsCacheError: If an existing entry is malformed or inconsistent.
        """

        expected_hash = self.key_for(request)
        path = self.path_for(request)
        if not path.is_file():
            return None

        try:
            decoded = json.loads(path.read_text(encoding="utf-8"))
            record = _OrsCacheRecord.model_validate(decoded)
        except (OSError, ValueError, ValidationError):
            raise OrsCacheError("ORS cache entry is invalid") from None

        if (
            record.schema_version != self._schema_version
            or record.request_hash != expected_hash
        ):
            raise OrsCacheError("ORS cache entry is invalid")
        return record.response

    def save(
        self,
        request: OrsRouteRequest,
        response: OrsRouteCollection,
    ) -> Path:
        """Atomically store one validated ORS response with private permissions.

        Args:
            request: Canonical credential-free request.
            response: Validated ORS response to persist.

        Returns:
            Final opaque cache path.

        Raises:
            OrsCacheError: If the entry cannot be written safely.
        """

        request_hash = self.key_for(request)
        path = self.path_for(request)
        record = _OrsCacheRecord(
            schema_version=self._schema_version,
            request_hash=request_hash,
            response=response,
        )
        serialized = record.model_dump_json(indent=2)
        temporary_path: Optional[Path] = None

        try:
            self._root.mkdir(mode=0o700, parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=self._root,
                prefix=".ors-",
                suffix=".tmp",
                delete=False,
            ) as temporary:
                temporary.write(serialized)
                temporary.flush()
                os.fsync(temporary.fileno())
                temporary_path = Path(temporary.name)
            temporary_path.chmod(0o600)
            temporary_path.replace(path)
        except OSError:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
            raise OrsCacheError("ORS cache entry could not be written") from None

        return path
