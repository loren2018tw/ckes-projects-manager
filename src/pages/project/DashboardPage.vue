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
      <div class="col-12 col-md-4">
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

      <div class="col-12 col-md-8">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">
              <router-link
                :to="`/projects/${projectId}/tasks`"
                class="text-primary text-decoration-none"
              >
                任務統計
                <q-icon name="open_in_new" size="16px" class="q-ml-xs" />
              </router-link>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <TaskStatsCard :tasks="tasks" :loading="taskStore.loading" />
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
                  <q-item-label class="text-body1 text-weight-medium">{{
                    worker.name
                  }}</q-item-label>
                  <q-item-label caption class="text-body2">{{
                    worker.email
                  }}</q-item-label>
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
import TaskStatsCard from '@/components/TaskStatsCard.vue'

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
