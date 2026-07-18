import { createContext, useContext, useState, useEffect, useCallback } from 'react'
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
 * with the new vocabulary instantly. The choice is persisted to Dexie.
 */

const TermsContext = createContext({ terms: terms_simple, mode: 'simple', setMode: () => {} })

export function TermsProvider({ children }) {
  const [mode, setModeState] = useState('simple')

  useEffect(() => {
    let cancelled = false
    async function loadMode() {
      try {
        const m = await db.getSetting('report_mode', 'simple')
        if (!cancelled) setModeState(m || 'simple')
      } catch (e) {
        console.error('Failed to load report mode:', e)
      }
    }
    loadMode()
    return () => { cancelled = true }
  }, [])

  // setMode persists to Dexie AND updates local state in one shot.
  // This means toggling in Settings instantly re-renders the whole app
  // and survives reloads.
  const setMode = useCallback(async (nextMode) => {
    const m = nextMode || 'simple'
    setModeState(m)
    try {
      await db.setSetting('report_mode', m)
    } catch (e) {
      console.error('Failed to persist report mode:', e)
    }
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
 * setMode persists to Dexie; pass 'simple' or 'pro'.
 */
export function useTermsMode() {
  const ctx = useContext(TermsContext)
  return [ctx.mode, ctx.setMode]
}
