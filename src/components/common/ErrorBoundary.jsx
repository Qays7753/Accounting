import React from 'react'
import { forceRefreshApp } from '../../utils/pwaUpdate.js'

/**
 * Error Boundary - catches unhandled render errors and shows a friendly
 * message. Critically, recovery clears the service-worker + asset caches
 * (NOT the database) and reloads from the network — so a device stuck on an
 * old, broken cached build can actually escape it. The previous version just
 * navigated to '/', which reloaded the very same cached bundle and re-crashed.
 */

// Errors that mean "a code chunk failed to load" — almost always a stale cache
// after a new deploy. Safe to auto-recover from once.
function isLoadError(error) {
  const msg = String(error?.message || error || '')
  const name = String(error?.name || '')
  return (
    name === 'ChunkLoadError' ||
    /Loading (chunk|CSS chunk)/i.test(msg) ||
    /dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Failed to fetch dynamically/i.test(msg)
  )
}

const AUTO_HEAL_KEY = 'eb_auto_heal_attempt'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, recovering: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App error:', error, errorInfo)

    // Auto-recover once for stale-chunk crashes: clear caches + reload without
    // the user having to do anything. Guarded so it can never loop.
    let alreadyTried = false
    try { alreadyTried = !!sessionStorage.getItem(AUTO_HEAL_KEY) } catch { /* ignore */ }
    if (isLoadError(error) && !alreadyTried) {
      try { sessionStorage.setItem(AUTO_HEAL_KEY, '1') } catch { /* ignore */ }
      this.setState({ recovering: true })
      forceRefreshApp(true)
    }
  }

  handleReset = async () => {
    this.setState({ recovering: true })
    // Clear the cached (possibly broken) build, then reload fresh from network.
    await forceRefreshApp(true)
  }

  render() {
    if (this.state.hasError) {
      const { recovering } = this.state
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-expense-50 flex items-center justify-center">
              <svg className="w-10 h-10 text-expense-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-2">حدث خطأ غير متوقع</h1>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              نعتذر عن هذا الخطأ. بياناتك آمنة ومحفوظة على الجهاز. سنحدّث التطبيق إلى أحدث نسخة للمتابعة.
            </p>
            <button onClick={this.handleReset} disabled={recovering} className="btn-primary w-full disabled:opacity-70">
              {recovering ? 'جارٍ التحديث…' : 'تحديث التطبيق وإعادة التشغيل'}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
