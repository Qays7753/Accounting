import { useEffect, useRef } from 'react'

/**
 * useBackDismiss — Android/PWA back-button integration for overlay layers.
 *
 * N4 fix: single-path dismiss. No setTimeout race.
 *
 * When `open` is true:
 *   1. Push a history state so the back button doesn't leave the page.
 *   2. Listen for `popstate` → call `onClose` (the ONLY path that closes).
 *
 * When the sheet closes via button/overlay tap (NOT via back button):
 *   - `onClose` is called by the component, which sets `open=false`.
 *   - The cleanup function fires. We call `history.back()` ONCE to pop
 *     the state we pushed. The `popstate` handler sees `isClosing=true`
 *     and does NOT call `onClose` again (double-close guard).
 *
 * When the sheet closes via back button:
 *   - `popstate` fires naturally. The handler calls `onClose`.
 *   - `open` becomes false. Cleanup fires. The state was already popped
 *     by the browser, so we do NOT call `history.back()` again.
 *
 * @param {boolean} open   — whether the overlay is currently open
 * @param {Function} onClose — called when back button is pressed while open
 */
export function useBackDismiss(open, onClose) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const stateKeyRef = useRef(null)
  const isClosingRef = useRef(false)  // guard against double-close

  useEffect(() => {
    if (!open) return

    // Reset guard on open
    isClosingRef.current = false

    // Push a state entry so back-button closes the overlay instead of navigating
    const stateKey = `overlay-${Date.now()}-${Math.random()}`
    stateKeyRef.current = stateKey
    window.history.pushState({ overlay: true, key: stateKey }, '')

    const handlePopState = () => {
      // If we initiated this popstate (via history.back in cleanup),
      // don't call onClose again — it's already been called.
      if (isClosingRef.current) {
        isClosingRef.current = false
        return
      }
      // Back button pressed naturally → close the overlay
      onCloseRef.current?.()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      // If the overlay closed via onClose (not via back button), we need to
      // pop the state we pushed. Set guard so popstate handler doesn't
      // call onClose again.
      if (stateKeyRef.current && window.history.state?.overlay && window.history.state.key === stateKeyRef.current) {
        isClosingRef.current = true
        window.history.back()
      }
      stateKeyRef.current = null
    }
  }, [open])
}

/**
 * useExitConfirm — "press back again to exit" pattern for the root/home page.
 *
 * When active (on the home route), pressing back shows a toast
 * telling the user to press again within 2 seconds to actually exit.
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
