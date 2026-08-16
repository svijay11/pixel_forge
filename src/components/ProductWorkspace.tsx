import { Folder, Mail, MapPin, Video } from 'lucide-react'
import { MapBackground } from './MapBackground'
import { AddressSearch } from './AddressSearch'
import { cn } from '@/lib/utils'

const SIDEBAR = [
  { icon: Mail, label: 'Inbox', active: false },
  { icon: Video, label: 'Live feed', active: true },
  { icon: Folder, label: 'Briefs', active: false },
  { icon: MapPin, label: 'Addresses', active: false },
] as const

type ProductWorkspaceProps = {
  className?: string
  coord?: string
  onCoordChange?: (label: string) => void
  tall?: boolean
}

export function ProductWorkspace({
  className,
  coord,
  onCoordChange,
  tall = false,
}: ProductWorkspaceProps) {
  return (
    <section
      className={cn(
        'relative isolate overflow-hidden rounded-[28px] border border-line bg-paper shadow-[0_20px_50px_rgba(23,23,23,0.06)]',
        tall ? 'h-[calc(100dvh-7.5rem)]' : 'min-h-[min(68vh,640px)]',
        className,
      )}
      aria-label="Ember workspace"
    >
      <div className="flex h-full min-h-[min(68vh,640px)]">
        <aside className="hidden w-[64px] shrink-0 flex-col items-center gap-3 border-r border-line bg-canvas py-4 sm:flex">
          {SIDEBAR.map(({ icon: Icon, label, active }) => (
            <span
              key={label}
              title={label}
              className={cn(
                'inline-flex size-10 items-center justify-center rounded-xl',
                active ? 'bg-muted text-ink' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="sr-only">{label}</span>
            </span>
          ))}
        </aside>

        <div className="flex min-h-[min(68vh,640px)] flex-1 flex-col">
          <header className="flex flex-col items-center px-4 py-6 text-center sm:py-7">
            <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-ink sm:text-[28px]">
              California live feed
            </h2>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-muted px-3 py-1 font-sans text-xs text-ink">
                NASA FIRMS
              </span>
              <span className="rounded-full bg-muted px-3 py-1 font-sans text-xs text-ink">
                VIIRS / MODIS
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-sans text-xs text-ink">
                <span className="size-1.5 rounded-full bg-ember" aria-hidden="true" />
                Hotspots
              </span>
              {coord ? (
                <span className="rounded-full bg-muted px-3 py-1 font-mono text-[11px] text-muted-foreground">
                  {coord}
                </span>
              ) : null}
            </div>
          </header>

          <div className="relative z-0 min-h-[280px] flex-1 overflow-hidden">
            <MapBackground onCoordChange={onCoordChange} />
          </div>

          <div className="relative z-10 border-t border-line bg-paper px-4 py-4 sm:px-6 sm:py-5">
            <AddressSearch />
          </div>
        </div>
      </div>
    </section>
  )
}
