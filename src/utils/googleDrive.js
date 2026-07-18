/**
 * Google Drive Sync — AppData folder integration.
 *
 * Uses Google Identity Services (GIS) for OAuth 2.0 login.
 * Requests ONLY 'drive.appdata' scope (hidden, private, free storage
 * in the user's Google Drive appData folder — not visible in Drive UI).
 *
 * Tokens stored in LocalStorage. Silent refresh via refresh_token.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin : ''

const TOKEN_KEY = 'gdrive_access_token'
const REFRESH_KEY = 'gdrive_refresh_token'
const EXPIRY_KEY = 'gdrive_token_expiry'
const LAST_SYNC_KEY = 'gdrive_last_sync'

// ========== Token Management ==========

export function getAccessToken() {
  const token = localStorage.getItem(TOKEN_KEY)
  const expiry = localStorage.getItem(EXPIRY_KEY)
  if (!token || !expiry) return null
  if (Date.now() > Number(expiry)) return null // expired
  return token
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

export function isAuthorized() {
  return !!(getAccessToken() || getRefreshToken())
}

export function getLastSync() {
  const v = localStorage.getItem(LAST_SYNC_KEY)
  return v ? Number(v) : null
}

export function setLastSync(ts = Date.now()) {
  localStorage.setItem(LAST_SYNC_KEY, String(ts))
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(EXPIRY_KEY)
  localStorage.removeItem(LAST_SYNC_KEY)
}

/**
 * Initiate OAuth 2.0 flow using GIS token client.
 * Falls back to manual redirect flow if GIS is not available.
 */
export async function loginWithGoogle() {
  if (!CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not set. Add it to your .env file.')
  }

  // Try GIS token client first (popup-based, no redirect)
  if (typeof google !== 'undefined' && google.accounts?.oauth2) {
    return new Promise((resolve, reject) => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: async (response) => {
          if (response.access_token) {
            const expiresIn = Number(response.expires_in || 3600)
            localStorage.setItem(TOKEN_KEY, response.access_token)
            localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000 - 60000))
            resolve(response.access_token)
          } else {
            reject(new Error('لم يتم منح الإذن'))
          }
        },
        error_callback: (err) => {
          reject(new Error(err?.message || 'فشل تسجيل الدخول'))
        },
      })
      tokenClient.requestAccessToken({ prompt: 'consent' })
    })
  }

  // Fallback: redirect-based OAuth flow
  // Note: This requires the app to handle the redirect callback on load.
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  })
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

/**
 * Silent token refresh using refresh_token.
 * Called automatically when the access token expires.
 * @returns {Promise<string|null>} new access token or null if refresh failed
 */
export async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken || !CLIENT_ID) return null

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })
    if (!res.ok) throw new Error('Refresh failed')
    const data = await res.json()
    const expiresIn = Number(data.expires_in || 3600)
    localStorage.setItem(TOKEN_KEY, data.access_token)
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000 - 60000))
    return data.access_token
  } catch (e) {
    console.error('Token refresh failed:', e)
    return null
  }
}

/**
 * Get a valid access token, refreshing silently if needed.
 * @returns {Promise<string|null>}
 */
export async function getValidToken() {
  let token = getAccessToken()
  if (token) return token
  // Try silent refresh
  token = await refreshAccessToken()
  return token
}

// ========== Drive AppData Operations ==========

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const FIELDS = 'id,name,modifiedTime'

/**
 * Find a file by name in the AppData folder.
 * @param {string} name — file name (e.g., 'current.json')
 * @returns {Promise<{id, name, modifiedTime}|null>}
 */
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

/**
 * Upload (create or update) a file in the AppData folder.
 * Uses multipart upload to set both metadata and content.
 * @param {string} name — file name
 * @param {string} content — file content (JSON string)
 * @returns {Promise<{id, name, modifiedTime}>}
 */
export async function uploadFile(name, content) {
  const token = await getValidToken()
  if (!token) throw new Error('Not authorized')

  // Check if file already exists
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

/**
 * Download a file's content from Drive.
 * @param {string} fileId — Drive file ID
 * @returns {Promise<string>} file content (JSON string)
 */
export async function downloadFile(fileId) {
  const token = await getValidToken()
  if (!token) throw new Error('Not authorized')

  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  return res.text()
}

/**
 * Rename a file on Drive (used for current.json → previous.json).
 * @param {string} fileId — Drive file ID
 * @param {string} newName — new file name
 */
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

/**
 * Delete a file from Drive AppData.
 * @param {string} fileId — Drive file ID
 */
export async function deleteFile(fileId) {
  const token = await getValidToken()
  if (!token) throw new Error('Not authorized')

  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`)
}

/**
 * List all files in AppData folder.
 * @returns {Promise<Array<{id, name, modifiedTime}>>}
 */
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
