import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { hapticLight } from '../../utils/haptics.js'
import { useHelperMode } from '../../context/HelperModeContext.jsx'
import PinEntrySheet from '../sheets/PinEntrySheet.jsx'

const allNavItems = [
  {
    to: '/',
    label: 'الرئيسية',
    icon: (active) => (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/finance',
    label: 'المالية',
    icon: (active) => (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: '/pos',
    label: 'البيع',
    icon: (active) => (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    to: '/orders',
    label: 'الطلبات',
    icon: (active) => (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    to: '/debts',
    label: 'الديون',
    icon: (active) => (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M21 12a2 2 0 00-2-2h-6a2 2 0 100 4h6a2 2 0 002-2z" />
      </svg>
    ),
  },
  {
    to: '/reports',
    label: 'التقارير',
    icon: (active) => (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'الإعدادات',
    icon: (active) => (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

// V4 Phase 2: Helper Mode only shows POS and Orders
const helperNavItems = allNavItems.filter(item => item.to === '/pos' || item.to === '/orders')

export default function BottomNav({ showQuickPos = true }) {
  const { isHelperMode, verifyPin } = useHelperMode()
  const [pinSheetOpen, setPinSheetOpen] = useState(false)

  // Filter nav items based on settings and mode
  let navItems = allNavItems
  if (isHelperMode) {
    navItems = helperNavItems
  } else if (!showQuickPos) {
    navItems = allNavItems.filter(item => item.to !== '/pos')
  }

  const handleLockClick = () => {
    hapticLight()
    setPinSheetOpen(true)
  }

  const handleVerify = async (pin) => {
    const correct = await verifyPin(pin)
    if (correct) {
      setPinSheetOpen(false)
    }
    return correct
  }

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 bg-surface border-t border-divider z-30 safe-area-bottom" aria-label="التنقل الرئيسي">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => hapticLight()}
              aria-label={item.label}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-colors min-w-[48px] ${
                  isActive ? 'tab-active' : 'tab-inactive'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.icon(isActive)}
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* V4 Phase 2: Lock icon (Helper Mode exit) */}
          {isHelperMode && (
            <button
              type="button"
              onClick={handleLockClick}
              className="flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-colors min-w-[48px] text-expense-600"
              aria-label="الخروج من وضع المساعد"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-[10px] font-medium">خروج</span>
            </button>
          )}
        </div>
      </nav>

      {/* V4 Phase 2: PIN Entry Sheet for exiting Helper Mode */}
      <PinEntrySheet
        open={pinSheetOpen}
        onClose={() => setPinSheetOpen(false)}
        onVerify={handleVerify}
      />
    </>
  )
}
