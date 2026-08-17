import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import bbox from '@turf/bbox'
import circle from '@turf/circle'
import { X, House, Flame } from 'lucide-react'
import type { ThreatAnchor } from '@/lib/threatAnchor'
import { escapeDestination, fetchDrivingRoute } from '@/lib/escapeRoute'

const RING_MONITOR = '#6E9B6B'
const RING_ELEVATED = '#FF7A3D'
const RING_IMMEDIATE = '#D93A2B'
const ROUTE_RED = '#D93A2B'

function ringStyle(color: string, opacity: number): L.PathOptions {
  return {
    color,
    weight: 1.2,
    opacity: 0.7,
    fillColor: color,
    fillOpacity: opacity,
    interactive: false,
  }
}

function divIcon(html: string, className: string, size: [number, number], anchor: [number, number]) {
  return L.divIcon({
    className,
    html,
    iconSize: size,
    iconAnchor: anchor,
  })
}

export function ThreatMapPanel({
  open,
  onClose,
  home,
  threatAnchor,
}: {
  open: boolean
  onClose: () => void
  home: { lat: number; lon: number }
  threatAnchor: ThreatAnchor | null
}) {
  const mapNode = useRef<HTMLDivElement>(null)
  const [routeMissing, setRouteMissing] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open || !mapNode.current) return
    setRouteMissing(false)

    const map = L.map(mapNode.current, {
      center: [home.lat, home.lon],
      zoom: 9,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    map.createPane('threat-rings')
    map.createPane('threat-route')
    const ringPane = map.getPane('threat-rings')
    const routePane = map.getPane('threat-route')
    if (ringPane) ringPane.style.zIndex = '410'
    if (routePane) routePane.style.zIndex = '450'

    const homeMarker = L.marker([home.lat, home.lon], {
      icon: divIcon(
        '<span class="threat-home-mark" title="This address"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#171717" stroke-width="2.2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/></svg></span>',
        'threat-home-wrap',
        [32, 32],
        [16, 32],
      ),
      keyboard: false,
    })
      .bindPopup('This address')
      .addTo(map)

    const layers: L.Layer[] = [homeMarker]
    let cancelled = false

    const run = async () => {
      map.invalidateSize()
      if (!threatAnchor) {
        map.setView([home.lat, home.lon], 11)
        return
      }

      const center: [number, number] = [threatAnchor.lon, threatAnchor.lat]
      const monitor = circle(center, 30, { steps: 72, units: 'miles' })
      const elevated = circle(center, 15, { steps: 72, units: 'miles' })
      const immediate = circle(center, 5, { steps: 64, units: 'miles' })

      layers.push(
        L.geoJSON(monitor, { pane: 'threat-rings', style: ringStyle(RING_MONITOR, 0.18) }).addTo(map),
        L.geoJSON(elevated, { pane: 'threat-rings', style: ringStyle(RING_ELEVATED, 0.22) }).addTo(map),
        L.geoJSON(immediate, { pane: 'threat-rings', style: ringStyle(RING_IMMEDIATE, 0.3) }).addTo(map),
      )

      const fireMarker = L.marker([threatAnchor.lat, threatAnchor.lon], {
        icon: divIcon(
          `<span class="threat-fire-mark" title="${threatAnchor.label}"></span>`,
          'threat-fire-wrap',
          [16, 16],
          [8, 8],
        ),
        keyboard: false,
      })
        .bindPopup(`${threatAnchor.label} · ${threatAnchor.miles.toFixed(1)} mi`)
        .addTo(map)
      layers.push(fireMarker)

      const dest = escapeDestination(home, threatAnchor)
      const geometry = await fetchDrivingRoute(home, dest)
      if (cancelled) return
      if (geometry) {
        const route = L.geoJSON(geometry, {
          pane: 'threat-route',
          style: {
            color: ROUTE_RED,
            weight: 3.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          },
        }).addTo(map)
        layers.push(route)
        setRouteMissing(false)
      } else {
        setRouteMissing(true)
      }

      const [minX, minY, maxX, maxY] = bbox(monitor)
      const bounds = L.latLngBounds([
        [minY, minX],
        [maxY, maxX],
        [home.lat, home.lon],
      ])
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11, animate: true })
    }

    void run()
    const resize = () => map.invalidateSize()
    window.addEventListener('resize', resize)
    requestAnimationFrame(resize)

    return () => {
      cancelled = true
      window.removeEventListener('resize', resize)
      for (const layer of layers) layer.remove()
      map.remove()
    }
  }, [open, home.lat, home.lon, threatAnchor])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-obsidian"
      role="dialog"
      aria-modal="true"
      aria-labelledby="threat-map-title"
    >
      <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-ash">MAP OVERVIEW</p>
          <h2
            id="threat-map-title"
            className="mt-1 font-display text-[1.6rem] font-normal tracking-[-0.02em] text-warm"
          >
            Escape route
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-10 items-center justify-center rounded-[8px] border border-white/15 text-warm hover:bg-white/10"
          aria-label="Close map"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="relative isolate min-h-0 flex-1">
        <div ref={mapNode} className="threat-map absolute inset-0 z-0" />

        {!threatAnchor ? (
          <div className="pointer-events-none absolute inset-x-0 top-6 z-10 flex justify-center px-4">
            <p className="rounded-[12px] bg-obsidian/80 px-4 py-3 font-sans text-[14px] text-warm backdrop-blur-sm">
              No active fire threats detected nearby.
            </p>
          </div>
        ) : (
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 sm:left-6 sm:right-auto sm:max-w-[22rem]">
            <div className="rounded-[16px] bg-obsidian/85 px-4 py-4 text-warm backdrop-blur-sm">
              <p className="font-mono text-[10px] tracking-[0.14em] text-ash">DISTANCE BUFFERS</p>
              <ul className="mt-3 space-y-2 font-sans text-[13px]">
                <li className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-alert" />
                  Immediate area · 5 mi
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-ember" />
                  Elevated · 15 mi
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-sage-monitor" />
                  Monitor · 30 mi
                </li>
              </ul>
              <p className="mt-3 font-sans text-[12px] leading-relaxed text-ash">
                Illustrative distance from {threatAnchor.label}. Not CAL FIRE Fire Hazard
                Severity Zone boundaries.
              </p>
            </div>
          </div>
        )}
      </div>

      <footer className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div className="flex items-center gap-4 font-sans text-[12px] text-ash">
          <span className="inline-flex items-center gap-1.5">
            <House className="size-3.5 text-warm" />
            This address
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Flame className="size-3.5 text-alert" />
            Fire location
          </span>
        </div>
        <p className="max-w-xl font-sans text-[12px] leading-relaxed text-ash">
          Suggested direction away from the fire, based on current fire location — not an official
          evacuation route. Always follow evacuation orders from local authorities.
          {routeMissing
            ? ' No driving path could be drawn from this point; rings and pins still show the fire location.'
            : ''}
        </p>
      </footer>
    </div>
  )
}
