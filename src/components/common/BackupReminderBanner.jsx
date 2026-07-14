import { useState, useEffect } from 'react'
import Icon from '../ui/Icon.jsx'
import { hapticLight } from '../../utils/haptics.js'

/**
 * Backup Reminder Banner - shown on app open if 7+ days since last backup
 * Gentle, dismissible, with "Backup Now" CTA.
 */
export default function BackupReminderBanner({ reminder, onDismiss, onBackupNow }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (reminder) {
      // Slight delay for smooth entrance
      const t = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(t)
    }
  }, [reminder])

  if (!reminder) return null

  const handleDismiss = () => {
    hapticLight()
    setVisible(false)
    setTimeout(onDismiss, 200)
  }

  return (
    <div
      className={`fixed top-0 inset-x-0 z-40 safe-area-top transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="bg-withdrawal-50 border-b border-withdrawal-200 mx-3 mt-2 rounded-2xl p-3 shadow-md flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-withdrawal-100 flex items-center justify-center flex-shrink-0">
          <Icon name="bell" className="w-5 h-5 text-withdrawal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-withdrawal-700">تذكير بالنسخ الاحتياطي</p>
          <p className="text-xs text-withdrawal-600 mt-0.5 leading-relaxed">{reminder.message}</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={onBackupNow}
              className="bg-withdrawal-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
            >
              نسخ احتياطي الآن
            </button>
            <button
              onClick={handleDismiss}
              className="text-withdrawal-600 text-xs font-semibold px-3 py-1.5 active:scale-95 transition-transform"
            >
              لاحقاً
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="w-7 h-7 rounded-full flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
          aria-label="إغلاق"
        >
          <Icon name="close" className="w-4 h-4 text-withdrawal-600" />
        </button>
      </div>
    </div>
  )
}
