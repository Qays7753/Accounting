import BottomNav from './BottomNav.jsx'

export default function AppLayout({ children, showQuickPos = true }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-24" role="main">
        {children}
      </main>
      <BottomNav showQuickPos={showQuickPos} />
    </div>
  )
}
