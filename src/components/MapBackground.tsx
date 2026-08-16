import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useReducedMotion } from 'framer-motion'
import { AMBIENT_VIEWS, CA_CENTER, CA_ZOOM, HOTSPOTS } from '../data/hotspots'
import { formatCoord } from '../lib/mapStyle'

type MapBackgroundProps = {
  className?: string
  onCoordChange?: (label: string) => void
}

function createHotspotIcon(delayClass: string, reduced: boolean) {
  const ring = reduced ? '' : `<span class="hotspot-ring ${delayClass}"></span>`
  return L.divIcon({
    className: 'hotspot-icon',
    html: `<div class="hotspot" aria-hidden="true"><span class="hotspot-core"></span>${ring}</div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

export function MapBackground({ className = '', onCoordChange }: MapBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion() === true

  useEffect(() => {
    onCoordChange?.(formatCoord(CA_CENTER[1], CA_CENTER[0]))
  }, [onCoordChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = L.map(container, {
      center: [CA_CENTER[1], CA_CENTER[0]],
      zoom: CA_ZOOM,
      zoomControl: false,
      attributionControl: true,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    const markers = HOTSPOTS.map((spot) =>
      L.marker([spot.lat, spot.lng], {
        icon: createHotspotIcon(spot.delayClass, reduced),
        interactive: false,
        keyboard: false,
      }).addTo(map),
    )

    let cancelled = false
    let viewIndex = 0
    let panTimer = 0

    const flyTo = (index: number) => {
      const view = AMBIENT_VIEWS[index]
      map.flyTo([view.center[1], view.center[0]], view.zoom, {
        duration: reduced ? 0 : 90,
        easeLinearity: 1,
        animate: !reduced,
      })
    }

    const schedulePan = () => {
      if (cancelled || reduced) return
      viewIndex = (viewIndex + 1) % AMBIENT_VIEWS.length
      flyTo(viewIndex)
      panTimer = window.setTimeout(schedulePan, 90000)
    }

    map.on('move', () => {
      const c = map.getCenter()
      onCoordChange?.(formatCoord(c.lat, c.lng))
    })

    const resize = () => map.invalidateSize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    window.addEventListener('resize', resize)
    requestAnimationFrame(resize)

    if (!reduced) {
      flyTo(0)
      panTimer = window.setTimeout(schedulePan, 90000)
    }

    return () => {
      cancelled = true
      window.clearTimeout(panTimer)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      for (const marker of markers) marker.remove()
      map.remove()
    }
  }, [reduced, onCoordChange])

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-obsidian/20 mix-blend-multiply" />
    </div>
  )
}
