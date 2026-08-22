import { cn } from '@/lib/utils'

const GLYPHS = '××××××××××××××××××××××××××××'

export function GlyphBar({
  value,
  accent = false,
}: {
  value: number
  accent?: boolean
}) {
  const width = Math.max(6, Math.min(100, value))
  return (
    <div className={cn('glyph-bar', accent && 'glyph-bar-accent')} aria-hidden>
      <span className="glyph-bar-track">{GLYPHS}</span>
      <span className="glyph-bar-fill" data-fill={width}>
        {GLYPHS}
      </span>
    </div>
  )
}
