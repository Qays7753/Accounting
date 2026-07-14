import { useState } from 'react'
import { useDashboardStats } from '../hooks/useDatabase.js'
import { formatAmount } from '../utils/format.js'
import { getGreeting, formatArabicDate, getRelativeTime } from '../utils/date.js'
import Fab from '../components/sheets/Fab.jsx'
import TransactionFormSheet from '../components/sheets/TransactionFormSheet.jsx'
import OrderFormSheet from '../components/sheets/OrderFormSheet.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Icon from '../components/ui/Icon.jsx'
import { Link } from 'react-router-dom'

export default function HomePage() {
  const stats = useDashboardStats()
  const [sheetOpen, setSheetOpen] = useState(null) // 'income' | 'expense' | 'withdrawal' | 'order' | null

  const handleFabAction = (action) => {
    setSheetOpen(action)
  }

  const handleSaved = () => {
    stats.refresh()
    setSheetOpen(null)
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="px-5 pt-12 pb-4 safe-area-top">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary">{getGreeting()}</p>
            <h1 className="text-2xl font-bold mt-0.5">أهلاً بك</h1>
            <p className="text-xs text-text-tertiary mt-1">{formatArabicDate(new Date())}</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center">
            <Icon name="wallet" className="w-6 h-6 text-primary-600" />
          </div>
        </div>
      </header>

      {/* Main Cash Card */}
      <section className="px-5 mb-4">
        <div className="bg-gradient-to-br from-income-400 to-income-500 rounded-3xl p-6 shadow-md text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-income-50">الرصيد المتاح</p>
            <Icon name="wallet" className="w-5 h-5 text-income-50" />
          </div>
          {stats.loading ? (
            <div className="h-10 w-40 bg-white/20 rounded-lg animate-pulse" />
          ) : (
            <p className="text-4xl font-bold tabular-nums tracking-tight">
              {formatAmount(stats.cashBalance)}
            </p>
          )}
          <p className="text-xs text-income-50 mt-2">إجمالي النقد المتاح حالياً</p>
        </div>
      </section>

      {/* Today's Income & Expenses */}
      <section className="px-5 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {/* Today's Income */}
          <Link
            to="/finance"
            className="bg-surface rounded-2xl p-4 shadow-card active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-income-50 flex items-center justify-center">
                <Icon name="arrowDown" className="w-5 h-5 text-income-600" strokeWidth={2} />
              </div>
            </div>
            <p className="text-xs text-text-secondary mb-1">قبض اليوم</p>
            {stats.loading ? (
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
            ) : (
              <p className="text-lg font-bold text-income-600 tabular-nums">
                {formatAmount(stats.todayIncome)}
              </p>
            )}
          </Link>

          {/* Today's Expenses */}
          <Link
            to="/finance"
            className="bg-surface rounded-2xl p-4 shadow-card active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-expense-50 flex items-center justify-center">
                <Icon name="arrowUp" className="w-5 h-5 text-expense-600" strokeWidth={2} />
              </div>
            </div>
            <p className="text-xs text-text-secondary mb-1">صرف اليوم</p>
            {stats.loading ? (
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
            ) : (
              <p className="text-lg font-bold text-expense-600 tabular-nums">
                {formatAmount(stats.todayExpense)}
              </p>
            )}
          </Link>
        </div>
      </section>

      {/* This Month Summary */}
      <section className="px-5 mb-6">
        <div className="bg-surface rounded-2xl p-5 shadow-card">
          <h2 className="text-base font-bold text-text-primary mb-4">ملخص هذا الشهر</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs text-text-secondary mb-1">القبض</p>
              <p className="text-base font-bold text-income-600 tabular-nums">
                {formatAmount(stats.monthIncome)}
              </p>
            </div>
            <div className="text-center border-r border-l border-divider">
              <p className="text-xs text-text-secondary mb-1">الصرف</p>
              <p className="text-base font-bold text-expense-600 tabular-nums">
                {formatAmount(stats.monthExpense)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-secondary mb-1">صافي الربح</p>
              <p className={`text-base font-bold tabular-nums ${
                stats.monthIncome - stats.monthExpense >= 0 ? 'text-income-600' : 'text-expense-600'
              }`}>
                {formatAmount(stats.monthIncome - stats.monthExpense)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Orders */}
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-text-primary">الطلبات القادمة</h2>
          <Link to="/orders" className="text-sm text-primary-600 font-medium">
            عرض الكل
          </Link>
        </div>

        {!stats.loading && stats.upcomingOrders.length === 0 ? (
          <div className="bg-surface rounded-2xl p-5 shadow-card">
            <EmptyState
              icon="clipboard"
              title="لا توجد طلبات قادمة"
              description="أضف طلباتك القادمة لتتبعها هنا"
            />
          </div>
        ) : (
          <div className="space-y-2">
            {stats.upcomingOrders.slice(0, 3).map((order) => (
              <Link
                key={order.id}
                to={`/orders?id=${order.id}`}
                className="block bg-surface rounded-2xl p-4 shadow-card active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-primary truncate">
                      {order.customerName || 'زبون'}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">{order.orderType}</p>
                    <p className="text-xs text-text-tertiary mt-1">{getRelativeTime(order.scheduledDate)}</p>
                  </div>
                  <div className="text-left">
                    {order.amount > 0 && (
                      <p className="font-bold text-text-primary tabular-nums">
                        {formatAmount(order.amount)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* FAB */}
      <Fab onAction={handleFabAction} />

      {/* Sheets */}
      <TransactionFormSheet
        open={sheetOpen === 'income' || sheetOpen === 'expense' || sheetOpen === 'withdrawal'}
        type={sheetOpen || 'income'}
        onClose={() => setSheetOpen(null)}
        onSaved={handleSaved}
      />
      <OrderFormSheet
        open={sheetOpen === 'order'}
        onClose={() => setSheetOpen(null)}
        onSaved={handleSaved}
      />
    </div>
  )
}
