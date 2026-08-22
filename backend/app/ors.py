from __future__ import annotations

import logging
from typing import Optional

import httpx

from .config import settings
from .geo import destination_point, initial_bearing_deg

logger = logging.getLogger(__name__)

ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
_ESCAPE_TRIES_MILES = (40.0, 25.0, 12.0)


def _headers() -> dict[str, str]:
    return {
        "Authorization": settings.openrouteservice_api_key,
        "Content-Type": "application/json",
        "Accept": "application/geo+json, application/json",
    }


async def _ors_payload(
    start_lon: float,
    start_lat: float,
    end_lon: float,
    end_lat: float,
    *,
    instructions: bool,
) -> Optional[dict]:
    if not settings.openrouteservice_api_key:
        logger.warning("OPENROUTESERVICE_API_KEY is not set; skipping route")
        return None
    body = {
        "coordinates": [[start_lon, start_lat], [end_lon, end_lat]],
        "instructions": instructions,
        "radiuses": [2000, 20000],
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(ORS_URL, headers=_headers(), json=body)
    except httpx.HTTPError as exc:
        logger.warning("OpenRouteService failed: %s", exc)
        return None
    if response.status_code >= 400:
        logger.warning("OpenRouteService %s: %s", response.status_code, response.text[:240])
        return None
    payload = response.json()
    return payload if isinstance(payload, dict) else None


def _geometry(payload: dict) -> Optional[dict]:
    features = payload.get("features")
    if not features:
        return None
    geometry = features[0].get("geometry") if isinstance(features[0], dict) else None
    if not isinstance(geometry, dict) or geometry.get("type") != "LineString":
        return None
    return geometry


def _step_instructions(payload: dict) -> list[str]:
    features = payload.get("features")
    if not features or not isinstance(features[0], dict):
        return []
    props = features[0].get("properties") or {}
    lines: list[str] = []
    for segment in props.get("segments") or []:
        if not isinstance(segment, dict):
            continue
        for step in segment.get("steps") or []:
            if not isinstance(step, dict):
                continue
            instruction = str(step.get("instruction") or "").strip()
            if not instruction:
                continue
            lower = instruction.lower()
            if lower.startswith("arrive") or "your destination" in lower:
                continue
            lines.append(instruction.rstrip("."))
            if len(lines) >= 4:
                return lines
    return lines


async def driving_route(
    start_lon: float,
    start_lat: float,
    end_lon: float,
    end_lat: float,
) -> Optional[dict]:
    payload = await _ors_payload(
        start_lon,
        start_lat,
        end_lon,
        end_lat,
        instructions=False,
    )
    return _geometry(payload) if payload else None


async def escape_steps(
    start_lat: float,
    start_lon: float,
    threat_lat: float,
    threat_lon: float,
) -> list[str]:
    toward = initial_bearing_deg(start_lat, start_lon, threat_lat, threat_lon)
    away = (toward + 180) % 360
    for miles in _ESCAPE_TRIES_MILES:
        end_lat, end_lon = destination_point(start_lat, start_lon, miles, away)
        payload = await _ors_payload(
            start_lon,
            start_lat,
            end_lon,
            end_lat,
            instructions=True,
        )
        if not payload:
            continue
        steps = _step_instructions(payload)
        if steps:
            return steps
    return []
