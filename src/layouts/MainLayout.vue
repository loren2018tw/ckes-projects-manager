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
          <q-btn flat round :title="user.name">
            <q-avatar size="32px">
              <img :src="user.picture" :alt="user.name" />
            </q-avatar>
            <q-menu auto-close>
              <q-list style="min-width: 150px">
                <q-item clickable @click="signOut">
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useGoogleAuth } from '@/composables/useGoogleAuth.js'
import { useDriveStorage } from '@/composables/useDriveStorage.js'
import { useProjectStore } from '@/stores/projectStore.js'

const route = useRoute()
const projectStore = useProjectStore()
const { user, isAuthenticated, signIn, signOut } = useGoogleAuth()
const { loading } = useDriveStorage()

const leftDrawerOpen = ref(false)

const projectId = computed(() => route.params.projectId)
const inProject = computed(() => !!projectId.value)
const projectName = computed(() => {
  if (!projectId.value) return ''
  const p = projectStore.find(projectId.value)
  return p ? p.name : ''
})

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

onMounted(() => {
  if (projectId.value) {
    projectStore.load()
  }
})
</script>
