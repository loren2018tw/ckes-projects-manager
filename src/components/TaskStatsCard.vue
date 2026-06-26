<template>
  <div>
    <div v-if="loading" class="text-grey">載入中…</div>
    <template v-else>
      <div v-if="tasks.length === 0" class="text-grey">暫無任務</div>
      <template v-else>
        <div class="row q-mb-md">
          <q-chip
            icon="check_circle"
            color="positive"
            text-color="white"
            class="q-ma-xs"
          >
            已完成 {{ completedCount }}
          </q-chip>
          <q-chip
            icon="pending"
            color="warning"
            text-color="white"
            class="q-ma-xs"
          >
            未完成 {{ pendingCount }}
          </q-chip>
          <q-chip
            icon="error"
            color="negative"
            text-color="white"
            class="q-ma-xs"
          >
            已逾期 {{ overdueCount }}
          </q-chip>
        </div>

        <div v-if="dueSoonTasks.length > 0">
          <div class="text-subtitle2 q-mb-sm">即將到期</div>
          <q-list dense separator>
            <q-item
              v-for="task in dueSoonTasks"
              :key="task.id"
              class="bg-orange-1"
            >
              <q-item-section>
                <q-item-label>{{ task.name }}</q-item-label>
                <q-item-label caption
                  >截止：{{ formatDate(task.deadline) }}</q-item-label
                >
              </q-item-section>
            </q-item>
          </q-list>
        </div>
        <div v-else class="text-grey">暫無即將到期的任務</div>

        <div v-if="inProgressTasks.length > 0" class="q-mt-md">
          <div class="text-subtitle2 q-mb-sm">進行中的任務</div>
          <q-list dense separator>
            <q-item v-for="task in inProgressTasks" :key="task.id">
              <q-item-section>
                <q-item-label>{{ task.name }}</q-item-label>
                <q-item-label caption>
                  截止：{{
                    task.deadline ? formatDate(task.deadline) : '無截止日'
                  }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
        <div v-else-if="dueSoonTasks.length === 0" class="text-grey q-mt-md">
          暫無進行中的任務
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTaskStore } from '@/stores/taskStore.js'

const props = defineProps({
  tasks: { type: Array, required: true },
  loading: { type: Boolean, default: false }
})

const taskStore = useTaskStore()

const completedCount = computed(
  () => props.tasks.filter(t => t.status === 'completed').length
)

const pendingCount = computed(
  () => props.tasks.filter(t => t.status !== 'completed').length
)

const overdueCount = computed(
  () =>
    props.tasks.filter(t => t.status !== 'completed' && isOverdue(t.deadline))
      .length
)

const dueSoonTasks = computed(() =>
  props.tasks
    .filter(t => t.status !== 'completed' && isDueSoon(t.deadline))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
)

const inProgressTasks = computed(() => {
  const blockedIds = new Set(
    taskStore.getBlockedTasks(props.tasks).map(t => t.id)
  )
  return props.tasks
    .filter(
      t =>
        t.status !== 'completed' &&
        !blockedIds.has(t.id) &&
        !isOverdue(t.deadline) &&
        !isDueSoon(t.deadline)
    )
    .sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0))
})

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
</script>
