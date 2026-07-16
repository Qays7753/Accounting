import BottomNav from './BottomNav.jsx'
import UpdatePrompt from '../common/UpdatePrompt.jsx'

export default function AppLayout({ children, showQuickPos = true }) {
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
