from __future__ import annotations

import logging

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .hazard import load_hazard_index
from .models import AssessRequest, AssessResponse
from .pipeline import run_assess

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    index = load_hazard_index()
    logger.info("Hazard index ready (%s polygons)", len(index.geoms))
    yield


app = FastAPI(title="Ember wildfire copilot", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/assess", response_model=AssessResponse)
async def assess(body: AssessRequest) -> AssessResponse:
    if not (32.0 <= body.lat <= 42.5 and -125.0 <= body.lon <= -113.0):
        raise HTTPException(status_code=400, detail="Coordinates must be in California")
    try:
        return await run_assess(body.address, body.lat, body.lon)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("assess failed")
        raise HTTPException(status_code=502, detail=f"Assessment failed: {exc}") from exc
