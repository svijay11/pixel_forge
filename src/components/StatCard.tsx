import { useEffect, useRef, useState } from 'react'
import { BlurFade } from '@/components/ui/blur-fade'
import { useCountUp } from '@/hooks/useCountUp'
import type { Stat } from '@/data/stats'
import { cn } from '@/lib/utils'

function formatStat(value: number, stat: Stat) {
  const body = stat.format === 'comma' ? value.toLocaleString('en-US') : String(value)
  return `${body}${stat.suffix ?? ''}`
}

export function StatCard({
  stat,
  index,
  tone = 'light',
}: {
  stat: Stat
  index: number
  tone?: 'light' | 'dark'
}) {
  const ref = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)
  const value = useCountUp(stat.value, inView)
  const dark = tone === 'dark'

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <BlurFade delay={0.08 * index} inView offset={12} blur="8px">
      <article
        ref={ref}
        className={cn(
          'rounded-2xl px-6 py-7',
          dark ? 'bg-slate' : 'border border-line bg-paper',
        )}
      >
        <p
          className={cn(
            'font-display text-[2.4rem] font-medium leading-none tracking-tight tabular-nums sm:text-[2.75rem]',
            dark ? 'text-warm' : 'text-ink',
          )}
        >
          {formatStat(value, stat)}
        </p>
        <p
          className={cn(
            'mt-4 font-mono text-[11px] leading-relaxed tracking-[0.08em]',
            dark ? 'text-ash' : 'text-muted-foreground',
          )}
        >
          {stat.caption}
        </p>
        <p className={cn('mt-1.5 font-sans text-xs', dark ? 'text-ash/70' : 'text-muted-foreground/80')}>
          {stat.source}
        </p>
      </article>
    </BlurFade>
  )
}
