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
            v-if="props.row.completedDate"
            name="check_circle"
            color="positive"
            size="md"
          />
          <q-icon
            v-else-if="isOverdue(props.row.deadline)"
            name="error"
            color="negative"
            size="md"
          />
          <q-icon
            v-else-if="isDueSoon(props.row.deadline)"
            name="schedule"
            color="orange"
            size="md"
          />
          <q-icon v-else name="radio_button_unchecked" color="grey" size="md" />
        </q-td>
      </template>

      <template v-slot:body-cell-name="props">
        <q-td :props="props">
          <span
            :class="{
              'text-strikethrough': props.row.completedDate,
              'text-negative':
                isOverdue(props.row.deadline) && !props.row.completedDate,
              'text-orange':
                isDueSoon(props.row.deadline) && !props.row.completedDate
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
                isOverdue(props.row.deadline) && !props.row.completedDate,
              'text-orange':
                isDueSoon(props.row.deadline) && !props.row.completedDate
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
            v-model="form.deadline"
            label="截止日期"
            outlined
            dense
            type="date"
          />

          <q-input
            v-model="form.completedDate"
            label="完成日期"
            outlined
            dense
            type="date"
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
import { useTaskStore } from '@/stores/taskStore.js'

const route = useRoute()
const taskStore = useTaskStore()

const projectId = computed(() => route.params.projectId)
const dialog = ref(false)
const deleteDialog = ref(false)
const editingTask = ref(null)
const toDelete = ref(null)
const nameInput = ref(null)

const form = ref({
  name: '',
  deadline: '',
  completedDate: '',
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
  { name: 'deadline', label: '截止日期', field: 'deadline', align: 'left' },
  {
    name: 'completedDate',
    label: '完成日期',
    field: 'completedDate',
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
    deadline: '',
    completedDate: '',
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
    deadline: task.deadline || '',
    completedDate: task.completedDate || '',
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
      const { useQuasar } = await import('quasar')
      useQuasar().notify({
        type: 'negative',
        message: '任務相依關係產生循環，請重新設定'
      })
      return
    }
  }

  if (editingTask.value) {
    await taskStore.update(projectId.value, editingTask.value.id, {
      name: form.value.name.trim(),
      deadline: form.value.deadline || null,
      completedDate: form.value.completedDate || null,
      predecessorId: form.value.predecessorId,
      dependencyType: form.value.predecessorId
        ? form.value.dependencyType
        : null
    })
  } else {
    await taskStore.add(projectId.value, {
      id: taskStore.generateId(),
      name: form.value.name.trim(),
      deadline: form.value.deadline || null,
      completedDate: form.value.completedDate || null,
      predecessorId: form.value.predecessorId,
      dependencyType: form.value.predecessorId
        ? form.value.dependencyType
        : null
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
})

const _today = new Date()
_today.setHours(0, 0, 0, 0)

const _ganttMin = computed(() => {
  let min = null
  for (const t of sortedTasks.value) {
    for (const d of [t.deadline, t.completedDate]) {
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
    for (const d of [t.deadline, t.completedDate]) {
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
  const end = task.deadline
    ? new Date(task.deadline)
    : task.completedDate
      ? new Date(task.completedDate)
      : null
  if (!end) return _ganttLabelW
  const start = new Date(end)
  start.setDate(start.getDate() - 7)
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
  const start = new Date(end)
  start.setDate(start.getDate() - 7)
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
  const cls = task.completedDate
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
    label: task.completedDate ? '✓ ' + task.name : task.name
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
</style>
