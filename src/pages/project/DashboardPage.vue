<template>
  <div class="q-pa-md">
    <div class="text-h5 q-mb-md">儀表板</div>

    <div v-if="projectData" class="q-mb-md">
      <q-card flat bordered>
        <q-card-section class="row items-center q-gutter-md">
          <div class="text-h6">核定金額</div>
          <div class="text-h5 text-primary text-weight-bold">
            NT$ {{ Number(projectData.budget || 0).toLocaleString() }}
          </div>
          <q-separator vertical />
          <div class="text-h6">已動支金額</div>
          <div class="text-h5 text-negative text-weight-bold">
            NT$ {{ disbursedAmount.toLocaleString() }}
          </div>
          <q-separator vertical />
          <div class="text-h6">剩餘經費</div>
          <div
            :class="[
              'text-h5',
              'text-weight-bold',
              remainingAmount >= 0 ? 'text-positive' : 'text-negative'
            ]"
          >
            NT$ {{ remainingAmount.toLocaleString() }}
          </div>
        </q-card-section>
      </q-card>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">資源統計</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div v-if="loading" class="text-grey">載入中…</div>
            <div v-else-if="resourceStats.length === 0" class="text-grey">
              尚無資源檔案
            </div>
            <q-list v-else dense separator>
              <q-item v-for="stat in resourceStats" :key="stat.label">
                <q-item-section>{{ stat.label }}</q-item-section>
                <q-item-section side>{{ stat.count }} 個檔案</q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
          <q-separator />
          <q-card-actions align="right">
            <q-btn
              flat
              color="primary"
              icon="upload"
              label="上傳檔案"
              :to="`/projects/${projectId}/resources`"
            />
          </q-card-actions>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">任務統計</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div v-if="taskStore.loading" class="text-grey">載入中…</div>
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
                    :class="taskRowClass(task)"
                  >
                    <q-item-section>
                      <q-item-label>{{ task.name }}</q-item-label>
                      <q-item-label caption>
                        截止：{{ formatDate(task.deadline) }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
              <div v-else class="text-grey"> 暫無即將到期的任務 </div>
            </template>
          </q-card-section>
          <q-separator />
          <q-card-actions align="right">
            <q-btn
              flat
              color="primary"
              icon="add"
              label="新增任務"
              :to="`/projects/${projectId}/tasks`"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mt-md">
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">工作人員</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div v-if="projectWorkers.length === 0" class="text-grey">
              尚無工作人員
            </div>
            <q-list v-else dense separator>
              <q-item v-for="worker in projectWorkers" :key="worker.id">
                <q-item-section>
                  <q-item-label>{{ worker.name }}</q-item-label>
                  <q-item-label caption>{{ worker.email }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/projectStore.js'
import { usePurchaseRequestStore } from '@/stores/purchaseRequestStore.js'
import { useTaskStore } from '@/stores/taskStore.js'
import { useContactStore } from '@/stores/contactStore.js'
import { useDriveStorage } from '@/composables/useDriveStorage.js'

const route = useRoute()
const projectStore = useProjectStore()
const purchaseRequestStore = usePurchaseRequestStore()
const taskStore = useTaskStore()
const contactStore = useContactStore()
const { listProjectFilesByCategory, loading } = useDriveStorage()

const projectId = computed(() => route.params.projectId)
const projectData = computed(() => projectStore.find(projectId.value))

const files = ref([])
const resourceStats = ref([])

const tasks = computed(() => taskStore.tasks)

const projectWorkers = computed(() => {
  const contactIds = new Set(tasks.value.map(t => t.assignee).filter(Boolean))
  return Array.from(contactIds)
    .map(id => contactStore.find(id))
    .filter(Boolean)
})

const completedCount = computed(
  () => tasks.value.filter(t => t.status === 'completed').length
)

const pendingCount = computed(
  () => tasks.value.filter(t => t.status !== 'completed').length
)

const overdueCount = computed(
  () =>
    tasks.value.filter(t => t.status !== 'completed' && isOverdue(t.deadline))
      .length
)

const remainingAmount = computed(() => {
  return (Number(projectData.value?.budget) || 0) - disbursedAmount.value
})

const disbursedAmount = computed(() => {
  return purchaseRequestStore.requests
    .filter(r => r.fundProjectId === projectId.value)
    .reduce((sum, r) => {
      if (
        r.manualAmount !== null &&
        r.manualAmount !== undefined &&
        r.manualAmount !== ''
      ) {
        return sum + Number(r.manualAmount)
      }
      const itemsTotal = (r.items || []).reduce((s, item) => {
        return s + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
      }, 0)
      return sum + itemsTotal
    }, 0)
})

const dueSoonTasks = computed(() =>
  tasks.value
    .filter(t => t.status !== 'completed' && t.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 10)
)

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

function taskRowClass(task) {
  if (isOverdue(task.deadline)) return 'bg-red-1'
  if (isDueSoon(task.deadline)) return 'bg-orange-1'
  return ''
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

async function loadResourceStats() {
  const project = projectStore.find(projectId.value)
  if (!project) return
  try {
    const items = await listProjectFilesByCategory(
      projectId.value,
      project.name
    )
    const counts = {}
    for (const item of items) {
      const cat = item._category || '其他'
      counts[cat] = (counts[cat] || 0) + 1
    }
    resourceStats.value = Object.entries(counts).map(([label, count]) => ({
      label,
      count
    }))
  } catch {
    resourceStats.value = []
  }
}

onMounted(async () => {
  await projectStore.load()
  await Promise.all([
    loadResourceStats(),
    taskStore.load(projectId.value),
    purchaseRequestStore.load(),
    contactStore.load()
  ])
})
</script>
