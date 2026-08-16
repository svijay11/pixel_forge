from __future__ import annotations

import logging

import httpx

from .config import settings
from .models import Alert, Wind

logger = logging.getLogger(__name__)

POINTS_URL = "https://api.weather.gov/points/{lat},{lon}"
ALERTS_URL = "https://api.weather.gov/alerts/active"


async def fetch_weather(client: httpx.AsyncClient, lat: float, lon: float) -> tuple[Wind, list[Alert]]:
    headers = {
        "User-Agent": settings.noaa_user_agent,
        "Accept": "application/geo+json",
    }
    wind = Wind()
    alerts: list[Alert] = []

    try:
        point = await client.get(
            POINTS_URL.format(lat=f"{lat:.4f}", lon=f"{lon:.4f}"),
            headers=headers,
            timeout=20,
        )
        point.raise_for_status()
        props = point.json().get("properties") or {}
        forecast_url = props.get("forecastHourly") or props.get("forecast")
        if forecast_url:
            forecast = await client.get(forecast_url, headers=headers, timeout=20)
            forecast.raise_for_status()
            periods = (forecast.json().get("properties") or {}).get("periods") or []
            if periods:
                current = periods[0]
                wind = Wind(
                    speed=current.get("windSpeed"),
                    direction=current.get("windDirection"),
                )
    except httpx.HTTPError as exc:
        logger.warning("NOAA forecast failed: %s", exc)

    try:
        alert_res = await client.get(
            ALERTS_URL,
            params={"point": f"{lat:.4f},{lon:.4f}"},
            headers=headers,
            timeout=20,
        )
        alert_res.raise_for_status()
        for feature in alert_res.json().get("features") or []:
            p = feature.get("properties") or {}
            alerts.append(
                Alert(
                    event=p.get("event") or "Alert",
                    headline=p.get("headline"),
                    severity=p.get("severity"),
                    description=(p.get("description") or "")[:1200] or None,
                ),
            )
    except httpx.HTTPError as exc:
        logger.warning("NOAA alerts failed: %s", exc)

    return wind, alerts[:12]
