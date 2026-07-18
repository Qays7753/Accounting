import { useState, useEffect } from 'react'
import { db } from '../db'
import { useTerms, useTermsMode } from '../context/TermsContext.jsx'
import { useSettings2 } from '../context/SettingsContext.jsx'
import { gatherReportData, computeIncomeStatement, computeBalanceSheet, computeKPIs } from '../utils/financialReports.js'
import { formatAmount } from '../utils/format.js'
import { formatArabicDate } from '../utils/date.js'
import Icon from '../components/ui/Icon.jsx'
import { hapticLight } from '../utils/haptics.js'
import { useNavigate } from 'react-router-dom'

/**
 * Investor Dashboard (V10 §13) — Executive read-only panel.
 *
 * Layout: KPI Pyramid + Income Statement Waterfall + Balance Sheet Cards.
 * Style: Stark White #FFFFFF + Terracotta blocks + Huge Mono numbers.
 */
export default function InvestorDashboard() {
  const t = useTerms()
  const [reportMode, setReportMode] = useTermsMode()
  const { businessName } = useSettings2()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    gatherReportData(db).then(d => {
      setData(d)
      setLoading(false)
    }).catch(e => {
      console.error('Investor data load failed:', e)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <p className="text-ink-secondary">لا توجد بيانات لعرضها</p>
      </div>
    )
  }

  const incomeStatement = computeIncomeStatement(data)
  const balanceSheet = computeBalanceSheet(data)
  const kpis = computeKPIs(data)

  // KPI ordering: top 2 (hero), middle 4, bottom 4 → 10 total
  const heroKPIs = [kpis.runway, kpis.netProfitMargin]
  const midKPIs = [kpis.grossMargin, kpis.roi, kpis.opexRatio, kpis.avgTicket]
  const bottomKPIs = [kpis.inventoryTurnover, kpis.dso, kpis.cashTurnover, kpis.currentRatio]

  const formatKPI = (kpi) => {
    if (!kpi.available) return '—'
    if (kpi.value === Infinity) return '∞'
    return `${kpi.value.toLocaleString('en-US')}${kpi.unit || ''}`
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header — stark white with terracotta exit button */}
      <header className="sticky top-0 z-20 bg-white border-b border-divider safe-area-top">
        <div className="px-4 pt-3 pb-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-caption text-ink-secondary font-medium leading-tight">لوحة المستثمر</p>
            <h1 className="text-title-sm text-ink leading-tight truncate">{businessName || 'متجري'}</h1>
          </div>
          <button
            type="button"
            onClick={() => { hapticLight(); setReportMode('simple'); navigate('/') }}
            className="bg-primary text-white text-caption font-semibold px-4 py-2.5 rounded-12 active:scale-95 transition-transform"
            style={{ minHeight: '40px' }}
          >
            خروج
          </button>
        </div>
        <p className="px-4 pb-2 text-caption text-ink-tertiary num">{formatArabicDate(new Date())}</p>
      </header>

      <div className="px-4 py-6 space-y-8">
        {/* === KPI PYRAMID === */}
        {/* Hero row: 2 huge KPIs */}
        <section>
          <h2 className="text-section text-ink mb-4">المؤشرات الرئيسية</h2>
          <div className="grid grid-cols-2 gap-3">
            {heroKPIs.map((kpi, i) => (
              <div
                key={i}
                className="bg-primary rounded-card p-5 shadow-card"
              >
                <p className="text-caption text-white/80 font-medium mb-2 leading-tight">{kpi.label}</p>
                <p className="num text-[34px] font-bold text-white leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatKPI(kpi)}
                </p>
              </div>
            ))}
          </div>

          {/* Middle: 4 KPIs in 2×2 */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {midKPIs.map((kpi, i) => (
              <div key={i} className="bg-surface rounded-card p-4 shadow-card border border-divider">
                <p className="text-caption text-ink-secondary mb-1 leading-tight">{kpi.label}</p>
                <p className="num text-title font-bold text-ink leading-none">{formatKPI(kpi)}</p>
              </div>
            ))}
          </div>

          {/* Bottom: 4 small KPIs */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {bottomKPIs.map((kpi, i) => (
              <div key={i} className="bg-surface rounded-card p-3 shadow-card border border-divider">
                <p className="text-caption text-ink-tertiary mb-0.5 leading-tight">{kpi.label}</p>
                <p className="num text-card-title font-bold text-ink-secondary leading-none">{formatKPI(kpi)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* === INCOME STATEMENT — Vertical Waterfall === */}
        <section>
          <h2 className="text-section text-ink mb-4">قائمة الدخل</h2>
          <div className="bg-surface rounded-card shadow-card p-4 space-y-3 border border-divider">
            <WaterfallRow label="الإيرادات" value={incomeStatement.revenue.value} max={incomeStatement.revenue.value} color="bg-primary" textColor="text-ink" />
            <WaterfallRow label="تكلفة البضاعة" value={-incomeStatement.cogs.value} max={incomeStatement.revenue.value} color="bg-expense-500" textColor="text-expense-600" prefix="−" />
            <WaterfallRow label="إجمالي الربح" value={incomeStatement.grossProfit.value} max={incomeStatement.revenue.value} color="bg-income-500" textColor="text-income-600" bold />
            <WaterfallRow label="مصاريف تشغيلية" value={-incomeStatement.opex.value} max={incomeStatement.revenue.value} color="bg-expense-500" textColor="text-expense-600" prefix="−" />
            {incomeStatement.wastage.value > 0 && (
              <WaterfallRow label="هدر" value={-incomeStatement.wastage.value} max={incomeStatement.revenue.value} color="bg-returns-500" textColor="text-returns-500" prefix="−" />
            )}
            {/* Net Profit — hero card */}
            <div className="bg-ink rounded-card p-4 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-caption text-white/80 font-medium">صافي الربح</p>
                <p className="num text-title font-bold text-white">{formatAmount(incomeStatement.netProfit.value)}</p>
              </div>
              <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, (incomeStatement.netProfit.value / Math.max(1, incomeStatement.revenue.value)) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* === BALANCE SHEET — 3 Stacked Cards === */}
        <section>
          <h2 className="text-section text-ink mb-4">الميزانية العمومية</h2>
          <div className="space-y-3">
            {/* Assets */}
            <div className="bg-surface rounded-card p-4 shadow-card border border-divider">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-ink text-sm">الأصول</p>
                <p className="num text-title-sm font-bold text-ink">{formatAmount(balanceSheet.assets.total.value)}</p>
              </div>
              <div className="space-y-1.5">
                <BalanceRow label={balanceSheet.assets.cash.label} value={balanceSheet.assets.cash.value} total={balanceSheet.assets.total.value} color="bg-primary" />
                <BalanceRow label={balanceSheet.assets.receivables.label} value={balanceSheet.assets.receivables.value} total={balanceSheet.assets.total.value} color="bg-income-500" />
                <BalanceRow label={balanceSheet.assets.inventory.label} value={balanceSheet.assets.inventory.value} total={balanceSheet.assets.total.value} color="bg-accent-500" />
              </div>
            </div>

            {/* Liabilities */}
            <div className="bg-surface rounded-card p-4 shadow-card border border-divider">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-ink text-sm">الخصوم</p>
                <p className="num text-title-sm font-bold text-expense-600">{formatAmount(balanceSheet.liabilities.total.value)}</p>
              </div>
              <div className="space-y-1.5">
                <BalanceRow label={balanceSheet.liabilities.payables.label} value={balanceSheet.liabilities.payables.value} total={Math.max(1, balanceSheet.liabilities.total.value)} color="bg-expense-500" />
              </div>
            </div>

            {/* Equity */}
            <div className="bg-primary rounded-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <p className="font-bold text-white text-sm">حقوق الملكية</p>
                <p className="num text-title-sm font-bold text-white">{formatAmount(balanceSheet.equity.value)}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/** Waterfall row for income statement */
function WaterfallRow({ label, value, max, color, textColor, prefix = '', bold = false }) {
  const widthPercent = Math.max(0, Math.min(100, (Math.abs(value) / Math.max(1, max)) * 100))
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className={`text-sm ${bold ? 'font-bold text-ink' : 'text-ink-secondary'}`}>{label}</p>
        <p className={`num text-sm font-bold ${textColor}`}>{prefix}{formatAmount(Math.abs(value))}</p>
      </div>
      <div className="h-2 bg-mute rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${widthPercent}%` }} />
      </div>
    </div>
  )
}

/** Balance sheet row with proportional bar */
function BalanceRow({ label, value, total, color }) {
  const widthPercent = Math.max(0, Math.min(100, (value / Math.max(1, total)) * 100))
  return (
    <div className="flex items-center gap-3">
      <span className="text-caption text-ink-secondary flex-1">{label}</span>
      <span className="num text-caption font-bold text-ink w-20 text-left">{formatAmount(value)}</span>
      <div className="w-16 h-1.5 bg-mute rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${widthPercent}%` }} />
      </div>
    </div>
  )
}
