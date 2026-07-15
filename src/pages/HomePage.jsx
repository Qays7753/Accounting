import { useState, useEffect } from 'react'
import { useDashboardStats } from '../hooks/useDatabase.js'
import { db } from '../db'
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
  // V2: Branding (logo + business name)
  const [logo, setLogo] = useState(null)
  const [businessName, setBusinessName] = useState(null)
  // V4 Phase 1: Two Jars (حق المحل & حق التاجر)
  const [jars, setJars] = useState({ capitalJar: 0, profitJar: 0, totalCash: 0 })

  useEffect(() => {
    db.getLogo().then(setLogo)
    db.getBusinessName().then(setBusinessName)
    db.getTwoJars().then(setJars)
  }, [stats.cashBalance]) // refresh jars when cashBalance changes

  const handleFabAction = (action) => {
    setSheetOpen(action)
  }

  const handleSaved = () => {
    stats.refresh()
    setSheetOpen(null)
    // V4: Refresh jars after save
    db.getTwoJars().then(setJars)
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="px-5 pt-12 pb-4 safe-area-top">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary">{getGreeting()}</p>
            <h1 className="text-2xl font-bold mt-0.5">{businessName || 'أهلاً بك'}</h1>
            <p className="text-xs text-text-tertiary mt-1">{formatArabicDate(new Date())}</p>
          </div>
          {/* V2: Show logo if uploaded, otherwise default wallet icon */}
          {logo ? (
            <img src={logo} alt="شعار" className="w-11 h-11 rounded-full object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center">
              <Icon name="wallet" className="w-6 h-6 text-primary-600" />
            </div>
          )}
        </div>
      </header>

      {/* V4 Phase 1: Two Jars Dashboard (حق المحل & حق التاجر) */}
      <section className="px-5 mb-4">
        {/* Total Cash Summary */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl p-5 shadow-md text-white mb-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-primary-50">إجمالي النقد المتاح</p>
            <Icon name="wallet" className="w-5 h-5 text-primary-50" />
          </div>
          {stats.loading ? (
            <div className="h-9 w-40 bg-white/20 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {formatAmount(jars.totalCash)}
            </p>
          )}
        </div>

        {/* Two Jars Split */}
        <div className="grid grid-cols-2 gap-3">
          {/* Jar A: حق المحل (Capital) */}
          <div className="bg-surface rounded-2xl p-4 shadow-card border-r-4 border-primary">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <Icon name="wallet" className="w-4 h-4 text-primary-600" strokeWidth={2} />
              </div>
              <p className="text-xs font-bold text-primary-600">حق المحل</p>
            </div>
            <p className="text-xl font-bold tabular-nums text-text-primary">
              {formatAmount(jars.capitalJar)}
            </p>
            <p className="text-[10px] text-text-tertiary mt-1">رأس المال (للتعبئة)</p>
          </div>

          {/* Jar B: حق التاجر (Profit) */}
          <div className="bg-surface rounded-2xl p-4 shadow-card border-r-4 border-income-500">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-income-50 flex items-center justify-center">
                <Icon name="trendingUp" className="w-4 h-4 text-income-600" strokeWidth={2} />
              </div>
              <p className="text-xs font-bold text-income-600">حق التاجر</p>
            </div>
            <p className={`text-xl font-bold tabular-nums ${jars.profitJar >= 0 ? 'text-income-600' : 'text-expense-600'}`}>
              {formatAmount(jars.profitJar)}
            </p>
            <p className="text-[10px] text-text-tertiary mt-1">الأرباح (آمن للصرف)</p>
          </div>
        </div>
        <p className="text-[10px] text-text-tertiary mt-2 text-center px-2">
          لا تنسحب من "حق المحل" إلا لإعادة تعبئة البضاعة
        </p>
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
