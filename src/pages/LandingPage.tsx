import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Magnetic } from '@/components/Magnetic'
import { Nav } from '@/components/Nav'
import SplitText from '@/components/SplitText'
import { ProductWorkspace } from '@/components/ProductWorkspace'
import { StatCard } from '@/components/StatCard'
import { Wordmark } from '@/components/Wordmark'
import { Button } from '@/components/ui/button'
import { STATS } from '@/data/stats'
import { CA_CENTER } from '@/data/hotspots'
import { formatCoord } from '@/lib/mapStyle'
import { gsap, useGSAP } from '@/lib/gsap'
import { useLandingMotion } from '@/hooks/useLandingMotion'

const STEPS = [
  {
    n: '01',
    title: 'Enter your address',
    body: 'Pin your home on the same heat-detection map used for live satellite fire feeds.',
  },
  {
    n: '02',
    title: 'Get a synthesized risk brief',
    body: 'Nearby detections, vegetation, slope, and access — in one read for that structure.',
  },
  {
    n: '03',
    title: 'Get a grounded action checklist',
    body: 'Work for this house, in order. Not a generic preparedness dump.',
  },
]

const BRIEF_ITEMS = [
  { label: 'Nearby satellite hotspots', tag: 'FIRMS' },
  { label: 'Vegetation and fuel around the structure', tag: 'Local' },
  { label: 'Slope, access, and defensible space', tag: 'Site' },
  { label: 'Ordered actions for this house', tag: 'Checklist' },
]

const FEATURES = [
  {
    title: 'Detections, not a blog post.',
    body: 'The brief starts from live heat detections and local conditions. If a source is missing, we say so instead of filling the gap with generic advice.',
  },
  {
    title: 'Written for one address.',
    body: 'Vegetation, slope, and access change from lot to lot. The output is for the structure you entered, not for “California homeowners.”',
  },
  {
    title: 'A list you can finish.',
    body: 'The checklist is short, ordered, and specific to the house. It is meant to be done, not saved in a tab.',
  },
]

const SOURCES = [
  {
    name: 'NASA FIRMS',
    body: 'VIIRS and MODIS hotspot detections — the same satellite fire feed used by incident teams.',
  },
  {
    name: 'NOAA',
    body: 'Weather and fuel-moisture context that changes how detections should be read.',
  },
  {
    name: 'Cal Fire',
    body: 'Incident records and structure-loss statistics used to ground the statewide picture.',
  },
]

const FAQS = [
  {
    q: 'What data does Ember use?',
    a: 'Satellite heat detections from NASA FIRMS (VIIRS / MODIS), plus public weather and vegetation context. The 2025 statewide figures on this page come from Cal Fire / NIFC.',
  },
  {
    q: 'Is this a replacement for official alerts?',
    a: 'No. Evacuation orders, Nixle, Watch Duty, and local fire authorities are the source of truth during an incident. Ember is for readiness before that.',
  },
  {
    q: 'Does this work outside California?',
    a: 'This build is framed on California because that is where the first checklist logic is being grounded. The address screen is the only live surface right now.',
  },
  {
    q: 'What do I get after I enter an address?',
    a: 'A synthesized risk brief for that structure, then a short action checklist. The results screen is not wired yet — this shell stops at address entry.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const itemRef = useRef<HTMLDivElement>(null)
  const answerRef = useRef<HTMLDivElement>(null)

  const { contextSafe } = useGSAP(() => {
    const el = answerRef.current
    if (!el) return
    gsap.set(el, { height: 0, autoAlpha: 0 })
  }, { scope: itemRef })

  const toggle = contextSafe(() => {
    const el = answerRef.current
    if (!el) return
    const next = !openRef.current
    openRef.current = next
    setOpen(next)
    if (next) {
      gsap.fromTo(
        el,
        { height: 0, autoAlpha: 0 },
        { height: 'auto', autoAlpha: 1, duration: 0.42, ease: 'power2.out', overwrite: 'auto' },
      )
    } else {
      gsap.to(el, { height: 0, autoAlpha: 0, duration: 0.32, ease: 'power2.inOut', overwrite: 'auto' })
    }
  })

  return (
    <div ref={itemRef} className="gsap-faq border-b border-line py-5 first:border-t">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-6 text-left font-sans text-[16px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
        aria-expanded={open}
        onClick={toggle}
      >
        {q}
        <span className="text-muted-foreground" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      <div ref={answerRef} className="overflow-hidden">
        <p className="mt-3 max-w-2xl font-sans text-[15px] leading-relaxed text-muted-foreground">{a}</p>
      </div>
    </div>
  )
}

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [coord, setCoord] = useState(formatCoord(CA_CENTER[1], CA_CENTER[0]))
  const onCoordChange = useCallback((label: string) => setCoord(label), [])
  useLandingMotion(rootRef)

  return (
    <div ref={rootRef} className="min-h-dvh bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-none focus:bg-sage focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <Nav />

      <section id="hero" className="bg-canvas px-6 pb-14 pt-4 sm:px-10 sm:pt-8 lg:px-16">
        <div className="mx-auto max-w-[1280px]">
          <div className="hero-lead">
            <h1 className="hero-title whitespace-nowrap font-display text-[clamp(1.35rem,4.6vw,3.75rem)] font-normal leading-none tracking-[-0.01em] text-ink">
              Check your home against live fire data.
            </h1>
              <svg
                className="hero-rule mt-2 block h-[10px] w-[7.25rem] overflow-visible sm:w-[8.5rem]"
                viewBox="0 0 180 12"
                fill="none"
                aria-hidden
                preserveAspectRatio="xMinYMid meet"
              >
                <path
                  className="hero-rule-path"
                  d="M0 7 C 22 2, 44 11, 72 6 S 126 2, 180 7"
                  stroke="#B7D188"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <SplitText
              text="Enter an address. Get a risk brief from satellite heat detections, then a checklist for that house — not generic preparedness advice."
              tag="p"
              className="hero-sub mt-8 w-full max-w-[38rem] font-sans text-base font-normal leading-[1.65] text-[#555555] sm:text-[17px]"
              delay={22}
              duration={0.55}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 18 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              rootMargin="-80px"
              textAlign="left"
            />
            <div className="hero-cta mt-8 flex flex-wrap items-center gap-5">
              <Magnetic strength={0.18}>
                <Button
                  asChild
                  className="h-10 rounded-[8px] bg-sage px-5 font-sans text-[14px] font-medium text-ink shadow-none hover:bg-sage/90"
                >
                  <Link to="/app">Check My Address</Link>
                </Button>
              </Magnetic>
              <a
                href="#how"
                className="js-scroll font-sans text-[15px] text-[#555555] underline decoration-[#cfcfcb] underline-offset-[6px] hover:text-ink hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                See how it works
              </a>
            </div>

          <div className="hero-stage relative z-10 mt-12 sm:mt-14">
            <ProductWorkspace coord={coord} onCoordChange={onCoordChange} />
          </div>
        </div>
      </section>

      <main id="main">
        <section
          className="bg-paper px-6 py-24 sm:px-10 md:py-32 lg:px-16"
          aria-labelledby="gap-heading"
        >
          <div className="mx-auto grid max-w-[1280px] items-start gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            <div>
              <h2
                id="gap-heading"
                className="gsap-heading font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.01em] text-ink md:text-[2.75rem]"
              >
                The map shows the fire. It does not tell you what to do at your house.
              </h2>
              <p className="gsap-copy mt-6 max-w-xl font-sans text-[17px] leading-[1.7] text-[#555555]">
                Statewide advice stops at the property line. Ember synthesizes detections and
                site conditions into a brief and a checklist for one address.
              </p>
            </div>
            <div className="gsap-card overflow-hidden rounded-[28px] border border-line bg-canvas">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <p className="font-display text-lg text-ink">What the brief covers</p>
                <span className="rounded-full bg-paper px-3 py-1 font-sans text-xs text-muted-foreground">
                  {BRIEF_ITEMS.length} items
                </span>
              </div>
              <ul>
                {BRIEF_ITEMS.map((item, i) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 last:border-b-0"
                  >
                    <span className="font-sans text-sm text-ink">
                      <span className="mr-3 font-mono text-[11px] text-muted-foreground">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {item.label}
                    </span>
                    <span className="shrink-0 rounded-full bg-paper px-2.5 py-1 font-mono text-[10px] tracking-wide text-muted-foreground">
                      {item.tag}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          className="bg-mist px-6 py-24 sm:px-10 md:py-32 lg:px-16"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-[1280px]">
            <h2
              id="features-heading"
              className="gsap-heading max-w-3xl font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.01em] text-ink md:text-[2.75rem]"
            >
              Built to close the gap between a detection and a decision.
            </h2>
            <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="gsap-card h-full rounded-2xl bg-paper px-6 py-8"
                >
                  <h3 className="font-display text-xl font-normal tracking-[-0.01em] text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-4 font-sans text-[15px] leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="data"
          className="bg-obsidian px-6 py-24 sm:px-10 md:py-32 lg:px-16"
          aria-labelledby="stats-heading"
        >
          <div className="mx-auto max-w-[1280px]">
            <p
              id="stats-heading"
              className="js-scramble mb-3 font-mono text-[11px] tracking-[0.16em] text-ash"
              data-scramble="CALIFORNIA 2025"
            >
              CALIFORNIA 2025
            </p>
            <h2 className="gsap-heading mb-10 max-w-2xl font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.01em] text-warm md:text-[2.75rem]">
              The year, in numbers.
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STATS.map((stat) => (
                <StatCard key={stat.id} stat={stat} tone="dark" />
              ))}
            </div>
          </div>
        </section>

        <section
          id="how"
          className="bg-paper px-6 py-24 sm:px-10 md:py-32 lg:px-16"
          aria-labelledby="how-heading"
        >
          <div className="mx-auto max-w-[1280px]">
            <h2
              id="how-heading"
              className="gsap-heading max-w-2xl font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.01em] text-ink md:text-[2.75rem]"
            >
              How it works
            </h2>
            <ol className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.n} className="gsap-card h-full rounded-2xl bg-canvas px-6 py-8">
                  <p className="how-step-n font-display text-3xl font-normal text-sage">{step.n}</p>
                  <h3 className="mt-5 font-display text-xl font-normal tracking-[-0.01em] text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-sm font-sans text-[15px] leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="bg-canvas px-6 py-24 sm:px-10 md:py-32 lg:px-16"
          aria-labelledby="sources-heading"
        >
          <div className="mx-auto max-w-[1280px]">
            <h2
              id="sources-heading"
              className="gsap-heading max-w-2xl font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.01em] text-ink md:text-[2.75rem]"
            >
              Named sources, not a black box.
            </h2>
            <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
              {SOURCES.map((source) => (
                <article
                  key={source.name}
                  className="gsap-card h-full rounded-2xl border border-line bg-paper px-6 py-7"
                >
                  <h3 className="font-display text-lg font-normal text-ink">{source.name}</h3>
                  <p className="mt-3 font-sans text-[15px] leading-relaxed text-muted-foreground">
                    {source.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="bg-paper px-6 py-24 sm:px-10 md:py-32 lg:px-16"
          aria-labelledby="faq-heading"
        >
          <div className="mx-auto max-w-[720px]">
            <h2
              id="faq-heading"
              className="gsap-heading font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.01em] text-ink md:text-[2.75rem]"
            >
              Questions
            </h2>
            <div className="mt-12">
              {FAQS.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        <section
          id="cta-band"
          className="bg-sage px-6 py-24 text-center sm:px-10 md:py-28 lg:px-16"
          aria-labelledby="cta-heading"
        >
          <h2
            id="cta-heading"
            className="font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.01em] text-ink md:text-[2.75rem]"
          >
            Check your address.
          </h2>
          <p className="mx-auto mt-4 max-w-md font-sans text-[16px] text-ink/70">
            Enter a California home. Get a brief and a checklist for that structure.
          </p>
          <div className="mt-8">
            <Magnetic>
              <Button
                asChild
                className="h-10 rounded-[8px] bg-ink px-5 font-sans text-[14px] font-medium text-paper shadow-none hover:bg-ink/90"
              >
                <Link to="/app">Check My Address</Link>
              </Button>
            </Magnetic>
          </div>
        </section>
      </main>

      <footer className="bg-canvas px-6 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark compact />
          <p className="font-sans text-xs text-muted-foreground">
            Data: NASA FIRMS · NOAA · Cal Fire
          </p>
        </div>
      </footer>
    </div>
  )
}
