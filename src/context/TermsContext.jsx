import { createContext, useContext, useState, useEffect } from 'react'
import { db } from '../db'
import { terms_simple } from '../utils/terms_simple.js'
import { terms_pro } from '../utils/terms_pro.js'

/**
 * Terms Context — Dual-Microcopy Architecture
 * 
 * Provides dynamic UI text based on the user's report_mode setting:
 * - 'simple' → street language (Jordanian business slang)
 * - 'pro'    → formal accounting terminology
 * 
 * All components use `useTerms()` to get the correct terms object.
 * When the user toggles the mode in Settings, the entire app re-renders
 * with the new vocabulary instantly.
 */

const TermsContext = createContext(terms_simple)

export function TermsProvider({ children }) {
  const [mode, setMode] = useState('simple')

  useEffect(() => {
    let cancelled = false
    async function loadMode() {
      try {
        const m = await db.getSetting('report_mode', 'simple')
        if (!cancelled) setMode(m || 'simple')
      } catch (e) {
        console.error('Failed to load report mode:', e)
      }
    }
    loadMode()
    return () => { cancelled = true }
  }, [])

  // Listen for mode changes from Settings (via storage event or manual refresh)
  useEffect(() => {
    const checkMode = async () => {
      try {
        const m = await db.getSetting('report_mode', 'simple')
        setMode(prev => prev !== m ? (m || 'simple') : prev)
      } catch (e) { /* ignore */ }
    }
    // Check on window focus (when returning from settings)
    const onFocus = () => checkMode()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const terms = mode === 'pro' ? terms_pro : terms_simple

  return (
    <TermsContext.Provider value={{ terms, mode, setMode }}>
      {children}
    </TermsContext.Provider>
  )
}

/**
 * useTerms — returns the current terms object based on report_mode.
 * Usage: const t = useTerms(); then <h1>{t.net_profit}</h1>
 */
export function useTerms() {
  const ctx = useContext(TermsContext)
  return ctx.terms
}

/**
 * useTermsMode — returns [mode, setMode] for Settings to toggle.
 */
export function useTermsMode() {
  const ctx = useContext(TermsContext)
  return [ctx.mode, ctx.setMode]
}
