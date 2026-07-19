import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../db'
import { terms_simple } from '../utils/terms_simple.js'
import { terms_pro } from '../utils/terms_pro.js'

/**
 * Terms Context — V12 Strict Separation
 *
 * Two ORTHOGONAL settings:
 * - language_mode ('simple' | 'pro'): Controls TERMINOLOGY ONLY.
 *   'simple' = street language, 'pro' = formal accounting.
 *   Does NOT change UI, inputs, or screens.
 *
 * - active_layer (1 | 2 | 3): Controls FEATURES, INPUTS, and SCREENS.
 *   1 = Daily (basic POS, manual inventory, simple reports)
 *   2 = Manager (BOM, auto-deduct, predictive restocking, margin radar)
 *   3 = Investor (executive dashboard, asset/loan inputs, PDF export)
 *
 * A Layer 2 user can use Simple language.
 * A Layer 3 user can use Simple language.
 * These are completely independent.
 *
 * Backward compat: if old 'report_mode' exists in Dexie, migrate it:
 *   'simple'   → language='simple', layer=1
 *   'pro'      → language='pro',   layer=1
 *   'investor' → language='pro',   layer=3
 */

const TermsContext = createContext({
  terms: terms_simple,
  languageMode: 'simple',
  activeLayer: 1,
  setLanguageMode: () => {},
  setActiveLayer: () => {},
  isInvestorMode: false,
  isManagerMode: false,
})

export function TermsProvider({ children }) {
  const [languageMode, setLanguageModeState] = useState('simple')
  const [activeLayer, setActiveLayerState] = useState(1)

  useEffect(() => {
    let cancelled = false
    async function loadSettings() {
      try {
        // Try new keys first
        const [lang, layer] = await Promise.all([
          db.getSetting('language_mode', null),
          db.getSetting('active_layer', null),
        ])

        if (!cancelled) {
          if (lang) {
            setLanguageModeState(lang)
          } else {
            // Migrate from old report_mode
            const oldMode = await db.getSetting('report_mode', 'simple')
            if (oldMode === 'investor') {
              setLanguageModeState('pro')
              setActiveLayerState(3)
              await db.setSetting('language_mode', 'pro')
              await db.setSetting('active_layer', 3)
            } else if (oldMode === 'pro') {
              setLanguageModeState('pro')
              setActiveLayerState(1)
              await db.setSetting('language_mode', 'pro')
              await db.setSetting('active_layer', 1)
            } else {
              setLanguageModeState('simple')
              setActiveLayerState(1)
              await db.setSetting('language_mode', 'simple')
              await db.setSetting('active_layer', 1)
            }
          }
          if (layer) setActiveLayerState(Number(layer))
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
    loadSettings()
    return () => { cancelled = true }
  }, [])

  const setLanguageMode = useCallback(async (mode) => {
    const m = mode || 'simple'
    setLanguageModeState(m)
    try { await db.setSetting('language_mode', m) } catch (e) { console.error(e) }
  }, [])

  const setActiveLayer = useCallback(async (layer) => {
    const l = Number(layer) || 1
    setActiveLayerState(l)
    try { await db.setSetting('active_layer', l) } catch (e) { console.error(e) }
  }, [])

  const terms = languageMode === 'pro' ? terms_pro : terms_simple

  return (
    <TermsContext.Provider value={{
      terms,
      languageMode,
      activeLayer,
      setLanguageMode,
      setActiveLayer,
      isInvestorMode: activeLayer === 3,
      isManagerMode: activeLayer === 2,
    }}>
      {children}
    </TermsContext.Provider>
  )
}

export function useTerms() {
  const ctx = useContext(TermsContext)
  return ctx.terms
}

/** Returns [languageMode, setLanguageMode] — controls terminology only */
export function useLanguageMode() {
  const ctx = useContext(TermsContext)
  return [ctx.languageMode, ctx.setLanguageMode]
}

/** Returns [activeLayer, setActiveLayer] — controls features/screens */
export function useActiveLayer() {
  const ctx = useContext(TermsContext)
  return [ctx.activeLayer, ctx.setActiveLayer]
}

/** @deprecated Use useLanguageMode or useActiveLayer instead */
export function useTermsMode() {
  const ctx = useContext(TermsContext)
  // Backward compat: return [languageMode, setLanguageMode]
  return [ctx.languageMode, ctx.setLanguageMode]
}

export function useIsInvestorMode() {
  const ctx = useContext(TermsContext)
  return ctx.isInvestorMode
}

export function useIsManagerMode() {
  const ctx = useContext(TermsContext)
  return ctx.isManagerMode
}
