# Ember backend

FastAPI service for `POST /api/assess`.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill OPENROUTER_API_KEY and FIRMS_MAP_KEY
python scripts/download_fhsz.py
uvicorn app.main:app --reload --port 8000
```

The Vite app proxies `/api` to this server. Python 3.11+ is preferred; the code also runs on 3.9.

Copy `.env.example` to `.env` and fill `OPENROUTER_API_KEY` (required for briefs/checklists) and `FIRMS_MAP_KEY` (required for satellite hotspots). NOAA weather.gov needs no key. The default model is `openai/gpt-oss-20b:free` via OpenRouter (`deepseek/deepseek-r1:free` is no longer offered as a free slug).

## Hazard zones

`python scripts/download_fhsz.py` writes `data/fhsz.geojson` from CAL FIRE Forestry ArcGIS layers (LRA 2025 + SRA 2024). That file is loaded at startup for point-in-polygon lookup. It is not committed (large). If the file is missing, `hazardZone` is `"Unknown"` and retrieval uses the full knowledge set.

## Knowledge base

Markdown in `knowledge/` is copied from current Cal Fire / Ready for Wildfire pages (fetched 2026-08-16). Retrieval is tag filter by hazard zone + topic (`defensible-space` | `evacuation`), not embeddings.

Pages that 404'd and were not used as substitutes:

- https://www.readyforwildfire.org/prepare-for-wildfire/get-ready/defensible-space/
- https://www.fire.ca.gov/what-we-do/fire-prevention-education-and-planning/defensible-space
- https://www.readyforwildfire.org/prepare-for-wildfire/harden-your-home (live URL is `/hardening-your-home`)
- https://www.readyforwildfire.org/prepare-for-wildfire/ready-set-go
- https://www.fire.ca.gov/prepare/home-hardening
