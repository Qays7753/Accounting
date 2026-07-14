import { db } from '../db'

/**
 * Accounting Logic & Business Rules
 *
 * 1. Opening Balances (First Launch Only):
 *    - Cash available → opening_balance transaction (positive)
 *    - Debts owed to me → opening_balance transaction (positive, tracked separately)
 *    - Debts I owe → opening_balance transaction (negative, reduces net worth)
 *
 * 2. Simple Cash Accounting:
 *    - Track daily cash flow (in/out)
 *    - Personal Withdrawal is separated from business expenses
 *      (doesn't affect business profit calculation, just reduces cash)
 *    - Net Profit = Total Income - Total Expenses
 *
 * 3. Service-Based Support:
 *    - "Purchases" replaced with inclusive terms
 *    - Outgoing money = "What I Paid" (صرف)
 *    - Incoming money = "What I Received" (قبض)
 */

/**
 * Calculate comprehensive accounting summary for a date range
 */
export async function getAccountingSummary(startDate, endDate) {
  const items = await db.getTransactionsByDateRange(startDate, endDate)
  return calculateSummary(items)
}

/**
 * Calculate summary from a list of transactions
 */
export function calculateSummary(transactions) {
  let income = 0
  let expense = 0
  let withdrawal = 0
  let openingPositive = 0
  let openingNegative = 0

  for (const t of transactions) {
    if (t.type === 'income') {
      income += t.amount
    } else if (t.type === 'expense') {
      expense += t.amount
    } else if (t.type === 'withdrawal') {
      withdrawal += t.amount
    } else if (t.type === 'opening_balance') {
      if (t.amount >= 0) openingPositive += t.amount
      else openingNegative += Math.abs(t.amount)
    }
  }

  return {
    income,
    expense,
    withdrawal,
    openingPositive,
    openingNegative,
    netProfit: income - expense, // Business profit (excludes personal withdrawals)
    netCash: income - expense - withdrawal + openingPositive - openingNegative,
    totalTransactions: transactions.length,
  }
}

/**
 * Get cash balance (current available cash)
 * = All income + opening_balance (positive) - expenses - withdrawals - opening_balance (negative)
 */
export async function getCurrentCashBalance() {
  return await db.getCashBalance()
}

/**
 * Get net worth = Cash + Debts owed to me - Debts I owe
 * This is different from cash balance because it includes non-cash assets/liabilities.
 */
export async function getNetWorth() {
  const all = await db.transactions.toArray()
  let cash = 0
  let debtsOwedToMe = 0
  let debtsIOwe = 0

  for (const t of all) {
    if (t.type === 'income') cash += t.amount
    else if (t.type === 'expense') cash -= t.amount
    else if (t.type === 'withdrawal') cash -= t.amount
    else if (t.type === 'opening_balance') {
      if (t.category === 'ديون مستحقة لي') {
        debtsOwedToMe += t.amount
      } else if (t.category === 'ديون مستحقة علي') {
        debtsIOwe += Math.abs(t.amount)
      } else {
        // Cash opening balance
        if (t.amount >= 0) cash += t.amount
        else cash -= Math.abs(t.amount)
      }
    }
  }

  return {
    cash,
    debtsOwedToMe,
    debtsIOwe,
    netWorth: cash + debtsOwedToMe - debtsIOwe,
  }
}

/**
 * Get today's totals
 */
export async function getTodayTotals() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  return await getAccountingSummary(start, end)
}

/**
 * Get this week's totals
 */
export async function getWeekTotals() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay())
  start.setHours(0, 0, 0, 0)
  return await getAccountingSummary(start, now)
}

/**
 * Get this month's totals
 */
export async function getMonthTotals() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return await getAccountingSummary(start, end)
}

/**
 * Get category breakdown for expenses
 */
export async function getCategoryBreakdown(startDate, endDate, type = 'expense') {
  const items = await db.getTransactionsByDateRange(startDate, endDate)
  const byCategory = {}
  for (const t of items) {
    if (t.type !== type) continue
    const cat = t.category || 'بدون فئة'
    if (!byCategory[cat]) byCategory[cat] = 0
    byCategory[cat] += t.amount
  }
  // Convert to sorted array
  return Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Validate transaction data before saving
 */
export function validateTransaction(data) {
  const errors = []
  if (!data.type || !['income', 'expense', 'withdrawal', 'opening_balance'].includes(data.type)) {
    errors.push('نوع المعاملة غير صالح')
  }
  if (!data.amount || data.amount <= 0) {
    errors.push('المبلغ يجب أن يكون أكبر من صفر')
  }
  return errors
}

/**
 * Validate order data
 */
export function validateOrder(data) {
  const errors = []
  if (!data.customerName?.trim() && !data.orderType?.trim()) {
    errors.push('يجب إدخال اسم الزبون أو نوع الطلب')
  }
  return errors
}
