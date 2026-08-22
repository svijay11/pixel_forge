import { CloudSun, Flame, Satellite, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const SOURCES: Array<{
  name: string
  kicker: string
  body: string
  signal: string
  usedIn: string
  icon: LucideIcon
}> = [
  {
    name: 'NASA FIRMS',
    kicker: 'Satellite',
    body: 'VIIRS and MODIS hotspot detections — the same satellite fire feed used by incident teams.',
    signal: 'VIIRS · MODIS · 48h',
    usedIn: 'Brief · Map',
    icon: Satellite,
  },
  {
    name: 'NOAA',
    kicker: 'Weather',
    body: 'Weather and fuel-moisture context that changes how detections should be read.',
    signal: 'weather.gov',
    usedIn: 'Brief · Rings',
    icon: CloudSun,
  },
  {
    name: 'Cal Fire',
    kicker: 'Incidents',
    body: 'Incident records and structure-loss statistics used to ground the statewide picture.',
    signal: 'Active GeoJSON',
    usedIn: 'Brief · Threat',
    icon: Flame,
  },
]

function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex size-1.5', className)} aria-hidden>
      <span className="source-live-ring absolute inset-0 rounded-full bg-ember" />
      <span className="relative block size-1.5 rounded-full bg-ember" />
    </span>
  )
}

export function SourceFeeds() {
  return (
    <div className="mt-16">
      <div className="flex items-end justify-between gap-6 border-b border-line pb-6">
        <p className="gsap-kicker font-sans text-[10px] tracking-[0.18em] text-ash uppercase">
          Live feeds
        </p>
        <p className="flex items-center gap-2 font-sans text-[10px] tracking-[0.16em] text-ash uppercase">
          <LiveDot />
          Named, not inferred
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
        {SOURCES.map((source) => {
          const Icon = source.icon
          return (
            <article
              key={source.name}
              className="source-feed gsap-card group relative overflow-hidden rounded-[16px] border border-ink/10 bg-paper px-6 pt-6 pb-7 transition-[border-color,background-color] duration-300 hover:border-sage-monitor/45 hover:bg-mist/40"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-sans text-[10px] tracking-[0.18em] text-ash uppercase">
                  {source.kicker}
                </p>
                <p className="flex items-center gap-1.5 font-sans text-[10px] tracking-[0.16em] text-sage-monitor uppercase">
                  <LiveDot />
                  Live
                </p>
              </div>

              <Icon className="mt-7 size-[18px] text-sage-monitor" strokeWidth={1.75} aria-hidden />
              <h3 className="mt-3 font-display text-[1.35rem] font-normal tracking-[-0.01em] text-ink">
                {source.name}
              </h3>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-ink/70">{source.body}</p>

              <div className="mt-8 flex items-end justify-between gap-3">
                <p className="font-sans text-[11px] tracking-[0.08em] text-ash">{source.signal}</p>
                <p className="font-sans text-[11px] tracking-[0.08em] text-ink/35">{source.usedIn}</p>
              </div>

              <div
                className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-sage-monitor transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100"
                aria-hidden
              />
            </article>
          )
        })}
      </div>
    </div>
  )
}
