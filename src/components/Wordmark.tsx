import { Link } from 'react-router-dom'

function EmberMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <rect x="1" y="1" width="6" height="6" fill="#FF7A3D" />
      <rect x="8" y="2" width="6" height="6" fill="#FF9A63" />
      <rect x="3" y="8" width="6" height="6" fill="#E25A20" />
      <rect x="10" y="10" width="5" height="5" fill="#FF7A3D" />
    </svg>
  )
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      aria-label="Ember home"
    >
      <EmberMark className={compact ? 'h-6 w-6' : 'h-8 w-8'} />
      <span
        className={`font-display font-medium tracking-[-0.03em] text-ink ${
          compact ? 'text-2xl' : 'text-[2rem] leading-none sm:text-[2.15rem]'
        }`}
      >
        Ember
      </span>
    </Link>
  )
}
