import { useTerms } from '../context/TermsContext.jsx'
import { useState, useCallback, useMemo } from 'react'
import { useTransactions, useDebounce, useInfiniteScroll, useDashboardStats } from '../hooks/useDatabase.js'
import { db } from '../db'
import { formatAmount } from '../utils/format.js'
import { getRelativeTime, formatArabicDate, isToday } from '../utils/date.js'
import EmptyState from '../components/ui/EmptyState.jsx'
import BottomSheet from '../components/ui/BottomSheet.jsx'
import Snackbar from '../components/ui/Snackbar.jsx'
import Icon from '../components/ui/Icon.jsx'
import TransactionFormSheet from '../components/sheets/TransactionFormSheet.jsx'
import { hapticLight, hapticSuccess, hapticMedium } from '../utils/haptics.js'
import { Link } from 'react-router-dom'

// Type segmented control (SOP §7.3 sliding thumb) — filters the ledger by kind
// Labels resolve via useTerms() at render time (see TYPE_LABEL_KEYS below).
const TYPE_SEGMENTS = [
  { id: 'all', labelKey: 'filter_all' },
  { id: 'income', labelKey: 'filter_income' },
  { id: 'expense', labelKey: 'filter_expense' },
  { id: 'withdrawal', labelKey: 'filter_withdrawal' },
]

// Group a day's transactions under a relative label (today / yesterday / date)
function getDayInfo(date, todayLabel, yesterdayLabel) {
  const d = new Date(date)
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  if (isToday(d)) return { key, label: todayLabel }
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate()) {
    return { key, label: yesterdayLabel }
  }
  return { key, label: formatArabicDate(d) }
}

export default function FinancePage() {
  const t = useTerms()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [snackbar, setSnackbar] = useState(null) // { message, actionLabel, onAction }
  const [editTransaction, setEditTransaction] = useState(null) // V2: transaction being edited
  const [editSheetOpen, setEditSheetOpen] = useState(false)

  // Debounce search to prevent query thrash on every keystroke
  const debouncedSearch = useDebounce(search, 300)

  // V5: Monthly net for the "{t.net_this_month}" card (net = income − expense; withdrawal excluded)
  const stats = useDashboardStats()

  // Load the full ledger (all dates) so it can be grouped by day; type filtering is applied below.
  const {
    items,
    total,
    hasMore,
    loading,
    loadingMore,
    loadMore,
    refresh,
  } = useTransactions({
    search: debouncedSearch,
    startDate: null,
    endDate: null,
    page: 1,
    pageSize: 20,
  })

  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !loadingMore)

  const handleDelete = useCallback(async (transaction) => {
    hapticMedium()
    // Store for undo
    const backup = { ...transaction }
    // Delete immediately
    await db.deleteTransaction(transaction.id)
    refresh()
    // Show undo snackbar
    setSnackbar({
      message: t.snackbar_deleted,
      actionLabel: t.undo,
      onAction: async () => {
        // Restore
        await db.addTransaction({
          type: backup.type,
          amount: backup.amount,
          description: backup.description,
          category: backup.category,
          date: backup.date,
          orderId: backup.orderId,
        })
        refresh()
        hapticSuccess()
      },
    })
  }, [refresh])

  // V2: Open the transaction form in edit mode
  const handleEdit = useCallback((transaction) => {
    hapticLight()
    setEditTransaction(transaction)
    setEditSheetOpen(true)
  }, [])

  // V2: Called when edit form is saved
  const handleEditSaved = useCallback(() => {
    refresh()
    setEditSheetOpen(false)
    setEditTransaction(null)
  }, [refresh])

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
  }

  const handleTypeChange = (newType) => {
    hapticLight()
    setTypeFilter(newType)
  }

  // Apply the type segmented filter (client-side over the loaded ledger)
  const filteredItems = useMemo(() => {
    if (typeFilter === 'all') return items
    if (typeFilter === 'income') return items.filter((tx) => tx.type === 'income' || tx.type === 'opening_balance')
    return items.filter((tx) => tx.type === typeFilter)
  }, [items, typeFilter])

  // Group the (filtered) ledger by day, keeping the DB's desc order; each group carries its net.
  const dayGroups = useMemo(() => {
    const groups = []
    const byKey = new Map()
    for (const tx of filteredItems) {
      const { key, label } = getDayInfo(tx.date, t.today_label, t.yesterday_label)
      let g = byKey.get(key)
      if (!g) {
        g = { key, label, items: [], net: 0 }
        byKey.set(key, g)
        groups.push(g)
      }
      g.items.push(tx)
      if (tx.type === 'income') g.net += tx.amount
      else if (tx.type === 'expense') g.net -= tx.amount
    }
    return groups
  }, [filteredItems, t.today_label, t.yesterday_label])

  const monthNet = stats.monthIncome - stats.monthExpense
  const activeIndex = TYPE_SEGMENTS.findIndex((s) => s.id === typeFilter)

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="px-4 pt-8 pb-3 safe-area-top sticky top-0 bg-background z-20">
        <div className="flex items-center justify-between mb-3.5">
          <h1 className="text-[30px] font-extrabold text-ink -tracking-[.5px]">{t.finance_title}</h1>
        </div>

        {/* {t.net_this_month} */}
        <div className="bg-surface rounded-card px-4 py-[18px] shadow-card flex items-center justify-between mb-3.5">
          <div>
            <div className="text-[12px] text-faint font-medium">{t.net_this_month}</div>
            <div className={`tnum text-[28px] font-extrabold mt-0.5 num ${monthNet >= 0 ? 'text-income-600' : 'text-expense-600'}`}>
              {monthNet >= 0 ? '+' : '−'}{formatAmount(Math.abs(monthNet))}
            </div>
          </div>
          <div className="flex gap-[18px] text-center">
            <div>
              <div className="text-[11px] text-faint">{t.total_income}</div>
              <div className="tnum text-[15px] font-bold text-income-600 num">{formatAmount(stats.monthIncome)}</div>
            </div>
            <div className="w-px bg-divider" />
            <div>
              <div className="text-[11px] text-faint">{t.total_expense}</div>
              <div className="tnum text-[15px] font-bold text-expense-600 num">{formatAmount(stats.monthExpense)}</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3.5">
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Icon name="search" className="w-[21px] h-[21px] text-faint" />
          </div>
          <input
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder={t.search_transactions}
            className="w-full bg-mute rounded-[18px] pr-12 pl-4 py-3 text-sm outline-none border-2 border-transparent focus:border-primary transition-colors"
            dir="rtl"
          />
        </div>

        {/* V5: Segmented control — sliding blue thumb (RTL) */}
        <div className="relative grid grid-cols-4 bg-mute rounded-[16px] p-1">
          <div
            className="absolute top-1 bottom-1 rounded-[12px] bg-primary shadow-sm transition-all duration-300 ease-out"
            style={{ right: `calc(${activeIndex * 25}% + 4px)`, width: 'calc(25% - 8px)' }}
          />
          {TYPE_SEGMENTS.map((seg) => {
            const on = seg.id === typeFilter
            return (
              <button
                key={seg.id}
                onClick={() => handleTypeChange(seg.id)}
                className={`relative z-10 text-[13px] py-2 transition-colors ${on ? 'text-white font-bold' : 'text-sub font-semibold'}`}
              >
                {t[seg.labelKey]}
              </button>
            )
          })}
        </div>
      </header>

      {/* Quick access — clearly labeled entries for Debts & Reports (not in bottom nav) */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        <Link to="/debts" className="press bg-surface rounded-[20px] p-4 shadow-card flex items-center gap-3">
          <div className="w-11 h-11 rounded-[13px] bg-withdraw-bg grid place-items-center flex-none">
            <Icon name="bank" className="w-[22px] h-[22px] text-withdrawal" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-ink">{t.debts_title}</div>
            <div className="text-[11px] text-faint">{t.receivables_tab} {t.payables_tab}</div>
          </div>
          <Icon name="chevronLeft" className="w-4 h-4 text-disabled flex-none" />
        </Link>
        <Link to="/reports" className="press bg-surface rounded-[20px] p-4 shadow-card flex items-center gap-3">
          <div className="w-11 h-11 rounded-[13px] bg-primary-tint grid place-items-center flex-none">
            <Icon name="document" className="w-[22px] h-[22px] text-primary" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-ink">{t.reports_title}</div>
            <div className="text-[11px] text-faint">{t.report_profit_label}</div>
          </div>
          <Icon name="chevronLeft" className="w-4 h-4 text-disabled flex-none" />
        </Link>
      </div>

      {/* Day-grouped ledger */}
      <div className="px-4 pt-4">
        {loading ? (
          // Skeleton
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-divider animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-divider rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-mute rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-16 bg-divider rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon="receipt"
            title={t.empty_no_transactions}
            description={search ? t.empty_no_transactions_search : t.empty_no_transactions}
          />
        ) : (
          dayGroups.map((group) => (
            <div key={group.key} className="mb-1.5">
              <div className="flex items-center justify-between mt-2 mb-2.5 px-0.5">
                <span className="text-[13px] font-bold text-sub">{group.label}</span>
                <span className="tnum text-[12px] text-faint">
                  {t.net_for_day} {group.net >= 0 ? '+' : '−'}{formatAmount(Math.abs(group.net))}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {group.items.map((transaction) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {/* Infinite scroll sentinel */}
        {hasMore && !loading && (
          <div ref={sentinelRef} className="py-4 flex justify-center">
            {loadingMore && (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        )}

        {/* End message */}
        {!hasMore && filteredItems.length > 0 && (
          <p className="text-center text-xs text-text-tertiary py-4">
            {t.report_total_orders}: {total}
          </p>
        )}
      </div>

      {/* Undo Snackbar */}
      <Snackbar
        open={!!snackbar}
        message={snackbar?.message}
        actionLabel={snackbar?.actionLabel}
        onAction={snackbar?.onAction}
        onClose={() => setSnackbar(null)}
        duration={5000}
      />

      {/* V2: Edit Transaction Sheet */}
      <TransactionFormSheet
        open={editSheetOpen}
        type={editTransaction?.type || 'income'}
        editData={editTransaction}
        onClose={() => {
          setEditSheetOpen(false)
          setEditTransaction(null)
        }}
        onSaved={handleEditSaved}
      />
    </div>
  )
}

/**
 * V4.1: Transaction Card — tap to open action sheet (replaces swipe gestures).
 * Shows Edit, Delete, and Share buttons in a Bottom Sheet when tapped.
 */
function TransactionCard({ transaction, onDelete, onEdit }) {
  const t = useTerms()
  const [actionSheetOpen, setActionSheetOpen] = useState(false)

  const config = {
    income:          { icon: 'arrowDownLeft', color: 'income',     bg: 'bg-income-50',     text: 'text-income-600',     label: t.income_action,      labelKey: 'income_action' },
    expense:         { icon: 'arrowUpRight',  color: 'expense',    bg: 'bg-expense-50',    text: 'text-expense-600',    label: t.expense_action,     labelKey: 'expense_action' },
    withdrawal:      { icon: 'bank',          color: 'withdrawal', bg: 'bg-withdrawal-50', text: 'text-withdrawal-600', label: t.withdrawal_action,  labelKey: 'withdrawal_action' },
    opening_balance: { icon: 'wallet',        color: 'income',     bg: 'bg-income-50',     text: 'text-income-600',     label: t.opening_balance_amount, labelKey: 'opening_balance_amount' },
    debt_given:      { icon: 'arrowDown',     color: 'income',     bg: 'bg-income-50',     text: 'text-income-600',     label: t.receivables_tab,    labelKey: 'receivables_tab' },
    debt_taken:      { icon: 'arrowUp',       color: 'expense',    bg: 'bg-expense-50',    text: 'text-expense-600',    label: t.payables_tab,       labelKey: 'payables_tab' },
  }
  const c = config[transaction.type] || config.income

  const handleTap = () => {
    hapticLight()
    setActionSheetOpen(true)
  }

  const handleEdit = () => {
    hapticLight()
    setActionSheetOpen(false)
    onEdit(transaction)
  }

  const handleDelete = () => {
    hapticMedium()
    setActionSheetOpen(false)
    onDelete(transaction)
  }

  return (
    <>
      <div
        className="bg-surface p-4 shadow-card flex items-center gap-3 rounded-2xl active:scale-[0.98] transition-transform cursor-pointer"
        onClick={handleTap}
      >
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`} aria-hidden="true">
          <Icon name={c.icon} className={`w-5 h-5 ${c.text}`} strokeWidth={2} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-text-primary text-sm truncate">
              {transaction.description || c.label}
            </p>
            {transaction.edited && (
              <span className="text-[10px] text-withdrawal-600 bg-withdrawal-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                {t.update}
              </span>
            )}
            {transaction.isRecurring && (
              <span className="text-[10px] text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                {t.recurring}
              </span>
            )}
          </div>
          {transaction.category && (
            <p className="text-xs text-text-tertiary truncate mt-0.5">{transaction.category}</p>
          )}
          <p className="text-xs text-text-tertiary mt-0.5">{getRelativeTime(transaction.date)}</p>
        </div>

        {/* Amount */}
        <div className="text-left flex-shrink-0">
          <p className={`font-bold tabular-nums ${c.text}`}>
            {transaction.type === 'income' || transaction.type === 'opening_balance' ? '+' : '-'}
            {formatAmount(transaction.amount)}
          </p>
        </div>
      </div>

      {/* V4.1: Action Bottom Sheet */}
      <BottomSheet open={actionSheetOpen} onClose={() => setActionSheetOpen(false)} title={c.label}>
        <div className="space-y-3 pb-4">
          <div className="bg-background rounded-2xl p-4">
            <p className="font-bold text-text-primary">{transaction.description || c.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${c.text} mt-1`}>
              {transaction.type === 'income' || transaction.type === 'opening_balance' ? '+' : '-'}
              {formatAmount(transaction.amount)}
            </p>
            {transaction.category && (
              <p className="text-xs text-text-tertiary mt-1">{transaction.category}</p>
            )}
            <p className="text-xs text-text-tertiary mt-0.5">{getRelativeTime(transaction.date)}</p>
          </div>
          <button
            type="button"
            onClick={handleEdit}
            className="w-full bg-primary text-white font-semibold rounded-2xl py-3.5 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Icon name="edit" className="w-5 h-5" />
            {t.edit}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="w-full bg-expense-50 text-expense-600 font-semibold rounded-2xl py-3.5 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Icon name="trash" className="w-5 h-5" />
            {t.delete}
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
