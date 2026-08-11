"""Download or validate the local OSM routing snapshot for the pilot area."""

import asyncio
import logging
from collections import Counter

from backend.config import get_settings
from backend.enrichment.osm_snapshot import (
    PILOT_ROUTING_BBOX,
    PILOT_STUDY_AREA_ID,
    OsmSnapshotStore,
    OverpassSnapshotClient,
)

logger = logging.getLogger(__name__)


async def main() -> None:
    """Fetch the pilot snapshot and report only non-sensitive summary counts."""

    settings = get_settings()
    client = OverpassSnapshotClient(
        snapshot_store=OsmSnapshotStore(settings.osm_snapshot_path)
    )
    snapshot = await client.fetch(
        study_area_id=PILOT_STUDY_AREA_ID,
        bbox=PILOT_ROUTING_BBOX,
    )
    counts = Counter(element.osm_type for element in snapshot.elements)
    logger.info(
        "Instantánea OSM válida: %d elementos (%d nodos y %d vías).",
        len(snapshot.elements),
        counts["node"],
        counts["way"],
    )
    logger.info("Fecha base OSM: %s.", snapshot.osm_base_timestamp.isoformat())
    logger.info("Identificador de consulta: %s.", snapshot.query_sha256)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    asyncio.run(main())
