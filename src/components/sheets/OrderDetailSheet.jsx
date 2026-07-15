import { useState, useEffect, useRef } from 'react'
import BottomSheet from '../ui/BottomSheet.jsx'
import Icon from '../ui/Icon.jsx'
import { db } from '../../db'
import { formatAmount } from '../../utils/format.js'
import { formatArabicDateTime } from '../../utils/date.js'
import { hapticMedium, hapticSuccess, hapticLight } from '../../utils/haptics.js'
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

// V3: Payment status config
const PAYMENT_CONFIG = {
  cash: { label: 'مدفوع نقداً', badge: 'bg-income-50 text-income-600', icon: 'checkCircle' },
  credit: { label: 'بيع بالأجل', badge: 'bg-withdrawal-50 text-withdrawal-600', icon: 'userMinus' },
  done: { label: 'تتبع فقط', badge: 'bg-gray-100 text-text-secondary', icon: 'check' },
  null: { label: 'غير مكتمل', badge: 'bg-gray-100 text-text-tertiary', icon: 'clock' },
}

export default function OrderDetailSheet({ order, open, onClose, onEdit, onUpdated }) {
  const [linkedTransactions, setLinkedTransactions] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmResetTimer = useRef(null)

  // V3: Complete & Sell sheet state
  const [completeSheetOpen, setCompleteSheetOpen] = useState(false)

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
  const payment = PAYMENT_CONFIG[order.paymentType] || PAYMENT_CONFIG.null

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
      const timer = setTimeout(() => setConfirmDelete(false), 3000)
      confirmResetTimer.current = timer
      return
    }
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

  // V3: Complete & Sell handler
  const handleComplete = async (paymentType) => {
    hapticLight()
    setCompleteSheetOpen(false)
    try {
      await db.completeOrder(order.id, paymentType)
      hapticSuccess()
      onUpdated?.()
      onClose?.()
    } catch (e) {
      console.error('Complete order failed:', e)
    }
  }

  return (
    <>
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
              {/* V3: Show phone with call/whatsapp buttons */}
              {order.phone && (
                <div className="flex items-center gap-2 mt-1">
                  <Icon name="phone" className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-xs text-text-tertiary" dir="ltr">{order.phone}</span>
                </div>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${c.badge}`}>
              {c.label}
            </span>
          </div>

          {/* V3: Phone action buttons */}
          {order.phone && (
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${order.phone}`}
                className="flex items-center justify-center gap-2 bg-primary-50 text-primary-600 font-semibold rounded-xl py-2.5 active:scale-95 transition-transform text-sm"
              >
                <Icon name="phone" className="w-4 h-4" />
                اتصال
              </a>
              <a
                href={`https://wa.me/${order.phone.replace(/[^\d]/g, '').replace(/^0/, '962')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-income-50 text-income-600 font-semibold rounded-xl py-2.5 active:scale-95 transition-transform text-sm"
              >
                <Icon name="whatsapp" className="w-4 h-4" />
                واتساب
              </a>
            </div>
          )}

          {/* Amount & V3: Payment Status */}
          {order.amount > 0 && (
            <div className="bg-background rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-secondary mb-1">المبلغ</p>
                  <p className="text-2xl font-bold tabular-nums text-text-primary">
                    {formatAmount(order.amount)}
                  </p>
                </div>
                {/* V3: Payment status badge */}
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${payment.badge} flex items-center gap-1.5`}>
                  <Icon name={payment.icon} className="w-3.5 h-3.5" />
                  {payment.label}
                </div>
              </div>
              {/* V3: BOM cost summary (analytical) */}
              {order.total_cost > 0 && (
                <div className="mt-3 pt-3 border-t border-divider space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-tertiary">تكلفة المواد (استشاري):</span>
                    <span className="font-semibold text-expense-600 tabular-nums">{formatAmount(order.total_cost)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-tertiary">الربح المتوقع:</span>
                    <span className="font-semibold text-income-600 tabular-nums">
                      {formatAmount(order.amount - order.total_cost)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* V3: BOM Components (if any) */}
          {order.components_used && order.components_used.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-text-secondary mb-2">المواد المستخدمة (استشاري)</p>
              <div className="bg-background rounded-2xl p-3 space-y-1.5">
                {order.components_used.map((comp, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-text-primary">
                      {comp.name} ({comp.qty} × {formatAmount(comp.unit_cost)})
                    </span>
                    <span className="font-semibold tabular-nums text-text-secondary">
                      {formatAmount(comp.qty * comp.unit_cost)}
                    </span>
                  </div>
                ))}
              </div>
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

          {/* V3: Complete & Sell Button (only for non-closed orders) */}
          {order.status !== 'closed' && (
            <button
              type="button"
              onClick={() => { hapticLight(); setCompleteSheetOpen(true) }}
              className="w-full bg-income-500 text-white font-bold rounded-2xl py-4 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <Icon name="checkCircle" className="w-5 h-5" />
              إتمام الطلب والبيع
            </button>
          )}

          {/* Status Quick Change */}
          <div>
            <p className="text-sm font-semibold text-text-secondary mb-2">تغيير الحالة</p>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
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
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-2 bg-income-500 text-white font-semibold rounded-2xl py-3.5 active:scale-[0.98] transition-transform"
            >
              <Icon name="whatsapp" className="w-5 h-5" />
              <span className="text-sm">مشاركة</span>
            </button>
            <button
              type="button"
              onClick={() => onEdit?.(order)}
              className="flex items-center justify-center gap-2 bg-primary text-white font-semibold rounded-2xl py-3.5 active:scale-[0.98] transition-transform"
            >
              <Icon name="edit" className="w-5 h-5" />
              <span className="text-sm">تعديل</span>
            </button>
          </div>

          {/* Delete */}
          <button
            type="button"
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

      {/* V3: Complete & Sell Payment Sheet */}
      <BottomSheet open={completeSheetOpen} onClose={() => setCompleteSheetOpen(false)} title="إتمام الطلب والبيع">
        <div className="space-y-4 pb-4">
          <div className="bg-background rounded-2xl p-4 text-center">
            <p className="text-sm text-text-secondary mb-1">المبلغ</p>
            <p className="text-3xl font-bold tabular-nums text-text-primary">{formatAmount(order.amount)}</p>
          </div>

          <div className="bg-primary-50 rounded-xl p-3 flex items-center gap-2">
            <Icon name="info" className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <p className="text-xs text-primary-700">هل استلمت المبلغ من الزبون؟</p>
          </div>

          {/* 3 Scenarios */}
          <button
            type="button"
            onClick={() => handleComplete('cash')}
            className="w-full bg-income-500 text-white font-bold rounded-2xl py-4 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Icon name="checkCircle" className="w-5 h-5" />
            نعم، استلمت المبلغ نقداً
          </button>

          <button
            type="button"
            onClick={() => handleComplete('credit')}
            className="w-full bg-withdrawal-500 text-white font-bold rounded-2xl py-4 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Icon name="userMinus" className="w-5 h-5" />
            لا، بيع بالأجل (دين)
          </button>

          <button
            type="button"
            onClick={() => handleComplete('done')}
            className="w-full bg-background text-text-secondary font-semibold rounded-2xl py-4 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Icon name="check" className="w-5 h-5" />
            مجرد إنهاء (تتبع فقط)
          </button>

          <p className="text-xs text-text-tertiary text-center">
            سيتم تحديث حالة الطلب إلى "مغلق". البند الأول يسجل قبضاً، والثاني ديناً، والثالث لا يؤثر على المالية.
          </p>
        </div>
      </BottomSheet>
    </>
  )
}
