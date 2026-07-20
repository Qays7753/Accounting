import BottomNav from './BottomNav.jsx'
import UpdatePrompt from '../common/UpdatePrompt.jsx'
import { useSettings2 } from '../../context/SettingsContext.jsx'

/**
 * AppLayout — shared shell for ALL layers (Daily / Manager / Investor).
 *
 * Every layer gets the same treatment:
 *   - `bg-background` (warm ivory) page surface
 *   - main content padded for BottomNav (`pb-28`)
 *   - `BottomNav` visible at all times (in-app navigation in every layer)
 *   - `UpdatePrompt` for the hybrid PWA update banner
 *
 * The §13 stark-white executive treatment is NOT applied here — it lives
 * INSIDE `/overview` (scoped to that page), per RECON_REPORT §E. Investor
 * no longer hides navigation or forces `bg-white`.
 */
export default function AppLayout({ children }) {
  const { showQuickPos } = useSettings2()

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
