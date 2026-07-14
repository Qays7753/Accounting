import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav.jsx'

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
