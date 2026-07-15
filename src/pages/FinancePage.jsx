import { useState, useRef, useCallback, useMemo } from 'react'
import { useTransactions, useDebounce, useInfiniteScroll } from '../hooks/useDatabase.js'
import { db } from '../db'
import { formatAmount } from '../utils/format.js'
import { getRelativeTime } from '../utils/date.js'
import EmptyState from '../components/ui/EmptyState.jsx'
import Snackbar from '../components/ui/Snackbar.jsx'
import Icon from '../components/ui/Icon.jsx'
import { hapticLight, hapticSuccess, hapticMedium } from '../utils/haptics.js'

const FILTERS = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'هذا الأسبوع' },
  { id: 'month', label: 'هذا الشهر' },
  { id: 'all', label: 'الكل' },
]

export default function FinancePage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('today')
  const [snackbar, setSnackbar] = useState(null) // { message, actionLabel, onAction }

  // Debounce search to prevent query thrash on every keystroke
  const debouncedSearch = useDebounce(search, 300)

  // Memoize date range so it only recomputes when filter changes (not every render)
  const dateRange = useMemo(() => {
    const now = new Date()
    if (filter === 'today') {
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
        endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
      }
    }
    if (filter === 'week') {
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
      return { startDate: start, endDate: now }
    }
    if (filter === 'month') {
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      }
    }
    return { startDate: null, endDate: null }
  }, [filter])

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
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
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
      message: 'تم حذف المعاملة',
      actionLabel: 'تراجع',
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

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
  }

  const handleFilterChange = (newFilter) => {
    hapticLight()
    setFilter(newFilter)
  }

  // Totals for current filter (memoized to prevent recompute on every render)
  const totals = useMemo(() => {
    return items.reduce(
      (acc, t) => {
        if (t.type === 'income' || t.type === 'opening_balance') acc.income += t.amount
        else if (t.type === 'expense') acc.expense += t.amount
        else if (t.type === 'withdrawal') acc.withdrawal += t.amount
        return acc
      },
      { income: 0, expense: 0, withdrawal: 0 }
    )
  }, [items])

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="px-5 pt-12 pb-3 safe-area-top sticky top-0 bg-background z-20">
        <h1 className="text-2xl font-bold mb-3">السجل المالي</h1>

        {/* Search */}
        <div className="relative mb-3">
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Icon name="search" className="w-5 h-5 text-text-tertiary" />
          </div>
          <input
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder="ابحث في المعاملات..."
            className="w-full bg-surface rounded-2xl pr-11 pl-4 py-3 text-sm outline-none border border-transparent focus:border-primary transition-colors"
            dir="rtl"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-5 px-5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => handleFilterChange(f.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95 ${
                filter === f.id
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary shadow-card'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {/* Summary */}
      {items.length > 0 && (
        <div className="px-5 mb-3">
          <div className="bg-surface rounded-2xl p-4 shadow-card">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-text-secondary mb-1">قبض</p>
                <p className="text-sm font-bold text-income-600 tabular-nums">{formatAmount(totals.income)}</p>
              </div>
              <div className="border-r border-l border-divider">
                <p className="text-xs text-text-secondary mb-1">صرف</p>
                <p className="text-sm font-bold text-expense-600 tabular-nums">{formatAmount(totals.expense)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">سحب شخصي</p>
                <p className="text-sm font-bold text-withdrawal-600 tabular-nums">{formatAmount(totals.withdrawal)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="px-5 space-y-2">
        {loading ? (
          // Skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState
            icon="receipt"
            title="لا توجد معاملات"
            description={search ? 'لم يتم العثور على نتائج. جرب بحثاً آخر.' : 'بداية نظيفة! اضغط (+) لتسجيل أول معاملة'}
          />
        ) : (
          items.map((transaction) => (
            <SwipeableTransactionCard
              key={transaction.id}
              transaction={transaction}
              onDelete={handleDelete}
            />
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
        {!hasMore && items.length > 0 && (
          <p className="text-center text-xs text-text-tertiary py-4">
            تم عرض جميع المعاملات ({total})
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
    </div>
  )
}

/**
 * Swipeable Transaction Card - swipe left reveals delete button
 */
function SwipeableTransactionCard({ transaction, onDelete }) {
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const startX = useRef(0)
  const cardRef = useRef(null)

  const config = {
    income: { icon: 'arrowDown', color: 'income', bg: 'bg-income-50', text: 'text-income-600', label: 'قبض' },
    expense: { icon: 'arrowUp', color: 'expense', bg: 'bg-expense-50', text: 'text-expense-600', label: 'صرف' },
    withdrawal: { icon: 'userMinus', color: 'withdrawal', bg: 'bg-withdrawal-50', text: 'text-withdrawal-600', label: 'سحب شخصي' },
    opening_balance: { icon: 'wallet', color: 'income', bg: 'bg-income-50', text: 'text-income-600', label: 'رصيد افتتاحي' },
  }
  const c = config[transaction.type] || config.income

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  const handleTouchMove = (e) => {
    if (!isSwiping) return
    const deltaX = e.touches[0].clientX - startX.current
    // In RTL, swipe direction is inverted. Swiping left (deltaX negative in LTR) reveals delete on the right
    const newSwipe = Math.max(-80, Math.min(0, deltaX))
    setSwipeX(newSwipe)
  }

  const handleTouchEnd = () => {
    setIsSwiping(false)
    // Snap to -80 if past threshold, else 0
    if (swipeX < -40) {
      setSwipeX(-80)
    } else {
      setSwipeX(0)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl" ref={cardRef}>
      {/* Delete action behind */}
      <div className="absolute inset-0 flex items-center justify-end pr-5 bg-expense-500">
        <button
          onClick={() => onDelete(transaction)}
          className="flex items-center gap-2 text-white font-semibold active:scale-95 transition-transform"
        >
          <Icon name="trash" className="w-5 h-5" />
          <span className="text-sm">حذف</span>
        </button>
      </div>

      {/* Card */}
      <div
        className="bg-surface p-4 shadow-card flex items-center gap-3 transition-transform"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s ease',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon name={c.icon} className={`w-5 h-5 ${c.text}`} strokeWidth={2} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary text-sm truncate">
            {transaction.description || c.label}
          </p>
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
    </div>
  )
}
