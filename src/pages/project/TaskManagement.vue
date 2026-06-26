<template>
  <div class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">任務管理</div>
      <q-space />
      <q-btn
        color="primary"
        icon="add"
        label="新增任務"
        @click="openAddDialog"
      />
    </div>

    <q-banner
      v-if="taskStore.loadError"
      class="bg-negative text-white q-mb-md"
      rounded
    >
      <template v-slot:avatar>
        <q-icon name="error" />
      </template>
      {{ taskStore.loadError }}
    </q-banner>

    <div class="row items-center q-mb-sm">
      <q-btn-toggle
        v-model="viewMode"
        :options="[
          { label: '看板', value: 'kanban' },
          { label: '列表', value: 'list' }
        ]"
        toggle-color="primary"
        dense
        flat
        rounded
      />
      <q-space />
    </div>

    <template v-if="viewMode === 'list'">
      <q-table
        :rows="sortedTasks"
        :columns="columns"
        row-key="id"
        flat
        bordered
        :loading="taskStore.loading"
        :hide-pagination="true"
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-icon
              v-if="props.row.status === 'completed'"
              name="check_circle"
              color="positive"
              size="md"
            />
            <q-icon
              v-else-if="taskStore.isBlocked(taskStore.tasks, props.row)"
              name="lock"
              color="negative"
              size="md"
            />
            <q-icon
              v-else-if="props.row.status === 'in_progress'"
              name="schedule"
              color="primary"
              size="md"
            />
            <q-icon
              v-else
              name="radio_button_unchecked"
              color="grey"
              size="md"
            />
          </q-td>
        </template>

        <template v-slot:body-cell-startDate="props">
          <q-td :props="props">
            {{ formatDate(props.row.startDate) }}
          </q-td>
        </template>

        <template v-slot:body-cell-name="props">
          <q-td :props="props">
            <span
              :class="{
                'text-strikethrough': props.row.status === 'completed',
                'text-negative':
                  isOverdue(props.row.deadline) &&
                  props.row.status !== 'completed',
                'text-orange':
                  isDueSoon(props.row.deadline) &&
                  props.row.status !== 'completed'
              }"
            >
              {{ props.row.name }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-deadline="props">
          <q-td :props="props">
            <span
              :class="{
                'text-negative':
                  isOverdue(props.row.deadline) &&
                  props.row.status !== 'completed',
                'text-orange':
                  isDueSoon(props.row.deadline) &&
                  props.row.status !== 'completed'
              }"
            >
              {{ formatDate(props.row.deadline) }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-completedDate="props">
          <q-td :props="props">
            {{ formatDate(props.row.completedDate) }}
          </q-td>
        </template>

        <template v-slot:body-cell-description="props">
          <q-td :props="props">
            <span class="text-grey-8">{{ props.row.description || '-' }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-dependency="props">
          <q-td :props="props">
            <template v-if="props.row.predecessorId">
              {{ getTaskName(props.row.predecessorId) }}
              <q-chip size="sm" dense>
                {{ depLabel(props.row.dependencyType) }}
              </q-chip>
            </template>
            <span v-else class="text-grey">-</span>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat round icon="edit" @click="openEditDialog(props.row)">
              <q-tooltip>編輯</q-tooltip>
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
            尚無任務，點擊「新增任務」按鈕建立第一筆任務
          </div>
        </template>
      </q-table>

      <div class="text-h6 q-mt-lg q-mb-sm">甘特圖</div>
      <div class="gantt-wrap">
        <div class="gantt-header">
          <div class="gantt-name-header">任務</div>
          <div class="gantt-months">
            <div
              v-for="m in ganttMonths"
              :key="m.label"
              class="gantt-month"
              :style="{ width: m.width + 'px' }"
            >
              {{ m.label }}
            </div>
          </div>
        </div>
        <div
          class="gantt-body"
          :style="{ height: ganttTasks.length * 36 + 'px' }"
        >
          <svg
            class="gantt-svg"
            :width="ganttSvgW"
            :height="ganttTasks.length * 36"
          >
            <defs>
              <marker
                id="arr"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#888" />
              </marker>
            </defs>
            <line
              v-for="l in ganttTodayLine"
              :key="'tl'"
              :x1="l"
              y1="0"
              :x2="l"
              :y2="ganttTasks.length * 36"
              stroke="#f44336"
              stroke-width="1"
              stroke-dasharray="4"
            />
            <line
              v-for="dep in ganttArrows"
              :key="dep.id"
              :x1="dep.x1"
              :y1="dep.y1"
              :x2="dep.x2"
              :y2="dep.y2"
              stroke="#888"
              stroke-width="1.5"
              marker-end="url(#arr)"
            />
          </svg>
          <div
            v-for="(t, i) in ganttTasks"
            :key="t.id"
            class="gantt-row"
            :style="{ top: i * 36 + 'px' }"
          >
            <div class="gantt-name">{{ t.name }}</div>
            <div class="gantt-track">
              <div
                v-if="ganttBar(t).show"
                class="gantt-bar"
                :style="ganttBar(t).style"
                :class="ganttBar(t).cls"
              >
                <span class="gantt-bar-text">{{ ganttBar(t).label }}</span>
              </div>
            </div>
          </div>
          <div v-if="ganttTasks.length === 0" class="gantt-none"
            >尚無任務資料</div
          >
        </div>
      </div>
    </template>

    <template v-if="viewMode === 'kanban'">
      <div class="kanban-board">
        <div
          v-for="col in kanbanColumns"
          :key="col.status"
          class="kanban-column"
          :class="'kanban-col-' + col.status"
          @dragover.prevent="onDragOver"
          @drop="onDrop(col.status)"
        >
          <div class="kanban-col-header">
            <q-icon :name="col.icon" :color="col.color" size="sm" />
            <span class="kanban-col-title">{{ col.label }}</span>
            <q-badge :color="col.color" floating>{{
              col.tasks.length
            }}</q-badge>
          </div>
          <div class="kanban-col-body">
            <div
              v-for="task in col.tasks"
              :key="task.id"
              class="kanban-card"
              :class="'kanban-card-' + col.status"
              draggable="true"
              @dragstart="onDragStart(task)"
              @dragend="onDragEnd"
              @click="openEditDialog(task)"
            >
              <div class="kanban-card-top">
                <span class="kanban-card-name">
                  <q-icon
                    v-if="col.status === 'blocked'"
                    name="lock"
                    size="xs"
                    class="q-mr-xs"
                  />
                  <q-icon
                    v-else-if="col.status === 'completed'"
                    name="check_circle"
                    size="xs"
                    class="q-mr-xs"
                  />
                  {{ task.name }}
                </span>
                <span
                  v-if="task.assignee && getContactName(task.assignee)"
                  class="kanban-avatar"
                  :title="getContactName(task.assignee)"
                >
                  {{ getContactName(task.assignee).charAt(0) }}
                </span>
              </div>
              <div v-if="task.description" class="kanban-card-desc">
                {{ task.description }}
              </div>
              <div class="kanban-card-meta">
                <span
                  v-if="task.deadline"
                  class="kanban-deadline"
                  :class="{
                    'text-negative':
                      isOverdue(task.deadline) && task.status !== 'completed',
                    'text-orange':
                      isDueSoon(task.deadline) && task.status !== 'completed'
                  }"
                >
                  截止: {{ formatDate(task.deadline) }}
                </span>
                <span
                  v-if="col.status === 'blocked' && task.predecessorId"
                  class="kanban-blocked-by"
                >
                  相依: {{ getTaskName(task.predecessorId) }}
                </span>
              </div>
            </div>
            <div v-if="col.tasks.length === 0" class="kanban-empty">
              {{ col.emptyText }}
            </div>
          </div>
        </div>
      </div>
    </template>

    <q-dialog v-model="dialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">{{ editingTask ? '編輯任務' : '新增任務' }}</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input
            v-model="form.name"
            label="任務名稱"
            outlined
            dense
            :rules="[v => !!v || '任務名稱不可為空白']"
            ref="nameInput"
          />

          <q-input
            v-model="form.startDate"
            label="開始日期"
            outlined
            dense
            type="date"
          >
            <template v-slot:append>
              <q-icon
                v-if="isStartAutoCalc"
                name="auto_schedule"
                color="primary"
                size="xs"
              >
                <q-tooltip>自動排程計算</q-tooltip>
              </q-icon>
            </template>
          </q-input>

          <q-select
            v-model="form.status"
            :options="statusOptions"
            label="狀態"
            outlined
            dense
            emit-value
            map-options
          />

          <q-input
            v-model="form.deadline"
            label="截止日期"
            outlined
            dense
            type="date"
          >
            <template v-slot:append>
              <q-icon
                v-if="isDeadlineAutoCalc"
                name="auto_schedule"
                color="primary"
                size="xs"
              >
                <q-tooltip>自動排程計算</q-tooltip>
              </q-icon>
            </template>
          </q-input>

          <q-input
            v-model="form.completedDate"
            label="完成日期"
            outlined
            dense
            type="date"
          />

          <q-input
            v-model="form.description"
            label="任務描述"
            outlined
            dense
            type="textarea"
            autogrow
          />

          <q-select
            v-model="form.assignee"
            :options="assigneeOptions"
            label="負責人"
            outlined
            dense
            clearable
            emit-value
            map-options
          />

          <q-select
            v-model="form.predecessorId"
            :options="predecessorOptions"
            label="相依任務"
            outlined
            dense
            clearable
            emit-value
            map-options
          />

          <q-select
            v-model="form.dependencyType"
            :options="dependencyOptions"
            label="相依模式"
            outlined
            dense
            :disable="!form.predecessorId"
            emit-value
            map-options
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup @click="dialog = false" />
          <q-btn color="primary" label="儲存" @click="saveTask" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteDialog">
      <q-card>
        <q-card-section>
          <template v-if="dependentsCount > 0">
            該任務有
            {{ dependentsCount }}
            個相依任務，刪除後將一併移除其相依關係，確定刪除？
          </template>
          <template v-else> 確定刪除「{{ toDelete?.name }}」？ </template>
        </q-card-section>
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useTaskStore } from '@/stores/taskStore.js'
import { useContactStore } from '@/stores/contactStore.js'

const route = useRoute()
const taskStore = useTaskStore()
const contactStore = useContactStore()
const $q = useQuasar()

const projectId = computed(() => route.params.projectId)
const viewMode = ref('kanban')

const dragTask = ref(null)

function getContactName(contactId) {
  const contact = contactStore.find(contactId)
  return contact ? contact.name : null
}

const kanbanColumns = computed(() => {
  const blocked = taskStore.getBlockedTasks(taskStore.tasks)
  const blockedIds = new Set(blocked.map(t => t.id))
  const byStatus = {
    not_started: taskStore
      .getTasksByStatus(taskStore.tasks, 'not_started')
      .filter(t => !blockedIds.has(t.id)),
    in_progress: taskStore
      .getTasksByStatus(taskStore.tasks, 'in_progress')
      .filter(t => !blockedIds.has(t.id)),
    completed: taskStore
      .getTasksByStatus(taskStore.tasks, 'completed')
      .filter(t => !blockedIds.has(t.id))
  }
  const sortByDeadline = arr =>
    [...arr].sort((a, b) => {
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline) - new Date(b.deadline)
    })
  return [
    {
      status: 'blocked',
      label: '被阻擋',
      icon: 'lock',
      color: 'negative',
      tasks: sortByDeadline(blocked),
      emptyText: '尚無被阻擋的任務'
    },
    {
      status: 'not_started',
      label: '未開始',
      icon: 'radio_button_unchecked',
      color: 'grey',
      tasks: sortByDeadline(byStatus.not_started),
      emptyText: '尚無未開始的任務'
    },
    {
      status: 'in_progress',
      label: '進行中',
      icon: 'schedule',
      color: 'primary',
      tasks: sortByDeadline(byStatus.in_progress),
      emptyText: '尚無進行中的任務'
    },
    {
      status: 'completed',
      label: '已完成',
      icon: 'check_circle',
      color: 'positive',
      tasks: sortByDeadline(byStatus.completed),
      emptyText: '尚無已完成的任務'
    }
  ]
})

function onDragStart(task) {
  dragTask.value = task
}

function onDragEnd() {
  dragTask.value = null
}

function onDragOver(e) {
  e.dataTransfer.dropEffect = 'move'
}

async function onDrop(targetStatus) {
  if (!dragTask.value) return
  if (targetStatus === 'blocked') {
    $q.notify({
      type: 'warning',
      message: '被阻擋狀態為自動判定，無法手動設定'
    })
    dragTask.value = null
    return
  }
  const statusMap = {
    not_started: 'not_started',
    in_progress: 'in_progress',
    completed: 'completed'
  }
  const newStatus = statusMap[targetStatus]
  if (newStatus && dragTask.value.status !== newStatus) {
    const fields = { status: newStatus }
    if (newStatus === 'completed' && !dragTask.value.completedDate) {
      fields.completedDate = new Date().toISOString().slice(0, 10)
    }
    if (newStatus !== 'completed') {
      fields.completedDate = null
    }
    await taskStore.update(projectId.value, dragTask.value.id, fields)
  }
  dragTask.value = null
}

const statusOptions = [
  { label: '未開始', value: 'not_started' },
  { label: '進行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' }
]

const assigneeOptions = computed(() => {
  const taskCounts = {}
  taskStore.tasks.forEach(t => {
    if (t.assignee) {
      taskCounts[t.assignee] = (taskCounts[t.assignee] || 0) + 1
    }
  })
  return contactStore.contacts.map(c => {
    const count = taskCounts[c.id] || 0
    return {
      label: count > 0 ? `${c.name}（${count}）` : c.name,
      value: c.id
    }
  })
})
const dialog = ref(false)
const deleteDialog = ref(false)
const editingTask = ref(null)
const toDelete = ref(null)
const nameInput = ref(null)
const scheduleResult = ref(null)

const form = ref({
  name: '',
  startDate: '',
  status: 'not_started',
  deadline: '',
  completedDate: '',
  description: '',
  assignee: null,
  predecessorId: null,
  dependencyType: null
})

const dependencyOptions = [
  { label: '完成-開始（FS）', value: 'FS' },
  { label: '開始-開始（SS）', value: 'SS' },
  { label: '完成-完成（FF）', value: 'FF' }
]

const columns = [
  {
    name: 'status',
    label: '',
    field: 'status',
    align: 'center',
    style: 'width: 50px'
  },
  {
    name: 'name',
    label: '任務名稱',
    field: 'name',
    align: 'left',
    sortable: true
  },
  { name: 'startDate', label: '開始日期', field: 'startDate', align: 'left' },
  { name: 'deadline', label: '截止日期', field: 'deadline', align: 'left' },
  {
    name: 'completedDate',
    label: '完成日期',
    field: 'completedDate',
    align: 'left'
  },
  {
    name: 'description',
    label: '任務描述',
    field: 'description',
    align: 'left'
  },
  { name: 'dependency', label: '相依任務', field: 'dependency', align: 'left' },
  { name: 'actions', label: '操作', field: 'actions', align: 'center' }
]

const predecessorOptions = computed(() =>
  taskStore.tasks
    .filter(t => t.id !== editingTask.value?.id)
    .map(t => ({
      label: t.name,
      value: t.id
    }))
)

const sortedTasks = computed(() => {
  const list = [...taskStore.tasks]
  const hasDeadline = t => !!t.deadline
  const getDeadline = t =>
    t.deadline ? new Date(t.deadline) : new Date(9999, 11, 31)

  const withPred = list.filter(t => t.predecessorId)
  const withoutPred = list.filter(t => !t.predecessorId)

  const ordered = []
  const visited = new Set()
  function addWithDeps(task) {
    if (visited.has(task.id)) return
    visited.add(task.id)
    if (task.predecessorId) {
      const pred = list.find(t => t.id === task.predecessorId)
      if (pred) addWithDeps(pred)
    }
    ordered.push(task)
  }

  const roots = withPred.filter(
    t => !list.some(other => other.id !== t.id && other.predecessorId === t.id)
  )
  for (const root of roots) {
    addWithDeps(root)
  }

  const remaining = withPred.filter(t => !visited.has(t.id))
  for (const task of remaining) {
    if (!visited.has(task.id)) addWithDeps(task)
  }

  withoutPred.sort((a, b) => {
    const aHas = hasDeadline(a)
    const bHas = hasDeadline(b)
    if (aHas && !bHas) return -1
    if (!aHas && bHas) return 1
    if (aHas && bHas) return getDeadline(a) - getDeadline(b)
    return 0
  })

  const orderedIds = new Set(ordered.map(t => t.id))
  return [...ordered, ...withoutPred.filter(t => !orderedIds.has(t.id))]
})

const dependentsCount = computed(() => {
  if (!toDelete.value) return 0
  return taskStore.getDependents(toDelete.value.id).length
})

const isStartAutoCalc = computed(() => {
  if (!form.value.predecessorId) return false
  return (
    form.value.dependencyType === 'FS' || form.value.dependencyType === 'SS'
  )
})

const isDeadlineAutoCalc = computed(() => {
  if (!form.value.predecessorId) return false
  return form.value.dependencyType === 'FF'
})

function depLabel(type) {
  const map = { FS: '完成-開始', SS: '開始-開始', FF: '完成-完成' }
  return map[type] || type
}

function getTaskName(id) {
  const t = taskStore.find(id)
  return t ? t.name : ''
}

function isOverdue(deadline) {
  if (!deadline) return false
  return new Date(deadline) < new Date(new Date().toDateString())
}

function isDueSoon(deadline) {
  if (!deadline) return false
  const now = new Date()
  const due = new Date(deadline)
  const diff = (due - now) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 7
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function resetForm() {
  form.value = {
    name: '',
    startDate: '',
    status: 'not_started',
    deadline: '',
    completedDate: '',
    description: '',
    assignee: null,
    predecessorId: null,
    dependencyType: null
  }
}

function openAddDialog() {
  editingTask.value = null
  resetForm()
  dialog.value = true
  nextTick(() => nameInput.value?.focus())
}

function openEditDialog(task) {
  editingTask.value = task
  form.value = {
    name: task.name,
    startDate: task.startDate || '',
    status: task.status || 'not_started',
    deadline: task.deadline || '',
    completedDate: task.completedDate || '',
    description: task.description || '',
    assignee: task.assignee || null,
    predecessorId: task.predecessorId || null,
    dependencyType: task.dependencyType || null
  }
  dialog.value = true
}

async function saveTask() {
  if (!form.value.name.trim()) {
    nameInput.value?.focus()
    return
  }

  if (form.value.predecessorId) {
    const newId = editingTask.value?.id || 'pending'
    if (taskStore.hasCycle(taskStore.tasks, form.value.predecessorId, newId)) {
      $q.notify({
        type: 'negative',
        message: '任務相依關係產生循環，請重新設定'
      })
      return
    }
  }

  const autoCompletedDate =
    form.value.status === 'completed' && !form.value.completedDate
      ? new Date().toISOString().slice(0, 10)
      : null
  const clearedCompletedDate =
    form.value.status !== 'completed' ? null : undefined
  const finalCompletedDate =
    autoCompletedDate ||
    (clearedCompletedDate === null ? null : form.value.completedDate || null)

  const taskData = {
    name: form.value.name.trim(),
    startDate: form.value.startDate || null,
    status: form.value.status,
    deadline: form.value.deadline || null,
    completedDate: finalCompletedDate,
    description: form.value.description || '',
    assignee: form.value.assignee || null,
    predecessorId: form.value.predecessorId,
    dependencyType: form.value.predecessorId ? form.value.dependencyType : null
  }

  const validation = taskStore.validateTask(taskStore.tasks, {
    ...taskData,
    id: editingTask.value?.id || 'pending'
  })
  if (!validation.valid) {
    $q.notify({
      type: 'negative',
      message: validation.message
    })
    if (validation.adjust) {
      if (
        form.value.startDate &&
        form.value.deadline &&
        form.value.startDate > form.value.deadline
      ) {
        form.value.deadline = form.value.startDate
        taskData.deadline = form.value.startDate
      }
    }
    return
  }

  if (
    form.value.predecessorId &&
    form.value.dependencyType === 'FS' &&
    !form.value.startDate
  ) {
    const pred = taskStore.find(form.value.predecessorId)
    if (pred && !pred.deadline && !pred.completedDate) {
      $q.notify({
        type: 'warning',
        message: '前置任務無截止日期，請手動設定相依任務的開始日期',
        timeout: 4000
      })
    }
  }

  let adjustments = null
  if (editingTask.value) {
    adjustments = await taskStore.update(
      projectId.value,
      editingTask.value.id,
      taskData
    )
  } else {
    adjustments = await taskStore.add(projectId.value, {
      id: taskStore.generateId(),
      ...taskData
    })
  }

  if (adjustments && adjustments.length > 0) {
    scheduleResult.value = adjustments
    const names = adjustments.map(a => a.taskName).join('、')
    $q.notify({
      type: 'info',
      message: `自動排程已調整 ${adjustments.length} 個相依任務的日期`,
      caption: names.length > 50 ? names.slice(0, 50) + '…' : names,
      timeout: 5000
    })
  }

  dialog.value = false
}

function confirmDelete(task) {
  toDelete.value = task
  deleteDialog.value = true
}

async function doDelete() {
  if (!toDelete.value) return
  await taskStore.remove(projectId.value, toDelete.value.id)
  toDelete.value = null
}

onMounted(async () => {
  await taskStore.load(projectId.value)
  if (contactStore.contacts.length === 0) {
    await contactStore.load()
  }
})

const _today = new Date()
_today.setHours(0, 0, 0, 0)

const _ganttMin = computed(() => {
  let min = null
  for (const t of sortedTasks.value) {
    for (const d of [t.startDate, t.deadline, t.completedDate]) {
      if (!d) continue
      const dt = new Date(d)
      if (!min || dt < min) min = dt
    }
  }
  if (!min) min = new Date(_today)
  min.setDate(min.getDate() - 7)
  return min
})

const _ganttMax = computed(() => {
  let max = null
  for (const t of sortedTasks.value) {
    for (const d of [t.deadline, t.completedDate, t.startDate]) {
      if (!d) continue
      const dt = new Date(d)
      if (!max || dt > max) max = dt
    }
  }
  if (!max) max = new Date(_today)
  max.setDate(max.getDate() + 7)
  if (max <= _ganttMin.value) max = new Date(_ganttMin.value)
  max.setDate(max.getDate() + 14)
  return max
})

const _ganttDays = computed(() => {
  return Math.max(1, Math.ceil((_ganttMax.value - _ganttMin.value) / 864e5))
})

const _ganttDw = computed(() => {
  return Math.max(28, Math.min(60, 800 / _ganttDays.value))
})

const _ganttLabelW = 200

const ganttSvgW = computed(
  () => _ganttLabelW + _ganttDays.value * _ganttDw.value
)

const ganttTasks = computed(() => sortedTasks.value)

const ganttMonths = computed(() => {
  const result = []
  const cursor = new Date(
    _ganttMin.value.getFullYear(),
    _ganttMin.value.getMonth(),
    1
  )
  while (cursor <= _ganttMax.value) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    const ds = Math.max(0, Math.round((cursor - _ganttMin.value) / 864e5))
    const de = Math.min(
      _ganttDays.value,
      Math.round((next - _ganttMin.value) / 864e5)
    )
    result.push({
      label: `${cursor.getFullYear()}/${String(cursor.getMonth() + 1).padStart(2, '0')}`,
      width: (de - ds) * _ganttDw.value
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return result
})

const ganttTodayLine = computed(() => {
  if (_today < _ganttMin.value || _today > _ganttMax.value) return []
  const off = Math.round((_today - _ganttMin.value) / 864e5)
  return [_ganttLabelW + off * _ganttDw.value]
})

const ganttArrows = computed(() => {
  const arr = []
  for (const t of ganttTasks.value) {
    if (!t.predecessorId) continue
    const pred = ganttTasks.value.find(p => p.id === t.predecessorId)
    if (!pred) continue
    const pe = _ganttEndX(pred)
    const ts = _ganttStartX(t)
    const pi = ganttTasks.value.indexOf(pred)
    const ti = ganttTasks.value.indexOf(t)
    arr.push({
      id: `a-${pred.id}-${t.id}`,
      x1: pe,
      y1: pi * 36 + 18,
      x2: ts,
      y2: ti * 36 + 18
    })
  }
  return arr
})

function _ganttEndX(task) {
  const end = task.completedDate
    ? new Date(task.completedDate)
    : task.deadline
      ? new Date(task.deadline)
      : null
  if (!end) return _ganttLabelW + _ganttDays.value * _ganttDw.value
  const off = Math.round((end - _ganttMin.value) / 864e5)
  return (
    _ganttLabelW +
    Math.min(_ganttDays.value - 1, Math.max(0, off)) * _ganttDw.value +
    _ganttDw.value
  )
}

function _ganttStartX(task) {
  const start = task.startDate
    ? new Date(task.startDate)
    : task.deadline
      ? new Date(new Date(task.deadline).getTime() - 7 * 864e5)
      : task.completedDate
        ? new Date(new Date(task.completedDate).getTime() - 7 * 864e5)
        : null
  if (!start) return _ganttLabelW
  if (task.predecessorId) {
    const pred = ganttTasks.value.find(p => p.id === task.predecessorId)
    if (pred) {
      const pe = pred.completedDate
        ? new Date(pred.completedDate)
        : pred.deadline
          ? new Date(pred.deadline)
          : null
      if (pe && pe < start) start.setTime(pe.getTime())
    }
  }
  const off = Math.max(0, Math.round((start - _ganttMin.value) / 864e5))
  return _ganttLabelW + Math.min(_ganttDays.value - 1, off) * _ganttDw.value
}

function ganttBar(task) {
  const end = task.completedDate
    ? new Date(task.completedDate)
    : task.deadline
      ? new Date(task.deadline)
      : null
  if (!end) return { show: false }
  const start = task.startDate
    ? new Date(task.startDate)
    : new Date(end.getTime() - 7 * 864e5)
  if (task.predecessorId) {
    const pred = ganttTasks.value.find(p => p.id === task.predecessorId)
    if (pred) {
      const pe = pred.completedDate
        ? new Date(pred.completedDate)
        : pred.deadline
          ? new Date(pred.deadline)
          : null
      if (pe && pe < end) start.setTime(pe.getTime())
    }
  }
  const ds = Math.max(0, Math.round((start - _ganttMin.value) / 864e5))
  const de = Math.min(
    _ganttDays.value,
    Math.round((end - _ganttMin.value) / 864e5)
  )
  const cls =
    task.status === 'completed'
      ? 'bar-done'
      : !task.deadline
        ? 'bar-planned'
        : new Date(task.deadline) < _today
          ? 'bar-overdue'
          : (new Date(task.deadline) - _today) / 864e5 <= 7
            ? 'bar-warn'
            : 'bar-ok'
  return {
    show: true,
    style: {
      left: ds * _ganttDw.value + 'px',
      width: Math.max(10, (de - ds) * _ganttDw.value) + 'px'
    },
    cls,
    label: task.status === 'completed' ? '✓ ' + task.name : task.name
  }
}
</script>

<style scoped>
.gantt-wrap {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow-x: auto;
  position: relative;
  font-size: 13px;
}
.gantt-header {
  display: flex;
  border-bottom: 2px solid #ccc;
  background: #f5f5f5;
  position: sticky;
  top: 0;
  z-index: 2;
}
.gantt-name-header {
  width: 200px;
  flex-shrink: 0;
  padding: 6px 10px;
  font-weight: 600;
  border-right: 1px solid #ddd;
}
.gantt-months {
  display: flex;
  flex: 1;
}
.gantt-month {
  padding: 6px 0;
  text-align: center;
  font-weight: 600;
  font-size: 12px;
  border-right: 1px solid #e0e0e0;
}
.gantt-body {
  position: relative;
}
.gantt-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}
.gantt-row {
  display: flex;
  position: absolute;
  left: 0;
  right: 0;
  height: 36px;
  border-bottom: 1px solid #eee;
}
.gantt-row:nth-child(even) {
  background: #fafafa;
}
.gantt-name {
  width: 200px;
  flex-shrink: 0;
  padding: 0 10px;
  line-height: 36px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-right: 1px solid #ddd;
  font-size: 12px;
  z-index: 1;
  background: inherit;
}
.gantt-track {
  flex: 1;
  position: relative;
}
.gantt-bar {
  position: absolute;
  top: 7px;
  height: 22px;
  border-radius: 3px;
  overflow: hidden;
  white-space: nowrap;
}
.gantt-bar-text {
  padding: 0 6px;
  line-height: 22px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.bar-done {
  background: #4caf50;
  color: #fff;
}
.bar-overdue {
  background: #f44336;
  color: #fff;
}
.bar-warn {
  background: #ff9800;
  color: #fff;
}
.bar-ok {
  background: #2196f3;
  color: #fff;
}
.bar-planned {
  background: #9e9e9e;
  color: #fff;
}
.gantt-none {
  position: absolute;
  top: 20px;
  left: 210px;
  color: #999;
  font-size: 13px;
}

.kanban-board {
  display: flex;
  gap: 12px;
  min-height: 400px;
  overflow-x: auto;
  padding-bottom: 12px;
}

.kanban-column {
  flex: 1;
  min-width: 220px;
  background: #f5f5f5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.kanban-col-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 2px solid #e0e0e0;
}

.kanban-col-title {
  flex: 1;
}

.kanban-col-body {
  padding: 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kanban-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 12px;
  cursor: pointer;
  transition:
    box-shadow 0.15s,
    opacity 0.15s;
}

.kanban-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.kanban-card[draggable='true']:active {
  opacity: 0.5;
}

.kanban-card-blocked {
  border-left: 3px solid #f44336;
}

.kanban-card-not_started {
  border-left: 3px solid #9e9e9e;
}

.kanban-card-in_progress {
  border-left: 3px solid #2196f3;
}

.kanban-card-completed {
  border-left: 3px solid #4caf50;
}

.kanban-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.kanban-card-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kanban-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #1976d2;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.kanban-card-desc {
  font-size: 11px;
  color: #888;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kanban-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
  font-size: 11px;
  color: #666;
}

.kanban-deadline {
  font-size: 11px;
}

.kanban-blocked-by {
  font-size: 11px;
  color: #f44336;
}

.kanban-empty {
  text-align: center;
  color: #bbb;
  font-size: 12px;
  padding: 20px 0;
}
</style>
