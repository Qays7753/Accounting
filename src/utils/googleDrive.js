/**
 * Google Drive Sync — AppData folder integration.
 *
 * Uses Google Identity Services (GIS) Token Client model exclusively.
 * NO deprecated gapi.auth2, NO OOB redirect URIs.
 *
 * Flow:
 *   1. User clicks "Connect Google"
 *   2. GIS script (loaded in index.html) opens a secure popup
 *   3. User logs in + grants drive.appdata scope
 *   4. We receive an Access Token (implicit flow, no refresh token)
 *   5. Token stored in LocalStorage with expiry
 *   6. When token expires, GIS silently re-requests with prompt:'' (no popup)
 *
 * The GIS script is loaded via <script src="accounts.google.com/gsi/client">
 * in index.html. We wait for it to be ready before initializing.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'

const TOKEN_KEY = 'gdrive_access_token'
const EXPIRY_KEY = 'gdrive_token_expiry'
const LAST_SYNC_KEY = 'gdrive_last_sync'

// ========== GIS Script Loading ==========

/**
 * Wait for the GIS script to be loaded (it's async/defer in index.html).
 * @returns {Promise<void>}
 */
function waitForGIS(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts?.oauth2) {
      resolve()
      return
    }
    const start = Date.now()
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts?.oauth2) {
        clearInterval(interval)
        resolve()
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval)
        reject(new Error('GIS script failed to load. Check your internet connection.'))
      }
    }, 100)
  })
}

// ========== Token Management ==========

export function getAccessToken() {
  const token = localStorage.getItem(TOKEN_KEY)
  const expiry = localStorage.getItem(EXPIRY_KEY)
  if (!token || !expiry) return null
  if (Date.now() > Number(expiry)) return null // expired
  return token
}

export function isAuthorized() {
  return !!getAccessToken()
}

export function getLastSync() {
  const v = localStorage.getItem(LAST_SYNC_KEY)
  return v ? Number(v) : null
}

export function setLastSync(ts = Date.now()) {
  localStorage.setItem(LAST_SYNC_KEY, String(ts))
}

export function logout() {
  // Revoke the token at Google before clearing local storage
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: 'POST' })
      .catch(() => {}) // best-effort, don't block logout
  }
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRY_KEY)
  localStorage.removeItem(LAST_SYNC_KEY)
}

/**
 * Store the access token from GIS response.
 */
function storeToken(accessToken, expiresIn) {
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000 - 60000)) // 1min buffer
}

/**
 * Login with Google using GIS Token Client.
 * Opens a secure popup for user consent.
 * @returns {Promise<string>} access token
 */
export async function loginWithGoogle() {
  if (!CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not set. Add it to your .env file.')
  }

  await waitForGIS()

  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.access_token) {
          const expiresIn = Number(response.expires_in || 3600)
          storeToken(response.access_token, expiresIn)
          resolve(response.access_token)
        } else {
          reject(new Error('لم يتم منح الإذن'))
        }
      },
      error_callback: (err) => {
        reject(new Error(err?.message || 'فشل تسجيل الدخول عبر Google'))
      },
    })
    // prompt: '' = silent re-consent (no popup if user already authorized)
    // Only use 'consent' on first-ever login to force the consent screen
    const isFirstLogin = !localStorage.getItem(TOKEN_KEY) && !localStorage.getItem(EXPIRY_KEY)
    tokenClient.requestAccessToken({ prompt: isFirstLogin ? 'consent' : '' })
  })
}

/**
 * Silently refresh the access token using GIS.
 * GIS Token Client with prompt: '' will return a new token without
 * showing a popup (if the user previously granted consent).
 * @returns {Promise<string|null>} new access token or null if failed
 */
export async function refreshAccessToken() {
  if (!CLIENT_ID) return null

  try {
    await waitForGIS(5000)
  } catch {
    // GIS not available — can't refresh
    return null
  }

  return new Promise((resolve) => {
    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (response) => {
          if (response.access_token) {
            const expiresIn = Number(response.expires_in || 3600)
            storeToken(response.access_token, expiresIn)
            resolve(response.access_token)
          } else {
            resolve(null)
          }
        },
        error_callback: () => {
          // Silent refresh failed — user needs to re-login manually
          resolve(null)
        },
      })
      // prompt: '' = no popup, uses existing session/consent
      tokenClient.requestAccessToken({ prompt: '' })
    } catch {
      resolve(null)
    }
  })
}

/**
 * Get a valid access token, refreshing silently if needed.
 * @returns {Promise<string|null>}
 */
export async function getValidToken() {
  let token = getAccessToken()
  if (token) return token
  // Try silent refresh via GIS
  token = await refreshAccessToken()
  return token
}

// ========== Drive AppData Operations ==========
// (These remain unchanged — they use fetch + Bearer token)

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const FIELDS = 'id,name,modifiedTime'

export async function findFile(name) {
  const token = await getValidToken()
  if (!token) return null

  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name = '${name}'`,
    fields: `files(${FIELDS})`,
    pageSize: '1',
  })

  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`)
  const data = await res.json()
  return data.files?.[0] || null
}

export async function uploadFile(name, content) {
  const token = await getValidToken()
  if (!token) throw new Error('Not authorized')

  const existing = await findFile(name)

  const boundary = '-------314159265358979323846'
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelim = `\r\n--${boundary}--`

  const metadata = {
    name,
    mimeType: 'application/json',
    parents: existing ? undefined : ['appDataFolder'],
  }

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    content +
    closeDelim

  const url = existing
    ? `${UPLOAD_API}/files/${existing.id}?uploadType=multipart&fields=${FIELDS}`
    : `${UPLOAD_API}/files?uploadType=multipart&fields=${FIELDS}`

  const method = existing ? 'PATCH' : 'POST'

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary="${boundary}"`,
    },
    body,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Upload failed: ${res.status} ${errText}`)
  }
  return res.json()
}

export async function downloadFile(fileId) {
  const token = await getValidToken()
  if (!token) throw new Error('Not authorized')

  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  return res.text()
}

export async function renameFile(fileId, newName) {
  const token = await getValidToken()
  if (!token) throw new Error('Not authorized')

  const res = await fetch(`${DRIVE_API}/files/${fileId}?fields=${FIELDS}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName }),
  })
  if (!res.ok) throw new Error(`Rename failed: ${res.status}`)
  return res.json()
}

export async function deleteFile(fileId) {
  const token = await getValidToken()
  if (!token) throw new Error('Not authorized')

  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`)
}

export async function listFiles() {
  const token = await getValidToken()
  if (!token) return []

  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    fields: `files(${FIELDS})`,
    pageSize: '100',
    orderBy: 'modifiedTime desc',
  })

  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.files || []
}
