import { useState, useEffect, useRef } from 'react'

/**
 * useCountUp — animates a number from old value to new value over 500ms.
 * Uses requestAnimationFrame for smooth 60fps animation.
 * 
 * @param {number} target — the final value to animate to
 * @param {number} duration — animation duration in ms (default 500)
 * @returns {number} — the current animated value
 */
export function useCountUp(target, duration = 500) {
  const [value, setValue] = useState(target)
  const startValueRef = useRef(target)
  const rafRef = useRef(null)
  const startTimeRef = useRef(0)

  useEffect(() => {
    if (target === value) return

    startValueRef.current = value
    startTimeRef.current = performance.now()

    const animate = (currentTime) => {
      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValueRef.current + (target - startValueRef.current) * eased
      
      setValue(Math.round(current))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setValue(target)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration]) // eslint-disable-line react-hooks/exhaustive-deps

  return value
}
