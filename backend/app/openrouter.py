from __future__ import annotations

import asyncio
import json
import logging
import re
import time

import httpx

from .config import settings
from .knowledge import KnowledgeDoc
from .models import Alert, BriefBeat, ChecklistItem, Hotspot, Incident, Wind

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
- Return JSON only, no markdown:
{"headline": "one sentence unique to this address", "beats": [{"title": "short label", "body": "2-3 sentences"}]}
- 3 beats. Prefer titles drawn from the data (Hazard zone, Wind, Nearby incident, Alerts, Satellite hotspots).
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
    text = (content or "").strip()
    if text:
        return text
    reasoning = message.get("reasoning")
    if isinstance(reasoning, str) and reasoning.strip():
        return reasoning.strip()
    return ""


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
    try:
        data = _extract_json(raw)
        headline = str(data.get("headline") or "").strip()
        beats: list[BriefBeat] = []
        for row in data.get("beats") or []:
            if not isinstance(row, dict):
                continue
            title = str(row.get("title") or "").strip()
            body = str(row.get("body") or "").strip()
            if title and body:
                beats.append(BriefBeat(title=title, body=body))
        if headline and beats:
            brief = headline + "\n\n" + "\n\n".join(b.body for b in beats)
            return brief, headline, beats
    except (json.JSONDecodeError, ValueError):
        pass
    return raw, "", []


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
    headline = f"{street}: live sources are in for this point."
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
            else "CAL FIRE lists no active incidents within 50 miles.",
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
) -> list[dict]:
    street = address.split(",")[0].strip() if address else "this parcel"
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


async def generate_checklist(
    *,
    address: str,
    hazard_zone: str,
    docs: list[KnowledgeDoc],
    wind: Wind,
    alerts: list[Alert],
    hotspots: list[Hotspot],
    incidents: list[Incident],
) -> list[dict]:
    logger.info("checklist using local parcel items")
    return _fallback_checklist(
        address=address,
        hazard_zone=hazard_zone,
        wind=wind,
        alerts=alerts,
        hotspots=hotspots,
        incidents=incidents,
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
        verified = guidance_hits >= 2 or live_hits >= 1
        verified_items.append(
            ChecklistItem(
                item=item,
                why=row.get("why"),
                focus=row.get("focus"),
                verified=verified,
            ),
        )
    return verified_items
