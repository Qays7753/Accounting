import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../db'

/**
 * SettingsContext — Live UI settings that propagate to all pages instantly.
 *
 * The following settings are kept in React state (synced to Dexie) so that
 * toggling them in SettingsPage immediately re-renders every consumer
 * (HomePage header logo/name, BottomNav POS tab, font-size class on <html>,
 * list density classes, hide-amounts mask, monthly summary card, etc.)
 * WITHOUT requiring a page reload.
 *
 * Persisted keys (Dexie 'settings' table):
 *   show_quick_pos      boolean (default true)
 *   logo_base64         string | null
 *   business_name       string | null
 *   font_size           'normal' | 'large'
 *   list_density        'comfortable' | 'compact'
 *   hide_amounts        boolean
 *   auto_lock           'off' | '30s' | '1m' | '5m'
 *   monthly_summary     boolean
 *   notifications_enabled boolean
 *
 * Each setter updates local state first (instant UI) then writes to Dexie.
 */

const SettingsContext = createContext({
  showQuickPos: true,
  logo: null,
  businessName: null,
  fontSize: 'normal',
  listDensity: 'comfortable',
  hideAmounts: false,
  autoLock: 'off',
  monthlySummary: true,
  notificationsEnabled: false,
  setShowQuickPos: async () => {},
  setLogo: async () => {},
  setBusinessName: async () => {},
  setFontSize: async () => {},
  setListDensity: async () => {},
  setHideAmounts: async () => {},
  setAutoLock: async () => {},
  setMonthlySummary: async () => {},
  setNotificationsEnabled: async () => {},
})

export function SettingsProvider({ children }) {
  const [showQuickPos, setShowQuickPosState] = useState(true)
  const [logo, setLogoState] = useState(null)
  const [businessName, setBusinessNameState] = useState(null)
  const [fontSize, setFontSizeState] = useState('normal')
  const [listDensity, setListDensityState] = useState('comfortable')
  const [hideAmounts, setHideAmountsState] = useState(false)
  const [autoLock, setAutoLockState] = useState('off')
  const [monthlySummary, setMonthlySummaryState] = useState(true)
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false)

  // Load all settings from Dexie on mount
  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      try {
        const [
          pos, logoB64, name, fs, ld, ha, al, ms, ne
        ] = await Promise.all([
          db.getShowQuickPos(),
          db.getLogo(),
          db.getBusinessName(),
          db.getSetting('font_size', 'normal'),
          db.getSetting('list_density', 'comfortable'),
          db.getSetting('hide_amounts', false),
          db.getSetting('auto_lock', 'off'),
          db.getSetting('monthly_summary', true),
          db.getSetting('notifications_enabled', false),
        ])
        if (cancelled) return
        setShowQuickPosState(pos !== false)
        setLogoState(logoB64)
        setBusinessNameState(name)
        setFontSizeState(fs || 'normal')
        setListDensityState(ld || 'comfortable')
        setHideAmountsState(ha === true)
        setAutoLockState(al || 'off')
        setMonthlySummaryState(ms !== false)
        setNotificationsEnabledState(ne === true)
      } catch (e) {
        console.error('SettingsContext load failed:', e)
      }
    }
    loadAll()
    return () => { cancelled = true }
  }, [])

  // Apply font-size + list-density as CSS classes on <html> so they affect
  // the whole app instantly (no page reload).
  useEffect(() => {
    const root = document.documentElement
    if (fontSize === 'large') root.classList.add('font-large')
    else root.classList.remove('font-large')
  }, [fontSize])

  useEffect(() => {
    const root = document.documentElement
    if (listDensity === 'compact') root.classList.add('density-compact')
    else root.classList.remove('density-compact')
  }, [listDensity])

  // Setters: optimistic local update + Dexie persist
  const setShowQuickPos = useCallback(async (v) => {
    setShowQuickPosState(v)
    try { await db.setShowQuickPos(v) } catch (e) { console.error(e) }
  }, [])

  const setLogo = useCallback(async (base64) => {
    setLogoState(base64)
    try {
      if (base64) await db.setLogo(base64)
      else await db.setSetting('logo_base64', null)
    } catch (e) { console.error(e) }
  }, [])

  const setBusinessName = useCallback(async (name) => {
    setBusinessNameState(name)
    try { await db.setBusinessName(name) } catch (e) { console.error(e) }
  }, [])

  const setFontSize = useCallback(async (v) => {
    setFontSizeState(v)
    try { await db.setSetting('font_size', v) } catch (e) { console.error(e) }
  }, [])

  const setListDensity = useCallback(async (v) => {
    setListDensityState(v)
    try { await db.setSetting('list_density', v) } catch (e) { console.error(e) }
  }, [])

  const setHideAmounts = useCallback(async (v) => {
    setHideAmountsState(v)
    try { await db.setSetting('hide_amounts', v) } catch (e) { console.error(e) }
  }, [])

  const setAutoLock = useCallback(async (v) => {
    setAutoLockState(v)
    try { await db.setSetting('auto_lock', v) } catch (e) { console.error(e) }
  }, [])

  const setMonthlySummary = useCallback(async (v) => {
    setMonthlySummaryState(v)
    try { await db.setSetting('monthly_summary', v) } catch (e) { console.error(e) }
  }, [])

  const setNotificationsEnabled = useCallback(async (v) => {
    setNotificationsEnabledState(v)
    try { await db.setSetting('notifications_enabled', v) } catch (e) { console.error(e) }
  }, [])

  return (
    <SettingsContext.Provider value={{
      showQuickPos, logo, businessName,
      fontSize, listDensity, hideAmounts, autoLock,
      monthlySummary, notificationsEnabled,
      setShowQuickPos, setLogo, setBusinessName,
      setFontSize, setListDensity, setHideAmounts, setAutoLock,
      setMonthlySummary, setNotificationsEnabled,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings2() {
  return useContext(SettingsContext)
}
