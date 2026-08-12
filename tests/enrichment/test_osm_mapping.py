"""Tests for the auditable OSM accessibility-tag mapping."""

from backend.domain import AccessibilityAttribute
from backend.enrichment.osm_mapping import (
    OSM_ATTRIBUTE_DEFINITIONS,
    OsmFeatureFamily,
    OsmTagIndicator,
    all_overpass_selectors,
    families_for_tags,
    interpret_tag_value,
    parse_incline_percent,
)


def test_definitions_cover_each_family_and_domain_attribute() -> None:
    """The route snapshot preserves every modeled accessibility dimension."""

    families = [definition.family for definition in OSM_ATTRIBUTE_DEFINITIONS]
    attributes = {
        attribute
        for definition in OSM_ATTRIBUTE_DEFINITIONS
        for attribute in definition.domain_attributes
    }

    assert len(families) == len(OsmFeatureFamily)
    assert len(families) == len(set(families))
    assert attributes == set(AccessibilityAttribute)


def test_query_selectors_include_full_pedestrian_network_once() -> None:
    """Coverage can be measured because untagged relevant ways are retained."""

    selectors = all_overpass_selectors()

    assert len(selectors) == len(set(selectors))
    assert any('way["highway"~' in selector for selector in selectors)
    assert 'node["traffic_signals:sound"]' in selectors
    assert 'way["footway"="sidewalk"]' in selectors
    assert all(
        'way["surface"]' != selector and 'way["wheelchair"]' != selector
        for selector in selectors
    )


def test_tag_interpretation_is_conservative_and_handles_compound_values() -> None:
    """Negative or ambiguous evidence is never promoted to positive."""

    assert interpret_tag_value("tactile_paving", "yes") is OsmTagIndicator.POSITIVE
    assert interpret_tag_value("tactile_paving", "incorrect") is OsmTagIndicator.NEGATIVE
    assert interpret_tag_value("kerb", "flush") is OsmTagIndicator.AMBIGUOUS
    assert interpret_tag_value("sidewalk:left", "yes") is OsmTagIndicator.AMBIGUOUS
    assert interpret_tag_value("ramp", "yes") is OsmTagIndicator.AMBIGUOUS
    assert interpret_tag_value("ramp:wheelchair", "yes") is OsmTagIndicator.POSITIVE
    assert interpret_tag_value("kerb", "lowered;raised") is OsmTagIndicator.NEGATIVE
    assert interpret_tag_value("surface", "unknown_material") is OsmTagIndicator.UNRECOGNIZED


def test_incline_parser_preserves_unknown_magnitude() -> None:
    """Directional or malformed incline tags cannot invent a percentage."""

    assert parse_incline_percent("-8%") == 8.0
    assert parse_incline_percent("4,5 %") == 4.5
    assert parse_incline_percent("up") is None
    assert parse_incline_percent("10°") is None
    assert parse_incline_percent("steep") is None


def test_one_element_can_belong_to_multiple_evidence_families() -> None:
    """Compound crossing tags remain available to every relevant dimension."""

    families = families_for_tags(
        {
            "highway": "crossing",
            "crossing": "traffic_signals",
            "traffic_signals:sound": "yes",
            "tactile_paving": "yes",
            "kerb": "lowered",
        }
    )

    assert families == {
        OsmFeatureFamily.CROSSINGS,
        OsmFeatureFamily.TRAFFIC_SIGNALS,
        OsmFeatureFamily.SIGNAL_ASSISTANCE,
        OsmFeatureFamily.TACTILE_PAVING,
        OsmFeatureFamily.KERBS,
    }
