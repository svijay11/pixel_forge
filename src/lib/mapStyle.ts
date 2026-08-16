import type { Map as MapboxMap } from 'mapbox-gl'

export function applyNightSurveillanceStyle(map: MapboxMap) {
  try {
    map.setConfigProperty('basemap', 'lightPreset', 'night')
    map.setConfigProperty('basemap', 'showPointOfInterestLabels', false)
    map.setConfigProperty('basemap', 'showRoadLabels', false)
    map.setConfigProperty('basemap', 'showTransitLabels', false)
    map.setConfigProperty('basemap', 'show3dObjects', false)
  } catch {
    recolorClassicDarkStyle(map)
  }

  try {
    map.setFog({
      color: '#0B0F14',
      'high-color': '#141B22',
      'horizon-blend': 0.06,
      'space-color': '#05080C',
      'star-intensity': 0.12,
    })
  } catch {
    // Fog is unavailable on some projections/styles.
  }
}

function recolorClassicDarkStyle(map: MapboxMap) {
  const layers = map.getStyle()?.layers ?? []

  for (const layer of layers) {
    const { id, type } = layer
    try {
      if (type === 'background') {
        map.setPaintProperty(id, 'background-color', '#0B0F14')
      }
      if (type === 'fill') {
        if (id.includes('water')) {
          map.setPaintProperty(id, 'fill-color', '#0A1016')
        } else if (
          id.includes('park') ||
          id.includes('landuse') ||
          id.includes('national-park')
        ) {
          map.setPaintProperty(id, 'fill-color', '#101820')
        } else if (id.includes('building')) {
          map.setPaintProperty(id, 'fill-color', '#1A232C')
          map.setPaintProperty(id, 'fill-opacity', 0.45)
        }
      }
      if (type === 'line') {
        if (id.includes('water')) {
          map.setPaintProperty(id, 'line-color', '#0A1016')
        } else if (id.includes('road') || id.includes('bridge') || id.includes('tunnel')) {
          map.setPaintProperty(id, 'line-color', '#1E2A33')
          map.setPaintProperty(id, 'line-opacity', 0.35)
        } else if (id.includes('admin') || id.includes('boundary')) {
          map.setPaintProperty(id, 'line-color', '#2A3540')
        }
      }
      if (type === 'symbol') {
        map.setPaintProperty(id, 'text-color', '#8B93A0')
        map.setPaintProperty(id, 'text-halo-color', '#0B0F14')
        map.setPaintProperty(id, 'text-halo-width', 1.1)
        if (id.includes('road') || id.includes('poi')) {
          map.setLayoutProperty(id, 'visibility', 'none')
        }
      }
    } catch {
      // Layer-specific paint props vary; skip anything this style doesn't support.
    }
  }
}

export function formatCoord(lat: number, lng: number) {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}°${ns}  ${Math.abs(lng).toFixed(4)}°${ew}`
}
