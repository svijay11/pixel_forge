# Ember

Wildfire home-readiness copilot. Address search on `/app` posts coordinates to `POST /api/assess`; `/app/results` renders the brief and grounded checklist.

```bash
npm install
npm run dev
```

Backend (separate terminal):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill OPENROUTER_API_KEY and FIRMS_MAP_KEY
python scripts/download_fhsz.py
uvicorn app.main:app --reload --port 8000
```

Vite proxies `/api` to `http://127.0.0.1:8000`. The map uses Leaflet + OpenStreetMap (Carto dark tiles). Address lookup uses Nominatim, with Photon as a fallback.

Routes: `/` landing, `/app` address search, `/app/results` assessment.

## Deploy

The live site is **one URL** (UI + API). Vercel can host the frontend, but it cannot run FastAPI, hold the API keys, or wait long enough for `/api/assess`. Use Railway or Render with the repo `Dockerfile`.

**Do this once**

1. Commit and push (keep `.env` and `backend/data/*.geojson` out of git).
2. Create a Railway or Render web service from this GitHub repo. It will build the Dockerfile.
3. Add these environment variables on the host, copied from `backend/.env` — never put them in Vercel as `VITE_` values:

   - `OPENROUTER_API_KEY`
   - `FIRMS_MAP_KEY`
   - `OPENROUTESERVICE_API_KEY`

   `SERVE_FRONTEND=1` is already set in the image. You do not need `VITE_API_BASE` for this setup.
4. Assign a public domain. That URL is what judges open (`/`, `/app`, `/app/results` all work). Confirm `GET /health` returns `{"ok": true}`.

Railway is the better default: assess calls can take longer than Render’s free 30s request limit.

**Optional: Vercel for the UI only**

If you still want a `*.vercel.app` link, deploy this repo to Vercel as a Vite app and point it at the Railway/Render API:

1. In Vercel, set `VITE_API_BASE` to the backend origin (no trailing slash), e.g. `https://ember-production.up.railway.app`.
2. On the backend, set `FRONTEND_ORIGIN` to the Vercel origin, e.g. `https://your-app.vercel.app`.
3. Redeploy both. Judges can use the Vercel URL; `/api` calls go to the Python service.

Hazard-zone polygons (`backend/data/fhsz.geojson`) are optional in production. If they are missing, the brief still runs and `hazardZone` is `"Unknown"`.

Licensed under the [MIT License](LICENSE).
