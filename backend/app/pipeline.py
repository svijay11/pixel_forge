from __future__ import annotations

import asyncio
import logging
import time
from typing import Dict, Tuple

import httpx

from .config import settings
from .firms import fetch_hotspots
from .hazard import lookup_hazard_zone
from .incidents import fetch_incidents
from .knowledge import retrieve_for_parcel
from .models import AssessResponse, Wind
from .noaa import fetch_weather
from .openrouter import (
    _fallback_brief,
    _fallback_checklist,
    generate_checklist,
    synthesize_brief,
    verify_checklist,
)

logger = logging.getLogger(__name__)

CacheKey = Tuple[str, float, float]
_inflight: Dict[CacheKey, "asyncio.Future[AssessResponse]"] = {}
_recent: Dict[CacheKey, Tuple[float, AssessResponse]] = {}
_CACHE_TTL = 45.0


def _cache_key(address: str, lat: float, lon: float) -> CacheKey:
    return (address.strip().lower(), round(lat, 4), round(lon, 4))


async def run_assess(address: str, lat: float, lon: float) -> AssessResponse:
    key = _cache_key(address, lat, lon)
    cached = _recent.get(key)
    if cached and time.monotonic() - cached[0] < _CACHE_TTL:
        logger.info("assess cache hit for %s", address)
        return cached[1]

    existing = _inflight.get(key)
    if existing is not None:
        logger.info("assess coalesced with in-flight request for %s", address)
        return await existing

    loop = asyncio.get_running_loop()
    future: asyncio.Future[AssessResponse] = loop.create_future()
    _inflight[key] = future
    try:
        result = await _run_assess(address, lat, lon)
        _recent[key] = (time.monotonic(), result)
        if not future.done():
            future.set_result(result)
        return result
    except asyncio.CancelledError:
        if not future.done():
            future.cancel()
        raise
    except Exception as exc:
        if not future.done():
            future.set_exception(exc)
        raise
    finally:
        _inflight.pop(key, None)


async def _run_assess(address: str, lat: float, lon: float) -> AssessResponse:
    started = time.monotonic()
    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        hotspots, weather, incidents = await asyncio.gather(
            fetch_hotspots(client, lat, lon),
            fetch_weather(client, lat, lon),
            fetch_incidents(client, lat, lon),
            return_exceptions=True,
        )

    if isinstance(hotspots, BaseException):
        logger.warning("hotspots failed: %s", hotspots)
        hotspots = []
    if isinstance(weather, BaseException):
        logger.warning("weather failed: %s", weather)
        wind, alerts = Wind(), []
    else:
        wind, alerts = weather
    if isinstance(incidents, BaseException):
        logger.warning("incidents failed: %s", incidents)
        incidents = []

    hazard_zone = lookup_hazard_zone(lat, lon)
    nearest_miles = incidents[0].miles if incidents else None
    docs = retrieve_for_parcel(
        hazard_zone,
        nearest_incident_miles=nearest_miles,
        alert_events=[a.event for a in alerts],
        hotspot_count=len(hotspots),
    )
    logger.info(
        "data ready in %.1fs zone=%s hotspots=%s incidents=%s docs=%s",
        time.monotonic() - started,
        hazard_zone,
        len(hotspots),
        len(incidents),
        len(docs),
    )

    if not settings.openrouter_api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    try:
        brief, headline, beats = await synthesize_brief(
            address=address,
            lat=lat,
            lon=lon,
            hazard_zone=hazard_zone,
            wind=wind,
            alerts=alerts,
            hotspots=hotspots,
            incidents=incidents,
        )
    except Exception as exc:
        logger.warning("brief failed, using local copy: %s", exc)
        brief, headline, beats = _fallback_brief(
            address, hazard_zone, wind, alerts, hotspots, incidents
        )
    try:
        raw_items = await generate_checklist(
            address=address,
            hazard_zone=hazard_zone,
            docs=docs,
            wind=wind,
            alerts=alerts,
            hotspots=hotspots,
            incidents=incidents,
        )
    except Exception as exc:
        logger.warning("checklist failed, using local copy: %s", exc)
        raw_items = _fallback_checklist(
            address=address,
            hazard_zone=hazard_zone,
            wind=wind,
            alerts=alerts,
            hotspots=hotspots,
            incidents=incidents,
        )
    checklist = verify_checklist(
        raw_items,
        docs,
        address=address,
        hazard_zone=hazard_zone,
        wind=wind,
        alerts=alerts,
        hotspots=hotspots,
        incidents=incidents,
    )
    logger.info("assess complete in %.1fs", time.monotonic() - started)

    return AssessResponse(
        riskBrief=brief,
        headline=headline or None,
        beats=beats,
        checklist=checklist,
        hazardZone=hazard_zone,
        nearbyHotspots=hotspots,
        nearbyIncidents=incidents,
        wind=wind,
        alerts=alerts,
        address=address,
    )
