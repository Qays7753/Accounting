import BottomNav from './BottomNav.jsx'
import UpdatePrompt from '../common/UpdatePrompt.jsx'
import { useSettings2 } from '../../context/SettingsContext.jsx'

export default function AppLayout({ children }) {
  const { showQuickPos } = useSettings2()
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-28" role="main">
        {children}
      </main>
      <UpdatePrompt />
      <BottomNav showQuickPos={showQuickPos} />
    </div>
  )
}
