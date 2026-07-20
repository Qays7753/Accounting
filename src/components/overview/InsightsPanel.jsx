import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../db'
import { useTerms } from '../../context/TermsContext.jsx'
import { hapticLight } from '../../utils/haptics.js'
import { formatAmount } from '../../utils/format.js'
import Icon from '../ui/Icon.jsx'
import {
  computeRangeSummary,
  computeRestockPrediction,
} from '../../utils/overviewCompute.js'

/**
 * InsightsPanel — "معلومات تهمّك" (V14)
 *
 * A data-driven, prioritized insights panel mounted at
 * `#overview-insights-placeholder` inside OverviewPage. Shows at most 2–3
 * insight cards at a time, ranked by importance, to avoid alert fatigue.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PRIORITY SCORING (0–100, descending sort, top 3 rendered)
 * ─────────────────────────────────────────────────────────────────────────
 *  Category A — Operational alerts (HIGHEST, can displace layer-awareness):
 *    cloud_backup_off       → 95   (always-on if !cloudConnected)
 *    inventory_low          → 90   (Layer 2/3, restock.count > 0)
 *    overdue_debts          → 85   (any receivable past 7 days, amount > 0)
 *    no_sales_today         → 80   (range==='today' && revenue===0
 *                                  && transactions.length > 0 — only nudge
 *                                  if the user has used the app before)
 *
 *  Category B — Layer-awareness (ALWAYS a candidate, score 70):
 *    layer_awareness_1|2|3  → 70   (renders the one matching activeLayer)
 *    Rule: always in top 3 unless 3+ higher-priority alerts fire.
 *
 *  Category C — Growth suggestion UP (MEDIUM, score 60):
 *    upgrade_1_to_2         → 60   (Layer 1 && weekly revenue > 5,000)
 *    upgrade_2_to_3         → 60   (Layer 2 && monthly revenue > 20,000)
 *
 *  Category D — Simplify suggestion DOWN (LOW, score 30):
 *    downgrade_2_to_1       → 30   (Layer 2 && items.length===0 OR no exact
 *                                  item with purchase in the last 30 days)
 *    downgrade_3_to_2       → 30   (Layer 3 && no fixed_assets AND no loans
 *                                  in DB — fetched once on mount via small
 *                                  count query; NOT a re-fetch of
 *                                  `gatherReportData` output)
 *
 *  Threshold rationale:
 *    • weekly revenue > 5,000 → at this scale, missing cost-of-goods tracking
 *      materially distorts profit; Layer 2 cost/margin tools become useful.
 *    • monthly revenue > 20,000 → at this scale, the user likely has capital
 *      structure (assets or financing) worth tracking via Layer 3.
 *    • 30 days without inventory activity → "abandoned" heuristic; gentle nudge
 *      only, never destructive (downgrade keeps all data per Agent 2's
 *      guarantee — `setActiveLayer` is a pure settings write).
 *
 *  Layer switch safety: every upgrade/downgrade action calls `onSwitchLayer(n)`
 *  which is OverviewPage's `setActiveLayer` from `useActiveLayer()`. Per
 *  Agent 2's hand-off: "setActiveLayer(n) is async — it writes
 *  db.setSetting('active_layer', n) AND updates React state in one call. It
 *  does NOT touch business data." Downgrading hides UI but keeps every row
 *  in fixed_assets/loans/transactions intact; re-upgrading re-exposes them.
 *
 *  SOP §13 scope: panel lives INSIDE /overview (stark-white page bg).
 *    • Cool semantic colors only on insight cards (income/expense/withdrawal/
 *      returns). NO terracotta on insight cards — terracotta is reserved for
 *      the §13 hero card + strategic-action primary buttons.
 *    • Either a thin border OR a shadow per card — NEVER both (we use border).
 *    • Min touch target 44×44px on action buttons.
 *    • RTL throughout.
 *
 *  No re-fetch: this panel reuses `reportData` (full `gatherReportData(db)`
 *  output) passed from OverviewPage. The ONE exception is a one-shot
 *  `db.fixed_assets.count()` + `db.loans.count()` for the Layer 3 downgrade
 *  check — these tables are NOT in `reportData`, so it is a NEW fetch, not a
 *  re-fetch.
 *
 *  No `db.on('changes')` / `dexie-observable` — strictly forbidden (crashes
 *  the app on Google connect, see CloudSyncContext.jsx lines 224–232).
 */
export default function InsightsPanel({
  reportData,
  range,
  activeLayer,
  languageMode: _languageMode, // accepted for API symmetry; we read terms via useTerms()
  cloudConnected,
  onSwitchLayer,
}) {
  const t = useTerms()
  const navigate = useNavigate()

  // ---- One-shot check: does Layer 3 have any strategic data?
  // (fixed_assets + loans are NOT in `reportData` — small fresh count query).
  // Default to `true` to avoid flashing a false-positive downgrade suggestion
  // while the count query is in flight.
  const [hasStrategicAssets, setHasStrategicAssets] = useState(true)
  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const [assetsCount, loansCount] = await Promise.all([
          db.fixed_assets?.count?.() ?? Promise.resolve(0),
          db.loans?.count?.() ?? Promise.resolve(0),
        ])
        if (!cancelled) {
          setHasStrategicAssets((assetsCount || 0) > 0 || (loansCount || 0) > 0)
        }
      } catch (e) {
        console.error('[InsightsPanel] strategic-asset check failed:', e)
        // Stay `true` — never falsely suggest a downgrade on a query failure.
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  // ---- Build candidate insights (data-driven from real DB / state) ----
  const candidates = useMemo(() => {
    const list = []
    if (!reportData) return list

    const {
      transactions = [],
      receivables = [],
      payables = [],
      items = [],
    } = reportData

    // Pre-compute shared derivations (re-use OverviewPage's helpers —
    // these are pure functions, calling them again on the same data is cheap
    // and avoids prop-drilling every derived value).
    const rangeSummary = computeRangeSummary(reportData, range)
    const restock =
      activeLayer >= 2 ? computeRestockPrediction(reportData) : { count: 0, items: [] }

    // ───────── A.1 — Cloud backup not enabled ─────────
    if (!cloudConnected) {
      list.push({
        id: 'cloud_backup_off',
        score: 95,
        icon: 'alertTriangle',
        color: 'expense',
        title: t.insight_cloud_backup_off_title,
        body: t.insight_cloud_backup_off_body,
        actionLabel: t.insight_cloud_backup_off_action,
        onAction: () => { hapticLight(); navigate('/settings') },
      })
    }

    // ───────── A.2 — Inventory low (Layer 2/3 only) ─────────
    if (activeLayer >= 2 && restock.count > 0) {
      list.push({
        id: 'inventory_low',
        score: 90,
        icon: 'inventory',
        color: 'expense',
        title: t.insight_inventory_low_title,
        body: t.insight_inventory_low_body.replace('{count}', String(restock.count)),
        actionLabel: t.insight_inventory_low_action,
        onAction: () => { hapticLight(); navigate('/inventory') },
      })
    }

    // ───────── A.3 — Overdue debts (any layer) ─────────
    // Mirrors `src/utils/diagnostics.js` line 35–43: a receivable is "overdue"
    // if it is not settled AND its `date` (the day the debt was given) is
    // older than 7 days. We use the remaining outstanding balance
    // (amount − debtAmountPaid).
    const weekAgoTs = Date.now() - 7 * 24 * 60 * 60 * 1000
    const overdueTotal = receivables.reduce((sum, r) => {
      const remaining = (r.amount || 0) - (r.debtAmountPaid || 0)
      if (remaining <= 0) return sum
      const ts = new Date(r.date).getTime()
      if (ts >= weekAgoTs) return sum
      return sum + remaining
    }, 0)
    if (overdueTotal > 0) {
      list.push({
        id: 'overdue_debts',
        score: 85,
        icon: 'wallet',
        color: 'expense',
        title: t.insight_overdue_debts_title,
        body: t.insight_overdue_debts_body.replace('{amount}', formatAmount(overdueTotal)),
        actionLabel: t.insight_overdue_debts_action,
        onAction: () => { hapticLight(); navigate('/debts') },
      })
    }

    // ───────── A.4 — No sales today (Layer 1/2/3) ─────────
    // Only nudge if the user has used the app before (transactions.length > 0)
    // — otherwise a brand-new user would see "no sales today" before they've
    // recorded anything, which is meaningless noise.
    if (
      range === 'today' &&
      rangeSummary.revenue === 0 &&
      transactions.length > 0
    ) {
      list.push({
        id: 'no_sales_today',
        score: 80,
        icon: 'trendingDown',
        color: 'withdrawal',
        title: t.insight_no_sales_today_title,
        body: t.insight_no_sales_today_body,
      })
    }

    // ───────── B — Layer-awareness line (always present) ─────────
    const awarenessKey = `insight_layer_awareness_${activeLayer}`
    const awarenessText = t[awarenessKey]
    if (awarenessText) {
      list.push({
        id: `layer_awareness_${activeLayer}`,
        score: 70,
        icon: 'info',
        color: 'withdrawal',
        title: awarenessText,
        // No body, no action — single-line informational.
      })
    }

    // ───────── C.1 — Upgrade 1 → 2 ─────────
    // Threshold: weekly revenue > 5,000 (sensible for street-level small
    // business — at this volume, missing cost tracking materially distorts
    // profit; Layer 2 cost/margin tools become useful).
    if (activeLayer === 1) {
      const weekSummary = computeRangeSummary(reportData, 'week')
      if (weekSummary.revenue > 5000) {
        list.push({
          id: 'upgrade_1_to_2',
          score: 60,
          icon: 'trendingUp',
          color: 'returns',
          title: t.insight_upgrade_1_to_2_title,
          body: t.insight_upgrade_1_to_2_body,
          actionLabel: t.insight_upgrade_1_to_2_action,
          onAction: () => { hapticLight(); onSwitchLayer?.(2) },
        })
      }
    }

    // ───────── C.2 — Upgrade 2 → 3 ─────────
    // Threshold: monthly revenue > 20,000 (sensible for "you've outgrown
    // inventory management alone — track the bigger picture: assets, loans,
    // equity, ROI").
    if (activeLayer === 2) {
      const monthSummary = computeRangeSummary(reportData, 'month')
      if (monthSummary.revenue > 20000) {
        list.push({
          id: 'upgrade_2_to_3',
          score: 60,
          icon: 'trendingUp',
          color: 'returns',
          title: t.insight_upgrade_2_to_3_title,
          body: t.insight_upgrade_2_to_3_body,
          actionLabel: t.insight_upgrade_2_to_3_action,
          onAction: () => { hapticLight(); onSwitchLayer?.(3) },
        })
      }
    }

    // ───────── D.1 — Downgrade 2 → 1 ─────────
    // Trigger: items.length === 0 (no inventory set up at all) OR no
    // exact-tracked item has had a purchase in the last 30 days
    // (inventory abandoned). Be gentle — non-destructive (data stays).
    if (activeLayer === 2) {
      const thirtyDaysAgoTs = Date.now() - 30 * 24 * 60 * 60 * 1000
      const hasRecentInventory = items.some(item => {
        if (item.tracking_mode !== 'exact') return false
        const ph = item.purchase_history || []
        if (ph.length === 0) return false
        const last = new Date(ph[ph.length - 1].date).getTime()
        return last >= thirtyDaysAgoTs
      })
      if (items.length === 0 || !hasRecentInventory) {
        list.push({
          id: 'downgrade_2_to_1',
          score: 30,
          icon: 'arrowDown',
          color: 'withdrawal',
          title: t.insight_downgrade_2_to_1_title,
          body: t.insight_downgrade_2_to_1_body,
          actionLabel: t.insight_downgrade_2_to_1_action,
          onAction: () => { hapticLight(); onSwitchLayer?.(1) },
        })
      }
    }

    // ───────── D.2 — Downgrade 3 → 2 ─────────
    // Trigger: no fixed_assets AND no loans in DB ever (Layer 3's whole
    // point is the balance sheet + strategic inputs; if the user has never
    // recorded any, they're not using it). `hasStrategicAssets` is fetched
    // once on mount via a small count query (see useEffect above).
    if (activeLayer === 3 && !hasStrategicAssets) {
      list.push({
        id: 'downgrade_3_to_2',
        score: 30,
        icon: 'arrowDown',
        color: 'withdrawal',
        title: t.insight_downgrade_3_to_2_title,
        body: t.insight_downgrade_3_to_2_body,
        actionLabel: t.insight_downgrade_3_to_2_action,
        onAction: () => { hapticLight(); onSwitchLayer?.(2) },
      })
    }

    // Suppress unused-var lint for `payables` — kept in destructure for
    // future insights (e.g., "you have unpaid payables approaching due").
    void payables

    return list
  }, [reportData, range, activeLayer, cloudConnected, hasStrategicAssets, t, navigate, onSwitchLayer])

  // ---- Sort descending by score, take top 3 ----
  const topInsights = useMemo(() => {
    return [...candidates].sort((a, b) => b.score - a.score).slice(0, 3)
  }, [candidates])

  if (topInsights.length === 0) return null

  return (
    <section id="overview-insights-placeholder" data-overview-insights>
      <h2 className="text-section text-ink mb-3">{t.insights_section_title}</h2>
      <div className="space-y-3">
        {topInsights.map(insight => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </section>
  )
}

/* =====================================================================
 *  InsightCard — single insight row.
 *
 *  Layout: icon (32×32 tinted square) + text (title bold + body regular)
 *  + optional action pill button on the visual left (RTL end).
 *
 *  Styling: thin border + NO shadow (either/or rule, SOP §1). White surface
 *  so the card sits cleanly on the §13 stark-white page bg. Cool semantic
 *  palette only (expense crimson for alerts, withdrawal steel-blue for
 *  neutral info, returns gold for suggestions). NO terracotta.
 *
 *  Tailwind's JIT cannot generate `text-${color}` dynamically, so we use a
 *  lookup table that maps each color name to the full Tailwind class — same
 *  pattern as OverviewPage's `KPI_COLOR_CLASSES`.
 * ===================================================================== */

const INSIGHT_COLOR_CLASSES = {
  expense: {
    iconBg: 'bg-expense-50',
    iconText: 'text-expense-600',
    actionBg: 'bg-expense-50',
    actionText: 'text-expense-600',
  },
  withdrawal: {
    iconBg: 'bg-withdrawal-50',
    iconText: 'text-withdrawal-600',
    actionBg: 'bg-withdrawal-50',
    actionText: 'text-withdrawal-600',
  },
  returns: {
    iconBg: 'bg-returns-50',
    iconText: 'text-returns-700',
    actionBg: 'bg-returns-50',
    actionText: 'text-returns-700',
  },
  income: {
    iconBg: 'bg-income-50',
    iconText: 'text-income-600',
    actionBg: 'bg-income-50',
    actionText: 'text-income-600',
  },
}

function InsightCard({ insight }) {
  const c = INSIGHT_COLOR_CLASSES[insight.color] || INSIGHT_COLOR_CLASSES.withdrawal
  return (
    <div className="bg-surface rounded-card p-3 border border-divider">
      <div className="flex items-center gap-3">
        {/* Icon — 32×32 tinted square, cool semantic color */}
        <div className={`flex-none w-8 h-8 rounded-card grid place-items-center ${c.iconBg}`}>
          <Icon name={insight.icon} className={`w-4 h-4 ${c.iconText}`} strokeWidth={2} />
        </div>

        {/* Text — title (bold) + optional body (regular).
            Single-line title allowed; body wraps if needed. */}
        <div className="min-w-0 flex-1">
          {insight.title && (
            <p className="text-sm font-bold text-ink leading-tight">{insight.title}</p>
          )}
          {insight.body && (
            <p className="text-caption text-ink-secondary leading-snug mt-0.5">{insight.body}</p>
          )}
        </div>

        {/* Optional action — pill button, 44px min touch target.
            Cool semantic tinted bg + bold caption text. NO terracotta. */}
        {insight.actionLabel && insight.onAction && (
          <button
            type="button"
            onClick={insight.onAction}
            className={`flex-none h-11 px-3 rounded-pill ${c.actionBg} ${c.actionText} text-caption font-bold leading-none whitespace-nowrap active:scale-95 transition-transform`}
            style={{ minHeight: '44px' }}
          >
            {insight.actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
