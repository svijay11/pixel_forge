import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

export function useCountUp(target: number, enabled: boolean, duration = 1400) {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!enabled) return
    if (reduced) {
      setValue(target)
      return
    }

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      setValue(Math.round(target * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [enabled, target, reduced, duration])

  return value
}
