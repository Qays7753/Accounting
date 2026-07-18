import { useState, useCallback, useEffect } from 'react'
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
import { useTerms } from '../context/TermsContext.jsx'
import PageHeader from '../components/layout/PageHeader.jsx'
import SegmentedControl from '../components/ui/SegmentedControl.jsx'

// Static status config — labels come from terms in render
const STATUS_CONFIG = {
  in_progress: { color: 'bg-status-progress', text: 'text-status-progress', badge: 'badge-progress', dot: 'bg-status-progress', bar: 'border-returns-500', labelKey: 'status_in_progress' },
  ready: { color: 'bg-primary', text: 'text-primary-600', badge: 'badge-ready', dot: 'bg-primary', bar: 'border-primary', labelKey: 'status_ready' },
  closed: { color: 'bg-status-closed', text: 'text-text-secondary', badge: 'badge-closed', dot: 'bg-status-closed', bar: 'border-divider', labelKey: 'status_closed' },
}

// V5: Underline tabs + status-colored count badges
const FILTER_TABS = [
  { id: 'all', labelKey: 'status_all', badge: 'text-primary bg-primary-tint' },
  { id: 'in_progress', labelKey: 'status_in_progress', badge: 'text-amber bg-amber-bg' },
  { id: 'ready', labelKey: 'status_ready', badge: 'text-primary bg-primary-tint' },
  { id: 'closed', labelKey: 'status_closed', badge: 'text-faint bg-mute' },
]

export default function OrdersPage() {
  const t = useTerms()
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

  // SegmentedControl (underline variant) computes its own indicator position internally,
  // so we no longer need tabRefs/underline state/useLayoutEffect here.

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
      <PageHeader
        title={t.orders_title}
        actions={[{ icon: 'plus', onClick: handleNewOrder, label: t.new_order }]}
        search={view === 'list' ? { value: search, onChange: setSearch, placeholder: t.search_orders } : undefined}
        subheader={
          <>
            {/* View Tabs (List vs Calendar) — SegmentedControl pill variant */}
            <SegmentedControl
              variant="pill"
              segments={[
                { id: 'list',     label: t.list_view },
                { id: 'calendar', label: t.calendar_view },
              ]}
              value={view}
              onChange={(v) => handleViewChange(v)}
            />
            {view === 'list' && (
              <div className="mt-3">
                {/* Status Filter — underline variant with count badges */}
                <SegmentedControl
                  variant="underline"
                  segments={FILTER_TABS.map((tab) => ({
                    id: tab.id,
                    label: t[tab.labelKey] || tab.id,
                    badge: counts[tab.id],
                  }))}
                  value={statusFilter}
                  onChange={(v) => handleStatusFilterChange(v)}
                />
              </div>
            )}
          </>
        }
      />

      {/* Content */}
      {view === 'list' ? (
        <div className="px-4 space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 ">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-divider animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-divider rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-mute rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <EmptyState
              icon="clipboard"
              title={t.empty_no_orders}
              description={search ? t.empty_no_transactions_search : t.empty_no_orders}
              actionLabel={t.new_order}
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
              {t.report_total_orders}: {total}
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

// V3: Payment status config for order cards — labels now driven by terms
function usePaymentBadges() {
  const t = useTerms()
  return {
    cash:   { label: t.payment_cash_short,   class: 'bg-income-50 text-income-600' },
    credit: { label: t.payment_credit_short, class: 'bg-withdrawal-50 text-withdrawal-600' },
    done:   { label: t.payment_done_short,   class: 'bg-mute text-ink-secondary' },
  }
}

function OrderCard({ order, onClick }) {
  const t = useTerms()
  const PAYMENT_BADGE = usePaymentBadges()
  const c = STATUS_CONFIG[order.status] || STATUS_CONFIG.in_progress
  const payment = order.paymentType ? PAYMENT_BADGE[order.paymentType] : null
  const statusLabel = t[c.labelKey] || c.labelKey
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
            <p className="font-bold text-text-primary truncate">{order.customerName || t.customer_name}</p>
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
            {statusLabel}
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
                aria-label={t.call}
              >
                <Icon name="phone" className="w-3.5 h-3.5 text-primary-600" />
              </a>
              <a
                href={`https://wa.me/${order.phone.replace(/[^\d]/g, '').replace(/^0/, '962')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-10 h-10 rounded-full bg-income-50 flex items-center justify-center active:scale-95 transition-transform"
                aria-label={t.whatsapp}
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
