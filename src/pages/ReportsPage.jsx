import { useTerms, useTermsMode } from '../context/TermsContext.jsx'
import { useState, useEffect, useCallback } from 'react'
import { db } from '../db'
import { formatAmount } from '../utils/format.js'
import { formatArabicDate } from '../utils/date.js'
import EmptyState from '../components/ui/EmptyState.jsx'
import Icon from '../components/ui/Icon.jsx'
import { hapticLight, hapticSuccess } from '../utils/haptics.js'
import { sendDebtReminder } from '../utils/whatsapp.js'
import { Link } from 'react-router-dom'
import { useCountUp } from '../hooks/useCountUp.js'

/**
 * Reports Page (V4 Phase 3) - Adaptive Reporting
 *
 * Simple Mode: Conversational cards, CSS bar charts, actionable insights.
 *              Hides theoretical/BOM/variance sections. Shows only:
 *              - Net cash earned (hero card, count-up animated)
 *              - Cash received / Cash spent (mini cards)
 *              - Daily sales bar chart
 *              - Top debtors (actionable reminder)
 *              - Order stats (totals only — no margins)
 *
 * Pro Mode: Full data tables — cash flow, theoretical profit (BOM),
 *           variance analysis, order stats with computed margins.
 *
 * Mode is read from TermsContext (useTermsMode) so toggling in Settings
 * re-renders this page instantly without reload.
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
  const t = useTerms()
  const [reportMode] = useTermsMode()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  // Extra data for Simple mode
  const [topDebtors, setTopDebtors] = useState([])
  const [dailyBreakdown, setDailyBreakdown] = useState([])

  // V5: active period preset (drives the sliding segmented control)
  const [activePreset, setActivePreset] = useState('month')

  // Count-up animations for the hero numbers (preserved in BOTH modes)
  const animatedProfit = useCountUp(report?.realCashProfit || 0)
  const animatedReceived = useCountUp(report?.cashReceived || 0)
  const animatedSpent = useCountUp(report?.cashSpent || 0)

  const loadReport = useCallback(async () => {
    setLoading(true)
    try {
      const result = await db.getReport(startDate, endDate)
      setReport(result)

      const [receivables, transactions] = await Promise.all([
        db.getReceivables(),
        db.getTransactionsByDateRange(startDate, endDate),
      ])
      const debtors = receivables
        .map(d => ({ name: d.description || t.customer_name, amount: d.amount - (d.debtAmountPaid || 0), date: d.date, raw: d }))
        .filter(d => d.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3)
      setTopDebtors(debtors)

      const byDay = {}
      for (const tx of transactions) {
        if (tx.type === 'income') {
          const day = new Date(tx.dateTimestamp).getDate()
          byDay[day] = (byDay[day] || 0) + tx.amount
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
  }, [startDate, endDate, t.customer_name])

  useEffect(() => {
    loadReport()
  }, [loadReport])

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
    setActivePreset(preset)
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
    { id: 'today', label: t.today_label },
    { id: 'week', label: 'الأسبوع' },
    { id: 'month', label: 'الشهر' },
    { id: 'lastMonth', label: 'الماضي' },
    { id: 'year', label: 'السنة' },
  ]

  const activePresetIndex = Math.max(0, presets.findIndex((p) => p.id === activePreset))

  const varianceColor = report
    ? (report.variance > 0 ? 'text-withdrawal-600'
      : report.variance < 0 ? 'text-income-600'
      : 'text-text-secondary')
    : 'text-text-secondary'
  const varianceLabel = report
    ? (report.variance > 0 ? t.report_variance_surplus_desc
      : report.variance < 0 ? t.report_variance_shortage_desc
      : t.report_variance_balanced_desc)
    : ''

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="px-4 pt-8 pb-3 safe-area-top sticky top-0 bg-background z-20">
        <h1 className="text-[30px] font-extrabold text-ink -tracking-[.5px] mb-3">{t.reports_title}</h1>

        {/* V5: Period segmented control */}
        <div className="relative grid grid-cols-5 bg-mute rounded-[16px] p-1 mb-3">
          <div
            className="absolute top-1 bottom-1 rounded-[12px] bg-primary shadow-sm transition-all duration-300 ease-out"
            style={{ right: `calc(${activePresetIndex * 20}% + 4px)`, width: 'calc(20% - 8px)' }}
          />
          {presets.map((p) => {
            const on = p.id === activePreset
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`relative z-10 py-2 text-[13px] transition-colors ${
                  on ? 'text-white font-bold' : 'text-sub font-semibold'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t.date}</label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className="input-field text-sm"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t.date}</label>
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
          title={t.empty_no_data}
          description={t.report_period}
        />
      ) : reportMode === 'simple' ? (
        /* ============================================
           SIMPLE MODE — Conversational, hides advanced metrics
           ============================================ */
        <div className="px-4 space-y-4">
          {/* Hero: Net earned (count-up animated) */}
          <div className="bg-primary text-white rounded-16 p-4">
            <p className="text-sm text-white/80 mb-1">{t.report_earned}</p>
            <p className="text-3xl font-bold tabular-nums num">{formatAmount(animatedProfit)}</p>
            <p className="text-xs text-white/80 mt-2">
              {report.realCashProfit >= 0 ? t.report_profit_label : t.report_loss_label}
            </p>
          </div>

          {/* Quick stats: received / spent */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-2xl p-4 shadow-card text-center">
              <p className="text-xs text-text-tertiary mb-1">{t.report_received}</p>
              <p className="text-xl font-bold text-income-600 tabular-nums num">{formatAmount(animatedReceived)}</p>
            </div>
            <div className="bg-surface rounded-2xl p-4 shadow-card text-center">
              <p className="text-xs text-text-tertiary mb-1">{t.report_spent}</p>
              <p className="text-xl font-bold text-expense-600 tabular-nums num">{formatAmount(animatedSpent)}</p>
            </div>
          </div>

          {/* Daily bar chart */}
          {dailyBreakdown.length > 0 && (
            <div className="bg-surface rounded-2xl p-4 shadow-card">
              <p className="text-sm font-bold text-text-primary mb-3">{t.report_daily_sales}</p>
              {(() => {
                const maxAmount = Math.max(...dailyBreakdown.map(d => d.amount), 1)
                const bestDay = dailyBreakdown.reduce((best, d) => d.amount > best.amount ? d : best, { day: 0, amount: 0 })
                return (
                  <>
                    {bestDay.amount > 0 && (
                      <p className="text-xs text-text-secondary mb-2">
                        {t.report_best_day} {bestDay.day}: {formatAmount(bestDay.amount)}
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

          {/* Debt reminders */}
          {topDebtors.length > 0 && (
            <div className="bg-surface rounded-2xl p-4 shadow-card">
              <p className="text-sm font-bold text-text-primary mb-3">{t.report_debtors}</p>
              <div className="space-y-2">
                {topDebtors.map((debtor, i) => (
                  <div key={i} className="flex items-center justify-between bg-background rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{debtor.name}</p>
                      <p className="text-xs text-text-tertiary">{t.report_owes} {formatAmount(debtor.amount)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { hapticLight(); sendDebtReminder(debtor.raw) }}
                      className="bg-income-50 text-income-600 text-xs font-semibold px-3 py-2 rounded-lg active:scale-95 transition-transform flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Icon name="whatsapp" className="w-4 h-4" />
                      {t.report_send_reminder}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order stats — totals only, NO margins */}
          <div className="bg-surface rounded-2xl p-4 shadow-card">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-primary-600 tabular-nums num">{report.totalOrders}</p>
                <p className="text-xs text-text-tertiary">{t.report_total_orders}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-income-600 tabular-nums num">{report.completedOrders}</p>
                <p className="text-xs text-text-tertiary">{t.report_completed_orders}</p>
              </div>
            </div>
          </div>

          {/* Link to switch to Pro */}
          <Link
            to="/settings"
            className="block text-center text-xs text-primary-600 font-medium py-2"
          >
            {t.report_switch_to_pro}
          </Link>
        </div>
      ) : (
        /* ============================================
           PRO MODE — Full data tables, theoretical/BOM, variance
           ============================================ */
        <div className="px-4 space-y-4">
          {/* Period Summary */}
          <div className="bg-surface rounded-2xl p-4 shadow-card">
            <p className="text-xs text-text-tertiary mb-1">{t.report_period}</p>
            <p className="text-sm font-semibold text-text-primary">
              {formatArabicDate(report.period.start)} — {formatArabicDate(report.period.end)}
            </p>
          </div>

          {/* Real Cash Flow Section */}
          <section>
            <h2 className="text-sm font-bold text-txt-secondary mb-2 px-1 truncate">{t.report_net_cash_profit}</h2>
            <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
              {/* Cash Received */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-income-50 flex items-center justify-center flex-shrink-0">
                    <Icon name="arrowDown" className="w-5 h-5 text-income-600" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary text-sm truncate">{t.report_cash_received}</p>
                    <p className="text-xs text-text-tertiary">{t.report_received}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-income-600 tabular-nums num flex-shrink-0">
                  {formatAmount(animatedReceived)}
                </p>
              </div>

              {/* Cash Spent */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-expense-50 flex items-center justify-center flex-shrink-0">
                    <Icon name="arrowUp" className="w-5 h-5 text-expense-600" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary text-sm truncate">{t.report_operational_expenses}</p>
                    <p className="text-xs text-text-tertiary">{t.report_spent}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-expense-600 tabular-nums num flex-shrink-0">
                  {formatAmount(animatedSpent)}
                </p>
              </div>

              {/* Personal Withdrawal */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-withdrawal-50 flex items-center justify-center flex-shrink-0">
                    <Icon name="userMinus" className="w-5 h-5 text-withdrawal-600" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary text-sm truncate">{t.report_personal_withdrawal}</p>
                    <p className="text-xs text-text-tertiary">{t.withdrawal_desc}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-withdrawal-600 tabular-nums num flex-shrink-0">
                  {formatAmount(report.withdrawal)}
                </p>
              </div>

              {/* Net Cash Profit */}
              <div className="flex items-center justify-between p-4 bg-background rounded-b-2xl">
                <div className="min-w-0">
                  <p className="font-bold text-text-primary truncate">{t.report_net_cash_profit}</p>
                  <p className="text-xs text-text-tertiary">{t.report_received} − {t.report_spent}</p>
                </div>
                <p className={`text-2xl font-bold tabular-nums num flex-shrink-0 ${
                  report.realCashProfit >= 0 ? 'text-income-600' : 'text-expense-600'
                }`}>
                  {formatAmount(animatedProfit)}
                </p>
              </div>
            </div>
          </section>

          {/* Theoretical Profit Section (BOM-based, analytical) */}
          <section>
            <h2 className="text-sm font-bold text-txt-secondary mb-2 px-1 flex items-center gap-2">
              <Icon name="info" className="w-4 h-4 text-primary-600 flex-shrink-0" />
              <span className="truncate">{t.report_theoretical_profit}</span>
            </h2>
            <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
              {/* Theoretical Revenue */}
              <div className="flex items-center justify-between p-4 gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary text-sm truncate">{t.report_theoretical_revenue}</p>
                  <p className="text-xs text-text-tertiary">{report.completedOrders} {t.report_completed_orders}</p>
                </div>
                <p className="text-lg font-bold text-text-primary tabular-nums num flex-shrink-0">
                  {formatAmount(report.theoreticalRevenue)}
                </p>
              </div>

              {/* Theoretical Cost (BOM) */}
              <div className="flex items-center justify-between p-4 gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary text-sm truncate">{t.report_theoretical_cost}</p>
                  <p className="text-xs text-text-tertiary">{t.cost_of_goods}</p>
                </div>
                <p className="text-lg font-bold text-expense-600 tabular-nums num flex-shrink-0">
                  {formatAmount(report.theoreticalCost)}
                </p>
              </div>

              {/* Theoretical Profit */}
              <div className="flex items-center justify-between p-4 bg-background rounded-b-2xl gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-text-primary truncate">{t.report_theoretical_profit}</p>
                  <p className="text-xs text-text-tertiary">{t.report_theoretical_revenue} − {t.report_theoretical_cost}</p>
                </div>
                <p className={`text-2xl font-bold tabular-nums num flex-shrink-0 ${
                  report.theoreticalProfit >= 0 ? 'text-income-600' : 'text-expense-600'
                }`}>
                  {formatAmount(report.theoreticalProfit)}
                </p>
              </div>
            </div>
          </section>

          {/* Variance Analysis */}
          <section>
            <h2 className="text-sm font-bold text-txt-secondary mb-2 px-1 truncate">{t.report_variance}</h2>
            <div className="bg-surface rounded-2xl p-4 shadow-card">
              <div className="flex items-center justify-between mb-2 gap-3">
                <p className="font-semibold text-text-primary text-sm truncate">{t.report_variance}</p>
                <p className={`text-xl font-bold tabular-nums num flex-shrink-0 ${varianceColor}`}>
                  {report.variance > 0 ? '+' : ''}{formatAmount(report.variance)}
                </p>
              </div>
              <p className="text-xs text-text-tertiary">
                {varianceLabel}
              </p>
              <p className="text-xs text-text-tertiary mt-2 leading-relaxed">
                {report.variance > 0
                  ? t.report_variance_surplus_desc
                  : report.variance < 0
                  ? t.report_variance_shortage_desc
                  : t.report_variance_balanced_desc
                }
              </p>
            </div>
          </section>

          {/* Order Stats */}
          <section>
            <h2 className="text-sm font-bold text-txt-secondary mb-2 px-1 truncate">{t.report_total_orders}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface rounded-2xl p-4 shadow-card text-center">
                <p className="text-xs text-text-secondary mb-1">{t.report_total_orders}</p>
                <p className="text-2xl font-bold text-text-primary tabular-nums num">{report.totalOrders}</p>
              </div>
              <div className="bg-surface rounded-2xl p-4 shadow-card text-center">
                <p className="text-xs text-text-secondary mb-1">{t.report_completed_orders}</p>
                <p className="text-2xl font-bold text-income-600 tabular-nums num">{report.completedOrders}</p>
              </div>
            </div>
          </section>

          {/* Link to switch to Simple */}
          <Link
            to="/settings"
            className="block text-center text-xs text-primary-600 font-medium py-2"
          >
            {t.report_switch_to_pro}
          </Link>
        </div>
      )}
    </div>
  )
}
