<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          <template v-if="inProject">
            <q-btn
              flat
              dense
              icon="arrow_back"
              to="/projects"
              class="q-mr-sm"
            />
            {{ projectName }}
          </template>
          <template v-else> CKES 專案管理系統 </template>
        </q-toolbar-title>

        <template v-if="isAuthenticated && user">
          <q-btn
            flat
            round
            :icon="syncing ? 'sync' : !online ? 'cloud_off' : 'cloud_done'"
            :color="syncing ? 'info' : !online ? 'warning' : 'white'"
            :class="syncing ? 'spin-animation' : ''"
            :title="syncing ? '同步中…' : !online ? '離線模式' : '已連線'"
            @click="handleManualSync"
          />

          <q-btn flat round :title="user.name">
            <q-avatar size="32px">
              <img :src="user.picture" :alt="user.name" />
            </q-avatar>
            <q-menu auto-close>
              <q-list style="min-width: 150px">
                <q-item clickable @click="handleManualSync">
                  <q-item-section avatar>
                    <q-icon name="sync" />
                  </q-item-section>
                  <q-item-section>手動同步</q-item-section>
                </q-item>
                <q-item clickable @click="handleClearCache">
                  <q-item-section avatar>
                    <q-icon name="delete_sweep" />
                  </q-item-section>
                  <q-item-section>清除快取</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable @click="signOut">
                  <q-item-section avatar>
                    <q-icon name="logout" />
                  </q-item-section>
                  <q-item-section>登出</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </template>
        <template v-else>
          <q-btn
            color="primary"
            unelevated
            label="Google 登入"
            icon="login"
            @click="signIn"
          />
        </template>

        <q-select
          v-model="themeName"
          :options="themes"
          dense
          borderless
          emit-value
          map-options
          options-dense
          class="q-mr-sm"
          style="min-width: 110px"
        >
          <template #append>
            <q-icon name="palette" size="xs" />
          </template>
        </q-select>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <template v-if="inProject">
          <q-item-label header> 專案選單 </q-item-label>

          <q-item clickable to="/" exact>
            <q-item-section avatar>
              <q-icon name="home" />
            </q-item-section>
            <q-item-section>首頁</q-item-section>
          </q-item>

          <q-separator />

          <q-item clickable :to="`/projects/${projectId}`" exact>
            <q-item-section avatar>
              <q-icon name="dashboard" />
            </q-item-section>
            <q-item-section>儀表板</q-item-section>
          </q-item>

          <q-item clickable :to="`/projects/${projectId}/resources`">
            <q-item-section avatar>
              <q-icon name="folder" />
            </q-item-section>
            <q-item-section>資源管理</q-item-section>
          </q-item>

          <q-item clickable :to="`/projects/${projectId}/tasks`">
            <q-item-section avatar>
              <q-icon name="checklist" />
            </q-item-section>
            <q-item-section>任務管理</q-item-section>
          </q-item>

          <q-item clickable :to="`/projects/${projectId}/purchase-requests`">
            <q-item-section avatar>
              <q-icon name="receipt" />
            </q-item-section>
            <q-item-section>請購單</q-item-section>
          </q-item>
        </template>

        <template v-else>
          <q-item-label v-if="isAuthenticated" header> 功能選單 </q-item-label>

          <q-item clickable to="/" exact>
            <q-item-section avatar>
              <q-icon name="home" />
            </q-item-section>
            <q-item-section>首頁</q-item-section>
          </q-item>

          <q-item v-if="isAuthenticated" clickable to="/projects">
            <q-item-section avatar>
              <q-icon name="folder_open" />
            </q-item-section>
            <q-item-section>專案管理</q-item-section>
          </q-item>

          <q-item v-if="isAuthenticated" clickable to="/contacts">
            <q-item-section avatar>
              <q-icon name="contacts" />
            </q-item-section>
            <q-item-section>聯絡人管理</q-item-section>
          </q-item>

          <q-item v-if="isAuthenticated" clickable to="/purchase-requests">
            <q-item-section avatar>
              <q-icon name="receipt" />
            </q-item-section>
            <q-item-section>請購單管理</q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
      <q-inner-loading :showing="loading">
        <q-spinner size="50px" color="primary" />
        <div class="q-mt-sm text-grey-8">資料讀取中…</div>
      </q-inner-loading>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTheme } from '@/composables/useTheme.js'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useGoogleAuth } from '@/composables/useGoogleAuth.js'
import { useDriveStorage } from '@/composables/useDriveStorage.js'
import { useProjectStore } from '@/stores/projectStore.js'
import {
  isSyncInProgress,
  getOnlineStatus,
  processSyncQueue,
  startBackgroundSync
} from '@/utils/syncManager.js'
import {
  clearAllCache,
  getCacheStats,
  clearAllData
} from '@/utils/cacheLayer.js'

const route = useRoute()
const projectStore = useProjectStore()
const $q = useQuasar()
const { user, isAuthenticated, signIn, signOut } = useGoogleAuth()
const { loading } = useDriveStorage()
const { themes, currentTheme, setTheme } = useTheme()

const leftDrawerOpen = ref(false)
const syncing = ref(false)
const online = ref(navigator.onLine)

const projectId = computed(() => route.params.projectId)
const inProject = computed(() => !!projectId.value)
const projectName = computed(() => {
  if (!projectId.value) return ''
  const p = projectStore.find(projectId.value)
  return p ? p.name : ''
})

const themeName = computed({
  get: () => currentTheme.value,
  set: val => setTheme(val)
})

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

async function handleManualSync() {
  syncing.value = true
  $q.notify({ type: 'info', message: '開始同步資料…', timeout: 1000 })
  try {
    await processSyncQueue()
    $q.notify({ type: 'positive', message: '資料同步完成', timeout: 2000 })
  } catch {
    $q.notify({
      type: 'negative',
      message: '同步失敗，請稍後再試',
      timeout: 3000
    })
  } finally {
    syncing.value = false
  }
}

async function handleClearCache() {
  $q.dialog({
    title: '清除本地快取',
    message: '清除後下次讀取將重新從雲端下載資料。待同步的變更不會遺失。',
    cancel: true,
    ok: '確定清除'
  }).onOk(async () => {
    await clearAllCache()
    $q.notify({ type: 'positive', message: '本地快取已清除', timeout: 2000 })
  })
}

function handleOffline() {
  online.value = false
  $q.notify({
    type: 'warning',
    message: '目前為離線模式，資料將於連線後自動同步',
    timeout: 0,
    actions: [{ icon: 'close', round: true }]
  })
}

function handleOnline() {
  online.value = true
  $q.notify({
    type: 'positive',
    message: '網路已恢復，開始背景同步',
    timeout: 2000
  })
  processSyncQueue()
}

let syncPollTimer = null

onMounted(() => {
  if (projectId.value) {
    projectStore.load()
  }
  startBackgroundSync()
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  syncPollTimer = setInterval(() => {
    syncing.value = isSyncInProgress().value
    online.value = getOnlineStatus().value
  }, 1000)
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  if (syncPollTimer) clearInterval(syncPollTimer)
})
</script>

<style>
.spin-animation {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
