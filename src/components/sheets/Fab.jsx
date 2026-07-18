import { useTerms } from '../../context/TermsContext.jsx'
import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet.jsx'
import { hapticMedium, hapticLight } from '../../utils/haptics.js'
import Icon from '../ui/Icon.jsx'

/**
 * V5 SOP: Rounded-square FAB
 * Fixed bottom-left (in RTL), 56×56, terracotta, opens Add sheet.
 * Dual-mode aware — action labels come from useTerms().
 */
export default function Fab({ onAction }) {
  const t = useTerms()
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
    { id: 'income',     label: t.income_action,     desc: t.income_desc,     icon: 'arrowDownLeft', color: 'text-income-600',     bg: 'bg-income-bg' },
    { id: 'expense',    label: t.expense_action,    desc: t.expense_desc,    icon: 'arrowUpRight',  color: 'text-expense-600',    bg: 'bg-expense-bg' },
    { id: 'withdrawal', label: t.withdrawal_action, desc: t.withdrawal_desc, icon: 'bank',          color: 'text-withdrawal-600', bg: 'bg-withdraw-bg' },
    { id: 'order',      label: t.new_order,         desc: t.order_desc,      icon: 'clipboard',     color: 'text-primary-600',    bg: 'bg-primary-tint' },
  ]

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="press fixed bottom-20 left-4 w-14 h-14 rounded-12 grid place-items-center z-30 bg-primary shadow-fab"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label={t.add_new}
      >
        <Icon name="plus" className="w-6 h-6 text-white" strokeWidth={1.5} />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.add_new}>
        <div className="grid grid-cols-2 gap-3 pb-4">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleSelect(action.id)}
              className={`press flex flex-col items-start gap-3 rounded-card p-4 text-right ${action.bg}`}
            >
              <div className="w-12 h-12 rounded-card bg-white grid place-items-center">
                <Icon name={action.icon} className={`w-6 h-6 ${action.color}`} strokeWidth={2} />
              </div>
              <div>
                <div className="text-base font-bold text-ink">{action.label}</div>
                <div className="text-caption text-ink-secondary">{action.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  )
}
