export type AddressSuggestion = {
  id: string
  line1: string
  line2: string
  lat?: number
  lng?: number
}

type NominatimHit = {
  place_id: number
  lat: string
  lon: string
  display_name: string
  address?: {
    house_number?: string
    road?: string
    city?: string
    town?: string
    village?: string
    hamlet?: string
    county?: string
    state?: string
    postcode?: string
  }
}

type PhotonHit = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    osm_id?: number
    name?: string
    housenumber?: string
    street?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
  }
}

function lineFromParts(street: string, place: string) {
  return {
    line1: street || place,
    line2: street ? place : '',
  }
}

function isCalifornia(state?: string) {
  if (!state) return true
  const s = state.toLowerCase()
  return s === 'california' || s === 'ca'
}

function parseNominatim(hit: NominatimHit): AddressSuggestion | null {
  const addr = hit.address ?? {}
  if (!isCalifornia(addr.state)) return null
  const street = [addr.house_number, addr.road].filter(Boolean).join(' ')
  const city = addr.city || addr.town || addr.village || addr.hamlet || addr.county || 'California'
  const place = [city, 'CA', addr.postcode].filter(Boolean).join(', ')
  const lines = lineFromParts(street, place)
  return {
    id: `osm-${hit.place_id}`,
    line1: lines.line1,
    line2: lines.line2 || hit.display_name,
    lat: Number(hit.lat),
    lng: Number(hit.lon),
  }
}

function parsePhoton(hit: PhotonHit): AddressSuggestion | null {
  const p = hit.properties ?? {}
  if (!isCalifornia(p.state)) return null
  const street = [p.housenumber, p.street || p.name].filter(Boolean).join(' ')
  const city = p.city || 'California'
  const place = [city, 'CA', p.postcode].filter(Boolean).join(', ')
  const lines = lineFromParts(street, place)
  const [lng, lat] = hit.geometry?.coordinates ?? []
  return {
    id: `photon-${p.osm_id ?? `${lat}-${lng}`}`,
    line1: lines.line1,
    line2: lines.line2,
    lat,
    lng,
  }
}

async function searchNominatim(query: string): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    addressdetails: '1',
    limit: '6',
    countrycodes: 'us',
    viewbox: '-124.5,42.0,-114.1,32.5',
    bounded: '0',
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const data = (await res.json()) as NominatimHit[]
  return data.map(parseNominatim).filter((item): item is AddressSuggestion => item !== null)
}

async function searchPhoton(query: string): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '6',
    lat: '36.7783',
    lon: '-119.4179',
    lang: 'en',
  })
  const res = await fetch(`https://photon.komoot.io/api/?${params}`)
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  const data = (await res.json()) as { features?: PhotonHit[] }
  return (data.features ?? [])
    .map(parsePhoton)
    .filter((item): item is AddressSuggestion => item !== null)
}

export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  const q = query.trim()
  if (q.length < 3) return []
  try {
    const nominatim = await searchNominatim(q)
    if (nominatim.length > 0) return nominatim
  } catch {
    // Nominatim rate-limits or blocks some browsers; Photon is the OSM fallback.
  }
  return searchPhoton(q)
}
