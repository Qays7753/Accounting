import BottomNav from './BottomNav.jsx'
import UpdatePrompt from '../common/UpdatePrompt.jsx'
import { useSettings2 } from '../../context/SettingsContext.jsx'
import { useIsInvestorMode } from '../../context/TermsContext.jsx'

export default function AppLayout({ children }) {
  const { showQuickPos } = useSettings2()
  const isInvestor = useIsInvestorMode()

  // Investor mode: hide BottomNav, full-width layout, stark white bg
  if (isInvestor) {
    return (
      <div className="min-h-screen bg-white transition-colors duration-400">
        <main role="main">
          {children}
        </main>
        <UpdatePrompt />
      </div>
    )
  }

  // Daily / Manager mode: normal layout with BottomNav + FAB
  return (
    <div className="min-h-screen bg-background transition-colors duration-400">
      <main className="pb-28" role="main">
        {children}
      </main>
      <UpdatePrompt />
      <BottomNav showQuickPos={showQuickPos} />
    </div>
  )
}
