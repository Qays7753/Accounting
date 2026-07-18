/**
 * Financial Reports Engine — Professional accounting calculations.
 *
 * computeIncomeStatement(data): Revenue → COGS → Gross Profit → OpEx → Wastage → Net Profit
 * computeBalanceSheet(data): Assets (Cash + Inventory + Receivables), Liabilities (Payables), Equity
 * computeKPIs(data): 10 KPIs with { value, available, missing } pattern
 *
 * All functions accept the DB export data shape:
 * { transactions, orders, customers, settings, meta, items }
 */

/**
 * Compute Income Statement from transaction data.
 * @param {Object} data — { transactions, orders }
 * @returns {Object} income statement
 */
export function computeIncomeStatement(data) {
  const { transactions = [], orders = [] } = data
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Revenue = completed order amounts (cash + credit sales)
  const completedOrders = orders.filter(o => o.status === 'closed')
  const revenue = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0)

  // COGS = sum of cost_of_goods from income transactions this month
  const cogs = transactions
    .filter(t => t.type === 'income' && new Date(t.date) >= monthStart)
    .reduce((sum, t) => sum + (t.cost_of_goods || 0), 0)

  const grossProfit = revenue - cogs

  // Operating Expenses = expense transactions this month
  const opex = transactions
    .filter(t => t.type === 'expense' && new Date(t.date) >= monthStart)
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  // Wastage = returns/expense transactions categorized as waste
  const wastage = transactions
    .filter(t => t.type === 'expense' && new Date(t.date) >= monthStart &&
      (t.category || '').includes('هدر') || (t.category || '').includes('تالف'))
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const netProfit = grossProfit - opex - wastage

  return {
    revenue: { value: revenue, available: orders.length > 0, missing: orders.length === 0 ? ['orders'] : [] },
    cogs: { value: cogs, available: transactions.length > 0, missing: [] },
    grossProfit: { value: grossProfit, available: true, missing: [] },
    opex: { value: opex, available: transactions.length > 0, missing: [] },
    wastage: { value: wastage, available: true, missing: [] },
    netProfit: { value: netProfit, available: true, missing: [] },
  }
}

/**
 * Compute Balance Sheet from transaction + debt data.
 * @param {Object} data — { transactions, receivables, payables, items }
 * @returns {Object} balance sheet
 */
export function computeBalanceSheet(data) {
  const { transactions = [], receivables = [], payables = [], items = [] } = data

  // Assets
  const cash = transactions
    .filter(t => t.type === 'income' || t.type === 'opening_balance')
    .reduce((sum, t) => sum + (t.amount || 0), 0)
    - transactions
    .filter(t => t.type === 'expense' || t.type === 'withdrawal')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const receivablesValue = receivables
    .filter(r => (r.amount || 0) - (r.debtAmountPaid || 0) > 0)
    .reduce((sum, r) => sum + ((r.amount || 0) - (r.debtAmountPaid || 0)), 0)

  // Inventory value = sum of (current_stock * last unit_cost) for exact items
  const inventoryValue = items
    .filter(i => i.tracking_mode === 'exact' && i.current_stock > 0)
    .reduce((sum, i) => {
      const lastPurchase = i.purchase_history?.[i.purchase_history.length - 1]
      const unitCost = lastPurchase?.unit_cost || 0
      return sum + (i.current_stock * unitCost)
    }, 0)

  const totalAssets = cash + receivablesValue + inventoryValue

  // Liabilities
  const payablesValue = payables
    .filter(p => (p.amount || 0) - (p.debtAmountPaid || 0) > 0)
    .reduce((sum, p) => sum + ((p.amount || 0) - (p.debtAmountPaid || 0)), 0)

  // Equity = Assets - Liabilities
  const equity = totalAssets - payablesValue

  return {
    assets: {
      cash: { value: cash, label: 'نقد' },
      receivables: { value: receivablesValue, label: 'ذمم مدينة' },
      inventory: { value: inventoryValue, label: 'مخزون' },
      total: { value: totalAssets, label: 'إجمالي الأصول' },
    },
    liabilities: {
      payables: { value: payablesValue, label: 'ذمم دائنة' },
      total: { value: payablesValue, label: 'إجمالي الخصوم' },
    },
    equity: {
      value: equity,
      label: 'حقوق الملكية',
    },
  }
}

/**
 * Compute 10 KPIs from financial data.
 * Each returns { value, available, missing: [] }.
 *
 * @param {Object} data — { transactions, orders, receivables, payables, items }
 * @returns {Object} kpis
 */
export function computeKPIs(data) {
  const { transactions = [], orders = [], receivables = [], payables = [], items = [] } = data
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Income statement components
  const is = computeIncomeStatement(data)

  // 1. Gross Margin = Gross Profit / Revenue
  const grossMargin = {
    value: is.revenue.value > 0 ? Math.round((is.grossProfit.value / is.revenue.value) * 100) : 0,
    available: is.revenue.available && is.revenue.value > 0,
    missing: is.revenue.value === 0 ? ['revenue'] : [],
    unit: '%',
    label: 'هامش إجمالي الربح',
  }

  // 2. Net Profit Margin = Net Profit / Revenue
  const netProfitMargin = {
    value: is.revenue.value > 0 ? Math.round((is.netProfit.value / is.revenue.value) * 100) : 0,
    available: is.revenue.available && is.revenue.value > 0,
    missing: is.revenue.value === 0 ? ['revenue'] : [],
    unit: '%',
    label: 'هامش صافي الربح',
  }

  // 3. ROI = Net Profit / (Cash Invested) — simplified
  const totalInvested = transactions
    .filter(t => t.type === 'opening_balance')
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const roi = {
    value: totalInvested > 0 ? Math.round((is.netProfit.value / totalInvested) * 100) : 0,
    available: totalInvested > 0 && is.netProfit.available,
    missing: totalInvested === 0 ? ['opening_balance'] : [],
    unit: '%',
    label: 'العائد على الاستثمار',
  }

  // 4. Inventory Turnover = COGS / Avg Inventory Value
  const inventoryValue = items
    .filter(i => i.tracking_mode === 'exact' && i.current_stock > 0)
    .reduce((sum, i) => {
      const lastP = i.purchase_history?.[i.purchase_history.length - 1]
      return sum + (i.current_stock * (lastP?.unit_cost || 0))
    }, 0)
  const inventoryTurnover = {
    value: inventoryValue > 0 ? Math.round(is.cogs.value / inventoryValue * 10) / 10 : 0,
    available: inventoryValue > 0 && is.cogs.value > 0,
    missing: inventoryValue === 0 ? ['items'] : [],
    unit: 'x',
    label: 'معدل دوران المخزون',
  }

  // 5. DSO (Days Sales Outstanding) = (Receivables / Revenue) × 30
  const receivablesTotal = receivables
    .filter(r => (r.amount || 0) - (r.debtAmountPaid || 0) > 0)
    .reduce((sum, r) => sum + ((r.amount || 0) - (r.debtAmountPaid || 0)), 0)
  const dso = {
    value: is.revenue.value > 0 ? Math.round((receivablesTotal / is.revenue.value) * 30) : 0,
    available: is.revenue.value > 0 && receivables.length > 0,
    missing: is.revenue.value === 0 ? ['revenue'] : [],
    unit: ' يوم',
    label: 'متوسط تحصيل الديون',
  }

  // 6. Runway = Cash / Avg Daily Expense
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
  const runway = {
    value: avgDailyExpense > 0 ? Math.floor(currentCash / avgDailyExpense) : Infinity,
    available: transactions.length > 0 && avgDailyExpense > 0,
    missing: transactions.length === 0 ? ['transactions'] : (avgDailyExpense === 0 ? ['expenses'] : []),
    unit: ' يوم',
    label: 'أيام الصمود',
  }

  // 7. Current Ratio = Assets / Liabilities
  const payablesTotal = payables
    .filter(p => (p.amount || 0) - (p.debtAmountPaid || 0) > 0)
    .reduce((sum, p) => sum + ((p.amount || 0) - (p.debtAmountPaid || 0)), 0)
  const currentRatio = {
    value: payablesTotal > 0 ? Math.round((currentCash / payablesTotal) * 10) / 10 : Infinity,
    available: payablesTotal > 0,
    missing: payablesTotal === 0 ? ['payables'] : [],
    unit: '',
    label: 'نسبة السيولة',
  }

  // 8. Cash Turnover = Revenue / Cash
  const cashTurnover = {
    value: currentCash > 0 ? Math.round((is.revenue.value / currentCash) * 10) / 10 : 0,
    available: currentCash > 0 && is.revenue.value > 0,
    missing: currentCash === 0 ? ['cash'] : [],
    unit: 'x',
    label: 'دوران النقد',
  }

  // 9. OpEx Ratio = OpEx / Revenue
  const opexRatio = {
    value: is.revenue.value > 0 ? Math.round((is.opex.value / is.revenue.value) * 100) : 0,
    available: is.revenue.value > 0,
    missing: is.revenue.value === 0 ? ['revenue'] : [],
    unit: '%',
    label: 'نسبة المصروفات',
  }

  // 10. Avg Ticket = Revenue / Number of Completed Orders
  const completedCount = orders.filter(o => o.status === 'closed').length
  const avgTicket = {
    value: completedCount > 0 ? Math.round(is.revenue.value / completedCount) : 0,
    available: completedCount > 0,
    missing: completedCount === 0 ? ['orders'] : [],
    unit: '',
    label: 'متوسط قيمة الطلب',
  }

  return {
    grossMargin,
    netProfitMargin,
    roi,
    inventoryTurnover,
    dso,
    runway,
    currentRatio,
    cashTurnover,
    opexRatio,
    avgTicket,
  }
}

/**
 * Gather all data needed for investor reports from DB.
 * @param {Object} db — Dexie database instance
 * @returns {Promise<Object>} { transactions, orders, receivables, payables, items, settings, meta }
 */
export async function gatherReportData(db) {
  const [transactions, orders, items, meta] = await Promise.all([
    db.transactions.toArray(),
    db.orders.toArray(),
    db.items?.toArray?.() || [],
    db.meta.toArray(),
  ])
  const receivables = await db.getReceivables()
  const payables = await db.getPayables()
  return { transactions, orders, receivables, payables, items, meta }
}
