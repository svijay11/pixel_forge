import { type RefObject } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'

function formatStat(value: number, format: string, suffix: string) {
  const body = format === 'comma' ? value.toLocaleString('en-US') : String(value)
  return `${body}${suffix}`
}

export function useResultsMotion(root: RefObject<HTMLElement | null>, ready: boolean) {
  useGSAP(
    (_context, contextSafe) => {
      const rootEl = root.current
      if (!rootEl || !ready || !contextSafe) return

      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(
          '.hero-title, .hero-sub, .hero-cta, .gsap-heading, .gsap-copy, .gsap-card, .stat-value, .js-scramble, #cta-heading, .how-step-n',
          { autoAlpha: 1, y: 0, scale: 1, clearProps: 'transform' },
        )
        rootEl.querySelectorAll<HTMLElement>('.stat-value').forEach((el) => {
          el.textContent = formatStat(
            Number(el.dataset.value ?? 0),
            el.dataset.format ?? 'plain',
            el.dataset.suffix ?? '',
          )
        })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set('.hero-title', { autoAlpha: 0, y: 28 })
        gsap.set('.hero-sub, .hero-cta, .hero-meta', { autoAlpha: 0, y: 20 })
        gsap.set('.gsap-card', { autoAlpha: 0, y: 32 })
        gsap.set('.gsap-heading, .gsap-copy', { autoAlpha: 0, y: 24 })
        gsap.set('#cta-heading', { autoAlpha: 0, y: 36, scale: 0.97 })
        gsap.set('.hero-rule-path', { drawSVG: 0 })

        const intro = gsap.timeline({ defaults: { ease: 'emberOut' } })
        intro
          .to('.hero-title', { autoAlpha: 1, y: 0, duration: 0.75 }, 0.05)
          .to('.hero-sub', { autoAlpha: 1, y: 0, duration: 0.6 }, 0.18)
          .to('.hero-meta', { autoAlpha: 1, y: 0, duration: 0.55 }, 0.28)
          .to('.hero-cta', { autoAlpha: 1, y: 0, duration: 0.55 }, 0.36)

        gsap.fromTo(
          '.hero-rule-path',
          { drawSVG: '0% 0%' },
          { drawSVG: '0% 100%', duration: 1.1, delay: 0.2, ease: 'power2.inOut' },
        )

        gsap.utils.toArray<HTMLElement>('.gsap-heading').forEach((heading) => {
          gsap.to(heading, {
            y: 0,
            autoAlpha: 1,
            duration: 0.8,
            ease: 'emberOut',
            scrollTrigger: { trigger: heading, start: 'top 86%', once: true },
          })
        })

        gsap.utils.toArray<HTMLElement>('.gsap-copy').forEach((copy) => {
          gsap.to(copy, {
            y: 0,
            autoAlpha: 1,
            duration: 0.7,
            delay: 0.08,
            scrollTrigger: { trigger: copy, start: 'top 88%', once: true },
          })
        })

        gsap.utils.toArray<HTMLElement>('.js-scramble').forEach((el) => {
          const text = el.dataset.scramble ?? el.textContent ?? ''
          gsap.to(el, {
            duration: 1.05,
            scrambleText: { text, chars: 'upperCase', speed: 0.45 },
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          })
        })

        rootEl.querySelectorAll<HTMLElement>('.stat-value').forEach((el) => {
          const target = Number(el.dataset.value ?? 0)
          const suffix = el.dataset.suffix ?? ''
          const format = el.dataset.format ?? 'plain'
          const obj = { val: 0 }
          gsap.to(obj, {
            val: target,
            duration: 1.4,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 84%', once: true },
            onUpdate: () => {
              el.textContent = formatStat(Math.round(obj.val), format, suffix)
            },
          })
        })

        const batch = gsap.utils.toArray<HTMLElement>('.gsap-card')
        if (batch.length) {
          ScrollTrigger.batch(batch, {
            start: 'top 88%',
            interval: 0.12,
            batchMax: 4,
            onEnter: (elements) => {
              gsap.to(elements, {
                autoAlpha: 1,
                y: 0,
                stagger: 0.08,
                duration: 0.75,
                ease: 'emberOut',
                overwrite: true,
              })
            },
          })
        }

        gsap.fromTo(
          '#cta-heading',
          { y: 36, scale: 0.97, autoAlpha: 0 },
          {
            y: 0,
            scale: 1,
            autoAlpha: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: '#cta-band',
              start: 'top 88%',
              end: 'top 48%',
              scrub: 0.55,
            },
          },
        )

        gsap.fromTo(
          '.how-step-n',
          { y: 18, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            stagger: 0.08,
            duration: 0.65,
            ease: 'emberOut',
            scrollTrigger: { trigger: '#checklist', start: 'top 72%', once: true },
          },
        )

        const cleanups: Array<() => void> = []
        rootEl.querySelectorAll<HTMLElement>('.gsap-card').forEach((card) => {
          const enter = contextSafe(() => {
            gsap.to(card, { scale: 1.015, duration: 0.35, ease: 'power2.out', overwrite: 'auto' })
          })
          const leave = contextSafe(() => {
            gsap.to(card, { scale: 1, duration: 0.4, ease: 'power2.out', overwrite: 'auto' })
          })
          card.addEventListener('mouseenter', enter)
          card.addEventListener('mouseleave', leave)
          cleanups.push(() => {
            card.removeEventListener('mouseenter', enter)
            card.removeEventListener('mouseleave', leave)
          })
        })

        requestAnimationFrame(() => ScrollTrigger.refresh())
        return () => cleanups.forEach((fn) => fn())
      })

      return () => mm.revert()
    },
    { scope: root, dependencies: [ready], revertOnUpdate: true },
  )
}
