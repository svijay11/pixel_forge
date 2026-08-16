import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Magnetic } from './Magnetic'
import { Wordmark } from './Wordmark'
import { gsap, useGSAP } from '@/lib/gsap'
import { cn } from '@/lib/utils'

const LINKS = [
  { id: 'home', label: 'Home', to: '/' },
  { id: 'how', label: 'How it works', href: '/#how' },
  { id: 'data', label: 'Data', href: '/#data' },
] as const

export function Nav() {
  const { pathname } = useLocation()
  const navRef = useRef<HTMLElement>(null)

  useGSAP(
    (_context, contextSafe) => {
      const nav = navRef.current
      if (!nav || !contextSafe) return

      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.nav-item', {
          y: -8,
          autoAlpha: 0,
          stagger: 0.05,
          duration: 0.45,
          ease: 'power2.out',
        })

        nav.querySelectorAll<HTMLAnchorElement>('a[href^="/#"]').forEach((link) => {
          const onClick = contextSafe((event: MouseEvent) => {
            const id = link.getAttribute('href')?.split('#')[1]
            if (!id || pathname !== '/') return
            event.preventDefault()
            gsap.to(window, {
              duration: 0.95,
              scrollTo: { y: `#${id}`, offsetY: 8 },
              ease: 'power3.inOut',
            })
          })
          link.addEventListener('click', onClick)
        })
      })

      return () => mm.revert()
    },
    { scope: navRef },
  )

  return (
    <header ref={navRef} className="relative z-50 bg-canvas">
      <nav
        className="flex items-center justify-between px-6 py-4 sm:px-10 lg:px-16"
        aria-label="Primary"
      >
        <Wordmark />

        <div className="flex items-center gap-2">
          <div className="hidden h-10 items-center rounded-[8px] border border-line bg-paper px-1 shadow-[0_1px_3px_rgba(23,23,23,0.06)] md:flex">
            {LINKS.map((link) => {
              const active = link.id === 'home' && pathname === '/'
              const className = cn(
                'nav-item rounded-[6px] px-3.5 py-1.5 font-sans text-[14px] font-medium text-ink/80 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember',
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

          <Magnetic strength={0.18}>
            <Link
              to="/app"
              className="nav-item inline-flex h-10 items-center rounded-[8px] border border-line bg-paper px-4 font-sans text-[14px] font-medium text-ink hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
            >
              Try It
            </Link>
          </Magnetic>
        </div>
      </nav>
    </header>
  )
}
