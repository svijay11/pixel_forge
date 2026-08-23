import { useRef, useState, type KeyboardEvent } from 'react'
import { Check, MapPin, ScanSearch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'

const STEPS = [
  {
    n: '01',
    title: 'Enter your address',
    body: 'Pin your home on the same heat-detection map used for live satellite fire feeds.',
    kicker: 'Photon · California',
  },
  {
    n: '02',
    title: 'Get a synthesized risk brief',
    body: 'Nearby detections, vegetation, slope, and access — in one read for that structure.',
    kicker: 'FIRMS · NOAA · Cal Fire',
  },
  {
    n: '03',
    title: 'Get a grounded action checklist',
    body: 'Work for this house, in order. Not a generic preparedness dump.',
    kicker: 'Now · Today · Property',
  },
] as const

function StepPreview({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div>
        <p className="flex items-center gap-2 font-sans text-[10px] tracking-[0.18em] text-ash uppercase">
          <MapPin className="size-3.5 text-sage-monitor" strokeWidth={1.75} aria-hidden />
          Address pin
        </p>
        <p className="mt-5 font-display text-[1.65rem] leading-none tracking-[-0.02em] text-ink">
          34.0522° N
        </p>
        <p className="mt-2 font-display text-[1.65rem] leading-none tracking-[-0.02em] text-ink/45">
          118.2437° W
        </p>
        <p className="mt-6 font-sans text-[13px] leading-relaxed text-ash">
          Same coordinate the satellite feed is queried against.
        </p>
      </div>
    )
  }

  if (index === 1) {
    return (
      <div>
        <p className="flex items-center gap-2 font-sans text-[10px] tracking-[0.18em] text-ash uppercase">
          <ScanSearch className="size-3.5 text-sage-monitor" strokeWidth={1.75} aria-hidden />
          Brief skeleton
        </p>
        <ul className="mt-5 space-y-3">
          {[
            ['FIRMS', 'Heat detections in range'],
            ['NOAA', 'Wind, humidity, fuel moisture'],
            ['Cal Fire', 'Named incidents, if any'],
          ].map(([label, detail]) => (
            <li key={label} className="flex items-baseline justify-between gap-4 border-b border-ink/8 pb-3 last:border-0 last:pb-0">
              <span className="font-display text-[15px] text-ink">{label}</span>
              <span className="font-sans text-[12px] text-ash">{detail}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div>
      <p className="flex items-center gap-2 font-sans text-[10px] tracking-[0.18em] text-ash uppercase">
        <Check className="size-3.5 text-sage-monitor" strokeWidth={1.75} aria-hidden />
        Ordered for the lot
      </p>
      <ol className="mt-5 space-y-3">
        {['Clear the first five feet', 'Know two ways out', 'Pack what you would grab'].map((item, i) => (
          <li key={item} className="flex items-center gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-sage-monitor/40 font-sans text-[10px] text-sage-monitor">
              {i + 1}
            </span>
            <span className="font-display text-[15px] tracking-[-0.01em] text-ink">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function stepFromProgress(progress: number) {
  return Math.min(STEPS.length - 1, Math.round(progress * (STEPS.length - 1)))
}

export function HowStepper() {
  const rootRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const skipFade = useRef(true)
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  activeRef.current = active

  useGSAP(
    (_context, contextSafe) => {
      const fill = fillRef.current
      const section = document.getElementById('how')
      if (!fill || !section || !contextSafe) return

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return

      gsap.set(fill, { scaleX: 0, transformOrigin: 'left center' })
      const fillTo = gsap.quickTo(fill, 'scaleX', { duration: 0.28, ease: 'power2.out' })
      const applyStep = contextSafe((next: number) => {
        if (next !== activeRef.current) setActive(next)
      })

      ScrollTrigger.create({
        id: 'how-steps',
        trigger: section,
        start: 'top top',
        end: () => `+=${Math.round(window.innerHeight * (window.innerWidth < 768 ? 1.9 : 2.45))}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        snap: {
          snapTo: (progress) => Math.round(progress * (STEPS.length - 1)) / (STEPS.length - 1),
          duration: 0.22,
          delay: 0.02,
          ease: 'power1.inOut',
        },
        onUpdate: (self) => {
          fillTo(self.progress)
          applyStep(stepFromProgress(self.progress))
        },
      })
    },
    { scope: rootRef },
  )

  useGSAP(
    () => {
      const fill = fillRef.current
      const pinned = Boolean(ScrollTrigger.getById('how-steps'))
      if (fill && !pinned) {
        gsap.to(fill, {
          scaleX: active / Math.max(STEPS.length - 1, 1),
          duration: 0.55,
          ease: 'emberOut',
          overwrite: 'auto',
        })
      }

      if (skipFade.current) {
        skipFade.current = false
        return
      }

      gsap.fromTo(
        [copyRef.current, previewRef.current],
        { y: 12, autoAlpha: 0.2 },
        { y: 0, autoAlpha: 1, duration: 0.42, ease: 'emberOut', stagger: 0.05, overwrite: 'auto' },
      )
    },
    { scope: rootRef, dependencies: [active] },
  )

  const goToStep = (index: number) => {
    const st = ScrollTrigger.getById('how-steps')
    if (!st) {
      setActive(index)
      return
    }
    const progress = index / Math.max(STEPS.length - 1, 1)
    gsap.to(window, {
      duration: 0.8,
      scrollTo: st.start + (st.end - st.start) * progress,
      ease: 'power3.inOut',
      overwrite: 'auto',
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowDown' && event.key !== 'ArrowLeft' && event.key !== 'ArrowUp') {
      return
    }
    event.preventDefault()
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? Math.min(STEPS.length - 1, activeRef.current + 1)
        : Math.max(0, activeRef.current - 1)
    goToStep(next)
    requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLButtonElement>(`#how-tab-${next}`)?.focus()
    })
  }

  const step = STEPS[active]

  return (
    <div ref={rootRef} className="mt-16">
      <div className="flex items-end justify-between gap-6">
        <p className="gsap-kicker font-sans text-[10px] tracking-[0.18em] text-ash uppercase">
          Scroll the steps
        </p>
        <p className="font-display text-sm tracking-[-0.01em] text-sage-monitor" aria-live="polite">
          {step.n} / 03
        </p>
      </div>

      <div
        role="tablist"
        aria-label="How Ember works"
        className="relative mt-8"
        onKeyDown={onKeyDown}
      >
        <div
          className="pointer-events-none absolute top-[1.15rem] right-[16.5%] left-[16.5%] hidden h-px bg-ink/12 md:block"
          aria-hidden
        />
        <div
          ref={fillRef}
          className="pointer-events-none absolute top-[1.15rem] left-[16.5%] hidden h-px origin-left bg-sage-monitor md:block"
          style={{ width: '67%', transform: 'scaleX(0)' }}
          aria-hidden
        />

        <div className="grid gap-2 md:grid-cols-3 md:gap-0">
          {STEPS.map((item, index) => {
            const selected = index === active
            return (
              <button
                key={item.n}
                type="button"
                role="tab"
                id={`how-tab-${index}`}
                aria-selected={selected}
                aria-controls="how-panel"
                tabIndex={selected ? 0 : -1}
                className={cn(
                  'how-step-tab group flex cursor-pointer items-start gap-4 rounded-md px-1 py-3 text-left transition-colors md:flex-col md:items-center md:gap-4 md:px-4 md:py-0',
                  selected ? 'text-ink' : 'text-ink/40 hover:text-ink/70',
                )}
                onClick={() => goToStep(index)}
              >
                <span
                  className={cn(
                    'how-step-n relative z-[1] flex size-9 shrink-0 items-center justify-center rounded-full border bg-mist font-display text-[13px] transition-colors duration-300',
                    selected
                      ? 'border-sage-monitor text-sage-monitor'
                      : 'border-ink/15 text-ink/35 group-hover:border-ink/30',
                  )}
                >
                  {item.n}
                </span>
                <span className="font-display text-[1.05rem] tracking-[-0.01em] md:text-center">
                  {item.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        id="how-panel"
        role="tabpanel"
        aria-labelledby={`how-tab-${active}`}
        className="how-stage mt-10 grid min-h-[13.5rem] gap-8 border-t border-ink/12 pt-10 md:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] md:items-start md:gap-14"
      >
        <div className="gsap-rise">
          <div ref={copyRef}>
            <p className="font-sans text-[10px] tracking-[0.16em] text-sage-monitor uppercase">
              {step.kicker}
            </p>
            <h3 className="mt-3 font-display text-[1.85rem] font-normal leading-[1.12] tracking-[-0.02em] text-ink md:text-[2.15rem]">
              {step.title}
            </h3>
            <p className="mt-5 max-w-md font-sans text-[16px] leading-relaxed text-ink/70">
              {step.body}
            </p>
          </div>
        </div>
        <div className="gsap-card rounded-[16px] border border-ink/10 bg-paper/80 px-6 py-6 shadow-[0_10px_30px_rgba(23,23,23,0.04)]">
          <div ref={previewRef}>
            <StepPreview index={active} />
          </div>
        </div>
      </div>
    </div>
  )
}
