<template>
  <div class="column flex-center" style="min-height: 70vh">
    <div class="text-center q-pa-md">
      <div class="text-h2 text-weight-bold text-primary q-mb-md">
        CKES 專案管理系統
      </div>
      <div class="text-h5 text-grey-7 q-mb-lg">
        學校行政專案，智慧管理每一個環節
      </div>
      <template v-if="isAuthenticated">
        <div class="row justify-center q-gutter-md q-mt-lg">
          <q-btn
            color="primary"
            size="lg"
            icon="folder_open"
            label="專案列表"
            to="/projects"
          />
          <q-btn
            color="secondary"
            size="lg"
            icon="contacts"
            label="聯絡人管理"
            to="/contacts"
          />
          <q-btn
            color="accent"
            size="lg"
            icon="cloud"
            label="雲端硬碟"
            to="/drive"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useGoogleAuth } from '@/composables/useGoogleAuth.js'

const { isAuthenticated } = useGoogleAuth()
</script>
