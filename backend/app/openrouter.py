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
from .models import Alert, ChecklistItem, Hotspot, Incident, Wind

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
_LLM_LOCK = asyncio.Lock()

SYNTHESIS_SYSTEM = """You are Ember, a wildfire home-readiness copilot for California addresses.

Write a plain-language risk brief for this specific location using ONLY the structured data provided.
Rules:
- State only what the data supports. Do not speculate about fire spread, future weather, or outcomes.
- Do not invent distances, counts, or alerts that are not in the data.
- If a field is missing or empty, say that source returned no data.
- Do not give evacuation orders. Point people to official alerts and local authorities when alerts are present.
- Keep the brief to 3–6 short paragraphs. No markdown headings.
"""

CHECKLIST_SYSTEM = """You generate a home wildfire-readiness checklist for one California parcel.

You may use ONLY the retrieved Cal Fire / Ready for Wildfire guidance chunks below.
Rules:
- Every checklist item must be grounded in those chunks. Do not add advice that is not present there.
- Filter and prioritize items that match the parcel's hazard zone when the chunks mention zone differences.
- Do not predict fire behavior. Do not invent local ordinance details beyond what the chunks state.
- Return JSON only: {"items": [{"item": "imperative sentence..."}]}
- 8–12 concise, actionable items.
- Do not wrap the JSON in markdown fences.
"""


def _extract_json(text: str) -> dict:
    text = text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object in model response")
    return json.loads(match.group(0))


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
) -> str:
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
    }
    return await _generate(
        system=SYNTHESIS_SYSTEM,
        user="Location data:\n" + json.dumps(payload, indent=2),
        max_tokens=900,
    )


async def generate_checklist(
    *,
    address: str,
    hazard_zone: str,
    docs: list[KnowledgeDoc],
) -> list[str]:
    corpus = _corpus_blocks(docs)
    raw = await _generate(
        system=CHECKLIST_SYSTEM,
        user=(
            f"Parcel: {address}\nHazard zone: {hazard_zone}\n\n"
            f"Retrieved guidance:\n{corpus}"
        ),
        max_tokens=1200,
    )
    data = _extract_json(raw)
    items = data.get("items") or []
    out: list[str] = []
    for row in items:
        if isinstance(row, str):
            text = row.strip()
        elif isinstance(row, dict):
            text = str(row.get("item") or "").strip()
        else:
            continue
        if text:
            out.append(text)
    return out


def verify_checklist(items: list[str], docs: list[KnowledgeDoc]) -> list[ChecklistItem]:
    """Ground each item in retrieved chunks without a third model call."""
    if not items:
        return []
    corpus = " ".join(d.body for d in docs).lower()
    tokens = set(re.findall(r"[a-z0-9]{4,}", corpus))
    verified_items: list[ChecklistItem] = []
    for item in items:
        words = [w for w in re.findall(r"[a-z0-9]{4,}", item.lower()) if w not in {
            "your", "from", "with", "that", "this", "have", "keep", "make", "into",
        }]
        hits = sum(1 for word in words if word in tokens)
        verified = hits >= 2 or (bool(words) and hits / max(len(words), 1) >= 0.35)
        verified_items.append(ChecklistItem(item=item, verified=verified))
    return verified_items
