import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet.jsx'
import { hapticMedium, hapticLight } from '../../utils/haptics.js'
import Icon from '../ui/Icon.jsx'

/**
 * V5: Rounded-square FAB (One UI style)
 * Fixed bottom-left (in RTL), 60×60, blue, opens Add sheet.
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
    setTimeout(() => onAction?.(action), 150)
  }

  const actions = [
    { id: 'income', label: 'قبض', desc: 'استلام مبلغ', icon: 'arrowDownLeft', color: 'text-income', bg: 'bg-income-bg' },
    { id: 'expense', label: 'صرف', desc: 'دفع مبلغ', icon: 'arrowUpRight', color: 'text-expense', bg: 'bg-expense-bg' },
    { id: 'withdrawal', label: 'سحب شخصي', desc: 'لا يؤثر على الربح', icon: 'bank', color: 'text-withdrawal', bg: 'bg-withdraw-bg' },
    { id: 'order', label: 'طلب جديد', desc: 'إضافة طلب زبون', icon: 'clipboard', color: 'text-primary', bg: 'bg-primary-tint' },
  ]

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="press fixed bottom-[96px] left-[22px] w-[60px] h-[60px] rounded-[22px] bg-primary grid place-items-center shadow-fab z-30"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="إضافة"
      >
        <Icon name="plus" className="w-7 h-7 text-white" strokeWidth={2.5} />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="إضافة جديدة">
        <div className="grid grid-cols-2 gap-3 pb-4">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleSelect(action.id)}
              className="press flex flex-col items-start gap-3 rounded-card p-4 text-right"
              style={{ background: getBgColor(action.bg) }}
            >
              <div className="w-12 h-12 rounded-[15px] bg-white grid place-items-center">
                <Icon name={action.icon} className={`w-6 h-6 ${action.color}`} strokeWidth={2} />
              </div>
              <div>
                <div className="text-[16px] font-bold text-ink">{action.label}</div>
                <div className="text-[12px] text-faint">{action.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  )
}

function getBgColor(bgClass) {
  const map = {
    'bg-income-bg': '#e7f8ee',
    'bg-expense-bg': '#fdecec',
    'bg-withdraw-bg': '#fbf1e2',
    'bg-primary-tint': '#e7f0ff',
  }
  return map[bgClass] || '#eceef1'
}
