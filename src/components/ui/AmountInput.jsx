import { useState } from 'react'
import { hapticLight, hapticSuccess } from '../../utils/haptics.js'
import { parseNumber, formatLiveInput } from '../../utils/format.js'

/**
 * Amount Input with live formatting while typing
 * inputmode="decimal", formats 1500 -> 1,500 instantly
 */
export default function AmountInput({ value, onChange, placeholder = '0', autoFocus = false, label }) {
  const [displayValue, setDisplayValue] = useState(value ? formatLiveInput(String(value)) : '')

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
        />
      </div>
    </div>
  )
}
