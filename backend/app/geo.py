from __future__ import annotations

import math

MILES_PER_DEGREE_LAT = 69.0


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 3958.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def bbox_around(lat: float, lon: float, miles: float = 50) -> tuple[float, float, float, float]:
    dlat = miles / MILES_PER_DEGREE_LAT
    dlon = miles / (MILES_PER_DEGREE_LAT * max(math.cos(math.radians(lat)), 0.2))
    west, south, east, north = lon - dlon, lat - dlat, lon + dlon, lat + dlat
    return west, south, east, north
