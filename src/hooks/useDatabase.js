import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../db'

/**
 * Custom hook for paginated transactions with filters
 */
export function useTransactions(initialFilters = {}) {
  const [data, setData] = useState({ items: [], total: 0, hasMore: false, page: 1 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filters, setFilters] = useState(initialFilters)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async (page = 1) => {
    if (page === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    try {
      const result = await db.getTransactions({ ...filters, page })
      if (page === 1) {
        setData(result)
      } else {
        setData((prev) => ({
          ...result,
          items: [...prev.items, ...result.items],
        }))
      }
    } catch (e) {
      console.error('Failed to load transactions:', e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filters])

  useEffect(() => {
    load(1)
  }, [load, refreshKey])

  const loadMore = useCallback(() => {
    if (data.hasMore && !loadingMore) {
      load(data.page + 1)
    }
  }, [data, loadingMore, load])

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  return {
    items: data.items,
    total: data.total,
    hasMore: data.hasMore,
    loading,
    loadingMore,
    loadMore,
    refresh,
    filters,
    updateFilters,
  }
}

/**
 * Custom hook for paginated orders
 */
export function useOrders(initialFilters = {}) {
  const [data, setData] = useState({ items: [], total: 0, hasMore: false, page: 1 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filters, setFilters] = useState(initialFilters)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async (page = 1) => {
    if (page === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    try {
      const result = await db.getOrders({ ...filters, page })
      if (page === 1) {
        setData(result)
      } else {
        setData((prev) => ({
          ...result,
          items: [...prev.items, ...result.items],
        }))
      }
    } catch (e) {
      console.error('Failed to load orders:', e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filters])

  useEffect(() => {
    load(1)
  }, [load, refreshKey])

  const loadMore = useCallback(() => {
    if (data.hasMore && !loadingMore) {
      load(data.page + 1)
    }
  }, [data, loadingMore, load])

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  return {
    items: data.items,
    total: data.total,
    hasMore: data.hasMore,
    loading,
    loadingMore,
    loadMore,
    refresh,
    filters,
    updateFilters,
  }
}

/**
 * Custom hook for dashboard stats
 */
export function useDashboardStats() {
  const [stats, setStats] = useState({
    cashBalance: 0,
    todayIncome: 0,
    todayExpense: 0,
    todayWithdrawal: 0,
    monthIncome: 0,
    monthExpense: 0,
    upcomingOrders: [],
    loading: true,
  })
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      const [cashBalance, todayTotals, monthTotals, upcomingOrders] = await Promise.all([
        db.getCashBalance(),
        db.getTotalsForRange(todayStart, todayEnd),
        db.getTotalsForRange(monthStart, monthEnd),
        db.getUpcomingOrders(7),
      ])

      setStats({
        cashBalance,
        todayIncome: todayTotals.income,
        todayExpense: todayTotals.expense + todayTotals.withdrawal,
        todayWithdrawal: todayTotals.withdrawal,
        monthIncome: monthTotals.income,
        monthExpense: monthTotals.expense,
        upcomingOrders,
        loading: false,
      })
    } catch (e) {
      console.error('Failed to load stats:', e)
      setStats((s) => ({ ...s, loading: false }))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const refresh = useCallback(() => {
    setStats((s) => ({ ...s, loading: true }))
    setRefreshKey((k) => k + 1)
  }, [])

  return { ...stats, refresh }
}

/**
 * Infinite scroll hook
 */
export function useInfiniteScroll(onLoadMore, enabled = true) {
  const sentinelRef = useRef(null)

  useEffect(() => {
    if (!enabled || !sentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore()
        }
      },
      { rootMargin: '100px' }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [onLoadMore, enabled])

  return sentinelRef
}

/**
 * Settings hook
 */
export function useSettings() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const all = await db.getAllSettings()
        setSettings(all)
      } catch (e) {
        console.error('Failed to load settings:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [refreshKey])

  const update = useCallback(async (key, value) => {
    await db.setSetting(key, value)
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  return { settings, loading, update, refresh }
}
