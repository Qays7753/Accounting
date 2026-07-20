import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import { db } from './db'
import AppLayout from './components/layout/AppLayout.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import BackupReminderBanner from './components/common/BackupReminderBanner.jsx'
import { checkBackupReminder } from './utils/backup.js'
import { HelperModeProvider, useHelperMode } from './context/HelperModeContext.jsx'
import { TermsProvider } from './context/TermsContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { CloudSyncProvider } from './context/CloudSyncContext.jsx'

/**
 * Lazy import with stale-chunk recovery.
 *
 * After a new version is deployed, a device holding a cached index.html may
 * try to load a JS chunk whose hashed filename no longer exists. The dynamic
 * import then rejects and, without handling, crashes the app to the error
 * boundary ("حدث خطأ غير متوقع"). Here we reload the page ONCE (guarded by a
 * sessionStorage flag) so the browser fetches the fresh assets. A successful
 * load clears the flag, so a later deploy can recover the same way.
 */
const CHUNK_RELOAD_KEY = 'chunk_reload_attempt'

function lazyWithReload(factory) {
  return lazy(() =>
    factory()
      .then((mod) => {
        try { sessionStorage.removeItem(CHUNK_RELOAD_KEY) } catch { /* ignore */ }
        return mod
      })
      .catch((err) => {
        let alreadyTried = false
        try { alreadyTried = !!sessionStorage.getItem(CHUNK_RELOAD_KEY) } catch { /* ignore */ }
        if (!alreadyTried) {
          try { sessionStorage.setItem(CHUNK_RELOAD_KEY, '1') } catch { /* ignore */ }
          window.location.reload()
          // Keep the loader on screen while the page reloads.
          return new Promise(() => {})
        }
        // Already reloaded once and it still failed — surface the real error.
        throw err
      })
  )
}

// Lazy-load route components for faster initial load.
const HomePage = lazyWithReload(() => import('./pages/HomePage.jsx'))
const FinancePage = lazyWithReload(() => import('./pages/FinancePage.jsx'))
const OrdersPage = lazyWithReload(() => import('./pages/OrdersPage.jsx'))
const DebtsPage = lazyWithReload(() => import('./pages/DebtsPage.jsx'))
const QuickPosPage = lazyWithReload(() => import('./pages/QuickPosPage.jsx'))
const ReportsPage = lazyWithReload(() => import('./pages/ReportsPage.jsx'))
const SettingsPage = lazyWithReload(() => import('./pages/SettingsPage.jsx'))
const InventoryPage = lazyWithReload(() => import('./pages/InventoryPage.jsx'))
const OverviewPage = lazyWithReload(() => import('./pages/OverviewPage.jsx'))
// InvestorDashboard.jsx stays in the codebase as the migration source for
// Agent 5 (its content will be lifted into OverviewPage). It is no longer
// mounted as a full-app replacement — all layers use the normal router
// below and can navigate to every operational route plus /overview.

function PageLoader() {
  return (
    <div className="px-4 py-6 space-y-3">
      {/* Skeleton: card-shaped placeholder matching real content */}
      <div className="bg-surface rounded-card p-4 shadow-card">
        <div className="h-4 w-1/3 bg-divider rounded animate-pulse mb-3" />
        <div className="h-8 w-2/3 bg-divider rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-card p-4 shadow-card">
          <div className="h-4 w-1/2 bg-divider rounded animate-pulse mb-2" />
          <div className="h-6 w-3/4 bg-mute rounded animate-pulse" />
        </div>
        <div className="bg-surface rounded-card p-4 shadow-card">
          <div className="h-4 w-1/2 bg-divider rounded animate-pulse mb-2" />
          <div className="h-6 w-3/4 bg-mute rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { isHelperMode } = useHelperMode()
  const navigate = useNavigate()

  // Helper Mode restricts navigation
  if (isHelperMode) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/pos" element={<QuickPosPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </Suspense>
    )
  }

  // All layers (Daily / Manager / Investor) share the SAME router and have
  // access to every operational route PLUS /overview. Investor is no longer
  // an exclusive full-screen swap — it keeps full navigation and operational
  // input. The §13 executive treatment lives INSIDE /overview (scoped), not
  // at the layout level.
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/debts" element={<DebtsPage />} />
        <Route path="/pos" element={<QuickPosPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null)
  const [backupReminder, setBackupReminder] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const onboarded = await db.getMeta('onboarded', false)
        if (cancelled) return
        setIsFirstLaunch(!onboarded)

        if (onboarded) {
          try {
            const generated = await db.processDueRecurringTransactions()
            if (generated > 0) {
              console.log(`V2: Auto-generated ${generated} recurring transaction(s)`)
            }
          } catch (e) {
            console.error('Recurring transaction processing failed:', e)
          }

          const reminder = await checkBackupReminder()
          if (!cancelled) setBackupReminder(reminder)
        }
      } catch (e) {
        console.error('Failed to check first launch:', e)
        if (!cancelled) setIsFirstLaunch(true)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  if (isFirstLaunch === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <p className="text-text-secondary">جار التحميل...</p>
        </div>
      </div>
    )
  }

  if (isFirstLaunch) {
    return <OnboardingPage onComplete={() => setIsFirstLaunch(false)} />
  }

  return (
    <AppLayout>
      {backupReminder && (
        <BackupReminderBanner
          reminder={backupReminder}
          onDismiss={() => setBackupReminder(null)}
          onBackupNow={() => {
            navigate('/settings')
            setBackupReminder(null)
          }}
        />
      )}
      <AppRoutes />
    </AppLayout>
  )
}

export default function AppWithHelperMode() {
  return (
    <HelperModeProvider>
      <SettingsProvider>
        <TermsProvider>
          <CloudSyncProvider>
            <App />
          </CloudSyncProvider>
        </TermsProvider>
      </SettingsProvider>
    </HelperModeProvider>
  )
}
