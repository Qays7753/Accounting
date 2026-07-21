/**
 * Persistent storage — reduce the risk of the browser evicting the local
 * database (IndexedDB) under storage pressure or inactivity.
 *
 * This matters most on iOS Safari, whose ITP policy can clear a site's local
 * storage after ~7 days without use. Requesting persistent storage tells the
 * browser this data is important; it is granted based on heuristics (installed
 * to home screen, bookmarked, user engagement), so it is best-effort — the
 * Google Drive cloud backup remains the real safety net.
 *
 * Safe to call on every boot: it is idempotent (checks `persisted()` first),
 * fully guarded, and a no-op on browsers that don't support the API.
 */
export async function requestPersistentStorage() {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) {
      return false
    }
    // Already granted on a previous visit → nothing to do.
    if (navigator.storage.persisted) {
      const already = await navigator.storage.persisted()
      if (already) {
        console.log('[storage] persistent storage already granted')
        return true
      }
    }
    const granted = await navigator.storage.persist()
    console.log(`[storage] persistent storage ${granted ? 'granted' : 'not granted (best-effort)'}`)
    return granted
  } catch (e) {
    console.warn('[storage] persist request failed:', e)
    return false
  }
}
