from __future__ import annotations

import asyncio
import json
import logging
import re
import time

import httpx

from .config import settings
from .geo import compass_point, initial_bearing_deg
from .knowledge import KnowledgeDoc
from .models import Alert, BriefBeat, ChecklistItem, Hotspot, Incident, Wind
from .ors import escape_steps
from .threat import ThreatAnchor

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

SYNTHESIS_SYSTEM = """You are Ember, a wildfire home-readiness copilot for California addresses.

Write a situation brief for THIS parcel using ONLY the structured data provided.
Rules:
- State only what the data supports. Do not speculate about fire spread, future weather, or outcomes.
- Do not invent distances, counts, or alerts that are not in the data.
- If a field is missing or empty, say that source returned no data.
- Do not give evacuation orders. Point people to official alerts and local authorities when alerts are present.
- Name the address, nearest incident, wind, and alerts when present so two different parcels cannot get the same brief.
- Reply with a single JSON object and nothing else. No planning, no notes, no markdown.
{"headline": "one sentence unique to this address", "beats": [{"title": "short label", "body": "2-3 sentences"}]}
- Exactly 3 beats. Titles from: Hazard zone, Wind, Nearby incident, Alerts, Satellite hotspots.
"""

def _prep_json_text(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return (
        text.replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2018", "'")
        .replace("\u2019", "'")
    )


def _try_load_object(text: str) -> dict | None:
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        try:
            data, _ = json.JSONDecoder().raw_decode(text)
        except json.JSONDecodeError:
            return None
    return data if isinstance(data, dict) else None


def _repair_json(text: str) -> str:
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    in_string = False
    escape = False
    stack: list[str] = []
    for char in text:
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            stack.append("}")
        elif char == "[":
            stack.append("]")
        elif char in ("}", "]") and stack and stack[-1] == char:
            stack.pop()
    if in_string:
        text += '"'
    if text.rstrip().endswith(","):
        text = text.rstrip()[:-1]
    while stack:
        text += stack.pop()
    return re.sub(r",(\s*[}\]])", r"\1", text)


def _extract_json(text: str) -> dict:
    cleaned = _prep_json_text(text)
    start = cleaned.find("{")
    snippet = cleaned[start:] if start >= 0 else cleaned
    for candidate in (snippet, _repair_json(snippet)):
        parsed = _try_load_object(candidate)
        if parsed is not None:
            return parsed
    raise ValueError("No JSON object in model response")


def _message_text(payload: dict) -> str:
    choices = payload.get("choices") or []
    if not choices:
        return ""
    message = (choices[0] or {}).get("message") or {}
    content = message.get("content")
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") in (None, "text"):
                parts.append(item.get("text") or "")
            elif isinstance(item, str):
                parts.append(item)
        content = "".join(parts)
    return (content or "").strip()


async def _generate(
    *,
    system: str,
    user: str,
    max_tokens: int,
) -> str:
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.frontend_origin,
        "X-Title": "Ember wildfire copilot",
    }
    body = {
        "model": settings.openrouter_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0,
        "reasoning": {"effort": "low"},
    }
    request_timeout = httpx.Timeout(connect=8.0, read=16.0, write=10.0, pool=5.0)
    started = time.monotonic()
    async with httpx.AsyncClient(timeout=request_timeout) as client:
        try:
            response = await client.post(
                OPENROUTER_URL,
                headers=headers,
                json=body,
                timeout=request_timeout,
            )
        except httpx.HTTPError as exc:
            raise RuntimeError(f"OpenRouter request failed: {exc}") from exc
        if response.status_code == 429:
            raise RuntimeError("OpenRouter rate limited")
        if response.status_code >= 400:
            detail = (response.text or "")[:300]
            try:
                err = response.json().get("error") or {}
                detail = err.get("message") or detail
            except Exception:
                pass
            raise RuntimeError(f"OpenRouter request failed ({response.status_code}): {detail}")
        text = _message_text(response.json())
        logger.info(
            "OpenRouter ok in %.1fs (%s chars)",
            time.monotonic() - started,
            len(text),
        )
        if not text:
            raise RuntimeError("OpenRouter returned an empty response")
        return text


async def synthesize_brief(
    *,
    address: str,
    lat: float,
    lon: float,
    hazard_zone: str,
    wind: Wind,
    alerts: list[Alert],
    hotspots: list[Hotspot],
    incidents: list[Incident],
) -> tuple[str, str, list[BriefBeat]]:
    payload = {
        "address": address,
        "lat": lat,
        "lon": lon,
        "hazardZone": hazard_zone,
        "wind": wind.model_dump(),
        "alerts": [a.model_dump() for a in alerts],
        "nearbyHotspots": [h.model_dump() for h in hotspots[:8]],
        "nearbyIncidents": [i.model_dump() for i in incidents[:6]],
        "hotspotCount": len(hotspots),
        "incidentCount": len(incidents),
        "closestIncidentMiles": incidents[0].miles if incidents else None,
        "closestHotspotMiles": hotspots[0].miles if hotspots else None,
    }
    try:
        raw = await asyncio.wait_for(
            _generate(
                system=SYNTHESIS_SYSTEM,
                user="Location data:\n" + json.dumps(payload, indent=2),
                max_tokens=700,
            ),
            timeout=22,
        )
    except Exception as exc:
        logger.warning("brief generation skipped: %s", exc or type(exc).__name__)
        return _fallback_brief(address, hazard_zone, wind, alerts, hotspots, incidents)
    parsed = _brief_from_model(raw)
    if parsed is not None:
        return parsed
    logger.warning("brief JSON unusable (%s chars); using local copy", len(raw))
    return _fallback_brief(address, hazard_zone, wind, alerts, hotspots, incidents)


_META_BRIEF = re.compile(
    r"\b(produce json|we need to|let'?s craft|return json only|guidelines:|"
    r"beats: hazard zone|could be \"|we can choose|we might want)\b",
    re.IGNORECASE,
)


def _brief_from_model(raw: str) -> tuple[str, str, list[BriefBeat]] | None:
    try:
        data = _extract_json(raw)
    except (json.JSONDecodeError, ValueError):
        return None
    headline = str(data.get("headline") or "").strip()
    beats: list[BriefBeat] = []
    for row in data.get("beats") or []:
        if not isinstance(row, dict):
            continue
        title = str(row.get("title") or "").strip()
        body = str(row.get("body") or "").strip()
        if title and body:
            beats.append(BriefBeat(title=title, body=body[:420]))
    if not headline or len(beats) < 3:
        return None
    blob = " ".join([headline, *(b.title + " " + b.body for b in beats)])
    if _META_BRIEF.search(blob) or any(len(b.body) > 500 for b in beats):
        return None
    brief = headline + "\n\n" + "\n\n".join(b.body for b in beats[:3])
    return brief, headline, beats[:3]


def _fallback_brief(
    address: str,
    hazard_zone: str,
    wind: Wind,
    alerts: list[Alert],
    hotspots: list[Hotspot],
    incidents: list[Incident],
) -> tuple[str, str, list[BriefBeat]]:
    street = address.split(",")[0].strip() if address else "This parcel"
    nearest = incidents[0] if incidents else None
    if nearest and nearest.miles is not None:
        headline = f"{street} is {nearest.miles} mi from the active {nearest.name}."
    elif hotspots and hotspots[0].miles is not None:
        headline = (
            f"{street}: FIRMS counted {len(hotspots)} hotspot(s) in 48h, "
            f"nearest {hotspots[0].miles} mi."
        )
    else:
        headline = f"{street}: live sources returned no nearby incident."
    beats = [
        BriefBeat(
            title="Hazard zone",
            body=f"CAL FIRE maps this coordinate as {hazard_zone}."
            if hazard_zone != "Unknown"
            else "This point is not inside a mapped Fire Hazard Severity Zone polygon.",
        ),
        BriefBeat(
            title="Nearby incident",
            body=(
                f"{nearest.name} is {nearest.miles} mi away"
                + (f" in {nearest.county} County." if nearest.county else ".")
            )
            if nearest and nearest.miles is not None
            else "CAL FIRE lists no active incidents in the current statewide feed.",
        ),
        BriefBeat(
            title="Wind and alerts",
            body=(
                f"NOAA wind is {wind.speed or 'unreported'}"
                + (f" {wind.direction}" if wind.direction else "")
                + (
                    f". Active alert: {alerts[0].event}."
                    if alerts
                    else ". No active NWS alerts at this point."
                )
                + (f" FIRMS counted {len(hotspots)} hotspots in 48h." if hotspots else "")
            ),
        ),
    ]
    brief = headline + "\n\n" + "\n\n".join(b.body for b in beats)
    return brief, headline, beats


def _fallback_checklist(
    *,
    address: str,
    hazard_zone: str,
    wind: Wind,
    alerts: list[Alert],
    hotspots: list[Hotspot],
    incidents: list[Incident],
    threat: ThreatAnchor | None = None,
    route_steps: list[str] | None = None,
    home_lat: float | None = None,
    home_lon: float | None = None,
) -> list[dict]:
    street = address.split(",")[0].strip() if address else "this parcel"
    if threat and threat.ring and home_lat is not None and home_lon is not None:
        return _proximity_checklist(
            street=street,
            threat=threat,
            route_steps=route_steps or [],
            alerts=alerts,
            hazard_zone=hazard_zone,
            home_lat=home_lat,
            home_lon=home_lon,
        )
    nearest = incidents[0] if incidents else None
    items: list[dict] = []
    if alerts:
        alert = alerts[0]
        items.append(
            {
                "item": f"Treat the {alert.event} at {street} as the official condition, not this brief.",
                "why": alert.headline or f"NOAA currently lists a {alert.event} at this point.",
                "focus": "now",
            },
        )
    if nearest and nearest.miles is not None:
        items.append(
            {
                "item": f"Watch {nearest.name} ({nearest.miles} mi) and local evacuation channels before you leave {street}.",
                "why": "CAL FIRE lists this as the nearest active incident to the parcel.",
                "focus": "now",
            },
        )
    else:
        items.append(
            {
                "item": f"Confirm local alerts for {street} before you assume the air and roads are quiet.",
                "why": "CAL FIRE lists no active incident in the current statewide feed for this point.",
                "focus": "now",
            },
        )
    if wind.speed:
        direction = f" from the {wind.direction}" if wind.direction else ""
        items.append(
            {
                "item": f"Do not mow or use spark-throwing tools at {street} while wind is {wind.speed}{direction}.",
                "why": "CAL FIRE says mow before 10 a.m. and never on a hot or windy day.",
                "focus": "today",
            },
        )
    if hotspots:
        miles = hotspots[0].miles
        miles_bit = f" as close as {miles} mi" if miles is not None else " within 50 mi"
        items.append(
            {
                "item": f"Keep a go-bag at {street} ready: 3-day food, 3 gallons of water per person, and two routes.",
                "why": f"NASA FIRMS shows {len(hotspots)} satellite hotspots in 48h{miles_bit}.",
                "focus": "today",
            },
        )
    if not any(row["focus"] == "today" for row in items):
        items.append(
            {
                "item": f"Pack a go-bag at {street}: 3-day food, 3 gallons of water per person, and two routes out.",
                "why": "Ready for Wildfire treats a go-bag as standard even when no hotspot is in the 48h window.",
                "focus": "today",
            },
        )
    zone_label = hazard_zone if hazard_zone != "Unknown" else "this"
    items.append(
        {
            "item": f"Keep 100 feet of defensible space on the {zone_label} hazard-zone lot at {street}, or to the property line.",
            "why": "CAL FIRE / PRC 4291 requires 100 feet of defensible space where it applies.",
            "focus": "property",
        },
    )
    items.append(
        {
            "item": f"Clear Zone 0 (0–5 feet) at {street}: hardscape, no combustible mulch, no firewood against the house.",
            "why": "Ready for Wildfire and CAL FIRE both treat the first five feet as the ember-resistant zone.",
            "focus": "property",
        },
    )
    return items[:7]


def _row(item: str, why: str, focus: str) -> dict:
    return {"item": item, "why": why, "focus": focus, "verified": True}


def _proximity_checklist(
    *,
    street: str,
    threat: ThreatAnchor,
    route_steps: list[str],
    alerts: list[Alert],
    hazard_zone: str,
    home_lat: float,
    home_lon: float,
) -> list[dict]:
    fire = threat.label
    miles = threat.miles
    immediate = threat.ring == "immediate"
    toward = initial_bearing_deg(home_lat, home_lon, threat.lat, threat.lon)
    heading = compass_point((toward + 180) % 360)
    ring_why = (
        f"{fire} is {miles} mi from {street}. Rings are distance from the incident point, "
        "not official evacuation zones. Local orders win."
    )
    route_why = (
        f"First driving steps away from {fire}, not an official evacuation route. "
        "If roads are closed, take the next open road in the same direction."
    )
    items: list[dict] = []
    if alerts:
        alert = alerts[0]
        items.append(
            _row(
                f"Treat the {alert.event} at {street} as the official condition if it conflicts with this list.",
                alert.headline or f"NOAA currently lists a {alert.event} at this point.",
                "now",
            ),
        )
    if immediate:
        items.append(
            _row(
                f"In the next hour, leave {street}. {fire} is {miles} mi away — this house is inside the 5-mile immediate area.",
                ring_why,
                "now",
            ),
        )
        if route_steps:
            items.append(_row(f"Go now: {route_steps[0]}.", route_why, "now"))
            if len(route_steps) > 1:
                follow = route_steps[1]
                if len(route_steps) > 2:
                    follow = f"{route_steps[1]}, then {route_steps[2]}"
                items.append(_row(f"Then {follow}.", route_why, "now"))
        else:
            items.append(
                _row(
                    f"Leave {street} heading {heading}, away from {fire}, and do not drive toward the smoke column.",
                    f"No road-by-road path could be drawn from this point. {ring_why}",
                    "now",
                ),
            )
        items.append(
            _row(
                f"Take people, pets, phones, medicines, and the go-bag from {street} as you walk out — not later today.",
                "Ready for Wildfire: a go-bag is for leaving, not for packing after the roads clog.",
                "today",
            ),
        )
        items.append(
            _row(
                f"If you cannot leave {street} this hour, stay in the most interior room, watch official channels, and leave the moment a road is open {heading}.",
                ring_why,
                "property",
            ),
        )
        return items[:7]

    items.append(
        _row(
            f"In the next 1–3 hours, be ready to leave {street}. {fire} is {miles} mi away — this house is inside the 15-mile elevated area.",
            ring_why,
            "now",
        ),
    )
    if route_steps:
        first = route_steps[0]
        follow = ""
        if len(route_steps) > 1:
            follow = f" Then {route_steps[1]}"
            if len(route_steps) > 2:
                follow += f", then {route_steps[2]}"
        items.append(
            _row(
                f"If you leave today, start from {street}: {first}.{follow}.",
                route_why,
                "today",
            ),
        )
    else:
        items.append(
            _row(
                f"If you leave today, drive {heading} away from {fire} and keep a second road in mind.",
                f"No road-by-road path could be drawn from this point. {ring_why}",
                "today",
            ),
        )
    items.append(
        _row(
            f"By this afternoon, stage a go-bag at the door of {street}: 3-day food, 3 gallons of water per person, people, pets, and meds.",
            "Ready for Wildfire treats a staged go-bag as the difference between leaving and getting stuck.",
            "today",
        ),
    )
    zone_label = hazard_zone if hazard_zone != "Unknown" else "this"
    items.append(
        _row(
            f"Keep 100 feet of defensible space on the {zone_label} hazard-zone lot at {street}, or to the property line.",
            "CAL FIRE / PRC 4291 requires 100 feet of defensible space where it applies.",
            "property",
        ),
    )
    return items[:7]


async def generate_checklist(
    *,
    address: str,
    hazard_zone: str,
    docs: list[KnowledgeDoc],
    wind: Wind,
    alerts: list[Alert],
    hotspots: list[Hotspot],
    incidents: list[Incident],
    lat: float,
    lon: float,
    threat: ThreatAnchor | None = None,
) -> list[dict]:
    route_steps: list[str] = []
    if threat and threat.ring:
        route_steps = await escape_steps(lat, lon, threat.lat, threat.lon)
        logger.info(
            "checklist proximity ring=%s fire=%s steps=%s",
            threat.ring,
            threat.label,
            len(route_steps),
        )
    else:
        logger.info("checklist using local parcel items")
    return _fallback_checklist(
        address=address,
        hazard_zone=hazard_zone,
        wind=wind,
        alerts=alerts,
        hotspots=hotspots,
        incidents=incidents,
        threat=threat,
        route_steps=route_steps,
        home_lat=lat,
        home_lon=lon,
    )


def verify_checklist(
    items: list[dict],
    docs: list[KnowledgeDoc],
    *,
    address: str,
    hazard_zone: str,
    wind: Wind,
    alerts: list[Alert],
    hotspots: list[Hotspot],
    incidents: list[Incident],
) -> list[ChecklistItem]:
    if not items:
        return []
    live = " ".join(
        [
            address,
            hazard_zone,
            wind.speed or "",
            wind.direction or "",
            " ".join(a.event or "" for a in alerts),
            " ".join(a.headline or "" for a in alerts),
            " ".join(i.name or "" for i in incidents),
            " ".join(str(i.miles or "") for i in incidents),
            str(len(hotspots)),
        ],
    ).lower()
    live_tokens = set(re.findall(r"[a-z0-9]{3,}", live))
    corpus = " ".join(d.body for d in docs).lower()
    guidance_tokens = set(re.findall(r"[a-z0-9]{4,}", corpus))
    skip = {
        "your", "from", "with", "that", "this", "have", "keep", "make", "into",
        "this", "parcel", "home", "house",
    }
    verified_items: list[ChecklistItem] = []
    for row in items:
        item = str(row.get("item") or "")
        words = [w for w in re.findall(r"[a-z0-9]{4,}", item.lower()) if w not in skip]
        guidance_hits = sum(1 for word in words if word in guidance_tokens)
        live_hits = sum(1 for word in re.findall(r"[a-z0-9]{3,}", item.lower()) if word in live_tokens)
        verified = bool(row.get("verified")) or guidance_hits >= 2 or live_hits >= 1
        verified_items.append(
            ChecklistItem(
                item=item,
                why=row.get("why"),
                focus=row.get("focus"),
                verified=verified,
            ),
        )
    return verified_items
