import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wordmark } from '@/components/Wordmark'
import { ProductWorkspace } from '@/components/ProductWorkspace'
import { formatCoord } from '@/lib/mapStyle'
import { CA_CENTER } from '@/data/hotspots'
import { gsap, useGSAP } from '@/lib/gsap'

export function AppPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [coord, setCoord] = useState(formatCoord(CA_CENTER[1], CA_CENTER[0]))
  const onCoordChange = useCallback((label: string) => setCoord(label), [])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.app-stage', {
          y: 24,
          autoAlpha: 0,
          duration: 0.75,
          ease: 'emberOut',
        })
      })
      return () => mm.revert()
    },
    { scope: rootRef },
  )

  return (
    <div ref={rootRef} className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark />
        <Link
          to="/"
          className="rounded-md font-sans text-sm text-muted-foreground hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        >
          Home
        </Link>
      </header>
      <main className="app-stage flex flex-1 flex-col px-4 pb-4 sm:px-6 sm:pb-6">
        <ProductWorkspace coord={coord} onCoordChange={onCoordChange} tall />
      </main>
    </div>
  )
}
