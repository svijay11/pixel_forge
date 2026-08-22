import { type RefObject } from 'react'
import { gsap, Observer, ScrollTrigger, SplitText, useGSAP } from '@/lib/gsap'
import { animateDithers, riseKickers } from '@/hooks/motionFx'

function formatStat(value: number, format: string, suffix: string) {
  const body = format === 'comma' ? value.toLocaleString('en-US') : String(value)
  return `${body}${suffix}`
}

export function useLandingMotion(root: RefObject<HTMLElement | null>) {
  useGSAP(
    (_context, contextSafe) => {
      const rootEl = root.current
      if (!rootEl || !contextSafe) return

      const mm = gsap.matchMedia()
      let splitPending = true

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(
          '.hero-title, .hero-lead, .hero-cta, .hero-stage, .hero-rule, .gsap-heading, .gsap-copy, .gsap-card, .gsap-rise, .gsap-faq, .gsap-kicker, .stat-value, .js-scramble, .how-step-tab',
          { autoAlpha: 1, y: 0, x: 0, scale: 1, clearProps: 'transform' },
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
        const hero = rootEl.querySelector<HTMLElement>('#hero')
        const rule = rootEl.querySelector<SVGPathElement>('.hero-rule-path')

        gsap.set('.hero-cta, .hero-stage', { autoAlpha: 0, y: 28 })
        gsap.set('.gsap-card, .gsap-rise, .gsap-faq', { autoAlpha: 0, y: 32 })
        gsap.set('.how-step-tab', { autoAlpha: 0, y: 16 })
        gsap.set('.gsap-heading, .gsap-copy, .gsap-kicker', { autoAlpha: 0, y: 24 })
        gsap.set('#cta-heading', { autoAlpha: 0, y: 36, scale: 0.97 })
        gsap.set('.hero-rule-path', { drawSVG: 0 })

        const intro = gsap.timeline({ defaults: { ease: 'emberOut' } })
        const heroTitle = rootEl.querySelector<HTMLElement>('.hero-title')

        void document.fonts.ready.then(() => {
          if (!splitPending || !heroTitle) return
          SplitText.create(heroTitle, {
            type: 'words,chars',
            autoSplit: true,
            mask: 'words',
            onSplit(self) {
              return gsap.from(self.chars, {
                yPercent: 110,
                autoAlpha: 0,
                stagger: 0.016,
                duration: 0.72,
                ease: 'power3.out',
              })
            },
          })
        })

        intro
          .to('.hero-cta', { autoAlpha: 1, y: 0, duration: 0.65 }, 0.55)
          .to('.hero-stage', { autoAlpha: 1, y: 0, duration: 0.9 }, 0.68)

        gsap.to('.hero-lead', {
          y: -36,
          ease: 'none',
          scrollTrigger: {
            trigger: '#hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 0.5,
          },
        })

        if (rule) {
          gsap.fromTo(
            rule,
            { drawSVG: '0% 0%' },
            { drawSVG: '0% 100%', duration: 1.15, delay: 0.45, ease: 'power2.inOut' },
          )
        }

        if (hero && window.matchMedia('(pointer: fine)').matches) {
          const lead = rootEl.querySelector<HTMLElement>('.hero-lead')
          const leadX = lead ? gsap.quickTo(lead, 'x', { duration: 0.7, ease: 'power2.out' }) : null
          const leadY = lead ? gsap.quickTo(lead, 'y', { duration: 0.7, ease: 'power2.out' }) : null

          Observer.create({
            target: hero,
            type: 'pointer',
            onStopDelay: 0.35,
            onMove: (self) => {
              const x = gsap.utils.clamp(
                -10,
                10,
                gsap.utils.mapRange(0, window.innerWidth, -10, 10, self.x ?? 0),
              )
              const y = gsap.utils.clamp(
                -6,
                6,
                gsap.utils.mapRange(0, window.innerHeight, 6, -6, self.y ?? 0),
              )
              leadX?.(x * 0.35)
              leadY?.(y * 0.2)
            },
            onStop: () => {
              leadX?.(0)
              leadY?.(0)
            },
          })
        }

        gsap.utils.toArray<HTMLElement>('.gsap-heading').forEach((heading) => {
          gsap.fromTo(
            heading,
            { y: 28, x: -16, autoAlpha: 0 },
            {
              y: 0,
              x: 0,
              autoAlpha: 1,
              duration: 0.9,
              ease: 'emberOut',
              scrollTrigger: { trigger: heading, start: 'top 86%', once: true },
            },
          )
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
            duration: 1.55,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 84%', once: true },
            onUpdate: () => {
              el.textContent = formatStat(Math.round(obj.val), format, suffix)
            },
          })
        })

        const batch = gsap.utils.toArray<HTMLElement>('.gsap-card, .gsap-rise, .gsap-faq')
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
          '.how-step-tab',
          { y: 16, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            stagger: 0.12,
            duration: 0.7,
            ease: 'emberOut',
            scrollTrigger: { trigger: '#how', start: 'top 72%', once: true },
          },
        )

        riseKickers(rootEl)
        animateDithers(rootEl)

        const cleanups: Array<() => void> = []

        rootEl.querySelectorAll<HTMLAnchorElement>('.js-scroll').forEach((link) => {
          const onClick = contextSafe((event: Event) => {
            event.preventDefault()
            const href = link.getAttribute('href') ?? ''
            const id = href.includes('#') ? href.slice(href.indexOf('#') + 1) : ''
            if (!id) return
            gsap.to(window, {
              duration: 0.95,
              scrollTo: { y: `#${id}`, offsetY: 8 },
              ease: 'power3.inOut',
            })
          })
          link.addEventListener('click', onClick)
          cleanups.push(() => link.removeEventListener('click', onClick))
        })

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

        return () => cleanups.forEach((fn) => fn())
      })

      return () => {
        splitPending = false
        mm.revert()
      }
    },
    { scope: root },
  )
}
