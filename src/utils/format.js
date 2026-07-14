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
export function parseNumber(str) {
  if (!str) return 0
  // Remove all non-numeric chars except dot
  const cleaned = String(str).replace(/[^\d.]/g, '')
  const num = Number(cleaned)
  return isNaN(num) ? 0 : num
}

// Live formatting for inputs: user types 1500 -> shows 1,500
export function formatLiveInput(value) {
  if (!value) return ''
  // Remove existing commas
  const cleaned = String(value).replace(/,/g, '')
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
