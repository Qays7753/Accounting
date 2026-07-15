import { createContext, useContext, useState, useEffect } from 'react'
import { db } from '../db'
import { hapticSuccess, hapticError } from '../utils/haptics.js'

/**
 * Helper Mode Context (V4 Phase 2 - Security & Staff Access)
 *
 * When Helper Mode is active:
 * - Staff can only see Quick POS and simplified Order entry
 * - Dashboard financials, Debts, Reports, and Settings are HIDDEN
 * - Staff can only ADD sales/orders (no delete, no edit)
 * - To exit Helper Mode, staff must enter the 4-digit PIN
 *
 * The PIN is set in Settings. When enabled, the app enters helper mode
 * on next launch (stored in sessionStorage so it resets on app close).
 */

const HelperModeContext = createContext({
  isHelperMode: false,
  helperModeEnabled: false, // PIN is set in settings
  enterHelperMode: () => {},
  exitHelperMode: () => {},
  verifyPin: async () => false,
})

export function HelperModeProvider({ children }) {
  // helperModeEnabled = PIN is configured (feature available)
  const [helperModeEnabled, setHelperModeEnabled] = useState(false)
  // isHelperMode = currently in helper mode (active restriction)
  const [isHelperMode, setIsHelperMode] = useState(() => {
    // Check sessionStorage on init (resets when app closes)
    try {
      return sessionStorage.getItem('helper_mode_active') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    // Check if helper mode PIN is configured
    db.isHelperModeEnabled().then(setHelperModeEnabled)
  }, [])

  const enterHelperMode = () => {
    hapticSuccess()
    setIsHelperMode(true)
    try {
      sessionStorage.setItem('helper_mode_active', 'true')
    } catch {
      // sessionStorage might be unavailable
    }
  }

  const exitHelperMode = () => {
    hapticSuccess()
    setIsHelperMode(false)
    try {
      sessionStorage.removeItem('helper_mode_active')
    } catch {
      // ignore
    }
  }

  /**
   * Verify the PIN and exit helper mode if correct.
   * @param {string} pin - 4-digit PIN entered by user
   * @returns {boolean} - true if PIN is correct
   */
  const verifyPin = async (pin) => {
    const storedPin = await db.getHelperPin()
    if (storedPin && pin === storedPin) {
      exitHelperMode()
      return true
    }
    hapticError()
    return false
  }

  return (
    <HelperModeContext.Provider value={{
      isHelperMode,
      helperModeEnabled,
      enterHelperMode,
      exitHelperMode,
      verifyPin,
    }}>
      {children}
    </HelperModeContext.Provider>
  )
}

export function useHelperMode() {
  return useContext(HelperModeContext)
}
