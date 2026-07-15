import { useState, useEffect } from 'react'
import BottomSheet from '../ui/BottomSheet.jsx'
import AmountInput from '../ui/AmountInput.jsx'
import Icon from '../ui/Icon.jsx'
import { db } from '../../db'
import { hapticSuccess, hapticError } from '../../utils/haptics.js'
import { shareReceipt } from '../../utils/whatsapp.js'

/**
 * Transaction Form Sheet - Add/Edit income/expense/withdrawal
 * type: 'income' | 'expense' | 'withdrawal'
 */
export default function TransactionFormSheet({ open, onClose, type = 'income', editData = null, onSaved }) {
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [time, setTime] = useState(() => {
    const d = new Date()
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  })
  const [saving, setSaving] = useState(false)
  // V2: Recurring frequency state
  const [frequency, setFrequency] = useState('none') // 'none' | 'daily' | 'weekly' | 'monthly'
  // V2: Track saved transaction for receipt sharing (Agent 4)
  const [savedTransaction, setSavedTransaction] = useState(null)

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
        setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
        setTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`)
        // V2: Restore recurring state when editing
        setFrequency(editData.isRecurring ? (editData.frequency || 'monthly') : 'none')
      } else {
        setAmount(0)
        setDescription('')
        setCategory('')
        setFrequency('none')
        const now = new Date()
        setDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
        setTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
      }
      setSavedTransaction(null)
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
      const isRecurring = frequency !== 'none'
      const payload = {
        type,
        amount: Number(amount),
        description: description.trim(),
        category: category.trim(),
        date: dateObj.toISOString(),
        // V2: Recurring fields
        isRecurring,
        frequency: isRecurring ? frequency : null,
      }

      let result
      if (editData?.id) {
        await db.updateTransaction(editData.id, payload)
        result = { ...editData, ...payload, id: editData.id }
      } else {
        result = await db.addTransaction(payload)
      }

      hapticSuccess()
      setSavedTransaction(result)
      onSaved?.(result)
      // Don't close immediately — show receipt share option (Agent 4)
      // onClose?.()  // commented out to allow receipt sharing
    } catch (e) {
      console.error('Save failed:', e)
      hapticError()
    } finally {
      setSaving(false)
    }
  }

  // V2 (Agent 4): Share receipt via WhatsApp
  const handleShareReceipt = async (transaction) => {
    try {
      await shareReceipt(transaction)
    } catch (e) {
      console.error('Share receipt failed:', e)
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

        {/* V2: Recurring Frequency Toggle */}
        {!editData && (
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2">التكرار</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'none', label: 'بدون' },
                { value: 'daily', label: 'يومي' },
                { value: 'weekly', label: 'أسبوعي' },
                { value: 'monthly', label: 'شهري' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={`py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                    frequency === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-background text-txt-secondary border border-divider'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {frequency !== 'none' && (
              <p className="text-xs text-text-tertiary mt-2">
                سيتم تسجيل هذه المعاملة تلقائياً كل {frequency === 'daily' ? 'يوم' : frequency === 'weekly' ? 'أسبوع' : 'شهر'}
              </p>
            )}
          </div>
        )}
        {editData && editData.isRecurring && (
          <div className="bg-primary-50 rounded-xl p-3 flex items-center gap-2">
            <Icon name="info" className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <p className="text-xs text-primary-700">هذه معاملة متكررة ({editData.frequency === 'daily' ? 'يومية' : editData.frequency === 'weekly' ? 'أسبوعية' : 'شهرية'})</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSave}
          disabled={saving || !amount}
          className={`w-full ${currentConfig.submitColor} text-white font-bold rounded-2xl py-4 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100`}
        >
          {saving ? 'جار الحفظ...' : editData ? 'تحديث' : 'حفظ'}
        </button>

        {/* V2 (Agent 4): Share Receipt button — appears after save */}
        {savedTransaction && (
          <div className="animate-fade-in space-y-3">
            <div className="bg-income-50 rounded-xl p-3 flex items-center gap-2">
              <Icon name="checkCircle" className="w-5 h-5 text-income-600 flex-shrink-0" />
              <p className="text-sm text-income-700 font-semibold">تم الحفظ بنجاح</p>
            </div>
            <button
              type="button"
              onClick={() => handleShareReceipt(savedTransaction)}
              className="w-full bg-income-50 text-income-600 font-semibold rounded-2xl py-3.5 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <Icon name="whatsapp" className="w-5 h-5" />
              مشاركة إيصال واتساب
            </button>
            <button
              type="button"
              onClick={() => {
                setSavedTransaction(null)
                onClose?.()
              }}
              className="w-full bg-background text-txt-secondary font-semibold rounded-2xl py-3.5 active:scale-[0.98] transition-transform"
            >
              تم
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
