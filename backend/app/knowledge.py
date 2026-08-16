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
