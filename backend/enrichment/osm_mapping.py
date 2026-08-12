"""Auditable mapping between OSM tags and accessibility evidence families."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from backend.domain import AccessibilityAttribute


class OsmFeatureFamily(str, Enum):
    """Raw OSM feature families retained for route enrichment."""

    CROSSINGS = "crossings"
    TRAFFIC_SIGNALS = "traffic_signals"
    SIGNAL_ASSISTANCE = "signal_assistance"
    TACTILE_PAVING = "tactile_paving"
    KERBS = "kerbs"
    SIDEWALKS = "sidewalks"
    RAMPS_OR_WHEELCHAIR = "ramps_or_wheelchair"
    STEPS = "steps"
    SURFACE = "surface"
    INCLINE = "incline"
    PEDESTRIAN_ACCESS = "pedestrian_access"


class OsmGeometryScope(str, Enum):
    """Geometry types expected for one OSM evidence family."""

    POINT = "point"
    LINE = "line"
    MIXED = "mixed"


class OsmTagIndicator(str, Enum):
    """Preliminary meaning of one tag value before route-level aggregation."""

    POSITIVE = "positive_indicator"
    NEGATIVE = "negative_indicator"
    AMBIGUOUS = "ambiguous"
    UNRECOGNIZED = "unrecognized"


class OsmAttributeDefinition(BaseModel):
    """Traceable OSM selectors and domain dimensions for one evidence family."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    family: OsmFeatureFamily
    description: str = Field(min_length=1)
    selectors: tuple[str, ...] = Field(min_length=1)
    domain_attributes: tuple[AccessibilityAttribute, ...] = Field(min_length=1)
    geometry_scope: OsmGeometryScope
    safety_note: str = Field(min_length=1)

    @model_validator(mode="after")
    def require_unique_values(self) -> "OsmAttributeDefinition":
        """Reject repeated selectors or dimensions.

        Returns:
            The validated definition.

        Raises:
            ValueError: If a selector or domain dimension is repeated.
        """

        if len(self.selectors) != len(set(self.selectors)):
            raise ValueError("OSM selectors must be unique within a family")
        if len(self.domain_attributes) != len(set(self.domain_attributes)):
            raise ValueError("domain attributes must be unique within a family")
        return self


ROUTABLE_HIGHWAY_PATTERN = (
    "footway|path|pedestrian|steps|living_street|residential|service|"
    "unclassified|tertiary|secondary|primary"
)


OSM_ATTRIBUTE_DEFINITIONS: tuple[OsmAttributeDefinition, ...] = (
    OsmAttributeDefinition(
        family=OsmFeatureFamily.CROSSINGS,
        description="Pedestrian crossings and their declared control type.",
        selectors=('node["highway"="crossing"]', 'node["crossing"]'),
        domain_attributes=(AccessibilityAttribute.CROSSING_COMPATIBILITY,),
        geometry_scope=OsmGeometryScope.POINT,
        safety_note="A mapped crossing does not by itself prove compatibility.",
    ),
    OsmAttributeDefinition(
        family=OsmFeatureFamily.TRAFFIC_SIGNALS,
        description="Signals associated with pedestrian crossings.",
        selectors=(
            'node["highway"="traffic_signals"]',
            'node["crossing"="traffic_signals"]',
            'node["crossing:signals"="yes"]',
        ),
        domain_attributes=(AccessibilityAttribute.TRAFFIC_SIGNALS,),
        geometry_scope=OsmGeometryScope.POINT,
        safety_note="Traffic signals do not imply audible or tactile support.",
    ),
    OsmAttributeDefinition(
        family=OsmFeatureFamily.SIGNAL_ASSISTANCE,
        description="Audible or vibration assistance declared at signals.",
        selectors=(
            'node["traffic_signals:sound"]',
            'node["traffic_signals:vibration"]',
            'node["traffic_signals:floor_vibration"]',
        ),
        domain_attributes=(AccessibilityAttribute.AUDIBLE_SIGNALS,),
        geometry_scope=OsmGeometryScope.POINT,
        safety_note="Missing tags mean unknown support, never confirmed absence.",
    ),
    OsmAttributeDefinition(
        family=OsmFeatureFamily.TACTILE_PAVING,
        description="Declared tactile paving at crossings or pedestrian ways.",
        selectors=('node["tactile_paving"]', 'way["highway"]["tactile_paving"]'),
        domain_attributes=(AccessibilityAttribute.TACTILE_PAVING,),
        geometry_scope=OsmGeometryScope.MIXED,
        safety_note="Partial or incorrect paving cannot be treated as favorable.",
    ),
    OsmAttributeDefinition(
        family=OsmFeatureFamily.KERBS,
        description="Kerb type or explicit kerb barriers.",
        selectors=(
            'node["kerb"]',
            'way["highway"]["kerb"]',
            'node["barrier"="kerb"]',
            'way["barrier"="kerb"]',
        ),
        domain_attributes=(AccessibilityAttribute.KERB,),
        geometry_scope=OsmGeometryScope.MIXED,
        safety_note="Flush kerbs require tactile context for blind pedestrians.",
    ),
    OsmAttributeDefinition(
        family=OsmFeatureFamily.SIDEWALKS,
        description="Sidewalk declarations and separately mapped sidewalks.",
        selectors=(
            'way["highway"]["sidewalk"]',
            'way["highway"]["sidewalk:left"]',
            'way["highway"]["sidewalk:right"]',
            'way["highway"]["sidewalk:both"]',
            'way["footway"="sidewalk"]',
        ),
        domain_attributes=(AccessibilityAttribute.SIDEWALK,),
        geometry_scope=OsmGeometryScope.LINE,
        safety_note="One-sided sidewalks need route-direction and side context.",
    ),
    OsmAttributeDefinition(
        family=OsmFeatureFamily.RAMPS_OR_WHEELCHAIR,
        description="Declared ramps and wheelchair access.",
        selectors=(
            'node["highway"]["ramp"]',
            'way["highway"]["ramp"]',
            'node["highway"]["ramp:wheelchair"]',
            'way["highway"]["ramp:wheelchair"]',
            'node["highway"]["wheelchair"]',
            'way["highway"]["wheelchair"]',
        ),
        domain_attributes=(AccessibilityAttribute.RAMP_ACCESS,),
        geometry_scope=OsmGeometryScope.MIXED,
        safety_note="A generic ramp may serve bicycles rather than wheelchairs.",
    ),
    OsmAttributeDefinition(
        family=OsmFeatureFamily.STEPS,
        description="Ways or points explicitly mapped as steps.",
        selectors=('node["highway"="steps"]', 'way["highway"="steps"]'),
        domain_attributes=(AccessibilityAttribute.STEP_FREE,),
        geometry_scope=OsmGeometryScope.MIXED,
        safety_note="Confirmed steps remain a barrier even when another ramp exists.",
    ),
    OsmAttributeDefinition(
        family=OsmFeatureFamily.SURFACE,
        description="Surface and smoothness on pedestrian-relevant ways.",
        selectors=(
            f'way["highway"~"^({ROUTABLE_HIGHWAY_PATTERN})$"]["surface"]',
            f'way["highway"~"^({ROUTABLE_HIGHWAY_PATTERN})$"]["smoothness"]',
        ),
        domain_attributes=(AccessibilityAttribute.SURFACE,),
        geometry_scope=OsmGeometryScope.LINE,
        safety_note="Material alone does not establish regularity or accessibility.",
    ),
    OsmAttributeDefinition(
        family=OsmFeatureFamily.INCLINE,
        description="Declared incline on pedestrian-relevant ways.",
        selectors=(
            f'way["highway"~"^({ROUTABLE_HIGHWAY_PATTERN})$"]["incline"]',
        ),
        domain_attributes=(AccessibilityAttribute.SLOPE,),
        geometry_scope=OsmGeometryScope.LINE,
        safety_note="Directional values without magnitude preserve unknown severity.",
    ),
    OsmAttributeDefinition(
        family=OsmFeatureFamily.PEDESTRIAN_ACCESS,
        description="Explicit access or foot permissions on route-relevant ways.",
        selectors=(
            f'way["highway"~"^({ROUTABLE_HIGHWAY_PATTERN})$"]["foot"]',
            f'way["highway"~"^({ROUTABLE_HIGHWAY_PATTERN})$"]["access"]',
        ),
        domain_attributes=(AccessibilityAttribute.PEDESTRIAN_ACCESS,),
        geometry_scope=OsmGeometryScope.LINE,
        safety_note="General access restrictions may be overridden by foot access.",
    ),
)


_VALUE_MEANINGS: dict[str, dict[OsmTagIndicator, frozenset[str]]] = {
    "crossing": {
        OsmTagIndicator.POSITIVE: frozenset({"traffic_signals", "marked", "zebra"}),
        OsmTagIndicator.NEGATIVE: frozenset({"no", "informal"}),
        OsmTagIndicator.AMBIGUOUS: frozenset({"uncontrolled", "unmarked", "yes"}),
    },
    "traffic_signals:sound": {
        OsmTagIndicator.POSITIVE: frozenset({"yes", "walk"}),
        OsmTagIndicator.NEGATIVE: frozenset({"no"}),
        OsmTagIndicator.AMBIGUOUS: frozenset({"locate"}),
    },
    "traffic_signals:vibration": {
        OsmTagIndicator.POSITIVE: frozenset({"yes"}),
        OsmTagIndicator.NEGATIVE: frozenset({"no"}),
    },
    "traffic_signals:floor_vibration": {
        OsmTagIndicator.POSITIVE: frozenset({"yes"}),
        OsmTagIndicator.NEGATIVE: frozenset({"no"}),
    },
    "tactile_paving": {
        OsmTagIndicator.POSITIVE: frozenset({"yes"}),
        OsmTagIndicator.NEGATIVE: frozenset({"no", "incorrect"}),
        OsmTagIndicator.AMBIGUOUS: frozenset({"partial", "primitive"}),
    },
    "kerb": {
        OsmTagIndicator.POSITIVE: frozenset({"lowered", "no"}),
        OsmTagIndicator.NEGATIVE: frozenset({"raised", "yes"}),
        OsmTagIndicator.AMBIGUOUS: frozenset({"flush", "rolled", "regular"}),
    },
    "sidewalk": {
        OsmTagIndicator.POSITIVE: frozenset({"yes", "both", "separate"}),
        OsmTagIndicator.NEGATIVE: frozenset({"no", "none"}),
        OsmTagIndicator.AMBIGUOUS: frozenset({"left", "right", "lane"}),
    },
    "sidewalk_side": {
        OsmTagIndicator.AMBIGUOUS: frozenset(
            {"yes", "no", "none", "separate", "lane"}
        ),
    },
    "wheelchair": {
        OsmTagIndicator.POSITIVE: frozenset({"yes", "designated"}),
        OsmTagIndicator.NEGATIVE: frozenset({"no"}),
        OsmTagIndicator.AMBIGUOUS: frozenset({"limited"}),
    },
    "ramp": {
        OsmTagIndicator.AMBIGUOUS: frozenset({"yes", "no", "separate"}),
    },
    "ramp:wheelchair": {
        OsmTagIndicator.POSITIVE: frozenset({"yes", "separate"}),
        OsmTagIndicator.NEGATIVE: frozenset({"no"}),
    },
    "foot": {
        OsmTagIndicator.POSITIVE: frozenset({"yes", "designated", "permissive"}),
        OsmTagIndicator.NEGATIVE: frozenset({"no", "private"}),
        OsmTagIndicator.AMBIGUOUS: frozenset({"destination", "customers"}),
    },
    "access": {
        OsmTagIndicator.POSITIVE: frozenset({"yes", "permissive"}),
        OsmTagIndicator.NEGATIVE: frozenset({"no", "private"}),
        OsmTagIndicator.AMBIGUOUS: frozenset(
            {"customers", "delivery", "destination", "permit", "visitors"}
        ),
    },
    "surface": {
        OsmTagIndicator.POSITIVE: frozenset(
            {"asphalt", "concrete", "concrete:plates", "paved"}
        ),
        OsmTagIndicator.NEGATIVE: frozenset(
            {
                "cobblestone",
                "dirt",
                "earth",
                "ground",
                "mud",
                "pebblestone",
                "sand",
                "unhewn_cobblestone",
                "unpaved",
            }
        ),
        OsmTagIndicator.AMBIGUOUS: frozenset(
            {
                "compacted",
                "fine_gravel",
                "grass_paver",
                "gravel",
                "metal",
                "paving_stones",
                "sett",
                "wood",
            }
        ),
    },
    "smoothness": {
        OsmTagIndicator.POSITIVE: frozenset({"excellent", "good"}),
        OsmTagIndicator.NEGATIVE: frozenset(
            {"bad", "very_bad", "horrible", "very_horrible", "impassable"}
        ),
        OsmTagIndicator.AMBIGUOUS: frozenset({"intermediate"}),
    },
    "highway": {
        OsmTagIndicator.POSITIVE: frozenset({"traffic_signals"}),
        OsmTagIndicator.NEGATIVE: frozenset({"steps"}),
        OsmTagIndicator.AMBIGUOUS: frozenset({"crossing"}),
    },
}


def canonical_tag_key(key: str) -> str:
    """Collapse directional or specialized keys onto an auditable base rule.

    Args:
        key: Raw OSM tag key.

    Returns:
        Canonical key used by the preliminary value registry.
    """

    if key in {"sidewalk:left", "sidewalk:right"}:
        return "sidewalk_side"
    if key == "sidewalk:both":
        return "sidewalk"
    return key


def interpret_tag_value(key: str, value: str) -> OsmTagIndicator:
    """Return a preliminary indicator without claiming route accessibility.

    Args:
        key: Raw OSM tag key.
        value: Raw OSM tag value, potentially containing semicolon variants.

    Returns:
        Conservative preliminary meaning for later compound aggregation.
    """

    meanings = _VALUE_MEANINGS.get(canonical_tag_key(key))
    if meanings is None:
        return OsmTagIndicator.UNRECOGNIZED
    values = {part.strip().lower() for part in value.split(";") if part.strip()}
    if not values:
        return OsmTagIndicator.UNRECOGNIZED
    matched = {
        meaning
        for meaning, documented_values in meanings.items()
        if values & documented_values
    }
    if OsmTagIndicator.NEGATIVE in matched:
        return OsmTagIndicator.NEGATIVE
    if OsmTagIndicator.AMBIGUOUS in matched or len(matched) > 1:
        return OsmTagIndicator.AMBIGUOUS
    if OsmTagIndicator.POSITIVE in matched:
        return OsmTagIndicator.POSITIVE
    return OsmTagIndicator.UNRECOGNIZED


def parse_incline_percent(value: str) -> Optional[float]:
    """Parse a numeric OSM incline into an absolute percentage.

    Args:
        value: Raw `incline` value.

    Returns:
        Absolute incline percentage, or ``None`` when magnitude is unknown or
        the value uses unsupported units.
    """

    normalized = value.strip().lower().replace(" ", "")
    if normalized in {"up", "down", "yes", "no"} or normalized.endswith("°"):
        return None
    if normalized.endswith("%"):
        normalized = normalized[:-1]
    try:
        parsed = abs(float(normalized.replace(",", ".")))
    except ValueError:
        return None
    return parsed if parsed <= 100.0 else None


def families_for_tags(tags: dict[str, str]) -> frozenset[OsmFeatureFamily]:
    """Classify one OSM element into every relevant evidence family.

    Args:
        tags: Validated raw OSM tags.

    Returns:
        All applicable families without forcing a single-label classification.
    """

    families: set[OsmFeatureFamily] = set()
    highway = tags.get("highway")
    if highway == "crossing" or "crossing" in tags:
        families.add(OsmFeatureFamily.CROSSINGS)
    if (
        highway == "traffic_signals"
        or tags.get("crossing") == "traffic_signals"
        or tags.get("crossing:signals") == "yes"
    ):
        families.add(OsmFeatureFamily.TRAFFIC_SIGNALS)
    if any(
        key in tags
        for key in (
            "traffic_signals:sound",
            "traffic_signals:vibration",
            "traffic_signals:floor_vibration",
        )
    ):
        families.add(OsmFeatureFamily.SIGNAL_ASSISTANCE)
    if "tactile_paving" in tags:
        families.add(OsmFeatureFamily.TACTILE_PAVING)
    if "kerb" in tags or tags.get("barrier") == "kerb":
        families.add(OsmFeatureFamily.KERBS)
    sidewalk_keys = ("sidewalk", "sidewalk:left", "sidewalk:right", "sidewalk:both")
    if any(key in tags for key in sidewalk_keys) or tags.get("footway") == "sidewalk":
        families.add(OsmFeatureFamily.SIDEWALKS)
    if any(key in tags for key in ("ramp", "ramp:wheelchair", "wheelchair")):
        families.add(OsmFeatureFamily.RAMPS_OR_WHEELCHAIR)
    if highway == "steps":
        families.add(OsmFeatureFamily.STEPS)
    if "surface" in tags or "smoothness" in tags:
        families.add(OsmFeatureFamily.SURFACE)
    if "incline" in tags:
        families.add(OsmFeatureFamily.INCLINE)
    if "foot" in tags or "access" in tags:
        families.add(OsmFeatureFamily.PEDESTRIAN_ACCESS)
    return frozenset(families)


def all_overpass_selectors() -> tuple[str, ...]:
    """Return unique selectors for the pilot routing snapshot.

    Returns:
        Stable selector tuple including the complete relevant walking network.
    """

    selectors = {
        selector
        for definition in OSM_ATTRIBUTE_DEFINITIONS
        for selector in definition.selectors
    }
    selectors.add(f'way["highway"~"^({ROUTABLE_HIGHWAY_PATTERN})$"]')
    return tuple(sorted(selectors))
