<template>
  <div class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">資源管理</div>
      <q-space />
      <q-select
        v-model="categoryFilter"
        :options="categoryOptions"
        label="分類篩選"
        dense
        outlined
        emit-value
        map-options
        clearable
        style="min-width: 150px"
        class="q-mr-sm"
      />
      <q-btn
        color="primary"
        icon="upload"
        label="上傳檔案"
        @click="triggerUpload"
      />
      <input
        ref="fileInput"
        type="file"
        style="display: none"
        @change="onFileSelected"
      />
    </div>

    <q-banner v-if="error" class="bg-negative text-white q-mb-md" rounded>
      <template v-slot:avatar>
        <q-icon name="error" />
      </template>
      {{ error }}
    </q-banner>

    <q-table
      :rows="filteredFiles"
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
              name="insert_drive_file"
              color="primary"
              size="sm"
              class="q-mr-sm"
            />
            <span>{{ props.row.name }}</span>
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-category="props">
        <q-td :props="props">
          <q-chip size="sm" dense>
            {{ props.row._category || '其他' }}
          </q-chip>
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
          <q-btn flat round icon="download" @click="doDownload(props.row)">
            <q-tooltip>下載</q-tooltip>
          </q-btn>
          <q-btn flat round icon="link" @click="copyLink(props.row)">
            <q-tooltip>複製連結</q-tooltip>
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
          尚無資源檔案，點擊上方「上傳檔案」按鈕新增
        </div>
      </template>
    </q-table>

    <q-dialog v-model="uploadDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">上傳檔案</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-file v-model="uploadFile" label="選擇檔案" outlined dense />
          <q-select
            v-model="uploadCategory"
            :options="categoryOptions"
            label="分類"
            outlined
            dense
            emit-value
            map-options
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup />
          <q-btn
            color="primary"
            label="上傳"
            :disable="!uploadFile"
            @click="doUpload"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteDialog">
      <q-card>
        <q-card-section>確定刪除「{{ toDelete?.name }}」？</q-card-section>
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
import { useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/projectStore.js'
import { useDriveStorage } from '@/composables/useDriveStorage.js'
import { useQuasar } from 'quasar'

const route = useRoute()
const $q = useQuasar()
const projectStore = useProjectStore()
const {
  listProjectFilesByCategory,
  uploadProjectFileToCategory,
  downloadFile,
  deleteDriveFile,
  loading
} = useDriveStorage()

const projectId = computed(() => route.params.projectId)
const projectName = computed(() => {
  const p = projectStore.find(projectId.value)
  return p ? p.name : ''
})

const files = ref([])
const error = ref(null)
const deleteDialog = ref(false)
const toDelete = ref(null)
const uploadDialog = ref(false)
const uploadFile = ref(null)
const uploadCategory = ref('其他')
const categoryFilter = ref(null)

const categoryOptions = [
  { label: '公文', value: '公文' },
  { label: '附件', value: '附件' },
  { label: '報表', value: '報表' },
  { label: '其他', value: '其他' }
]

const filteredFiles = computed(() => {
  if (!categoryFilter.value) return files.value
  return files.value.filter(
    f => (f._category || '其他') === categoryFilter.value
  )
})

const columns = [
  {
    name: 'name',
    label: '檔案名稱',
    field: 'name',
    align: 'left',
    sortable: true
  },
  { name: 'category', label: '分類', field: '_category', align: 'center' },
  { name: 'size', label: '大小', field: 'size', align: 'right' },
  {
    name: 'modifiedTime',
    label: '上傳時間',
    field: 'modifiedTime',
    align: 'left'
  },
  { name: 'actions', label: '操作', field: 'actions', align: 'center' }
]

onMounted(async () => {
  await projectStore.load()
  await loadFiles()
})

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

function triggerUpload() {
  uploadFile.value = null
  uploadCategory.value = '其他'
  uploadDialog.value = true
}

async function doUpload() {
  if (!uploadFile.value) return
  error.value = null
  try {
    const uploaded = await uploadProjectFileToCategory(
      projectId.value,
      projectName.value,
      uploadCategory.value,
      uploadFile.value
    )
    uploaded._category = uploadCategory.value
    files.value.push(uploaded)
    $q.notify({
      type: 'positive',
      message: `「${uploadFile.value.name}」上傳成功`
    })
    uploadDialog.value = false
  } catch (err) {
    error.value = err.message
    $q.notify({ type: 'negative', message: '上傳失敗：' + err.message })
  }
}

async function loadFiles() {
  error.value = null
  try {
    files.value = await listProjectFilesByCategory(
      projectId.value,
      projectName.value
    )
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
    $q.notify({ type: 'negative', message: '下載失敗：' + err.message })
  }
}

async function copyLink(row) {
  const url = `https://drive.google.com/file/d/${row.id}/view`
  try {
    await navigator.clipboard.writeText(url)
    $q.notify({ type: 'positive', message: '連結已複製到剪貼簿' })
  } catch {
    $q.notify({ type: 'negative', message: '複製失敗' })
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
    files.value = files.value.filter(f => f.id !== item.id)
    $q.notify({ type: 'positive', message: `「${item.name}」已刪除` })
  } catch (err) {
    error.value = err.message
    $q.notify({ type: 'negative', message: '刪除失敗：' + err.message })
  }
  toDelete.value = null
}
</script>
