import { useState, useEffect, useCallback } from 'react'
import { db } from '../db'
import { formatAmount } from '../utils/format.js'
import { formatArabicDate } from '../utils/date.js'
import { ARABIC_DAYS } from '../utils/date.js'
import EmptyState from '../components/ui/EmptyState.jsx'
import Icon from '../components/ui/Icon.jsx'
import { hapticLight, hapticSuccess } from '../utils/haptics.js'
import { sendDebtReminder } from '../utils/whatsapp.js'
import { Link } from 'react-router-dom'

/**
 * Reports Page (V4 Phase 3) - Adaptive Reporting
 *
 * Simple Mode: Conversational cards, CSS bar charts, actionable insights
 * Pro Mode: Data tables, financial summaries, variance analysis
 */
export default function ReportsPage() {
  const now = new Date()
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [endDate, setEndDate] = useState(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  // V4 Phase 3: Report mode + extra data for Simple mode
  const [reportMode, setReportMode] = useState('simple')
  const [topDebtors, setTopDebtors] = useState([])
  const [dailyBreakdown, setDailyBreakdown] = useState([])

  const loadReport = useCallback(async () => {
    setLoading(true)
    try {
      const result = await db.getReport(startDate, endDate)
      setReport(result)

      // V4 Phase 3: Load extra data for Simple mode
      const [receivables, transactions] = await Promise.all([
        db.getReceivables(),
        db.getTransactionsByDateRange(startDate, endDate),
      ])
      // Top 3 debtors with outstanding amounts
      const debtors = receivables
        .map(d => ({ name: d.description || 'زبون', amount: d.amount - (d.debtAmountPaid || 0), date: d.date, raw: d }))
        .filter(d => d.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3)
      setTopDebtors(debtors)

      // Daily breakdown for bar chart (income per day)
      const byDay = {}
      for (const t of transactions) {
        if (t.type === 'income') {
          const day = new Date(t.dateTimestamp).getDate()
          byDay[day] = (byDay[day] || 0) + t.amount
        }
      }
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const breakdown = []
      for (let d = 1; d <= daysInMonth; d++) {
        breakdown.push({ day: d, amount: byDay[d] || 0 })
      }
      setDailyBreakdown(breakdown)
    } catch (e) {
      console.error('Failed to load report:', e)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  // V4 Phase 3: Load report mode from settings
  useEffect(() => {
    db.getSetting('report_mode', 'simple').then(setReportMode)
  }, [])

  const handleStartDateChange = (e) => {
    hapticLight()
    setStartDate(e.target.value)
  }

  const handleEndDateChange = (e) => {
    hapticLight()
    setEndDate(e.target.value)
  }

  // Quick date range presets
  const setPreset = (preset) => {
    hapticSuccess()
    const today = new Date()
    let start, end
    switch (preset) {
      case 'today':
        start = end = today
        break
      case 'week':
        start = new Date(today)
        start.setDate(today.getDate() - today.getDay())
        start.setHours(0, 0, 0, 0)
        end = today
        break
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = today
        break
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        end = new Date(today.getFullYear(), today.getMonth(), 0)
        break
      case 'year':
        start = new Date(today.getFullYear(), 0, 1)
        end = today
        break
      default:
        return
    }
    setStartDate(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`)
    setEndDate(`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`)
  }

  const presets = [
    { id: 'today', label: 'اليوم' },
    { id: 'week', label: 'هذا الأسبوع' },
    { id: 'month', label: 'هذا الشهر' },
    { id: 'lastMonth', label: 'الشهر الماضي' },
    { id: 'year', label: 'هذه السنة' },
  ]

  const varianceColor = report
    ? (report.variance > 0 ? 'text-withdrawal-600'
      : report.variance < 0 ? 'text-income-600'
      : 'text-text-secondary')
    : 'text-text-secondary'
  const varianceLabel = report
    ? (report.variance > 0 ? 'دفعات معلقة (ديون لم تُحصّل)'
      : report.variance < 0 ? 'تحصيل زائد (دفعات مقدمة)'
      : 'متوازن')
    : ''

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="px-5 pt-12 pb-3 safe-area-top sticky top-0 bg-background z-20">
        <h1 className="text-2xl font-bold mb-3">التقارير</h1>

        {/* Quick Presets */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-5 px-5 mb-3">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap bg-surface text-text-secondary shadow-card active:scale-95 transition-transform"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className="input-field text-sm"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              className="input-field text-sm"
              dir="ltr"
            />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !report ? (
        <EmptyState
          icon="document"
          title="لا توجد بيانات"
          description="اختر نطاقاً زمنياً لعرض التقرير"
        />
      ) : reportMode === 'simple' ? (
        /* V4 Phase 3: Simple Mode — Conversational cards + CSS bar charts */
        <div className="px-5 space-y-4">
          {/* Card 1: Today's earnings */}
          <div className="bg-gradient-to-br from-income-400 to-income-500 rounded-2xl p-5 text-white shadow-md">
            <p className="text-sm text-income-50 mb-1">في هالفترة كسبت</p>
            <p className="text-3xl font-bold tabular-nums">{formatAmount(report.realCashProfit)}</p>
            <p className="text-xs text-income-50 mt-2">
              {report.realCashProfit >= 0 ? 'ربح صافي 👍' : 'خسارة — راجع مصاريفك'}
            </p>
          </div>

          {/* Card 2: Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-2xl p-4 shadow-card text-center">
              <p className="text-xs text-text-tertiary mb-1">قبضت</p>
              <p className="text-xl font-bold text-income-600 tabular-nums">{formatAmount(report.cashReceived)}</p>
            </div>
            <div className="bg-surface rounded-2xl p-4 shadow-card text-center">
              <p className="text-xs text-text-tertiary mb-1">صرفت</p>
              <p className="text-xl font-bold text-expense-600 tabular-nums">{formatAmount(report.cashSpent)}</p>
            </div>
          </div>

          {/* Card 3: Best sales day (CSS bar chart) */}
          {dailyBreakdown.length > 0 && (
            <div className="bg-surface rounded-2xl p-4 shadow-card">
              <p className="text-sm font-bold text-text-primary mb-3">مبيعات يومية</p>
              {(() => {
                const maxAmount = Math.max(...dailyBreakdown.map(d => d.amount), 1)
                const bestDay = dailyBreakdown.reduce((best, d) => d.amount > best.amount ? d : best, { day: 0, amount: 0 })
                return (
                  <>
                    {bestDay.amount > 0 && (
                      <p className="text-xs text-text-secondary mb-2">
                        أفضل يوم مبيعاً كان يوم {bestDay.day}: {formatAmount(bestDay.amount)}
                      </p>
                    )}
                    <div className="flex items-end gap-0.5 h-24 overflow-x-auto hide-scrollbar">
                      {dailyBreakdown.map(d => (
                        <div
                          key={d.day}
                          className="flex-shrink-0 flex flex-col items-center gap-1"
                          style={{ width: '12px' }}
                        >
                          <div
                            className="w-full rounded-t bg-primary rounded-t"
                            style={{
                              height: `${(d.amount / maxAmount) * 100}%`,
                              minHeight: d.amount > 0 ? '4px' : '2px',
                              opacity: d.amount > 0 ? 1 : 0.15,
                            }}
                          />
                          {d.day % 5 === 0 && (
                            <span className="text-[8px] text-text-tertiary">{d.day}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* Card 4: Debt reminders */}
          {topDebtors.length > 0 && (
            <div className="bg-surface rounded-2xl p-4 shadow-card">
              <p className="text-sm font-bold text-text-primary mb-3">عندهم فلوس لك</p>
              <div className="space-y-2">
                {topDebtors.map((debtor, i) => (
                  <div key={i} className="flex items-center justify-between bg-background rounded-xl p-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-text-primary">{debtor.name}</p>
                      <p className="text-xs text-text-tertiary">عليه {formatAmount(debtor.amount)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { hapticLight(); sendDebtReminder(debtor.raw) }}
                      className="bg-income-50 text-income-600 text-xs font-semibold px-3 py-2 rounded-lg active:scale-95 transition-transform flex items-center gap-1.5"
                    >
                      <Icon name="whatsapp" className="w-4 h-4" />
                      تذكير
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card 5: Order stats */}
          <div className="bg-surface rounded-2xl p-4 shadow-card">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-primary-600 tabular-nums">{report.totalOrders}</p>
                <p className="text-xs text-text-tertiary">إجمالي الطلبات</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-income-600 tabular-nums">{report.completedOrders}</p>
                <p className="text-xs text-text-tertiary">طلبات مكتملة</p>
              </div>
            </div>
          </div>

          {/* Link to Pro mode */}
          <Link
            to="/settings"
            className="block text-center text-xs text-primary-600 font-medium py-2"
          >
            تغيير إلى عرض احترافي من الإعدادات
          </Link>
        </div>
      ) : (
        /* V4 Phase 3: Pro Mode — Existing detailed report */
        <div className="px-5 space-y-4">
          {/* Period Summary */}
          <div className="bg-surface rounded-2xl p-4 shadow-card">
            <p className="text-xs text-text-tertiary mb-1">الفترة</p>
            <p className="text-sm font-semibold text-text-primary">
              {formatArabicDate(report.period.start)} — {formatArabicDate(report.period.end)}
            </p>
          </div>

          {/* Real Cash Flow Section */}
          <section>
            <h2 className="text-sm font-bold text-txt-secondary mb-2 px-1">التدفق النقدي الفعلي</h2>
            <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
              {/* Cash Received */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-income-50 flex items-center justify-center">
                    <Icon name="arrowDown" className="w-5 h-5 text-income-600" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">إجمالي النقد المستلم</p>
                    <p className="text-xs text-text-tertiary">قبض (دخل فعلي)</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-income-600 tabular-nums">
                  {formatAmount(report.cashReceived)}
                </p>
              </div>

              {/* Cash Spent */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-expense-50 flex items-center justify-center">
                    <Icon name="arrowUp" className="w-5 h-5 text-expense-600" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">إجمالي المصاريف</p>
                    <p className="text-xs text-text-tertiary">صرف (مصاريف تشغيلية)</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-expense-600 tabular-nums">
                  {formatAmount(report.cashSpent)}
                </p>
              </div>

              {/* Personal Withdrawal */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-withdrawal-50 flex items-center justify-center">
                    <Icon name="userMinus" className="w-5 h-5 text-withdrawal-600" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">سحب شخصي</p>
                    <p className="text-xs text-text-tertiary">لا يؤثر على الربح</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-withdrawal-600 tabular-nums">
                  {formatAmount(report.withdrawal)}
                </p>
              </div>

              {/* Net Cash Profit */}
              <div className="flex items-center justify-between p-4 bg-background rounded-b-2xl">
                <div>
                  <p className="font-bold text-text-primary">صافي الربح النقدي</p>
                  <p className="text-xs text-text-tertiary">القبض - الصرف</p>
                </div>
                <p className={`text-2xl font-bold tabular-nums ${
                  report.realCashProfit >= 0 ? 'text-income-600' : 'text-expense-600'
                }`}>
                  {formatAmount(report.realCashProfit)}
                </p>
              </div>
            </div>
          </section>

          {/* Theoretical Profit Section (BOM-based, analytical) */}
          <section>
            <h2 className="text-sm font-bold text-txt-secondary mb-2 px-1 flex items-center gap-2">
              <Icon name="info" className="w-4 h-4 text-primary-600" />
              الربح النظري (استشاري)
            </h2>
            <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
              {/* Theoretical Revenue */}
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-text-primary text-sm">إيرادات الطلبات المكتملة</p>
                  <p className="text-xs text-text-tertiary">{report.completedOrders} طلب مكتمل</p>
                </div>
                <p className="text-lg font-bold text-text-primary tabular-nums">
                  {formatAmount(report.theoreticalRevenue)}
                </p>
              </div>

              {/* Theoretical Cost (BOM) */}
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-text-primary text-sm">تكلفة المواد (BOM)</p>
                  <p className="text-xs text-text-tertiary">استشاري - لا يُخصم من المالية</p>
                </div>
                <p className="text-lg font-bold text-expense-600 tabular-nums">
                  {formatAmount(report.theoreticalCost)}
                </p>
              </div>

              {/* Theoretical Profit */}
              <div className="flex items-center justify-between p-4 bg-background rounded-b-2xl">
                <div>
                  <p className="font-bold text-text-primary">الربح النظري المتوقع</p>
                  <p className="text-xs text-text-tertiary">الإيرادات - تكلفة المواد</p>
                </div>
                <p className={`text-2xl font-bold tabular-nums ${
                  report.theoreticalProfit >= 0 ? 'text-income-600' : 'text-expense-600'
                }`}>
                  {formatAmount(report.theoreticalProfit)}
                </p>
              </div>
            </div>
          </section>

          {/* Variance Analysis */}
          <section>
            <h2 className="text-sm font-bold text-txt-secondary mb-2 px-1">تحليل الفرق</h2>
            <div className="bg-surface rounded-2xl p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-text-primary text-sm">الفرق بين النقدي والنظري</p>
                <p className={`text-xl font-bold tabular-nums ${varianceColor}`}>
                  {report.variance > 0 ? '+' : ''}{formatAmount(report.variance)}
                </p>
              </div>
              <p className="text-xs text-text-tertiary">
                {varianceLabel}
              </p>
              <p className="text-xs text-text-tertiary mt-2 leading-relaxed">
                {report.variance > 0
                  ? 'هناك طلبات بيعت بالأجل ولم تُحصّل بعد. راجع صفحة الديون لتتبع المستحقات.'
                  : report.variance < 0
                  ? 'تم تحصيل مبالغ مقدمة أو دفعات ديون من فترات سابقة.'
                  : 'التدفق النقدي متوازن مع الربح النظري.'
                }
              </p>
            </div>
          </section>

          {/* Order Stats */}
          <section>
            <h2 className="text-sm font-bold text-txt-secondary mb-2 px-1">إحصائيات الطلبات</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface rounded-2xl p-4 shadow-card text-center">
                <p className="text-xs text-text-secondary mb-1">إجمالي الطلبات</p>
                <p className="text-2xl font-bold text-text-primary tabular-nums">{report.totalOrders}</p>
              </div>
              <div className="bg-surface rounded-2xl p-4 shadow-card text-center">
                <p className="text-xs text-text-secondary mb-1">طلبات مكتملة</p>
                <p className="text-2xl font-bold text-income-600 tabular-nums">{report.completedOrders}</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
