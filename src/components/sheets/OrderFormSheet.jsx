import { useState, useEffect, useCallback } from 'react'
import BottomSheet from '../ui/BottomSheet.jsx'
import AmountInput from '../ui/AmountInput.jsx'
import Icon from '../ui/Icon.jsx'
import { db } from '../../db'
import { hapticSuccess, hapticError, hapticLight } from '../../utils/haptics.js'
import { formatAmount } from '../../utils/format.js'

const UNIT_TYPES = [
  { value: 'piece', label: 'قطعة' },
  { value: 'gram', label: 'غرام' },
  { value: 'kg', label: 'كيلو' },
  { value: 'ml', label: 'مليلتر' },
  { value: 'liter', label: 'لتر' },
  { value: 'meter', label: 'متر' },
]

/**
 * Order Form Sheet (V3: supports BOM calculator + CRM phone)
 *
 * BOM (Bill of Materials) is PURELY ANALYTICAL:
 * - User adds components (materials) to calculate theoretical cost
 * - System shows Total Cost and Expected Profit
 * - This does NOT create expense transactions or affect cash flow
 * - It's an advisory tool to help users price their orders profitably
 */
export default function OrderFormSheet({ open, onClose, editData = null, onSaved }) {
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [orderType, setOrderType] = useState('')
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [scheduledTime, setScheduledTime] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  })
  const [amount, setAmount] = useState(0)
  const [status, setStatus] = useState('in_progress')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // V3: BOM components (analytical only)
  const [components, setComponents] = useState([]) // [{ materialId, name, unit_type, qty, unit_cost }]
  const [materials, setMaterials] = useState([])
  const [showBOM, setShowBOM] = useState(false)

  // Load materials list
  useEffect(() => {
    if (open) {
      db.getMaterials().then(setMaterials)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      if (editData) {
        setCustomerName(editData.customerName || '')
        setPhone(editData.phone || '')
        setOrderType(editData.orderType || '')
        setAmount(editData.amount || 0)
        setStatus(editData.status || 'in_progress')
        setNotes(editData.notes || '')
        setComponents(editData.components_used || [])
        const d = new Date(editData.scheduledDate)
        setScheduledDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
        setScheduledTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`)
      } else {
        setCustomerName('')
        setPhone('')
        setOrderType('')
        setAmount(0)
        setStatus('in_progress')
        setNotes('')
        setComponents([])
        const now = new Date()
        setScheduledDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
        const later = new Date()
        later.setHours(later.getHours() + 1, 0, 0, 0)
        setScheduledTime(`${later.getHours().toString().padStart(2, '0')}:${later.getMinutes().toString().padStart(2, '0')}`)
      }
    }
  }, [open, editData])

  // V3: BOM calculations (analytical only)
  const totalCost = db.calculateBOMCost(components)
  const expectedProfit = (Number(amount) || 0) - totalCost
  const profitMargin = (Number(amount) || 0) > 0 ? (expectedProfit / (Number(amount) || 0)) * 100 : 0

  const handleAddComponent = useCallback(() => {
    hapticLight()
    setComponents(prev => [...prev, { materialId: null, name: '', unit_type: 'piece', qty: 1, unit_cost: 0 }])
  }, [])

  const handleRemoveComponent = useCallback((index) => {
    hapticLight()
    setComponents(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleComponentChange = useCallback((index, field, value) => {
    setComponents(prev => prev.map((c, i) => {
      if (i !== index) return c
      if (field === 'materialId') {
        // When a material is selected, auto-fill name, unit_type, unit_cost
        const mat = materials.find(m => m.id === Number(value))
        if (mat) {
          return { ...c, materialId: mat.id, name: mat.name, unit_type: mat.unit_type, unit_cost: mat.unit_cost }
        }
        return { ...c, materialId: null }
      }
      if (field === 'qty' || field === 'unit_cost') {
        return { ...c, [field]: Number(value) || 0 }
      }
      return { ...c, [field]: value }
    }))
  }, [materials])

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
        phone: phone.trim(),
        orderType: orderType.trim(),
        scheduledDate: dateObj.toISOString(),
        amount: Number(amount),
        status,
        notes: notes.trim(),
        // V3: BOM (analytical only, does NOT affect finance)
        components_used: components,
        total_cost: totalCost,
      }

      if (editData?.id) {
        await db.updateOrder(editData.id, payload)
      } else {
        await db.addOrder(payload)
        // V3: Auto-create customer if phone provided
        if (phone.trim()) {
          await db.addCustomer({ name: customerName.trim(), phone: phone.trim() })
        }
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

        {/* V3: Customer Phone */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">رقم الهاتف (اختياري)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XXXXXXXX"
            className="input-field"
            dir="ltr"
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
                type="button"
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

        {/* V3: BOM Cost & Profit Calculator */}
        <div className="bg-background rounded-2xl p-4">
          <button
            type="button"
            onClick={() => { hapticLight(); setShowBOM(!showBOM) }}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Icon name="info" className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-text-primary text-sm">حاسبة التكلفة والربح</span>
            </div>
            <Icon name={showBOM ? 'chevronDown' : 'chevronLeft'} className="w-5 h-5 text-text-tertiary" />
          </button>

          {showBOM && (
            <div className="mt-4 space-y-3 animate-fade-in">
              <p className="text-xs text-text-tertiary">
                احسب تكلفة المواد والربح المتوقع. هذه أداة استشارية فقط ولا تؤثر على المالية.
              </p>

              {/* Components list */}
              {components.length > 0 && (
                <div className="space-y-2">
                  {components.map((comp, i) => (
                    <div key={i} className="bg-surface rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        {/* Material selector or free text */}
                        {materials.length > 0 ? (
                          <select
                            value={comp.materialId || ''}
                            onChange={(e) => handleComponentChange(i, 'materialId', e.target.value)}
                            className="flex-1 bg-background rounded-lg px-2 py-1.5 text-sm outline-none ml-2"
                            dir="rtl"
                          >
                            <option value="">— اختر مادة —</option>
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={comp.name}
                            onChange={(e) => handleComponentChange(i, 'name', e.target.value)}
                            placeholder="اسم المادة"
                            className="flex-1 bg-background rounded-lg px-2 py-1.5 text-sm outline-none ml-2"
                            dir="rtl"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(i)}
                          className="w-10 h-10 rounded-full bg-expense-50 flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
                          aria-label="حذف"
                        >
                          <Icon name="trash" className="w-4 h-4 text-expense-600" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={comp.qty}
                          onChange={(e) => handleComponentChange(i, 'qty', e.target.value)}
                          placeholder="الكمية"
                          className="bg-background rounded-lg px-2 py-1.5 text-sm outline-none text-center"
                          dir="ltr"
                        />
                        <select
                          value={comp.unit_type}
                          onChange={(e) => handleComponentChange(i, 'unit_type', e.target.value)}
                          className="bg-background rounded-lg px-2 py-1.5 text-sm outline-none"
                          dir="rtl"
                        >
                          {UNIT_TYPES.map(u => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={comp.unit_cost}
                          onChange={(e) => handleComponentChange(i, 'unit_cost', e.target.value)}
                          placeholder="سعر الوحدة"
                          className="bg-background rounded-lg px-2 py-1.5 text-sm outline-none text-center"
                          dir="ltr"
                        />
                      </div>
                      <p className="text-xs text-text-tertiary text-left">
                        الإجمالي: {formatAmount(comp.qty * comp.unit_cost)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddComponent}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary-50 text-primary-600 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Icon name="plus" className="w-4 h-4" />
                إضافة مادة
              </button>

              {/* Summary */}
              {components.length > 0 && (
                <div className="bg-surface rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">سعر البيع:</span>
                    <span className="font-bold tabular-nums text-txt-primary">{formatAmount(amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">إجمالي التكلفة:</span>
                    <span className="font-bold tabular-nums text-expense-600">{formatAmount(totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-1.5 border-t border-divider">
                    <span className="font-semibold text-text-primary">الربح المتوقع:</span>
                    <span className={`font-bold tabular-nums ${expectedProfit >= 0 ? 'text-income-600' : 'text-expense-600'}`}>
                      {formatAmount(expectedProfit)}
                    </span>
                  </div>
                  {amount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-text-tertiary">هامش الربح:</span>
                      <span className={`font-semibold tabular-nums ${profitMargin >= 0 ? 'text-income-600' : 'text-expense-600'}`}>
                        {profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

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
                type="button"
                onClick={() => { hapticLight(); setStatus(opt.value) }}
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
          type="button"
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
