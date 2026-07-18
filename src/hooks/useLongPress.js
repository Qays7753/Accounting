import { useRef, useCallback } from 'react'
import { hapticMedium } from '../utils/haptics.js'

/**
 * useLongPress — long-press handler for mobile (replaces double-click).
 *
 * Triggers `onLongPress` after `delay` ms of continuous press.
 * If the user releases before the delay, `onShortPress` fires instead.
 * Cancels if the pointer moves more than 10px (treats it as a scroll/drag).
 *
 * Usage:
 *   const longPressProps = useLongPress({
 *     onLongPress: () => openDeleteConfirm(product),
 *     onShortPress: () => handleAddToCart(product),
 *   })
 *   <button {...longPressProps}>...</button>
 *
 * @param {Object} opts
 * @param {Function} opts.onLongPress — called after delay ms
 * @param {Function} opts.onShortPress — called on quick release (optional)
 * @param {number} opts.delay — ms threshold (default 500)
 */
export function useLongPress({ onLongPress, onShortPress, delay = 500 }) {
  const timerRef = useRef(null)
  const triggeredRef = useRef(false)
  const startPosRef = useRef({ x: 0, y: 0 })

  const start = useCallback((e) => {
    triggeredRef.current = false
    startPosRef.current = { x: e.clientX, y: e.clientY }
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true
      hapticMedium()
      onLongPress?.()
    }, delay)
  }, [onLongPress, delay])

  const move = useCallback((e) => {
    if (!timerRef.current) return
    const dx = Math.abs(e.clientX - startPosRef.current.x)
    const dy = Math.abs(e.clientY - startPosRef.current.y)
    // Cancel if moved more than 10px (scroll/drag, not a press)
    if (dx > 10 || dy > 10) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const end = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!triggeredRef.current && onShortPress) {
      onShortPress()
    }
  }, [onShortPress])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return {
    onPointerDown: start,
    onPointerMove: move,
    onPointerUp: end,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  }
}
