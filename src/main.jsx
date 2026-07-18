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

// Register service worker for offline capability.
// A new build stays "waiting" until the user taps the in-app update banner.
const updateSW = registerSW({
  onNeedRefresh() {
    notifyNeedRefresh()
  },
  onOfflineReady() {
    console.log('App ready to work offline.')
  },
})
setUpdater(updateSW)

// Initialize notification service (only if user previously enabled it — checked inside)
initNotificationService()

// Capture the PWA beforeinstallprompt event so Settings can trigger it later
initInstallPromptCapture()

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
