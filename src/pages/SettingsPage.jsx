import { useState, useEffect, useRef } from 'react'
import { db } from '../db'
import { useSettings } from '../hooks/useDatabase.js'
import Icon from '../components/ui/Icon.jsx'
import BottomSheet from '../components/ui/BottomSheet.jsx'
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '../utils/haptics.js'
import { getWhatsAppTemplate, setWhatsAppTemplate, WHATSAPP_PLACEHOLDERS } from '../utils/whatsapp.js'
import { exportBackup, importBackup, checkBackupReminder, markBackupDone } from '../utils/backup.js'
import { requestNotificationPermission, sendTestNotification, initNotificationService, teardownNotificationService } from '../utils/notifications.js'
import { useHelperMode } from '../context/HelperModeContext.jsx'
import { useTerms, useLanguageMode, useActiveLayer } from '../context/TermsContext.jsx'
import { useSettings2 } from '../context/SettingsContext.jsx'
import { triggerInstall, isStandalone, subscribeInstallAvailability } from '../utils/pwaInstall.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import { useSubmitGuard } from '../hooks/useSubmitGuard.js'
import { useCloudSync } from '../context/CloudSyncContext.jsx'
import { loginWithGoogle, logout as gdriveLogout } from '../utils/googleDrive.js'
import { forceRefreshApp } from '../utils/pwaUpdate.js'
import { formatArabicDateTime } from '../utils/date.js'

export default function SettingsPage() {
  const { refresh } = useSettings()
  const t = useTerms()
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateText, setTemplateText] = useState('')
  const [installOpen, setInstallOpen] = useState(false)
  const [backupReminder, setBackupReminder] = useState(null)

  // Branding sheet state (the actual logo/name now live in SettingsContext)
  const [brandingSheetOpen, setBrandingSheetOpen] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)  // local preview before save
  const [businessNameInput, setBusinessNameInput] = useState('')
  const fileInputRef = useRef(null)

  // Helper Mode PIN entry sheet
  const [helperPinSheetOpen, setHelperPinSheetOpen] = useState(false)
  const [helperPinInput, setHelperPinInput] = useState('')
  const { isHelperMode, enterHelperMode, helperModeEnabled } = useHelperMode()

  // Live UI settings from SettingsContext (propagate to whole app instantly)
  const {
    showQuickPos, setShowQuickPos,
    inventoryEnabled, setInventoryEnabled,
    logo, setLogo,
    businessName, setBusinessName,
    fontSize, setFontSize,
    listDensity, setListDensity,
    hideAmounts, setHideAmounts,
    autoLock, setAutoLock,
    monthlySummary, setMonthlySummary,
    notificationsEnabled, setNotificationsEnabled,
  } = useSettings2()

  // Local copy of closing time (not in SettingsContext yet — used only by Z-Report reminder)
  const [closingTime, setClosingTime] = useState('20:00')
  // Local copy of fiscal year start (not yet consumed by reports)
  const [fiscalYearStart, setFiscalYearStart] = useState(1)

  // PWA install + clear-data confirmation sheet
  const [installAvailable, setInstallAvailable] = useState(false)
  const [standalone] = useState(() => isStandalone())
  const [installing, setInstalling] = useState(false)
  const [installResult, setInstallResult] = useState(null)  // { ok, accepted, reason } | null
  const [clearDataSheetOpen, setClearDataSheetOpen] = useState(false)
  const [clearConfirmText, setClearConfirmText] = useState('')

  // Cloud Sync state
  const cloudSync = useCloudSync()
  const [gdriveLoading, setGdriveLoading] = useState(false)
  const [emergencySheetOpen, setEmergencySheetOpen] = useState(false)
  const [emergencyRestoreLoading, setEmergencyRestoreLoading] = useState(false)

  // V8: Business model label
  const [businessModelLabel, setBusinessModelLabel] = useState('منتجات جاهزة')
  const [businessModelSheetOpen, setBusinessModelSheetOpen] = useState(false)

  // Report Mode (uses TermsContext for live switching)
  const [languageMode, setLanguageMode] = useLanguageMode()
  const [activeLayer, setActiveLayer] = useActiveLayer()

  useEffect(() => {
    getWhatsAppTemplate().then(setTemplateText)
  }, [])

  useEffect(() => {
    checkBackupReminder().then(setBackupReminder)
  }, [])

  // Load closing time + fiscal year + business model
  useEffect(() => {
    db.getClosingTime().then(setClosingTime)
    db.getSetting('fiscal_year_start', 1).then(v => setFiscalYearStart(Number(v) || 1))
    db.getMeta('business_model', 'ready').then(model => {
      setBusinessModelLabel(model === 'manufactured' ? 'منتجات أُصنِعَت' : 'منتجات جاهزة')
    })
  }, [])

  // Sync local logo preview + business name input with context values
  useEffect(() => {
    setLogoPreview(logo)
  }, [logo])
  useEffect(() => {
    setBusinessNameInput(businessName || '')
  }, [businessName])

  // Subscribe to PWA install-prompt availability
  useEffect(() => {
    const unsub = subscribeInstallAvailability(setInstallAvailable)
    return unsub
  }, [])

  // Trigger native PWA install prompt
  const handleInstallClick = async () => {
    hapticLight()
    setInstalling(true)
    setInstallResult(null)
    const result = await triggerInstall()
    setInstallResult(result)
    setInstalling(false)
    if (result.ok && result.accepted) {
      hapticSuccess()
    }
  }

  // Cloud Sync handlers
  const handleGoogleLogin = async () => {
    hapticLight()
    setGdriveLoading(true)
    try {
      await loginWithGoogle()
      await cloudSync.syncNow()
      hapticSuccess()
    } catch (e) {
      alert('فشل ربط حساب Google: ' + e.message)
    } finally {
      setGdriveLoading(false)
    }
  }

  const handleGoogleLogout = () => {
    hapticLight()
    gdriveLogout()
    window.location.reload()
  }

  const handleSyncNow = async () => {
    hapticLight()
    await cloudSync.syncNow()
    hapticSuccess()
  }

  const handleEmergencyRestore = async () => {
    hapticLight()
    setEmergencyRestoreLoading(true)
    try {
      await cloudSync.restoreEmergency()
      setEmergencySheetOpen(false)
      hapticSuccess()
      alert('تم استرجاع البيانات بنجاح')
      window.location.reload()
    } catch (e) {
      alert('فشل الاسترجاع: ' + e.message)
    } finally {
      setEmergencyRestoreLoading(false)
    }
  }

  // Clear all data — creates emergency backup first (Agent 3)
  const handleClearDataConfirm = async () => {
    if (clearConfirmText.trim() !== 'حذف') {
      hapticError()
      return
    }
    hapticSuccess()
    setClearDataSheetOpen(false)
    setClearConfirmText('')
    // Agent 3: Create emergency backup before wiping
    await cloudSync.createEmergencyBackup()
    await db.clearAllData()
    window.location.href = '/'
  }

  // Quick POS visibility (now via context — propagates to BottomNav instantly)
  const handleQuickPosToggle = async (enabled) => {
    hapticLight()
    await setShowQuickPos(enabled)
  }

  // Helper Mode: ONE unified flow.
  // - If PIN not yet set: open the PIN entry sheet to set it.
  // - If PIN already set: enter helper mode immediately.
  // - If already in helper mode: this row is hidden (replaced by lock button in nav).
  const handleHelperModeClick = () => {
    hapticLight()
    if (helperModeEnabled) {
      // PIN already configured → enter helper mode now
      enterHelperMode()
    } else {
      // First time: open PIN entry sheet
      setHelperPinSheetOpen(true)
    }
  }

  // Save helper PIN and enter helper mode immediately
  const handleHelperPinSave = async () => {
    if (helperPinInput.length !== 4) return
    hapticSuccess()
    await db.setHelperPin(helperPinInput)
    setHelperPinSheetOpen(false)
    setHelperPinInput('')
    // Enter helper mode immediately (no more misleading 'restart' alert)
    enterHelperMode()
  }

  // Save closing time
  const handleClosingTimeChange = async (e) => {
    hapticLight()
    const val = e.target.value
    setClosingTime(val)
    await db.setSetting('closing_time', val)
  }

  // All handlers now delegate to SettingsContext (instant UI propagation)
  const handleAutoLockChange = async (val) => {
    hapticLight()
    await setAutoLock(val)
  }
  const handleHideAmountsToggle = async (enabled) => {
    hapticLight()
    await setHideAmounts(enabled)
  }
  const handleFontSizeChange = async (val) => {
    hapticLight()
    await setFontSize(val)
  }
  const handleListDensityChange = async (val) => {
    hapticLight()
    await setListDensity(val)
  }
  const handleFiscalYearStartChange = async (e) => {
    hapticLight()
    const val = Number(e.target.value)
    setFiscalYearStart(val)
    await db.setSetting('fiscal_year_start', val)
  }
  const handleMonthlySummaryToggle = async (enabled) => {
    hapticLight()
    await setMonthlySummary(enabled)
  }

  // Notifications toggle: real on/off + start/stop notification service
  const handleNotificationsToggle = async (enabled) => {
    hapticLight()
    if (enabled) {
      const granted = await requestNotificationPermission()
      if (granted) {
        await setNotificationsEnabled(true)
        initNotificationService()  // start scheduling reminders
        hapticSuccess()
        await sendTestNotification()
      } else {
        hapticError()
      }
    } else {
      await setNotificationsEnabled(false)
      teardownNotificationService()  // stop scheduling
      hapticSuccess()
    }
  }

  const handleBackup = async () => {
    hapticMedium()
    try {
      const success = await exportBackup()
      if (success) {
        await markBackupDone()
        setBackupReminder(null)
        hapticSuccess()
      }
    } catch (e) {
      console.error('Backup failed:', e)
      // User might have cancelled share - don't show error in that case
      if (!e.message?.includes('Abort') && e.name !== 'AbortError') {
        alert('فشل التصدير: ' + e.message)
      }
    }
  }

  const [restoring, guardRestore] = useSubmitGuard()
  const handleRestore = guardRestore(async () => {
    hapticMedium()
    try {
      const result = await importBackup()
      if (result) {
        await db.setMeta('lastBackupDate', Date.now())
        setBackupReminder(null)
        refresh()
        hapticSuccess()
        alert('تمت الاستعادة بنجاح')
      }
    } catch (e) {
      console.error('Restore failed:', e)
      alert('فشل الاستعادة: ' + e.message)
    }
  })

  const [templateSaving, guardTemplate] = useSubmitGuard()
  const handleSaveTemplate = guardTemplate(async () => {
    hapticSuccess()
    await setWhatsAppTemplate(templateText)
    setTemplateOpen(false)
  })

  const insertPlaceholder = (token) => {
    hapticLight()
    setTemplateText((prev) => prev + ' ' + token)
  }

  // Logo & branding handlers
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    hapticLight()
    // Read as base64, resize to 128x128
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 128
        const ratio = Math.min(maxSize / img.width, maxSize / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const resized = canvas.toDataURL('image/png')
        setLogoPreview(resized)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    hapticLight()
    setLogoPreview(null)
  }

  const handleSaveBranding = async () => {
    hapticSuccess()
    // Persist via context — HomePage will re-render automatically (no reload)
    await setLogo(logoPreview)
    await setBusinessName(businessNameInput.trim())
    setBrandingSheetOpen(false)
  }

  return (
    <div className="min-h-screen pb-32">
      <PageHeader title={t.settings_title} />

      <div className="px-4 space-y-4">
        {/* Backup Reminder */}
        {backupReminder && (
          <div className="bg-withdrawal-50 border border-withdrawal-200 rounded-card p-4 flex items-start gap-3 animate-fade-in">
            <Icon name="bell" className="w-5 h-5 text-withdrawal-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-withdrawal-700">{t.backup_reminder_title}</p>
              <p className="text-caption text-withdrawal-600 mt-1">{backupReminder.message}</p>
              <button
                onClick={handleBackup}
                className="mt-2 bg-withdrawal-500 text-white text-caption font-semibold px-3 py-1.5 rounded-12 active:scale-95 transition-transform"
              >
                {t.backup}
              </button>
            </div>
          </div>
        )}

        {/* Cloud Sync (V7) */}
        <section>
          <h2 className="text-caption font-bold text-primary mb-2 px-1.5">المزامنة السحابية</h2>
          <div className="bg-surface rounded-card shadow-card divide-y divide-divider">
            {cloudSync.authorized ? (
              <>
                {/* Connected status card */}
                <div className="bg-mute rounded-card p-4 m-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-12 bg-income-50 grid place-items-center flex-shrink-0">
                      <Icon name="checkCircle" className="w-5 h-5 text-income-600" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink text-sm">حساب Google مربوط</p>
                      <p className="text-caption text-ink-secondary mt-0.5">
                        {cloudSync.lastSync
                          ? `آخر مزامنة: ${formatArabicDateTime(new Date(cloudSync.lastSync))}`
                          : 'لم تتم المزامنة بعد'}
                      </p>
                    </div>
                    {cloudSync.syncing && (
                      <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={cloudSync.syncing}
                    className="w-full btn-primary text-sm disabled:opacity-50"
                  >
                    مزامنة الآن
                  </button>
                </div>
                {/* Emergency recovery (only if backup exists) */}
                {cloudSync.emergencyBackupExists && (
                  <SettingsRow
                    icon="info"
                    iconBg="bg-expense-50 text-expense-600"
                    label="استرجاع نسخة محذوفة"
                    description="توجد نسخة احتياطية طارئة محفوظة"
                    onClick={() => { hapticLight(); setEmergencySheetOpen(true) }}
                  />
                )}
                {/* Disconnect */}
                <SettingsRow
                  icon="close"
                  iconBg="bg-mute text-text-secondary"
                  label="قطع الاتصال بـ Google"
                  description="إيقاف المزامنة السحابية"
                  onClick={handleGoogleLogout}
                />
              </>
            ) : (
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-12 bg-primary-50 grid place-items-center flex-shrink-0">
                    <Icon name="wallet" className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink text-sm">المزامنة التلقائية</p>
                    <p className="text-caption text-ink-secondary mt-0.5">احفظ بياناتك بأمان على Google Drive</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={gdriveLoading}
                  className="w-full btn-primary text-sm disabled:opacity-50"
                >
                  {gdriveLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : 'ربط حساب Google'}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Business Info (V8) */}
        <section>
          <h2 className="text-caption font-bold text-primary mb-2 px-1.5">بيانات النشاط</h2>
          <div className="bg-surface rounded-card shadow-card divide-y divide-divider">
            <SettingsRow
              icon="storefront"
              iconBg="bg-primary-50 text-primary-600"
              label="اسم المحل"
              description={businessName || 'متجري'}
              onClick={() => setBrandingSheetOpen(true)}
            />
            <SettingsRow
              icon="tag"
              iconBg="bg-accent-50 text-accent-600"
              label="نوع النشاط"
              description={businessModelLabel}
              onClick={() => { hapticLight(); setBusinessModelSheetOpen(true) }}
            />
          </div>
        </section>

        {/* Data Management (Manual Backup — Plan B) */}
        <section>
          <h2 className="text-caption font-bold text-primary mb-2 px-1.5">{t.data_management}</h2>
          <div className="bg-surface rounded-card shadow-card divide-y divide-divider">
            <SettingsRow
              icon="download"
              iconBg="bg-primary-50 text-primary-600"
              label={t.backup}
              description={t.backup_desc}
              onClick={handleBackup}
            />
            <SettingsRow
              icon="upload"
              iconBg="bg-income-50 text-income-600"
              label={t.restore}
              description={t.restore_desc}
              onClick={handleRestore}
            />
            {/* V6: Fiscal year start (month picker) */}
            <div className="w-full flex items-center gap-3 p-4 text-right">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-accent-50 text-accent-600">
                <Icon name="calendar" className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary text-sm">{t.fiscal_year_start}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{t.fiscal_year_start_desc}</p>
              </div>
              <select
                value={fiscalYearStart}
                onChange={handleFiscalYearStartChange}
                className="bg-background rounded-xl px-3 py-2 text-sm outline-none border border-divider text-text-primary"
                dir="rtl"
              >
                {['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'].map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* WhatsApp */}
        <section>
          <h2 className="text-caption font-bold text-primary mb-2 px-1.5">{t.whatsapp_section}</h2>
          <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
            <SettingsRow
              icon="whatsapp"
              iconBg="bg-income-50 text-income-600"
              label={t.whatsapp_template}
              description={t.whatsapp_template_desc}
              onClick={() => setTemplateOpen(true)}
            />
          </div>
        </section>

        {/* V10: Tri-Mode Switcher (Daily / Manager / Investor) */}
        <section>
          <h2 className="text-caption font-bold text-primary mb-2 px-1.5">وضع التطبيق</h2>
          <div className="bg-surface rounded-card shadow-card divide-y divide-divider">
            {/* Language Mode — terminology only */}
            <div className="w-full p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-12 flex items-center justify-center flex-shrink-0 bg-primary-50 text-primary-600">
                  <Icon name="document" className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-ink text-sm">لغة العرض</p>
                  <p className="text-caption text-ink-secondary mt-0.5">بسيطة (شارع) أو احترافية (محاسبية)</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => { hapticLight(); await setLanguageMode('simple') }}
                  className={`py-3 rounded-12 text-sm font-semibold transition-all active:scale-95 ${
                    languageMode === 'simple' ? 'bg-primary text-white' : 'bg-background text-ink-secondary border border-divider'
                  }`}
                >
                  بسيطة
                </button>
                <button
                  type="button"
                  onClick={async () => { hapticLight(); await setLanguageMode('pro') }}
                  className={`py-3 rounded-12 text-sm font-semibold transition-all active:scale-95 ${
                    languageMode === 'pro' ? 'bg-primary text-white' : 'bg-background text-ink-secondary border border-divider'
                  }`}
                >
                  احترافية
                </button>
              </div>
            </div>
            {/* Active Layer — features/screens */}
            <div className="w-full p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-12 flex items-center justify-center flex-shrink-0 bg-accent-50 text-accent-600">
                  <Icon name="list" className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-ink text-sm">طبقة التطبيق</p>
                  <p className="text-caption text-ink-secondary mt-0.5">البسيط / المتوسط / المتقدم</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={async () => { hapticLight(); await setActiveLayer(1) }}
                  className={`py-3 rounded-12 text-sm font-semibold transition-all active:scale-95 ${
                    activeLayer === 1 ? 'bg-primary text-white' : 'bg-background text-ink-secondary border border-divider'
                  }`}
                >
                  البسيط
                </button>
                <button
                  type="button"
                  onClick={async () => { hapticLight(); await setActiveLayer(2) }}
                  className={`py-3 rounded-12 text-sm font-semibold transition-all active:scale-95 ${
                    activeLayer === 2 ? 'bg-primary text-white' : 'bg-background text-ink-secondary border border-divider'
                  }`}
                >
                  المتوسط
                </button>
                <button
                  type="button"
                  onClick={async () => { hapticLight(); await setActiveLayer(3) }}
                  className={`py-3 rounded-12 text-sm font-semibold transition-all active:scale-95 ${
                    activeLayer === 3 ? 'bg-primary text-white' : 'bg-background text-ink-secondary border border-divider'
                  }`}
                >
                  المتقدم
                </button>
              </div>
              <p className="text-caption text-ink-tertiary mt-2 leading-relaxed">
                {activeLayer === 3
                  ? 'لوحة تنفيذية + إدخال أصول/قروض/رأس مال + تصدير PDF'
                  : activeLayer === 2
                  ? 'مخزون تنبؤي + خصم تلقائي (BOM) + رادار الهامش'
                  : 'مبيعات سريعة + مخزون يدوي أسبوعي + تقارير بسيطة'}
              </p>
              {/* V13: Reassurance — switching layers is a pure settings write; no business data is touched. */}
              <div className="mt-2 flex items-start gap-1.5 text-caption text-ink-secondary leading-relaxed">
                <Icon name="info" className="w-4 h-4 text-accent-600 flex-shrink-0 mt-0.5" />
                <span>{t.layer_switch_safe}</span>
              </div>
            </div>
          </div>
        </section>

        {/* V6: Security (auto-lock + hide amounts) */}
        <section>
          <h2 className="text-caption font-bold text-primary mb-2 px-1.5">{t.security_section}</h2>
          <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
            {/* Auto-lock segmented control */}
            <div className="w-full p-4 text-right">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-withdrawal-50 text-withdrawal-600">
                  <Icon name="lock" className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary text-sm">{t.auto_lock}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{t.auto_lock_desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: 'off', label: t.auto_lock_off },
                  { v: '30s', label: t.auto_lock_30s },
                  { v: '1m',  label: t.auto_lock_1m },
                  { v: '5m',  label: t.auto_lock_5m },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => handleAutoLockChange(opt.v)}
                    className={`py-2.5 rounded-xl text-caption font-semibold transition-all active:scale-95 ${
                      autoLock === opt.v ? 'bg-primary text-white' : 'bg-background text-text-secondary border border-divider'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Hide amounts toggle */}
            <SettingsToggle
              icon="eye"
              iconBg="bg-withdrawal-50 text-withdrawal-600"
              label={t.hide_amounts}
              description={t.hide_amounts_desc}
              checked={hideAmounts}
              onChange={handleHideAmountsToggle}
            />
          </div>
        </section>

        {/* V6: Display (font size + list density) */}
        <section>
          <h2 className="text-caption font-bold text-primary mb-2 px-1.5">{t.display_section}</h2>
          <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
            {/* Font size segmented control */}
            <div className="w-full p-4 text-right">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary-50 text-primary-600">
                  <Icon name="document" className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary text-sm">{t.font_size}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{t.font_size_desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFontSizeChange('normal')}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    fontSize === 'normal' ? 'bg-primary text-white' : 'bg-background text-text-secondary border border-divider'
                  }`}
                >
                  {t.font_size_normal}
                </button>
                <button
                  type="button"
                  onClick={() => handleFontSizeChange('large')}
                  className={`py-3 rounded-xl text-base font-semibold transition-all active:scale-95 ${
                    fontSize === 'large' ? 'bg-primary text-white' : 'bg-background text-text-secondary border border-divider'
                  }`}
                >
                  {t.font_size_large}
                </button>
              </div>
            </div>
            {/* List density segmented control */}
            <div className="w-full p-4 text-right">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-accent-50 text-accent-600">
                  <Icon name="list" className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary text-sm">{t.list_density}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{t.list_density_desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleListDensityChange('comfortable')}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    listDensity === 'comfortable' ? 'bg-primary text-white' : 'bg-background text-text-secondary border border-divider'
                  }`}
                >
                  {t.list_density_comfortable}
                </button>
                <button
                  type="button"
                  onClick={() => handleListDensityChange('compact')}
                  className={`py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    listDensity === 'compact' ? 'bg-primary text-white' : 'bg-background text-text-secondary border border-divider'
                  }`}
                >
                  {t.list_density_compact}
                </button>
              </div>
            </div>
            {/* Branding row (moved from appearance) */}
            <SettingsRow
              icon="user"
              iconBg="bg-withdrawal-50 text-withdrawal-600"
              label={t.branding}
              description={t.branding_desc}
              onClick={() => setBrandingSheetOpen(true)}
            />
          </div>
        </section>

        {/* V4 Phase 2: Operations (Quick POS + Helper Mode + Closing Time) */}
        <section>
          <h2 className="text-caption font-bold text-primary mb-2 px-1.5">{t.operations_security}</h2>
          <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
            {/* Quick POS Toggle */}
            <SettingsToggle
              icon="tag"
              iconBg="bg-primary-50 text-primary-600"
              label={t.show_quick_pos}
              description={t.show_quick_pos_desc}
              checked={showQuickPos}
              onChange={handleQuickPosToggle}
            />
            {/* Inventory Tracking Toggle */}
            <SettingsToggle
              icon="list"
              iconBg="bg-accent-50 text-accent-600"
              label="تفعيل تتبع المخزون"
              description="تتبّع أسبوعي يدوي للمواد الخام"
              checked={inventoryEnabled}
              onChange={async (v) => { hapticLight(); await setInventoryEnabled(v) }}
            />
            {/* Helper Mode — ONE unified row */}
            <SettingsRow
              icon="lock"
              iconBg="bg-withdrawal-50 text-withdrawal-600"
              label={helperModeEnabled ? t.enter_helper_mode : t.helper_mode}
              description={t.helper_mode_desc}
              onClick={handleHelperModeClick}
            />
            {/* Closing Time */}
            <div className="w-full flex items-center gap-3 p-4 text-right">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-expense-50 text-expense-600">
                <Icon name="clock" className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary text-sm">{t.closing_time}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{t.closing_time_desc}</p>
              </div>
              <input
                type="time"
                value={closingTime}
                onChange={handleClosingTimeChange}
                className="bg-background rounded-xl px-3 py-2 text-sm outline-none border border-divider text-text-primary"
                dir="ltr"
              />
            </div>
          </div>
        </section>

        {/* App Info */}
        <section>
          <h2 className="text-caption font-bold text-primary mb-2 px-1.5">{t.app_section}</h2>
          <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
            {/* Notifications — real toggle now */}
            <SettingsToggle
              icon="bell"
              iconBg="bg-withdrawal-50 text-withdrawal-600"
              label={t.notifications}
              description={t.notifications_desc}
              checked={notificationsEnabled}
              onChange={handleNotificationsToggle}
            />
            {/* V6: Monthly summary toggle — now consumed by HomePage */}
            <SettingsToggle
              icon="document"
              iconBg="bg-income-50 text-income-600"
              label={t.monthly_summary}
              description={t.monthly_summary_desc}
              checked={monthlySummary}
              onChange={handleMonthlySummaryToggle}
            />
            <SettingsRow
              icon="install"
              iconBg="bg-primary-50 text-primary-600"
              label={t.install_instructions}
              description={t.install_desc}
              onClick={() => setInstallOpen(true)}
            />
            <SettingsRow
              icon="download"
              iconBg="bg-primary-50 text-primary-600"
              label="التحقق من التحديثات"
              description="جلب أحدث نسخة من التطبيق"
              onClick={async () => {
                hapticMedium()
                if (confirm('سيتم جلب أحدث نسخة وإعادة تشغيل التطبيق.\nبياناتك آمنة ولن تُحذف.\nمتابعة؟')) {
                  await forceRefreshApp(true)
                }
              }}
            />
            <SettingsRow
              icon="info"
              iconBg="bg-mute text-text-secondary"
              label={t.about_app}
              description="v1.0.0"
              onClick={() => alert('الحسابات - إصدار 1.0.0\nتطبيق محاسبة وإدارة الطلبات للشركات الصغيرة')}
            />
            <SettingsRow
              icon="trash"
              iconBg="bg-expense-50 text-expense-600"
              label={t.factory_reset}
              description={t.factory_reset_desc}
              onClick={() => { hapticMedium(); setClearDataSheetOpen(true) }}
            />
          </div>
        </section>
      </div>

      {/* WhatsApp Template Editor */}
      <BottomSheet open={templateOpen} onClose={() => setTemplateOpen(false)} title="قالب رسالة واتساب">
        <div className="space-y-4 pb-4">
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2">نص الرسالة</label>
            <textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              rows={5}
              className="input-field resize-none text-sm leading-relaxed"
              dir="rtl"
              placeholder="اكتب نص الرسالة هنا..."
            />
          </div>

          <div>
            <p className="text-xs text-text-secondary mb-2">أضف حقلاً تلقائياً:</p>
            <div className="flex flex-wrap gap-2">
              {WHATSAPP_PLACEHOLDERS.map((p) => (
                <button
                  key={p.token}
                  onClick={() => insertPlaceholder(p.token)}
                  className="px-3 py-2 bg-primary-50 text-primary-600 rounded-xl text-xs font-semibold active:scale-95 transition-transform"
                >
                  + {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-background rounded-2xl p-3">
            <p className="text-xs text-text-tertiary">
              المعاينة:
            </p>
            <p className="text-sm text-text-primary mt-1 leading-relaxed whitespace-pre-wrap">
              {templateText || '...'}
            </p>
          </div>

          <button
            onClick={handleSaveTemplate}
            disabled={templateSaving}
            className="w-full btn-primary disabled:opacity-50"
          >
            {templateSaving ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            ) : 'حفظ القالب'}
          </button>
        </div>
      </BottomSheet>

      {/* V7: Install App Sheet — real beforeinstallprompt trigger */}
      <BottomSheet open={installOpen} onClose={() => setInstallOpen(false)} title={t.install_instructions}>
        <div className="space-y-4 pb-4 text-sm leading-relaxed text-text-primary">

          {/* Status banner */}
          {standalone ? (
            <div className="bg-income-50 border border-income-200 rounded-2xl p-4 flex items-start gap-3">
              <Icon name="checkCircle" className="w-6 h-6 text-income-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="font-semibold text-income-700">{t.install_already_done}</p>
                <p className="text-xs text-income-600 mt-1">{t.install_already_done_desc}</p>
              </div>
            </div>
          ) : installAvailable ? (
            <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 flex items-start gap-3">
              <Icon name="install" className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-primary-700">{t.install_ready}</p>
                <p className="text-xs text-primary-600 mt-1">{t.install_ready_desc}</p>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={installing}
                  className="mt-3 btn-primary w-full disabled:opacity-50"
                >
                  {installing ? '…' : t.install_button}
                </button>
                {installResult && !installResult.ok && (
                  <p className="text-xs text-expense-600 mt-2">
                    {installResult.reason === 'already-installed' ? t.install_already_done : t.install_failed}
                  </p>
                )}
                {installResult && installResult.ok && !installResult.accepted && (
                  <p className="text-xs text-text-tertiary mt-2">{t.install_dismissed}</p>
                )}
                {installResult && installResult.ok && installResult.accepted && (
                  <p className="text-xs text-income-600 mt-2">{t.install_success}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-withdrawal-50 border border-withdrawal-200 rounded-2xl p-4 flex items-start gap-3">
              <Icon name="info" className="w-6 h-6 text-withdrawal-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-withdrawal-700">{t.install_manual}</p>
                <p className="text-xs text-withdrawal-600 mt-1">{t.install_manual_desc}</p>
              </div>
            </div>
          )}

          {/* Manual instructions (always shown as fallback) */}
          <div className="bg-background rounded-2xl p-4">
            <p className="font-semibold mb-2">{t.install_android_title}</p>
            <ol className="list-decimal list-inside space-y-1 text-text-secondary text-sm">
              <li>{t.install_android_step1}</li>
              <li>{t.install_android_step2}</li>
              <li>{t.install_android_step3}</li>
              <li>{t.install_android_step4}</li>
            </ol>
          </div>

          <div className="bg-background rounded-2xl p-4">
            <p className="font-semibold mb-2">{t.install_ios_title}</p>
            <ol className="list-decimal list-inside space-y-1 text-text-secondary text-sm">
              <li>{t.install_ios_step1}</li>
              <li>{t.install_ios_step2}</li>
              <li>{t.install_ios_step3}</li>
              <li>{t.install_ios_step4}</li>
            </ol>
          </div>

          <p className="text-xs text-text-tertiary text-center">
            {t.install_offline_note}
          </p>
        </div>
      </BottomSheet>

      {/* V7: Clear All Data Sheet — strong confirmation (type 'حذف') */}
      <BottomSheet open={clearDataSheetOpen} onClose={() => { setClearDataSheetOpen(false); setClearConfirmText('') }} title={t.factory_reset}>
        <div className="space-y-5 pb-4">
          <div className="bg-expense-50 border border-expense-200 rounded-2xl p-4 flex items-start gap-3">
            <Icon name="trash" className="w-6 h-6 text-expense-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-expense-700">{t.factory_reset_warning}</p>
              <p className="text-xs text-expense-600 mt-1">{t.factory_reset_warning_desc}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2">
              {t.factory_reset_type_label} <span className="num font-bold text-expense-600">حذف</span>
            </label>
            <input
              type="text"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder={t.factory_reset_placeholder}
              className="input-field text-center text-lg font-bold"
              dir="rtl"
              autoFocus
            />
            <p className="text-xs text-text-tertiary mt-2">{t.factory_reset_type_hint}</p>
          </div>

          <button
            type="button"
            onClick={handleClearDataConfirm}
            disabled={clearConfirmText.trim() !== 'حذف'}
            className="w-full bg-expense-500 text-white font-bold rounded-2xl py-4 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Icon name="trash" className="w-5 h-5" />
            {t.factory_reset_confirm}
          </button>
        </div>
      </BottomSheet>

      {/* V2: Branding Sheet (Logo + Business Name) */}
      <BottomSheet open={brandingSheetOpen} onClose={() => setBrandingSheetOpen(false)} title="شعار واسم النشاط">
        <div className="space-y-5 pb-4">
          {/* Logo upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-3xl bg-primary-50 flex items-center justify-center border-2 border-dashed border-primary overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="شعار" className="w-full h-full object-cover" />
              ) : (
                <Icon name="user" className="w-10 h-10 text-primary" strokeWidth={1.5} />
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-primary-600 font-semibold bg-primary-50 px-4 py-2 rounded-lg active:scale-95 transition-transform"
              >
                {logoPreview ? 'تغيير الشعار' : 'رفع شعار'}
              </button>
              {logoPreview && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-sm text-expense-600 font-semibold bg-expense-50 px-4 py-2 rounded-lg active:scale-95 transition-transform"
                >
                  إزالة
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <p className="text-xs text-text-tertiary text-center">يتم تصغير الصورة تلقائياً إلى 128×128 بكسل</p>
          </div>

          {/* Business name */}
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2">اسم النشاط</label>
            <input
              type="text"
              value={businessNameInput}
              onChange={(e) => setBusinessNameInput(e.target.value)}
              placeholder="مثال: محل الأمل"
              className="input-field"
              dir="rtl"
            />
            <p className="text-xs text-text-tertiary mt-1">سيظهر في الصفحة الرئيسية بدلاً من 'أهلاً بك'</p>
          </div>

          <button
            type="button"
            onClick={handleSaveBranding}
            className="w-full btn-primary"
          >
            حفظ
          </button>
        </div>
      </BottomSheet>

      {/* V4 Phase 2: Helper Mode PIN Setup Sheet */}
      <BottomSheet open={helperPinSheetOpen} onClose={() => setHelperPinSheetOpen(false)} title={t.helper_mode}>
        <div className="space-y-5 pb-4">
          <div className="bg-withdrawal-50 rounded-xl p-3 flex items-start gap-2">
            <Icon name="info" className="w-5 h-5 text-withdrawal-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-withdrawal-700 font-semibold">{t.helper_mode}</p>
              <p className="text-xs text-withdrawal-600 mt-1">
                {t.helper_mode_desc}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2">{t.helper_mode_pin_label}</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={4}
              value={helperPinInput}
              onChange={(e) => setHelperPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className="input-field text-center text-3xl font-bold tracking-[1em]"
              dir="ltr"
            />
          </div>

          {helperPinInput.length === 4 && (
            <button
              type="button"
              onClick={handleHelperPinSave}
              className="w-full btn-primary"
            >
              {t.helper_mode_activate}
            </button>
          )}

          {helperModeEnabled && (
            <div className="bg-income-50 rounded-xl p-3 text-center">
              <p className="text-sm text-income-700 font-semibold">{t.helper_mode_active}</p>
              <p className="text-xs text-income-600 mt-1">{t.helper_mode_active_desc}</p>
            </div>
          )}
        </div>
      </BottomSheet>
      {/* Business Model Sheet (V11) */}
      <BottomSheet
        open={businessModelSheetOpen}
        onClose={() => setBusinessModelSheetOpen(false)}
        title="نوع النشاط"
      >
        <div className="space-y-3 pb-4">
          <p className="text-sm text-ink-secondary">اختر نوع نشاطك التجاري:</p>
          <button
            type="button"
            onClick={async () => {
              hapticLight()
              await db.setMeta('business_model', 'ready')
              setBusinessModelLabel('منتجات جاهزة')
              setBusinessModelSheetOpen(false)
            }}
            className={`w-full bg-surface rounded-card p-4 shadow-card active:scale-95 transition-transform text-right flex items-center gap-3 border-2 ${businessModelLabel === 'منتجات جاهزة' ? 'border-primary' : 'border-transparent'}`}
          >
            <div className="w-12 h-12 rounded-card bg-primary-50 grid place-items-center flex-shrink-0">
              <Icon name="tag" className="w-6 h-6 text-primary-600" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink text-sm">منتجات جاهزة</p>
              <p className="text-caption text-ink-secondary">علبة تونة، قارورة ماء</p>
            </div>
          </button>
          <button
            type="button"
            onClick={async () => {
              hapticLight()
              await db.setMeta('business_model', 'manufactured')
              setBusinessModelLabel('منتجات أُصنِعَت')
              setBusinessModelSheetOpen(false)
            }}
            className={`w-full bg-surface rounded-card p-4 shadow-card active:scale-95 transition-transform text-right flex items-center gap-3 border-2 ${businessModelLabel === 'منتجات أُصنِعَت' ? 'border-primary' : 'border-transparent'}`}
          >
            <div className="w-12 h-12 rounded-card bg-accent-50 grid place-items-center flex-shrink-0">
              <Icon name="trendingUp" className="w-6 h-6 text-accent-600" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink text-sm">منتجات أُصنِعَت</p>
              <p className="text-caption text-ink-secondary">كوب شاي، ساندويش</p>
            </div>
          </button>
        </div>
      </BottomSheet>

      {/* Emergency Recovery Sheet */}
      <BottomSheet
        open={emergencySheetOpen}
        onClose={() => setEmergencySheetOpen(false)}
        title="استرجاع نسخة محذوفة"
      >
        <div className="space-y-5 pb-4">
          <div className="bg-expense-50 border border-expense-200 rounded-card p-4 flex items-start gap-3">
            <Icon name="info" className="w-6 h-6 text-expense-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-expense-700">تحذير: استرجاع بيانات محذوفة</p>
              <p className="text-caption text-expense-600 mt-1">
                سيتم استبدال جميع بياناتك الحالية بالنسخة الاحتياطية الطارئة المحفوظة على Google Drive.
                هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEmergencyRestore}
            disabled={emergencyRestoreLoading}
            className="w-full bg-expense-500 text-white font-bold rounded-12 py-4 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {emergencyRestoreLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Icon name="download" className="w-5 h-5" />
                استرجاع البيانات
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setEmergencySheetOpen(false)}
            className="w-full btn-outline"
          >
            إلغاء
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

function SettingsRow({ icon, iconBg, label, description, onClick, trailing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 active:bg-background transition-colors text-right"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon name={icon} className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-text-primary text-sm">{label}</p>
        {description && <p className="text-xs text-text-tertiary mt-0.5">{description}</p>}
      </div>
      {trailing || <Icon name="chevronLeft" className="w-5 h-5 text-text-tertiary" />}
    </button>
  )
}

function SettingsToggle({ icon, iconBg, label, description, checked, onChange }) {
  return (
    <div className="w-full flex items-center gap-3 p-4 text-right">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon name={icon} className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-text-primary text-sm">{label}</p>
        {description && <p className="text-xs text-text-tertiary mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-primary' : 'bg-disabled'
        }`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      >
        {/* In RTL: knob starts on the right (off) and slides to the left (on) */}
        <span
          className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
            checked ? 'left-1' : 'right-1'
          }`}
        />
      </button>
    </div>
  )
}
