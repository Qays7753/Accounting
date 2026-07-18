import { useState, useEffect, useCallback } from 'react'
import { db } from '../db'
import { formatAmount } from '../utils/format.js'
import { formatArabicDate, getRelativeTime } from '../utils/date.js'
import EmptyState from '../components/ui/EmptyState.jsx'
import Icon from '../components/ui/Icon.jsx'
import BottomSheet from '../components/ui/BottomSheet.jsx'
import AmountInput from '../components/ui/AmountInput.jsx'
import { hapticLight, hapticSuccess, hapticMedium, hapticError } from '../utils/haptics.js'
import { sendDebtReminder } from '../utils/whatsapp.js'

/**
 * Debts Page (V4 Phase 1) - Tracks receivables and payables with tabs.
 *
 * V4 Updates:
 * - Tab system: "لهم عندي" (Receivables) / "عندي لهم" (Payables)
 * - WhatsApp reminder button on receivable debts (uses settings template)
 * - Summary: "إجمالي لهم عندي" and "إجمالي عندي لهم"
 */
export default function DebtsPage() {
  const [receivables, setReceivables] = useState([])
  const [payables, setPayables] = useState([])
  const [loading, setLoading] = useState(true)

  // V4 Phase 1: Active tab ('receivables' = لهم عندي | 'payables' = عندي لهم)
  const [activeTab, setActiveTab] = useState('receivables')

  // Form states
  const [debtFormOpen, setDebtFormOpen] = useState(false)
  const [debtType, setDebtType] = useState('debt_given') // 'debt_given' | 'debt_taken'
  const [settleDebt, setSettleDebt] = useState(null) // debt being settled
  const [settleSheetOpen, setSettleSheetOpen] = useState(false)
  const [detailDebt, setDetailDebt] = useState(null) // debt being viewed
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [rec, pay] = await Promise.all([
        db.getReceivables(),
        db.getPayables(),
      ])
      // Sort by most recent first
      rec.sort((a, b) => b.createdAt - a.createdAt)
      pay.sort((a, b) => b.createdAt - a.createdAt)
      setReceivables(rec)
      setPayables(pay)
    } catch (e) {
      console.error('Failed to load debts:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalReceivable = receivables.reduce((s, d) => s + (d.amount - (d.debtAmountPaid || 0)), 0)
  const totalPayable = payables.reduce((s, d) => s + (d.amount - (d.debtAmountPaid || 0)), 0)

  const handleAddDebt = (type) => {
    hapticLight()
    setDebtType(type)
    setDebtFormOpen(true)
  }

  const handleDebtSaved = () => {
    loadData()
    setDebtFormOpen(false)
  }

  const handleSettle = (debt) => {
    hapticLight()
    setSettleDebt(debt)
    setSettleSheetOpen(true)
  }

  const handleSettleSaved = () => {
    loadData()
    setSettleSheetOpen(false)
    setSettleDebt(null)
  }

  const handleViewDetail = (debt) => {
    hapticLight()
    setDetailDebt(debt)
    setDetailSheetOpen(true)
  }

  // V4 Phase 1: Send polite WhatsApp debt reminder (uses settings template)
  const handleSendReminder = async (debt) => {
    hapticLight()
    await sendDebtReminder(debt)
  }

  // V4 Phase 1: Switch tab
  const handleTabChange = (tab) => {
    hapticLight()
    setActiveTab(tab)
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="px-4 pt-8 pb-3 safe-area-top sticky top-0 bg-background z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-[30px] font-extrabold text-ink -tracking-[.5px]">الديون</h1>
          <button
            type="button"
            onClick={() => handleAddDebt('debt_given')}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-fab active:scale-95 transition-transform"
            aria-label="إضافة دين"
          >
            <Icon name="plus" className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* V4 Phase 1: Summary Cards with new labels */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary text-white rounded-16 p-4">
            <p className="text-sm font-medium text-income-50 mb-1">إجمالي لهم عندي</p>
            {loading ? (
              <div className="h-8 w-24 bg-white/20 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{formatAmount(totalReceivable)}</p>
            )}
            <p className="text-xs text-income-50 mt-1">من {receivables.length} شخص</p>
          </div>
          <div className="bg-expense text-white rounded-16 p-4">
            <p className="text-sm font-medium text-expense-50 mb-1">إجمالي عندي لهم</p>
            {loading ? (
              <div className="h-8 w-24 bg-white/20 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{formatAmount(totalPayable)}</p>
            )}
            <p className="text-xs text-expense-50 mt-1">لـ {payables.length} شخص</p>
          </div>
        </div>
      </div>

      {/* V4 Phase 1: Tab System (لهم عندي / عندي لهم) */}
      <div className="px-4 mb-4">
        <div className="bg-surface rounded-2xl p-1 flex shadow-card">
          <button
            type="button"
            onClick={() => handleTabChange('receivables')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'receivables' ? 'bg-income-500 text-white' : 'text-text-secondary'
            }`}
          >
            <Icon name="arrowDown" className="w-4 h-4" />
            لهم عندي
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('payables')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'payables' ? 'bg-expense-500 text-white' : 'text-text-secondary'
            }`}
          >
            <Icon name="arrowUp" className="w-4 h-4" />
            عندي لهم
          </button>
        </div>
      </div>

      {/* Quick Add Button (context-aware) */}
      <div className="px-4 mb-4">
        <button
          type="button"
          onClick={() => handleAddDebt(activeTab === 'receivables' ? 'debt_given' : 'debt_taken')}
          className={`w-full rounded-2xl p-4 shadow-card active:scale-95 transition-transform flex items-center gap-3 ${
            activeTab === 'receivables' ? 'bg-income-50' : 'bg-expense-50'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            activeTab === 'receivables' ? 'bg-income-100' : 'bg-expense-100'
          }`}>
            <Icon name="plus" className={`w-5 h-5 ${activeTab === 'receivables' ? 'text-income-600' : 'text-expense-600'}`} strokeWidth={2} />
          </div>
          <div className="text-right">
            <p className="font-semibold text-text-primary text-sm">
              {activeTab === 'receivables' ? 'إضافة دين لهم عندي' : 'إضافة دين عندي لهم'}
            </p>
            <p className="text-xs text-text-tertiary">
              {activeTab === 'receivables' ? 'زبون يشتري الآن ويدفع لاحقاً' : 'مواد على الحساب من مورد'}
            </p>
          </div>
        </button>
      </div>

      {/* V4 Phase 1: Tabbed Debt List */}
      <section className="px-4 mb-6">
        {activeTab === 'receivables' ? (
          <>
            <h2 className="text-sm font-bold text-txt-secondary mb-3 px-1">
              لهم عندي ({receivables.length})
            </h2>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="bg-surface rounded-2xl p-4 shadow-card">
                    <div className="h-4 w-1/2 bg-divider rounded animate-pulse mb-2" />
                    <div className="h-3 w-1/3 bg-mute rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : receivables.length === 0 ? (
              <EmptyState
                icon="checkCircle"
                title="لا توجد ديون لهم عندي"
                description="عندما يطلب أحد مبلغاً مؤجلاً، ستظهر هنا"
              />
            ) : (
              <div className="space-y-2">
                {receivables.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    isReceivable={true}
                    onSettle={() => handleSettle(debt)}
                    onViewDetail={() => handleViewDetail(debt)}
                    onSendReminder={() => handleSendReminder(debt)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="text-sm font-bold text-txt-secondary mb-3 px-1">
              عندي لهم ({payables.length})
            </h2>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 1 }).map((_, i) => (
                  <div key={i} className="bg-surface rounded-2xl p-4 shadow-card">
                    <div className="h-4 w-1/2 bg-divider rounded animate-pulse mb-2" />
                    <div className="h-3 w-1/3 bg-mute rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : payables.length === 0 ? (
              <EmptyState
                icon="checkCircle"
                title="لا توجد ديون عندي لهم"
                description="عندما تأخذ مواد على الحساب، ستظهر هنا"
              />
            ) : (
              <div className="space-y-2">
                {payables.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    isReceivable={false}
                    onSettle={() => handleSettle(debt)}
                    onViewDetail={() => handleViewDetail(debt)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Debt Form Sheet */}
      <DebtFormSheet
        open={debtFormOpen}
        type={debtType}
        onClose={() => setDebtFormOpen(false)}
        onSaved={handleDebtSaved}
      />

      {/* Settle Debt Sheet */}
      <SettleDebtSheet
        open={settleSheetOpen}
        debt={settleDebt}
        onClose={() => {
          setSettleSheetOpen(false)
          setSettleDebt(null)
        }}
        onSaved={handleSettleSaved}
      />

      {/* Debt Detail Sheet */}
      <DebtDetailSheet
        open={detailSheetOpen}
        debt={detailDebt}
        onClose={() => {
          setDetailSheetOpen(false)
          setDetailDebt(null)
        }}
        onSettle={() => {
          setDetailSheetOpen(false)
          handleSettle(detailDebt)
        }}
        onUpdated={loadData}
      />
    </div>
  )
}

/**
 * Debt Card - shows a single debt with progress bar, settle button, and WhatsApp reminder (V4)
 */
function DebtCard({ debt, isReceivable, onSettle, onViewDetail, onSendReminder }) {
  const remaining = debt.amount - (debt.debtAmountPaid || 0)
  const paidPercent = debt.amount > 0 ? ((debt.debtAmountPaid || 0) / debt.amount) * 100 : 0
  const isPartial = (debt.debtAmountPaid || 0) > 0 && debt.debtStatus !== 'settled'

  const statusBadge = debt.debtStatus === 'settled'
    ? { label: 'مسدد', class: 'bg-income-50 text-income-600' }
    : isPartial
    ? { label: 'جزئي', class: 'bg-withdrawal-50 text-withdrawal-600' }
    : { label: 'غير مسدد', class: 'bg-expense-50 text-expense-600' }

  return (
    <div
      className="bg-surface rounded-2xl p-4 shadow-card active:scale-[0.98] transition-transform cursor-pointer"
      onClick={onViewDetail}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-txt-primary">{debt.description || 'دين'}</p>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge.class}`}>
          {statusBadge.label}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm mb-2">
        <div>
          <p className="text-txt-secondary">
            الإجمالي: <span className="font-bold text-txt-primary tabular-nums">{formatAmount(debt.amount)}</span>
          </p>
          <p className="text-xs text-txt-tertiary mt-0.5">
            المتبقي: <span className={`font-bold tabular-nums ${isReceivable ? 'text-income-600' : 'text-expense-600'}`}>
              {formatAmount(remaining)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* V4 Phase 1: WhatsApp Reminder Button (receivables only) */}
          {isReceivable && debt.debtStatus !== 'settled' && onSendReminder && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSendReminder()
              }}
              className="w-10 h-10 rounded-lg bg-income-50 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="تذكير واتساب"
              title="إرسال تذكير واتساب"
            >
              <Icon name="whatsapp" className="w-4 h-4 text-income-600" />
            </button>
          )}
          {debt.debtStatus !== 'settled' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSettle()
              }}
              className={`text-white text-xs font-semibold px-3 py-2 rounded-lg active:scale-95 transition-transform ${
                isReceivable ? 'bg-income-500' : 'bg-expense-500'
              }`}
            >
              {isReceivable ? 'تسجيل دفعة' : 'سداد دفعة'}
            </button>
          )}
        </div>
      </div>
      {/* Progress bar for partial payments */}
      {isPartial && (
        <div className="mt-2 bg-background rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full ${isReceivable ? 'bg-income-500' : 'bg-expense-500'}`}
            style={{ width: `${paidPercent}%` }}
          />
        </div>
      )}
      <p className="text-xs text-txt-tertiary mt-2">{getRelativeTime(debt.date)}</p>
    </div>
  )
}

/**
 * Debt Form Sheet - add a new debt (receivable or payable)
 */
function DebtFormSheet({ open, type, onClose, onSaved }) {
  const [personName, setPersonName] = useState('')
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setPersonName('')
      setAmount(0)
      setDescription('')
      const d = new Date()
      setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }
  }, [open])

  const handleSave = async () => {
    if (!amount || amount <= 0) {
      hapticError()
      return
    }

    setSaving(true)
    try {
      const dateObj = new Date(date)
      await db.addTransaction({
        type, // 'debt_given' or 'debt_taken'
        amount: Number(amount),
        description: personName.trim() || (type === 'debt_given' ? 'دين مستحق لي' : 'دين مستحق علي'),
        category: type === 'debt_given' ? 'دين مستحقة لي' : 'ديون مستحقة علي',
        date: dateObj.toISOString(),
        debtStatus: 'unpaid',
        debtAmountPaid: 0,
      })

      hapticSuccess()
      onSaved?.()
    } catch (e) {
      console.error('Save debt failed:', e)
      hapticError()
    } finally {
      setSaving(false)
    }
  }

  const title = type === 'debt_given' ? 'تسجيل دين لي' : 'تسجيل دين علي'

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-5 pb-4">
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">اسم الشخص</label>
          <input
            type="text"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder={type === 'debt_given' ? 'اسم الزبون' : 'اسم المورد'}
            className="input-field"
            dir="rtl"
          />
        </div>

        <AmountInput value={amount} onChange={setAmount} label="المبلغ" autoFocus />

        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">ملاحظات</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'debt_given' ? 'مثال: بيع بالأجل...' : 'مثال: مواد على الحساب...'}
            rows={2}
            className="input-field resize-none"
            dir="rtl"
          />
        </div>

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

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !amount}
          className={`w-full text-white font-bold rounded-2xl py-4 active:scale-[0.98] transition-transform disabled:opacity-50 ${
            type === 'debt_given' ? 'bg-income-500' : 'bg-expense-500'
          }`}
        >
          {saving ? 'جار الحفظ...' : 'حفظ'}
        </button>
      </div>
    </BottomSheet>
  )
}

/**
 * Settle Debt Sheet - record a payment for a debt
 */
function SettleDebtSheet({ open, debt, onClose, onSaved }) {
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && debt) {
      // Default to remaining amount
      const remaining = debt.amount - (debt.debtAmountPaid || 0)
      setPaymentAmount(remaining)
    }
  }, [open, debt])

  if (!debt) return null

  const remaining = debt.amount - (debt.debtAmountPaid || 0)
  const isReceivable = debt.type === 'debt_given'

  const handleSave = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      hapticError()
      return
    }
    if (paymentAmount > remaining) {
      hapticError()
      return
    }

    setSaving(true)
    try {
      await db.settleDebt(debt.id, paymentAmount)
      hapticSuccess()
      onSaved?.()
    } catch (e) {
      console.error('Settle debt failed:', e)
      hapticError()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isReceivable ? 'تسجيل دفعة' : 'سداد دفعة'}>
      <div className="space-y-5 pb-4">
        {/* Debt Summary */}
        <div className="bg-background rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm text-txt-secondary">الإجمالي</p>
            <p className="font-bold tabular-nums text-txt-primary">{formatAmount(debt.amount)}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-txt-secondary">المدفوع سابقاً</p>
            <p className="font-bold tabular-nums text-income-600">{formatAmount(debt.debtAmountPaid || 0)}</p>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-divider">
            <p className="text-sm font-semibold text-txt-primary">المتبقي</p>
            <p className="font-bold tabular-nums text-expense-600">{formatAmount(remaining)}</p>
          </div>
        </div>

        <AmountInput value={paymentAmount} onChange={setPaymentAmount} label="مبلغ الدفعة" autoFocus />

        {paymentAmount > remaining && (
          <div className="bg-expense-50 rounded-xl p-3 flex items-center gap-2">
            <Icon name="info" className="w-4 h-4 text-expense-600 flex-shrink-0" />
            <p className="text-xs text-expense-700">المبلغ أكبر من المتبقي ({formatAmount(remaining)})</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !paymentAmount || paymentAmount > remaining}
          className={`w-full text-white font-bold rounded-2xl py-4 active:scale-[0.98] transition-transform disabled:opacity-50 ${
            isReceivable ? 'bg-income-500' : 'bg-expense-500'
          }`}
        >
          {saving ? 'جار الحفظ...' : 'تسجيل الدفعة'}
        </button>
      </div>
    </BottomSheet>
  )
}

/**
 * Debt Detail Sheet - shows full debt info and payment history
 */
function DebtDetailSheet({ open, debt, onClose, onSettle, onUpdated }) {
  const [settlements, setSettlements] = useState([])

  useEffect(() => {
    if (open && debt) {
      db.getDebtSettlements(debt.id).then(setSettlements)
    }
  }, [open, debt])

  if (!debt) return null

  const remaining = debt.amount - (debt.debtAmountPaid || 0)
  const isReceivable = debt.type === 'debt_given'

  return (
    <BottomSheet open={open} onClose={onClose} title="تفاصيل الدين">
      <div className="space-y-5 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isReceivable ? 'bg-income-50' : 'bg-expense-50'}`}>
            <Icon name="user" className={`w-7 h-7 ${isReceivable ? 'text-income-600' : 'text-expense-600'}`} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-txt-primary text-lg">{debt.description || 'دين'}</p>
            <p className="text-sm text-txt-secondary">{isReceivable ? 'دين مستحق لي' : 'دين مستحق علي'}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-background rounded-2xl p-4 space-y-2">
          <div className="flex justify-between">
            <p className="text-sm text-txt-secondary">الإجمالي</p>
            <p className="font-bold tabular-nums text-txt-primary">{formatAmount(debt.amount)}</p>
          </div>
          <div className="flex justify-between">
            <p className="text-sm text-txt-secondary">المدفوع</p>
            <p className="font-bold tabular-nums text-income-600">{formatAmount(debt.debtAmountPaid || 0)}</p>
          </div>
          <div className="flex justify-between pt-2 border-t border-divider">
            <p className="text-sm font-semibold text-txt-primary">المتبقي</p>
            <p className="font-bold tabular-nums text-expense-600">{formatAmount(remaining)}</p>
          </div>
        </div>

        {/* Date */}
        <div className="bg-background rounded-2xl p-4">
          <p className="text-xs text-txt-secondary mb-1">تاريخ الإنشاء</p>
          <p className="text-sm font-semibold text-txt-primary">{formatArabicDate(debt.date)}</p>
        </div>

        {/* Payment History */}
        {settlements.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-txt-secondary mb-2">سجل الدفعات</p>
            <div className="space-y-2">
              {settlements.map((s, i) => (
                <div key={s.id} className="bg-background rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-txt-primary">دفعة {i + 1}</p>
                    <p className="text-xs text-txt-tertiary mt-0.5">{formatArabicDate(s.createdAt)}</p>
                  </div>
                  <p className="font-bold text-income-600 tabular-nums">{formatAmount(s.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {debt.debtStatus !== 'settled' && (
          <button
            type="button"
            onClick={onSettle}
            className={`w-full flex items-center justify-center gap-2 text-white font-semibold rounded-2xl py-3.5 active:scale-[0.98] transition-transform ${
              isReceivable ? 'bg-income-500' : 'bg-expense-500'
            }`}
          >
            <Icon name="check" className="w-5 h-5" />
            <span className="text-sm">{isReceivable ? 'تسجيل دفعة' : 'سداد دفعة'}</span>
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
