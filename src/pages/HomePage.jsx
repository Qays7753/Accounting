import { useState, useEffect } from 'react'
import { useDashboardStats } from '../hooks/useDatabase.js'
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

export default function HomePage() {
  const stats = useDashboardStats()
  const [sheetOpen, setSheetOpen] = useState(null)
  const [logo, setLogo] = useState(null)
  const [businessName, setBusinessName] = useState(null)
  const [jars, setJars] = useState({ capitalJar: 0, profitJar: 0, totalCash: 0 })

  // V4 Phase 2: Z-Report
  const [showZReportCard, setShowZReportCard] = useState(false)
  const [zReportSheetOpen, setZReportSheetOpen] = useState(false)
  const [expectedCash, setExpectedCash] = useState(0)
  const [countedCash, setCountedCash] = useState('')
  const [zReportSaved, setZReportSaved] = useState(false)

  // V4 Phase 2: Weekly Backup Reminder
  const [showBackupPrompt, setShowBackupPrompt] = useState(false)

  // V4 Phase 3: Opening Balance Prompt (dismissible card)
  const [showOpeningBalanceCard, setShowOpeningBalanceCard] = useState(false)
  const [openingBalanceSheetOpen, setOpeningBalanceSheetOpen] = useState(false)
  const [openingCash, setOpeningCash] = useState(0)

  useEffect(() => {
    db.getLogo().then(setLogo)
    db.getBusinessName().then(setBusinessName)
    db.getTwoJars().then(setJars)

    // V4 Phase 2: Check if Z-Report reminder should show
    db.shouldShowZReportReminder().then(setShowZReportCard)

    // V4 Phase 2: Check if weekly backup prompt should show
    db.shouldShowBackupReminder().then(should => {
      if (should) {
        setShowBackupPrompt(true)
        db.markBackupReminderShown()
      }
    })

    // V4 Phase 3: Check if opening balance prompt should show
    db.getMeta('opening_balance_prompted', false).then(prompted => {
      if (!prompted) {
        setShowOpeningBalanceCard(true)
      }
    })
  }, [stats.cashBalance])

  const handleFabAction = (action) => {
    setSheetOpen(action)
  }

  const handleSaved = () => {
    stats.refresh()
    setSheetOpen(null)
    db.getTwoJars().then(setJars)
  }

  // V4 Phase 2: Z-Report handlers
  const handleOpenZReport = async () => {
    hapticLight()
    const expected = await db.getExpectedCash()
    setExpectedCash(expected)
    setCountedCash('')
    setZReportSaved(false)
    setZReportSheetOpen(true)
  }

  const handleSaveZReport = async () => {
    hapticSuccess()
    const counted = parseNumber(countedCash) || 0
    await db.saveDailyClosure({ expected_cash: expectedCash, counted_cash: counted })
    setZReportSaved(true)
    setShowZReportCard(false)
  }

  // V4 Phase 2: Weekly backup handler
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

  // V4 Phase 3: Opening Balance handlers
  const handleDismissOpeningBalance = async () => {
    hapticLight()
    await db.setMeta('opening_balance_prompted', true)
    setShowOpeningBalanceCard(false)
  }

  const handleSaveOpeningBalance = async () => {
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
  }

  // Z-Report variance calculation
  const counted = parseNumber(countedCash) || 0
  const zVariance = counted - expectedCash
  const zVarianceType = zVariance > 0 ? 'surplus' : zVariance < 0 ? 'shortage' : 'balanced'

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

      {/* V4 Phase 2: Z-Report Reminder Card */}
      {showZReportCard && (
        <section className="px-5 mb-4">
          <button
            type="button"
            onClick={handleOpenZReport}
            className="w-full bg-withdrawal-50 border border-withdrawal-200 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform text-right animate-fade-in"
          >
            <div className="w-12 h-12 rounded-xl bg-withdrawal-100 flex items-center justify-center flex-shrink-0">
              <Icon name="clock" className="w-6 h-6 text-withdrawal-600" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-withdrawal-700 text-sm">حان وقت إقفال اليوم</p>
              <p className="text-xs text-withdrawal-600 mt-0.5">اضغط هنا لعد النقد ومطابقته مع السجلات</p>
            </div>
            <Icon name="chevronLeft" className="w-5 h-5 text-withdrawal-600" />
          </button>
        </section>
      )}

      {/* V4 Phase 2: Weekly Backup Prompt */}
      {showBackupPrompt && (
        <section className="px-5 mb-4">
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Icon name="download" className="w-5 h-5 text-primary-600" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-primary-700 text-sm">حماية بياناتك</p>
                <p className="text-xs text-primary-600 mt-0.5">
                  لحماية بياناتك، اضغط هنا لإرسال نسخة احتياطية لنفسك عبر واتساب
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBackupPrompt(false)}
                className="text-primary-400 active:scale-95"
                aria-label="إغلاق"
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
              إرسال نسخة احتياطية عبر واتساب
            </button>
          </div>
        </section>
      )}

      {/* V4 Phase 3: Opening Balance Prompt Card */}
      {showOpeningBalanceCard && (
        <section className="px-5 mb-4">
          <div className="bg-income-50 border border-income-200 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-income-100 flex items-center justify-center flex-shrink-0">
                <Icon name="wallet" className="w-5 h-5 text-income-600" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-income-700 text-sm">أدخل رصيدك الحالي</p>
                <p className="text-xs text-income-600 mt-0.5">
                  أدخل رصيدك الحالي لبدء الحساب بدقة. يمكنك القيام بذلك لاحقاً.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismissOpeningBalance}
                className="text-income-400 active:scale-95"
                aria-label="إغلاق"
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
                إدخال الرصيد
              </button>
              <button
                type="button"
                onClick={handleDismissOpeningBalance}
                className="bg-surface text-text-secondary font-semibold rounded-xl py-2.5 px-4 active:scale-95 transition-transform text-sm"
              >
                لاحقاً
              </button>
            </div>
          </div>
        </section>
      )}

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

      {/* V4 Phase 2: Z-Report Bottom Sheet */}
      <BottomSheet open={zReportSheetOpen} onClose={() => setZReportSheetOpen(false)} title="إقفال اليومية">
        <div className="space-y-5 pb-4">
          {zReportSaved ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-income-50 flex items-center justify-center mx-auto">
                <Icon name="checkCircle" className="w-8 h-8 text-income-600" strokeWidth={2} />
              </div>
              <p className="text-lg font-bold text-text-primary">تم حفظ الإقفال بنجاح</p>
              <button
                type="button"
                onClick={() => setZReportSheetOpen(false)}
                className="w-full btn-primary"
              >
                تم
              </button>
            </div>
          ) : (
            <>
              {/* Expected Cash */}
              <div className="bg-background rounded-2xl p-4">
                <p className="text-xs text-text-secondary mb-1">النقد المتوقع في الصندوق</p>
                <p className="text-3xl font-bold tabular-nums text-text-primary">{formatAmount(expectedCash)}</p>
                <p className="text-xs text-text-tertiary mt-1">بناءً على سجلات التطبيق</p>
              </div>

              {/* Counted Cash Input */}
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-2">النقد الفعلي الذي عده التاجر</label>
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
                        {zVarianceType === 'surplus' ? 'فائض' : zVarianceType === 'shortage' ? 'عجز' : 'متطابق'}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">الفرق بين المتوقع والفعلي</p>
                    </div>
                    <p className={`text-2xl font-bold tabular-nums ${
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
                disabled={!countedCash}
                className="w-full btn-primary disabled:opacity-50"
              >
                حفظ الإقفال
              </button>
            </>
          )}
        </div>
      </BottomSheet>

      {/* V4 Phase 3: Opening Balance Sheet */}
      <BottomSheet open={openingBalanceSheetOpen} onClose={() => setOpeningBalanceSheetOpen(false)} title="إدخال الرصيد الحالي">
        <div className="space-y-5 pb-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            أدخل المبلغ الذي تملكه حالياً نقداً (في الصندوق أو البنك). سيكون هذا هو رصيدك الافتتاحي.
          </p>
          <AmountInput
            value={openingCash}
            onChange={setOpeningCash}
            label="النقد المتاح"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSaveOpeningBalance}
            className="w-full btn-primary"
          >
            حفظ الرصيد
          </button>
          <button
            type="button"
            onClick={handleDismissOpeningBalance}
            className="w-full bg-background text-text-secondary font-semibold rounded-2xl py-3.5 active:scale-[0.98] transition-transform"
          >
            تخطي الآن
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
