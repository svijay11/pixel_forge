from __future__ import annotations

import logging
from typing import Optional

import httpx

from .config import settings

logger = logging.getLogger(__name__)

ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"


async def driving_route(
    start_lon: float,
    start_lat: float,
    end_lon: float,
    end_lat: float,
) -> Optional[dict]:
    if not settings.openrouteservice_api_key:
        logger.warning("OPENROUTESERVICE_API_KEY is not set; skipping route")
        return None
    headers = {
        "Authorization": settings.openrouteservice_api_key,
        "Content-Type": "application/json",
        "Accept": "application/geo+json, application/json",
    }
    body = {
        "coordinates": [[start_lon, start_lat], [end_lon, end_lat]],
        "instructions": False,
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(ORS_URL, headers=headers, json=body)
    except httpx.HTTPError as exc:
        logger.warning("OpenRouteService failed: %s", exc)
        return None
    if response.status_code >= 400:
        logger.warning("OpenRouteService %s: %s", response.status_code, response.text[:240])
        return None
    payload = response.json()
    features = payload.get("features") if isinstance(payload, dict) else None
    if not features:
        return None
    geometry = features[0].get("geometry") if isinstance(features[0], dict) else None
    if not isinstance(geometry, dict) or geometry.get("type") != "LineString":
        return None
    return geometry
