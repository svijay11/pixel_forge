from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

from .config import settings


@dataclass
class KnowledgeDoc:
    path: Path
    title: str
    source: str
    source_title: str
    zones: list[str]
    topic: str
    body: str

    def as_prompt_block(self) -> str:
        return (
            f"# {self.title}\n"
            f"Source: {self.source_title} ({self.source})\n"
            f"Zones: {', '.join(self.zones)} | Topic: {self.topic}\n\n"
            f"{self.body.strip()}\n"
        )


def _parse_doc(path: Path) -> KnowledgeDoc | None:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return None
    _, fm, body = text.split("---", 2)
    meta = yaml.safe_load(fm) or {}
    zones = meta.get("zones") or []
    if isinstance(zones, str):
        zones = [z.strip() for z in zones.split(",")]
    return KnowledgeDoc(
        path=path,
        title=str(meta.get("title") or path.stem),
        source=str(meta.get("source") or ""),
        source_title=str(meta.get("source_title") or ""),
        zones=[str(z) for z in zones],
        topic=str(meta.get("topic") or "defensible-space"),
        body=body.strip(),
    )


def load_docs() -> list[KnowledgeDoc]:
    docs: list[KnowledgeDoc] = []
    for path in sorted(settings.knowledge_dir.glob("*.md")):
        parsed = _parse_doc(path)
        if parsed:
            docs.append(parsed)
    return docs


def retrieve(hazard_zone: str, topics: list[str] | None = None) -> list[KnowledgeDoc]:
    topics = topics or ["defensible-space", "evacuation"]
    docs = load_docs()
    if hazard_zone in ("Unknown", ""):
        return [d for d in docs if d.topic in topics]
    matched = [
        d
        for d in docs
        if d.topic in topics and (hazard_zone in d.zones or "All" in d.zones)
    ]
    return matched or [d for d in docs if d.topic in topics]


def retrieve_for_parcel(
    hazard_zone: str,
    *,
    nearest_incident_miles: float | None,
    alert_events: list[str],
    hotspot_count: int,
) -> list[KnowledgeDoc]:
    """Pick a different guidance mix from live conditions, not a fixed statewide dump."""
    close_fire = nearest_incident_miles is not None and nearest_incident_miles <= 25
    watchful = nearest_incident_miles is not None and nearest_incident_miles <= 50
    fire_weather = any(
        any(token in event.lower() for token in ("fire", "red flag", "wind", "heat"))
        for event in alert_events
    )
    topics = ["defensible-space"]
    if close_fire or watchful or fire_weather or hotspot_count > 0:
        topics.append("evacuation")

    docs = retrieve(hazard_zone, topics)
    preferred: list[str] = []
    if close_fire:
        preferred.extend(
            ["go-bag", "evacuate-early", "pre-evacuation-actions", "wildfire-action-plan", "ready-set-go"],
        )
    elif watchful or hotspot_count > 0:
        preferred.extend(["go-bag", "wildfire-action-plan", "ready-set-go"])
    if fire_weather:
        preferred.extend(["mowing-dry-conditions", "pre-evacuation-actions"])
    if hazard_zone == "Very High":
        preferred.extend(
            ["zone-0-ember-resistant", "zone-0-calfire-dspace", "sale-inspection-high-very-high", "zone-0-legal-status"],
        )
    elif hazard_zone == "High":
        preferred.extend(["zone-0-ember-resistant", "zone-1-lean-clean-green", "sale-inspection-high-very-high"])
    else:
        preferred.extend(["zone-1-calfire-dspace", "zone-2-prc-4291", "local-ordinances", "plant-spacing"])

    by_stem = {d.path.stem: d for d in docs}
    ordered: list[KnowledgeDoc] = []
    seen: set[str] = set()
    for stem in preferred:
        doc = by_stem.get(stem)
        if doc and stem not in seen:
            ordered.append(doc)
            seen.add(stem)
    for doc in docs:
        if doc.path.stem not in seen:
            ordered.append(doc)
            seen.add(doc.path.stem)
    return ordered[:10]
