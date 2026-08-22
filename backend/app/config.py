from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")


class Settings:
    openrouter_api_key: str
    firms_map_key: str
    openrouteservice_api_key: str
    contact_email: str
    openrouter_model: str
    frontend_origin: str
    serve_frontend: bool
    fhsz_path: Path
    knowledge_dir: Path

    def __init__(self) -> None:
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.firms_map_key = os.getenv("FIRMS_MAP_KEY", "")
        self.openrouteservice_api_key = os.getenv("OPENROUTESERVICE_API_KEY", "")
        self.contact_email = os.getenv(
            "CONTACT_EMAIL",
            "ember-wildfire-copilot@example.com",
        )
        self.openrouter_model = os.getenv(
            "OPENROUTER_MODEL",
            "openai/gpt-oss-20b:free",
        )
        self.frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
        self.serve_frontend = os.getenv("SERVE_FRONTEND", "0").strip().lower() in {
            "1",
            "true",
            "yes",
        }
        self.fhsz_path = Path(
            os.getenv("FHSZ_PATH", str(BACKEND_ROOT / "data" / "fhsz.geojson")),
        )
        self.knowledge_dir = BACKEND_ROOT / "knowledge"

    @property
    def cors_origins(self) -> list[str]:
        origins = [item.strip() for item in self.frontend_origin.split(",") if item.strip()]
        for origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
            if origin not in origins:
                origins.append(origin)
        return origins

    @property
    def noaa_user_agent(self) -> str:
        return f"ember-wildfire-copilot (contact: {self.contact_email})"


settings = Settings()
