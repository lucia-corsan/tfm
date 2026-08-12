"""Tests for deterministic local pilot-place search."""

import pytest

from backend.places import search_pilot_places


def test_search_ignores_case_and_accents() -> None:
    """Unaccented user input finds the correctly written public place name."""

    assert [place.place_id for place in search_pilot_places("PRINCIPE")] == [
        "principe_pio"
    ]


def test_search_uses_aliases_without_exposing_them() -> None:
    """A local transport alias resolves one stable public result."""

    result = search_pilot_places("intercambiador de moncloa")[0]

    assert result.place_id == "moncloa"
    assert "aliases" not in result.model_dump()


def test_search_is_stable_and_respects_limit() -> None:
    """Broad matches keep deterministic relevance order and result bounds."""

    first = search_pilot_places("estacion", limit=2)
    second = search_pilot_places("estacion", limit=2)

    assert first == second
    assert len(first) == 2


def test_search_returns_empty_list_for_unknown_place() -> None:
    """No local match is a successful empty search, not a fabricated place."""

    assert search_pilot_places("Atocha") == []


@pytest.mark.parametrize(
    ("query", "limit"),
    [("x", 5), ("   ", 5), ("Moncloa", 0), ("Moncloa", 11)],
)
def test_search_rejects_invalid_internal_arguments(query: str, limit: int) -> None:
    """Direct callers cannot bypass the same query and result bounds."""

    with pytest.raises(ValueError):
        search_pilot_places(query, limit=limit)
