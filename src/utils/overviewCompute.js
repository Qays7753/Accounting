/**
 * Overview compute helpers — layer-scaled derivations from `gatherReportData`.
 *
 * These helpers do NOT duplicate `financialReports.js` logic — they call the
 * existing `computeIncomeStatement` / `computeBalanceSheet` / `computeKPIs`
 * for the full-scope figures, and add small range-filtered aggregates for the
 * hero metric + KPI tiles when the user picks اليوم / الأسبوع / الشهر.
 *
 * Range semantics:
 *   - 'today' : transactions dated on the same calendar day as `now`
 *   - 'week'  : transactions dated within the last 7 days (rolling)
 *   - 'month' : transactions dated within the current calendar month
 *               (matches `computeIncomeStatement` semantics — used as-is)
 *
 * All amounts are returned as plain numbers (no currency symbol). Format with
 * `formatAmount` at the render layer.
 */

import { computeIncomeStatement, computeBalanceSheet, computeKPIs } from './financialReports.js'

/** Start of today (00:00 local). */
function startOfToday(now = new Date()) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Rolling 7-day window cutoff. */
function weekAgo(now = new Date()) {
  return now.getTime() - 7 * 24 * 60 * 60 * 1000
}

/** Start of current calendar month. */
function startOfMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}

/**
 * Range-aware revenue / expense / net aggregates for the hero metric + KPI
 * tiles. Revenue = sum of completed-order amounts whose `closedAt` (or
 * `date`) falls within the range; expenses = sum of `expense` transactions
 * in range; net = revenue − (cogs + opex) within range. Falls back to 0 if
 * no data — `available` flag lets the UI show "—" for empty tiles.
 *
 * @param {Object} data — output of `gatherReportData(db)`
 * @param {'today'|'week'|'month'} range
 * @returns {{ revenue, expense, cogs, net, available }}
 */
export function computeRangeSummary(data, range = 'week') {
  const { transactions = [], orders = [] } = data
  const now = new Date()
  let cutoff
  if (range === 'today') cutoff = startOfToday(now)
  else if (range === 'week') cutoff = weekAgo(now)
  else cutoff = startOfMonth(now) // 'month'

  // Revenue from completed orders in range. Orders may use `closedAt` or
  // `date`/`createdAt`; fall back to whichever exists.
  const revenue = orders
    .filter(o => o.status === 'closed')
    .filter(o => {
      const ts = new Date(o.closedAt || o.date || o.createdAt || 0).getTime()
      return ts >= cutoff
    })
    .reduce((sum, o) => sum + (o.amount || 0), 0)

  // Expenses + cogs from transactions in range
  const inRangeTx = transactions.filter(t => {
    const ts = new Date(t.date || t.createdAt || 0).getTime()
    return ts >= cutoff
  })

  const expense = inRangeTx
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const cogs = inRangeTx
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.cost_of_goods || 0), 0)

  const withdrawal = inRangeTx
    .filter(t => t.type === 'withdrawal')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const net = revenue - cogs - expense

  return {
    revenue,
    expense,
    cogs,
    withdrawal,
    net,
    available: transactions.length > 0 || orders.length > 0,
  }
}

/**
 * Layer-scaled hero metric.
 *
 *   Layer 1 (Daily)   → net profit for the selected range
 *   Layer 2 (Manager) → net + margin % (margin = net / revenue)
 *   Layer 3 (Investor)→ net / owner's equity (uses balance-sheet equity)
 *
 * @param {Object} data — gatherReportData output
 * @param {1|2|3} activeLayer
 * @param {'today'|'week'|'month'} range
 * @returns {{ value:number, secondary:string|null, available:boolean }}
 *   `value` is the primary hero number (already a plain number).
 *   `secondary` is an optional secondary string (e.g. "هامش 23%") — the
 *   caller renders it as a small label below the hero.
 */
export function computeHeroMetric(data, activeLayer, range) {
  const summary = computeRangeSummary(data, range)

  if (activeLayer === 1) {
    return {
      value: summary.net,
      secondary: null,
      available: summary.available,
    }
  }

  if (activeLayer === 2) {
    const marginPct = summary.revenue > 0
      ? Math.round((summary.net / summary.revenue) * 100)
      : 0
    return {
      value: summary.net,
      secondary: `هامش ${marginPct}%`,
      available: summary.available,
    }
  }

  // Layer 3 — net / owner's equity
  const bs = computeBalanceSheet(data)
  const equity = bs.equity.value
  if (equity > 0) {
    const ratio = Math.round((summary.net / equity) * 100)
    return {
      value: summary.net,
      secondary: `${ratio}% من حقوق الملكية`,
      available: summary.available,
    }
  }
  return {
    value: summary.net,
    secondary: null,
    available: summary.available,
  }
}

/**
 * Layer-scaled KPI tile set.
 *
 *   Layer 1 → 3 tiles  : revenue, expense, profit
 *   Layer 2 → 5 tiles  : + margin %, inventory value
 *   Layer 3 → 7 tiles  : + ROI, equity, cash position
 *
 * Each tile = `{ label, value, sign: '+'|'−'|null, color }` where `color`
 * is one of the documented cool semantic Tailwind tokens (income-600 /
 * expense-600 / withdrawal-600 / returns-500 / ink). NO terracotta in tiles.
 *
 * @param {Object} data
 * @param {1|2|3} activeLayer
 * @param {'today'|'week'|'month'} range
 * @returns {Array<{label:string, value:string, sign:?string, color:string}>}
 */
export function computeKpiTiles(data, activeLayer, range) {
  const summary = computeRangeSummary(data, range)
  const tiles = []

  // Always-on base tiles (Layer 1+)
  tiles.push({
    label: 'overview_kpi_revenue',
    value: summary.revenue,
    sign: '+',
    color: 'income-600',
  })
  tiles.push({
    label: 'overview_kpi_expense',
    value: summary.expense + summary.cogs,
    sign: '−',
    color: 'expense-600',
  })
  tiles.push({
    label: 'overview_kpi_profit',
    value: summary.net,
    sign: summary.net >= 0 ? '+' : '−',
    color: summary.net >= 0 ? 'income-600' : 'expense-600',
  })

  if (activeLayer >= 2) {
    // Manager adds: margin + inventory
    const marginPct = summary.revenue > 0
      ? Math.round((summary.net / summary.revenue) * 100)
      : 0
    tiles.push({
      label: 'overview_kpi_margin',
      value: marginPct,
      isPercent: true,
      sign: marginPct >= 0 ? '+' : '−',
      color: 'returns-500',
    })

    const bs = computeBalanceSheet(data)
    tiles.push({
      label: 'overview_kpi_inventory',
      value: bs.assets.inventory.value,
      sign: null,
      color: 'ink',
    })
  }

  if (activeLayer >= 3) {
    // Investor adds: ROI, equity, cash position
    const kpis = computeKPIs(data)
    tiles.push({
      label: 'overview_kpi_roi',
      value: kpis.roi.available ? kpis.roi.value : null,
      isPercent: true,
      sign: kpis.roi.available && kpis.roi.value >= 0 ? '+' : '−',
      color: 'returns-500',
    })
    const bs = computeBalanceSheet(data)
    tiles.push({
      label: 'overview_kpi_equity',
      value: bs.equity.value,
      sign: null,
      color: 'ink',
    })
    tiles.push({
      label: 'overview_kpi_cash',
      value: bs.assets.cash.value,
      sign: null,
      color: 'withdrawal-600',
    })
  }

  return tiles
}

/**
 * Restock prediction — count of items flagged by `db.getLowStockItems()`.
 * Used by Layer 2 analysis section.
 *
 * @param {Object} data — gatherReportData output (must include `items`)
 * @returns {{ count:number, items:Array }}
 */
export function computeRestockPrediction(data) {
  const items = data.items || []
  const flagged = items.filter(item => {
    if (item.tracking_mode === 'exact') {
      return (item.current_stock || 0) <= 2
    }
    // Predictive: check if we're past the reorder day since last purchase
    if (!item.reorder_day || !item.purchase_history || item.purchase_history.length === 0) return false
    const lastPurchase = new Date(item.purchase_history[item.purchase_history.length - 1].date)
    const daysSince = (Date.now() - lastPurchase.getTime()) / (24 * 60 * 60 * 1000)
    return daysSince >= item.reorder_day
  })
  return { count: flagged.length, items: flagged }
}
