import { useRef, type ReactNode } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'
import { cn } from '@/lib/utils'

export function Magnetic({
  children,
  className,
  strength = 0.32,
}: {
  children: ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    (_context, contextSafe) => {
      const el = ref.current
      if (!el || !contextSafe) return

      const mm = gsap.matchMedia()

      mm.add('(pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' })
        const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' })

        const onMove = contextSafe((event: MouseEvent) => {
          const box = el.getBoundingClientRect()
          const dx = event.clientX - (box.left + box.width / 2)
          const dy = event.clientY - (box.top + box.height / 2)
          xTo(gsap.utils.clamp(-14, 14, dx * strength))
          yTo(gsap.utils.clamp(-10, 10, dy * strength))
        })

        const onEnter = contextSafe(() => {
          gsap.to(el, { scale: 1.04, duration: 0.3, ease: 'power2.out', overwrite: 'auto' })
        })

        const onLeave = contextSafe(() => {
          xTo(0)
          yTo(0)
          gsap.to(el, { scale: 1, duration: 0.4, ease: 'power2.out', overwrite: 'auto' })
        })

        el.addEventListener('mousemove', onMove)
        el.addEventListener('mouseenter', onEnter)
        el.addEventListener('mouseleave', onLeave)

        return () => {
          el.removeEventListener('mousemove', onMove)
          el.removeEventListener('mouseenter', onEnter)
          el.removeEventListener('mouseleave', onLeave)
        }
      })

      return () => mm.revert()
    },
    { scope: ref },
  )

  return (
    <div ref={ref} data-magnetic className={cn('inline-flex will-change-transform', className)}>
      {children}
    </div>
  )
}
