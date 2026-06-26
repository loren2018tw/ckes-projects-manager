import { ref } from 'vue'
import { useGoogleAuth } from './useGoogleAuth.js'
import { removeCachedData } from '../utils/cacheLayer.js'

export function useGoogleDocs() {
  const loading = ref(false)
  const error = ref(null)

  async function getToken() {
    const { accessToken, silentRefreshToken } = useGoogleAuth()
    let tok = accessToken.value
    if (!tok) {
      tok = await silentRefreshToken()
    }
    if (!tok) {
      throw new Error('Not authenticated')
    }
    return tok
  }

  async function createGoogleDoc({ title, parentFolderId }) {
    loading.value = true
    error.value = null
    try {
      const tok = await getToken()

      const res = await fetch(
        'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,size,modifiedTime,webViewLink,iconLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tok}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: title,
            parents: [parentFolderId],
            mimeType: 'application/vnd.google-apps.document'
          })
        }
      )
      if (!res.ok) throw new Error(`建立文件失敗: ${res.status}`)
      const file = await res.json()

      await removeCachedData(`folder_files_${parentFolderId}`)

      return file
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createGoogleSheet({ title, parentFolderId }) {
    loading.value = true
    error.value = null
    try {
      const tok = await getToken()

      const res = await fetch(
        'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,size,modifiedTime,webViewLink,iconLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tok}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: title,
            parents: [parentFolderId],
            mimeType: 'application/vnd.google-apps.spreadsheet'
          })
        }
      )
      if (!res.ok) throw new Error(`建立試算表失敗: ${res.status}`)
      const file = await res.json()

      await removeCachedData(`folder_files_${parentFolderId}`)

      return file
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return { createGoogleDoc, createGoogleSheet, loading, error }
}
