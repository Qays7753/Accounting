import { useState, useEffect } from 'react'
import { hapticLight } from '../../utils/haptics.js'
import { parseNumber, formatLiveInput } from '../../utils/format.js'

/**
 * Amount Input with live formatting while typing.
 * - inputmode="decimal" for mobile numeric keyboard
 * - Formats 1500 -> 1,500 instantly while typing
 * - Syncs with parent `value` prop when it changes externally (e.g., form reset)
 */
export default function AmountInput({ value, onChange, placeholder = '0', autoFocus = false, label }) {
  const [displayValue, setDisplayValue] = useState(value ? formatLiveInput(String(value)) : '')

  // Sync display when the parent value changes externally (e.g., reset to 0)
  useEffect(() => {
    const expectedDisplay = value ? formatLiveInput(String(value)) : ''
    // Only update if the parsed numeric value differs from current display
    // This prevents cursor jumping while typing
    if (parseNumber(displayValue) !== value) {
      setDisplayValue(expectedDisplay)
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    hapticLight()
    const raw = e.target.value
    const formatted = formatLiveInput(raw)
    setDisplayValue(formatted)
    const numeric = parseNumber(formatted)
    onChange?.(numeric)
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-text-secondary mb-2">{label}</label>
      )}
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="input-field text-2xl font-bold text-center tabular-nums"
          dir="ltr"
          aria-label={label || 'المبلغ'}
        />
      </div>
    </div>
  )
}
