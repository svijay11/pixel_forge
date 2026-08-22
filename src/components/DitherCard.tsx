import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DitherCard({
  icon: Icon,
  title,
  body,
  dither,
}: {
  icon: LucideIcon
  title: string
  body: string
  dither: 'fade' | 'wave' | 'bloom'
}) {
  return (
    <article className="gsap-rise relative flex min-h-[280px] flex-col overflow-hidden rounded-[16px] border border-line bg-paper px-7 pb-32 pt-7 shadow-[0_10px_30px_rgba(23,23,23,0.045)]">
      <div className="flex items-center gap-2.5">
        <Icon className="size-[18px] text-sage-monitor" strokeWidth={1.75} aria-hidden />
        <h3 className="font-display text-[1.15rem] font-bold tracking-[-0.01em] text-ink">{title}</h3>
      </div>
      <p className="mt-4 max-w-[34ch] font-sans text-[14px] leading-relaxed text-ash">{body}</p>
      <div className={cn('ember-dither', `ember-dither-${dither}`)} aria-hidden />
    </article>
  )
}
