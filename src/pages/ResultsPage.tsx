import { Link, useSearchParams } from 'react-router-dom'
import { Wordmark } from '@/components/Wordmark'
import { Button } from '@/components/ui/button'

export function ResultsPage() {
  const [params] = useSearchParams()
  const query = params.get('q')

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
      <main className="mx-auto flex max-w-lg flex-col items-center px-5 pt-[18vh] text-center">
        <p className="font-sans text-sm text-muted-foreground">Brief</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.03em] text-ink">
          Results coming soon
        </h1>
        {query ? (
          <p className="mt-4 font-sans text-sm leading-relaxed text-muted-foreground">{query}</p>
        ) : null}
        <p className="mt-6 max-w-sm font-sans text-[15px] leading-relaxed text-muted-foreground">
          The risk brief and action checklist are not wired yet. Address entry is as far as
          this build goes.
        </p>
        <Button
          asChild
          className="mt-8 h-11 rounded-xl bg-sage px-5 font-sans text-[15px] font-medium text-ink shadow-none hover:bg-sage/90"
        >
          <Link to="/app">Try another address</Link>
        </Button>
      </main>
    </div>
  )
}
