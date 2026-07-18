/**
 * PWA Install Prompt utility.
 *
 * Browsers fire `beforeinstallprompt` when the app is installable but not
 * yet installed. We capture it globally so any component can trigger the
 * install dialog later (e.g. from Settings → "Install App").
 *
 * Also exposes a helper to detect if the app is already running as a
 * standalone PWA (display-mode: standalone or navigator.standalone).
 */

let deferredPrompt = null
const listeners = new Set()

/**
 * Capture the beforeinstallprompt event. Called once from main.jsx on app boot.
 */
export function initInstallPromptCapture() {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault()
    deferredPrompt = e
    listeners.forEach((l) => l(true))
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((l) => l(false))
  })
}

/**
 * Subscribe to install-prompt availability changes.
 * Listener receives `true` when prompt is available, `false` when not.
 * Returns an unsubscribe function.
 */
export function subscribeInstallAvailability(listener) {
  listeners.add(listener)
  // Fire immediately with current state
  listener(!!deferredPrompt)
  return () => listeners.delete(listener)
}

/**
 * Returns true if the app is running as a standalone PWA (installed).
 */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  // iOS Safari
  if (window.navigator.standalone === true) return true
  // Chrome / Edge / Firefox (display-mode)
  return window.matchMedia('(display-mode: standalone)').matches
}

/**
 * Returns true if the browser supports PWA install (deferred prompt available).
 */
export function canInstall() {
  return !!deferredPrompt
}

/**
 * Trigger the native install prompt. Returns a status object.
 * - { ok: true, accepted: true }  → user accepted, app installing
 * - { ok: true, accepted: false } → user dismissed
 * - { ok: false, reason: 'no-prompt' } → not installable (already installed or unsupported)
 * - { ok: false, reason: 'unsupported' } → browser doesn't support beforeinstallprompt
 */
export async function triggerInstall() {
  if (!deferredPrompt) {
    return {
      ok: false,
      reason: isStandalone() ? 'already-installed' : 'unsupported',
    }
  }
  try {
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    deferredPrompt = null
    listeners.forEach((l) => l(false))
    return { ok: true, accepted: choice.outcome === 'accepted' }
  } catch (e) {
    return { ok: false, reason: 'error', error: e.message }
  }
}
