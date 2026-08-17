import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, Flag } from 'lucide-react'
import { WaitClock } from '@/components/WaitClock'
import { Magnetic } from '@/components/Magnetic'
import { Nav } from '@/components/Nav'
import { StatCard } from '@/components/StatCard'
import { Wordmark } from '@/components/Wordmark'
import { Button } from '@/components/ui/button'
import { useResultsMotion } from '@/hooks/useResultsMotion'
import { assessAddress, type AssessResponse, type ChecklistItem } from '@/lib/assess'
import { formatCoord } from '@/lib/mapStyle'
import type { Stat } from '@/data/stats'
import { cn } from '@/lib/utils'

function zoneClass(zone: string) {
  if (zone === 'Very High') return 'bg-alert/15 text-alert'
  if (zone === 'High') return 'bg-ember/15 text-ember'
  if (zone === 'Moderate') return 'bg-sage/40 text-ink'
  return 'bg-muted text-muted-foreground'
}

function streetLine(query: string | null) {
  if (!query) return 'Address assessment'
  return query.split(',').slice(0, 2).join(',').trim()
}

function focusLabel(focus: string | null | undefined) {
  if (focus === 'now') return 'Now'
  if (focus === 'today') return 'Today'
  return 'Property'
}

function groupChecklist(items: ChecklistItem[]) {
  const order = ['now', 'today', 'property'] as const
  const groups: Record<(typeof order)[number], ChecklistItem[]> = {
    now: [],
    today: [],
    property: [],
  }
  for (const item of items) {
    const key = item.focus === 'now' || item.focus === 'today' ? item.focus : 'property'
    groups[key].push(item)
  }
  return order
    .map((key) => ({ key, items: groups[key] }))
    .filter((group) => group.items.length > 0)
}

function snapshotStats(data: AssessResponse): Stat[] {
  const closest = data.nearbyIncidents[0]?.miles
  return [
    {
      id: 'hotspots',
      value: data.nearbyHotspots.length,
      format: 'plain',
      caption: 'VIIRS HOTSPOTS, LAST 48H',
      source: 'NASA FIRMS · 50 mi',
    },
    {
      id: 'incidents',
      value: data.nearbyIncidents.length,
      format: 'plain',
      caption: 'CAL FIRE INCIDENTS NEARBY',
      source: closest != null ? `Nearest ${closest} mi` : 'Incidents GeoJSON',
    },
    {
      id: 'alerts',
      value: data.alerts.length,
      format: 'plain',
      caption: 'ACTIVE NWS ALERTS',
      source: 'api.weather.gov',
    },
    {
      id: 'closest',
      value: Math.round(data.nearbyIncidents[0]?.miles ?? 0),
      suffix: data.nearbyIncidents[0]?.miles != null ? ' mi' : '',
      format: 'plain',
      caption: data.nearbyIncidents[0]
        ? `NEAREST: ${data.nearbyIncidents[0].name.toUpperCase()}`
        : 'NEAREST CAL FIRE INCIDENT',
      source: data.nearbyIncidents[0] ? 'Incidents GeoJSON' : 'None within 50 mi',
    },
  ]
}

export function ResultsPage() {
  const [params] = useSearchParams()
  const query = params.get('q')
  const lat = params.get('lat')
  const lng = params.get('lng')
  const [data, setData] = useState<AssessResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  useResultsMotion(rootRef, Boolean(data))

  useEffect(() => {
    if (!query || !lat || !lng) return
    const latitude = Number(lat)
    const longitude = Number(lng)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('The selected address is missing valid coordinates.')
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setData(null)
    void assessAddress({ address: query, lat: latitude, lon: longitude })
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Assessment failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [query, lat, lng])

  const missingCoords = !lat || !lng
  const beats = useMemo(() => {
    if (!data) return []
    if (data.beats && data.beats.length > 0) return data.beats
    return data.riskBrief
      .split(/\n\n+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((body, index) => ({
        title: ['Situation', 'Conditions', 'What it means'][index] ?? 'Note',
        body,
      }))
  }, [data])
  const checklistGroups = data ? groupChecklist(data.checklist) : []
  const stats = data ? snapshotStats(data) : []

  return (
    <div ref={rootRef} className="min-h-dvh bg-canvas text-ink">
      <Nav />

      <section className="bg-canvas px-6 pb-16 pt-4 sm:px-10 sm:pt-8 lg:px-16">
        <div className="mx-auto max-w-[1280px]">
          <p className="hero-meta font-mono text-[11px] tracking-[0.16em] text-muted-foreground">
            PARCEL BRIEF
          </p>
          <h1 className="hero-title mt-3 max-w-5xl font-display text-[clamp(1.85rem,4.4vw,3.5rem)] font-normal leading-[1.08] tracking-[-0.01em] text-ink">
            {streetLine(query)}
          </h1>
          <svg
            className="hero-rule mt-3 block h-[10px] w-[7.25rem] overflow-visible sm:w-[8.5rem]"
            viewBox="0 0 180 12"
            fill="none"
            aria-hidden
            preserveAspectRatio="xMinYMid meet"
          >
            <path
              className="hero-rule-path"
              d="M0 7 C 22 2, 44 11, 72 6 S 126 2, 180 7"
              stroke="#B7D188"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          {data?.headline ? (
            <p className="hero-sub mt-8 max-w-[40rem] font-sans text-base leading-[1.65] text-[#555555] sm:text-[17px]">
              {data.headline}
            </p>
          ) : (
            <p className="hero-sub mt-8 max-w-[40rem] font-sans text-base leading-[1.65] text-[#555555] sm:text-[17px]">
              Live detections, alerts, and a checklist instantiated for this house — not a statewide
              dump.
            </p>
          )}
          <div className="hero-meta mt-6 flex flex-wrap items-center gap-3">
            {lat && lng ? (
              <span className="font-mono text-[11px] text-muted-foreground">
                {formatCoord(Number(lat), Number(lng))}
              </span>
            ) : null}
            {data ? (
              <span
                className={cn(
                  'rounded-[8px] px-3 py-1 font-sans text-sm font-medium',
                  zoneClass(data.hazardZone),
                )}
              >
                Hazard zone: {data.hazardZone}
              </span>
            ) : null}
          </div>
          <div className="hero-cta mt-8">
            <Magnetic strength={0.18}>
              <Button
                asChild
                className="h-10 rounded-[8px] bg-sage px-5 font-sans text-[14px] font-medium text-ink shadow-none hover:bg-sage/90"
              >
                <Link to="/app">New address</Link>
              </Button>
            </Magnetic>
          </div>
        </div>
      </section>

      {missingCoords ? (
        <section className="bg-paper px-6 py-16 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-[720px] rounded-[28px] border border-line bg-canvas px-6 py-8">
            <p className="font-sans text-[15px] leading-relaxed text-muted-foreground">
              Pick an address from the search suggestions so Ember can use its coordinates.
            </p>
            <Button asChild className="mt-5 h-10 rounded-[8px] bg-sage px-5 text-ink">
              <Link to="/app">Return to search</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <section className="bg-paper px-6 pb-20 pt-28 sm:px-10 sm:pt-36 md:pb-28 md:pt-44 lg:px-16">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-20">
              <div className="max-w-xl">
                <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground">
                  LIVE PULL
                </p>
                <h2 className="mt-3 font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.01em] text-ink md:text-[2.5rem]">
                  Pulling FIRMS, NOAA, and CAL FIRE for this parcel.
                </h2>
              </div>
              <WaitClock className="lg:ml-auto" />
            </div>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="bg-paper px-6 py-16 sm:px-10 lg:px-16">
          <p className="mx-auto max-w-[1280px] font-sans text-[15px] text-alert">{error}</p>
        </section>
      ) : null}

      {data ? (
        <main>
          <section className="bg-obsidian px-6 py-24 sm:px-10 md:py-32 lg:px-16" aria-labelledby="snap-heading">
            <div className="mx-auto max-w-[1280px]">
              <p
                id="snap-heading"
                className="js-scramble mb-3 font-mono text-[11px] tracking-[0.16em] text-ash"
                data-scramble="THIS PARCEL, NOW"
              >
                THIS PARCEL, NOW
              </p>
              <h2 className="gsap-heading mb-10 max-w-2xl font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.01em] text-warm md:text-[2.75rem]">
                What is around this house.
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                  <StatCard key={stat.id} stat={stat} tone="dark" />
                ))}
              </div>
            </div>
          </section>

          <section className="bg-paper px-6 py-24 sm:px-10 md:py-32 lg:px-16" aria-labelledby="brief-heading">
            <div className="mx-auto max-w-[1280px]">
              <h2
                id="brief-heading"
                className="gsap-heading max-w-3xl font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.01em] text-ink md:text-[2.75rem]"
              >
                The brief, in pieces — not a wall of text.
              </h2>
              <p className="gsap-copy mt-5 max-w-xl font-sans text-[17px] leading-[1.7] text-[#555555]">
                Each card is only what the live sources support for this address.
              </p>
              <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
                {beats.map((beat) => (
                  <article key={beat.title} className="gsap-card h-full rounded-2xl bg-canvas px-6 py-8">
                    <h3 className="font-display text-xl font-normal tracking-[-0.01em] text-ink">
                      {beat.title}
                    </h3>
                    <p className="mt-4 font-sans text-[15px] leading-relaxed text-muted-foreground">
                      {beat.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-mist px-6 py-24 sm:px-10 md:py-32 lg:px-16" aria-labelledby="live-heading">
            <div className="mx-auto max-w-[1280px]">
              <h2
                id="live-heading"
                className="gsap-heading max-w-2xl font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.01em] text-ink md:text-[2.75rem]"
              >
                Named incidents and alerts, not a blended score.
              </h2>
              <div className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <article className="gsap-card overflow-hidden rounded-[28px] border border-line bg-paper">
                  <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <p className="font-display text-lg text-ink">Nearby incidents</p>
                    <span className="rounded-full bg-canvas px-3 py-1 font-sans text-xs text-muted-foreground">
                      {data.nearbyIncidents.length} within 50 mi
                    </span>
                  </div>
                  {data.nearbyIncidents.length === 0 ? (
                    <p className="px-5 py-6 font-sans text-[15px] text-muted-foreground">
                      CAL FIRE lists no active incidents within 50 miles of this point.
                    </p>
                  ) : (
                    <ul>
                      {data.nearbyIncidents.slice(0, 6).map((incident, i) => (
                        <li
                          key={`${incident.name}-${incident.miles}`}
                          className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 last:border-b-0"
                        >
                          <span className="font-sans text-sm text-ink">
                            <span className="mr-3 font-mono text-[11px] text-muted-foreground">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            {incident.name}
                            {incident.county ? ` · ${incident.county}` : ''}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                            {incident.miles != null ? `${incident.miles} mi` : '—'}
                            {incident.acres != null ? ` · ${incident.acres.toLocaleString()} ac` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>

                <article className="gsap-card overflow-hidden rounded-[28px] border border-line bg-paper">
                  <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <p className="font-display text-lg text-ink">NOAA alerts</p>
                    <span className="rounded-full bg-canvas px-3 py-1 font-sans text-xs text-muted-foreground">
                      {data.alerts.length} active
                    </span>
                  </div>
                  {data.alerts.length === 0 ? (
                    <p className="px-5 py-6 font-sans text-[15px] text-muted-foreground">
                      No active watches or warnings at this coordinate right now.
                    </p>
                  ) : (
                    <ul>
                      {data.alerts.map((alert) => (
                        <li key={alert.headline ?? alert.event} className="border-b border-line px-5 py-4 last:border-b-0">
                          <p className="font-sans text-sm text-ink">{alert.event}</p>
                          <p className="mt-1 font-sans text-[13px] text-muted-foreground">
                            {alert.severity ? `${alert.severity} · ` : ''}
                            {alert.headline}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </div>
            </div>
          </section>

          <section
            id="checklist"
            className="bg-canvas px-6 py-24 sm:px-10 md:py-32 lg:px-16"
            aria-labelledby="list-heading"
          >
            <div className="mx-auto max-w-[1280px]">
              <h2
                id="list-heading"
                className="gsap-heading max-w-3xl font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.01em] text-ink md:text-[2.75rem]"
              >
                A list for this house, in this weather, with these fires.
              </h2>
              <p className="gsap-copy mt-5 max-w-xl font-sans text-[17px] leading-[1.7] text-[#555555]">
                Actions come from Cal Fire guidance. The wording is tied to this parcel’s zone,
                wind, alerts, and named incidents.
              </p>
              <div className="mt-16 space-y-14">
                {checklistGroups.map((group) => (
                  <div key={group.key}>
                    <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground">
                      {focusLabel(group.key).toUpperCase()}
                    </p>
                    <ol className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((row, index) => (
                        <li key={row.item} className="gsap-card h-full rounded-2xl bg-paper px-6 py-8">
                          <div className="flex items-start justify-between gap-3">
                            <p className="how-step-n font-display text-3xl font-normal text-sage">
                              {String(index + 1).padStart(2, '0')}
                            </p>
                            {row.verified ? (
                              <Check className="size-4 shrink-0 text-sage" aria-label="Verified" />
                            ) : (
                              <Flag className="size-4 shrink-0 text-ember" aria-label="Unverified" />
                            )}
                          </div>
                          <h3 className="mt-5 font-display text-xl font-normal tracking-[-0.01em] text-ink">
                            {row.item}
                          </h3>
                          {row.why ? (
                            <p className="mt-3 font-sans text-[15px] leading-relaxed text-muted-foreground">
                              {row.why}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            id="cta-band"
            className="bg-sage px-6 py-24 text-center sm:px-10 md:py-28 lg:px-16"
            aria-labelledby="cta-heading"
          >
            <h2
              id="cta-heading"
              className="font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.01em] text-ink md:text-[2.75rem]"
            >
              Official alerts still win.
            </h2>
            <p className="mx-auto mt-4 max-w-md font-sans text-[16px] text-ink/70">
              Ember is readiness for this structure. Evacuation orders come from local authorities.
            </p>
            <div className="mt-8">
              <Magnetic>
                <Button
                  asChild
                  className="h-10 rounded-[8px] bg-ink px-5 font-sans text-[14px] font-medium text-paper shadow-none hover:bg-ink/90"
                >
                  <Link to="/app">Check another address</Link>
                </Button>
              </Magnetic>
            </div>
          </section>
        </main>
      ) : null}

      <footer className="bg-canvas px-6 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark compact />
          <p className="font-sans text-xs text-muted-foreground">
            Data: NASA FIRMS · NOAA · Cal Fire
          </p>
        </div>
      </footer>
    </div>
  )
}
