import { useState, useEffect, useRef } from 'react'
import BottomSheet from '../ui/BottomSheet.jsx'
import Icon from '../ui/Icon.jsx'
import { db } from '../../db'
import { formatAmount } from '../../utils/format.js'
import { formatArabicDateTime } from '../../utils/date.js'
import { hapticMedium, hapticSuccess } from '../../utils/haptics.js'
import { shareOrderViaWhatsApp } from '../../utils/whatsapp.js'

const STATUS_CONFIG = {
  in_progress: { label: 'قيد التنفيذ', badge: 'badge-progress' },
  ready: { label: 'جاهز', badge: 'badge-ready' },
  closed: { label: 'مغلق', badge: 'badge-closed' },
}

const STATUS_OPTIONS = [
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'ready', label: 'جاهز' },
  { value: 'closed', label: 'مغلق' },
]

export default function OrderDetailSheet({ order, open, onClose, onEdit, onUpdated }) {
  const [linkedTransactions, setLinkedTransactions] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmResetTimer = useRef(null)

  useEffect(() => {
    if (order?.id) {
      db.getTransactionsByOrder(order.id).then(setLinkedTransactions)
    } else {
      setLinkedTransactions([])
    }
  }, [order?.id])

  // Cleanup timer on unmount to prevent state update on unmounted component
  useEffect(() => {
    return () => {
      if (confirmResetTimer.current) clearTimeout(confirmResetTimer.current)
    }
  }, [])

  if (!order) return null

  const c = STATUS_CONFIG[order.status] || STATUS_CONFIG.in_progress

  const handleStatusChange = async (newStatus) => {
    hapticSuccess()
    await db.updateOrder(order.id, { status: newStatus })
    onUpdated?.()
    onClose?.()
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      hapticMedium()
      // Auto-reset confirm state after 3 seconds (with cleanup safety)
      const timer = setTimeout(() => setConfirmDelete(false), 3000)
      // Store timer for cleanup if component unmounts
      confirmResetTimer.current = timer
      return
    }
    // Clear the reset timer since we're proceeding with delete
    if (confirmResetTimer.current) clearTimeout(confirmResetTimer.current)
    hapticSuccess()
    await db.deleteOrder(order.id)
    onUpdated?.()
    onClose?.()
  }

  const handleShare = async () => {
    hapticMedium()
    await shareOrderViaWhatsApp(order)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="تفاصيل الطلب">
      <div className="space-y-5 pb-4">
        {/* Customer */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center">
            <Icon name="user" className="w-7 h-7 text-primary-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-text-primary text-lg">{order.customerName || 'زبون'}</p>
            <p className="text-sm text-text-secondary">{order.orderType}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${c.badge}`}>
            {c.label}
          </span>
        </div>

        {/* Amount */}
        {order.amount > 0 && (
          <div className="bg-background rounded-2xl p-4">
            <p className="text-xs text-text-secondary mb-1">المبلغ</p>
            <p className="text-2xl font-bold tabular-nums text-text-primary">
              {formatAmount(order.amount)}
            </p>
          </div>
        )}

        {/* Scheduled Date */}
        <div className="bg-background rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="calendar" className="w-4 h-4 text-text-tertiary" />
              <p className="text-xs text-text-secondary">موعد التنفيذ</p>
            </div>
            <p className="text-sm font-semibold text-text-primary">
              {formatArabicDateTime(order.scheduledDate)}
            </p>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-background rounded-2xl p-4">
            <p className="text-xs text-text-secondary mb-1">ملاحظات</p>
            <p className="text-sm text-text-primary leading-relaxed">{order.notes}</p>
          </div>
        )}

        {/* Linked Transactions */}
        {linkedTransactions.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-text-secondary mb-2">مدفوعات مرتبطة</p>
            <div className="space-y-2">
              {linkedTransactions.map((t) => (
                <div key={t.id} className="bg-background rounded-2xl p-3 flex items-center justify-between">
                  <span className="text-sm text-text-primary">{t.description || t.category || 'دفعة'}</span>
                  <span className={`text-sm font-bold tabular-nums ${
                    t.type === 'income' ? 'text-income-600' : 'text-expense-600'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Quick Change */}
        <div>
          <p className="text-sm font-semibold text-text-secondary mb-2">تغيير الحالة</p>
          <div className="grid grid-cols-3 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  order.status === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-background text-text-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 bg-income-500 text-white font-semibold rounded-2xl py-3.5 active:scale-[0.98] transition-transform"
          >
            <Icon name="whatsapp" className="w-5 h-5" />
            <span className="text-sm">مشاركة</span>
          </button>
          <button
            onClick={() => onEdit?.(order)}
            className="flex items-center justify-center gap-2 bg-primary text-white font-semibold rounded-2xl py-3.5 active:scale-[0.98] transition-transform"
          >
            <Icon name="edit" className="w-5 h-5" />
            <span className="text-sm">تعديل</span>
          </button>
        </div>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className={`w-full rounded-2xl py-3.5 font-semibold transition-all active:scale-[0.98] ${
            confirmDelete
              ? 'bg-expense-500 text-white'
              : 'bg-expense-50 text-expense-600'
          }`}
        >
          {confirmDelete ? 'اضغط للتأكيد - سيتم حذف الطلب نهائياً' : 'حذف الطلب'}
        </button>
      </div>
    </BottomSheet>
  )
}
