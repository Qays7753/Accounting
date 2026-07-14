import { useState, useRef, useCallback, useEffect } from 'react'
import { useOrders } from '../hooks/useDatabase.js'
import { db } from '../db'
import { formatAmount } from '../utils/format.js'
import { formatArabicDateTime, formatTime, getRelativeTime } from '../utils/date.js'
import { useInfiniteScroll } from '../hooks/useDatabase.js'
import EmptyState from '../components/ui/EmptyState.jsx'
import Icon from '../components/ui/Icon.jsx'
import CalendarView from '../components/ui/CalendarView.jsx'
import OrderFormSheet from '../components/sheets/OrderFormSheet.jsx'
import OrderDetailSheet from '../components/sheets/OrderDetailSheet.jsx'
import { hapticLight } from '../utils/haptics.js'

const STATUS_CONFIG = {
  in_progress: { label: 'قيد التنفيذ', color: 'bg-status-progress', text: 'text-status-progress', badge: 'badge-progress', dot: 'bg-status-progress' },
  ready: { label: 'جاهز', color: 'bg-primary', text: 'text-primary-600', badge: 'badge-ready', dot: 'bg-primary' },
  closed: { label: 'مغلق', color: 'bg-status-closed', text: 'text-text-secondary', badge: 'badge-closed', dot: 'bg-status-closed' },
}

const FILTER_TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'in_progress', label: 'قيد التنفيذ' },
  { id: 'ready', label: 'جاهز' },
  { id: 'closed', label: 'مغلق' },
]

export default function OrdersPage() {
  const [view, setView] = useState('list') // 'list' | 'calendar'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editOrder, setEditOrder] = useState(null)
  const [detailOrder, setDetailOrder] = useState(null)

  const {
    items,
    total,
    hasMore,
    loading,
    loadingMore,
    loadMore,
    refresh,
  } = useOrders({
    search,
    status: statusFilter,
    page: 1,
    pageSize: 20,
  })

  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !loadingMore)

  const handleViewChange = (newView) => {
    hapticLight()
    setView(newView)
  }

  const handleStatusFilterChange = (newStatus) => {
    hapticLight()
    setStatusFilter(newStatus)
  }

  const handleEdit = (order) => {
    setEditOrder(order)
    setFormOpen(true)
  }

  const handleNewOrder = () => {
    setEditOrder(null)
    setFormOpen(true)
  }

  const handleSaved = () => {
    refresh()
    setFormOpen(false)
    setEditOrder(null)
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="px-5 pt-12 pb-3 safe-area-top sticky top-0 bg-background z-20">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">الطلبات</h1>
          <button
            onClick={handleNewOrder}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-fab active:scale-95 transition-transform"
            aria-label="طلب جديد"
          >
            <Icon name="plus" className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* View Tabs (List vs Calendar) */}
        <div className="bg-surface rounded-2xl p-1 mb-3 flex shadow-card">
          <button
            onClick={() => handleViewChange('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              view === 'list' ? 'bg-primary text-white' : 'text-text-secondary'
            }`}
          >
            <Icon name="list" className="w-4 h-4" />
            قائمة
          </button>
          <button
            onClick={() => handleViewChange('calendar')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              view === 'calendar' ? 'bg-primary text-white' : 'text-text-secondary'
            }`}
          >
            <Icon name="calendar" className="w-4 h-4" />
            تقويم
          </button>
        </div>

        {view === 'list' && (
          <>
            {/* Search */}
            <div className="relative mb-3">
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Icon name="search" className="w-5 h-5 text-text-tertiary" />
              </div>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن طلب..."
                className="w-full bg-surface rounded-2xl pr-11 pl-4 py-3 text-sm outline-none border border-transparent focus:border-primary transition-colors"
                dir="rtl"
              />
            </div>

            {/* Status Filter chips */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-5 px-5">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleStatusFilterChange(tab.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95 ${
                    statusFilter === tab.id
                      ? 'bg-primary text-white'
                      : 'bg-surface text-text-secondary shadow-card'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </>
        )}
      </header>

      {/* Content */}
      {view === 'list' ? (
        <div className="px-5 space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <EmptyState
              icon="clipboard"
              title="لا توجد طلبات"
              description={search ? 'لم يتم العثور على طلبات مطابقة' : 'ابدأ بإضافة طلبك الأول'}
              actionLabel="إضافة طلب"
              onAction={handleNewOrder}
            />
          ) : (
            items.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => setDetailOrder(order)}
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

          {!hasMore && items.length > 0 && (
            <p className="text-center text-xs text-text-tertiary py-4">
              تم عرض جميع الطلبات ({total})
            </p>
          )}
        </div>
      ) : (
        <CalendarView onOrderClick={(order) => setDetailOrder(order)} />
      )}

      {/* New/Edit Order Sheet */}
      <OrderFormSheet
        open={formOpen}
        editData={editOrder}
        onClose={() => {
          setFormOpen(false)
          setEditOrder(null)
        }}
        onSaved={handleSaved}
      />

      {/* Order Detail Sheet */}
      <OrderDetailSheet
        order={detailOrder}
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        onEdit={(order) => {
          setDetailOrder(null)
          handleEdit(order)
        }}
        onUpdated={refresh}
      />
    </div>
  )
}

function OrderCard({ order, onClick }) {
  const c = STATUS_CONFIG[order.status] || STATUS_CONFIG.in_progress
  return (
    <button
      onClick={onClick}
      className="w-full bg-surface rounded-2xl p-4 shadow-card active:scale-[0.98] transition-transform text-right"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Icon name="user" className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-text-primary truncate">{order.customerName || 'زبون'}</p>
            <p className="text-xs text-text-secondary mt-0.5">{order.orderType}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${c.badge} flex-shrink-0`}>
          {c.label}
        </span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-divider">
        <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <Icon name="clock" className="w-3.5 h-3.5" />
          <span>{getRelativeTime(order.scheduledDate)}</span>
        </div>
        {order.amount > 0 && (
          <p className="font-bold text-text-primary tabular-nums text-sm">
            {formatAmount(order.amount)}
          </p>
        )}
      </div>
    </button>
  )
}
