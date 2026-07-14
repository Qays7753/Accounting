import { useState, useEffect } from 'react'
import BottomSheet from '../ui/BottomSheet.jsx'
import AmountInput from '../ui/AmountInput.jsx'
import Icon from '../ui/Icon.jsx'
import { db } from '../../db'
import { hapticSuccess, hapticError } from '../../utils/haptics.js'

/**
 * Order Form Sheet - Add/Edit an order
 */
export default function OrderFormSheet({ open, onClose, editData = null, onSaved }) {
  const [customerName, setCustomerName] = useState('')
  const [orderType, setOrderType] = useState('')
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [scheduledTime, setScheduledTime] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  })
  const [amount, setAmount] = useState(0)
  const [status, setStatus] = useState('in_progress')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (editData) {
        setCustomerName(editData.customerName || '')
        setOrderType(editData.orderType || '')
        setAmount(editData.amount || 0)
        setStatus(editData.status || 'in_progress')
        setNotes(editData.notes || '')
        const d = new Date(editData.scheduledDate)
        setScheduledDate(d.toISOString().slice(0, 10))
        setTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`)
      } else {
        setCustomerName('')
        setOrderType('')
        setAmount(0)
        setStatus('in_progress')
        setNotes('')
        const now = new Date()
        setScheduledDate(now.toISOString().slice(0, 10))
        const later = new Date()
        later.setHours(later.getHours() + 1, 0, 0, 0)
        setScheduledTime(`${later.getHours().toString().padStart(2, '0')}:${later.getMinutes().toString().padStart(2, '0')}`)
      }
    }
  }, [open, editData])

  const [time, setTime] = useState('')

  const handleSave = async () => {
    if (!customerName.trim() && !orderType.trim()) {
      hapticError()
      return
    }

    setSaving(true)
    try {
      const dateObj = new Date(`${scheduledDate}T${scheduledTime}`)
      const payload = {
        customerName: customerName.trim(),
        orderType: orderType.trim(),
        scheduledDate: dateObj.toISOString(),
        amount: Number(amount),
        status,
        notes: notes.trim(),
      }

      if (editData?.id) {
        await db.updateOrder(editData.id, payload)
      } else {
        await db.addOrder(payload)
      }

      hapticSuccess()
      onSaved?.()
      onClose?.()
    } catch (e) {
      console.error('Save failed:', e)
      hapticError()
    } finally {
      setSaving(false)
    }
  }

  const statusOptions = [
    { value: 'in_progress', label: 'قيد التنفيذ', color: 'badge-progress' },
    { value: 'ready', label: 'جاهز', color: 'badge-ready' },
    { value: 'closed', label: 'مغلق/تم التسليم', color: 'badge-closed' },
  ]

  const orderTypeSuggestions = ['إصلاح', 'صيانة', 'شراء', 'حجز', 'تركيب', 'خدمة', 'توريد']

  return (
    <BottomSheet open={open} onClose={onClose} title={editData ? 'تعديل الطلب' : 'طلب جديد'}>
      <div className="space-y-5 pb-4">
        {/* Customer Name */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">اسم الزبون</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="مثال: أحد الزبائن"
            className="input-field"
            dir="rtl"
          />
        </div>

        {/* Order Type */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">نوع الطلب</label>
          <input
            type="text"
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
            placeholder="مثال: إصلاح، شراء، حجز..."
            className="input-field mb-2"
            dir="rtl"
          />
          <div className="flex flex-wrap gap-2">
            {orderTypeSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => setOrderType(s)}
                className="px-3 py-1.5 bg-background rounded-full text-xs font-medium text-text-secondary active:scale-95 transition-transform"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <AmountInput value={amount} onChange={setAmount} label="المبلغ" />

        {/* Scheduled Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2">التاريخ</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="input-field"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2">الوقت</label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="input-field"
              dir="ltr"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">الحالة</label>
          <div className="grid grid-cols-3 gap-2">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setStatus(opt.value)
                }}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  status === opt.value
                    ? `${opt.color} ring-2 ring-current`
                    : 'bg-background text-text-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">ملاحظات</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="تفاصيل إضافية..."
            rows={2}
            className="input-field resize-none"
            dir="rtl"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full btn-primary disabled:opacity-50"
        >
          {saving ? 'جار الحفظ...' : editData ? 'تحديث الطلب' : 'حفظ الطلب'}
        </button>
      </div>
    </BottomSheet>
  )
}
