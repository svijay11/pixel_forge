export const HOTSPOTS = [
  { id: 'la', lng: -118.526, lat: 34.048, delayClass: '' },
  { id: 'bay', lng: -122.22, lat: 37.828, delayClass: 'hotspot-ring-delay-1' },
  { id: 'sb', lng: -119.828, lat: 34.436, delayClass: 'hotspot-ring-delay-2' },
] as const

export const CA_CENTER: [number, number] = [-119.4179, 36.7783]
export const CA_ZOOM = 5.85

export const AMBIENT_VIEWS = [
  { center: [-121.15, 37.35] as [number, number], zoom: 5.9 },
  { center: [-118.85, 35.15] as [number, number], zoom: 6.05 },
]
