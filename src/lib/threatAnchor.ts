import type { AssessResponse } from '@/lib/assess'

export const THREAT_RADIUS_MILES = 75

export type ThreatAnchor = {
  kind: 'incident' | 'hotspot'
  lat: number
  lon: number
  miles: number
  label: string
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = 3958.8
  const p1 = (lat1 * Math.PI) / 180
  const p2 = (lat2 * Math.PI) / 180
  const dphi = ((lat2 - lat1) * Math.PI) / 180
  const dlmb = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dphi / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dlmb / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

function milesBetween(
  home: { lat: number; lon: number },
  lat: number,
  lon: number,
  reported?: number | null,
) {
  if (reported != null && Number.isFinite(reported)) return reported
  return haversineMiles(home.lat, home.lon, lat, lon)
}

export function pickThreatAnchor(
  data: Pick<AssessResponse, 'nearbyIncidents' | 'nearbyHotspots'>,
  home: { lat: number; lon: number },
): ThreatAnchor | null {
  for (const incident of data.nearbyIncidents) {
    if (incident.lat == null || incident.lon == null) continue
    if (incident.active === false) continue
    const miles = milesBetween(home, incident.lat, incident.lon, incident.miles)
    if (miles <= THREAT_RADIUS_MILES) {
      return {
        kind: 'incident',
        lat: incident.lat,
        lon: incident.lon,
        miles,
        label: incident.name,
      }
    }
  }

  let nearest: ThreatAnchor | null = null
  for (const hotspot of data.nearbyHotspots) {
    const miles = milesBetween(home, hotspot.lat, hotspot.lon, hotspot.miles)
    if (miles > THREAT_RADIUS_MILES) continue
    if (!nearest || miles < nearest.miles) {
      nearest = {
        kind: 'hotspot',
        lat: hotspot.lat,
        lon: hotspot.lon,
        miles,
        label: 'Satellite hotspot',
      }
    }
  }
  return nearest
}
