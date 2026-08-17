import bearing from '@turf/bearing'
import destination from '@turf/destination'

const ESCAPE_MILES = 40

export function escapeDestination(
  home: { lat: number; lon: number },
  threat: { lat: number; lon: number },
) {
  const toward = bearing([home.lon, home.lat], [threat.lon, threat.lat])
  const away = toward + 180
  const point = destination([home.lon, home.lat], ESCAPE_MILES, away, {
    units: 'miles',
  })
  const [lon, lat] = point.geometry.coordinates
  return { lat, lon, bearingAway: away }
}

export async function fetchDrivingRoute(
  home: { lat: number; lon: number },
  dest: { lat: number; lon: number },
): Promise<GeoJSON.LineString | null> {
  try {
    const res = await fetch('/api/escape-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startLat: home.lat,
        startLon: home.lon,
        endLat: dest.lat,
        endLon: dest.lon,
      }),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { geometry?: GeoJSON.LineString | null }
    if (!body.geometry || body.geometry.type !== 'LineString') return null
    return body.geometry
  } catch {
    return null
  }
}
