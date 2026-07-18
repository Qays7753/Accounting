import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../db'
import { terms_simple } from '../utils/terms_simple.js'
import { terms_pro } from '../utils/terms_pro.js'

/**
 * Terms Context — Tri-Mode Architecture (V10)
 *
 * Three modes:
 * - 'simple'   → Daily mode: street language (Jordanian business slang)
 * - 'pro'      → Manager mode: formal accounting terminology
 * - 'investor' → Investor mode: formal terms + executive dashboard layout
 *                (hides BottomNav, FAB, Quick POS; shows InvestorDashboard)
 *
 * The investor mode uses pro terms (formal accounting) but also triggers
 * a contextual layout shift via the `mode` value that AppLayout reads.
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

  const setMode = useCallback(async (nextMode) => {
    const m = nextMode || 'simple'
    setModeState(m)
    try {
      await db.setSetting('report_mode', m)
    } catch (e) {
      console.error('Failed to persist report mode:', e)
    }
  }, [])

  // Investor mode uses pro terms (formal accounting language)
  const terms = (mode === 'pro' || mode === 'investor') ? terms_pro : terms_simple

  // Helper: is the app in investor layout mode?
  const isInvestorMode = mode === 'investor'

  return (
    <TermsContext.Provider value={{ terms, mode, setMode, isInvestorMode }}>
      {children}
    </TermsContext.Provider>
  )
}

export function useTerms() {
  const ctx = useContext(TermsContext)
  return ctx.terms
}

export function useTermsMode() {
  const ctx = useContext(TermsContext)
  return [ctx.mode, ctx.setMode]
}

export function useIsInvestorMode() {
  const ctx = useContext(TermsContext)
  return ctx.isInvestorMode
}
