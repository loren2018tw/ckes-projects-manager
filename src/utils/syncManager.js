import { ref } from 'vue'
import { getPendingSyncs, updateSyncQueueRetry } from './cacheLayer.js'
import {
  getCachedData,
  setCachedData,
  removeSyncQueueItem,
  setSyncMeta
} from './cacheDb.js'
import { useGoogleAuth } from '../composables/useGoogleAuth.js'

const MAX_RETRIES = 3
const BACKGROUND_INTERVAL = 5 * 60 * 1000
const WRITE_DEBOUNCE_MS = 2000

const syncInProgress = ref(false)
const isOnline = ref(navigator.onLine)
let syncTimer = null
let debounceTimer = null
let conflictStrategy = 'local'

function onOnline() {
  isOnline.value = true
  processSyncQueue()
}

function onOffline() {
  isOnline.value = false
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
}

export function cleanupSyncListeners() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

export function startBackgroundSync() {
  if (syncTimer) return
  syncTimer = setInterval(() => {
    processSyncQueue()
  }, BACKGROUND_INTERVAL)
}

export function scheduleSync() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    processSyncQueue()
  }, WRITE_DEBOUNCE_MS)
}

async function getAccessToken() {
    const { accessToken, silentRefreshToken } = useGoogleAuth()
    let tok = accessToken.value
    if (tok) return tok
    tok = await silentRefreshToken()
    if (tok) return tok
    throw new Error('Not authenticated')
}

async function driveFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  })
  if (res.status === 401 || res.status === 403) {
    const { silentRefreshToken } = useGoogleAuth()
    const newToken = await silentRefreshToken()
    if (newToken) {
      return driveFetch(url, newToken, options)
    }
    throw new Error('登入狀態已過期或權限不足，請重新登入')
  }
  if (!res.ok) {
    let msg = `Drive API error: ${res.status}`
    try {
      const body = await res.json()
      if (body.error && body.error.message) msg += ` — ${body.error.message}`
    } catch {}
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  return res
}

async function getFileMeta(fileId, token) {
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=modifiedTime`,
    token
  )
  return res.json()
}

async function writeToDrive(fileId, data, token) {
  await driveFetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    token,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }
  )
}

const FILE_NAMES = {
  contacts: 'ckes_contacts.json',
  projects: 'ckes_projects.json',
  projectStaff: 'ckes_project_staff.json',
  purchaseRequests: 'ckes_purchase_requests.json'
}

const APP_FOLDER_NAME = 'ckes-projects-manager'

async function ensureAppFolder(token) {
  const cached = sessionStorage.getItem('ckes_drive_cache_app_folder_id')
  if (cached) return JSON.parse(cached)

  const query = encodeURIComponent(
    `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  )
  const data = await (
    await driveFetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
      token
    )
  ).json()

  if (data.files && data.files.length > 0) {
    sessionStorage.setItem(
      'ckes_drive_cache_app_folder_id',
      JSON.stringify(data.files[0].id)
    )
    return data.files[0].id
  }

  const result = await (
    await driveFetch(
      'https://www.googleapis.com/drive/v3/files?fields=id',
      token,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: APP_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder'
        })
      }
    )
  ).json()
  sessionStorage.setItem(
    'ckes_drive_cache_app_folder_id',
    JSON.stringify(result.id)
  )
  return result.id
}

async function ensureFile(fileName, token) {
  const sessionKey = `ckes_drive_cache_file_id_${fileName}`
  const cached = sessionStorage.getItem(sessionKey)
  if (cached) return JSON.parse(cached)

  const appFolderId = await ensureAppFolder(token)

  const query = encodeURIComponent(
    `name='${fileName}' and '${appFolderId}' in parents and trashed=false`
  )
  const data = await (
    await driveFetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`,
      token
    )
  ).json()

  if (data.files && data.files.length > 0) {
    sessionStorage.setItem(sessionKey, JSON.stringify(data.files[0].id))
    return data.files[0].id
  }

  const form = new FormData()
  form.append(
    'metadata',
    new Blob([JSON.stringify({ name: fileName, parents: [appFolderId] })], {
      type: 'application/json'
    })
  )
  form.append('file', new Blob(['[]'], { type: 'application/json' }))

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    }
  )
  if (!res.ok) throw new Error(`Failed to create file: ${res.status}`)
  const result = await res.json()
  sessionStorage.setItem(sessionKey, JSON.stringify(result.id))
  return result.id
}

export async function processSyncQueue() {
  if (syncInProgress.value || !isOnline.value) return

  syncInProgress.value = true
  const token = await getAccessToken()

  try {
    const queue = await getPendingSyncs()

    for (const item of queue) {
      if (item.retryCount >= MAX_RETRIES) continue

      await setSyncMeta(item.type, 'syncing')

      try {
        const fileId = await ensureFile(FILE_NAMES[item.type], token)
        if (!fileId) {
          throw new Error(`File not found for type: ${item.type}`)
        }

        if (item.action === 'write') {
          const meta = await getFileMeta(fileId, token)
          const cachedEntry = await getCachedData(item.type)
          const localModifiedAt = cachedEntry?.driveModifiedAt
          if (localModifiedAt && meta.modifiedTime > localModifiedAt) {
            if (conflictStrategy === 'remote') {
              const remoteRes = await driveFetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                token
              )
              const remoteData = await remoteRes.json()
              await setCachedData(item.type, remoteData, meta.modifiedTime)
              await removeSyncQueueItem(item.id)
              await setSyncMeta(item.type, 'idle', new Date().toISOString())
            } else {
              await writeToDrive(fileId, item.data, token)
              await removeSyncQueueItem(item.id)
              await setSyncMeta(item.type, 'idle', new Date().toISOString())
            }
            continue
          }

          await writeToDrive(fileId, item.data, token)
        }

        await removeSyncQueueItem(item.id)
        await setSyncMeta(item.type, 'idle', new Date().toISOString())
      } catch (err) {
        await updateSyncQueueRetry(item.id, err.message)
        if (item.retryCount + 1 >= MAX_RETRIES) {
          await setSyncMeta(item.type, 'error')
        }
      }
    }
  } finally {
    syncInProgress.value = false
  }
}

export function isSyncInProgress() {
  return syncInProgress
}

export function getOnlineStatus() {
  return isOnline
}

export function setConflictStrategy(strategy) {
  conflictStrategy = strategy
}

export function getConflictStrategy() {
  return conflictStrategy
}
