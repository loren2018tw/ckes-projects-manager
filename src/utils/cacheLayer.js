import {
  getCachedData,
  setCachedData,
  removeCachedData,
  clearAllCachedData,
  addToSyncQueue,
  getSyncQueue,
  removeSyncQueueItem,
  getPendingSyncsByType as getPendingSyncsByTypeDb,
  updateSyncQueueRetry,
  getSyncMeta,
  setSyncMeta,
  clearAllData,
  clearSyncQueue,
  getCacheStats,
  purgeOldestEntries
} from './cacheDb.js'

const DEFAULT_TTL = {
  jsonData: 30000,
  fileList: 60000
}

let ttlConfig = { ...DEFAULT_TTL }

export function configureTTL(config) {
  if (config.jsonData !== undefined) ttlConfig.jsonData = config.jsonData
  if (config.fileList !== undefined) ttlConfig.fileList = config.fileList
}

function isExpired(cachedAt, ttlMs) {
  if (!cachedAt) return true
  const age = Date.now() - new Date(cachedAt).getTime()
  return age > ttlMs
}

export async function getCached(type, ttlType = 'jsonData') {
  const entry = await getCachedData(type)
  if (!entry) return null

  const expired = isExpired(entry.cachedAt, ttlConfig[ttlType])
  return {
    data: entry.data,
    driveModifiedAt: entry.driveModifiedAt,
    cachedAt: entry.cachedAt,
    expired
  }
}

export async function setCached(type, data, driveModifiedAt) {
  await setCachedData(type, data, driveModifiedAt)
  await addToSyncQueue(type, 'write', data)
}

export async function markSynced(type, driveModifiedAt) {
  const now = new Date().toISOString()

  const pendingItems = await getPendingSyncsByTypeDb(type)
  for (const item of pendingItems) {
    await removeSyncQueueItem(item.id)
  }

  await setSyncMeta(type, 'idle', now)

  if (driveModifiedAt) {
    const entry = await getCachedData(type)
    if (entry) {
      entry.driveModifiedAt = driveModifiedAt
      entry.cachedAt = now
      await setCachedData(type, entry.data, driveModifiedAt)
    }
  }
}

export async function getPendingSyncs() {
  return getSyncQueue()
}

export async function removePendingSync(type) {
  const items = await getPendingSyncsByTypeDb(type)
  for (const item of items) {
    await removeSyncQueueItem(item.id)
  }
}

export async function clearAllCache() {
  await clearAllCachedData()
}

export async function getSyncStatus(type) {
  const meta = await getSyncMeta(type)
  const pendingItems = await getPendingSyncsByTypeDb(type)
  return {
    type: meta.type,
    status: meta.status,
    lastSyncAt: meta.lastSyncAt,
    pendingCount: pendingItems.length
  }
}

export async function forceRefresh(type, fetchFromDrive) {
  await removeCachedData(type)
  const data = await fetchFromDrive()
  const now = new Date().toISOString()
  await setCachedData(type, data, now)
  return data
}

export async function forceRefreshAll(types, fetchFromDrive) {
  const results = {}
  for (const type of types) {
    results[type] = await forceRefresh(type, () => fetchFromDrive(type))
  }
  return results
}

export {
  getCacheStats,
  purgeOldestEntries,
  updateSyncQueueRetry,
  clearAllData,
  clearSyncQueue,
  getCachedData,
  setCachedData,
  removeCachedData
}
