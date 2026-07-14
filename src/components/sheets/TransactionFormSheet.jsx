import { useState, useEffect } from 'react'
import BottomSheet from '../ui/BottomSheet.jsx'
import AmountInput from '../ui/AmountInput.jsx'
import Icon from '../ui/Icon.jsx'
import { db } from '../../db'
import { hapticSuccess, hapticError } from '../../utils/haptics.js'

/**
 * Transaction Form Sheet - Add/Edit income/expense/withdrawal
 * type: 'income' | 'expense' | 'withdrawal'
 */
export default function TransactionFormSheet({ open, onClose, type = 'income', editData = null, onSaved }) {
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState(() => {
    const d = new Date()
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  })
  const [saving, setSaving] = useState(false)

  const config = {
    income: {
      title: 'تسجيل قبض',
      amountLabel: 'المبلغ المستلم',
      descPlaceholder: 'مثال: دفعة من زبون، مبيعات اليوم...',
      categoryPlaceholder: 'الفئة (اختياري)',
      accent: 'income',
      submitColor: 'bg-income-500',
    },
    expense: {
      title: 'تسجيل صرف',
      amountLabel: 'المبلغ المدفوع',
      descPlaceholder: 'مثال: شراء مواد، فاتورة كهرباء...',
      categoryPlaceholder: 'الفئة (اختياري)',
      accent: 'expense',
      submitColor: 'bg-expense-500',
    },
    withdrawal: {
      title: 'سحب شخصي',
      amountLabel: 'المبلغ المسحوب',
      descPlaceholder: 'مثال: سحب للمصروف الشخصي...',
      categoryPlaceholder: 'ملاحظة (اختياري)',
      accent: 'withdrawal',
      submitColor: 'bg-withdrawal-500',
    },
  }

  const currentConfig = config[type] || config.income

  useEffect(() => {
    if (open) {
      if (editData) {
        setAmount(editData.amount || 0)
        setDescription(editData.description || '')
        setCategory(editData.category || '')
        const d = new Date(editData.date)
        setDate(d.toISOString().slice(0, 10))
        setTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`)
      } else {
        setAmount(0)
        setDescription('')
        setCategory('')
        const now = new Date()
        setDate(now.toISOString().slice(0, 10))
        setTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
      }
    }
  }, [open, editData, type])

  const handleSave = async () => {
    if (!amount || amount <= 0) {
      hapticError()
      return
    }

    setSaving(true)
    try {
      const dateObj = new Date(`${date}T${time}`)
      const payload = {
        type,
        amount: Number(amount),
        description: description.trim(),
        category: category.trim(),
        date: dateObj.toISOString(),
      }

      if (editData?.id) {
        await db.updateTransaction(editData.id, payload)
      } else {
        await db.addTransaction(payload)
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

  return (
    <BottomSheet open={open} onClose={onClose} title={currentConfig.title}>
      <div className="space-y-5 pb-4">
        {/* Amount */}
        <AmountInput
          value={amount}
          onChange={setAmount}
          label={currentConfig.amountLabel}
          autoFocus
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">الوصف</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={currentConfig.descPlaceholder}
            rows={2}
            className="input-field resize-none"
            dir="rtl"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">الفئة</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={currentConfig.categoryPlaceholder}
            className="input-field"
            dir="rtl"
          />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2">التاريخ</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2">الوقت</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input-field"
              dir="ltr"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSave}
          disabled={saving || !amount}
          className={`w-full ${currentConfig.submitColor} text-white font-bold rounded-2xl py-4 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100`}
        >
          {saving ? 'جار الحفظ...' : editData ? 'تحديث' : 'حفظ'}
        </button>
      </div>
    </BottomSheet>
  )
}
