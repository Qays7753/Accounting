import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { useOrders, useDebounce, useInfiniteScroll } from '../hooks/useDatabase.js'
import { db } from '../db'
import { formatAmount } from '../utils/format.js'
import { getRelativeTime } from '../utils/date.js'
import EmptyState from '../components/ui/EmptyState.jsx'
import Icon from '../components/ui/Icon.jsx'
import CalendarView from '../components/ui/CalendarView.jsx'
import OrderFormSheet from '../components/sheets/OrderFormSheet.jsx'
import OrderDetailSheet from '../components/sheets/OrderDetailSheet.jsx'
import { hapticLight } from '../utils/haptics.js'

const STATUS_CONFIG = {
  in_progress: { label: 'قيد التنفيذ', color: 'bg-status-progress', text: 'text-status-progress', badge: 'badge-progress', dot: 'bg-status-progress', bar: 'border-[#f5a623]' },
  ready: { label: 'جاهز', color: 'bg-primary', text: 'text-primary-600', badge: 'badge-ready', dot: 'bg-primary', bar: 'border-primary' },
  closed: { label: 'مغلق', color: 'bg-status-closed', text: 'text-text-secondary', badge: 'badge-closed', dot: 'bg-status-closed', bar: 'border-[#b0b6c3]' },
}

// V5: Underline tabs + status-colored count badges
const FILTER_TABS = [
  { id: 'all', label: 'الكل', badge: 'text-primary bg-primary-tint' },
  { id: 'in_progress', label: 'قيد التنفيذ', badge: 'text-amber bg-amber-bg' },
  { id: 'ready', label: 'جاهز', badge: 'text-primary bg-primary-tint' },
  { id: 'closed', label: 'مغلق', badge: 'text-faint bg-mute' },
]

export default function OrdersPage() {
  const [view, setView] = useState('list') // 'list' | 'calendar'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editOrder, setEditOrder] = useState(null)
  const [detailOrder, setDetailOrder] = useState(null)
  const [counts, setCounts] = useState({ all: 0, in_progress: 0, ready: 0, closed: 0 })
  const [dataVersion, setDataVersion] = useState(0)

  // Debounce search to prevent query thrash
  const debouncedSearch = useDebounce(search, 300)

  // V5: Per-status counts for the underline-tab badges (global, independent of the active filter)
  useEffect(() => {
    let cancelled = false
    Promise.all([
      db.orders.count(),
      db.orders.where('status').equals('in_progress').count(),
      db.orders.where('status').equals('ready').count(),
      db.orders.where('status').equals('closed').count(),
    ])
      .then(([all, in_progress, ready, closed]) => {
        if (!cancelled) setCounts({ all, in_progress, ready, closed })
      })
      .catch((e) => console.error('Failed to load order counts:', e))
    return () => { cancelled = true }
  }, [dataVersion])

  // V5: Sliding underline indicator over the active tab
  const tabRefs = useRef([])
  const [underline, setUnderline] = useState({ right: 0, width: 0 })
  const activeTabIndex = FILTER_TABS.findIndex((t) => t.id === statusFilter)
  useLayoutEffect(() => {
    const el = tabRefs.current[activeTabIndex]
    const container = el?.parentElement
    if (el && container) {
      const right = container.getBoundingClientRect().right - el.getBoundingClientRect().right
      setUnderline({ right, width: el.offsetWidth })
    }
  }, [activeTabIndex, view, counts])

  const {
    items,
    total,
    hasMore,
    loading,
    loadingMore,
    loadMore,
    refresh,
  } = useOrders({
    search: debouncedSearch,
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
    setDataVersion((v) => v + 1)
    setFormOpen(false)
    setEditOrder(null)
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="px-4 pt-8 pb-3 safe-area-top sticky top-0 bg-background z-20">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">الطلبات</h1>
          <button
            onClick={handleNewOrder}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center  active:scale-95 transition-transform"
            aria-label="طلب جديد"
          >
            <Icon name="plus" className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* View Tabs (List vs Calendar) — One UI segmented track */}
        <div className="bg-mute rounded-[18px] p-1 mb-3.5 flex">
          <button
            onClick={() => handleViewChange('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-sm transition-all ${
              view === 'list' ? 'bg-surface text-primary font-bold shadow-sm' : 'text-sub font-semibold'
            }`}
          >
            <Icon name="list" className="w-4 h-4" />
            قائمة
          </button>
          <button
            onClick={() => handleViewChange('calendar')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-sm transition-all ${
              view === 'calendar' ? 'bg-surface text-primary font-bold shadow-sm' : 'text-sub font-semibold'
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

            {/* V5: Status Filter — underline tabs with sliding indicator + count badges */}
            <div className="relative">
              <div className="flex gap-5 border-b border-[#e6e8eb] overflow-x-auto hide-scrollbar">
                {FILTER_TABS.map((tab, i) => {
                  const on = statusFilter === tab.id
                  return (
                    <button
                      key={tab.id}
                      ref={(el) => (tabRefs.current[i] = el)}
                      onClick={() => handleStatusFilterChange(tab.id)}
                      className={`relative flex-none pb-2.5 flex items-center gap-1.5 text-[14px] whitespace-nowrap transition-colors ${
                        on ? 'text-ink font-bold' : 'text-faint font-semibold'
                      }`}
                    >
                      {tab.label}
                      <span className={`tnum text-[11px] font-bold px-1.5 py-px rounded-full ${tab.badge}`}>
                        {counts[tab.id]}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div
                className="absolute bottom-[-1.5px] h-[3px] bg-primary rounded-full transition-all duration-300 ease-out"
                style={{ right: underline.right, width: underline.width }}
              />
            </div>
          </>
        )}
      </header>

      {/* Content */}
      {view === 'list' ? (
        <div className="px-4 space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 ">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl #E4EAEE animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 #E4EAEE rounded animate-pulse" />
                    <div className="h-3 w-1/2 #F4F7F9 rounded animate-pulse" />
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
        onUpdated={() => { refresh(); setDataVersion((v) => v + 1) }}
      />
    </div>
  )
}

// V3: Payment status config for order cards
const PAYMENT_BADGE = {
  cash: { label: 'مدفوع', class: 'bg-income-50 text-income-600' },
  credit: { label: 'أجل', class: 'bg-withdrawal-50 text-withdrawal-600' },
  done: { label: 'تتبع', class: '#F4F7F9 text-text-secondary' },
}

function OrderCard({ order, onClick }) {
  const c = STATUS_CONFIG[order.status] || STATUS_CONFIG.in_progress
  const payment = order.paymentType ? PAYMENT_BADGE[order.paymentType] : null
  return (
    <div
      onClick={onClick}
      className={`w-full bg-surface rounded-2xl p-4  border-r-4 ${c.bar} active:scale-[0.98] transition-transform text-right cursor-pointer ${order.status === 'closed' ? 'opacity-90' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Icon name="user" className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-text-primary truncate">{order.customerName || 'زبون'}</p>
            <p className="text-xs text-text-secondary mt-0.5">{order.orderType}</p>
            {/* V3: Show phone */}
            {order.phone && (
              <p className="text-xs text-text-tertiary mt-0.5 flex items-center gap-1" dir="ltr">
                <Icon name="phone" className="w-3 h-3" />
                <span>{order.phone}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${c.badge}`}>
            {c.label}
          </span>
          {/* V3: Payment status badge */}
          {payment && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${payment.class}`}>
              {payment.label}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-divider">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <Icon name="clock" className="w-3.5 h-3.5" />
            <span>{getRelativeTime(order.scheduledDate)}</span>
          </div>
          {/* V3: Quick Call/WhatsApp buttons */}
          {order.phone && (
            <div className="flex items-center gap-1">
              <a
                href={`tel:${order.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center active:scale-95 transition-transform"
                aria-label="اتصال"
              >
                <Icon name="phone" className="w-3.5 h-3.5 text-primary-600" />
              </a>
              <a
                href={`https://wa.me/${order.phone.replace(/[^\d]/g, '').replace(/^0/, '962')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-10 h-10 rounded-full bg-income-50 flex items-center justify-center active:scale-95 transition-transform"
                aria-label="واتساب"
              >
                <Icon name="whatsapp" className="w-3.5 h-3.5 text-income-600" />
              </a>
            </div>
          )}
        </div>
        {order.amount > 0 && (
          <p className="font-bold text-text-primary tabular-nums text-sm">
            {formatAmount(order.amount)}
          </p>
        )}
      </div>
    </div>
  )
}
