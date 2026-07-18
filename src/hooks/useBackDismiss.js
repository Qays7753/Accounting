import { useEffect, useRef, useCallback } from 'react'

/**
 * useBackDismiss — Android/PWA back-button integration for overlay layers.
 *
 * When `open` is true:
 *   1. Push a history state so the back button doesn't leave the page.
 *   2. Listen for `popstate` — when fired, call `onClose` (closes the overlay)
 *      and DO NOT navigate away.
 *
 * When `open` is false:
 *   - Clean up the listener.
 *
 * Multiple overlays: each open overlay pushes its own state. The browser's
 * back button pops the most recent one, triggering that overlay's onClose.
 * Stacking order is naturally handled by the history stack.
 *
 * iOS swipe-back: respected — the pushState + popstate pattern works with
 * the iOS edge-swipe gesture because it triggers the same popstate event.
 *
 * @param {boolean} open   — whether the overlay is currently open
 * @param {Function} onClose — called when back button is pressed while open
 */
export function useBackDismiss(open, onClose) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    // Push a state entry so back-button closes the overlay instead of navigating
    const stateKey = `overlay-${Date.now()}-${Math.random()}`
    window.history.pushState({ overlay: true, key: stateKey }, '')

    const handlePopState = (e) => {
      // Back button pressed while overlay is open → close it (don't navigate)
      onCloseRef.current?.()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      // If the overlay closed via onClose (not via back button), we need to
      // pop the state we pushed. But only if the current state is ours.
      // Using setTimeout to avoid race conditions with React's state updates.
      setTimeout(() => {
        if (window.history.state?.overlay && window.history.state.key === stateKey) {
          window.history.back()
        }
      }, 0)
    }
  }, [open])
}

/**
 * useExitConfirm — "press back again to exit" pattern for the root/home page.
 *
 * When active (on the home route), pressing back shows a toast/snackbar
 * telling the user to press again within 2 seconds to actually exit.
 * If they press back again within the window, the app exits (or navigates
 * away). If they don't, the prompt resets.
 *
 * @param {boolean} active — whether this hook should intercept back button
 * @param {Function} onPrompt — called when first back press happens (show toast)
 * @param {Function} onExit — called when second back press happens (actually exit)
 * @param {number} timeoutMs — window for second press (default 2000)
 */
export function useExitConfirm(active, onPrompt, onExit, timeoutMs = 2000) {
  const pressedOnceRef = useRef(false)
  const timeoutRef = useRef(null)
  const onPromptRef = useRef(onPrompt)
  const onExitRef = useRef(onExit)
  onPromptRef.current = onPrompt
  onExitRef.current = onExit

  useEffect(() => {
    if (!active) return

    const handlePopState = () => {
      if (pressedOnceRef.current) {
        // Second press within window → actually exit
        pressedOnceRef.current = false
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        onExitRef.current?.()
      } else {
        // First press → push state again so we stay, show prompt
        pressedOnceRef.current = true
        window.history.pushState({ exitConfirm: true }, '')
        onPromptRef.current?.()
        timeoutRef.current = setTimeout(() => {
          pressedOnceRef.current = false
        }, timeoutMs)
      }
    }

    // Push initial state so back button is intercepted
    window.history.pushState({ exitConfirm: true }, '')
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [active, timeoutMs])
}
