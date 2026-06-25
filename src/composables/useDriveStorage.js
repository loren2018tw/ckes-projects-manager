import { ref, computed } from 'vue'
import { useGoogleAuth } from './useGoogleAuth.js'
import {
  getCached,
  setCached,
  setCachedData,
  removeCachedData,
  clearAllCache,
  forceRefresh,
  getSyncStatus,
  getCacheStats,
  clearAllData as clearAllCacheData,
  configureTTL
} from '../utils/cacheLayer.js'
import {
  scheduleSync,
  startBackgroundSync,
  processSyncQueue,
  isSyncInProgress,
  getOnlineStatus
} from '../utils/syncManager.js'

const APP_FOLDER_NAME = 'ckes-projects-manager'

const FILE_NAMES = {
  contacts: 'ckes_contacts.json',
  projects: 'ckes_projects.json',
  projectStaff: 'ckes_project_staff.json',
  purchaseRequests: 'ckes_purchase_requests.json'
}

const loadingCount = ref(0)
const loading = computed(() => loadingCount.value > 0)
const driveError = ref(null)

async function driveFetch(url, token, options = {}, retried = false) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  })
  if (res.status === 401 || res.status === 403) {
    if (!retried) {
      const { silentRefreshToken } = useGoogleAuth()
      const newToken = await silentRefreshToken()
      if (newToken) {
        return driveFetch(url, newToken, options, true)
      }
    }
    const { signOut } = useGoogleAuth()
    signOut()
    window.location.hash = '#/'
    throw new Error('登入狀態已過期或權限不足，請重新登入')
  }
  if (!res.ok) {
    let msg = `Drive API error: ${res.status}`
    try {
      const body = await res.json()
      if (body.error && body.error.message) msg += ` — ${body.error.message}`
    } catch {
      // ignore parse error
    }
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  return res
}

async function driveFetchJson(url, token, options = {}) {
  const res = await driveFetch(url, token, options)
  return res.json()
}

function getCache(key) {
  const raw = sessionStorage.getItem(`ckes_drive_cache_${key}`)
  return raw ? JSON.parse(raw) : null
}

function setCache(key, value) {
  sessionStorage.setItem(`ckes_drive_cache_${key}`, JSON.stringify(value))
}

function removeCache(key) {
  sessionStorage.removeItem(`ckes_drive_cache_${key}`)
}

async function ensureAppFolder(token) {
  const cached = getCache('app_folder_id')
  if (cached) return cached

  const query = encodeURIComponent(
    `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  )
  const data = await driveFetchJson(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    token
  )

  if (data.files && data.files.length > 0) {
    setCache('app_folder_id', data.files[0].id)
    return data.files[0].id
  }

  const meta = {
    name: APP_FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder'
  }
  const result = await driveFetchJson(
    'https://www.googleapis.com/drive/v3/files?fields=id',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meta)
    }
  )
  setCache('app_folder_id', result.id)
  return result.id
}

async function ensureFileInFolder(fileName, folderId, cacheKey, token) {
  const cached = getCache(cacheKey)
  if (cached) return cached

  const query = encodeURIComponent(
    `name='${fileName}' and '${folderId}' in parents and trashed=false`
  )
  const data = await driveFetchJson(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`,
    token
  )

  if (data.files && data.files.length > 0) {
    setCache(cacheKey, data.files[0].id)
    return data.files[0].id
  }

  const meta = {
    name: fileName,
    parents: [folderId]
  }
  const form = new FormData()
  form.append(
    'metadata',
    new Blob([JSON.stringify(meta)], { type: 'application/json' })
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
  setCache(cacheKey, result.id)
  return result.id
}

async function ensureFile(fileName, token) {
  const appFolderId = await ensureAppFolder(token)
  return ensureFileInFolder(fileName, appFolderId, `file_id_${fileName}`, token)
}

async function ensureProjectRootFile(projectId, dataType, token) {
  const fileName = `ckes_${dataType}_${projectId}.json`
  const cacheKey = `root_file_${dataType}_${projectId}`
  const appFolderId = await ensureAppFolder(token)
  return ensureFileInFolder(fileName, appFolderId, cacheKey, token)
}

export function useDriveStorage() {
  const { accessToken } = useGoogleAuth()

  async function getToken() {
    let tok = accessToken.value
    if (tok) return tok
    const { silentRefreshToken, signOut } = useGoogleAuth()
    tok = await silentRefreshToken()
    if (tok) return tok
    signOut()
    window.location.hash = '#/'
    throw new Error('Not authenticated')
  }

  let _migrationChecked = false

  async function _ensureMigrationDone() {
    if (_migrationChecked) return
    _migrationChecked = true
    try {
      await migrateProjectDataToRoot()
    } catch (err) {
      console.warn('Migration check failed:', err.message)
    }
  }

  async function migrateProjectDataToRoot() {
    const tok = await getToken()
    const appFolderId = await ensureAppFolder(tok)

    const flagQuery = encodeURIComponent(
      `name='ckes_migration_done.flag' and '${appFolderId}' in parents and trashed=false`
    )
    const flagData = await driveFetchJson(
      `https://www.googleapis.com/drive/v3/files?q=${flagQuery}&fields=files(id)`,
      tok
    )
    if (flagData.files && flagData.files.length > 0) return

    const allProjectsFileId = await ensureFile('ckes_projects.json', tok)
    const allProjectsData = await driveFetchJson(
      `https://www.googleapis.com/drive/v3/files/${allProjectsFileId}?alt=media`,
      tok
    )
    const projects = Array.isArray(allProjectsData) ? allProjectsData : []

    for (const project of projects) {
      const projectId = project.id
      const projectName = project.name

      const folderQuery = encodeURIComponent(
        `name='${projectName}' and '${appFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      )
      const folderData = await driveFetchJson(
        `https://www.googleapis.com/drive/v3/files?q=${folderQuery}&fields=files(id)`,
        tok
      )
      if (!folderData.files || folderData.files.length === 0) continue
      const projectFolderId = folderData.files[0].id

      for (const dataType of ['tasks', 'file_registry']) {
        const oldFileName = `ckes_${dataType}.json`
        const newFileName = `ckes_${dataType}_${projectId}.json`

        const destQuery = encodeURIComponent(
          `name='${newFileName}' and '${appFolderId}' in parents and trashed=false`
        )
        const destData = await driveFetchJson(
          `https://www.googleapis.com/drive/v3/files?q=${destQuery}&fields=files(id)`,
          tok
        )
        if (destData.files && destData.files.length > 0) continue

        const oldQuery = encodeURIComponent(
          `name='${oldFileName}' and '${projectFolderId}' in parents and trashed=false`
        )
        const oldData = await driveFetchJson(
          `https://www.googleapis.com/drive/v3/files?q=${oldQuery}&fields=files(id)`,
          tok
        )
        if (!oldData.files || oldData.files.length === 0) continue
        const oldFileId = oldData.files[0].id

        const content = await driveFetchJson(
          `https://www.googleapis.com/drive/v3/files/${oldFileId}?alt=media`,
          tok
        )

        const meta = { name: newFileName, parents: [appFolderId] }
        const form = new FormData()
        form.append(
          'metadata',
          new Blob([JSON.stringify(meta)], { type: 'application/json' })
        )
        form.append(
          'file',
          new Blob([JSON.stringify(content)], { type: 'application/json' })
        )
        await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${tok}` },
            body: form
          }
        )

        await driveFetch(
          `https://www.googleapis.com/drive/v3/files/${oldFileId}`,
          tok,
          { method: 'DELETE' }
        )
      }
    }

    const flagMeta = {
      name: 'ckes_migration_done.flag',
      parents: [appFolderId]
    }
    const flagForm = new FormData()
    flagForm.append(
      'metadata',
      new Blob([JSON.stringify(flagMeta)], { type: 'application/json' })
    )
    flagForm.append('file', new Blob(['done'], { type: 'text/plain' }))
    await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
        body: flagForm
      }
    )
  }

  async function fetchFromDriveDirect(dataType) {
    const tok = await getToken()
    const fileName = FILE_NAMES[dataType]
    if (!fileName) throw new Error(`Unknown data type: ${dataType}`)

    const fileId = await ensureFile(fileName, tok)
    const meta = await driveFetchJson(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=modifiedTime`,
      tok
    )
    const data = await driveFetchJson(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      tok
    )
    return { data, modifiedTime: meta.modifiedTime }
  }

  async function backgroundRefresh(dataType) {
    try {
      const { data, modifiedTime } = await fetchFromDriveDirect(dataType)
      await setCachedData(dataType, data, modifiedTime)
    } catch (err) {
      console.warn(`Background refresh failed for ${dataType}:`, err.message)
    }
  }

  async function readData(dataType) {
    const cached = await getCached(dataType)
    if (cached) {
      if (cached.expired) {
        backgroundRefresh(dataType)
      }
      return cached.data
    }

    const tok = await getToken()
    const fileName = FILE_NAMES[dataType]
    if (!fileName) throw new Error(`Unknown data type: ${dataType}`)

    loadingCount.value++
    driveError.value = null
    try {
      const fileId = await ensureFile(fileName, tok)
      const data = await driveFetchJson(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        tok
      )
      await setCachedData(dataType, data, new Date().toISOString())
      return data
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function writeData(dataType, data) {
    const clean = JSON.parse(JSON.stringify(data))
    await setCached(dataType, clean, new Date().toISOString())
    scheduleSync()
  }

  async function listFolderItems(folderId) {
    const cacheType = `folder_files_${folderId}`
    const cached = await getCached(cacheType, 'fileList')
    if (cached) {
      if (cached.expired) {
        backgroundRefreshFolderItems(folderId, cacheType)
      }
      return cached.data
    }

    const tok = await getToken()
    loadingCount.value++
    driveError.value = null
    try {
      const data = await driveFetchJson(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&orderBy=name&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink)`,
        tok
      )
      const files = data.files || []
      await setCachedData(cacheType, files, new Date().toISOString())
      return files
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function backgroundRefreshFolderItems(folderId, cacheType) {
    try {
      const tok = await getToken()
      const data = await driveFetchJson(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&orderBy=name&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink)`,
        tok
      )
      const files = data.files || []
      await setCachedData(cacheType, files, new Date().toISOString())
    } catch (err) {
      console.warn(`Background refresh failed for ${cacheType}:`, err.message)
    }
  }

  async function backgroundRefreshProjectData(
    projectId,
    _projectName,
    dataType,
    cacheType
  ) {
    try {
      const tok = await getToken()
      const fileId = await ensureProjectRootFile(projectId, dataType, tok)
      const data = await driveFetchJson(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        tok
      )
      await setCachedData(cacheType, data, new Date().toISOString())
    } catch (err) {
      console.warn(`Background refresh failed for ${cacheType}:`, err.message)
    }
  }

  async function readProjectData(projectId, _projectName, dataType) {
    const cacheType = `${dataType}_${projectId}`
    await _ensureMigrationDone()
    const cached = await getCached(cacheType)
    if (cached) {
      if (cached.expired) {
        backgroundRefreshProjectData(
          projectId,
          _projectName,
          dataType,
          cacheType
        )
      }
      return cached.data
    }

    const tok = await getToken()
    loadingCount.value++
    driveError.value = null
    try {
      const fileId = await ensureProjectRootFile(projectId, dataType, tok)
      const data = await driveFetchJson(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        tok
      )
      await setCachedData(cacheType, data, new Date().toISOString())
      return data
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function writeProjectData(projectId, _projectName, dataType, data) {
    const tok = await getToken()
    await _ensureMigrationDone()
    loadingCount.value++
    driveError.value = null
    try {
      const fileId = await ensureProjectRootFile(projectId, dataType, tok)
      await driveFetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        tok,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }
      )
      const cacheType = `${dataType}_${projectId}`
      await setCachedData(cacheType, data, new Date().toISOString())
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function listAppFolder() {
    const tok = await getToken()
    const appFolderId = await ensureAppFolder(tok)
    return listFolderItems(appFolderId)
  }

  async function ensureProjectFolder(projectId, projectName) {
    const tok = await getToken()
    const cacheKey = `project_folder_${projectId}`
    const cached = getCache(cacheKey)
    if (cached) return cached

    const appFolderId = await ensureAppFolder(tok)

    const query = encodeURIComponent(
      `name='${projectName}' and '${appFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    )
    const data = await driveFetchJson(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
      tok
    )

    if (data.files && data.files.length > 0) {
      setCache(cacheKey, data.files[0].id)
      return data.files[0].id
    }

    const meta = {
      name: projectName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [appFolderId]
    }
    const result = await driveFetchJson(
      'https://www.googleapis.com/drive/v3/files?fields=id',
      tok,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta)
      }
    )
    setCache(cacheKey, result.id)
    return result.id
  }

  async function deleteProjectFolder(projectId, projectName) {
    const tok = await getToken()
    const cacheKey = `project_folder_${projectId}`

    try {
      const appFolderId = await ensureAppFolder(tok)

      const query = encodeURIComponent(
        `name='${projectName}' and '${appFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      )
      const data = await driveFetchJson(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`,
        tok
      )

      if (data.files && data.files.length > 0) {
        for (const f of data.files) {
          await driveFetch(
            `https://www.googleapis.com/drive/v3/files/${f.id}`,
            tok,
            { method: 'DELETE' }
          )
        }
      }

      for (const dt of ['tasks', 'file_registry']) {
        const rootFileName = `ckes_${dt}_${projectId}.json`
        const rootQuery = encodeURIComponent(
          `name='${rootFileName}' and '${appFolderId}' in parents and trashed=false`
        )
        const rootData = await driveFetchJson(
          `https://www.googleapis.com/drive/v3/files?q=${rootQuery}&fields=files(id)`,
          tok
        )
        if (rootData.files && rootData.files.length > 0) {
          await driveFetch(
            `https://www.googleapis.com/drive/v3/files/${rootData.files[0].id}`,
            tok,
            { method: 'DELETE' }
          )
        }
        removeCache(`root_file_${dt}_${projectId}`)
      }
    } catch (err) {
      console.error('Failed to delete project folder:', err)
    }

    removeCache(cacheKey)
    await removeCachedData(`tasks_${projectId}`)
  }

  async function renameProjectFolder(projectId, oldName, newName) {
    const tok = await getToken()
    const cacheKey = `project_folder_${projectId}`
    removeCache(cacheKey)

    try {
      const appFolderId = await ensureAppFolder(tok)

      const query = encodeURIComponent(
        `name='${oldName}' and '${appFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      )
      const data = await driveFetchJson(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`,
        tok
      )

      if (data.files && data.files.length > 0) {
        await driveFetch(
          `https://www.googleapis.com/drive/v3/files/${data.files[0].id}`,
          tok,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
          }
        )
      }
    } catch (err) {
      console.error('Failed to rename project folder:', err)
    }
  }

  async function listProjectFiles(projectId, projectName) {
    loadingCount.value++
    driveError.value = null
    try {
      const folderId = await ensureProjectFolder(projectId, projectName)
      return listFolderItems(folderId)
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function uploadFileToFolder(folderId, file) {
    const tok = await getToken()

    loadingCount.value++
    driveError.value = null
    try {
      const meta = {
        name: file.name,
        parents: [folderId]
      }
      const form = new FormData()
      form.append(
        'metadata',
        new Blob([JSON.stringify(meta)], { type: 'application/json' })
      )
      form.append('file', file)

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,iconLink',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${tok}` },
          body: form
        }
      )
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const result = await res.json()
      await removeCachedData(`folder_files_${folderId}`)
      return result
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function ensureProjectSubfolder(projectId, projectName, subfolderName) {
    const tok = await getToken()
    const projectFolderId = await ensureProjectFolder(projectId, projectName)
    const cacheKey = `project_subfolder_${projectId}_${subfolderName}`
    const cached = getCache(cacheKey)
    if (cached) return cached

    const query = encodeURIComponent(
      `name='${subfolderName}' and '${projectFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    )
    const data = await driveFetchJson(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
      tok
    )

    if (data.files && data.files.length > 0) {
      setCache(cacheKey, data.files[0].id)
      return data.files[0].id
    }

    const meta = {
      name: subfolderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [projectFolderId]
    }
    const result = await driveFetchJson(
      'https://www.googleapis.com/drive/v3/files?fields=id',
      tok,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta)
      }
    )
    setCache(cacheKey, result.id)
    return result.id
  }

  async function uploadProjectFile(projectId, projectName, file) {
    const folderId = await ensureProjectFolder(projectId, projectName)
    return uploadFileToFolder(folderId, file)
  }

  async function uploadProjectFileToCategory(
    projectId,
    projectName,
    category,
    file
  ) {
    const folderId = await ensureProjectSubfolder(
      projectId,
      projectName,
      category
    )
    return uploadFileToFolder(folderId, file)
  }

  async function listProjectFilesByCategory(projectId, projectName) {
    loadingCount.value++
    driveError.value = null
    try {
      const projectFolderId = await ensureProjectFolder(projectId, projectName)
      const categories = ['公文', '附件', '報表', '其他']
      const allFiles = []
      for (const cat of categories) {
        const subfolderId = await ensureProjectSubfolder(
          projectId,
          projectName,
          cat
        )
        const items = await listFolderItems(subfolderId)
        for (const item of items) {
          item._category = cat
        }
        allFiles.push(...items)
      }

      const rootItems = await listFolderItems(projectFolderId)
      for (const item of rootItems) {
        if (item.mimeType !== 'application/vnd.google-apps.folder') {
          item._category = '其他'
          allFiles.push(item)
        }
      }

      return allFiles
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function downloadFile(fileId) {
    const tok = await getToken()

    loadingCount.value++
    driveError.value = null
    try {
      const res = await driveFetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        tok
      )
      return await res.blob()
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function deleteDriveFile(fileId) {
    const tok = await getToken()

    loadingCount.value++
    driveError.value = null
    try {
      await driveFetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        tok,
        { method: 'DELETE' }
      )
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function copyDriveFile(fileId, newName, parentFolderId) {
    const tok = await getToken()

    loadingCount.value++
    driveError.value = null
    try {
      const meta = { name: newName, parents: [parentFolderId] }
      const result = await driveFetchJson(
        `https://www.googleapis.com/drive/v3/files/${fileId}/copy?fields=id,name,mimeType,size,modifiedTime,iconLink`,
        tok,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(meta)
        }
      )
      return result
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  const REGISTRY_TYPE = 'file_registry'

  async function getRegistry(projectId, projectName) {
    try {
      return await readProjectData(projectId, projectName, REGISTRY_TYPE)
    } catch {
      return { files: {} }
    }
  }

  async function saveRegistry(projectId, projectName, data) {
    await writeProjectData(projectId, projectName, REGISTRY_TYPE, data)
  }

  async function addToRegistry(projectId, projectName, file, category) {
    const reg = await getRegistry(projectId, projectName)
    reg.files = reg.files || {}
    reg.files[file.id] = {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      iconLink: file.iconLink,
      _category: category
    }
    await saveRegistry(projectId, projectName, reg)
  }

  async function removeFromRegistry(projectId, projectName, fileId) {
    const reg = await getRegistry(projectId, projectName)
    if (reg.files) delete reg.files[fileId]
    await saveRegistry(projectId, projectName, reg)
  }

  async function listRegistryFiles(projectId, projectName) {
    const reg = await getRegistry(projectId, projectName)
    const regFiles = reg.files || {}
    const regEntries = Object.values(regFiles)

    const folderFiles = await listProjectFilesByCategory(projectId, projectName)
    const foundIds = new Set(folderFiles.map(f => f.id))

    const missing = regEntries.filter(e => !foundIds.has(e.id))
    if (missing.length === 0) return folderFiles

    const tok = await getToken()
    for (const entry of missing) {
      try {
        const meta = await driveFetchJson(
          `https://www.googleapis.com/drive/v3/files/${entry.id}?fields=id,name,mimeType,size,modifiedTime,webViewLink,iconLink`,
          tok
        )
        meta._category = entry._category
        folderFiles.push(meta)
      } catch {
        folderFiles.push(entry)
      }
    }
    return folderFiles
  }

  function invalidateProjectFolderCache(projectId) {
    removeCache(`project_folder_${projectId}`)
  }

  function invalidateAllCache() {
    const keys = Object.keys(sessionStorage)
    for (const key of keys) {
      if (key.startsWith('ckes_drive_cache_')) {
        sessionStorage.removeItem(key)
      }
    }
  }

  return {
    readData,
    writeData,
    readProjectData,
    writeProjectData,
    ensureProjectRootFile,
    migrateProjectDataToRoot,
    listAppFolder,
    listFolderItems,
    ensureProjectFolder,
    ensureProjectSubfolder,
    deleteProjectFolder,
    renameProjectFolder,
    listProjectFiles,
    listProjectFilesByCategory,
    uploadProjectFile,
    uploadProjectFileToCategory,
    uploadFileToFolder,
    downloadFile,
    deleteDriveFile,
    copyDriveFile,
    addToRegistry,
    removeFromRegistry,
    listRegistryFiles,
    invalidateProjectFolderCache,
    invalidateAllCache,
    loading,
    driveError,
    getSyncStatus,
    forceRefresh,
    configureTTL,
    getCacheStats,
    clearAllCache,
    processSyncQueue,
    isSyncInProgress,
    getOnlineStatus,
    startBackgroundSync,
    cleanupCache: clearAllCacheData
  }
}
