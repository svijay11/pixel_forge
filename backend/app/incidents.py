from __future__ import annotations

import logging

import httpx

from .geo import haversine_miles
from .models import Incident

logger = logging.getLogger(__name__)

GEOJSON_URL = "https://incidents.fire.ca.gov/umbraco/api/IncidentApi/GeoJsonList"


async def fetch_incidents(client: httpx.AsyncClient, lat: float, lon: float) -> list[Incident]:
    incidents: list[Incident] = []
    try:
        res = await client.get(
            GEOJSON_URL,
            params={"inactive": "false"},
            timeout=30,
            headers={"User-Agent": "ember-wildfire-copilot"},
        )
        res.raise_for_status()
        payload = res.json()
    except httpx.HTTPError as exc:
        logger.warning("CAL FIRE incidents failed: %s", exc)
        return []

    features = payload.get("features") if isinstance(payload, dict) else payload
    if not isinstance(features, list):
        return []

    for feature in features:
        if not isinstance(feature, dict):
            continue
        props = feature.get("properties") or feature
        geom = feature.get("geometry") or {}
        coords = geom.get("coordinates") if isinstance(geom, dict) else None
        ilat = _num(props.get("Latitude") or props.get("latitude"))
        ilon = _num(props.get("Longitude") or props.get("longitude"))
        if ilat is None and isinstance(coords, list) and len(coords) >= 2:
            ilon, ilat = _num(coords[0]), _num(coords[1])
        if ilat is None or ilon is None:
            continue
        miles = haversine_miles(lat, lon, ilat, ilon)
        name = (
            props.get("Name")
            or props.get("IncidentName")
            or props.get("name")
            or "Unnamed incident"
        )
        incidents.append(
            Incident(
                name=str(name),
                county=props.get("County") or props.get("county"),
                acres=_num(props.get("AcresBurned") or props.get("acresBurned")),
                contained=_num(props.get("PercentContained") or props.get("percentContained")),
                lat=ilat,
                lon=ilon,
                miles=round(miles, 1),
                url=props.get("Url") or props.get("url"),
                active=props.get("IsActive") if isinstance(props.get("IsActive"), bool) else True,
            ),
        )

    incidents.sort(key=lambda i: i.miles or 999)
    nearby = [item for item in incidents if (item.miles or 0) <= 50]
    if nearby:
        return nearby[:20]
    # Bay Area can sit just outside a 50 mi ring of the nearest active fire.
    return incidents[:1]


def _num(value: object) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
