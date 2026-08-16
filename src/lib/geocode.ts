import { OpenStreetMapProvider } from 'leaflet-geosearch'

export type AddressSuggestion = {
  id: string
  line1: string
  line2: string
  lat: number
  lng: number
}

const CA_BBOX = {
  minLat: 32.5,
  maxLat: 42.05,
  minLng: -124.55,
  maxLng: -114.05,
}

const osmProvider = new OpenStreetMapProvider({
  params: {
    'accept-language': 'en',
    countrycodes: 'us',
    addressdetails: 1,
    limit: 8,
    viewbox: '-124.48,42.01,-114.13,32.53',
    bounded: 0,
  },
})

type PhotonHit = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    osm_id?: number
    osm_type?: string
    name?: string
    housenumber?: string
    street?: string
    district?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
    type?: string
  }
}

function inCalifornia(lat: number, lng: number, state?: string) {
  if (state && /california|^ca$/i.test(state.trim())) return true
  return (
    lat >= CA_BBOX.minLat &&
    lat <= CA_BBOX.maxLat &&
    lng >= CA_BBOX.minLng &&
    lng <= CA_BBOX.maxLng
  )
}

function splitLabel(label: string): { line1: string; line2: string } {
  const parts = label
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return { line1: label, line2: '' }
  if (parts.length === 1) return { line1: parts[0], line2: 'California' }
  return { line1: parts[0], line2: parts.slice(1).join(', ') }
}

function parsePhoton(hit: PhotonHit): AddressSuggestion | null {
  const p = hit.properties ?? {}
  const [lng, lat] = hit.geometry?.coordinates ?? []
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  if (!inCalifornia(lat, lng, p.state)) return null

  const street = [p.housenumber, p.street].filter(Boolean).join(' ')
  const line1 = street || p.name || p.district || p.city || 'California'
  const line2 = [p.city && street ? p.city : null, 'CA', p.postcode]
    .filter(Boolean)
    .join(', ')

  return {
    id: `photon-${p.osm_type ?? 'n'}-${p.osm_id ?? `${lat}-${lng}`}`,
    line1,
    line2: line2 || 'California',
    lat,
    lng,
  }
}

async function searchPhoton(query: string): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '8',
    lang: 'en',
    lat: '36.7783',
    lon: '-119.4179',
  })
  const res = await fetch(`https://photon.komoot.io/api/?${params}`)
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  const data = (await res.json()) as { features?: PhotonHit[] }
  return (data.features ?? [])
    .map(parsePhoton)
    .filter((item): item is AddressSuggestion => item !== null)
}

async function searchOsm(query: string): Promise<AddressSuggestion[]> {
  const biased = /california|\bca\b/i.test(query) ? query : `${query}, California`
  const results = await osmProvider.search({ query: biased })
  return results.flatMap((result, index) => {
    const lat = result.y
    const lng = result.x
    if (!inCalifornia(lat, lng)) return []
    const { line1, line2 } = splitLabel(result.label)
    return [
      {
        id: `osm-${result.raw?.place_id ?? `${lng}-${lat}-${index}`}`,
        line1,
        line2,
        lat,
        lng,
      },
    ]
  })
}

function dedupe(items: AddressSuggestion[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.line1.toLowerCase()}|${item.lat.toFixed(4)}|${item.lng.toFixed(4)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const settled = await Promise.allSettled([searchPhoton(q), searchOsm(q)])
  const merged: AddressSuggestion[] = []
  for (const result of settled) {
    if (result.status === 'fulfilled') merged.push(...result.value)
  }
  return dedupe(merged).slice(0, 8)
}
