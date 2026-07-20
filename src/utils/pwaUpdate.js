/**
 * Bridge between the PWA service-worker registration (main.jsx) and React.
 * When a new build is waiting, the app shows a friendly "update available"
 * banner; tapping it applies the new service worker and reloads the page.
 */
let updateFn = null
let needRefresh = false
const listeners = new Set()

// Called from main.jsx with the updateSW function returned by registerSW().
export function setUpdater(fn) {
  updateFn = fn
}

// Called from main.jsx onNeedRefresh() when a new version is waiting.
export function notifyNeedRefresh() {
  needRefresh = true
  listeners.forEach((l) => l(true))
}

// Subscribe a React setter; fires immediately if an update is already waiting.
export function subscribe(listener) {
  listeners.add(listener)
  if (needRefresh) listener(true)
  return () => listeners.delete(listener)
}

// Apply the waiting service worker and reload (skipWaiting + reload).
export function applyUpdate() {
  if (updateFn) updateFn(true)
}

/**
 * Hard recovery: unregister every service worker and delete every Cache
 * Storage entry, then reload from the network. This is the escape hatch when a
 * device is stuck on an old, broken cached build (the normal update path can't
 * help if the cached app crashes before the user can act).
 *
 * IMPORTANT: this only clears the HTTP/asset caches. It does NOT touch
 * IndexedDB, so all accounting data (transactions, orders, settings) is safe.
 *
 * @param {boolean} reload - reload the page afterwards (default true)
 */
export async function forceRefreshApp(reload = true) {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})))
    }
  } catch { /* ignore */ }
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})))
    }
  } catch { /* ignore */ }
  if (reload) {
    // Bypass any intermediate cache on the way back in.
    window.location.reload()
  }
}
