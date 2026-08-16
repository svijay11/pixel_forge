import type { Stat } from '@/data/stats'
import { cn } from '@/lib/utils'

export function StatCard({
  stat,
  tone = 'light',
}: {
  stat: Stat
  tone?: 'light' | 'dark'
}) {
  const dark = tone === 'dark'

  return (
    <article
      className={cn(
        'gsap-card rounded-2xl px-6 py-7',
        dark ? 'bg-slate' : 'border border-line bg-paper',
      )}
    >
      <p
        className={cn(
          'stat-value font-display text-[2rem] font-normal leading-none tracking-tight tabular-nums sm:text-[2.35rem]',
          dark ? 'text-warm' : 'text-ink',
        )}
        data-value={stat.value}
        data-format={stat.format}
        data-suffix={stat.suffix ?? ''}
      >
        0{stat.suffix ?? ''}
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
  )
}
