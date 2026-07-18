import { useState, useEffect, useRef } from 'react'
import { db } from '../db'
import { useSettings } from '../hooks/useDatabase.js'
import Icon from '../components/ui/Icon.jsx'
import BottomSheet from '../components/ui/BottomSheet.jsx'
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/haptics.js'
import { getWhatsAppTemplate, setWhatsAppTemplate, WHATSAPP_PLACEHOLDERS } from '../utils/whatsapp.js'
import { exportBackup, importBackup, checkBackupReminder, markBackupDone } from '../utils/backup.js'
import { requestNotificationPermission, sendTestNotification } from '../utils/notifications.js'
import { useHelperMode } from '../context/HelperModeContext.jsx'
import { useTerms, useTermsMode } from '../context/TermsContext.jsx'

export default function SettingsPage() {
  const { settings, update, refresh } = useSettings()
  const t = useTerms()
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateText, setTemplateText] = useState('')
  const [installOpen, setInstallOpen] = useState(false)
  const [backupReminder, setBackupReminder] = useState(null)

  // V2: Theme & Branding state
  const [brandingSheetOpen, setBrandingSheetOpen] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const [businessNameInput, setBusinessNameInput] = useState('')
  const fileInputRef = useRef(null)

  // V4 Phase 2: Quick POS, Helper Mode, Closing Time
  const [showQuickPosSetting, setShowQuickPosSetting] = useState(true)
  const [helperPinSheetOpen, setHelperPinSheetOpen] = useState(false)
  const [helperPinInput, setHelperPinInput] = useState('')
  const [closingTime, setClosingTime] = useState('20:00')
  const { isHelperMode, enterHelperMode, helperModeEnabled } = useHelperMode()

  // V4 Phase 3: Report Mode (uses TermsContext for live switching)
  const [reportMode, setReportModeCtx] = useTermsMode()

  useEffect(() => {
    getWhatsAppTemplate().then(setTemplateText)
  }, [])

  useEffect(() => {
    checkBackupReminder().then(setBackupReminder)
  }, [])

  // V2: Load branding on mount
  useEffect(() => {
    db.getLogo().then(setLogoPreview)
    db.getBusinessName().then(name => setBusinessNameInput(name || ''))
    // V4 Phase 2: Load Quick POS + closing time settings
    db.getShowQuickPos().then(setShowQuickPosSetting)
    db.getClosingTime().then(setClosingTime)
  }, [])

  // V4 Phase 2: Toggle Quick POS visibility
  const handleQuickPosToggle = async (enabled) => {
    hapticLight()
    setShowQuickPosSetting(enabled)
    await db.setShowQuickPos(enabled)
  }

  // V4 Phase 2: Helper Mode PIN setup
  const handleHelperPinSave = async () => {
    if (helperPinInput.length !== 4) return
    hapticSuccess()
    await db.setHelperPin(helperPinInput)
    setHelperPinSheetOpen(false)
    setHelperPinInput('')
    alert('تم تفعيل وضع المساعد. سيُفعّل عند إغلاق التطبيق وإعادة فتحه.')
  }

  // V4 Phase 2: Enter Helper Mode immediately
  const handleEnterHelperMode = () => {
    hapticMedium()
    enterHelperMode()
  }

  // V4 Phase 2: Save closing time
  const handleClosingTimeChange = async (e) => {
    hapticLight()
    const val = e.target.value
    setClosingTime(val)
    await db.setSetting('closing_time', val)
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

  const handleRestore = async () => {
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
  }

  const handleSaveTemplate = async () => {
    hapticSuccess()
    await setWhatsAppTemplate(templateText)
    setTemplateOpen(false)
  }

  const insertPlaceholder = (token) => {
    hapticLight()
    setTemplateText((prev) => prev + ' ' + token)
  }

  // V2: Logo & branding handlers
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
    if (logoPreview) {
      await db.setLogo(logoPreview)
    } else {
      await db.setSetting('logo_base64', null)
    }
    await db.setBusinessName(businessNameInput.trim())
    setBrandingSheetOpen(false)
    // Reload to reflect changes in header
    window.location.reload()
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="px-5 pt-8 pb-3 safe-area-top">
        <h1 className="text-[30px] font-extrabold text-ink -tracking-[.5px]">{t.settings_title}</h1>
      </header>

      <div className="px-5 space-y-4">
        {/* Backup Reminder */}
        {backupReminder && (
          <div className="bg-withdrawal-50 border border-withdrawal-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
            <Icon name="bell" className="w-5 h-5 text-withdrawal-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-withdrawal-700">{t.backup_reminder_title}</p>
              <p className="text-xs text-withdrawal-600 mt-1">{backupReminder.message}</p>
              <button
                onClick={handleBackup}
                className="mt-2 bg-withdrawal-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
              >
                {t.backup}
              </button>
            </div>
          </div>
        )}

        {/* Data Management */}
        <section>
          <h2 className="text-[12px] font-bold text-primary mb-2 px-1.5">{t.data_management}</h2>
          <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
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
          </div>
        </section>

        {/* WhatsApp */}
        <section>
          <h2 className="text-[12px] font-bold text-primary mb-2 px-1.5">{t.whatsapp_section}</h2>
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

        {/* V4 Phase 3: Report Display Mode */}
        <section>
          <h2 className="text-[12px] font-bold text-primary mb-2 px-1.5">{t.report_display}</h2>
          <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
            <div className="w-full p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary-50 text-primary-600">
                  <Icon name="document" className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-text-primary text-sm">{t.report_display}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{t.report_mode_desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => { hapticLight(); await setReportModeCtx('simple') }}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    reportMode === 'simple' ? 'bg-primary text-white' : 'bg-background text-text-secondary border border-divider'
                  }`}
                >
                  {t.report_mode_simple}
                </button>
                <button
                  type="button"
                  onClick={async () => { hapticLight(); await setReportModeCtx('pro') }}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    reportMode === 'pro' ? 'bg-primary text-white' : 'bg-background text-text-secondary border border-divider'
                  }`}
                >
                  {t.report_mode_pro}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* V2: Appearance (Theme + Branding) */}
        <section>
          <h2 className="text-[12px] font-bold text-primary mb-2 px-1.5">{t.appearance}</h2>
          <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
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
          <h2 className="text-[12px] font-bold text-primary mb-2 px-1.5">{t.operations_security}</h2>
          <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
            {/* Quick POS Toggle */}
            <SettingsToggle
              icon="tag"
              iconBg="bg-primary-50 text-primary-600"
              label={t.show_quick_pos}
              description={t.show_quick_pos_desc}
              checked={showQuickPosSetting}
              onChange={handleQuickPosToggle}
            />
            {/* Helper Mode PIN */}
            <SettingsRow
              icon="lock"
              iconBg="bg-withdrawal-50 text-withdrawal-600"
              label={t.helper_mode}
              description={t.helper_mode_desc}
              onClick={() => { hapticLight(); setHelperPinSheetOpen(true) }}
            />
            {helperModeEnabled && (
              <SettingsRow
                icon="info"
                iconBg="bg-income-50 text-income-600"
                label={t.enter_helper_mode}
                description={t.enter_helper_mode_desc}
                onClick={handleEnterHelperMode}
              />
            )}
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
                className="bg-background rounded-xl px-3 py-2 text-sm outline-none border border-divider"
                dir="ltr"
              />
            </div>
          </div>
        </section>

        {/* App Info */}
        <section>
          <h2 className="text-[12px] font-bold text-primary mb-2 px-1.5">{t.app_section}</h2>
          <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
            <SettingsRow
              icon="bell"
              iconBg="bg-withdrawal-50 text-withdrawal-600"
              label={t.notifications}
              description={t.notifications_desc}
              onClick={async () => {
                hapticMedium()
                const granted = await requestNotificationPermission()
                if (granted) {
                  await update('notifications_enabled', true)
                  hapticSuccess()
                  await sendTestNotification()
                }
              }}
            />
            <SettingsRow
              icon="install"
              iconBg="bg-primary-50 text-primary-600"
              label={t.install_instructions}
              description={t.install_desc}
              onClick={() => setInstallOpen(true)}
            />
            <SettingsRow
              icon="info"
              iconBg="bg-gray-100 text-text-secondary"
              label={t.about_app}
              description="v1.0.0"
              onClick={() => alert('الحسابات - إصدار 1.0.0\nتطبيق محاسبة وإدارة الطلبات للشركات الصغيرة')}
            />
            <SettingsRow
              icon="trash"
              iconBg="bg-expense-50 text-expense-600"
              label={t.factory_reset}
              description={t.factory_reset_desc}
              onClick={async () => {
                hapticMedium()
                const confirmed = confirm('سيتم حذف جميع البيانات نهائياً (المعاملات، الطلبات، الإعدادات). هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟')
                if (!confirmed) return
                const confirmed2 = confirm('تأكيد أخير: سيتم مسح كل شيء. متابعة؟')
                if (!confirmed2) return
                await db.clearAllData()
                hapticSuccess()
                // Reload app to trigger onboarding
                window.location.href = '/'
              }}
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
            className="w-full btn-primary"
          >
            حفظ القالب
          </button>
        </div>
      </BottomSheet>

      {/* Install Instructions */}
      <BottomSheet open={installOpen} onClose={() => setInstallOpen(false)} title="كيفية تثبيت التطبيق">
        <div className="space-y-4 pb-4 text-sm leading-relaxed text-text-primary">
          <div className="bg-background rounded-2xl p-4">
            <p className="font-semibold mb-2">على Android (Chrome):</p>
            <ol className="list-decimal list-inside space-y-1 text-text-secondary">
              <li>افتح قائمة المتصفح (⋮) في الأعلى</li>
              <li>اختر "إضافة إلى الشاشة الرئيسية"</li>
              <li>اضغط "تثبيت"</li>
              <li>سيظهر التطبيق كأيقونة على هاتفك</li>
            </ol>
          </div>

          <div className="bg-background rounded-2xl p-4">
            <p className="font-semibold mb-2">على iPhone (Safari):</p>
            <ol className="list-decimal list-inside space-y-1 text-text-secondary">
              <li>اضغط زر المشاركة (□↑) في الأسفل</li>
              <li>اختر "إضافة إلى الشاشة الرئيسية"</li>
              <li>اضغط "إضافة"</li>
              <li>سيظهر التطبيق كأيقونة على هاتفك</li>
            </ol>
          </div>

          <p className="text-xs text-text-tertiary text-center">
            بعد التثبيت، يعمل التطبيق بدون إنترنت تماماً مثل التطبيقات الأصلية
          </p>
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
      <BottomSheet open={helperPinSheetOpen} onClose={() => setHelperPinSheetOpen(false)} title="تفعيل وضع المساعد">
        <div className="space-y-5 pb-4">
          <div className="bg-withdrawal-50 rounded-xl p-3 flex items-start gap-2">
            <Icon name="info" className="w-5 h-5 text-withdrawal-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-withdrawal-700 font-semibold">وضع المساعد</p>
              <p className="text-xs text-withdrawal-600 mt-1">
                عند تفعيله، يظهر التطبيق للموظفين بواجهة مبسطة (بيع وطلبات فقط) بدون إظهار الأرباح أو الديون أو التقارير.
                للخروج من الوضع، يجب إدخال رمز PIN.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2">أدخل رمز PIN (4 أرقام)</label>
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
              تفعيل وضع المساعد
            </button>
          )}

          {helperModeEnabled && (
            <div className="bg-income-50 rounded-xl p-3 text-center">
              <p className="text-sm text-income-700 font-semibold">وضع المساعد مُفعّل</p>
              <p className="text-xs text-income-600 mt-1">للدخول للوضع الآن، اضغط "الدخول لوضع المساعد الآن" بالأعلى</p>
            </div>
          )}
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
          checked ? 'bg-primary' : 'bg-gray-200'
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
