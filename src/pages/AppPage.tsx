import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wordmark } from '@/components/Wordmark'
import { ProductWorkspace } from '@/components/ProductWorkspace'
import { formatCoord } from '@/lib/mapStyle'
import { CA_CENTER } from '@/data/hotspots'

export function AppPage() {
  const [coord, setCoord] = useState(formatCoord(CA_CENTER[1], CA_CENTER[0]))
  const onCoordChange = useCallback((label: string) => setCoord(label), [])

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark />
        <Link
          to="/"
          className="rounded-md font-sans text-sm text-muted-foreground hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        >
          Home
        </Link>
      </header>
      <main className="flex flex-1 flex-col px-4 pb-4 sm:px-6 sm:pb-6">
        <ProductWorkspace coord={coord} onCoordChange={onCoordChange} tall />
      </main>
    </div>
  )
}
