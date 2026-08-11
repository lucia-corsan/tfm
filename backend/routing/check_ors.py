"""Manual, sanitized ORS connectivity check for the fixed pilot corridor."""

import asyncio
import logging

from backend.config import get_settings
from backend.domain import MobilityProfile
from backend.routing.fixtures import load_pilot_route_scenario
from backend.routing.ors_provider import create_ors_base_route_provider

logger = logging.getLogger(__name__)


async def check_pilot_routes() -> None:
    """Fetch pilot-area ORS routes and report only non-sensitive summaries."""

    settings = get_settings()
    provider = create_ors_base_route_provider(settings)
    scenario = load_pilot_route_scenario()
    routes = await provider.get_base_routes(
        scenario.origin,
        scenario.destination,
        MobilityProfile(profile_id="ors_manual_check"),
    )
    logger.info("ORS devolvió %d ruta(s) base válidas.", len(routes.routes))
    for route in routes.routes:
        logger.info(
            "%s: %.0f m, %.0f s y %d instrucciones.",
            route.route_id,
            route.distance_m,
            route.duration_s,
            route.instruction_count,
        )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    asyncio.run(check_pilot_routes())
