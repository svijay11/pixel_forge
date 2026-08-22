import { useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'

export type FeatureVisual = 'radar' | 'lot' | 'list'

export function DitherCard({
  icon: Icon,
  title,
  body,
  visual,
}: {
  icon: LucideIcon
  title: string
  body: string
  visual: FeatureVisual
}) {
  return (
    <article className="gsap-rise relative flex min-h-[320px] flex-col overflow-hidden rounded-[16px] border border-line bg-paper px-7 pb-6 pt-7 shadow-[0_10px_30px_rgba(23,23,23,0.045)]">
      <div className="flex items-center gap-2.5">
        <Icon className="size-[18px] text-sage-monitor" strokeWidth={1.75} aria-hidden />
        <h3 className="font-display text-[1.15rem] font-bold tracking-[-0.01em] text-ink">{title}</h3>
      </div>
      <p className="mt-4 max-w-[36ch] font-sans text-[14px] leading-relaxed text-ash">{body}</p>
      <div className="mt-auto pt-8" aria-hidden>
        {visual === 'radar' ? <RadarStage /> : null}
        {visual === 'lot' ? <LotStage /> : null}
        {visual === 'list' ? <ListStage /> : null}
      </div>
    </article>
  )
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function RadarStage() {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set('.heat-dot', { scale: 1, autoAlpha: 1 })
        gsap.set('.scan-line', { autoAlpha: 0.35 })
        return
      }
      gsap.set('.heat-dot', { scale: 0, autoAlpha: 0, transformOrigin: '50% 50%' })
      gsap.set('.heat-ring', { scale: 0.4, autoAlpha: 0, transformOrigin: '50% 50%' })
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 })
      tl.fromTo('.scan-line', { y: 6 }, { y: 118, duration: 3.1, ease: 'none' })
        .to('.heat-dot-0', { scale: 1, autoAlpha: 1, duration: 0.28, ease: 'emberOut' }, 0.55)
        .fromTo(
          '.heat-ring-0',
          { scale: 0.4, autoAlpha: 0.55 },
          { scale: 2.4, autoAlpha: 0, duration: 1.15, ease: 'power2.out' },
          0.55,
        )
        .to('.heat-dot-1', { scale: 1, autoAlpha: 1, duration: 0.28, ease: 'emberOut' }, 1.25)
        .fromTo(
          '.heat-ring-1',
          { scale: 0.4, autoAlpha: 0.55 },
          { scale: 2.4, autoAlpha: 0, duration: 1.15, ease: 'power2.out' },
          1.25,
        )
        .to('.heat-dot-2', { scale: 1, autoAlpha: 1, duration: 0.28, ease: 'emberOut' }, 2.05)
        .fromTo(
          '.heat-ring-2',
          { scale: 0.4, autoAlpha: 0.55 },
          { scale: 2.4, autoAlpha: 0, duration: 1.15, ease: 'power2.out' },
          2.05,
        )
        .to('.heat-dot', { autoAlpha: 0, duration: 0.35 }, '+=0.45')
    },
    { scope: ref },
  )

  return (
    <div ref={ref} className="h-[128px]">
      <p className="mb-2 font-sans text-[10px] tracking-[0.16em] text-ash uppercase">Live scan</p>
      <svg viewBox="0 0 180 108" className="h-[108px] w-[180px]" fill="none">
        <line x1="0" y1="18" x2="180" y2="18" stroke="#171717" strokeOpacity="0.08" />
        <line x1="0" y1="54" x2="180" y2="54" stroke="#171717" strokeOpacity="0.08" />
        <line x1="0" y1="90" x2="180" y2="90" stroke="#171717" strokeOpacity="0.08" />
        <line x1="36" y1="0" x2="36" y2="108" stroke="#171717" strokeOpacity="0.06" />
        <line x1="90" y1="0" x2="90" y2="108" stroke="#171717" strokeOpacity="0.06" />
        <line x1="144" y1="0" x2="144" y2="108" stroke="#171717" strokeOpacity="0.06" />
        <line className="scan-line" x1="0" y1="0" x2="180" y2="0" stroke="#6e9b6b" strokeWidth="1.25" />
        <g transform="translate(32 28)">
          <circle className="heat-ring heat-ring-0" r="9" stroke="#ff7a3d" strokeWidth="1" />
          <circle className="heat-dot heat-dot-0" r="3.2" fill="#ff7a3d" />
        </g>
        <g transform="translate(86 62)">
          <circle className="heat-ring heat-ring-1" r="9" stroke="#ff7a3d" strokeWidth="1" />
          <circle className="heat-dot heat-dot-1" r="3.2" fill="#ff7a3d" />
        </g>
        <g transform="translate(128 88)">
          <circle className="heat-ring heat-ring-2" r="9" stroke="#6e9b6b" strokeWidth="1" />
          <circle className="heat-dot heat-dot-2" r="3.2" fill="#6e9b6b" />
        </g>
      </svg>
    </div>
  )
}

function LotStage() {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set('.lot-house', { drawSVG: '100%' })
        return
      }
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.7 })
      tl.set('.lot-house', { drawSVG: '0%', autoAlpha: 1 })
        .set('.lot-pin', { y: 8, autoAlpha: 0, scale: 0.7 })
        .set('.lot-coord', { autoAlpha: 0, y: 6 })
        .to('.lot-house', { drawSVG: '100%', duration: 1.55, ease: 'power2.inOut' })
        .to('.lot-pin', { y: 0, autoAlpha: 1, scale: 1, duration: 0.45, ease: 'emberOut' }, 0.7)
        .to('.lot-coord', { autoAlpha: 1, y: 0, duration: 0.4, ease: 'emberOut' }, 0.95)
        .to('.lot-house, .lot-pin, .lot-coord', { autoAlpha: 0.2, duration: 0.45 }, '+=1.6')
    },
    { scope: ref },
  )

  return (
    <div ref={ref} className="flex h-[128px] items-end gap-5">
      <svg viewBox="0 0 72 72" className="size-[72px] shrink-0" fill="none">
        <path
          className="lot-house"
          d="M12 32 L36 12 L60 32 V60 H44 V44 H28 V60 H12 Z"
          stroke="#6e9b6b"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle className="lot-pin" cx="36" cy="38" r="3.5" fill="#6e9b6b" />
      </svg>
      <p className="lot-coord pb-2 font-display text-[1.05rem] leading-snug tracking-[-0.02em] text-ink/55">
        34.0522° N
        <br />
        118.2437° W
      </p>
    </div>
  )
}

function ListStage() {
  const ref = useRef<HTMLUListElement>(null)
  const items = ['FIRMS in range', 'Site conditions', 'Ordered next steps']

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set('.list-mark', { autoAlpha: 1, scale: 1 })
        return
      }
      gsap.set('.list-mark', { autoAlpha: 0, scale: 0.4 })
      gsap
        .timeline({ repeat: -1, repeatDelay: 0.9 })
        .to('.list-mark', {
          autoAlpha: 1,
          scale: 1,
          duration: 0.32,
          stagger: 0.38,
          ease: 'emberOut',
        })
        .to('.list-row', { autoAlpha: 0.28, duration: 0.35, stagger: 0.06 }, '+=1.15')
        .set('.list-mark', { autoAlpha: 0, scale: 0.4 })
        .set('.list-row', { autoAlpha: 1 })
    },
    { scope: ref },
  )

  return (
    <ul ref={ref} className="space-y-2.5">
      {items.map((item, index) => (
        <li key={item} className="list-row flex items-center gap-3">
          <span className="relative flex size-5 shrink-0 items-center justify-center rounded-full border border-sage-monitor/45">
            <span className="list-mark size-2 rounded-full bg-sage-monitor" />
          </span>
          <span className="font-display text-[14px] tracking-[-0.01em] text-ink/70">
            <span className="mr-2 text-[11px] text-sage-monitor">0{index + 1}</span>
            {item}
          </span>
        </li>
      ))}
    </ul>
  )
}
