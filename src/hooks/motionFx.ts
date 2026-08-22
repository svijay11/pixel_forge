import { gsap } from '@/lib/gsap'

export function fillGlyphBars(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('.glyph-bar-fill').forEach((el) => {
    const fill = Number(el.dataset.fill ?? 0)
    gsap.fromTo(
      el,
      { width: '0%' },
      {
        width: `${fill}%`,
        duration: 1.2,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      },
    )
  })
}

export function riseKickers(root: HTMLElement) {
  gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.gsap-kicker')).forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 10 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.55,
        ease: 'emberOut',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      },
    )
  })
}
