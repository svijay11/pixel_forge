import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap, useGSAP } from '@/lib/gsap'

function EmberMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <rect className="ember-pixel" x="1" y="1" width="6" height="6" fill="#FF7A3D" />
      <rect className="ember-pixel" x="8" y="2" width="6" height="6" fill="#FF9A63" />
      <rect className="ember-pixel" x="3" y="8" width="6" height="6" fill="#E25A20" />
      <rect className="ember-pixel" x="10" y="10" width="5" height="5" fill="#FF7A3D" />
    </svg>
  )
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null)

  useGSAP(
    (_context, contextSafe) => {
      const el = ref.current
      if (!el || !contextSafe) return

      const pixels = el.querySelectorAll('.ember-pixel')
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(pixels, {
          scale: 0,
          stagger: 0.05,
          duration: 0.45,
          ease: 'back.out(1.7)',
          transformOrigin: 'center',
        })

        const enter = contextSafe(() => {
          gsap.to(pixels, {
            scale: 1.08,
            stagger: 0.04,
            duration: 0.28,
            ease: 'power2.out',
            transformOrigin: 'center',
            overwrite: 'auto',
          })
        })
        const leave = contextSafe(() => {
          gsap.to(pixels, {
            scale: 1,
            stagger: 0.03,
            duration: 0.32,
            ease: 'power2.out',
            transformOrigin: 'center',
            overwrite: 'auto',
          })
        })

        el.addEventListener('mouseenter', enter)
        el.addEventListener('mouseleave', leave)

        return () => {
          el.removeEventListener('mouseenter', enter)
          el.removeEventListener('mouseleave', leave)
        }
      })

      return () => mm.revert()
    },
    { scope: ref },
  )

  return (
    <Link
      ref={ref}
      to="/"
      className="inline-flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      aria-label="Ember home"
    >
      <EmberMark className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
      <span
        className={`font-sans font-medium tracking-[-0.02em] text-ink ${
          compact ? 'text-lg' : 'text-[1.35rem] leading-none'
        }`}
      >
        Ember
      </span>
    </Link>
  )
}
