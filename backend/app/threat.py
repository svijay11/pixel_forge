from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .geo import haversine_miles
from .models import Hotspot, Incident

IMMEDIATE_MILES = 5.0
ELEVATED_MILES = 15.0


@dataclass
class ThreatAnchor:
    kind: str
    lat: float
    lon: float
    miles: float
    label: str

    @property
    def ring(self) -> Optional[str]:
        if self.miles <= IMMEDIATE_MILES:
            return "immediate"
        if self.miles <= ELEVATED_MILES:
            return "elevated"
        return None


def _plausible(lat: float, lon: float) -> bool:
    return 32.0 <= lat <= 42.6 and -125.0 <= lon <= -113.0


def pick_threat_anchor(
    incidents: list[Incident],
    hotspots: list[Hotspot],
    lat: float,
    lon: float,
) -> Optional[ThreatAnchor]:
    nearest: Optional[ThreatAnchor] = None
    for incident in incidents:
        if incident.lat is None or incident.lon is None:
            continue
        if incident.active is False:
            continue
        if not _plausible(incident.lat, incident.lon):
            continue
        miles = haversine_miles(lat, lon, incident.lat, incident.lon)
        if nearest is None or miles < nearest.miles:
            nearest = ThreatAnchor(
                kind="incident",
                lat=incident.lat,
                lon=incident.lon,
                miles=round(miles, 1),
                label=incident.name,
            )
    if nearest:
        return nearest

    for hotspot in hotspots:
        if not _plausible(hotspot.lat, hotspot.lon):
            continue
        miles = haversine_miles(lat, lon, hotspot.lat, hotspot.lon)
        if miles > 75:
            continue
        if nearest is None or miles < nearest.miles:
            nearest = ThreatAnchor(
                kind="hotspot",
                lat=hotspot.lat,
                lon=hotspot.lon,
                miles=round(miles, 1),
                label="Satellite hotspot",
            )
    return nearest
