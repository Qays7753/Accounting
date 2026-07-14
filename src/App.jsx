import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { db } from './db'
import AppLayout from './components/layout/AppLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import FinancePage from './pages/FinancePage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import BackupReminderBanner from './components/common/BackupReminderBanner.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import { checkBackupReminder } from './utils/backup.js'

function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null) // null = loading
  const [backupReminder, setBackupReminder] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    async function init() {
      try {
        const onboarded = await db.getMeta('onboarded', false)
        setIsFirstLaunch(!onboarded)

        // Check backup reminder on app open (proactive)
        if (onboarded) {
          const reminder = await checkBackupReminder()
          setBackupReminder(reminder)
        }
      } catch (e) {
        console.error('Failed to check first launch:', e)
        setIsFirstLaunch(true)
      }
    }
    init()
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
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default App
