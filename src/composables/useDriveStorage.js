import { ref, computed } from 'vue'
import { useGoogleAuth } from './useGoogleAuth.js'

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

async function driveFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  })
  if (res.status === 401 || res.status === 403) {
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

export function useDriveStorage() {
  const { accessToken } = useGoogleAuth()

  function getToken() {
    const tok = accessToken.value
    if (!tok) throw new Error('Not authenticated')
    return tok
  }

  async function readData(dataType) {
    const tok = getToken()
    const fileName = FILE_NAMES[dataType]
    if (!fileName) throw new Error(`Unknown data type: ${dataType}`)

    loadingCount.value++
    driveError.value = null
    try {
      const fileId = await ensureFile(fileName, tok)
      return await driveFetchJson(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        tok
      )
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function writeData(dataType, data) {
    const tok = getToken()
    const fileName = FILE_NAMES[dataType]
    if (!fileName) throw new Error(`Unknown data type: ${dataType}`)

    loadingCount.value++
    driveError.value = null
    try {
      const fileId = await ensureFile(fileName, tok)
      await driveFetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        tok,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }
      )
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function listFolderItems(folderId) {
    const tok = getToken()

    loadingCount.value++
    driveError.value = null
    try {
      const data = await driveFetchJson(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&orderBy=name&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink)`,
        tok
      )
      return data.files || []
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function readProjectData(projectId, projectName, dataType) {
    const tok = getToken()
    const fileName = `ckes_${dataType}.json`
    loadingCount.value++
    driveError.value = null
    try {
      const folderId = await ensureProjectFolder(projectId, projectName)
      const fileId = await ensureFileInFolder(
        fileName,
        folderId,
        `proj_file_${projectId}_${dataType}`,
        tok
      )
      return await driveFetchJson(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        tok
      )
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function writeProjectData(projectId, projectName, dataType, data) {
    const tok = getToken()
    const fileName = `ckes_${dataType}.json`
    loadingCount.value++
    driveError.value = null
    try {
      const folderId = await ensureProjectFolder(projectId, projectName)
      const fileId = await ensureFileInFolder(
        fileName,
        folderId,
        `proj_file_${projectId}_${dataType}`,
        tok
      )
      await driveFetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        tok,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }
      )
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function listAppFolder() {
    const tok = getToken()
    const appFolderId = await ensureAppFolder(tok)
    return listFolderItems(appFolderId)
  }

  async function ensureProjectFolder(projectId, projectName) {
    const tok = getToken()
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
    const tok = getToken()
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
    } catch (err) {
      console.error('Failed to delete project folder:', err)
    }

    removeCache(cacheKey)
  }

  async function renameProjectFolder(projectId, oldName, newName) {
    const tok = getToken()
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
    const tok = getToken()

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
      return await res.json()
    } catch (err) {
      driveError.value = err.message
      throw err
    } finally {
      loadingCount.value--
    }
  }

  async function ensureProjectSubfolder(projectId, projectName, subfolderName) {
    const tok = getToken()
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
    const tok = getToken()

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
    const tok = getToken()

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
    listAppFolder,
    listFolderItems,
    ensureProjectFolder,
    deleteProjectFolder,
    renameProjectFolder,
    listProjectFiles,
    listProjectFilesByCategory,
    uploadProjectFile,
    uploadProjectFileToCategory,
    uploadFileToFolder,
    downloadFile,
    deleteDriveFile,
    invalidateProjectFolderCache,
    invalidateAllCache,
    loading,
    driveError
  }
}
