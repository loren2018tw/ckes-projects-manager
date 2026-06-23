import { openDB } from 'idb'

const DB_NAME = 'ckes_cache'
const DB_VERSION = 1

let dbPromise = null

export async function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, _transaction) {
        if (!db.objectStoreNames.contains('data_cache')) {
          const dataStore = db.createObjectStore('data_cache', {
            keyPath: 'type'
          })
          dataStore.createIndex('cachedAt', 'cachedAt')
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', {
            keyPath: 'id',
            autoIncrement: true
          })
          syncStore.createIndex('type', 'type')
          syncStore.createIndex('createdAt', 'createdAt')
        }
        if (!db.objectStoreNames.contains('sync_meta')) {
          const metaStore = db.createObjectStore('sync_meta', {
            keyPath: 'type'
          })
          metaStore.createIndex('status', 'status')
        }
      }
    })
  }
  return dbPromise
}

export async function getCachedData(type) {
  const db = await getDb()
  return db.get('data_cache', type)
}

export async function setCachedData(type, data, driveModifiedAt) {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.put('data_cache', {
    type,
    data: JSON.parse(JSON.stringify(data)),
    cachedAt: now,
    driveModifiedAt: driveModifiedAt || now,
    etag: null
  })
}

export async function removeCachedData(type) {
  const db = await getDb()
  await db.delete('data_cache', type)
}

export async function clearAllCachedData() {
  const db = await getDb()
  await db.clear('data_cache')
}

export async function addToSyncQueue(type, action, data) {
  const db = await getDb()
  const existing = await db.getAllFromIndex('sync_queue', 'type', type)
  const pendingWrites = existing.filter(
    item => item.action === action && item.retryCount < 3
  )
  for (const item of pendingWrites) {
    await db.delete('sync_queue', item.id)
  }
  return db.add('sync_queue', {
    type,
    action,
    data: JSON.parse(JSON.stringify(data)),
    createdAt: new Date().toISOString(),
    retryCount: 0,
    error: null
  })
}

export async function getSyncQueue() {
  const db = await getDb()
  const all = await db.getAll('sync_queue')
  all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return all
}

export async function getPendingSyncsByType(type) {
  const db = await getDb()
  return db.getAllFromIndex('sync_queue', 'type', type)
}

export async function removeSyncQueueItem(id) {
  const db = await getDb()
  await db.delete('sync_queue', id)
}

export async function updateSyncQueueRetry(id, error) {
  const db = await getDb()
  const item = await db.get('sync_queue', id)
  if (item) {
    item.retryCount += 1
    item.error = error || null
    await db.put('sync_queue', item)
  }
}

export async function clearSyncQueue() {
  const db = await getDb()
  await db.clear('sync_queue')
}

export async function getSyncMeta(type) {
  const db = await getDb()
  const meta = await db.get('sync_meta', type)
  return (
    meta || {
      type,
      lastSyncAt: null,
      status: 'idle'
    }
  )
}

export async function setSyncMeta(type, status, lastSyncAt) {
  const db = await getDb()
  const meta = await getSyncMeta(type)
  if (status !== undefined) meta.status = status
  if (lastSyncAt !== undefined) meta.lastSyncAt = lastSyncAt
  await db.put('sync_meta', meta)
}

export async function clearAllSyncMeta() {
  const db = await getDb()
  await db.clear('sync_meta')
}

export async function clearAllData() {
  const db = await getDb()
  await db.clear('data_cache')
  await db.clear('sync_queue')
  await db.clear('sync_meta')
}

export async function getCacheStats() {
  const db = await getDb()
  const dataCache = await db.getAll('data_cache')
  const syncQueue = await db.getAll('sync_queue')
  const syncMetas = await db.getAll('sync_meta')

  let totalSize = 0
  let oldestEntry = null
  let newestEntry = null

  for (const entry of dataCache) {
    const size = new TextEncoder().encode(JSON.stringify(entry)).length
    totalSize += size
    if (!oldestEntry || entry.cachedAt < oldestEntry)
      oldestEntry = entry.cachedAt
    if (!newestEntry || entry.cachedAt > newestEntry)
      newestEntry = entry.cachedAt
  }

  return {
    totalEntries: dataCache.length,
    totalSize,
    oldestEntry,
    newestEntry,
    pendingSyncCount: syncQueue.length,
    syncMetaCount: syncMetas.length
  }
}

export async function purgeOldestEntries(percent = 0.2) {
  const db = await getDb()
  const all = await db.getAll('data_cache')
  all.sort((a, b) => a.cachedAt.localeCompare(b.cachedAt))
  const removeCount = Math.ceil(all.length * percent)
  for (let i = 0; i < removeCount; i++) {
    await db.delete('data_cache', all[i].type)
  }
  return removeCount
}
