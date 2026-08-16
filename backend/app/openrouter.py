from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from typing import Optional

import httpx

from .config import settings
from .knowledge import KnowledgeDoc
from .models import Alert, BriefBeat, ChecklistItem, Hotspot, Incident, Wind

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
_LLM_LOCK = asyncio.Lock()

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

CHECKLIST_SYSTEM = """You generate a wildfire-readiness checklist for ONE California parcel at one moment in time.

You may use Cal Fire / Ready for Wildfire chunks as the legal/safety HOW.
You MUST instantiate every item with THIS parcel's live situation (address, zone, wind, alerts, named incidents and miles, hotspot distances).
Rules:
- Do not output a generic statewide list. If wind, alerts, or nearby fires differ, the items must differ.
- Name real local facts in the item text: incident names, miles, wind speed/direction, alert event names, city/street from the address, hazard zone.
- The HOW (clearance distances, go-bag contents, Zone 0/1/2 actions) must come from the retrieved chunks. Do not invent distances or legal requirements.
- Do not predict fire spread. Do not issue evacuation orders.
- Return JSON only, no markdown fences.
- Keep each item and why under 140 characters so the JSON stays valid and complete.
- 6 items. Mix focus values. Lead with "now" if there is an alert or an incident within 25 miles.
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


def _corpus_blocks(docs: list[KnowledgeDoc], limit: int = 8) -> str:
    blocks = []
    for doc in docs[:limit]:
        block = doc.as_prompt_block()
        if len(block) > 1400:
            block = block[:1400].rstrip() + "\n…"
        blocks.append(block)
    return "\n\n---\n\n".join(blocks) or "No retrieved documents."


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
    }
    delay = 4.0
    last_error: Optional[Exception] = None
    async with _LLM_LOCK:
        async with httpx.AsyncClient(timeout=45.0) as client:
            for attempt in range(3):
                started = time.monotonic()
                try:
                    response = await client.post(OPENROUTER_URL, headers=headers, json=body)
                    if response.status_code == 429:
                        raise httpx.HTTPStatusError(
                            "rate limited",
                            request=response.request,
                            response=response,
                        )
                    response.raise_for_status()
                    text = _message_text(response.json())
                    logger.info(
                        "OpenRouter ok in %.1fs (%s chars)",
                        time.monotonic() - started,
                        len(text),
                    )
                    if not text:
                        raise RuntimeError("OpenRouter returned an empty response")
                    return text
                except httpx.HTTPStatusError as exc:
                    last_error = exc
                    status = exc.response.status_code if exc.response is not None else 0
                    detail = ""
                    if exc.response is not None:
                        try:
                            err = exc.response.json().get("error") or {}
                            detail = err.get("message") or exc.response.text[:300]
                        except Exception:
                            detail = (exc.response.text or "")[:300]
                    if status not in (429, 502, 503) or attempt == 2:
                        raise RuntimeError(
                            f"OpenRouter request failed ({status}): {detail or exc}",
                        ) from exc
                    logger.warning("OpenRouter %s, retrying in %.0fs", status, delay)
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, 20)
                except httpx.HTTPError as exc:
                    last_error = exc
                    if attempt == 2:
                        raise RuntimeError(f"OpenRouter request failed: {exc}") from exc
                    logger.warning("OpenRouter transport error, retrying in %.0fs", delay)
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, 20)
    raise RuntimeError("OpenRouter request failed after retries") from last_error


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
    raw = await _generate(
        system=SYNTHESIS_SYSTEM,
        user="Location data:\n" + json.dumps(payload, indent=2),
        max_tokens=1100,
    )
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
    corpus = _corpus_blocks(docs)
    situation = {
        "address": address,
        "hazardZone": hazard_zone,
        "wind": wind.model_dump(),
        "alerts": [a.model_dump() for a in alerts[:6]],
        "nearestIncidents": [
            {"name": i.name, "county": i.county, "miles": i.miles, "acres": i.acres}
            for i in incidents[:5]
        ],
        "hotspotCount48h": len(hotspots),
        "closestHotspotMiles": hotspots[0].miles if hotspots else None,
    }
    raw = await _generate(
        system=CHECKLIST_SYSTEM,
        user=(
            "Live situation for this parcel (must appear in the items):\n"
            f"{json.dumps(situation, indent=2)}\n\n"
            f"Retrieved Cal Fire / Ready for Wildfire guidance:\n{corpus}"
        ),
        max_tokens=2200,
    )
    try:
        data = _extract_json(raw)
        items = data.get("items") or []
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("checklist JSON parse failed (%s); using local fallback", exc)
        return _fallback_checklist(
            address=address,
            hazard_zone=hazard_zone,
            wind=wind,
            alerts=alerts,
            hotspots=hotspots,
            incidents=incidents,
        )
    out: list[dict] = []
    for row in items:
        if isinstance(row, str):
            text = row.strip()
            why = None
            focus = None
        elif isinstance(row, dict):
            text = str(row.get("item") or "").strip()
            why = str(row.get("why") or "").strip() or None
            focus = str(row.get("focus") or "").strip().lower() or None
            if focus not in ("now", "today", "property"):
                focus = None
        else:
            continue
        if text:
            out.append({"item": text, "why": why, "focus": focus})
    return out or _fallback_checklist(
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
