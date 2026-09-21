"""Vercel Python entry. Re-exports the FastAPI app so /api/* hits Ember."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app

__all__ = ["app"]
