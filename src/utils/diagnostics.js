/**
 * Diagnostic Engine — Smart business insights from raw financial data.
 *
 * computeSnapshot(data): Calculates raw metrics from DB export.
 * diagnose(metrics, rules, level): Applies ruleset to generate SWOT insights.
 *
 * Every metric returns { value, available: bool, missing: [] } so the UI
 * can gracefully handle missing data without showing NaN/undefined.
 */

/**
 * Compute raw business metrics from DB data.
 * @param {Object} data — { transactions, orders, receivables, settings }
 * @returns {Object} metrics
 */
export function computeSnapshot(data) {
  const { transactions = [], orders = [], receivables = [], settings = {} } = data
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000)

  // --- Daily Sales (today's income from cash sales) ---
  const todayIncome = transactions
    .filter(t => t.type === 'income' && new Date(t.date) >= todayStart)
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const dailySales = {
    value: todayIncome,
    available: transactions.length > 0,
    missing: transactions.length === 0 ? ['transactions'] : [],
  }

  // --- Overdue Debt (receivables not settled, older than 7 days) ---
  const overdueReceivables = receivables.filter(r => {
    const remaining = (r.amount || 0) - (r.debtAmountPaid || 0)
    return remaining > 0 && new Date(r.date) < weekAgo
  })
  const overdueDebt = {
    value: overdueReceivables.reduce((sum, r) => sum + ((r.amount || 0) - (r.debtAmountPaid || 0)), 0),
    available: receivables.length > 0,
    missing: receivables.length === 0 ? ['receivables'] : [],
  }

  // --- Dead Stock Value (not yet implemented — items table needed) ---
  // Placeholder: 0 until inventory is built
  const deadStockValue = {
    value: 0,
    available: false,
    missing: ['items'],
  }

  // --- Runway Days (how many days can the business survive on current cash) ---
  // Formula: currentCash / averageDailyExpense
  const expensesLast30 = transactions
    .filter(t => t.type === 'expense' && new Date(t.date) >= monthAgo)
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const avgDailyExpense = expensesLast30 / 30
  const currentCash = transactions
    .filter(t => t.type === 'income' || t.type === 'opening_balance')
    .reduce((sum, t) => sum + (t.amount || 0), 0)
    - transactions
    .filter(t => t.type === 'expense' || t.type === 'withdrawal')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const runwayDays = {
    value: avgDailyExpense > 0 ? Math.floor(currentCash / avgDailyExpense) : Infinity,
    available: transactions.length > 0 && avgDailyExpense > 0,
    missing: transactions.length === 0 ? ['transactions'] : (avgDailyExpense === 0 ? ['expenses'] : []),
  }

  // --- Weekly Sales Trend ---
  const weeklySales = transactions
    .filter(t => t.type === 'income' && new Date(t.date) >= weekAgo)
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const prevWeekSales = transactions
    .filter(t => {
      const d = new Date(t.date)
      return t.type === 'income' && d >= new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000) && d < weekAgo
    })
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const salesTrend = {
    value: prevWeekSales > 0 ? Math.round(((weeklySales - prevWeekSales) / prevWeekSales) * 100) : 0,
    available: transactions.length > 0,
    missing: transactions.length === 0 ? ['transactions'] : [],
  }

  // --- Pending Orders ---
  const pendingOrders = orders.filter(o => o.status === 'in_progress' || o.status === 'ready')
  const pendingOrdersCount = {
    value: pendingOrders.length,
    available: orders.length > 0,
    missing: orders.length === 0 ? ['orders'] : [],
  }

  // --- Wastage Ratio (هدر / مصاريف) ---
  // Wastage = expense transactions with category containing 'هدر' or 'تالف'
  const monthAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const wastageExpenses = transactions
    .filter(t => t.type === 'expense' && new Date(t.date) >= monthAgoDate &&
      ((t.category || '').includes('هدر') || (t.category || '').includes('تالف') || (t.description || '').includes('هدر')))
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const totalExpenses = transactions
    .filter(t => t.type === 'expense' && new Date(t.date) >= monthAgoDate)
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const wastageRatio = {
    value: totalExpenses > 0 ? Math.round((wastageExpenses / totalExpenses) * 100) : 0,
    available: totalExpenses > 0 && wastageExpenses > 0,
    missing: totalExpenses === 0 ? ['expenses'] : [],
  }

  // --- Top Expense Category + Ratio ---
  const expensesByCategory = {}
  for (const t of transactions) {
    if (t.type === 'expense' && new Date(t.date) >= monthAgoDate) {
      const cat = t.category || 'غير مصنّف'
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (t.amount || 0)
    }
  }
  const topCategory = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])[0]
  const topExpenseRatio = {
    value: (topCategory && totalExpenses > 0) ? Math.round((topCategory[1] / totalExpenses) * 100) : 0,
    available: !!topCategory && totalExpenses > 0,
    missing: !topCategory ? ['expenses'] : [],
    category: topCategory ? topCategory[0] : '',
  }

  return {
    dailySales,
    overdueDebt,
    deadStockValue,
    runwayDays,
    salesTrend,
    pendingOrdersCount,
    wastageRatio,
    topExpenseRatio,
    currentCash: {
      value: currentCash,
      available: transactions.length > 0,
      missing: transactions.length === 0 ? ['transactions'] : [],
    },
  }
}

/**
 * Apply diagnostic rules to metrics and generate SWOT insights.
 * @param {Object} metrics — from computeSnapshot()
 * @param {Array} rules — from diagnostic_rules.json
 * @param {string} level — 'simple' | 'pro'
 * @returns {Array} insights — [{ id, type, text, severity, action }]
 */
export function diagnose(metrics, rules, level = 'simple') {
  const insights = []

  for (const rule of rules) {
    // Skip if required metrics are missing
    const requiredMetrics = rule.requires || []
    const allAvailable = requiredMetrics.every(m => metrics[m]?.available)
    if (!allAvailable) continue

    // Evaluate the condition
    let conditionMet = false
    try {
      conditionMet = evalCondition(rule.condition, metrics)
    } catch {
      continue
    }

    if (conditionMet) {
      insights.push({
        id: rule.id,
        type: rule.type, // 'strength' | 'weakness' | 'opportunity' | 'threat'
        text: rule.text[level] || rule.text.simple,
        severity: rule.severity, // 'green' | 'red' | 'orange' | 'teal'
        action: rule.action || null,
        actionLabel: rule.actionLabel?.[level] || rule.actionLabel?.simple || null,
      })
    }
  }

  return insights
}

/**
 * Safely evaluate a rule condition against metrics.
 * @param {string} condition — e.g., "overdueDebt.value > dailySales.value * 3"
 * @param {Object} metrics
 * @returns {boolean}
 */
function evalCondition(condition, metrics) {
  // Build a safe evaluation context with only metric values
  const ctx = {}
  for (const [key, metric] of Object.entries(metrics)) {
    ctx[key] = metric.value
  }
  // Replace metric names with ctx. prefix
  const safeCondition = condition.replace(/(\b\w+\b)\.value/g, (match, name) => {
    return `ctx.${name}`
  })
  // eslint-disable-next-line no-new-func
  return new Function('ctx', `return ${safeCondition}`)(ctx)
}
