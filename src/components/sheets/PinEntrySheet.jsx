import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet.jsx'
import Icon from '../ui/Icon.jsx'
import { hapticLight, hapticError } from '../../utils/haptics.js'

/**
 * PIN Entry Sheet - used to exit Helper Mode.
 * User enters a 4-digit PIN. If correct, helper mode is disabled.
 */
export default function PinEntrySheet({ open, onClose, onVerify }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const handleDigit = (digit) => {
    hapticLight()
    if (pin.length < 4) {
      const newPin = pin + digit
      setPin(newPin)
      setError(false)
      if (newPin.length === 4) {
        // Auto-verify when 4 digits entered
        setTimeout(async () => {
          const correct = await onVerify(newPin)
          if (!correct) {
            setError(true)
            setPin('')
          }
        }, 200)
      }
    }
  }

  const handleDelete = () => {
    hapticLight()
    setPin(pin.slice(0, -1))
    setError(false)
  }

  const handleClose = () => {
    setPin('')
    setError(false)
    onClose?.()
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="إدخال الرمز السري">
      <div className="space-y-6 pb-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
            <Icon name="lock" className="w-6 h-6 text-primary-600" strokeWidth={2} />
          </div>
        </div>

        <p className="text-center text-sm text-text-secondary">
          أدخل الرمز السري للخروج من وضع المساعد
        </p>

        {/* PIN Dots */}
        <div className="flex justify-center gap-3">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-colors ${
                error ? 'bg-expense-500' : pin.length > i ? 'bg-primary' : '#E4EAEE'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-expense-600 font-semibold">
            رمز خاطئ، حاول مرة أخرى
          </p>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(String(digit))}
              className="aspect-square rounded-16 bg-background text-xl font-bold text-text-primary active:scale-95 transition-transform"
            >
              {digit}
            </button>
          ))}
          <div /> {/* Empty cell */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="aspect-square rounded-16 bg-background text-xl font-bold text-text-primary active:scale-95 transition-transform"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="aspect-square rounded-16 bg-background flex items-center justify-center active:scale-95 transition-transform"
            aria-label="حذف"
          >
            <Icon name="close" className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
