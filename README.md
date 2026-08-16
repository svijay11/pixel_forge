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
