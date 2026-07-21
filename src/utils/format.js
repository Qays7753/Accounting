/**
 * Number formatting utilities
 * - No currency symbols (per requirements)
 * - Format with commas: 1500 -> 1,500
 * - Live formatting while typing
 */

export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return ''
  const num = typeof value === 'number' ? value : Number(value)
  if (isNaN(num)) return ''
  return num.toLocaleString('en-US')
}

export function formatAmount(value) {
  if (value === null || value === undefined || value === '') return '0'
  const num = typeof value === 'number' ? value : Number(value)
  if (isNaN(num)) return '0'
  return num.toLocaleString('en-US')
}

// Parse a formatted string back to number
/**
 * Convert Arabic-Indic (٠-٩) and Extended/Persian (۰-۹) digits — plus the
 * Arabic decimal/thousands separators — to their Western ASCII equivalents.
 * The app accepts Arabic numerals as input but always stores/computes in
 * Western digits.
 */
export function normalizeDigits(str) {
  if (str == null) return ''
  return String(str)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // ٠-٩
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0)) // ۰-۹
    .replace(/٫/g, '.') // Arabic decimal separator ٫
    .replace(/٬/g, '')  // Arabic thousands separator ٬
}

export function parseNumber(str) {
  if (!str) return 0
  // Normalize Arabic numerals first, then keep only digits + dot
  const cleaned = normalizeDigits(str).replace(/[^\d.]/g, '')
  const num = Number(cleaned)
  return isNaN(num) ? 0 : num
}

// Live formatting for inputs: user types 1500 -> shows 1,500
export function formatLiveInput(value) {
  if (!value) return ''
  // Normalize Arabic numerals, then remove existing commas
  const cleaned = normalizeDigits(value).replace(/,/g, '')
  // Split by decimal
  const parts = cleaned.split('.')
  // Format integer part with commas
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

// Format number with decimal places (for display)
export function formatDecimal(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return '0'
  const num = typeof value === 'number' ? value : Number(value)
  if (isNaN(num)) return '0'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

// Compact format for large numbers (1.2K, 3.4M)
export function formatCompact(value) {
  if (value === null || value === undefined) return '0'
  const num = typeof value === 'number' ? value : Number(value)
  if (isNaN(num)) return '0'
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return String(num)
}
