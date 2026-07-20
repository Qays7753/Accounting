import { useState, useEffect } from 'react'
import { useDashboardStats } from '../hooks/useDatabase.js'
import { useCountUp } from '../hooks/useCountUp.js'
import { useTerms, useLanguageMode } from '../context/TermsContext.jsx'
import { useSettings2 } from '../context/SettingsContext.jsx'
import { db } from '../db'
import { formatAmount, parseNumber, formatLiveInput } from '../utils/format.js'
import { getGreeting, formatArabicDate, getRelativeTime } from '../utils/date.js'
import Fab from '../components/sheets/Fab.jsx'
import TransactionFormSheet from '../components/sheets/TransactionFormSheet.jsx'
import OrderFormSheet from '../components/sheets/OrderFormSheet.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Icon from '../components/ui/Icon.jsx'
import BottomSheet from '../components/ui/BottomSheet.jsx'
import AmountInput from '../components/ui/AmountInput.jsx'
import { Link } from 'react-router-dom'
import { hapticLight, hapticSuccess, hapticMedium } from '../utils/haptics.js'
import { exportBackup } from '../utils/backup.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import { useSubmitGuard } from '../hooks/useSubmitGuard.js'
import { useExitConfirm } from '../hooks/useBackDismiss.js'
import DiagnosticCard from '../components/ui/DiagnosticCard.jsx'
import { computeSnapshot, diagnose } from '../utils/diagnostics.js'
import rulesJson from '../config/diagnostic_rules.json'
import { useNavigate } from 'react-router-dom'
import OverviewChip from '../components/overview/OverviewChip.jsx'

export default function HomePage() {
  const stats = useDashboardStats()
  const t = useTerms()
  const [languageMode] = useLanguageMode()
  const { logo, businessName, monthlySummary, hideAmounts } = useSettings2()
  const [sheetOpen, setSheetOpen] = useState(null)
  const [jars, setJars] = useState({ capitalJar: 0, profitJar: 0, totalCash: 0 })

  // N1: Exit confirm — "press back again to exit" on home route
  const [exitToast, setExitToast] = useState(false)
  useExitConfirm(
    true, // always active on home page
    () => setExitToast(true),  // first back: show toast
    () => {
      // second back: actually exit
      setExitToast(false)
      window.history.back()
    },
    2000
  )
  // Auto-hide exit toast after 2s
  useEffect(() => {
    if (!exitToast) return
    const timer = setTimeout(() => setExitToast(false), 2000)
    return () => clearTimeout(timer)
  }, [exitToast])

  // Z-Report
  const [showZReportCard, setShowZReportCard] = useState(false)
  const [zReportSheetOpen, setZReportSheetOpen] = useState(false)
  const [expectedCash, setExpectedCash] = useState(0)
  const [countedCash, setCountedCash] = useState('')
  const [zReportSaved, setZReportSaved] = useState(false)

  // Weekly Backup Reminder
  const [showBackupPrompt, setShowBackupPrompt] = useState(false)

  // Opening Balance Prompt (dismissible card)
  const [showOpeningBalanceCard, setShowOpeningBalanceCard] = useState(false)
  const [openingBalanceSheetOpen, setOpeningBalanceSheetOpen] = useState(false)
  const [openingCash, setOpeningCash] = useState(0)

  // V10.2: Weekly Inventory Reconciliation
  const { inventoryEnabled } = useSettings2()
  const [showInventoryReminder, setShowInventoryReminder] = useState(false)
  const [reconciliationSheetOpen, setReconciliationSheetOpen] = useState(false)
  const [reconciliationItems, setReconciliationItems] = useState([])
  const [reconciliationSaving, setReconciliationSaving] = useState(false)

  // Animated count-up for financial numbers
  const animatedTotal = useCountUp(jars.totalCash)
  const animatedCapital = useCountUp(jars.capitalJar)
  const animatedProfit = useCountUp(jars.profitJar)

  // Free Cash = profit jar - unsettled payables (debts I owe)
  const [unsettledPayables, setUnsettledPayables] = useState(0)
  const animatedFreeCash = useCountUp(Math.max(0, jars.profitJar - unsettledPayables))

  useEffect(() => {
    db.getPayables().then(payables => {
      const total = payables
        .filter(p => (p.amount || 0) - (p.debtAmountPaid || 0) > 0)
        .reduce((sum, p) => sum + ((p.amount || 0) - (p.debtAmountPaid || 0)), 0)
      setUnsettledPayables(total)
    }).catch(() => {}) // Non-critical — defaults to 0
  }, [stats.cashBalance])

  // Mask helper for hideAmounts security setting
  const maskAmount = (val) => hideAmounts ? '••••' : formatAmount(val)
  const navigate = useNavigate()

  // V9: Diagnostic insights
  const [insights, setInsights] = useState([])

  useEffect(() => {
    async function computeDiagnostics() {
      try {
        const [transactions, orders, receivables] = await Promise.all([
          db.transactions.toArray(),
          db.orders.toArray(),
          db.getReceivables(),
        ])
        const data = { transactions, orders, receivables }
        const metrics = computeSnapshot(data)
        const level = languageMode || 'simple'
        const results = diagnose(metrics, rulesJson, level)
        // Replace {value} in text with actual metric values
        const processed = results.map(insight => {
          let text = insight.text
          // Replace {value} in text with actual metric values
          for (const [key, metric] of Object.entries(metrics)) {
            if (text.includes('{value}')) {
              text = text.replace('{value}', String(metric.value))
            }
          }
          // Replace {category} with top expense category name
          if (text.includes('{category}') && metrics.topExpenseRatio?.category) {
            text = text.replace('{category}', metrics.topExpenseRatio.category)
          }
          return { ...insight, text }
        })
        setInsights(processed)
      } catch (e) {
        console.error('Diagnostics failed:', e)
      }
    }
    computeDiagnostics()
  }, [stats.cashBalance, languageMode])

  useEffect(() => {
    db.getTwoJars().then(setJars)

    // Check if Z-Report reminder should show
    db.shouldShowZReportReminder().then(setShowZReportCard)

    // Check if weekly backup prompt should show
    db.shouldShowBackupReminder().then(should => {
      if (should) {
        setShowBackupPrompt(true)
        db.markBackupReminderShown()
      }
    })

    // Check if opening balance prompt should show
    db.getMeta('opening_balance_prompted', false).then(prompted => {
      if (!prompted) {
        setShowOpeningBalanceCard(true)
      }
    })

    // V10.2: Check if weekly inventory reconciliation is due
    if (inventoryEnabled) {
      db.shouldShowInventoryReminder().then(should => {
        setShowInventoryReminder(should)
      })
    }
  }, [stats.cashBalance, inventoryEnabled])

  // V10.2: Open reconciliation sheet — loads items + theoretical quantities
  const handleOpenReconciliation = async () => {
    hapticLight()
    const items = await db.getItems()
    const reconItems = items.map(item => ({
      id: item.id,
      name: item.name,
      unit: item.unit || 'piece',
      theoretical: item.current_stock || 0,
      actual: item.current_stock || 0, // pre-fill with theoretical, user adjusts
      gap: 0,
    }))
    setReconciliationItems(reconItems)
    setReconciliationSheetOpen(true)
  }

  // Update actual count for a specific item
  const handleReconItemChange = (itemId, actualQty) => {
    setReconciliationItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, actual: Number(actualQty) || 0, gap: (Number(actualQty) || 0) - item.theoretical }
      }
      return item
    }))
  }

  // Save reconciliation — updates items + logs wastage
  const handleSaveReconciliation = async () => {
    hapticSuccess()
    setReconciliationSaving(true)
    try {
      const result = await db.saveReconciliation(reconciliationItems)
      setReconciliationSheetOpen(false)
      setShowInventoryReminder(false)
      stats.refresh()
      if (result.wastageTotal > 0) {
        alert(`تم تحديث المخزون. الهدر: ${result.wastageTotal} دينار (سُجّل كمصروف)${result.surplusTotal > 0 ? `\nالفائض: ${result.surplusTotal} (عُدِّلت الكمية بدون مصروف)` : ''}`)
      } else if (result.surplusTotal > 0) {
        alert(`تم تحديث المخزون. فائض ${result.surplusTotal} — عُدِّلت الكمية بدون تسجيل مصروف.`)
      } else {
        alert('تم تحديث المخزون. لا يوجد فرق.')
      }
    } catch (e) {
      console.error('Reconciliation failed:', e)
    } finally {
      setReconciliationSaving(false)
    }
  }

  const handleFabAction = (action) => {
    setSheetOpen(action)
  }

  const handleSaved = () => {
    stats.refresh()
    setSheetOpen(null)
    db.getTwoJars().then(setJars)
  }

  // Z-Report handlers
  const handleOpenZReport = async () => {
    hapticLight()
    const expected = await db.getExpectedCash()
    setExpectedCash(expected)
    setCountedCash('')
    setZReportSaved(false)
    setZReportSheetOpen(true)
  }

  // A2: Submit guards — prevent double-submit on financial actions
  const [zReportSaving, guardZReport] = useSubmitGuard()
  const handleSaveZReport = guardZReport(async () => {
    hapticSuccess()
    const counted = parseNumber(countedCash) || 0
    await db.saveDailyClosure({ expected_cash: expectedCash, counted_cash: counted })
    setZReportSaved(true)
    setShowZReportCard(false)
  })

  // Weekly backup handler
  const handleBackupNow = async () => {
    hapticMedium()
    try {
      await exportBackup()
      await db.markBackupReminderShown()
      setShowBackupPrompt(false)
      hapticSuccess()
    } catch (e) {
      console.error('Backup failed:', e)
    }
  }

  // Opening Balance handlers
  const handleDismissOpeningBalance = async () => {
    hapticLight()
    await db.setMeta('opening_balance_prompted', true)
    setShowOpeningBalanceCard(false)
  }

  const [openingSaving, guardOpening] = useSubmitGuard()
  const handleSaveOpeningBalance = guardOpening(async () => {
    hapticSuccess()
    if (openingCash > 0) {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      await db.addTransaction({
        type: 'opening_balance',
        amount: openingCash,
        description: 'الرصيد الافتتاحي - النقد المتاح',
        category: 'رصيد افتتاحي',
        date: todayStart,
      })
    }
    await db.setMeta('opening_balance_prompted', true)
    setShowOpeningBalanceCard(false)
    setOpeningBalanceSheetOpen(false)
    db.getTwoJars().then(setJars)
    stats.refresh()
  })

  // Z-Report variance calculation
  const counted = parseNumber(countedCash) || 0
  const zVariance = counted - expectedCash
  const zVarianceType = zVariance > 0 ? 'surplus' : zVariance < 0 ? 'shortage' : 'balanced'

  return (
    <div className="min-h-screen pb-32">
      <PageHeader variant="home" homeChip={<OverviewChip />} />

      {/* Honest Drawer — Total Cash + Free Cash */}
      <section className="px-4 mb-3">
        <div className="rounded-16 p-4 text-ink relative overflow-hidden bg-mute shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-secondary">بالدرج</span>
            <Icon name="wallet" className="w-5 h-5" strokeWidth={1.5} />
          </div>
          {stats.loading ? (
            <div className="h-8 w-40 bg-white/20 rounded-lg animate-pulse mt-2" />
          ) : (
            <div className="num text-title-sm font-semibold mt-1 leading-none text-ink-secondary">
              {maskAmount(animatedTotal)}
            </div>
          )}
          {/* Free Cash — what the owner can actually take home */}
          <div className="mt-3 pt-3 border-t border-divider">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-primary-700">إلك منها الحرة</span>
            </div>
            {stats.loading ? (
              <div className="h-8 w-32 bg-white/20 rounded-lg animate-pulse mt-1" />
            ) : (
              <div className="num text-title font-bold mt-1 leading-none text-primary">
                {maskAmount(animatedFreeCash)}
              </div>
            )}
            <p className="text-caption text-ink-tertiary mt-1">المبلغ الآمن للسحب بعد خصم رأس المال</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="card">
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <div className="w-9 h-9 rounded-12 grid place-items-center bg-primary-100 flex-shrink-0">
                <Icon name="wallet" className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-semibold text-primary-700 truncate">{t.shop_equity}</span>
            </div>
            <div className="num text-title-sm font-semibold text-ink leading-none">
              {maskAmount(animatedCapital)}
            </div>
            <div className="text-caption mt-1 text-ink-secondary leading-snug">{t.shop_equity_desc}</div>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <div className="w-9 h-9 rounded-12 grid place-items-center bg-income-100 flex-shrink-0">
                <Icon name="trendingUp" className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-semibold text-income-700 truncate">{t.merchant_equity}</span>
            </div>
            <div className="num text-title-sm font-semibold leading-none text-income-600">
              {maskAmount(animatedProfit)}
            </div>
            <div className="text-caption mt-1 text-ink-secondary leading-snug">{t.merchant_equity_desc}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 justify-center mt-2 px-2">
          <Icon name="info" className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-caption text-ink-secondary text-center leading-snug">{t.jars_helper}</span>
        </div>
      </section>

      {/* V9: Diagnostics — SWOT insights */}
      {insights.length > 0 && (
        <section className="px-4 mb-6">
          <h2 className="text-section text-ink mb-3">مهام اليوم وتشخيص مشروعك</h2>
          <div className="space-y-3">
            {insights.map(insight => (
              <DiagnosticCard
                key={insight.id}
                insight={insight}
                onAction={(action) => {
                  if (action === 'navigate_orders') navigate('/orders')
                  else if (action === 'navigate_finance') navigate('/finance')
                  else if (action === 'navigate_inventory') navigate('/inventory')
                  else if (action === 'whatsapp_bulk') navigate('/debts')
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Today's Income & Expenses */}
      <section className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {/* Today's Income */}
          <Link
            to="/finance"
            className="bg-surface rounded-2xl p-4 shadow-card active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-income-50 flex items-center justify-center">
                <Icon name="arrowDownLeft" className="w-5 h-5 text-income-600" strokeWidth={2} />
              </div>
            </div>
            <p className="text-xs text-text-secondary mb-1">{t.today_income}</p>
            {stats.loading ? (
              <div className="h-6 w-20 bg-divider rounded animate-pulse" />
            ) : (
              <p className="text-lg font-bold text-income-600 tabular-nums">
                {maskAmount(stats.todayIncome)}
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
                <Icon name="arrowUpRight" className="w-5 h-5 text-expense-600" strokeWidth={2} />
              </div>
            </div>
            <p className="text-xs text-text-secondary mb-1">{t.today_expense}</p>
            {stats.loading ? (
              <div className="h-6 w-20 bg-divider rounded animate-pulse" />
            ) : (
              <p className="text-lg font-bold text-expense-600 tabular-nums">
                {maskAmount(stats.todayExpense)}
              </p>
            )}
          </Link>
        </div>
      </section>

      {/* Upcoming Orders */}
      <section className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-text-primary">{t.upcoming_orders}</h2>
          <Link to="/orders" className="text-sm text-primary-600 font-medium">
            {t.view_all}
          </Link>
        </div>

        {!stats.loading && stats.upcomingOrders.length === 0 ? (
          <div className="bg-surface rounded-2xl p-5 shadow-card">
            <EmptyState
              icon="clipboard"
              title={t.empty_no_orders}
              description={t.upcoming_orders}
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
                      {order.customerName || t.customer_name}
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

      {/* This Month Summary — gated by monthlySummary setting */}
      {monthlySummary && (
      <section className="px-4 mb-6">
        <div className="bg-surface rounded-2xl p-5 shadow-card">
          <h2 className="text-base font-bold text-text-primary mb-4">{t.net_this_month}</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs text-text-secondary mb-1">{t.total_income}</p>
              <p className="text-base font-bold text-income-600 tabular-nums num">
                {maskAmount(stats.monthIncome)}
              </p>
            </div>
            <div className="text-center border-r border-l border-divider">
              <p className="text-xs text-text-secondary mb-1">{t.total_expense}</p>
              <p className="text-base font-bold text-expense-600 tabular-nums num">
                {maskAmount(stats.monthExpense)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-secondary mb-1">{t.net_profit}</p>
              <p className={`text-base font-bold tabular-nums num ${
                stats.monthIncome - stats.monthExpense >= 0 ? 'text-income-600' : 'text-expense-600'
              }`}>
                {maskAmount(stats.monthIncome - stats.monthExpense)}
              </p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* V4 Phase 2: Z-Report Reminder Card */}
      {showZReportCard && (
        <section className="px-4 mb-4">
          <button
            type="button"
            onClick={handleOpenZReport}
            className="w-full bg-withdrawal-50 border border-withdrawal-200 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform text-right animate-fade-in"
          >
            <div className="w-12 h-12 rounded-xl bg-withdrawal-100 flex items-center justify-center flex-shrink-0">
              <Icon name="clock" className="w-6 h-6 text-withdrawal-600" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-withdrawal-700 text-sm">{t.z_report_reminder}</p>
              <p className="text-xs text-withdrawal-600 mt-0.5">{t.z_report_reminder_desc}</p>
            </div>
            <Icon name="chevronLeft" className="w-5 h-5 text-withdrawal-600" />
          </button>
        </section>
      )}

      {/* V10.2: Weekly Inventory Reconciliation Reminder */}
      {inventoryEnabled && showInventoryReminder && (
        <section className="px-4 mb-4">
          <button
            type="button"
            onClick={handleOpenReconciliation}
            className="w-full bg-accent-50 border border-accent-200 rounded-card p-4 flex items-center gap-3 active:scale-[0.98] transition-transform text-right"
          >
            <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center flex-shrink-0">
              <Icon name="list" className="w-6 h-6 text-accent-600" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-accent-700 text-sm">هلأ وقت تحديث المخزون الأسبوعي</p>
              <p className="text-caption text-accent-600 mt-0.5">يأخذ دقيقة — عدّ المواد وسجّل الفرق</p>
            </div>
            <Icon name="chevronLeft" className="w-5 h-5 text-accent-600" />
          </button>
        </section>
      )}

      {/* V4 Phase 2: Weekly Backup Prompt */}
      {showBackupPrompt && (
        <section className="px-4 mb-4">
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Icon name="download" className="w-5 h-5 text-primary-600" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-primary-700 text-sm">{t.backup_reminder_title}</p>
                <p className="text-xs text-primary-600 mt-0.5">
                  {t.backup_reminder_desc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBackupPrompt(false)}
                className="text-primary-400 active:scale-95"
                aria-label={t.notes}
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleBackupNow}
              className="w-full bg-primary text-white font-semibold rounded-xl py-2.5 active:scale-95 transition-transform text-sm flex items-center justify-center gap-2"
            >
              <Icon name="whatsapp" className="w-4 h-4" />
              {t.backup_send}
            </button>
          </div>
        </section>
      )}

      {/* V4 Phase 3: Opening Balance Prompt Card */}
      {showOpeningBalanceCard && (
        <section className="px-4 mb-4">
          <div className="bg-income-50 border border-income-200 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-income-100 flex items-center justify-center flex-shrink-0">
                <Icon name="wallet" className="w-5 h-5 text-income-600" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-income-700 text-sm">{t.opening_balance_title}</p>
                <p className="text-xs text-income-600 mt-0.5">
                  {t.opening_balance_desc}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismissOpeningBalance}
                className="text-income-400 active:scale-95"
                aria-label={t.notes}
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { hapticLight(); setOpeningBalanceSheetOpen(true) }}
                className="flex-1 bg-income-500 text-white font-semibold rounded-xl py-2.5 active:scale-95 transition-transform text-sm"
              >
                {t.opening_balance_enter}
              </button>
              <button
                type="button"
                onClick={handleDismissOpeningBalance}
                className="bg-surface text-text-secondary font-semibold rounded-xl py-2.5 px-4 active:scale-95 transition-transform text-sm"
              >
                {t.opening_balance_later}
              </button>
            </div>
          </div>
        </section>
      )}

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

      {/* V4 Phase 2: Z-Report Bottom Sheet */}
      <BottomSheet open={zReportSheetOpen} onClose={() => setZReportSheetOpen(false)} title={t.z_report_title}>
        <div className="space-y-5 pb-4">
          {zReportSaved ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-income-50 flex items-center justify-center mx-auto">
                <Icon name="checkCircle" className="w-8 h-8 text-income-600" strokeWidth={2} />
              </div>
              <p className="text-lg font-bold text-text-primary">{t.snackbar_closing_saved}</p>
              <button
                type="button"
                onClick={() => setZReportSheetOpen(false)}
                className="w-full btn-primary"
              >
                {t.save}
              </button>
            </div>
          ) : (
            <>
              {/* Expected Cash */}
              <div className="bg-background rounded-2xl p-4">
                <p className="text-xs text-text-secondary mb-1">{t.z_report_expected}</p>
                <p className="text-3xl font-bold tabular-nums num text-text-primary">{formatAmount(expectedCash)}</p>
                <p className="text-xs text-text-tertiary mt-1">{t.z_report_expected}</p>
              </div>

              {/* Counted Cash Input */}
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-2">{t.z_report_counted}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={countedCash}
                  onChange={(e) => setCountedCash(formatLiveInput(e.target.value))}
                  placeholder="0"
                  className="input-field text-2xl font-bold text-center tabular-nums"
                  dir="ltr"
                />
              </div>

              {/* Variance Display */}
              {countedCash && (
                <div className={`rounded-2xl p-4 ${
                  zVarianceType === 'surplus' ? 'bg-income-50' :
                  zVarianceType === 'shortage' ? 'bg-expense-50' : 'bg-background'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-semibold ${
                        zVarianceType === 'surplus' ? 'text-income-700' :
                        zVarianceType === 'shortage' ? 'text-expense-700' : 'text-text-primary'
                      }`}>
                        {zVarianceType === 'surplus' ? t.report_variance_surplus : zVarianceType === 'shortage' ? t.report_variance_shortage : t.report_variance_balanced}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">{t.z_report_variance}</p>
                    </div>
                    <p className={`text-2xl font-bold tabular-nums num ${
                      zVarianceType === 'surplus' ? 'text-income-600' :
                      zVarianceType === 'shortage' ? 'text-expense-600' : 'text-text-primary'
                    }`}>
                      {zVariance > 0 ? '+' : ''}{formatAmount(zVariance)}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveZReport}
                disabled={!countedCash || zReportSaving}
                className="w-full btn-primary disabled:opacity-50"
              >
                {zReportSaving ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : t.z_report_save}
              </button>
            </>
          )}
        </div>
      </BottomSheet>

      {/* V4 Phase 3: Opening Balance Sheet */}
      <BottomSheet open={openingBalanceSheetOpen} onClose={() => setOpeningBalanceSheetOpen(false)} title={t.opening_balance_title}>
        <div className="space-y-5 pb-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            {t.opening_balance_desc}
          </p>
          <AmountInput
            value={openingCash}
            onChange={setOpeningCash}
            label={t.opening_balance_amount}
            autoFocus
          />
          <button
            type="button"
            onClick={handleSaveOpeningBalance}
            disabled={openingSaving}
            className="w-full btn-primary disabled:opacity-50"
          >
            {openingSaving ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            ) : t.save}
          </button>
          <button
            type="button"
            onClick={handleDismissOpeningBalance}
            className="w-full bg-background text-text-secondary font-semibold rounded-2xl py-3.5 active:scale-[0.98] transition-transform"
          >
            {t.opening_balance_later}
          </button>
        </div>
      </BottomSheet>

      {/* V10.2: Weekly Reconciliation Sheet */}
      <BottomSheet
        open={reconciliationSheetOpen}
        onClose={() => setReconciliationSheetOpen(false)}
        title="تحديث المخزون الأسبوعي"
      >
        <div className="space-y-4 pb-4">
          {reconciliationItems.length === 0 ? (
            <p className="text-sm text-ink-secondary text-center py-4">
              لا توجد أصناف في المخزون. أضف أصنافاً من صفحة المخزون أولاً.
            </p>
          ) : (
            <>
              <p className="text-caption text-ink-secondary leading-relaxed">
                عدّ كل صنف فعلياً وادخل الرقم. الفرق سيُسجّل تلقائياً كمصروف هدر.
              </p>
              {reconciliationItems.map(item => (
                <div key={item.id} className="bg-background rounded-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-ink text-sm">{item.name}</p>
                    <span className="text-caption text-ink-tertiary">
                      نظري: <span className="num font-bold text-ink">{item.theoretical}</span> {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-caption text-ink-secondary flex-shrink-0">فعلي:</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.actual}
                      onChange={(e) => handleReconItemChange(item.id, e.target.value)}
                      className="input-field flex-1 num font-bold"
                      style={{ minHeight: '40px' }}
                      dir="ltr"
                    />
                    {item.gap !== 0 && (
                      <span className={`text-caption font-bold flex-shrink-0 ${item.gap < 0 ? 'text-expense-600' : 'text-income-600'}`}>
                        {item.gap > 0 ? '+' : ''}{item.gap}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleSaveReconciliation}
                disabled={reconciliationSaving}
                className="w-full btn-primary disabled:opacity-50"
              >
                {reconciliationSaving ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : 'حفظ التحديث'}
              </button>
            </>
          )}
        </div>
      </BottomSheet>

      {/* N1: Exit confirmation toast */}
      {exitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-ink text-surface text-sm font-semibold px-5 py-3 rounded-pill shadow-e3 animate-fade-in">
          اضغط مرّة أخرى للخروج
        </div>
      )}
    </div>
  )
}
