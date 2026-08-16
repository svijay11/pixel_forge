from __future__ import annotations

import json
import logging
from functools import lru_cache

from shapely import STRtree
from shapely.geometry import Point, shape
from shapely.geometry.base import BaseGeometry

from .config import settings

logger = logging.getLogger(__name__)

ZONE_ALIASES = {
    "very high": "Very High",
    "veryhigh": "Very High",
    "vhigh": "Very High",
    "high": "High",
    "moderate": "Moderate",
    "mod": "Moderate",
}


class HazardIndex:
    def __init__(self, geoms: list[BaseGeometry], zones: list[str]) -> None:
        self.geoms = geoms
        self.zones = zones
        self.tree = STRtree(geoms) if geoms else None

    def lookup(self, lat: float, lon: float) -> str:
        if not self.tree or not self.geoms:
            return "Unknown"
        point = Point(lon, lat)
        matches = self.tree.query(point, predicate="intersects")
        if len(matches) == 0:
            return "Unknown"
        # Prefer the most severe overlapping zone.
        found = [self.zones[int(i)] for i in matches]
        for rank in ("Very High", "High", "Moderate"):
            if rank in found:
                return rank
        return found[0]


def normalize_zone(raw: str | None) -> str:
    if not raw:
        return "Unknown"
    key = "".join(ch for ch in raw.lower() if ch.isalnum() or ch.isspace()).strip()
    key = " ".join(key.split())
    if "very high" in key:
        return "Very High"
    if key in ZONE_ALIASES:
        return ZONE_ALIASES[key]
    if "high" in key:
        return "High"
    if "moderate" in key or "mod" in key:
        return "Moderate"
    return "Unknown"


@lru_cache(maxsize=1)
def load_hazard_index() -> HazardIndex:
    path = settings.fhsz_path
    if not path.exists():
        logger.warning("FHSZ file missing at %s; hazard zone lookup disabled", path)
        return HazardIndex([], [])

    with path.open() as handle:
        data = json.load(handle)

    geoms: list[BaseGeometry] = []
    zones: list[str] = []
    for feature in data.get("features") or []:
        props = feature.get("properties") or {}
        raw = (
            props.get("FHSZ_Description")
            or props.get("HAZ_CODE")
            or props.get("HAZARD")
            or props.get("FHSZ")
            or props.get("CLASS")
        )
        if isinstance(raw, (int, float)):
            raw = {1: "Moderate", 2: "High", 3: "Very High"}.get(int(raw), str(raw))
        zone = normalize_zone(str(raw) if raw is not None else None)
        if zone == "Unknown":
            continue
        geom = feature.get("geometry")
        if not geom:
            continue
        try:
            parsed = shape(geom)
            if parsed.is_empty:
                continue
            if not parsed.is_valid:
                parsed = parsed.buffer(0)
            geoms.append(parsed)
            zones.append(zone)
        except Exception:
            continue

    logger.info("Loaded %s FHSZ polygons from %s", len(geoms), path)
    return HazardIndex(geoms, zones)


def lookup_hazard_zone(lat: float, lon: float) -> str:
    return load_hazard_index().lookup(lat, lon)
