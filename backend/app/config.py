import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")


class Settings:
    openrouter_api_key: str
    firms_map_key: str
    contact_email: str
    openrouter_model: str
    frontend_origin: str
    fhsz_path: Path
    knowledge_dir: Path

    def __init__(self) -> None:
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.firms_map_key = os.getenv("FIRMS_MAP_KEY", "")
        self.contact_email = os.getenv(
            "CONTACT_EMAIL",
            "ember-wildfire-copilot@example.com",
        )
        self.openrouter_model = os.getenv(
            "OPENROUTER_MODEL",
            "openai/gpt-oss-20b:free",
        )
        self.frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
        self.fhsz_path = Path(
            os.getenv("FHSZ_PATH", str(BACKEND_ROOT / "data" / "fhsz.geojson")),
        )
        self.knowledge_dir = BACKEND_ROOT / "knowledge"

    @property
    def noaa_user_agent(self) -> str:
        return f"ember-wildfire-copilot (contact: {self.contact_email})"


settings = Settings()
