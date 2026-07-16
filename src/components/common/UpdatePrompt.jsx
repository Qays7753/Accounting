import { useEffect, useState } from 'react'
import { subscribe, applyUpdate } from '../../utils/pwaUpdate.js'
import Icon from '../ui/Icon.jsx'
import { hapticMedium } from '../../utils/haptics.js'

/**
 * One UI "update available" banner.
 * Sits above the bottom nav; the merchant decides when to update, so a new
 * version never interrupts them mid-task. Tapping "تحديث" applies the new
 * service worker and reloads.
 */
export default function UpdatePrompt() {
  const [show, setShow] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => subscribe(setShow), [])

  if (!show) return null

  const handleUpdate = () => {
    hapticMedium()
    setUpdating(true)
    applyUpdate() // triggers skipWaiting + full page reload
  }

  return (
    <div
      className="fixed inset-x-4 z-40 animate-slide-up"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
      role="status"
    >
      <div className="bg-ink rounded-[20px] shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-[13px] bg-white/15 grid place-items-center flex-none">
          <Icon name="download" className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-[14px] font-bold">تحديث جديد متوفّر</p>
          <p className="text-white/70 text-[12px]">اضغط للتحديث الآن</p>
        </div>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={updating}
          className="press flex-none bg-primary text-white text-[14px] font-bold rounded-pill px-5 py-2 disabled:opacity-70"
        >
          {updating ? '...' : 'تحديث'}
        </button>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="press flex-none w-8 h-8 rounded-full grid place-items-center text-white/60"
          aria-label="لاحقاً"
        >
          <Icon name="close" className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
