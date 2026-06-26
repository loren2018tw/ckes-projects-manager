import { ref } from 'vue'

const user = ref(null)
const isAuthenticated = ref(false)
const accessToken = ref(null)
let tokenClient = null
let authInProgress = false
let refreshPromise = null

;(() => {
  const storedUser = localStorage.getItem('ckes_user_info')
  if (storedUser) {
    try {
      user.value = JSON.parse(storedUser)
      isAuthenticated.value = true
    } catch {
      localStorage.removeItem('ckes_user_info')
    }
  }
  const storedToken = sessionStorage.getItem('ckes_access_token')
  if (storedToken) {
    accessToken.value = storedToken
  }
})()

async function fetchUserInfo(token) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error(`Userinfo error: ${res.status}`)
    const info = await res.json()
    const mapped = {
      sub: info.sub,
      name: info.name,
      email: info.email,
      picture: info.picture
    }
    user.value = mapped
    isAuthenticated.value = true
    localStorage.setItem('ckes_user_info', JSON.stringify(mapped))
  } catch (err) {
    console.error('Failed to get user info:', err)
  }
}

function handleTokenResponse(response) {
  authInProgress = false
  if (response.error) {
    console.error('Token error:', response.error)
    return
  }
  if (response.access_token) {
    accessToken.value = response.access_token
    sessionStorage.setItem('ckes_access_token', response.access_token)
    fetchUserInfo(response.access_token)
  }
}

function requestDriveToken(silent = false) {
  if (authInProgress) return
  if (typeof google === 'undefined') return
  if (!tokenClient) {
    const initConfig = {
      client_id: import.meta.env.QCLI_GOOGLE_CLIENT_ID,
      scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
      callback: handleTokenResponse,
      error_callback: err => {
        authInProgress = false
        console.error('Token client error:', err)
      }
    }
    if (user.value?.email) {
      initConfig.hint = user.value.email
    }
    tokenClient = google.accounts.oauth2.initTokenClient(initConfig)
  }
  authInProgress = !silent
  tokenClient.requestAccessToken(
    silent ? { prompt: '' } : { prompt: 'select_account' }
  )
}

async function silentRefreshToken() {
  if (refreshPromise) return refreshPromise

  refreshPromise = new Promise(resolve => {
    if (typeof google === 'undefined') {
      resolve(null)
      return
    }
    const silentConfig = {
      client_id: import.meta.env.QCLI_GOOGLE_CLIENT_ID,
      scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
      callback: handleTokenResponse,
      error_callback: () => {
        authInProgress = false
      }
    }
    if (user.value?.email) {
      silentConfig.hint = user.value.email
    }
    tokenClient = google.accounts.oauth2.initTokenClient(silentConfig)
    if (authInProgress) {
      resolve(null)
      return
    }

    const origCallback = tokenClient.callback
    const origErrorCallback = tokenClient.error_callback

    authInProgress = true
    tokenClient.callback = response => {
      tokenClient.callback = origCallback
      tokenClient.error_callback = origErrorCallback
      authInProgress = false
      if (response.access_token) {
        handleTokenResponse(response)
        resolve(response.access_token)
      } else {
        resolve(null)
      }
    }
    tokenClient.error_callback = () => {
      tokenClient.callback = origCallback
      tokenClient.error_callback = origErrorCallback
      authInProgress = false
      resolve(null)
    }

    tokenClient.requestAccessToken({ prompt: '' })
  })

  refreshPromise.finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

export function useGoogleAuth() {
  function signIn() {
    requestDriveToken()
  }

  function signOut() {
    localStorage.removeItem('ckes_user_info')
    sessionStorage.removeItem('ckes_access_token')
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith('ckes_drive_cache_')) {
        sessionStorage.removeItem(key)
      }
    }
    try {
      import('../utils/syncManager.js').then(m => m.cleanupSyncListeners())
      import('../utils/cacheLayer.js').then(m => m.clearAllData())
    } catch {}
    user.value = null
    isAuthenticated.value = false
    accessToken.value = null
    window.location.hash = '#/'
  }

  return {
    user,
    isAuthenticated,
    accessToken,
    signIn,
    signOut,
    requestDriveToken,
    silentRefreshToken
  }
}
