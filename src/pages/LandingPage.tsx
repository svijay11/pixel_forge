import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '@/components/Nav'
import { ProductWorkspace } from '@/components/ProductWorkspace'
import { StatCard } from '@/components/StatCard'
import { Wordmark } from '@/components/Wordmark'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/ui/blur-fade'
import { TextAnimate } from '@/components/ui/text-animate'
import { STATS } from '@/data/stats'
import { CA_CENTER } from '@/data/hotspots'
import { formatCoord } from '@/lib/mapStyle'

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

export function LandingPage() {
  const [coord, setCoord] = useState(formatCoord(CA_CENTER[1], CA_CENTER[0]))
  const onCoordChange = useCallback((label: string) => setCoord(label), [])

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-sage focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <Nav />

      <section id="hero" className="bg-canvas px-6 pb-16 pt-6 sm:px-10 sm:pt-10 lg:px-14">
        <div className="mx-auto max-w-[1120px]">
          <div className="max-w-[640px]">
            <TextAnimate
              as="h1"
              by="word"
              animation="blurInUp"
              once
              startOnView={false}
              duration={0.55}
              className="font-display text-[2.6rem] font-medium leading-[1.12] tracking-[-0.03em] text-ink sm:text-5xl md:text-[3.5rem]"
            >
              Check your home against live fire data.
            </TextAnimate>
            <BlurFade delay={0.18} offset={8} blur="6px">
              <p className="mt-5 max-w-[34rem] font-sans text-[17px] leading-relaxed text-muted-foreground">
                Enter an address. Get a risk brief from satellite heat detections, then a
                checklist for that house — not generic preparedness advice.
              </p>
            </BlurFade>
            <BlurFade delay={0.3} offset={8} blur="6px">
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <Button
                  asChild
                  className="h-11 rounded-xl bg-sage px-5 font-sans text-[15px] font-medium text-ink shadow-none hover:bg-sage/90"
                >
                  <Link to="/app">Check My Address</Link>
                </Button>
                <a
                  href="#how"
                  className="font-sans text-[15px] text-ink underline decoration-line underline-offset-[6px] hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
                >
                  See how it works
                </a>
              </div>
            </BlurFade>
          </div>

          <BlurFade delay={0.42} offset={16} blur="10px" className="relative z-10 mt-12 sm:mt-14">
            <ProductWorkspace coord={coord} onCoordChange={onCoordChange} />
          </BlurFade>
        </div>
      </section>

      <main id="main">
        <section
          className="bg-paper px-6 py-24 sm:px-10 md:py-32 lg:px-14"
          aria-labelledby="gap-heading"
        >
          <div className="mx-auto grid max-w-[1120px] items-start gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            <BlurFade inView offset={10}>
              <h2
                id="gap-heading"
                className="font-display text-4xl font-medium tracking-[-0.03em] text-ink sm:text-5xl"
              >
                The map shows the fire. It does not tell you what to do at your house.
              </h2>
              <p className="mt-6 max-w-md font-sans text-[16px] leading-relaxed text-muted-foreground">
                Statewide advice stops at the property line. Ember synthesizes detections and
                site conditions into a brief and a checklist for one address.
              </p>
            </BlurFade>
            <BlurFade inView delay={0.12} offset={12}>
              <div className="overflow-hidden rounded-[28px] border border-line bg-canvas">
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
            </BlurFade>
          </div>
        </section>

        <section
          className="bg-mist px-6 py-24 sm:px-10 md:py-32 lg:px-14"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-[1120px]">
            <BlurFade inView offset={10}>
              <h2
                id="features-heading"
                className="max-w-2xl font-display text-4xl font-medium tracking-[-0.03em] text-ink sm:text-5xl"
              >
                Built to close the gap between a detection and a decision.
              </h2>
            </BlurFade>
            <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
              {FEATURES.map((feature, i) => (
                <BlurFade key={feature.title} delay={0.1 * i} inView offset={12}>
                  <article className="h-full rounded-2xl bg-paper px-6 py-8">
                    <h3 className="font-display text-2xl font-medium tracking-[-0.02em] text-ink">
                      {feature.title}
                    </h3>
                    <p className="mt-4 font-sans text-[15px] leading-relaxed text-muted-foreground">
                      {feature.body}
                    </p>
                  </article>
                </BlurFade>
              ))}
            </div>
          </div>
        </section>

        <section
          id="data"
          className="bg-obsidian px-6 py-24 sm:px-10 md:py-32 lg:px-14"
          aria-labelledby="stats-heading"
        >
          <div className="mx-auto max-w-[1120px]">
            <BlurFade inView offset={10}>
              <p
                id="stats-heading"
                className="mb-3 font-mono text-[11px] tracking-[0.16em] text-ash"
              >
                CALIFORNIA 2025
              </p>
              <h2 className="mb-10 max-w-xl font-display text-4xl font-medium tracking-[-0.03em] text-warm sm:text-5xl">
                The year, in numbers.
              </h2>
            </BlurFade>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STATS.map((stat, index) => (
                <StatCard key={stat.id} stat={stat} index={index} tone="dark" />
              ))}
            </div>
          </div>
        </section>

        <section
          id="how"
          className="bg-paper px-6 py-24 sm:px-10 md:py-32 lg:px-14"
          aria-labelledby="how-heading"
        >
          <div className="mx-auto max-w-[1120px]">
            <BlurFade inView offset={10}>
              <h2
                id="how-heading"
                className="max-w-xl font-display text-4xl font-medium tracking-[-0.03em] text-ink sm:text-5xl"
              >
                How it works
              </h2>
            </BlurFade>
            <ol className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <BlurFade key={step.n} delay={0.1 * i} inView offset={12}>
                  <li className="h-full rounded-2xl bg-canvas px-6 py-8">
                    <p className="font-display text-4xl font-medium text-sage">{step.n}</p>
                    <h3 className="mt-5 font-display text-2xl font-medium tracking-[-0.02em] text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-sm font-sans text-[15px] leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </li>
                </BlurFade>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="bg-canvas px-6 py-24 sm:px-10 md:py-32 lg:px-14"
          aria-labelledby="sources-heading"
        >
          <div className="mx-auto max-w-[1120px]">
            <BlurFade inView offset={10}>
              <h2
                id="sources-heading"
                className="max-w-xl font-display text-4xl font-medium tracking-[-0.03em] text-ink sm:text-5xl"
              >
                Named sources, not a black box.
              </h2>
            </BlurFade>
            <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
              {SOURCES.map((source, i) => (
                <BlurFade key={source.name} delay={0.08 * i} inView offset={12}>
                  <article className="h-full rounded-2xl border border-line bg-paper px-6 py-7">
                    <h3 className="font-display text-xl font-medium text-ink">{source.name}</h3>
                    <p className="mt-3 font-sans text-[15px] leading-relaxed text-muted-foreground">
                      {source.body}
                    </p>
                  </article>
                </BlurFade>
              ))}
            </div>
          </div>
        </section>

        <section
          className="bg-paper px-6 py-24 sm:px-10 md:py-32 lg:px-14"
          aria-labelledby="faq-heading"
        >
          <div className="mx-auto max-w-[720px]">
            <BlurFade inView offset={10}>
              <h2
                id="faq-heading"
                className="font-display text-4xl font-medium tracking-[-0.03em] text-ink sm:text-5xl"
              >
                Questions
              </h2>
            </BlurFade>
            <div className="mt-12">
              {FAQS.map((item, i) => (
                <BlurFade key={item.q} delay={0.05 * i} inView offset={8}>
                  <details className="group border-b border-line py-5 first:border-t">
                    <summary className="cursor-pointer list-none font-sans text-[16px] text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-6">
                        {item.q}
                        <span className="text-muted-foreground group-open:hidden" aria-hidden>
                          +
                        </span>
                        <span className="hidden text-muted-foreground group-open:inline" aria-hidden>
                          −
                        </span>
                      </span>
                    </summary>
                    <p className="mt-3 max-w-2xl font-sans text-[15px] leading-relaxed text-muted-foreground">
                      {item.a}
                    </p>
                  </details>
                </BlurFade>
              ))}
            </div>
          </div>
        </section>

        <section
          className="bg-sage px-6 py-24 text-center sm:px-10 md:py-28 lg:px-14"
          aria-labelledby="cta-heading"
        >
          <BlurFade inView offset={10}>
            <h2
              id="cta-heading"
              className="font-display text-4xl font-medium tracking-[-0.03em] text-ink sm:text-5xl"
            >
              Check your address.
            </h2>
            <p className="mx-auto mt-4 max-w-md font-sans text-[16px] text-ink/70">
              Enter a California home. Get a brief and a checklist for that structure.
            </p>
            <div className="mt-8">
              <Button
                asChild
                className="h-11 rounded-xl bg-ink px-5 font-sans text-[15px] font-medium text-paper shadow-none hover:bg-ink/90"
              >
                <Link to="/app">Check My Address</Link>
              </Button>
            </div>
          </BlurFade>
        </section>
      </main>

      <footer className="bg-canvas px-6 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark compact />
          <p className="font-sans text-xs text-muted-foreground">
            Data: NASA FIRMS · NOAA · Cal Fire
          </p>
        </div>
      </footer>
    </div>
  )
}
