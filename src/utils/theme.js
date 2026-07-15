import { db } from '../db'

/**
 * Theme utility (V2) - Dynamic primary color via CSS variables.
 *
 * The Tailwind config references `var(--color-primary)` etc., so updating
 * these CSS variables on :root instantly changes the primary color across
 * the entire app without recompiling or re-rendering components.
 *
 * Color shades are generated from a single hex input using HSL manipulation.
 */

const DEFAULT_PRIMARY = '#1F6FE8'

// Preset palette (One UI-inspired)
export const THEME_PRESETS = [
  { name: 'Samsung Blue', hex: '#1F6FE8' },
  { name: 'Warm Orange', hex: '#FF6B35' },
  { name: 'Forest Green', hex: '#2E7D32' },
  { name: 'Royal Purple', hex: '#7B1FA2' },
  { name: 'Teal', hex: '#00897B' },
  { name: 'Crimson', hex: '#C62828' },
  { name: 'Amber', hex: '#F57F17' },
  { name: 'Slate', hex: '#37474F' },
]

/**
 * Convert hex to HSL
 */
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2

  if (max === min) {
    h = s = 0 // achromatic
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return [h * 360, s * 100, l * 100]
}

/**
 * Convert HSL to hex
 */
function hslToHex(h, s, l) {
  h = h / 360
  s = s / 100
  l = l / 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  const toHex = (c) => {
    const hex = Math.round(c * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Generate all 10 shades (50, 100, 200, ..., 900, DEFAULT) from a single hex color.
 * Uses HSL lightness adjustment to create a consistent shade scale.
 */
export function generateShades(hex) {
  const [h, s, l] = hexToHsl(hex)
  const shades = {}

  // Lightness map for each shade (One UI-inspired scale)
  const lightnessMap = {
    50: 96,
    100: 92,
    200: 84,
    300: 74,
    400: 64,
    500: l, // user's chosen color
    600: Math.max(l - 8, 25),
    700: Math.max(l - 16, 20),
    800: Math.max(l - 24, 15),
    900: Math.max(l - 32, 10),
  }

  for (const [shade, lightness] of Object.entries(lightnessMap)) {
    shades[shade] = hslToHex(h, Math.min(s, 80), lightness)
  }

  return shades
}

/**
 * Apply a primary color to the app by setting CSS variables on :root.
 * @param {string} hex - the primary color as a hex string (e.g., '#1F6FE8')
 */
export function applyTheme(hex) {
  const shades = generateShades(hex)
  const root = document.documentElement

  // Set CSS variables for each shade
  root.style.setProperty('--color-primary', shades[500])
  root.style.setProperty('--color-primary-50', shades[50])
  root.style.setProperty('--color-primary-100', shades[100])
  root.style.setProperty('--color-primary-200', shades[200])
  root.style.setProperty('--color-primary-300', shades[300])
  root.style.setProperty('--color-primary-400', shades[400])
  root.style.setProperty('--color-primary-500', shades[500])
  root.style.setProperty('--color-primary-600', shades[600])
  root.style.setProperty('--color-primary-700', shades[700])
  root.style.setProperty('--color-primary-800', shades[800])
  root.style.setProperty('--color-primary-900', shades[900])
}

/**
 * Load the saved theme from Dexie and apply it.
 * Called on app launch.
 */
export async function applyThemeFromDB() {
  const color = await db.getThemeColor()
  if (color && color !== DEFAULT_PRIMARY) {
    applyTheme(color)
  }
}

/**
 * Save a new theme color to Dexie and apply it immediately.
 * @param {string} hex - the primary color
 */
export async function setAndApplyTheme(hex) {
  await db.setThemeColor(hex)
  applyTheme(hex)
}

/**
 * Get the current theme color from Dexie.
 */
export async function getCurrentTheme() {
  return await db.getThemeColor()
}
