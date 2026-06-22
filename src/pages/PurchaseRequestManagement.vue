<template>
  <div class="q-pa-md">
    <div class="text-h5 q-mb-md">請購單管理</div>

    <q-banner
      v-if="store.loadError"
      class="bg-negative text-white q-mb-md"
      rounded
    >
      <template v-slot:avatar>
        <q-icon name="error" />
      </template>
      無法讀取資料：{{ store.loadError }}
    </q-banner>

    <q-card flat bordered class="q-mb-md purchase-request-table">
      <q-card-section>
        <div class="row items-center q-mb-sm">
          <div class="text-h6">請購單</div>
          <q-space />
          <q-btn
            color="primary"
            icon="add"
            label="新增請購單"
            @click="openAddDialog"
            class="q-mr-sm"
          />
          <q-btn
            color="secondary"
            icon="edit"
            label="編輯請購單"
            :disable="!selectedRequest"
            @click="openEditDialog"
            class="q-mr-sm"
          />
          <q-btn
            color="negative"
            icon="delete"
            label="刪除請購單"
            :disable="!selectedRequest"
            @click="confirmDeleteRequest"
            class="q-mr-sm"
          />
          <q-btn
            color="accent"
            icon="content_copy"
            label="複製請購單"
            :disable="!selectedRequest"
            @click="doDuplicate"
            class="q-mr-sm"
          />
          <q-btn color="grey" icon="print" label="列印請購單" disabled />
        </div>

        <q-table
          :rows="store.requests"
          :columns="requestColumns"
          row-key="id"
          flat
          bordered
          :sort-by="'date'"
          :descending="true"
          @row-click="onRowClick"
        >
          <template v-slot:body="props">
            <q-tr
              :props="props"
              :class="{ 'selected-row': props.row.id === selectedRequest?.id }"
              @click="onRowClick($event, props.row)"
            >
              <q-td v-for="col in props.cols" :key="col.name" :props="props">
                <template v-if="col.name === 'amount'">
                  {{ formatAmount(props.row) }}
                </template>
                <template v-else>
                  {{ col.value }}
                </template>
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-card flat bordered v-if="selectedRequest">
      <q-card-section>
        <div class="row items-center q-mb-sm">
          <div class="text-h6"
            >請購項目 — {{ selectedRequest.description || '未設定用途' }}</div
          >
          <q-space />
          <q-btn
            color="primary"
            icon="add"
            label="新增請購項目"
            @click="openAddItemDialog"
          />
        </div>

        <q-table
          :rows="selectedRequest.items || []"
          :columns="itemColumns"
          row-key="id"
          flat
          bordered
        >
          <template v-slot:body-cell-subtotal="props">
            <q-td :props="props">
              {{ (props.row.quantity * props.row.unitPrice).toLocaleString() }}
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                round
                icon="edit"
                @click="openEditItemDialog(props.row)"
              />
              <q-btn
                flat
                round
                icon="delete"
                color="negative"
                @click="confirmDeleteItem(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-dialog v-model="requestDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">{{
            isEditingRequest ? '編輯請購單' : '新增請購單'
          }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="requestForm.date"
            label="請購日期"
            type="date"
            outlined
            class="q-mb-sm"
          />
          <q-input
            v-model="requestForm.description"
            label="用途說明 *"
            outlined
            class="q-mb-sm"
            :rules="[val => !!val || '用途說明不可為空白']"
            ref="descriptionRef"
          />
          <q-select
            v-model="requestForm.fundProjectId"
            :options="fundOptions"
            label="使用專款"
            outlined
            class="q-mb-sm"
            clearable
            emit-value
            map-options
            option-label="label"
            option-value="value"
          />
          <q-input
            v-model="requestForm.vendor"
            label="採購廠商"
            outlined
            class="q-mb-sm"
          />
          <q-input
            v-model="requestForm.remark"
            label="備註"
            outlined
            class="q-mb-sm"
            type="textarea"
            autogrow
          />
          <q-input
            v-model="requestForm.manualAmount"
            label="實支金額（空白則自動計算）"
            outlined
            type="number"
            class="q-mb-sm"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup />
          <q-btn color="primary" label="儲存" @click="saveRequest" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="itemDialog" persistent>
      <q-card style="min-width: 450px">
        <q-card-section>
          <div class="text-h6">{{
            isEditingItem ? '編輯請購項目' : '新增請購項目'
          }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="itemForm.name"
            label="品名 *"
            outlined
            class="q-mb-sm"
            :rules="[val => !!val || '品名不可為空白']"
            ref="itemNameRef"
          />
          <q-input
            v-model="itemForm.spec"
            label="規格"
            outlined
            class="q-mb-sm"
          />
          <q-input
            v-model="itemForm.unit"
            label="單位"
            outlined
            class="q-mb-sm"
          />
          <q-input
            v-model="itemForm.quantity"
            label="數量"
            outlined
            type="number"
            class="q-mb-sm"
          />
          <q-input
            v-model="itemForm.unitPrice"
            label="單價"
            outlined
            type="number"
            class="q-mb-sm"
          />
          <div class="text-subtitle2 text-grey-7 q-mt-sm">
            小計：{{ itemSubtotal }}
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup />
          <q-btn color="primary" label="儲存" @click="saveItem" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteRequestDialog">
      <q-card>
        <q-card-section>確定刪除此請購單？</q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup />
          <q-btn
            flat
            label="刪除"
            color="negative"
            v-close-popup
            @click="doDeleteRequest"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteItemDialog">
      <q-card>
        <q-card-section>確定刪除此請購項目？</q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup />
          <q-btn
            flat
            label="刪除"
            color="negative"
            v-close-popup
            @click="doDeleteItem"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { usePurchaseRequestStore } from '@/stores/purchaseRequestStore.js'
import { useProjectStore } from '@/stores/projectStore.js'

const store = usePurchaseRequestStore()
const projectStore = useProjectStore()

const selectedRequestId = ref(null)
const selectedRequest = computed(() => {
  if (!selectedRequestId.value) return null
  return store.requests.find(r => r.id === selectedRequestId.value) || null
})

const requestDialog = ref(false)
const isEditingRequest = ref(false)
const editingRequestId = ref(null)
const requestForm = ref(emptyRequestForm())
const descriptionRef = ref(null)

const itemDialog = ref(false)
const isEditingItem = ref(false)
const editingItemId = ref(null)
const itemForm = ref(emptyItemForm())
const itemNameRef = ref(null)

const deleteRequestDialog = ref(false)
const deleteItemDialog = ref(false)
const itemToDelete = ref(null)

const requestColumns = [
  {
    name: 'date',
    label: '請購日期',
    field: 'date',
    align: 'left',
    sortable: true
  },
  {
    name: 'description',
    label: '用途說明',
    field: 'description',
    align: 'left'
  },
  {
    name: 'fundProject',
    label: '使用專款',
    field: 'fundProject',
    align: 'left'
  },
  { name: 'vendor', label: '採購廠商', field: 'vendor', align: 'left' },
  { name: 'amount', label: '實支金額', field: 'amount', align: 'right' }
]

const itemColumns = [
  { name: 'name', label: '品名', field: 'name', align: 'left' },
  { name: 'spec', label: '規格', field: 'spec', align: 'left' },
  { name: 'unit', label: '單位', field: 'unit', align: 'left' },
  { name: 'quantity', label: '數量', field: 'quantity', align: 'right' },
  { name: 'unitPrice', label: '單價', field: 'unitPrice', align: 'right' },
  { name: 'subtotal', label: '小計', field: 'subtotal', align: 'right' },
  { name: 'actions', label: '操作', field: 'actions', align: 'center' }
]

const fundOptions = computed(() => {
  const activeProjects = projectStore.projects.filter(
    p => p.status === 'active'
  )
  return activeProjects.map(p => ({
    label: p.name,
    value: p.id
  }))
})

function emptyRequestForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    description: '',
    fundProjectId: null,
    vendor: '',
    remark: '',
    manualAmount: null
  }
}

function emptyItemForm() {
  return {
    name: '',
    spec: '',
    unit: '',
    quantity: 1,
    unitPrice: 0
  }
}

const itemSubtotal = computed(() => {
  const q = Number(itemForm.value.quantity) || 0
  const p = Number(itemForm.value.unitPrice) || 0
  return (q * p).toLocaleString()
})

function formatAmount(row) {
  if (
    row.manualAmount !== null &&
    row.manualAmount !== undefined &&
    row.manualAmount !== ''
  ) {
    return Number(row.manualAmount).toLocaleString()
  }
  const items = row.items || []
  const total = items.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
  }, 0)
  return total.toLocaleString()
}

function onRowClick(evt, row) {
  selectedRequestId.value = row.id
}

function openAddDialog() {
  isEditingRequest.value = false
  editingRequestId.value = null
  requestForm.value = emptyRequestForm()
  requestDialog.value = true
}

function openEditDialog() {
  if (!selectedRequest.value) return
  isEditingRequest.value = true
  editingRequestId.value = selectedRequest.value.id
  requestForm.value = {
    date: selectedRequest.value.date || '',
    description: selectedRequest.value.description || '',
    fundProjectId: selectedRequest.value.fundProjectId || null,
    vendor: selectedRequest.value.vendor || '',
    remark: selectedRequest.value.remark || '',
    manualAmount: selectedRequest.value.manualAmount ?? null
  }
  requestDialog.value = true
}

async function saveRequest() {
  if (!requestForm.value.description) {
    return
  }

  const fundProjectId = requestForm.value.fundProjectId
  const fundProject = fundProjectId
    ? projectStore.projects.find(p => p.id === fundProjectId)
    : null

  const data = {
    date: requestForm.value.date,
    description: requestForm.value.description,
    fundProjectId: fundProject ? fundProject.id : null,
    fundProject: fundProject ? fundProject.name : null,
    vendor: requestForm.value.vendor,
    remark: requestForm.value.remark,
    manualAmount:
      requestForm.value.manualAmount !== '' &&
      requestForm.value.manualAmount !== null
        ? Number(requestForm.value.manualAmount)
        : null
  }

  if (isEditingRequest.value && editingRequestId.value) {
    await store.update(editingRequestId.value, data)
  } else {
    const newRequest = await store.add(data)
    selectedRequestId.value = newRequest.id
  }

  requestDialog.value = false
}

function confirmDeleteRequest() {
  if (selectedRequest.value) {
    deleteRequestDialog.value = true
  }
}

async function doDeleteRequest() {
  if (!selectedRequest.value) return
  await store.remove(selectedRequest.value.id)
  selectedRequestId.value =
    store.requests.length > 0 ? store.requests[0].id : null
}

async function doDuplicate() {
  if (selectedRequest.value) {
    const newRequest = await store.duplicate(selectedRequest.value.id)
    if (newRequest) {
      selectedRequestId.value = newRequest.id
    }
  }
}

function openAddItemDialog() {
  isEditingItem.value = false
  editingItemId.value = null
  itemForm.value = emptyItemForm()
  itemDialog.value = true
}

function openEditItemDialog(item) {
  isEditingItem.value = true
  editingItemId.value = item.id
  itemForm.value = {
    name: item.name || '',
    spec: item.spec || '',
    unit: item.unit || '',
    quantity: item.quantity ?? 1,
    unitPrice: item.unitPrice ?? 0
  }
  itemDialog.value = true
}

async function saveItem() {
  if (!itemForm.value.name || !selectedRequest.value) {
    return
  }

  const itemData = {
    name: itemForm.value.name,
    spec: itemForm.value.spec,
    unit: itemForm.value.unit,
    quantity: Number(itemForm.value.quantity) || 0,
    unitPrice: Number(itemForm.value.unitPrice) || 0
  }

  const items = [...(selectedRequest.value.items || [])]

  if (isEditingItem.value && editingItemId.value) {
    const idx = items.findIndex(i => i.id === editingItemId.value)
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...itemData }
    }
  } else {
    const id = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    items.push({ id, ...itemData })
  }

  await store.update(selectedRequest.value.id, { items })
  itemDialog.value = false
}

function confirmDeleteItem(item) {
  itemToDelete.value = item
  deleteItemDialog.value = true
}

async function doDeleteItem() {
  if (!itemToDelete.value || !selectedRequest.value) return
  const items = (selectedRequest.value.items || []).filter(
    i => i.id !== itemToDelete.value.id
  )
  await store.update(selectedRequest.value.id, { items })
  itemToDelete.value = null
}

watch(
  () => store.requests,
  requests => {
    if (requests.length > 0) {
      const stillExists =
        selectedRequestId.value &&
        requests.some(r => r.id === selectedRequestId.value)
      if (!stillExists) {
        selectedRequestId.value = requests[0].id
      }
    } else {
      selectedRequestId.value = null
    }
  },
  { deep: true }
)

onMounted(async () => {
  await Promise.all([store.load(), projectStore.load()])
})
</script>

<style>
.purchase-request-table .q-table tbody tr.selected-row td {
  background-color: #c8e6c9 !important;
}
</style>
