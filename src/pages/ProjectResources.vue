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
      <q-btn-dropdown color="primary" icon="add" label="新增" class="q-mr-sm">
        <q-list>
          <q-item clickable v-close-popup @click="showNewDialog('doc')">
            <q-item-section avatar>
              <q-icon name="description" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Google 文件</q-item-label>
              <q-item-label caption>建立線上文件</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="showNewDialog('sheet')">
            <q-item-section avatar>
              <q-icon name="table_chart" color="green" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Google 試算表</q-item-label>
              <q-item-label caption>建立線上試算表</q-item-label>
            </q-item-section>
          </q-item>
          <q-separator />
          <q-item clickable v-close-popup @click="triggerUpload">
            <q-item-section avatar>
              <q-icon name="upload" color="grey" />
            </q-item-section>
            <q-item-section>
              <q-item-label>上傳檔案</q-item-label>
              <q-item-label caption>上傳本機檔案</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
      <q-btn
        color="secondary"
        icon="cloud"
        label="開啟專案雲端硬碟"
        @click="openCloudDrive"
        class="q-ml-sm"
      />
      <input
        ref="fileInput"
        type="file"
        style="display: none"
        @change="onFileSelected"
      />
    </div>

    <q-banner class="bg-info text-white q-mb-md" rounded>
      <template v-slot:avatar>
        <q-icon name="info" />
      </template>
      <div>
        為保護您的隱私，本應用程式僅能存取透過本系統建立的檔案，無法讀取您自行在雲端硬碟上傳或建立的檔案。
      </div>
      <div>
        ckes_tasks.json、ckes_file_registry.json 為專案資料庫，請勿編輯或刪除。
      </div>
    </q-banner>

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
              :name="fileIcon(props.row)"
              color="primary"
              size="sm"
              class="q-mr-sm"
            />
            <a
              class="text-primary cursor-pointer"
              style="text-decoration: none"
              @click="openFile(props.row)"
            >
              {{ props.row.name }}
            </a>
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-category="props">
        <q-td :props="props">
          <q-chip size="sm" dense>
            {{ props.row._category || "其他" }}
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

    <q-dialog v-model="newDialog.show">
      <q-card style="min-width: 450px">
        <q-card-section>
          <div class="text-h6">
            {{
              newDialog.type === "doc"
                ? "新增 Google 文件"
                : "新增 Google 試算表"
            }}
          </div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input
            v-model="newDialog.title"
            label="名稱"
            outlined
            dense
            autofocus
            :rules="[(v) => !!v || '請輸入名稱']"
          />
          <q-select
            v-model="newDialog.category"
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
            label="建立"
            :disable="!newDialog.title || creating"
            :loading="creating"
            @click="doCreateDoc"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

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
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useProjectStore } from "@/stores/projectStore.js";
import { useDriveStorage } from "@/composables/useDriveStorage.js";
import { useGoogleDocs } from "@/composables/useGoogleDocs.js";
import { useGoogleAuth } from "@/composables/useGoogleAuth.js";
import { useQuasar } from "quasar";

const route = useRoute();
const $q = useQuasar();
const { user } = useGoogleAuth();
const projectStore = useProjectStore();
const {
  uploadProjectFileToCategory,
  downloadFile,
  deleteDriveFile,
  ensureProjectFolder,
  ensureProjectSubfolder,
  addToRegistry,
  removeFromRegistry,
  listRegistryFiles,
  loading,
} = useDriveStorage();

const projectId = computed(() => route.params.projectId);
const projectName = computed(() => {
  const p = projectStore.find(projectId.value);
  return p ? p.name : "";
});

const files = ref([]);
const error = ref(null);
const deleteDialog = ref(false);
const toDelete = ref(null);
const uploadDialog = ref(false);
const uploadFile = ref(null);
const uploadCategory = ref("其他");
const categoryFilter = ref(null);

const {
  createGoogleDoc,
  createGoogleSheet,
  loading: docCreating,
  error: docError,
} = useGoogleDocs();
const creating = ref(false);
const newDialog = ref({
  show: false,
  type: "doc",
  title: "",
  category: "其他",
});

const categoryOptions = [
  { label: "公文", value: "公文" },
  { label: "附件", value: "附件" },
  { label: "報表", value: "報表" },
  { label: "其他", value: "其他" },
];

const filteredFiles = computed(() => {
  if (!categoryFilter.value) return [...files.value];
  return files.value.filter(
    (f) => (f._category || "其他") === categoryFilter.value,
  );
});

const columns = [
  {
    name: "name",
    label: "檔案名稱",
    field: "name",
    align: "left",
    sortable: true,
  },
  { name: "category", label: "分類", field: "_category", align: "center" },
  { name: "size", label: "大小", field: "size", align: "right" },
  {
    name: "modifiedTime",
    label: "上傳時間",
    field: "modifiedTime",
    align: "left",
  },
  { name: "actions", label: "操作", field: "actions", align: "center" },
];

onMounted(async () => {
  await projectStore.load();
  await loadFiles();
});

function formatSize(bytes) {
  if (!bytes) return "-";
  const n = parseInt(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function openFile(file) {
  const baseUrl =
    file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
  const url = user.value?.email
    ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}authuser=${encodeURIComponent(user.value.email)}`
    : baseUrl;
  window.open(url, "_blank");
}

async function openCloudDrive() {
  try {
    const folderId = await ensureProjectFolder(
      projectId.value,
      projectName.value,
    );
    const url = `https://drive.google.com/drive/folders/${folderId}`;
    const target = user.value?.email
      ? `${url}?authuser=${encodeURIComponent(user.value.email)}`
      : url;
    window.open(target, "_blank");
  } catch (err) {
    $q.notify({
      type: "negative",
      message: "無法開啟雲端硬碟：" + err.message,
    });
  }
}

function fileIcon(file) {
  if (file.mimeType === "application/vnd.google-apps.document")
    return "description";
  if (file.mimeType === "application/vnd.google-apps.spreadsheet")
    return "table_chart";
  return "insert_drive_file";
}

function showNewDialog(type) {
  newDialog.value = { show: true, type, title: "", category: "其他" };
}

async function doCreateDoc() {
  const { title, type, category } = newDialog.value;
  if (!title) return;
  creating.value = true;
  error.value = null;
  try {
    const folderId = await ensureProjectSubfolder(
      projectId.value,
      projectName.value,
      category,
    );
    const fn = type === "doc" ? createGoogleDoc : createGoogleSheet;
    const file = await fn({ title, parentFolderId: folderId });
    file._category = category;
    files.value.push(file);
    await addToRegistry(projectId.value, projectName.value, file, category);
    $q.notify({ type: "positive", message: `「${title}」建立成功` });
    newDialog.value.show = false;
  } catch (err) {
    error.value = err.message;
    $q.notify({ type: "negative", message: "建立失敗：" + err.message });
  } finally {
    creating.value = false;
  }
}

function triggerUpload() {
  uploadFile.value = null;
  uploadCategory.value = "其他";
  uploadDialog.value = true;
}

async function doUpload() {
  if (!uploadFile.value) return;
  error.value = null;
  try {
    const uploaded = await uploadProjectFileToCategory(
      projectId.value,
      projectName.value,
      uploadCategory.value,
      uploadFile.value,
    );
    uploaded._category = uploadCategory.value;
    files.value.push(uploaded);
    await addToRegistry(
      projectId.value,
      projectName.value,
      uploaded,
      uploadCategory.value,
    );
    $q.notify({
      type: "positive",
      message: `「${uploadFile.value.name}」上傳成功`,
    });
    uploadDialog.value = false;
  } catch (err) {
    error.value = err.message;
    $q.notify({ type: "negative", message: "上傳失敗：" + err.message });
  }
}

async function loadFiles() {
  error.value = null;
  try {
    files.value = await listRegistryFiles(projectId.value, projectName.value);
  } catch (err) {
    error.value = err.message;
  }
}

async function doDownload(row) {
  try {
    const blob = await downloadFile(row.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = row.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    error.value = err.message;
    $q.notify({ type: "negative", message: "下載失敗：" + err.message });
  }
}

async function copyLink(row) {
  const url = `https://drive.google.com/file/d/${row.id}/view`;
  try {
    await navigator.clipboard.writeText(url);
    $q.notify({ type: "positive", message: "連結已複製到剪貼簿" });
  } catch {
    $q.notify({ type: "negative", message: "複製失敗" });
  }
}

function confirmDelete(row) {
  toDelete.value = row;
  deleteDialog.value = true;
}

async function doDelete() {
  const item = toDelete.value;
  if (!item) return;
  try {
    await deleteDriveFile(item.id);
    files.value = files.value.filter((f) => f.id !== item.id);
    await removeFromRegistry(projectId.value, projectName.value, item.id);
    $q.notify({ type: "positive", message: `「${item.name}」已刪除` });
  } catch (err) {
    error.value = err.message;
    $q.notify({ type: "negative", message: "刪除失敗：" + err.message });
  }
  toDelete.value = null;
}
</script>
