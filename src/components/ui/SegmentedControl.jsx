import { useLayoutEffect, useRef, useState } from 'react'
import { hapticLight } from '../../utils/haptics.js'

/**
 * SegmentedControl — shared primitive for tab/filter switching.
 *
 * Replaces the 3 hand-rolled segmented controls (FinancePage 4-col,
 * ReportsPage 5-col, OrdersPage underline-tabs).
 *
 * Variants:
 *   - 'pill'     : sliding terracotta thumb inside an ivory track (SOP §7.3)
 *   - 'underline': bottom border indicator (SOP §7.3 alt — for status filters)
 *
 * Both variants share: track bg-mute, segment gap, hapticLight on click,
 * active = terracotta text + bold, inactive = ink-secondary + semibold.
 *
 * Props:
 *   segments : Array<{ id: string, label: string, badge?: string|number }>
 *   value    : string  (currently active segment id)
 *   onChange : (id) => void
 *   variant  : 'pill' | 'underline'   (default 'pill')
 *   className: extra classes for the track container
 */
export default function SegmentedControl({
  segments = [],
  value,
  onChange,
  variant = 'pill',
  className = '',
}) {
  const containerRef = useRef(null)
  const segmentRefs = useRef([])
  const [thumb, setThumb] = useState({ right: 0, width: 0 })

  // Compute sliding thumb position for 'pill' variant (RTL: right-offset)
  useLayoutEffect(() => {
    if (variant !== 'pill') return
    const activeIndex = Math.max(0, segments.findIndex((s) => s.id === value))
    const el = segmentRefs.current[activeIndex]
    const container = el?.parentElement
    if (el && container) {
      // In RTL, 'right' is the visual left edge from the right side
      const right = container.getBoundingClientRect().right - el.getBoundingClientRect().right
      setThumb({ right, width: el.offsetWidth })
    }
  }, [value, segments, variant])

  const handleClick = (id) => {
    hapticLight()
    onChange(id)
  }

  if (variant === 'underline') {
    return (
      <div className={`relative ${className}`}>
        <div className="flex gap-5 border-b border-divider overflow-x-auto hide-scrollbar">
          {segments.map((seg, i) => {
            const on = seg.id === value
            return (
              <button
                key={seg.id}
                ref={(el) => (segmentRefs.current[i] = el)}
                type="button"
                onClick={() => handleClick(seg.id)}
                className={`relative flex-none pb-2.5 flex items-center gap-1.5 text-sm whitespace-nowrap transition-colors ${
                  on ? 'text-ink font-bold' : 'text-faint font-semibold'
                }`}
              >
                {seg.label}
                {seg.badge !== undefined && (
                  <span className={`tnum text-caption font-bold px-1.5 py-px rounded-full ${on ? 'bg-primary text-white' : 'bg-mute text-faint'}`}>
                    {seg.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {/* Sliding underline indicator */}
        {thumb.width > 0 && (
          <div
            className="absolute bottom-0 h-1 bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ right: thumb.right, width: thumb.width }}
          />
        )}
      </div>
    )
  }

  // Default: 'pill' variant — sliding terracotta thumb inside ivory track
  const cols = segments.length
  return (
    <div className={`relative grid bg-mute rounded-segment p-1 ${className}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {/* Sliding thumb (RTL: positioned by 'right') */}
      {thumb.width > 0 && (
        <div
          className="absolute top-1 bottom-1 rounded-12 bg-primary shadow-sm transition-all duration-300 ease-out"
          style={{ right: `calc(${thumb.right}px)`, width: `calc(${thumb.width}px)` }}
        />
      )}
      {segments.map((seg, i) => {
        const on = seg.id === value
        return (
          <button
            key={seg.id}
            ref={(el) => (segmentRefs.current[i] = el)}
            type="button"
            onClick={() => handleClick(seg.id)}
            className={`relative z-10 py-2 text-sm transition-colors ${
              on ? 'text-white font-bold' : 'text-sub font-semibold'
            }`}
          >
            {seg.label}
          </button>
        )
      })}
    </div>
  )
}
