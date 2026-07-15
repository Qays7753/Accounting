import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import { db } from './db'
import AppLayout from './components/layout/AppLayout.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import BackupReminderBanner from './components/common/BackupReminderBanner.jsx'
import { checkBackupReminder } from './utils/backup.js'
import { applyThemeFromDB } from './utils/theme.js'
import { HelperModeProvider, useHelperMode } from './context/HelperModeContext.jsx'

// Lazy-load route components for faster initial load.
const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const FinancePage = lazy(() => import('./pages/FinancePage.jsx'))
const OrdersPage = lazy(() => import('./pages/OrdersPage.jsx'))
const DebtsPage = lazy(() => import('./pages/DebtsPage.jsx'))
const QuickPosPage = lazy(() => import('./pages/QuickPosPage.jsx'))
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'))
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppRoutes() {
  const { isHelperMode } = useHelperMode()
  const navigate = useNavigate()

  // V4 Phase 2: Helper Mode restricts navigation
  // Staff can only access Quick POS and Orders (add only, no edit/delete)
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

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/debts" element={<DebtsPage />} />
        <Route path="/pos" element={<QuickPosPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null)
  const [backupReminder, setBackupReminder] = useState(null)
  const [showQuickPos, setShowQuickPos] = useState(true)
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

          try {
            await applyThemeFromDB()
          } catch (e) {
            console.error('Theme application failed:', e)
          }

          const reminder = await checkBackupReminder()
          if (!cancelled) setBackupReminder(reminder)

          // V4 Phase 2: Load Quick POS visibility setting
          const posVisible = await db.getShowQuickPos()
          if (!cancelled) setShowQuickPos(posVisible)
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
    <AppLayout showQuickPos={showQuickPos}>
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
      <App />
    </HelperModeProvider>
  )
}
