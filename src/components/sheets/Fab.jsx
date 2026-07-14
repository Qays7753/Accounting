import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet.jsx'
import { hapticMedium, hapticLight } from '../../utils/haptics.js'
import Icon from '../ui/Icon.jsx'

/**
 * FAB with Bottom Sheet - large blue circular button (+)
 * Clicking opens a Bottom Sheet with 4 large options:
 * 1. Record Income (قبض)
 * 2. Record Expense (صرف)
 * 3. Personal Withdrawal (سحب شخصي)
 * 4. New Order (طلب جديد)
 */
export default function Fab({ onAction }) {
  const [open, setOpen] = useState(false)

  const handleOpen = () => {
    hapticMedium()
    setOpen(true)
  }

  const handleSelect = (action) => {
    hapticLight()
    setOpen(false)
    // Slight delay to let sheet close
    setTimeout(() => onAction?.(action), 150)
  }

  const actions = [
    {
      id: 'income',
      label: 'قبض',
      description: 'تسجيل مبلغ استلمته',
      icon: 'arrowDown',
      color: 'bg-income-50 text-income-600',
    },
    {
      id: 'expense',
      label: 'صرف',
      description: 'تسجيل مبلغ دفعته',
      icon: 'arrowUp',
      color: 'bg-expense-50 text-expense-600',
    },
    {
      id: 'withdrawal',
      label: 'سحب شخصي',
      description: 'سحب نقدي للاستخدام الشخصي',
      icon: 'userMinus',
      color: 'bg-withdrawal-50 text-withdrawal-600',
    },
    {
      id: 'order',
      label: 'طلب جديد',
      description: 'إضافة طلب جديد',
      icon: 'plus',
      color: 'bg-primary-50 text-primary-600',
    },
  ]

  return (
    <>
      {/* FAB button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-fab active:scale-90 transition-transform z-30"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="إضافة"
      >
        <Icon name="plus" className="w-7 h-7" strokeWidth={2.5} />
      </button>

      {/* Bottom Sheet */}
      <BottomSheet open={open} onClose={() => setOpen(false)} title="ماذا تريد أن تفعل؟">
        <div className="grid grid-cols-2 gap-3 pb-4">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleSelect(action.id)}
              className="flex flex-col items-center justify-center gap-3 bg-background rounded-2xl p-5 active:scale-95 transition-transform touch-target"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${action.color}`}>
                <Icon name={action.icon} className="w-7 h-7" strokeWidth={2} />
              </div>
              <div className="text-center">
                <p className="font-bold text-text-primary text-sm">{action.label}</p>
                <p className="text-xs text-text-tertiary mt-0.5 leading-tight">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  )
}
