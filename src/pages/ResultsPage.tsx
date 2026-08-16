import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, Flag } from 'lucide-react'
import { Wordmark } from '@/components/Wordmark'
import { Button } from '@/components/ui/button'
import { assessAddress, type AssessResponse } from '@/lib/assess'
import { cn } from '@/lib/utils'

function zoneClass(zone: string) {
  if (zone === 'Very High') return 'bg-alert/15 text-alert'
  if (zone === 'High') return 'bg-ember/15 text-ember'
  if (zone === 'Moderate') return 'bg-sage/40 text-ink'
  return 'bg-muted text-muted-foreground'
}

export function ResultsPage() {
  const [params] = useSearchParams()
  const query = params.get('q')
  const lat = params.get('lat')
  const lng = params.get('lng')
  const [data, setData] = useState<AssessResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query || !lat || !lng) return
    const latitude = Number(lat)
    const longitude = Number(lng)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('The selected address is missing valid coordinates.')
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setData(null)
    void assessAddress({ address: query, lat: latitude, lon: longitude }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Assessment failed')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [query, lat, lng])

  const missingCoords = !lat || !lng

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark />
        <Link
          to="/app"
          className="rounded-md font-sans text-sm text-muted-foreground hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        >
          Back to search
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16">
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">BRIEF</p>
        <h1 className="mt-2 font-display text-3xl font-normal tracking-[-0.01em] text-ink sm:text-4xl">
          {query ?? 'Address assessment'}
        </h1>
        {lat && lng ? (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            {lat}°, {lng}°
          </p>
        ) : null}

        {missingCoords ? (
          <div className="mt-8 rounded-[8px] border border-line bg-paper px-5 py-6">
            <p className="font-sans text-[15px] leading-relaxed text-muted-foreground">
              Pick an address from the search suggestions so Ember can use its coordinates. Typed-only
              submissions without a match cannot be assessed.
            </p>
            <Button asChild className="mt-5 h-10 rounded-[8px] bg-sage px-5 text-ink">
              <Link to="/app">Return to search</Link>
            </Button>
          </div>
        ) : null}

        {loading ? (
          <p className="mt-10 font-sans text-[15px] text-muted-foreground">
            Pulling live fire, weather, and hazard-zone data, then writing the brief.
            This usually takes 15–40 seconds.
          </p>
        ) : null}

        {error ? (
          <p className="mt-8 font-sans text-[15px] text-alert">{error}</p>
        ) : null}

        {data ? (
          <div className="mt-8 space-y-8">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  'rounded-[8px] px-3 py-1 font-sans text-sm font-medium',
                  zoneClass(data.hazardZone),
                )}
              >
                Hazard zone: {data.hazardZone}
              </span>
              {data.wind.speed ? (
                <span className="font-sans text-sm text-muted-foreground">
                  Wind {data.wind.speed}
                  {data.wind.direction ? ` ${data.wind.direction}` : ''}
                </span>
              ) : null}
            </div>

            <section>
              <h2 className="font-sans text-sm font-medium text-ink">Risk brief</h2>
              <div className="mt-3 space-y-3 font-sans text-[15px] leading-relaxed text-[#555555]">
                {data.riskBrief.split(/\n\n+/).map((para) => (
                  <p key={para.slice(0, 40)}>{para}</p>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-sans text-sm font-medium text-ink">Checklist</h2>
              <p className="mt-1 font-sans text-[13px] text-muted-foreground">
                Checkmark = grounded in retrieved Cal Fire guidance. Flag = verification pass could
                not confirm the item against those chunks.
              </p>
              <ul className="mt-3 space-y-2">
                {data.checklist.map((row) => (
                  <li
                    key={row.item}
                    className="flex gap-3 rounded-[8px] border border-line bg-paper px-4 py-3"
                  >
                    {row.verified ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-sage" aria-label="Verified" />
                    ) : (
                      <Flag className="mt-0.5 size-4 shrink-0 text-ember" aria-label="Unverified" />
                    )}
                    <span className="font-sans text-[15px] leading-relaxed text-ink">{row.item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {data.alerts.length > 0 ? (
              <section>
                <h2 className="font-sans text-sm font-medium text-ink">Active alerts</h2>
                <ul className="mt-3 space-y-2">
                  {data.alerts.map((alert) => (
                    <li key={alert.headline ?? alert.event} className="font-sans text-[14px] text-ink">
                      {alert.event}
                      {alert.severity ? ` · ${alert.severity}` : ''}
                      {alert.headline ? ` — ${alert.headline}` : ''}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {data.nearbyIncidents.length > 0 ? (
              <section>
                <h2 className="font-sans text-sm font-medium text-ink">Nearby incidents</h2>
                <ul className="mt-3 space-y-1 font-sans text-[14px] text-muted-foreground">
                  {data.nearbyIncidents.map((incident) => (
                    <li key={`${incident.name}-${incident.miles}`}>
                      {incident.name}
                      {incident.miles != null ? ` · ${incident.miles} mi` : ''}
                      {incident.acres != null ? ` · ${incident.acres.toLocaleString()} ac` : ''}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {data.nearbyHotspots.length > 0 ? (
              <section>
                <h2 className="font-sans text-sm font-medium text-ink">Satellite hotspots (48h)</h2>
                <p className="mt-2 font-sans text-[14px] text-muted-foreground">
                  {data.nearbyHotspots.length} VIIRS detections within 50 miles
                </p>
              </section>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  )
}
