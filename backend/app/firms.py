from __future__ import annotations

import asyncio
import csv
import io
import logging

import httpx

from .config import settings
from .geo import bbox_around, haversine_miles
from .models import Hotspot

logger = logging.getLogger(__name__)

FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{source}/{bbox}/2"


async def fetch_hotspots(client: httpx.AsyncClient, lat: float, lon: float) -> list[Hotspot]:
    if not settings.firms_map_key:
        logger.warning("FIRMS_MAP_KEY is not set; skipping hotspot fetch")
        return []

    west, south, east, north = bbox_around(lat, lon, miles=50)
    bbox = f"{west:.4f},{south:.4f},{east:.4f},{north:.4f}"
    sources = ("VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT")
    rows = await asyncio.gather(
        *[_fetch_source(client, source, bbox) for source in sources],
    )
    found: list[Hotspot] = []
    for source, csv_text in zip(sources, rows):
        if not csv_text:
            continue
        reader = csv.DictReader(io.StringIO(csv_text))
        for row in reader:
            try:
                hlat = float(row["latitude"])
                hlon = float(row["longitude"])
            except (KeyError, TypeError, ValueError):
                continue
            miles = haversine_miles(lat, lon, hlat, hlon)
            if miles > 50:
                continue
            found.append(
                Hotspot(
                    lat=hlat,
                    lon=hlon,
                    brightness=_num(row.get("bright_ti4") or row.get("brightness")),
                    frp=_num(row.get("frp")),
                    acq_date=row.get("acq_date"),
                    satellite=row.get("satellite") or source,
                    miles=round(miles, 1),
                ),
            )

    found.sort(key=lambda h: h.miles or 999)
    return found[:40]


async def _fetch_source(client: httpx.AsyncClient, source: str, bbox: str) -> str | None:
    url = FIRMS_URL.format(key=settings.firms_map_key, source=source, bbox=bbox)
    try:
        res = await client.get(url, timeout=30)
        res.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("FIRMS %s failed: %s", source, exc)
        return None
    text = res.text.strip()
    if not text or text.startswith("Invalid") or text.startswith("No fire"):
        return None
    return text


def _num(value: str | None) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except ValueError:
        return None
