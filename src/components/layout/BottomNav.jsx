import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { hapticLight } from '../../utils/haptics.js'
import { useHelperMode } from '../../context/HelperModeContext.jsx'
import { useTerms } from '../../context/TermsContext.jsx'
import PinEntrySheet from '../sheets/PinEntrySheet.jsx'

// V5: 4 tabs by default. When showQuickPos=true, a 5th "Quick POS" tab is appended.
const navItems = [
  {
    to: '/',
    label: 'nav_home',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        {active ? (
          <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69zM12 5.432l8.159 8.159c.03.03.058.06.086.091v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.086-.091L12 5.432z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.5a.75.75 0 00.75.75h4.5a.75.75 0 00.75-.75V18a2.25 2.25 0 014.5 0v1.5a.75.75 0 00.75.75h4.5a.75.75 0 00.75-.75V9.75M8.25 21h8.25" />
        )}
      </svg>
    ),
  },
  {
    to: '/finance',
    label: 'nav_finance',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        {active ? (
          <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 00-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12a1.875 1.875 0 01-1.865 2.071H5.498a1.875 1.875 0 01-1.865-2.071l1.263-12c.066-.656.617-1.157 1.276-1.157h11.239c.659 0 1.21.501 1.276 1.157z" />
        )}
      </svg>
    ),
  },
  {
    to: '/orders',
    label: 'nav_orders',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        {active ? (
          <path fillRule="evenodd" d="M3 6.75A2.75 2.75 0 015.75 4h12.5A2.75 2.75 0 0121 6.75v10.5A2.75 2.75 0 0118.25 20H5.75A2.75 2.75 0 013 17.25V6.75zm3.5 1.5a.75.75 0 000 1.5h11a.75.75 0 000-1.5h-11zm0 4a.75.75 0 000 1.5h11a.75.75 0 000-1.5h-11zm0 4a.75.75 0 000 1.5h7a.75.75 0 000-1.5h-7z" clipRule="evenodd" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        )}
      </svg>
    ),
  },
  {
    to: '/pos',
    label: 'quick_sale',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        {active ? (
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm1.5 4.5a.75.75 0 00-1.5 0v1.5H9a.75.75 0 000 1.5h3v.75a3 3 0 11-3 3 .75.75 0 011.5 0 1.5 1.5 0 103-1.5V9.75h.75a.75.75 0 000-1.5H13.5v-1.5z" clipRule="evenodd" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a7.5 7.5 0 0014.646-2.31M19.5 12a7.5 7.5 0 00-7.5-7.5M19.5 12a7.5 7.5 0 01-7.5 7.5M19.5 12h-3m3 0V9m0 3v3M12 3v2.25m0 13.5V21M3 12h2.25m13.5 0H21M5.636 5.636l1.591 1.591m9.728 0l1.591-1.591M5.636 18.364l1.591-1.591m9.728 0l1.591 1.591" />
        )}
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'nav_settings',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        {active ? (
          <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
        ) : (
          <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </>
        )}
      </svg>
    ),
  },
]

// Helper Mode: only POS and Orders
const helperNavItems = navItems.filter(item => item.to === '/orders')

export default function BottomNav({ showQuickPos = true }) {
  const { isHelperMode, verifyPin } = useHelperMode()
  const t = useTerms()
  const [pinSheetOpen, setPinSheetOpen] = useState(false)

  // Filter out the Quick POS tab when disabled in settings
  const allItems = showQuickPos ? navItems : navItems.filter(item => item.to !== '/pos')
  const items = isHelperMode ? helperNavItems : allItems

  const handleLockClick = () => {
    hapticLight()
    setPinSheetOpen(true)
  }

  const handleVerify = async (pin) => {
    const correct = await verifyPin(pin)
    if (correct) setPinSheetOpen(false)
    return correct
  }

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 bg-surface px-3 pt-2 pb-4 flex justify-around items-center z-40 safe-area-bottom border-t border-border" style={{ minHeight: '64px' }} aria-label="التنقل الرئيسي">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => hapticLight()}
            aria-label={item.label}
            className="flex flex-col items-center gap-1 w-16"
          >
            {({ isActive }) => (
              <>
                <div
                  className={`w-[52px] h-8 rounded-pill grid place-items-center transition-colors ${isActive ? 'bg-primary-tint' : ''}`}
                >
                  <span className={isActive ? 'text-primary' : 'text-disabled'}>
                    {item.icon(isActive)}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-semibold transition-colors ${isActive ? 'text-primary' : 'text-disabled'}`}
                >
                  {t[item.label] || item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {isHelperMode && (
          <button
            type="button"
            onClick={handleLockClick}
            className="flex flex-col items-center gap-1 w-16"
            aria-label="الخروج من وضع المساعد"
          >
            <div className="w-[52px] h-8 rounded-pill grid place-items-center">
              <svg className="w-6 h-6 text-expense-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold text-expense-600">خروج</span>
          </button>
        )}
      </nav>

      <PinEntrySheet
        open={pinSheetOpen}
        onClose={() => setPinSheetOpen(false)}
        onVerify={handleVerify}
      />
    </>
  )
}
