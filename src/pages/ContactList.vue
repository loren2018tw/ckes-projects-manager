<template>
  <div class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h5">聯絡人管理</div>
      <q-space />
      <q-btn
        v-if="!editingId"
        color="primary"
        icon="person_add"
        label="新增聯絡人"
        @click="startAdd"
      />
    </div>

    <div v-if="editingId" class="q-mb-lg">
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6 q-mb-sm">
            {{ editingId === 'new' ? '新增聯絡人' : '編輯聯絡人' }}
          </div>
          <ContactForm
            :key="editingId"
            :contact-id="editingId === 'new' ? null : editingId"
            @saved="onSaved"
            @cancel="editingId = null"
          />
        </q-card-section>
      </q-card>
    </div>

    <q-table
      v-if="!editingId"
      :rows="contactStore.contacts"
      :columns="columns"
      row-key="id"
      flat
      bordered
      :pagination="{
        sortBy: null,
        descending: false,
        page: 1,
        rowsPerPage: 10
      }"
    >
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn flat round icon="edit" @click="startEdit(props.row.id)" />
          <q-btn
            flat
            round
            icon="delete"
            color="negative"
            @click="confirmDelete(props.row)"
          />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="deleteDialog">
      <q-card>
        <q-card-section>確定刪除此聯絡人？</q-card-section>
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

    <q-banner
      v-if="contactStore.loadError"
      class="bg-negative text-white q-mt-md"
      rounded
    >
      <template v-slot:avatar>
        <q-icon name="error" />
      </template>
      無法讀取資料：{{ contactStore.loadError }}<br />
      <span class="text-caption">
        請確認已在 Google Cloud Console 啟用 Drive API，並將
        <code>drive.file</code> 範圍加入 OAuth 同意畫面。
      </span>
    </q-banner>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useContactStore } from '@/stores/contactStore.js'
import ContactForm from '@/components/ContactForm.vue'

const contactStore = useContactStore()
const deleteDialog = ref(false)
const toDelete = ref(null)
const editingId = ref(null)

const columns = [
  { name: 'name', label: '姓名', field: 'name', align: 'left', sortable: true },
  { name: 'email', label: '電子郵件', field: 'email', align: 'left' },
  { name: 'phone', label: '電話', field: 'phone', align: 'left' },
  { name: 'actions', label: '操作', field: 'actions', align: 'center' }
]

onMounted(() => contactStore.load())

function startAdd() {
  editingId.value = 'new'
}

function startEdit(id) {
  editingId.value = id
}

function onSaved() {
  editingId.value = null
}

function confirmDelete(contact) {
  toDelete.value = contact
  deleteDialog.value = true
}

async function doDelete() {
  if (toDelete.value) {
    await contactStore.remove(toDelete.value.id)
    toDelete.value = null
  }
}
</script>
