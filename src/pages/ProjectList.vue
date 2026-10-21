<template>
  <div class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">專案管理</div>
      <q-space />
      <q-btn
        v-if="!editingId"
        color="primary"
        icon="add"
        label="新增專案"
        @click="startAdd"
      />
    </div>

    <div v-if="!editingId" class="row items-center q-mb-md">
      <q-select
        v-model="projectStore.filter"
        :options="filterOptions"
        label="篩選"
        dense
        outlined
        emit-value
        map-options
        style="min-width: 180px"
        @update:model-value="projectStore.setFilter"
      />
    </div>

    <q-banner
      v-if="purchaseRequestStore.loadError"
      dense
      rounded
      class="bg-negative text-white q-mb-md"
    >
      <template v-slot:avatar>
        <q-icon name="error" />
      </template>
      請購單資料載入失敗，剩餘經費暫無法計算。
      <template v-slot:action>
        <q-btn
          flat
          color="white"
          label="重試"
          :loading="purchaseRequestsLoading"
          @click="loadPurchaseRequests"
        />
      </template>
    </q-banner>

    <div v-if="editingId">
      <q-card flat bordered class="q-mb-lg">
        <q-card-section>
          <div class="text-h6 q-mb-sm">
            {{ editingId === "new" ? "新增專案" : "編輯專案" }}
          </div>
          <ProjectForm
            :key="editingId"
            :project-id="editingId === 'new' ? null : editingId"
            @saved="onSaved"
            @cancel="editingId = null"
          />
        </q-card-section>
      </q-card>
    </div>

    <q-table
      v-if="!editingId"
      :rows="tableRows"
      :columns="columns"
      row-key="id"
      flat
      bordered
      :pagination="{
        sortBy: null,
        descending: false,
        page: 1,
        rowsPerPage: 10,
      }"
    >
      <template v-slot:body-cell-name="props">
        <q-td :props="props">
          <router-link
            :to="`/projects/${props.row.id}`"
            class="text-primary text-weight-medium"
            style="text-decoration: none"
          >
            {{ props.row.name }}
          </router-link>
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip
            :color="props.row.status === 'active' ? 'positive' : 'grey'"
            text-color="white"
            size="sm"
          >
            {{ props.row.status === "active" ? "進行中" : "結案" }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-remaining="props">
        <q-td :props="props" :class="remainingCellClass(props.row)">
          <template v-if="purchaseRequestsLoading">…</template>
          <template v-else-if="purchaseRequestStore.loadError">-</template>
          <template v-else>
            NT$ {{ props.row._remaining.toLocaleString() }}
            <q-tooltip>
              核定 {{ budgetLabel(props.row) }} − 已動支 NT$
              {{ props.row._disbursed.toLocaleString() }}
            </q-tooltip>
          </template>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            flat
            round
            icon="folder"
            color="positive"
            :to="`/projects/${props.row.id}/resources`"
          >
            <q-tooltip>資源檔案</q-tooltip>
          </q-btn>
          <q-btn flat round icon="edit" @click="startEdit(props.row.id)">
            <q-tooltip>編輯</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            icon="content_copy"
            color="primary"
            @click="startClone(props.row)"
          >
            <q-tooltip>複製</q-tooltip>
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
    </q-table>

    <q-dialog v-model="deleteDialog">
      <q-card>
        <q-card-section>確定刪除此專案？</q-card-section>
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

    <ProjectCloneDialog
      v-model="cloneDialog"
      :source-project="cloneSource"
      :existing-project-names="existingNames"
      :loading="projectStore.cloning"
      :error="projectStore.cloneError"
      @confirm="doClone"
    />

    <div v-if="!editingId" class="q-mt-lg">
      <div class="text-h6 q-mb-md">任務統計</div>
      <div v-for="project in targetProjects" :key="project.id" class="q-mb-md">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">
              <router-link
                :to="`/projects/${project.id}/tasks`"
                class="text-primary text-decoration-none"
              >
                {{ project.name }}-任務統計
                <q-icon name="open_in_new" size="16px" class="q-ml-xs" />
              </router-link>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <TaskStatsCard
              :tasks="tasksByProject[project.id] || []"
              :loading="loadingTasks"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProjectStore } from "@/stores/projectStore.js";
import { useTaskStore } from "@/stores/taskStore.js";
import { usePurchaseRequestStore } from "@/stores/purchaseRequestStore.js";
import { useDriveStorage } from "@/composables/useDriveStorage.js";
import { projectDisbursed, projectRemaining } from "@/utils/projectBudget.js";
import ProjectForm from "@/components/ProjectForm.vue";
import ProjectCloneDialog from "@/components/ProjectCloneDialog.vue";
import TaskStatsCard from "@/components/TaskStatsCard.vue";

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const taskStore = useTaskStore();
const purchaseRequestStore = usePurchaseRequestStore();
const { readProjectData } = useDriveStorage();
const deleteDialog = ref(false);
const toDelete = ref(null);
const editingId = ref(null);
const cloneDialog = ref(false);
const cloneSource = ref(null);
const tasksByProject = ref({});
const loadingTasks = ref(false);
const purchaseRequestsLoading = ref(true);

const filterOptions = [
  { label: "進行中", value: "active" },
  { label: "已結案", value: "closed" },
  { label: "所有專案", value: "all" },
];

const columns = [
  {
    name: "name",
    label: "專案名稱",
    field: "name",
    align: "left",
    sortable: true,
  },
  { name: "status", label: "狀態", field: "status", align: "center" },
  {
    name: "budget",
    label: "核定金額",
    field: "budget",
    align: "right",
    format: (v) =>
      v === null || v === undefined || v === ""
        ? "-"
        : "NT$ " + Number(v).toLocaleString(),
  },
  {
    name: "remaining",
    label: "剩餘經費",
    field: "_remaining",
    align: "right",
  },
  { name: "createdAt", label: "建立時間", field: "createdAt", align: "left" },
  { name: "actions", label: "操作", field: "actions", align: "center" },
];

const currentProjectId = computed(() => route.params.projectId);

const existingNames = computed(() => projectStore.projects.map((p) => p.name));

const tableRows = computed(() =>
  projectStore.filteredProjects.map((project) => ({
    ...project,
    _disbursed: projectDisbursed(project.id, purchaseRequestStore.requests),
    _remaining: projectRemaining(project, purchaseRequestStore.requests),
  })),
);

const targetProjects = computed(() => {
  if (projectStore.filter === "all") return projectStore.projects;
  if (projectStore.filter === "closed") {
    return projectStore.projects.filter((p) => p.status === "closed");
  }
  return projectStore.projects.filter((p) => p.status === "active");
});

function budgetLabel(row) {
  const budget = row.budget;
  if (budget === null || budget === undefined || budget === "") return "未填";
  return "NT$ " + Number(budget).toLocaleString();
}

function remainingCellClass(row) {
  if (purchaseRequestsLoading.value || purchaseRequestStore.loadError) return "";
  return row._remaining < 0 ? "text-negative text-weight-medium" : "";
}

async function loadPurchaseRequests() {
  purchaseRequestsLoading.value = true;
  try {
    await purchaseRequestStore.load();
  } finally {
    purchaseRequestsLoading.value = false;
  }
}

async function loadProjectTasks() {
  const targets = targetProjects.value;
  if (targets.length === 0) {
    tasksByProject.value = {};
    return;
  }
  loadingTasks.value = true;
  try {
    const results = await Promise.all(
      targets.map(async (project) => {
        try {
          const data = await readProjectData(project.id, null, "tasks");
          return {
            projectId: project.id,
            tasks: Array.isArray(data)
              ? data.map(taskStore.migrateLegacyTask)
              : [],
          };
        } catch {
          return { projectId: project.id, tasks: [] };
        }
      }),
    );
    const map = {};
    for (const result of results) {
      map[result.projectId] = result.tasks;
    }
    tasksByProject.value = map;
  } catch {
    tasksByProject.value = {};
  } finally {
    loadingTasks.value = false;
  }
}

onMounted(async () => {
  await Promise.all([projectStore.load(), loadPurchaseRequests()]);
  await loadProjectTasks();
});

watch(
  () => projectStore.filter,
  () => {
    loadProjectTasks();
  },
);

function startAdd() {
  editingId.value = "new";
}

function startEdit(id) {
  editingId.value = id;
}

function onSaved() {
  editingId.value = null;
}

function confirmDelete(project) {
  toDelete.value = project;
  deleteDialog.value = true;
}

async function doDelete() {
  if (toDelete.value) {
    await projectStore.remove(toDelete.value.id);
    toDelete.value = null;
  }
}

function startClone(project) {
  cloneSource.value = project;
  cloneDialog.value = true;
}

async function doClone({ name, copyResources }) {
  if (!cloneSource.value) return;
  try {
    const newProject = await projectStore.duplicate(
      cloneSource.value.id,
      name,
      copyResources,
    );
    cloneDialog.value = false;
    cloneSource.value = null;
    router.push(`/projects/${newProject.id}`);
  } catch {
    // error is displayed via projectStore.cloneError
  }
}
</script>
