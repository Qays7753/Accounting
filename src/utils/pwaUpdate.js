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
