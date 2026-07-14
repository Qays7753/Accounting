import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { hapticMedium } from '../../utils/haptics.js'
import Icon from './Icon.jsx'

/**
 * Bottom Sheet - One UI style modal sliding from bottom
 * Used for forms and quick actions instead of page redirects.
 */
export default function BottomSheet({ open, onClose, title, children, maxHeight = '85vh' }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (open) {
      setShow(true)
      document.body.style.overflow = 'hidden'
    } else {
      const t = setTimeout(() => setShow(false), 250)
      document.body.style.overflow = ''
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && open) onClose?.()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!show && !open) return null

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => {
          hapticMedium()
          onClose?.()
        }}
      />

      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 bg-surface rounded-t-3xl shadow-sheet z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-5 py-3 flex items-center justify-between border-b border-divider">
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
            <button
              onClick={() => {
                hapticMedium()
                onClose?.()
              }}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="إغلاق"
            >
              <Icon name="close" className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 hide-scrollbar">
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
