"""Validated, cached OSM snapshot with full geometry for route enrichment."""

import asyncio
import hashlib
import os
import tempfile
from collections.abc import Sequence
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal, Optional

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from backend.domain import GeoPoint
from backend.enrichment.osm_mapping import all_overpass_selectors

OSM_SNAPSHOT_SCHEMA_VERSION = "osm-routing-snapshot-v1"
OVERPASS_ENDPOINTS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
)


class OsmSnapshotError(RuntimeError):
    """Base class for sanitized OSM snapshot failures."""


class OsmSnapshotInvalidError(OsmSnapshotError):
    """Raised when cached or downloaded OSM data cannot be trusted."""


class OverpassUnavailableError(OsmSnapshotError):
    """Raised when all configured Overpass endpoints fail."""


class OverpassRejectedError(OsmSnapshotError):
    """Raised when Overpass rejects the generated query."""


class OsmBoundingBox(BaseModel):
    """Geographic south-west-north-east extent in WGS84."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    south: float = Field(ge=-90.0, le=90.0)
    west: float = Field(ge=-180.0, le=180.0)
    north: float = Field(ge=-90.0, le=90.0)
    east: float = Field(ge=-180.0, le=180.0)

    @model_validator(mode="after")
    def require_ordered_bounds(self) -> "OsmBoundingBox":
        """Require a non-empty, non-antimeridian extent.

        Returns:
            The validated bounding box.

        Raises:
            ValueError: If south/north or west/east are reversed.
        """

        if self.south >= self.north:
            raise ValueError("OSM bounding box south must be below north")
        if self.west >= self.east:
            raise ValueError("OSM bounding box west must be below east")
        return self

    def as_overpass(self) -> str:
        """Return the extent in Overpass south-west-north-east order.

        Returns:
            Comma-separated coordinates without locale-dependent formatting.
        """

        return f"{self.south:g},{self.west:g},{self.north:g},{self.east:g}"


PILOT_ROUTING_BBOX = OsmBoundingBox(
    south=40.4175,
    west=-3.728,
    north=40.4385,
    east=-3.7105,
)
PILOT_STUDY_AREA_ID = "moncloa_principe_pio"
PILOT_SNAPSHOT_PATH = Path(
    "data/raw/osm-routing/moncloa_principe_pio.snapshot.json"
)


class OsmRoutingElement(BaseModel):
    """One OSM node or way with tags and explicit WGS84 geometry."""

    model_config = ConfigDict(extra="forbid")

    osm_type: Literal["node", "way"]
    osm_id: int = Field(gt=0)
    tags: dict[str, str] = Field(default_factory=dict)
    geometry: list[GeoPoint] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_geometry_cardinality(self) -> "OsmRoutingElement":
        """Match point and line types to valid coordinate counts.

        Returns:
            The validated element.

        Raises:
            ValueError: If a node is not a point or a way is not a line.
        """

        if self.osm_type == "node" and len(self.geometry) != 1:
            raise ValueError("OSM nodes require exactly one coordinate")
        if self.osm_type == "way" and len(self.geometry) < 2:
            raise ValueError("OSM ways require at least two coordinates")
        return self


class OsmRoutingSnapshot(BaseModel):
    """Versioned OSM evidence snapshot used by the enrichment pipeline."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["osm-routing-snapshot-v1"]
    study_area_id: str = Field(pattern=r"^[a-z0-9_]+$")
    bbox: OsmBoundingBox
    query_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    osm_base_timestamp: datetime
    downloaded_at: datetime
    elements: list[OsmRoutingElement] = Field(min_length=1)

    @model_validator(mode="after")
    def require_unique_elements(self) -> "OsmRoutingSnapshot":
        """Reject duplicate OSM identifiers.

        Returns:
            The validated snapshot.

        Raises:
            ValueError: If an element appears more than once.
        """

        identifiers = [(element.osm_type, element.osm_id) for element in self.elements]
        if len(identifiers) != len(set(identifiers)):
            raise ValueError("OSM snapshot elements must be unique")
        return self


def build_overpass_query(bbox: OsmBoundingBox) -> str:
    """Build the stable Overpass query for route-oriented accessibility data.

    Args:
        bbox: Pilot extent in WGS84.

    Returns:
        Overpass QL selecting relevant nodes and complete highway geometries.
    """

    extent = bbox.as_overpass()
    selector_lines = [
        f"  {selector}({extent});" for selector in all_overpass_selectors()
    ]
    return "\n".join(
        [
            "[out:json][timeout:180];",
            "(",
            *selector_lines,
            ");",
            "out body geom;",
        ]
    )


def query_sha256(query: str) -> str:
    """Return the stable SHA-256 identifier for one Overpass query.

    Args:
        query: Exact Overpass QL sent to the service.

    Returns:
        Lowercase hexadecimal digest.
    """

    return hashlib.sha256(query.encode("utf-8")).hexdigest()


def _parse_geometry(raw_element: dict[str, Any]) -> list[GeoPoint]:
    """Parse an Overpass node or way geometry without silent data loss."""

    element_type = raw_element.get("type")
    if element_type == "node":
        return [
            GeoPoint(
                latitude=raw_element["lat"],
                longitude=raw_element["lon"],
            )
        ]
    if element_type == "way":
        geometry = raw_element.get("geometry")
        if not isinstance(geometry, list):
            raise OsmSnapshotInvalidError("OSM way is missing complete geometry")
        return [
            GeoPoint(latitude=coordinate["lat"], longitude=coordinate["lon"])
            for coordinate in geometry
        ]
    raise OsmSnapshotInvalidError("OSM snapshot contains an unsupported element type")


def parse_overpass_snapshot(
    payload: dict[str, Any],
    *,
    study_area_id: str,
    bbox: OsmBoundingBox,
    query: str,
    downloaded_at: Optional[datetime] = None,
) -> OsmRoutingSnapshot:
    """Validate and normalize one raw Overpass response.

    Args:
        payload: Decoded Overpass JSON.
        study_area_id: Stable local identifier for the pilot area.
        bbox: Requested geographic extent.
        query: Exact query used to obtain the response.
        downloaded_at: Optional fixed time for deterministic tests.

    Returns:
        Validated route-oriented OSM snapshot.

    Raises:
        OsmSnapshotInvalidError: If metadata, tags or geometry are malformed.
    """

    raw_elements = payload.get("elements")
    osm3s = payload.get("osm3s")
    if not isinstance(raw_elements, list) or not isinstance(osm3s, dict):
        raise OsmSnapshotInvalidError("Overpass response is missing required fields")
    timestamp = osm3s.get("timestamp_osm_base")
    if not isinstance(timestamp, str):
        raise OsmSnapshotInvalidError("Overpass response is missing its OSM timestamp")

    elements: list[OsmRoutingElement] = []
    try:
        for raw_element in raw_elements:
            if not isinstance(raw_element, dict):
                raise OsmSnapshotInvalidError("Overpass returned a malformed element")
            raw_tags = raw_element.get("tags", {})
            if not isinstance(raw_tags, dict) or not all(
                isinstance(key, str) and isinstance(value, str)
                for key, value in raw_tags.items()
            ):
                raise OsmSnapshotInvalidError("OSM element tags are malformed")
            elements.append(
                OsmRoutingElement(
                    osm_type=raw_element.get("type"),
                    osm_id=raw_element.get("id"),
                    tags=raw_tags,
                    geometry=_parse_geometry(raw_element),
                )
            )
        return OsmRoutingSnapshot(
            schema_version=OSM_SNAPSHOT_SCHEMA_VERSION,
            study_area_id=study_area_id,
            bbox=bbox,
            query_sha256=query_sha256(query),
            osm_base_timestamp=timestamp,
            downloaded_at=downloaded_at or datetime.now(timezone.utc),
            elements=elements,
        )
    except (KeyError, TypeError, ValidationError, ValueError):
        raise OsmSnapshotInvalidError("Overpass returned invalid OSM data") from None


class OsmSnapshotStore:
    """Load and atomically save one validated local OSM snapshot."""

    def __init__(self, path: Path) -> None:
        """Configure the ignored local snapshot path.

        Args:
            path: JSON path below the local raw-data directory.
        """

        self._path = path

    def load(self, *, expected_query_sha256: str) -> Optional[OsmRoutingSnapshot]:
        """Load a matching snapshot when present.

        Args:
            expected_query_sha256: Digest of the current query contract.

        Returns:
            Validated snapshot, or ``None`` when no file exists.

        Raises:
            OsmSnapshotInvalidError: If the file is corrupt or from another query.
        """

        if not self._path.is_file():
            return None
        try:
            snapshot = OsmRoutingSnapshot.model_validate_json(
                self._path.read_text(encoding="utf-8")
            )
        except (OSError, ValidationError):
            raise OsmSnapshotInvalidError("local OSM snapshot is invalid") from None
        if snapshot.query_sha256 != expected_query_sha256:
            raise OsmSnapshotInvalidError("local OSM snapshot uses a different query")
        return snapshot

    def save(self, snapshot: OsmRoutingSnapshot) -> Path:
        """Atomically store a validated snapshot with private permissions.

        Args:
            snapshot: Validated snapshot to persist.

        Returns:
            Final local path.

        Raises:
            OsmSnapshotInvalidError: If the file cannot be written safely.
        """

        temporary_path: Optional[Path] = None
        try:
            self._path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=self._path.parent,
                prefix=".osm-routing-",
                suffix=".tmp",
                delete=False,
            ) as temporary:
                temporary.write(snapshot.model_dump_json(indent=2))
                temporary.flush()
                os.fsync(temporary.fileno())
                temporary_path = Path(temporary.name)
            temporary_path.chmod(0o600)
            temporary_path.replace(self._path)
        except OSError:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
            raise OsmSnapshotInvalidError(
                "local OSM snapshot could not be written"
            ) from None
        return self._path


class OverpassSnapshotClient:
    """Fetch a validated OSM snapshot with endpoint fallback and local caching."""

    def __init__(
        self,
        *,
        snapshot_store: OsmSnapshotStore,
        http_client: Optional[httpx.AsyncClient] = None,
        endpoints: Sequence[str] = OVERPASS_ENDPOINTS,
        timeout_seconds: float = 120.0,
        retry_delay_seconds: float = 2.0,
    ) -> None:
        """Configure network limits and endpoint fallback.

        Args:
            snapshot_store: Local validated snapshot storage.
            http_client: Optional shared client, primarily for tests.
            endpoints: Ordered HTTPS Overpass interpreter endpoints.
            timeout_seconds: Maximum time per endpoint.
            retry_delay_seconds: Delay between failed endpoints.

        Raises:
            ValueError: If network configuration is unsafe or empty.
        """

        if not endpoints or any(not endpoint.startswith("https://") for endpoint in endpoints):
            raise ValueError("Overpass endpoints must be non-empty HTTPS URLs")
        if timeout_seconds <= 0.0:
            raise ValueError("Overpass timeout must be greater than zero")
        if retry_delay_seconds < 0.0:
            raise ValueError("Overpass retry delay must not be negative")
        self._snapshot_store = snapshot_store
        self._http_client = http_client
        self._endpoints = tuple(endpoints)
        self._timeout = httpx.Timeout(timeout_seconds)
        self._retry_delay_seconds = retry_delay_seconds

    async def fetch(
        self,
        *,
        study_area_id: str,
        bbox: OsmBoundingBox,
    ) -> OsmRoutingSnapshot:
        """Return a cached or newly downloaded route-oriented snapshot.

        Args:
            study_area_id: Stable local identifier for the study extent.
            bbox: Fixed WGS84 extent to download.

        Returns:
            Validated OSM snapshot.

        Raises:
            OverpassRejectedError: If the query is rejected as non-transient.
            OverpassUnavailableError: If all endpoints fail transiently.
            OsmSnapshotInvalidError: If a successful response is malformed.
        """

        query = build_overpass_query(bbox)
        expected_hash = query_sha256(query)
        cached = self._snapshot_store.load(expected_query_sha256=expected_hash)
        if cached is not None:
            return cached

        if self._http_client is not None:
            payload = await self._fetch_payload(self._http_client, query)
        else:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                payload = await self._fetch_payload(client, query)

        snapshot = parse_overpass_snapshot(
            payload,
            study_area_id=study_area_id,
            bbox=bbox,
            query=query,
        )
        self._snapshot_store.save(snapshot)
        return snapshot

    async def _fetch_payload(
        self,
        client: httpx.AsyncClient,
        query: str,
    ) -> dict[str, Any]:
        """Try configured endpoints without exposing the query in errors."""

        headers = {
            "Accept": "application/json",
            "User-Agent": "TFM-Accessible-Madrid/0.1 (academic research)",
        }
        for endpoint_index, endpoint in enumerate(self._endpoints):
            try:
                response = await client.post(
                    endpoint,
                    data={"data": query},
                    headers=headers,
                    timeout=self._timeout,
                )
            except (httpx.TimeoutException, httpx.NetworkError):
                response = None

            if response is not None:
                if 400 <= response.status_code < 500 and response.status_code != 429:
                    raise OverpassRejectedError("Overpass rejected the snapshot query")
                if response.status_code < 400:
                    try:
                        payload = response.json()
                    except ValueError:
                        raise OsmSnapshotInvalidError(
                            "Overpass returned invalid JSON"
                        ) from None
                    if not isinstance(payload, dict):
                        raise OsmSnapshotInvalidError(
                            "Overpass returned an invalid response"
                        )
                    return payload

            if endpoint_index < len(self._endpoints) - 1:
                await asyncio.sleep(self._retry_delay_seconds)

        raise OverpassUnavailableError("Overpass is temporarily unavailable")
