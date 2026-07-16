import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import './styles/index.css'
import { registerSW } from 'virtual:pwa-register'
import { initNotificationService } from './utils/notifications.js'
import { setUpdater, notifyNeedRefresh } from './utils/pwaUpdate.js'

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

// Initialize notification service
initNotificationService()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
