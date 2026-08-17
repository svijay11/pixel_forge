import { useEffect, useState } from 'react'
import { WAIT_JOKES } from '@/data/waitJokes'
import { cn } from '@/lib/utils'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function FlipFace({
  value,
  label,
  className,
  compact = false,
}: {
  value: string
  label?: string
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'relative flex flex-1 items-center justify-center overflow-hidden',
        compact ? 'min-h-[5.75rem] sm:min-h-[7.25rem]' : 'min-h-[7.5rem] sm:min-h-[9.5rem]',
        className,
      )}
      style={{ perspective: '900px' }}
    >
      <span
        key={value}
        className={cn(
          'wait-flip font-sans font-medium leading-none tracking-[-0.04em] text-[#d8d8d8]',
          compact
            ? 'text-[3.6rem] sm:text-[4.75rem]'
            : 'text-[4.6rem] sm:text-[6.25rem]',
        )}
      >
        {value}
      </span>
      {label ? (
        <span className="absolute bottom-3 left-4 font-sans text-[11px] font-medium tracking-[0.14em] text-[#9a9a9a] sm:bottom-4 sm:left-5 sm:text-[12px]">
          {label}
        </span>
      ) : null}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-black/55"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent"
      />
    </div>
  )
}

export function WaitClock({
  className,
  tone = 'light',
}: {
  className?: string
  tone?: 'light' | 'onDark'
}) {
  const [elapsed, setElapsed] = useState(0)
  const [jokeIndex, setJokeIndex] = useState(0)

  useEffect(() => {
    const started = Date.now()
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setJokeIndex((i) => (i + 1) % WAIT_JOKES.length)
    }, 4800)
    return () => window.clearInterval(id)
  }, [])

  const minutes = pad2(Math.min(Math.floor(elapsed / 60), 99))
  const seconds = pad2(elapsed % 60)
  const onDark = tone === 'onDark'

  return (
    <div className={cn('w-full max-w-[34rem]', className)}>
      <div
        className="flex overflow-hidden rounded-[28px] bg-[#111111] shadow-[0_24px_60px_rgba(17,17,17,0.28)]"
        role="timer"
        aria-live="polite"
        aria-label={`Elapsed ${minutes} minutes ${seconds} seconds`}
      >
        <FlipFace value={minutes} label="MIN" compact={onDark} />
        <div aria-hidden className="w-px shrink-0 bg-black/70" />
        <FlipFace value={seconds} label="SEC" compact={onDark} />
      </div>
      <p
        key={jokeIndex}
        className={cn(
          'wait-joke mt-8 min-h-[3.5rem] text-center font-sans text-[16px] leading-relaxed sm:text-[17px]',
          onDark ? 'text-[#c5c5c5]' : 'text-[#555555]',
        )}
      >
        {WAIT_JOKES[jokeIndex]}
      </p>
    </div>
  )
}
