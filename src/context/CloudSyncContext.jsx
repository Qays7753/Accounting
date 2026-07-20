import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react'
import { db } from '../db'
import {
  isAuthorized,
  getValidToken,
  findFile,
  uploadFile,
  downloadFile,
  renameFile,
  deleteFile,
  getLastSync,
  setLastSync as persistLastSync,
  listFiles,
} from '../utils/googleDrive.js'

/**
 * CloudSyncContext — Silent background sync with Google Drive AppData.
 *
 * Strategy:
 * - Debounced upload: 30s after last DB change → export → upload as current.json
 *   (renaming existing current.json → previous.json first)
 * - On app launch: pull current.json → compare timestamps → LWW merge
 * - Offline-first: local DB writes are instant. Sync only when online.
 * - Empty state protection: never upload empty DB over populated cloud
 *
 * Files in Drive AppData:
 *   current.json       — latest sync
 *   previous.json      — fallback copy (one version back)
 *   emergency_backup.json — pre-wipe snapshot (created by clearAllData)
 */

const SYNC_DEBOUNCE_MS = 30000 // 30 seconds
const SYNC_FILE = 'current.json'
const PREV_FILE = 'previous.json'
const EMERGENCY_FILE = 'emergency_backup.json'

const CloudSyncContext = createContext({
  authorized: false,
  syncing: false,
  lastSync: null,
  emergencyBackupExists: false,
  syncNow: async () => {},
  checkEmergencyBackup: async () => {},
  restoreEmergency: async () => {},
})

export function CloudSyncProvider({ children }) {
  const [authorized, setAuthorized] = useState(() => isAuthorized())
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSyncState] = useState(() => getLastSync())
  const [emergencyBackupExists, setEmergencyBackupExists] = useState(false)
  const debounceRef = useRef(null)
  const isSyncingRef = useRef(false)

  // Persist the last-sync timestamp to localStorage AND update UI state.
  // Previously the React state setter shadowed the imported localStorage
  // writer, so the timestamp was never persisted — every launch then thought
  // the cloud was newer and re-pulled (and re-prompted for Google auth).
  const markSynced = useCallback((ts = Date.now()) => {
    persistLastSync(ts)
    setLastSyncState(ts)
  }, [])

  // Check authorization on mount + periodically (token may expire)
  // Also attempt silent refresh when token expires
  useEffect(() => {
    const check = async () => {
      let authed = isAuthorized()
      if (!authed) {
        // Try silent refresh via GIS (no popup)
        const token = await getValidToken()
        authed = !!token
      }
      setAuthorized(authed)
    }
    check()
    // Re-check every 5 minutes (tokens expire after 1 hour)
    const interval = setInterval(check, 5 * 60 * 1000)
    window.addEventListener('storage', check)
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', check)
    }
  }, [])

  /**
   * Upload current DB to Drive as current.json.
   * Renames existing current.json → previous.json first (two-version system).
   * Agent 3: Empty State Protection — blocks if local DB is empty but cloud has data.
   */
  const uploadToCloud = useCallback(async () => {
    if (!navigator.onLine || !isAuthorized()) return
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    setSyncing(true)

    try {
      const token = await getValidToken()
      if (!token) return

      // Empty State Protection (Agent 3)
      const txCount = await db.transactions.count()
      const existing = await findFile(SYNC_FILE)

      if (txCount === 0 && existing) {
        // Local is empty but cloud has data → BLOCK upload, prompt restore
        console.warn('[CloudSync] Blocked upload: local DB is empty but cloud has data. Restore from cloud instead.')
        isSyncingRef.current = false
        setSyncing(false)
        return { blocked: true, reason: 'empty_local' }
      }

      // Export DB
      const data = await db.exportAllData()
      data.syncedAt = new Date().toISOString()
      const content = JSON.stringify(data)

      // Two-version: rename existing current.json → previous.json
      if (existing) {
        // Check if previous.json already exists → delete it first
        const prevFile = await findFile(PREV_FILE)
        if (prevFile) {
          await deleteFile(prevFile.id)
        }
        await renameFile(existing.id, PREV_FILE)
      }

      // Upload new current.json
      await uploadFile(SYNC_FILE, content)
      markSynced()
      console.log('[CloudSync] Upload complete')
      return { blocked: false }
    } catch (e) {
      console.error('[CloudSync] Upload failed:', e)
      return { blocked: false, error: e.message }
    } finally {
      isSyncingRef.current = false
      setSyncing(false)
    }
  }, [markSynced])

  /**
   * Pull current.json from Drive and merge with local DB (LWW).
   */
  const pullFromCloud = useCallback(async () => {
    if (!navigator.onLine || !isAuthorized()) return
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    setSyncing(true)

    try {
      const token = await getValidToken()
      if (!token) return

      const cloudFile = await findFile(SYNC_FILE)
      if (!cloudFile) {
        console.log('[CloudSync] No cloud file found — skipping pull')
        return
      }

      const content = await downloadFile(cloudFile.id)
      const cloudData = JSON.parse(content)

      // Compare timestamps: use data.exportedAt or data.syncedAt
      const cloudTs = new Date(cloudData.syncedAt || cloudData.exportedAt || 0).getTime()
      const localLastSync = getLastSync() || 0

      if (cloudTs > localLastSync) {
        // Cloud is newer → merge into local DB
        // Check if local has unsynced changes (local is newer than last sync)
        const localTxCount = await db.transactions.count()
        const cloudTxCount = cloudData.data?.transactions?.length || 0

        if (localTxCount === 0 && cloudTxCount > 0) {
          // Local empty, cloud has data → restore from cloud
          console.log('[CloudSync] Local empty, cloud has data → restoring')
          await db.restoreFromBackup(cloudData)
          markSynced(cloudTs)
        } else if (localTxCount > 0 && cloudTxCount > 0) {
          // Both have data → LWW merge by updated_at on transactions
          // Simple approach: if cloud exportedAt is newer, replace local
          // (More granular merge would compare per-transaction timestamps)
          console.log('[CloudSync] Both have data → LWW: cloud is newer, replacing')
          await db.restoreFromBackup(cloudData)
          markSynced(cloudTs)
        }
        // If local has data and cloud is empty, do nothing (local wins)
      } else {
        console.log('[CloudSync] Local is newer or equal → skipping pull')
      }
    } catch (e) {
      console.error('[CloudSync] Pull failed:', e)
    } finally {
      isSyncingRef.current = false
      setSyncing(false)
    }
  }, [markSynced])

  /**
   * Full sync: pull then push.
   */
  const syncNow = useCallback(async () => {
    await pullFromCloud()
    await uploadToCloud()
  }, [pullFromCloud, uploadToCloud])

  /**
   * Debounced sync trigger — called on DB changes.
   * Waits 30s after last change before uploading.
   */
  const scheduleDebouncedSync = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      uploadToCloud()
    }, SYNC_DEBOUNCE_MS)
  }, [uploadToCloud])

  // On mount: pull from cloud if authorized
  useEffect(() => {
    if (authorized && navigator.onLine) {
      pullFromCloud()
    }
  }, [authorized]) // eslint-disable-line react-hooks/exhaustive-deps

  // Wire debounced sync to Dexie writes — auto-sync on any DB change.
  //
  // NOTE: db.on('changes') requires the dexie-observable addon, which is NOT
  // installed. Calling it throws ("Cannot read properties of undefined
  // (reading 'subscribe')"), and because this effect only runs once the user
  // is authorized, it crashed the whole app to the error boundary right after
  // connecting Google. Instead we use core-Dexie table CRUD hooks, which are
  // part of Dexie itself. The whole wiring is guarded so a failure here can
  // never take down the app.
  useEffect(() => {
    if (!authorized) return

    const trigger = () => scheduleDebouncedSync()
    const HOOK_EVENTS = ['creating', 'updating', 'deleting']
    const attached = []

    try {
      for (const table of db.tables) {
        for (const evt of HOOK_EVENTS) {
          try {
            table.hook(evt, trigger)
            attached.push([table, evt])
          } catch {
            // ignore a single table/event we couldn't hook
          }
        }
      }
    } catch (e) {
      console.error('[CloudSync] Failed to wire auto-sync hooks:', e)
    }

    return () => {
      for (const [table, evt] of attached) {
        try {
          table.hook(evt).unsubscribe(trigger)
        } catch {
          // best-effort cleanup
        }
      }
    }
  }, [authorized, scheduleDebouncedSync])

  // Listen for online event → sync
  useEffect(() => {
    const handleOnline = () => {
      if (authorized) {
        pullFromCloud()
      }
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [authorized, pullFromCloud])

  /**
   * Agent 3: Check if emergency_backup.json exists on Drive.
   */
  const checkEmergencyBackup = useCallback(async () => {
    if (!isAuthorized()) {
      setEmergencyBackupExists(false)
      return
    }
    try {
      const file = await findFile(EMERGENCY_FILE)
      setEmergencyBackupExists(!!file)
    } catch {
      setEmergencyBackupExists(false)
    }
  }, [])

  useEffect(() => {
    checkEmergencyBackup()
  }, [authorized, checkEmergencyBackup])

  /**
   * Agent 3: Restore from emergency_backup.json.
   */
  const restoreEmergency = useCallback(async () => {
    if (!isAuthorized()) throw new Error('Not authorized')
    const file = await findFile(EMERGENCY_FILE)
    if (!file) throw new Error('No emergency backup found')
    const content = await downloadFile(file.id)
    const data = JSON.parse(content)
    await db.restoreFromBackup(data)
    markSynced()
    return data
  }, [markSynced])

  /**
   * Agent 3: Create emergency backup before clearing data.
   * Called by SettingsPage before db.clearAllData().
   */
  const createEmergencyBackup = useCallback(async () => {
    if (!isAuthorized() || !navigator.onLine) return
    try {
      const data = await db.exportAllData()
      data.emergencyBackupAt = new Date().toISOString()
      const content = JSON.stringify(data)
      // Delete existing emergency backup first
      const existing = await findFile(EMERGENCY_FILE)
      if (existing) await deleteFile(existing.id)
      await uploadFile(EMERGENCY_FILE, content)
      setEmergencyBackupExists(true)
      console.log('[CloudSync] Emergency backup created')
    } catch (e) {
      console.error('[CloudSync] Emergency backup failed:', e)
    }
  }, [])

  return (
    <CloudSyncContext.Provider value={{
      authorized,
      syncing,
      lastSync,
      emergencyBackupExists,
      syncNow,
      checkEmergencyBackup,
      restoreEmergency,
      createEmergencyBackup,
      scheduleDebouncedSync,
      uploadToCloud,
      pullFromCloud,
    }}>
      {children}
    </CloudSyncContext.Provider>
  )
}

export function useCloudSync() {
  return useContext(CloudSyncContext)
}
