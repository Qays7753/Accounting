import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { hapticSuccess, hapticLight } from '../../utils/haptics.js'

/**
 * Snackbar - "Undo" notification (lasts 5 seconds)
 * Used for delete confirmations instead of "Are you sure?" dialogs.
 */
export default function Snackbar({ open, message, actionLabel, onAction, duration = 5000, onClose }) {
  const [show, setShow] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (open) {
      setShow(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setShow(false)
        setTimeout(() => onClose?.(), 250)
      }, duration)
    } else {
      setShow(false)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [open, duration, onClose])

  if (!open && !show) return null

  const handleAction = () => {
    hapticSuccess()
    if (timerRef.current) clearTimeout(timerRef.current)
    setShow(false)
    setTimeout(() => {
      onAction?.()
      onClose?.()
    }, 250)
  }

  return createPortal(
    <div className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 pointer-events-none">
      <div
        className={`pointer-events-auto bg-text-primary text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 max-w-sm w-full transition-all duration-300 ${
          show ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <p className="flex-1 text-sm font-medium">{message}</p>
        {actionLabel && (
          <button
            onClick={handleAction}
            onTouchStart={hapticLight}
            className="text-primary-200 font-bold text-sm whitespace-nowrap active:scale-95 transition-transform"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}
