import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import { TermsProvider } from './context/TermsContext.jsx'
import './styles/index.css'
import { registerSW } from 'virtual:pwa-register'
import { initNotificationService } from './utils/notifications.js'
import { setUpdater, notifyNeedRefresh } from './utils/pwaUpdate.js'
import { initInstallPromptCapture } from './utils/pwaInstall.js'
import { requestPersistentStorage } from './utils/storage.js'
import { preloadGoogleAuth } from './utils/googleDrive.js'

// ── Service worker / update strategy ───────────────────────────────────────
// Hybrid update model:
//   • Foreground (app open & visible): show a non-disruptive banner and let the
//     user tap "تحديث" — we never reload mid-task, so no unsaved form is lost.
//   • Background (app hidden / next cold launch): apply the update silently so
//     the user always comes back to the newest version.
// We also actively poll for a new build (periodically + whenever the app is
// resumed), because a long-open PWA otherwise only checks on navigation and can
// stay stuck on an old build for a long time.
let hasPendingUpdate = false

const updateSW = registerSW({
  onNeedRefresh() {
    hasPendingUpdate = true
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      // App is open in front of the user → ask, don't interrupt.
      notifyNeedRefresh()
    } else {
      // App is in the background → update now, silently.
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline.')
  },
  onRegisteredSW(swUrl, registration) {
    if (!registration) return
    const check = () => registration.update().catch(() => {})
    // Poll every 30 minutes while the app stays open.
    setInterval(check, 30 * 60 * 1000)
    // And check immediately whenever the app regains focus.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
  },
})

// If a fresh build is waiting and the user sends the app to the background,
// apply it right then so the next time they open it, it's already updated.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && hasPendingUpdate) {
    updateSW(true)
  }
})

setUpdater(updateSW)

// Initialize notification service (only if user previously enabled it — checked inside)
initNotificationService()

// Capture the PWA beforeinstallprompt event so Settings can trigger it later
initInstallPromptCapture()

// Ask the browser to keep the local DB persistent (best-effort) — reduces the
// risk of iOS Safari evicting accounting data after a period of inactivity.
requestPersistentStorage()

// Warm up Google auth so the sign-in popup can open synchronously on click
// (iOS Safari blocks popups opened after an await).
preloadGoogleAuth()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <TermsProvider>
          <App />
        </TermsProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
