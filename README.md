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

## Deploy (Vercel)

The Vite UI and FastAPI now deploy together. `/api/assess` and `/api/escape-route` run as a Python function; everything else is the static site.

1. In the Vercel project → Settings → Environment Variables, add these **without** a `VITE_` prefix (Production + Preview):

   - `OPENROUTER_API_KEY`
   - `FIRMS_MAP_KEY`
   - `OPENROUTESERVICE_API_KEY`

2. Redeploy. Confirm `https://your-app.vercel.app/api/health` returns `{"ok": true}`.
3. Hobby plans cap functions at about 10s (Pro up to 60s). If a brief times out, Vercel will 504; retry once, or upgrade the plan.

Do not commit `.env` or `backend/data/*.geojson`. Without the hazard file, `hazardZone` is `"Unknown"` and the rest of the brief still runs.

Licensed under the [MIT License](LICENSE).
