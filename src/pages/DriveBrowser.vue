<template>
  <div class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">雲端硬碟 - CKES 專案資料</div>
      <q-space />
      <q-btn flat round icon="refresh" :loading="loading" @click="loadContents">
        <q-tooltip>重新整理</q-tooltip>
      </q-btn>
      <q-btn
        flat
        round
        icon="cloud_open"
        :href="driveUrl"
        target="_blank"
        rel="noopener"
      >
        <q-tooltip>在 Google Drive 中開啟</q-tooltip>
      </q-btn>
    </div>

    <q-banner v-if="error" class="bg-negative text-white q-mb-md" rounded>
      <template v-slot:avatar>
        <q-icon name="error" />
      </template>
      {{ error }}
    </q-banner>

    <q-table
      :rows="items"
      :columns="columns"
      row-key="id"
      flat
      bordered
      :loading="loading"
      :hide-pagination="true"
    >
      <template v-slot:body-cell-name="props">
        <q-td :props="props">
          <div class="row items-center no-wrap">
            <q-icon
              :name="
                props.row.mimeType === 'application/vnd.google-apps.folder'
                  ? 'folder'
                  : 'insert_drive_file'
              "
              :color="
                props.row.mimeType === 'application/vnd.google-apps.folder'
                  ? 'warning'
                  : 'primary'
              "
              size="sm"
              class="q-mr-sm"
            />
            <template
              v-if="props.row.mimeType === 'application/vnd.google-apps.folder'"
            >
              <router-link
                :to="openFolderLink(props.row)"
                class="text-primary cursor-pointer"
              >
                {{ props.row.name }}
              </router-link>
            </template>
            <template v-else>
              <span>{{ props.row.name }}</span>
            </template>
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-size="props">
        <q-td :props="props">
          {{ formatSize(props.row.size) }}
        </q-td>
      </template>

      <template v-slot:body-cell-modifiedTime="props">
        <q-td :props="props">
          {{ formatDate(props.row.modifiedTime) }}
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            v-if="props.row.mimeType !== 'application/vnd.google-apps.folder'"
            flat
            round
            icon="download"
            @click="doDownload(props.row)"
          >
            <q-tooltip>下載</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            icon="delete"
            color="negative"
            @click="confirmDelete(props.row)"
          >
            <q-tooltip>刪除</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <template v-slot:no-data>
        <div class="text-center q-pa-md text-grey">
          資料夾中沒有檔案或子資料夾
        </div>
      </template>
    </q-table>

    <q-dialog v-model="deleteDialog">
      <q-card>
        <q-card-section> 確定刪除「{{ toDelete?.name }}」？ </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup />
          <q-btn
            flat
            label="刪除"
            color="negative"
            v-close-popup
            @click="doDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useDriveStorage } from '@/composables/useDriveStorage.js'

const { listAppFolder, deleteDriveFile, downloadFile, loading } =
  useDriveStorage()

const items = ref([])
const error = ref(null)
const deleteDialog = ref(false)
const toDelete = ref(null)

const driveUrl = 'https://drive.google.com/drive/home'

const columns = [
  {
    name: 'name',
    label: '名稱',
    field: 'name',
    align: 'left',
    sortable: true
  },
  { name: 'size', label: '大小', field: 'size', align: 'right' },
  {
    name: 'modifiedTime',
    label: '修改時間',
    field: 'modifiedTime',
    align: 'left'
  },
  { name: 'actions', label: '操作', field: 'actions', align: 'center' }
]

onMounted(() => loadContents())

function openFolderLink(row) {
  return ''
}

function formatSize(bytes) {
  if (!bytes) return '-'
  const n = parseInt(bytes)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function loadContents() {
  error.value = null
  try {
    items.value = await listAppFolder()
  } catch (err) {
    error.value = err.message
  }
}

async function doDownload(row) {
  try {
    const blob = await downloadFile(row.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = row.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    error.value = err.message
  }
}

function confirmDelete(row) {
  toDelete.value = row
  deleteDialog.value = true
}

async function doDelete() {
  const item = toDelete.value
  if (!item) return
  try {
    await deleteDriveFile(item.id)
    items.value = items.value.filter(i => i.id !== item.id)
  } catch (err) {
    error.value = err.message
  }
  toDelete.value = null
}
</script>
