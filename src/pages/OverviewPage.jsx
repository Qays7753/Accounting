import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import {
  useTerms,
  useActiveLayer,
  useLanguageMode,
} from '../context/TermsContext.jsx'
import { useSettings2 } from '../context/SettingsContext.jsx'
import { useCloudSync } from '../context/CloudSyncContext.jsx'
import {
  gatherReportData,
  computeIncomeStatement,
  computeBalanceSheet,
  computeKPIs,
} from '../utils/financialReports.js'
import {
  computeHeroMetric,
  computeKpiTiles,
  computeRangeSummary,
  computeRestockPrediction,
} from '../utils/overviewCompute.js'
import { formatAmount } from '../utils/format.js'
import { formatArabicDate } from '../utils/date.js'
import { hapticLight, hapticSuccess } from '../utils/haptics.js'
import Icon from '../components/ui/Icon.jsx'
import SegmentedControl from '../components/ui/SegmentedControl.jsx'
import StrategicInputSheets from '../components/sheets/StrategicInputSheets.jsx'
import InsightsPanel from '../components/overview/InsightsPanel.jsx'

/**
 * OverviewPage — V14 §13 executive panel (scoped to /overview).
 *
 * Layer-scaled content:
 *   Layer 1 (Daily)    → hero = week net / 3 KPI tiles / text analysis
 *   Layer 2 (Manager)  → hero = net + margin / 5 KPI tiles / cost-margin +
 *                         inventory + restock analysis
 *   Layer 3 (Investor) → hero = net / equity / 7 KPI tiles / income-statement
 *                         waterfall + balance-sheet cards / strategic actions
 *                         (Add Asset / Add Loan / Inject Capital / Owner Draw)
 *                         + PDF export
 *
 * Data engine: `financialReports.js` (pure compute, reused as-is) +
 *   `overviewCompute.js` (range-aware + layer-scaled derivations).
 *
 * §13 scope: stark-white `#FFFFFF` page bg, light typography, generous
 *   whitespace, single dark number island (`#2A2521`), terracotta-surface
 *   hero card (the documented bold exception), no terracotta in KPI tiles.
 *
 * SOP refs: §13 (executive panel), §1 (palette), §4.3 (vertical rhythm),
 *           §5 (typography), §6.1 (no hand-rolled <header> — uses PageHeader
 *           from AppLayout, but for the in-page header band we render a
 *           non-sticky section, NOT a <header> element).
 *
 * Agent 5 mounts the insights panel at `#overview-insights-placeholder`.
 *
 * NO `window.location.reload()` anywhere — strategic-input saves trigger
 *   `refreshData()` which re-fetches via `gatherReportData(db)` and
 *   `setReportData(...)`, keeping the 30-second cloud-sync debounce window
 *   intact.
 */
export default function OverviewPage() {
  const t = useTerms()
  const [activeLayer, setActiveLayer] = useActiveLayer()
  const [languageMode] = useLanguageMode()
  const { businessName } = useSettings2()
  const { authorized: cloudConnected } = useCloudSync()
  const navigate = useNavigate()

  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('week') // 'today' | 'week' | 'month'
  const [strategicSheetOpen, setStrategicSheetOpen] = useState(false)

  // ---- Data load + refresh (NO reload — local state refresh) ----
  const refreshData = useCallback(async () => {
    try {
      const fresh = await gatherReportData(db)
      setReportData(fresh)
    } catch (e) {
      console.error('Overview data refresh failed:', e)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    gatherReportData(db)
      .then(d => {
        if (!cancelled) {
          setReportData(d)
          setLoading(false)
        }
      })
      .catch(e => {
        console.error('Overview data load failed:', e)
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // ---- PDF Export — migrated from InvestorDashboard.jsx (lines 84–175).
  // Lazy-loads jsPDF only when user clicks export. Unchanged in logic. ----
  const handleExportPDF = async () => {
    if (!reportData) return
    hapticLight()
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = 210
    let y = 20

    const incomeStatement = computeIncomeStatement(reportData)
    const balanceSheet = computeBalanceSheet(reportData)
    const kpis = computeKPIs(reportData)

    const formatKPI = (kpi) => {
      if (!kpi.available) return '—'
      if (kpi.value === Infinity) return '∞'
      return `${kpi.value.toLocaleString('en-US')}${kpi.unit || ''}`
    }

    // Title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(businessName || 'متجري', pageWidth / 2, y, { align: 'center' })
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Financial Report — ${formatArabicDate(new Date())}`, pageWidth / 2, y, { align: 'center' })
    y += 12

    // Income Statement
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Income Statement', 20, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const is = incomeStatement
    const isRows = [
      ['Revenue', formatAmount(is.revenue.value)],
      ['COGS', `(${formatAmount(is.cogs.value)})`],
      ['Gross Profit', formatAmount(is.grossProfit.value)],
      ['Operating Expenses', `(${formatAmount(is.opex.value)})`],
      ['Wastage', `(${formatAmount(is.wastage.value)})`],
      ['Net Profit', formatAmount(is.netProfit.value)],
    ]
    isRows.forEach(([label, value]) => {
      doc.text(label, 25, y)
      doc.text(value, pageWidth - 25, y, { align: 'right' })
      y += 6
    })
    y += 8

    // Balance Sheet
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Balance Sheet', 20, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const bs = balanceSheet
    const bsRows = [
      ['Assets — Cash', formatAmount(bs.assets.cash.value)],
      ['Assets — Receivables', formatAmount(bs.assets.receivables.value)],
      ['Assets — Inventory', formatAmount(bs.assets.inventory.value)],
      ['Total Assets', formatAmount(bs.assets.total.value)],
      ['Liabilities — Payables', formatAmount(bs.liabilities.payables.value)],
      ['Equity', formatAmount(bs.equity.value)],
    ]
    bsRows.forEach(([label, value]) => {
      doc.text(label, 25, y)
      doc.text(value, pageWidth - 25, y, { align: 'right' })
      y += 6
    })
    y += 8

    // Key KPIs
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Key Performance Indicators', 20, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const kpiRows = [
      ['Gross Margin', formatKPI(kpis.grossMargin)],
      ['Net Profit Margin', formatKPI(kpis.netProfitMargin)],
      ['ROI', formatKPI(kpis.roi)],
      ['Runway (days)', formatKPI(kpis.runway)],
      ['Avg Ticket', formatKPI(kpis.avgTicket)],
    ]
    kpiRows.forEach(([label, value]) => {
      doc.text(label, 25, y)
      doc.text(value, pageWidth - 25, y, { align: 'right' })
      y += 6
    })

    doc.save(`${businessName || 'report'}-${new Date().toISOString().slice(0, 10)}.pdf`)
    hapticSuccess()
  }

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <p className="text-ink-secondary">{t.overview_analysis_no_data}</p>
      </div>
    )
  }

  // ---- Layer-scaled derived values ----
  const heroMetric = computeHeroMetric(reportData, activeLayer, range)
  const kpiTiles = computeKpiTiles(reportData, activeLayer, range)
  const rangeSummary = computeRangeSummary(reportData, range)
  const incomeStatement = activeLayer === 3 ? computeIncomeStatement(reportData) : null
  const balanceSheet = activeLayer === 3 ? computeBalanceSheet(reportData) : null
  const restock = activeLayer >= 2 ? computeRestockPrediction(reportData) : null

  // ---- Layer badge text ----
  const layerName = activeLayer === 3
    ? t.overview_layer_investor
    : activeLayer === 2
      ? t.overview_layer_manager
      : t.overview_layer_daily

  // ---- Date-range segments ----
  const rangeSegments = [
    { id: 'today', label: t.overview_range_today },
    { id: 'week', label: t.overview_range_week },
    { id: 'month', label: t.overview_range_month },
  ]

  return (
    <div className="min-h-screen bg-surface">
      {/* ============================================================
          4.1  HEADER BAND — title + layer badge + back + date range.
          NOTE: this is a non-sticky section, NOT a <header> element,
          so SOP §6.1 (no hand-rolled <header>) is respected. The
          sticky AppLayout chrome (PageHeader slot at top) is empty
          here because Overview doesn't use the home-variant header.
      ============================================================ */}
      <section className="px-4 pt-4 pb-2 bg-surface">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => { hapticLight(); navigate(-1) }}
              className="flex items-center gap-1 text-caption text-ink-secondary font-semibold active:scale-95 transition-transform mb-1"
              style={{ minHeight: '44px' }}
              aria-label={t.overview_back}
            >
              <Icon name="chevronRight" className="w-4 h-4" strokeWidth={2.5} />
              <span>{t.overview_back}</span>
            </button>
            <h1 className="text-title text-ink leading-tight">{t.overview_title}</h1>
            <p className="text-caption text-ink-secondary mt-1 num">
              {formatArabicDate(new Date())}
            </p>
          </div>
          <div
            className="flex-none flex items-center gap-1.5 h-9 px-3 rounded-pill bg-primary-50 text-primary-700"
            style={{ minHeight: '36px' }}
          >
            <Icon name="user" className="w-3.5 h-3.5" strokeWidth={2} />
            <span className="text-caption font-bold leading-none whitespace-nowrap">
              {t.overview_layer_badge_prefix}{layerName}
            </span>
          </div>
        </div>

        {/* Date-range selector */}
        <div className="mt-4">
          <SegmentedControl
            segments={rangeSegments}
            value={range}
            onChange={setRange}
            variant="pill"
          />
        </div>
      </section>

      <div className="px-4 py-4 space-y-8">
        {/* ============================================================
            4.2  HERO METRIC — single most important number for layer.
            §13.1: hero card as a terracotta surface (#CC785C) with ivory
            text — the documented bold exception. ONE card per page.
        ============================================================ */}
        <section>
          <HeroMetricCard
            label={
              activeLayer === 3
                ? t.overview_hero_label_layer_3
                : activeLayer === 2
                  ? t.overview_hero_label_layer_2
                  : t.overview_hero_label_layer_1
            }
            value={heroMetric.value}
            secondary={heroMetric.secondary}
            available={heroMetric.available}
          />
        </section>

        {/* ============================================================
            4.3  KPI TILES — layer-scaled (3/5/7).
            §13.2: pyramid, not flat grid. Each tile = label + big number
            + small sign indicator + cool semantic color (NO terracotta).
        ============================================================ */}
        <section>
          <h2 className="text-section text-ink mb-3">{t.overview_kpi_profit}</h2>
          <div className={`grid ${kpiTiles.length <= 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
            {kpiTiles.map((tile, i) => (
              <KpiTile
                key={i}
                label={t[tile.label]}
                value={tile.value}
                sign={tile.sign}
                color={tile.color}
                isPercent={tile.isPercent}
              />
            ))}
          </div>
        </section>

        {/* ============================================================
            4.4  ANALYSIS — layer-scaled.
            L1: text summary.
            L2: cost/margin breakdown + inventory status + restock prediction.
            L3: income-statement waterfall + balance-sheet cards (migrated
                from InvestorDashboard.jsx).
        ============================================================ */}
        <section>
          <h2 className="text-section text-ink mb-3">{t.overview_analysis_section_title}</h2>

          {activeLayer === 1 && (
            <AnalysisLayer1
              summary={rangeSummary}
              noData={t.overview_analysis_no_data}
              weekSummaryTpl={t.overview_analysis_week_summary}
            />
          )}

          {activeLayer === 2 && (
            <AnalysisLayer2
              summary={rangeSummary}
              restock={restock}
              t={t}
            />
          )}

          {activeLayer === 3 && incomeStatement && balanceSheet && (
            <AnalysisLayer3
              incomeStatement={incomeStatement}
              balanceSheet={balanceSheet}
              t={t}
            />
          )}
        </section>

        {/* ============================================================
            4.5  INSIGHTS PANEL — معلومات تهمّك (Agent 5).
            Data-driven prioritized insights (≤3 cards, ranked).
            Reuses OverviewPage state: reportData / range / activeLayer /
            languageMode / cloudConnected. Layer switches route through
            `setActiveLayer` (non-destructive per Agent 2's guarantee).
        ============================================================ */}
        <InsightsPanel
          reportData={reportData}
          range={range}
          activeLayer={activeLayer}
          languageMode={languageMode}
          cloudConnected={cloudConnected}
          onSwitchLayer={setActiveLayer}
        />

        {/* ============================================================
            4.6  STRATEGIC ACTIONS — Investor layer only.
            Per Agent 2's guarantee: downgrading from L3 hides the UI but
            leaves every row in fixed_assets/loans/transactions intact;
            upgrading back re-exposes them. The data behind this section
            remains in the DB even when the section is hidden.
        ============================================================ */}
        {activeLayer === 3 && (
          <section>
            <h2 className="text-section text-ink mb-3">{t.overview_strategic_actions_title}</h2>
            <div className="grid grid-cols-2 gap-3">
              <StrategicActionButton
                icon="wallet"
                label={t.overview_add_asset}
                desc={t.overview_strategic_add_asset_desc}
                onClick={() => { hapticLight(); setStrategicSheetOpen(true) }}
                bgClass="bg-primary-50"
                iconBgClass="bg-primary-100"
                iconColorClass="text-primary-600"
              />
              <StrategicActionButton
                icon="bank"
                label={t.overview_add_loan}
                desc={t.overview_strategic_add_loan_desc}
                onClick={() => { hapticLight(); setStrategicSheetOpen(true) }}
                bgClass="bg-expense-50"
                iconBgClass="bg-expense-100"
                iconColorClass="text-expense-600"
              />
              <StrategicActionButton
                icon="arrowDown"
                label={t.overview_inject_capital}
                desc={t.overview_strategic_inject_capital_desc}
                onClick={() => { hapticLight(); setStrategicSheetOpen(true) }}
                bgClass="bg-income-50"
                iconBgClass="bg-income-100"
                iconColorClass="text-income-600"
              />
              <StrategicActionButton
                icon="userMinus"
                label={t.overview_owner_draw}
                desc={t.overview_strategic_owner_draw_desc}
                onClick={() => { hapticLight(); setStrategicSheetOpen(true) }}
                bgClass="bg-withdrawal-50"
                iconBgClass="bg-withdrawal-100"
                iconColorClass="text-withdrawal-600"
              />
            </div>
            {/* PDF export — teal accent (secondary action, distinct from
                financial mutations which are terracotta primary). */}
            <button
              type="button"
              onClick={handleExportPDF}
              className="w-full mt-3 flex items-center justify-center gap-2 h-12 rounded-card bg-accent-50 text-accent-600 font-bold text-sm active:scale-95 transition-transform"
              style={{ minHeight: '44px' }}
            >
              <Icon name="document" className="w-5 h-5" strokeWidth={2} />
              <span>{t.overview_export_pdf}</span>
            </button>
          </section>
        )}
      </div>

      {/* ============================================================
          STRATEGIC INPUT SHEETS — reusable module.
          `onSaved` triggers a local data refresh (NO reload).
      ============================================================ */}
      <StrategicInputSheets
        open={strategicSheetOpen}
        onClose={() => setStrategicSheetOpen(false)}
        onSaved={refreshData}
      />
    </div>
  )
}

/* =====================================================================
 *  Sub-components — kept in this file (not exported) to keep the
 *  OverviewPage as a single source of truth for the §13 treatment.
 * ===================================================================== */

/**
 * Hero metric card — §13.1 terracotta surface hero (the documented bold
 * exception). Big Mono number + small label below. The single most
 * important number for the current layer.
 */
function HeroMetricCard({ label, value, secondary, available }) {
  const displayValue = available ? formatAmount(Math.abs(value)) : '—'
  const sign = available ? (value >= 0 ? '+' : '−') : ''
  return (
    <div className="bg-primary rounded-card p-5 shadow-card">
      <p className="text-caption text-white/80 font-medium mb-2 leading-tight">{label}</p>
      <p
        className="num text-[34px] font-bold text-white leading-none"
        style={{ fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate' }}
      >
        {sign}{displayValue}
      </p>
      {secondary && (
        <p className="text-caption text-white/80 font-medium mt-2 leading-tight">{secondary}</p>
      )}
    </div>
  )
}

/**
 * KPI tile — §13.2 pyramid cell. White surface + thin border (no shadow —
 * either border OR shadow per SOP §1). Cool semantic color only.
 *
 * Tailwind's JIT cannot generate `text-${color}` dynamically, so we use a
 * lookup table that maps each color name to the full Tailwind class.
 */
const KPI_COLOR_CLASSES = {
  'income-600': 'text-income-600',
  'expense-600': 'text-expense-600',
  'withdrawal-600': 'text-withdrawal-600',
  'returns-500': 'text-returns-500',
  'ink': 'text-ink',
}

function KpiTile({ label, value, sign, color, isPercent }) {
  const isMissing = value === null || value === undefined
  const displayValue = isMissing
    ? '—'
    : isPercent
      ? `${value}%`
      : formatAmount(Math.abs(value || 0))
  const signPrefix = !isMissing && sign ? sign : ''
  const colorClass = KPI_COLOR_CLASSES[color] || 'text-ink'
  return (
    <div className="bg-surface rounded-card p-3 border border-divider">
      <p className="text-caption text-ink-secondary leading-tight mb-1">{label}</p>
      <p
        className={`num text-card-title font-bold leading-none ${colorClass}`}
        style={{ fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate' }}
      >
        {signPrefix}{displayValue}
      </p>
    </div>
  )
}

/**
 * Layer 1 analysis — simple text summary.
 */
function AnalysisLayer1({ summary, noData, weekSummaryTpl }) {
  if (!summary.available) {
    return (
      <div className="bg-surface rounded-card p-4 border border-divider">
        <p className="text-sm text-ink-secondary leading-relaxed">{noData}</p>
      </div>
    )
  }
  const text = weekSummaryTpl
    .replace('{profit}', formatAmount(summary.net))
    .replace('{expense}', formatAmount(summary.expense + summary.cogs))
  return (
    <div className="bg-surface rounded-card p-4 border border-divider">
      <p className="text-sm text-ink leading-relaxed">{text}</p>
    </div>
  )
}

/**
 * Layer 2 analysis — cost/margin breakdown + inventory status + restock
 * prediction. Reuses `computeRestockPrediction` (predictive reorder logic
 * from `db.getLowStockItems`, mirrored in `overviewCompute.js`).
 */
function AnalysisLayer2({ summary, restock, t }) {
  const marginPct = summary.revenue > 0
    ? Math.round((summary.net / summary.revenue) * 100)
    : 0
  const cogsPct = summary.revenue > 0
    ? Math.round((summary.cogs / summary.revenue) * 100)
    : 0
  const opexPct = summary.revenue > 0
    ? Math.round((summary.expense / summary.revenue) * 100)
    : 0

  return (
    <div className="space-y-3">
      {/* Cost / margin breakdown */}
      <div className="bg-surface rounded-card p-4 border border-divider">
        <p className="text-sm font-bold text-ink mb-3">{t.overview_analysis_margin_breakdown}</p>
        <div className="space-y-2.5">
          <AnalysisBar label={t.overview_kpi_revenue} value={summary.revenue} max={summary.revenue} colorClass="bg-accent-500" />
          <AnalysisBar label="COGS" value={summary.cogs} max={summary.revenue} colorClass="bg-expense-500" prefix="−" />
          <AnalysisBar label={t.overview_kpi_expense} value={summary.expense} max={summary.revenue} colorClass="bg-expense-400" prefix="−" />
          <AnalysisBar label={t.overview_kpi_profit} value={summary.net} max={summary.revenue} colorClass="bg-income-500" prefix={summary.net >= 0 ? '+' : '−'} />
        </div>
        <div className="mt-3 pt-3 border-t border-divider flex justify-between text-caption text-ink-secondary">
          <span>{t.overview_kpi_margin}</span>
          <span className="num font-bold text-ink">{marginPct}%</span>
        </div>
        <div className="flex justify-between text-caption text-ink-secondary">
          <span>COGS</span>
          <span className="num font-bold text-ink">{cogsPct}%</span>
        </div>
        <div className="flex justify-between text-caption text-ink-secondary">
          <span>OpEx</span>
          <span className="num font-bold text-ink">{opexPct}%</span>
        </div>
      </div>

      {/* Inventory status */}
      <div className="bg-surface rounded-card p-4 border border-divider">
        <p className="text-sm font-bold text-ink mb-2">{t.overview_analysis_inventory_status}</p>
        <p className="text-caption text-ink-secondary leading-relaxed">
          {restock && restock.count > 0
            ? t.overview_analysis_restock_warn.replace('{count}', restock.count)
            : t.overview_analysis_restock_ok}
        </p>
      </div>

      {/* Restock prediction */}
      <div className="bg-surface rounded-card p-4 border border-divider">
        <p className="text-sm font-bold text-ink mb-2">{t.overview_analysis_restock_prediction}</p>
        {restock && restock.count > 0 ? (
          <ul className="space-y-1.5">
            {restock.items.slice(0, 5).map(item => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-ink truncate">{item.name}</span>
                <span className="num text-expense-600 font-bold flex-none">
                  {item.tracking_mode === 'exact'
                    ? `${item.current_stock || 0} ${t.overview_remaining}`
                    : t.overview_restock_action}
                </span>
              </li>
            ))}
            {restock.count > 5 && (
              <li className="text-caption text-ink-secondary pt-1">
                {t.overview_more_items.replace('{count}', restock.count - 5)}
              </li>
            )}
          </ul>
        ) : (
          <p className="text-caption text-ink-secondary leading-relaxed">
            {t.overview_analysis_restock_ok}
          </p>
        )}
      </div>
    </div>
  )
}

/** Small horizontal proportional bar for the Layer 2 cost breakdown. */
function AnalysisBar({ label, value, max, colorClass, prefix = '' }) {
  const widthPct = Math.max(0, Math.min(100, (Math.abs(value) / Math.max(1, max)) * 100))
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-ink-secondary">{label}</span>
        <span className="num text-sm font-bold text-ink">
          {prefix}{formatAmount(Math.abs(value))}
        </span>
      </div>
      <div className="h-2 bg-mute rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-500`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Layer 3 analysis — income-statement waterfall + balance-sheet cards.
 * Migrated from InvestorDashboard.jsx (lines 278–340). The Net Profit hero
 * card uses `#2A2521` inline (the ONE documented dark number island per
 * §13.1). The Equity hero card uses `bg-primary` (terracotta surface — the
 * documented bold exception).
 */
function AnalysisLayer3({ incomeStatement, balanceSheet, t }) {
  return (
    <div className="space-y-6">
      {/* Income Statement — vertical waterfall */}
      <div>
        <h3 className="text-card-title font-bold text-ink mb-3">{t.overview_income_statement_title}</h3>
        <div className="bg-surface rounded-card p-4 space-y-3 border border-divider">
          <WaterfallRow label={t.overview_kpi_revenue} value={incomeStatement.revenue.value} max={incomeStatement.revenue.value} color="bg-primary" textColor="text-ink" />
          <WaterfallRow label="COGS" value={-incomeStatement.cogs.value} max={incomeStatement.revenue.value} color="bg-expense-500" textColor="text-expense-600" prefix="−" />
          <WaterfallRow label={t.overview_gross_profit} value={incomeStatement.grossProfit.value} max={incomeStatement.revenue.value} color="bg-income-500" textColor="text-income-600" bold />
          <WaterfallRow label={t.overview_opex} value={-incomeStatement.opex.value} max={incomeStatement.revenue.value} color="bg-expense-500" textColor="text-expense-600" prefix="−" />
          {incomeStatement.wastage.value > 0 && (
            <WaterfallRow label={t.overview_wastage} value={-incomeStatement.wastage.value} max={incomeStatement.revenue.value} color="bg-returns-500" textColor="text-returns-500" prefix="−" />
          )}
          {/* Net Profit — the ONE dark number island (#2A2521, §13.1) */}
          <div className="rounded-card p-4 mt-4" style={{ background: '#2A2521' }}>
            <div className="flex items-center justify-between">
              <p className="text-caption text-white/80 font-medium">{t.overview_net_profit}</p>
              <p
                className="num text-title font-bold text-white"
                style={{ fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate' }}
              >
                {formatAmount(incomeStatement.netProfit.value)}
              </p>
            </div>
            <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{
                  width: `${Math.max(0, Math.min(100, (incomeStatement.netProfit.value / Math.max(1, incomeStatement.revenue.value)) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Balance Sheet — 3 stacked cards */}
      <div>
        <h3 className="text-card-title font-bold text-ink mb-3">{t.overview_balance_sheet_title}</h3>
        <div className="space-y-3">
          {/* Assets */}
          <div className="bg-surface rounded-card p-4 border border-divider">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-ink text-sm">{t.overview_assets}</p>
              <p className="num text-title-sm font-bold text-ink">{formatAmount(balanceSheet.assets.total.value)}</p>
            </div>
            <div className="space-y-1.5">
              <BalanceRow label={balanceSheet.assets.cash.label} value={balanceSheet.assets.cash.value} total={balanceSheet.assets.total.value} color="bg-primary" />
              <BalanceRow label={balanceSheet.assets.receivables.label} value={balanceSheet.assets.receivables.value} total={balanceSheet.assets.total.value} color="bg-income-500" />
              <BalanceRow label={balanceSheet.assets.inventory.label} value={balanceSheet.assets.inventory.value} total={balanceSheet.assets.total.value} color="bg-accent-500" />
            </div>
          </div>

          {/* Liabilities */}
          <div className="bg-surface rounded-card p-4 border border-divider">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-ink text-sm">{t.overview_liabilities}</p>
              <p className="num text-title-sm font-bold text-expense-600">{formatAmount(balanceSheet.liabilities.total.value)}</p>
            </div>
            <div className="space-y-1.5">
              <BalanceRow label={balanceSheet.liabilities.payables.label} value={balanceSheet.liabilities.payables.value} total={Math.max(1, balanceSheet.liabilities.total.value)} color="bg-expense-500" />
            </div>
          </div>

          {/* Equity — §13.1 terracotta-surface hero exception */}
          <div className="bg-primary rounded-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="font-bold text-white text-sm">{balanceSheet.equity.label}</p>
              <p
                className="num text-title-sm font-bold text-white"
                style={{ fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate' }}
              >
                {formatAmount(balanceSheet.equity.value)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Waterfall row for income statement — migrated from InvestorDashboard. */
function WaterfallRow({ label, value, max, color, textColor, prefix = '', bold = false }) {
  const widthPercent = Math.max(0, Math.min(100, (Math.abs(value) / Math.max(1, max)) * 100))
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className={`text-sm ${bold ? 'font-bold text-ink' : 'text-ink-secondary'}`}>{label}</p>
        <p className={`num text-sm font-bold ${textColor}`} style={{ unicodeBidi: 'isolate' }}>
          {prefix}{formatAmount(Math.abs(value))}
        </p>
      </div>
      <div className="h-2 bg-mute rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${widthPercent}%` }} />
      </div>
    </div>
  )
}

/** Balance sheet row with proportional bar — migrated from InvestorDashboard. */
function BalanceRow({ label, value, total, color }) {
  const widthPercent = Math.max(0, Math.min(100, (value / Math.max(1, total)) * 100))
  return (
    <div className="flex items-center gap-3">
      <span className="text-caption text-ink-secondary flex-1">{label}</span>
      <span className="num text-caption font-bold text-ink w-20 text-left" style={{ unicodeBidi: 'isolate' }}>
        {formatAmount(value)}
      </span>
      <div className="w-16 h-1.5 bg-mute rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${widthPercent}%` }} />
      </div>
    </div>
  )
}

/**
 * Strategic action button — used in the Investor-only strategic actions
 * section. Renders as a card with icon + label + desc. Cool semantic color
 * per action. Opens the strategic-input sheets (which contain the terracotta
 * primary save buttons).
 */
function StrategicActionButton({ icon, label, desc, onClick, bgClass, iconBgClass, iconColorClass }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press flex flex-col items-start gap-3 rounded-card p-4 text-right ${bgClass}`}
      style={{ minHeight: '44px' }}
    >
      <div className={`w-12 h-12 rounded-card ${iconBgClass} grid place-items-center`}>
        <Icon name={icon} className={`w-6 h-6 ${iconColorClass}`} />
      </div>
      <div>
        <div className="text-sm font-bold text-ink">{label}</div>
        <div className="text-caption text-ink-secondary">{desc}</div>
      </div>
    </button>
  )
}
