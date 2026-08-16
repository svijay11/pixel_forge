import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'

export function PointerGlow() {
  const dotRef = useRef<HTMLDivElement>(null)

  useGSAP(
    (_context, contextSafe) => {
      const dot = dotRef.current
      if (!dot || !contextSafe) return

      const mm = gsap.matchMedia()

      mm.add('(pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const xTo = gsap.quickTo(dot, 'x', { duration: 0.45, ease: 'power3.out' })
        const yTo = gsap.quickTo(dot, 'y', { duration: 0.45, ease: 'power3.out' })
        const scaleTo = gsap.quickTo(dot, 'scale', { duration: 0.35, ease: 'power2.out' })

        gsap.set(dot, { x: -40, y: -40, autoAlpha: 0, scale: 0.6 })

        const onMove = contextSafe((event: MouseEvent) => {
          xTo(event.clientX - 11)
          yTo(event.clientY - 11)
          gsap.to(dot, { autoAlpha: 1, duration: 0.25, overwrite: 'auto' })
        })

        const onOver = contextSafe((event: MouseEvent) => {
          const target = event.target
          if (!(target instanceof Element)) return
          const magnetic = target.closest('a, button, summary, [data-magnetic]')
          scaleTo(magnetic ? 1.85 : 1)
        })

        const onLeave = contextSafe(() => {
          gsap.to(dot, { autoAlpha: 0, duration: 0.3, overwrite: 'auto' })
        })

        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseover', onOver)
        document.documentElement.addEventListener('mouseleave', onLeave)

        return () => {
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseover', onOver)
          document.documentElement.removeEventListener('mouseleave', onLeave)
        }
      })

      return () => mm.revert()
    },
    { scope: dotRef },
  )

  return (
    <div
      ref={dotRef}
      className="pointer-events-none fixed top-0 left-0 z-[90] size-[22px] rounded-full bg-ember/45 mix-blend-multiply"
      style={{ willChange: 'transform, opacity' }}
      aria-hidden
    />
  )
}
