"""Tests for local and hybrid place-search providers."""

from pathlib import Path
from typing import Optional

import pytest
from pydantic import SecretStr

from backend.config import Settings
from backend.places.models import PlaceResult
from backend.places.ors_geocoder import OrsGeocoderUnavailableError
from backend.places.providers import (
    CatalogPlaceSearchProvider,
    HybridPlaceSearchProvider,
    PlaceSearchUnavailableError,
    create_place_search_provider,
)


class _FakeGeocoder:
    """Return configured public results or one sanitized failure."""

    def __init__(
        self,
        places: Optional[list[PlaceResult]] = None,
        error: Optional[Exception] = None,
    ) -> None:
        self.places = places or []
        self.error = error

    async def search(self, query: str, *, limit: int = 5) -> list[PlaceResult]:
        """Return fake results without using the query."""

        del query
        if self.error is not None:
            raise self.error
        return self.places[:limit]


def _external(name: str = "Calle de Ferraz, 22") -> PlaceResult:
    """Build one valid external result."""

    return PlaceResult(
        place_id="ors_0123456789abcdef01234567",
        name=name,
        description=f"{name}, Madrid, España",
        location={"latitude": 40.4298, "longitude": -3.7185},
        source="ors_geocoder",
    )


@pytest.mark.asyncio
async def test_hybrid_provider_combines_local_first_and_deduplicates_names() -> None:
    """Stable catalog matches precede non-duplicate external addresses."""

    provider = HybridPlaceSearchProvider(
        _FakeGeocoder([_external("Moncloa"), _external()])
    )

    places = await provider.search("Moncloa", limit=5)

    assert [place.source for place in places] == ["pilot_catalog", "ors_geocoder"]
    assert [place.name for place in places] == ["Moncloa", "Calle de Ferraz, 22"]


@pytest.mark.asyncio
async def test_hybrid_provider_uses_local_fallback_only_for_a_real_match() -> None:
    """External failure remains visible for free text without catalog coverage."""

    error = OrsGeocoderUnavailableError("sanitized")
    provider = HybridPlaceSearchProvider(_FakeGeocoder(error=error))

    local = await provider.search("Moncloa")
    assert [place.place_id for place in local] == ["moncloa"]

    with pytest.raises(PlaceSearchUnavailableError, match="unavailable"):
        await provider.search("Calle de Ferraz 22")


def test_factory_requires_configuration_only_for_external_search(
    tmp_path: Path,
) -> None:
    """Catalog remains available without a secret; ORS search fails safely."""

    catalog = create_place_search_provider(Settings(_env_file=None))
    assert isinstance(catalog, CatalogPlaceSearchProvider)

    unavailable = create_place_search_provider(
        Settings(place_search_provider="ors", _env_file=None)
    )
    assert isinstance(unavailable, HybridPlaceSearchProvider)

    external = create_place_search_provider(
        Settings(
            place_search_provider="ors",
            ors_api_key=SecretStr("private-key"),
            ors_geocode_cache_dir=tmp_path,
            _env_file=None,
        )
    )
    assert isinstance(external, HybridPlaceSearchProvider)
