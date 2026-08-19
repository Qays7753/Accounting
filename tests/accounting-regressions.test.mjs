import assert from 'node:assert/strict'
import {
  computeBalanceSheet,
  computeIncomeStatement,
  getRevenueAmount,
} from '../src/utils/financialReports.js'

const transactions = [
  { id: 1, type: 'opening_balance', amount: 1500, category: 'رصيد افتتاحي', date: '2026-08-20T08:00:00.000Z' },
  { id: 2, type: 'income', amount: 300, category: 'مبيعات', date: '2026-08-20T09:00:00.000Z' },
  { id: 3, type: 'income', amount: 250, linkedDebtId: 20, category: 'تسديد دين', date: '2026-08-20T10:00:00.000Z' },
  { id: 4, type: 'capital_injection', amount: 1000, category: 'رأس مال', date: '2026-08-20T11:00:00.000Z' },
  { id: 5, type: 'expense', amount: 100, category: 'مواد', date: '2026-08-20T12:00:00.000Z' },
  { id: 6, type: 'expense', amount: 25, category: 'تشغيل', date: '2026-08-20T13:00:00.000Z' },
]

const orders = [
  { id: 10, status: 'closed', paymentType: 'cash', paymentTransactionId: 2, amount: 300, total_cost: 0 },
  { id: 11, status: 'closed', paymentType: 'done', amount: 500, total_cost: 100 },
]

assert.equal(getRevenueAmount(transactions, orders), 300, 'debt settlement and capital injection must not become revenue')

const incomeStatement = computeIncomeStatement({ transactions, orders })
assert.equal(incomeStatement.revenue.value, 300, 'tracking-only order must not become revenue')
assert.equal(incomeStatement.opex.value, 125, 'operating expenses should remain expenses')

const balanceSheet = computeBalanceSheet({ transactions, receivables: [], payables: [], items: [] })
assert.equal(balanceSheet.assets.cash.value, 2925, 'cash includes opening balance, sales, capital and subtracts expenses')

const wastageTransactions = [
  { type: 'expense', amount: 10, category: 'هدر', date: '2026-08-20T09:00:00.000Z' },
  { type: 'income', amount: 100, category: 'تالف - وصف قديم', date: '2026-08-20T09:00:00.000Z' },
]
const wastageStatement = computeIncomeStatement({ transactions: wastageTransactions, orders: [] })
assert.equal(wastageStatement.wastage.value, 10, 'wastage must require expense type and waste category')

console.log('Accounting regression tests passed')
