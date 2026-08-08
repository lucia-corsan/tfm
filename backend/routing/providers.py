"""Interchangeable providers for candidate route scenarios."""

from math import isclose
from typing import Protocol

from backend.domain import GeoPoint, RouteScenario
from backend.routing.fixtures import load_pilot_route_scenario

_COORDINATE_TOLERANCE_DEGREES = 1e-5


class RouteScenarioNotFoundError(LookupError):
    """Raised when a provider cannot resolve the requested endpoints."""


class RoutingProviderUnavailableError(RuntimeError):
    """Raised when the configured route provider cannot currently be used."""


class RouteScenarioProvider(Protocol):
    """Provider interface shared by fixtures and future real routing."""

    def get_scenario(self, origin: GeoPoint, destination: GeoPoint) -> RouteScenario:
        """Resolve candidate routes for an origin and destination."""


def _points_match(first: GeoPoint, second: GeoPoint) -> bool:
    """Compare fixture coordinates using a small deterministic tolerance."""

    return isclose(
        first.latitude,
        second.latitude,
        rel_tol=0.0,
        abs_tol=_COORDINATE_TOLERANCE_DEGREES,
    ) and isclose(
        first.longitude,
        second.longitude,
        rel_tol=0.0,
        abs_tol=_COORDINATE_TOLERANCE_DEGREES,
    )


class FixtureRouteScenarioProvider:
    """Serve the reproducible Moncloa–Príncipe Pío development scenario."""

    def get_scenario(self, origin: GeoPoint, destination: GeoPoint) -> RouteScenario:
        """Return the pilot fixture when both endpoints match.

        Args:
            origin: Requested WGS84 origin.
            destination: Requested WGS84 destination.

        Returns:
            Synthetic route alternatives for the pilot scenario.

        Raises:
            RouteScenarioNotFoundError: If the fixture does not cover the request.
        """

        scenario = load_pilot_route_scenario()
        if not (
            _points_match(origin, scenario.origin)
            and _points_match(destination, scenario.destination)
        ):
            raise RouteScenarioNotFoundError("route scenario not found")
        return scenario


def create_route_scenario_provider(provider_name: str) -> RouteScenarioProvider:
    """Create the configured route provider without exposing it to requests.

    Args:
        provider_name: Validated backend provider setting.

    Returns:
        Provider implementation used by the comparison service.

    Raises:
        RoutingProviderUnavailableError: If the provider is not implemented.
    """

    if provider_name == "fixture":
        return FixtureRouteScenarioProvider()
    raise RoutingProviderUnavailableError("routing provider unavailable")
