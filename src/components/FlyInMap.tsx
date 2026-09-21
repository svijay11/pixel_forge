import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import { gsap, useGSAP } from '@/lib/gsap'
import { WaitClock } from '@/components/WaitClock'
import { formatCoord, addDarkBasemap } from '@/lib/mapStyle'
import { CA_CENTER } from '@/data/hotspots'

const US_CENTER: L.LatLngTuple = [39.8283, -98.5795]
const US_ZOOM = 4.15
const CA_LATLNG: L.LatLngTuple = [CA_CENTER[1], CA_CENTER[0]]
const CA_ZOOM = 6.05
const STREET_ZOOM = 15.2

function flyTo(
  map: L.Map,
  center: L.LatLngExpression,
  zoom: number,
  duration: number,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      map.off('moveend', finish)
      resolve()
    }
    map.once('moveend', finish)
    map.flyTo(center, zoom, {
      animate: true,
      duration,
      easeLinearity: 0.22,
    })
    window.setTimeout(finish, duration * 1000 + 900)
  })
}

function waitUntil(getReady: () => boolean, signal: { cancelled: boolean }) {
  return new Promise<void>((resolve) => {
    if (getReady()) {
      resolve()
      return
    }
    const id = window.setInterval(() => {
      if (signal.cancelled || getReady()) {
        window.clearInterval(id)
        resolve()
      }
    }, 80)
  })
}

function destinationIcon() {
  return L.divIcon({
    className: 'hotspot-icon',
    html: '<div class="hotspot" aria-hidden="true"><span class="hotspot-core"></span><span class="hotspot-ring"></span></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

export function FlyInMap({
  lat,
  lng,
  label,
  ready,
  onComplete,
}: {
  lat: number
  lng: number
  label: string
  ready: boolean
  onComplete: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLParagraphElement>(null)
  const readyRef = useRef(ready)
  const doneRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  readyRef.current = ready
  onCompleteRef.current = onComplete

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onCompleteRef.current()
  }

  useGSAP(
    () => {
      const overlay = overlayRef.current
      if (!overlay) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return
      gsap.fromTo(
        overlay.querySelectorAll('.fly-chrome'),
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.7, ease: 'emberOut', delay: 0.12, stagger: 0.06 },
      )
    },
    { scope: rootRef },
  )

  useEffect(() => {
    const container = mapRef.current
    const overlay = overlayRef.current
    const stage = stageRef.current
    if (!container) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const signal = { cancelled: false }
    const target: L.LatLngTuple = [lat, lng]

    const map = L.map(container, {
      center: reduced ? target : US_CENTER,
      zoom: reduced ? STREET_ZOOM : US_ZOOM,
      zoomControl: false,
      attributionControl: true,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomAnimation: true,
      fadeAnimation: true,
    })

    addDarkBasemap(map)

    const marker = L.marker(target, {
      icon: destinationIcon(),
      interactive: false,
      keyboard: false,
      opacity: 0,
    }).addTo(map)

    const setStage = (text: string) => {
      if (!stage) return
      if (reduced) {
        stage.textContent = text
        return
      }
      gsap.to(stage, {
        duration: 0.7,
        scrambleText: { text, chars: 'upperCase', speed: 0.55 },
        ease: 'none',
      })
    }

    const resize = () => map.invalidateSize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    window.addEventListener('resize', resize)
    requestAnimationFrame(resize)

    const run = async () => {
      if (reduced) {
        marker.setOpacity(1)
        setStage(label)
        await waitUntil(() => readyRef.current, signal)
        if (signal.cancelled) return
        finish()
        return
      }

      setStage('United States')
      await new Promise((r) => window.setTimeout(r, 520))
      if (signal.cancelled) return

      setStage('California')
      await flyTo(map, CA_LATLNG, CA_ZOOM, 2.85)
      if (signal.cancelled) return

      if (!readyRef.current) {
        map.flyTo(CA_LATLNG, 7.05, {
          animate: true,
          duration: 28,
          easeLinearity: 1,
        })
        await waitUntil(() => readyRef.current, signal)
        if (signal.cancelled) return
        map.stop()
      }

      setStage(label)
      marker.setOpacity(1)
      await flyTo(map, target, STREET_ZOOM, 3.35)
      if (signal.cancelled) return

      if (overlay) {
        const chrome = overlay.querySelectorAll('.fly-chrome')
        await gsap
          .timeline({ defaults: { ease: 'power2.inOut' } })
          .to(chrome, { autoAlpha: 0, y: 10, duration: 0.4, stagger: 0.04 }, 0)
          .to(rootRef.current, { autoAlpha: 0, duration: 0.7 }, 0.2)
      }
      if (!signal.cancelled) finish()
    }

    void run()

    return () => {
      signal.cancelled = true
      observer.disconnect()
      window.removeEventListener('resize', resize)
      marker.remove()
      map.remove()
    }
  }, [lat, lng, label])

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[60] isolate bg-[#0b0f14]"
      role="status"
      aria-live="polite"
      aria-label={`Flying to ${label}`}
    >
      <div ref={mapRef} className="absolute inset-0 z-0" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/50 via-black/15 to-black/60" />

      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 z-20 flex flex-col px-6 py-5 sm:px-10 lg:px-16"
      >
        <div className="fly-chrome flex items-start justify-between gap-4">
          <Link
            to="/"
            className="pointer-events-auto inline-flex items-center gap-2 font-sans text-[1.2rem] font-medium tracking-[-0.02em] text-[#f3f1ec]"
          >
            Ember
          </Link>
          <Link
            to="/app"
            className="pointer-events-auto inline-flex h-10 items-center rounded-[8px] border border-white/15 bg-white/10 px-4 font-sans text-[14px] font-medium text-[#f3f1ec] backdrop-blur-sm hover:bg-white/15"
          >
            New address
          </Link>
        </div>

        <div className="fly-chrome mx-auto mt-10 flex w-full max-w-[34rem] flex-1 flex-col items-center justify-center pb-8 sm:mt-6">
          <p className="font-mono text-[11px] tracking-[0.16em] text-[#9aa09a]">LIVE PULL</p>
          <p
            ref={stageRef}
            className="mt-3 min-h-[2.4rem] text-center font-display text-[1.65rem] font-normal tracking-[-0.02em] text-[#f3f1ec] sm:text-[2rem]"
          >
            United States
          </p>
          <p className="mt-2 font-mono text-[11px] text-[#8b93a0]">{formatCoord(lat, lng)}</p>
          <WaitClock className="mt-8 w-full" tone="onDark" />
        </div>
      </div>
    </div>
  )
}
