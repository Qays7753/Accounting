import { useEffect, useRef, useState } from 'react'
import { db } from '../../db'

const LOCK_DELAYS = {
  '30s': 30 * 1000,
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
}

export default function AutoLockOverlay({ autoLock = 'off' }) {
  const [locked, setLocked] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const lockedRef = useRef(false)
  const timerRef = useRef(null)

  useEffect(() => {
    lockedRef.current = false
    setLocked(false)
    setPin('')
    setError('')

    const delay = LOCK_DELAYS[autoLock]
    if (!delay) return undefined

    const resetTimer = () => {
      if (lockedRef.current) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        lockedRef.current = true
        setLocked(true)
        setPin('')
        setError('')
      }, delay)
    }

    const events = ['pointerdown', 'keydown', 'touchstart']
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(event => window.removeEventListener(event, resetTimer))
    }
  }, [autoLock])

  if (!locked) return null

  const unlock = async (event) => {
    event.preventDefault()
    const storedPin = await db.getHelperPin()
    if (!storedPin) {
      setError('فعّل رمز PIN أولاً من الإعدادات')
      return
    }
    if (await db.verifyHelperPin(pin)) {
      lockedRef.current = false
      setLocked(false)
      setPin('')
      setError('')
      return
    }
    setError('رمز PIN غير صحيح')
    setPin('')
  }

  return (
    <div className="fixed inset-0 z-[100] bg-primary-950/95 flex items-center justify-center p-6" dir="rtl">
      <form onSubmit={unlock} className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-2xl text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-50 text-primary-700 grid place-items-center text-sm font-bold">PIN</div>
        <h2 className="text-xl font-bold text-text-primary mb-2">التطبيق مقفل</h2>
        <p className="text-sm text-text-secondary mb-5">أدخل رمز PIN للمتابعة</p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={pin}
          onChange={event => { setPin(event.target.value); setError('') }}
          className="input-field text-center tracking-[0.5em] mb-3"
          aria-label="رمز PIN"
        />
        {error && <p className="text-sm text-expense-600 mb-3">{error}</p>}
        <button type="submit" className="w-full bg-primary text-white font-bold rounded-2xl py-3.5">فتح التطبيق</button>
      </form>
    </div>
  )
}
