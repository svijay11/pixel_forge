from __future__ import annotations

import logging

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import BACKEND_ROOT, settings
from .hazard import load_hazard_index
from .models import AssessRequest, AssessResponse, EscapeRouteRequest, EscapeRouteResponse
from .ors import driving_route
from .pipeline import run_assess

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DIST_DIR = BACKEND_ROOT.parent / "dist"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    index = load_hazard_index()
    logger.info("Hazard index ready (%s polygons)", len(index.geoms))
    yield


app = FastAPI(title="Ember wildfire copilot", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get("/api/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/escape-route", response_model=EscapeRouteResponse)
async def escape_route(body: EscapeRouteRequest) -> EscapeRouteResponse:
    if not (32.0 <= body.startLat <= 42.5 and -125.0 <= body.startLon <= -113.0):
        raise HTTPException(status_code=400, detail="Start coordinates must be in California")
    if not (31.0 <= body.endLat <= 43.5 and -126.5 <= body.endLon <= -112.0):
        raise HTTPException(status_code=400, detail="Route destination is out of range")
    geometry = await driving_route(body.startLon, body.startLat, body.endLon, body.endLat)
    return EscapeRouteResponse(geometry=geometry)


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


def _mount_frontend() -> None:
    if not settings.serve_frontend or not DIST_DIR.exists():
        return
    assets = DIST_DIR / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        if full_path.startswith("api/") or full_path in {"health", "docs", "openapi.json", "redoc"}:
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = DIST_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        index = DIST_DIR / "index.html"
        if not index.is_file():
            raise HTTPException(status_code=404, detail="Frontend build missing")
        return FileResponse(index)


_mount_frontend()
