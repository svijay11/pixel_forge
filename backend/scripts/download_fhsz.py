"""Download CAL FIRE Fire Hazard Severity Zone polygons as GeoJSON.

Sources (ArcGIS FeatureServer GeoJSON, fetched once for local lookup):
  LRA 2025: FHSALRA25_v1_All
  SRA 2024: FHSZ SRA layer on the same CAL FIRE Forestry org
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "fhsz.geojson"

LAYERS = [
    {
        "name": "LRA 2025",
        "url": "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/FHSALRA25_v1_All/FeatureServer/0/query",
        "fields": "FHSZ,FHSZ_Description,SRA",
    },
    {
        "name": "SRA 2024",
        "url": "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/fhsz24_1/FeatureServer/0/query",
        "fields": "FHSZ,FHSZ_Description,SRA",
    },
]


def fetch_layer(client: httpx.Client, url: str, fields: str) -> list[dict]:
    features: list[dict] = []
    offset = 0
    page = 2000
    while True:
        params = {
            "where": "1=1",
            "outFields": fields,
            "returnGeometry": "true",
            "outSR": "4326",
            "f": "geojson",
            "resultOffset": offset,
            "resultRecordCount": page,
            "maxAllowableOffset": "0.0003",
            "geometryPrecision": "5",
        }
        print(f"  offset={offset} …", flush=True)
        res = client.get(url, params=params, timeout=120)
        if res.status_code >= 400:
            print(f"  skip ({res.status_code}): {res.text[:200]}")
            return features
        data = res.json()
        if "error" in data:
            print(f"  skip error: {data['error']}")
            return features
        batch = data.get("features") or []
        features.extend(batch)
        if len(batch) < page or not data.get("exceededTransferLimit"):
            if len(batch) < page:
                break
            offset += page
            continue
        offset += page
    return features


def main() -> int:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    all_features: list[dict] = []
    with httpx.Client(follow_redirects=True) as client:
        for layer in LAYERS:
            print(f"Fetching {layer['name']}")
            try:
                batch = fetch_layer(client, layer["url"], layer["fields"])
            except httpx.HTTPError as exc:
                print(f"  failed: {exc}")
                continue
            print(f"  got {len(batch)} features")
            all_features.extend(batch)

    if not all_features:
        print("No features downloaded.", file=sys.stderr)
        return 1

    geojson = {"type": "FeatureCollection", "features": all_features}
    OUT.write_text(json.dumps(geojson))
    size_mb = OUT.stat().st_size / 1_000_000
    print(f"Wrote {len(all_features)} features to {OUT} ({size_mb:.1f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
