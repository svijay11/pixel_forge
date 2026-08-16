import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { useReducedMotion } from 'framer-motion'
import { AMBIENT_VIEWS, CA_CENTER, CA_ZOOM, HOTSPOTS } from '../data/hotspots'
import { applyNightSurveillanceStyle, formatCoord } from '../lib/mapStyle'

type MapBackgroundProps = {
  className?: string
  onCoordChange?: (label: string) => void
}

function createHotspotElement(delayClass: string, reduced: boolean) {
  const wrap = document.createElement('div')
  wrap.className = 'hotspot'
  wrap.setAttribute('aria-hidden', 'true')

  const core = document.createElement('span')
  core.className = 'hotspot-core'
  wrap.appendChild(core)

  if (!reduced) {
    const ring = document.createElement('span')
    ring.className = `hotspot-ring ${delayClass}`.trim()
    wrap.appendChild(ring)
  }

  return wrap
}

function FallbackFeed({ reduced }: { reduced: boolean }) {
  const positions = [
    { top: '62%', left: '38%' },
    { top: '28%', left: '22%' },
    { top: '58%', left: '32%' },
  ]

  return (
    <div className="absolute inset-0 bg-obsidian" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #141B22 1px, transparent 1px), linear-gradient(to bottom, #141B22 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {positions.map((pos, i) => (
        <div
          key={i}
          className="hotspot absolute"
          style={{ top: pos.top, left: pos.left }}
        >
          <span className="hotspot-core" />
          {!reduced && (
            <span
              className={`hotspot-ring ${i === 1 ? 'hotspot-ring-delay-1' : i === 2 ? 'hotspot-ring-delay-2' : ''}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function MapBackground({ className = '', onCoordChange }: MapBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion() === true
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

  useEffect(() => {
    onCoordChange?.(formatCoord(CA_CENTER[1], CA_CENTER[0]))
  }, [onCoordChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !token) return

    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/standard',
      center: CA_CENTER,
      zoom: CA_ZOOM,
      interactive: false,
      attributionControl: true,
      pitch: 0,
      bearing: 0,
      fadeDuration: reduced ? 0 : 300,
    })

    const markers: mapboxgl.Marker[] = []
    let cancelled = false
    let viewIndex = 0
    let panTimer = 0

    const flyTo = (index: number) => {
      const view = AMBIENT_VIEWS[index]
      map.easeTo({
        center: view.center,
        zoom: view.zoom,
        duration: 90000,
        easing: (t) => t,
      })
    }

    const schedulePan = () => {
      if (cancelled || reduced) return
      viewIndex = (viewIndex + 1) % AMBIENT_VIEWS.length
      flyTo(viewIndex)
      panTimer = window.setTimeout(schedulePan, 90000)
    }

    map.on('load', () => {
      if (cancelled) return
      applyNightSurveillanceStyle(map)

      for (const spot of HOTSPOTS) {
        const marker = new mapboxgl.Marker({
          element: createHotspotElement(spot.delayClass, reduced),
          anchor: 'center',
        })
          .setLngLat([spot.lng, spot.lat])
          .addTo(map)
        markers.push(marker)
      }

      if (!reduced) {
        flyTo(0)
        panTimer = window.setTimeout(schedulePan, 90000)
      }
    })

    map.on('move', () => {
      const c = map.getCenter()
      onCoordChange?.(formatCoord(c.lat, c.lng))
    })

    const resize = () => map.resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    window.addEventListener('resize', resize)

    return () => {
      cancelled = true
      window.clearTimeout(panTimer)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      for (const marker of markers) marker.remove()
      map.remove()
    }
  }, [token, reduced, onCoordChange])

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {token ? (
        <div ref={containerRef} className="absolute inset-0" />
      ) : (
        <FallbackFeed reduced={reduced} />
      )}
      <div className="pointer-events-none absolute inset-0 bg-obsidian/20 mix-blend-multiply" />
    </div>
  )
}
