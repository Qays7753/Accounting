import { useState, useEffect, useMemo, useCallback } from 'react'
import { db } from '../../db'
import { ARABIC_MONTHS, formatTime } from '../../utils/date.js'
import { hapticLight } from '../../utils/haptics.js'
import Icon from './Icon.jsx'

const STATUS_CONFIG = {
  in_progress: { label: 'قيد التنفيذ', color: 'bg-status-progress', text: 'text-status-progress', badge: 'badge-progress' },
  ready: { label: 'جاهز', color: 'bg-primary', text: 'text-primary-600', badge: 'badge-ready' },
  closed: { label: 'مغلق', color: 'bg-status-closed', text: 'text-text-secondary', badge: 'badge-closed' },
}

/**
 * Monthly Calendar - One UI style
 * Days with orders have colored dots based on status
 */
export default function CalendarView({ onOrderClick }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [ordersByDay, setOrdersByDay] = useState({})

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    async function loadMonthOrders() {
      const orders = await db.getOrdersForMonth(year, month)
      const byDay = {}
      for (const order of orders) {
        const day = new Date(order.scheduledTimestamp).getDate()
        if (!byDay[day]) byDay[day] = []
        byDay[day].push(order)
      }
      setOrdersByDay(byDay)
    }
    loadMonthOrders()
  }, [year, month])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  // Static weekday labels (RTL order: Sunday on the right)
  const weekDays = useMemo(() => ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'], [])

  // Build calendar grid - memoized so it only recomputes when month/year change
  const calendarDays = useMemo(() => {
    const days = []
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d)
    }
    return days
  }, [daysInMonth, firstDayOfMonth])

  const today = useMemo(() => new Date(), [year, month])
  const isToday = useCallback((day) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
    [today, month, year]
  )

  const handlePrevMonth = () => {
    hapticLight()
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    hapticLight()
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDate(null)
  }

  const handleDayClick = (day) => {
    if (!day) return
    hapticLight()
    setSelectedDate(day)
  }

  const selectedOrders = selectedDate ? (ordersByDay[selectedDate] || []) : []

  // Get unique statuses for a day (for dot display)
  const getStatusesForDay = (day) => {
    const orders = ordersByDay[day] || []
    const statuses = new Set(orders.map((o) => o.status))
    return Array.from(statuses)
  }

  return (
    <div className="px-5">
      {/* Calendar Header */}
      <div className="bg-surface rounded-16 p-4  mb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="w-11 h-11 rounded-full bg-background flex items-center justify-center active:scale-95 transition-transform"
            aria-label="الشهر السابق"
          >
            <Icon name="chevronRight" className="w-5 h-5 text-text-secondary" />
          </button>
          <h2 className="text-lg font-bold">
            {ARABIC_MONTHS[month]} {year}
          </h2>
          <button
            onClick={handleNextMonth}
            className="w-11 h-11 rounded-full bg-background flex items-center justify-center active:scale-95 transition-transform"
            aria-label="الشهر التالي"
          >
            <Icon name="chevronLeft" className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-text-tertiary py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />
            const statuses = getStatusesForDay(day)
            const hasOrders = statuses.length > 0
            const selected = selectedDate === day
            const todayMark = isToday(day)

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 ${
                  selected
                    ? 'bg-primary text-white'
                    : todayMark
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-text-primary'
                }`}
              >
                <span className={`text-sm font-semibold ${selected ? 'text-white' : ''}`}>
                  {day}
                </span>
                {/* Status dots */}
                {hasOrders && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {statuses.slice(0, 3).map((status, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          selected ? 'bg-white' : STATUS_CONFIG[status]?.color || '#93A4AE'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day orders */}
      {selectedDate && (
        <div className="animate-fade-in">
          <h3 className="text-sm font-bold text-text-primary mb-3">
            {selectedOrders.length > 0
              ? `طلبات يوم ${selectedDate} ${ARABIC_MONTHS[month]}`
              : `لا توجد طلبات في ${selectedDate} ${ARABIC_MONTHS[month]}`}
          </h3>
          {selectedOrders.length > 0 ? (
            <div className="space-y-2">
              {selectedOrders.map((order) => (
                <OrderCalendarCard key={order.id} order={order} onClick={() => onOrderClick?.(order)} />
              ))}
            </div>
          ) : (
            <div className="bg-surface rounded-16 p-4 ">
              <p className="text-sm text-text-secondary text-center">لا توجد طلبات في هذا اليوم</p>
            </div>
          )}
        </div>
      )}

      {!selectedDate && (
        <div className="bg-surface rounded-16 p-4 ">
          <p className="text-sm text-text-secondary text-center">
            اختر يوماً لعرض الطلبات
          </p>
        </div>
      )}
    </div>
  )
}

function OrderCalendarCard({ order, onClick }) {
  const c = STATUS_CONFIG[order.status] || STATUS_CONFIG.in_progress
  return (
    <button
      onClick={onClick}
      className="w-full bg-surface rounded-16 p-4  active:scale-[0.98] transition-transform text-right"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-text-primary text-sm">{order.customerName || 'زبون'}</p>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.badge}`}>
          {c.label}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{order.orderType}</span>
        <span>{formatTime(order.scheduledDate)}</span>
      </div>
      {order.amount > 0 && (
        <p className="font-bold text-text-primary mt-2 tabular-nums text-sm">
          {order.amount.toLocaleString('en-US')}
        </p>
      )}
    </button>
  )
}
