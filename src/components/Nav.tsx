import { Link, useLocation } from 'react-router-dom'
import { Wordmark } from './Wordmark'
import { cn } from '@/lib/utils'

const LINKS = [
  { id: 'home', label: 'Home', to: '/' },
  { id: 'how', label: 'How it works', href: '/#how' },
  { id: 'data', label: 'Data', href: '/#data' },
] as const

export function Nav() {
  const { pathname } = useLocation()

  return (
    <header className="relative z-50 bg-canvas">
      <nav
        className="flex items-center justify-between px-6 py-5 sm:px-10 lg:px-14"
        aria-label="Primary"
      >
        <Wordmark />

        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden h-11 items-center rounded-full border border-line bg-paper px-1.5 md:flex">
            {LINKS.map((link) => {
              const active = link.id === 'home' && pathname === '/'
              const className = cn(
                'rounded-lg px-4 py-1.5 font-sans text-[15px] text-ink/80 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember',
                active && 'bg-[#EEEEEC] text-ink',
              )

              if ('to' in link) {
                return (
                  <Link key={link.id} to={link.to} className={className}>
                    {link.label}
                  </Link>
                )
              }

              return (
                <a key={link.id} href={link.href} className={className}>
                  {link.label}
                </a>
              )
            })}
          </div>

          <Link
            to="/app"
            className="inline-flex h-11 items-center rounded-full border border-line bg-paper px-5 font-sans text-[15px] text-ink hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
          >
            Try It
          </Link>
        </div>
      </nav>
    </header>
  )
}
