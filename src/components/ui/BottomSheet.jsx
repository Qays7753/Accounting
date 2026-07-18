import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { hapticMedium } from '../../utils/haptics.js'
import { useBackDismiss } from '../../hooks/useBackDismiss.js'
import Icon from './Icon.jsx'

/**
 * Draggable & Expandable Bottom Sheet (SOP §7.5)
 * Two snap points: collapsed (~84%) and full-screen (~94%).
 * Drag handle up → expand to full screen; drag down → collapse, then close.
 *
 * A1: Android/PWA back-button closes the sheet via useBackDismiss hook.
 * B6: role="dialog" + aria-modal + focus trap + restore focus on close.
 */
export default function BottomSheet({ open, onClose, title, children, maxHeight = '94vh' }) {
  const [show, setShow] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const sheetRef = useRef(null)
  const handleRef = useRef(null)
  const dragStartY = useRef(0)
  const dragMoved = useRef(0)
  const isDragging = useRef(false)
  const previouslyFocused = useRef(null)
  const sheetContainerRef = useRef(null)

  // A1: Back-button dismisses the sheet (not the page)
  useBackDismiss(open, onClose)

  useEffect(() => {
    if (open) {
      setShow(true)
      setExpanded(false)
      document.body.style.overflow = 'hidden'
      // B6: Save currently focused element to restore on close
      previouslyFocused.current = document.activeElement
    } else {
      const t = setTimeout(() => setShow(false), 300)
      document.body.style.overflow = ''
      // B6: Restore focus to the element that opened the sheet
      if (previouslyFocused.current && previouslyFocused.current.focus) {
        setTimeout(() => previouslyFocused.current?.focus?.(), 100)
      }
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && open) {
        if (expanded) setExpanded(false)
        else onClose?.()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose, expanded])

  // B6: Focus trap — when sheet is open, Tab cycles within the sheet only
  useEffect(() => {
    if (!open) return
    const sheet = sheetContainerRef.current
    if (!sheet) return

    // Focus the sheet container (or first focusable) on open
    setTimeout(() => {
      const firstFocusable = sheet.querySelector('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])')
      firstFocusable?.focus?.()
    }, 100)

    const handleTab = (e) => {
      if (e.key !== 'Tab') return
      const focusables = sheet.querySelectorAll('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])')
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    sheet.addEventListener('keydown', handleTab)
    return () => sheet.removeEventListener('keydown', handleTab)
  }, [open])

  // Drag handlers
  const onPointerDown = (e) => {
    isDragging.current = true
    dragStartY.current = e.clientY
    dragMoved.current = 0
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
    if (handleRef.current) handleRef.current.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (!isDragging.current) return
    const delta = e.clientY - dragStartY.current
    dragMoved.current = delta
    if (sheetRef.current) {
      if (delta < 0 && !expanded) {
        sheetRef.current.style.transform = `translateY(${Math.max(delta, -44)}px)`
      } else if (delta > 0) {
        sheetRef.current.style.transform = `translateY(${delta}px)`
      }
    }
  }

  const onPointerUp = () => {
    if (!isDragging.current) return
    isDragging.current = false
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform .3s cubic-bezier(.16,1,.3,1), height .32s cubic-bezier(.16,1,.3,1)'
      sheetRef.current.style.transform = 'translateY(0)'
    }
    if (dragMoved.current < -50) {
      setExpanded(true)
    } else if (dragMoved.current > 130) {
      if (expanded) {
        setExpanded(false)
      } else {
        onClose?.()
      }
    }
  }

  if (!show && !open) return null

  const sheetHeight = expanded ? '94vh' : 'auto'
  const maxCollapsedHeight = '84vh'

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(31,30,29,0.4)' }}
        onClick={() => { hapticMedium(); onClose?.() }}
      />

      <div
        ref={(el) => { sheetRef.current = el; sheetContainerRef.current = el; }}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'نافذة منبثقة'}
        tabIndex={-1}
        className={`fixed inset-x-0 bottom-0 bg-surface rounded-t-sheet z-50 flex flex-col outline-none ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{
          maxHeight: expanded ? maxHeight : maxCollapsedHeight,
          height: sheetHeight,
          transition: 'transform .34s cubic-bezier(.16,1,.3,1), height .32s cubic-bezier(.16,1,.3,1)',
          boxShadow: '0 6px 20px rgba(60,50,40,.10)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag Handle */}
        <div
          ref={handleRef}
          className="flex-none pt-3 pb-2 cursor-grab select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="w-9 h-[5px] rounded-full mx-auto bg-divider" />
          {!expanded && (
            <div className="text-center text-caption text-placeholder mt-1.5 transition-opacity">
              ↑ اسحب للأعلى للتوسّع
            </div>
          )}
        </div>

        {/* Header */}
        {title && (
          <div className="px-5 py-2 flex items-center justify-between">
            <h2 className="text-title-sm text-ink">{title}</h2>
            <button
              type="button"
              onClick={() => { hapticMedium(); onClose?.() }}
              className="press w-11 h-11 rounded-12 grid place-items-center bg-mute"
              aria-label="إغلاق"
            >
              <Icon name="close" className="w-5 h-5 text-sub" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto scroll px-5 pb-8 hide-scrollbar">
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
