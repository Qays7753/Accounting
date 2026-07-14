import { useState, useEffect } from 'react'
import { db } from '../db'
import { useSettings } from '../hooks/useDatabase.js'
import Icon from '../components/ui/Icon.jsx'
import BottomSheet from '../components/ui/BottomSheet.jsx'
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/haptics.js'
import { getWhatsAppTemplate, setWhatsAppTemplate, WHATSAPP_PLACEHOLDERS } from '../utils/whatsapp.js'
import { exportBackup, importBackup, checkBackupReminder, markBackupDone } from '../utils/backup.js'
import { requestNotificationPermission, sendTestNotification } from '../utils/notifications.js'

export default function SettingsPage() {
  const { settings, update, refresh } = useSettings()
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateText, setTemplateText] = useState('')
  const [installOpen, setInstallOpen] = useState(false)
  const [pinToggle, setPinToggle] = useState(false)
  const [backupReminder, setBackupReminder] = useState(null)

  useEffect(() => {
    getWhatsAppTemplate().then(setTemplateText)
  }, [])

  useEffect(() => {
    checkBackupReminder().then(setBackupReminder)
  }, [])

  const handlePinToggle = async (enabled) => {
    hapticLight()
    setPinToggle(enabled)
    await update('pin_enabled', enabled)
    if (enabled) {
      // TODO: Agent 6/7 - implement PIN setup flow
      await update('pin_enabled', false)
      setPinToggle(false)
      alert('سيتم تفعيل قفل التطبيق في الإصدار القادم')
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

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="px-5 pt-12 pb-3 safe-area-top">
        <h1 className="text-2xl font-bold">الإعدادات</h1>
      </header>

      <div className="px-5 space-y-4">
        {/* Backup Reminder */}
        {backupReminder && (
          <div className="bg-withdrawal-50 border border-withdrawal-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
            <Icon name="bell" className="w-5 h-5 text-withdrawal-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-withdrawal-700">تذكير بالنسخ الاحتياطي</p>
              <p className="text-xs text-withdrawal-600 mt-1">{backupReminder.message}</p>
              <button
                onClick={handleBackup}
                className="mt-2 bg-withdrawal-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
              >
                نسخ احتياطي الآن
              </button>
            </div>
          </div>
        )}

        {/* Data Management */}
        <section>
          <h2 className="text-sm font-semibold text-text-secondary mb-2 px-1">إدارة البيانات</h2>
          <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
            <SettingsRow
              icon="download"
              iconBg="bg-primary-50 text-primary-600"
              label="نسخة احتياطية"
              description="تصدير البيانات إلى ملف"
              onClick={handleBackup}
            />
            <SettingsRow
              icon="upload"
              iconBg="bg-income-50 text-income-600"
              label="استعادة من نسخة"
              description="استيراد البيانات من ملف"
              onClick={handleRestore}
            />
          </div>
        </section>

        {/* WhatsApp */}
        <section>
          <h2 className="text-sm font-semibold text-text-secondary mb-2 px-1">واتساب</h2>
          <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
            <SettingsRow
              icon="whatsapp"
              iconBg="bg-income-50 text-income-600"
              label="قالب رسالة الطلب"
              description="تخصيص الرسالة المرسلة للزبائن"
              onClick={() => setTemplateOpen(true)}
            />
          </div>
        </section>

        {/* Security */}
        <section>
          <h2 className="text-sm font-semibold text-text-secondary mb-2 px-1">الأمان</h2>
          <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
            <SettingsToggle
              icon="lock"
              iconBg="bg-expense-50 text-expense-600"
              label="قفل التطبيق برمز PIN"
              description="حماية بياناتك برمز سري"
              checked={pinToggle}
              onChange={handlePinToggle}
            />
          </div>
        </section>

        {/* App Info */}
        <section>
          <h2 className="text-sm font-semibold text-text-secondary mb-2 px-1">التطبيق</h2>
          <div className="bg-surface rounded-2xl shadow-card divide-y divide-divider">
            <SettingsRow
              icon="bell"
              iconBg="bg-withdrawal-50 text-withdrawal-600"
              label="تفعيل تذكيرات الطلبات"
              description="إشعارات قبل موعد الطلبات"
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
              label="كيفية تثبيت التطبيق"
              description="تعليمات الإضافة للشاشة الرئيسية"
              onClick={() => setInstallOpen(true)}
            />
            <SettingsRow
              icon="info"
              iconBg="bg-gray-100 text-text-secondary"
              label="حول التطبيق"
              description="الإصدار 1.0.0"
              onClick={() => alert('الحسابات - إصدار 1.0.0\nتطبيق محاسبة وإدارة الطلبات للشركات الصغيرة')}
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
    </div>
  )
}

function SettingsRow({ icon, iconBg, label, description, onClick }) {
  return (
    <button
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
      <Icon name="chevronLeft" className="w-5 h-5 text-text-tertiary" />
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
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-primary' : 'bg-gray-200'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
            checked ? 'right-1' : 'right-6'
          }`}
        />
      </button>
    </div>
  )
}
