<template>
  <q-form @submit="onSubmit" class="q-gutter-md q-mb-lg">
    <q-input
      v-model="form.name"
      label="專案名稱"
      :rules="[v => !!v || '專案名稱不可為空白']"
      outlined
    />

    <q-input
      v-model.number="form.budget"
      label="核定金額"
      type="number"
      outlined
      prefix="NT$"
      :min="0"
    />

    <div class="row q-gutter-sm">
      <q-btn type="submit" color="primary" label="更新" />
      <q-btn flat label="取消" @click="$emit('cancel')" />
      <q-btn
        v-if="form.status === 'active'"
        color="warning"
        label="結案"
        @click="closeProject"
      />
      <q-btn
        v-if="form.status === 'closed'"
        color="positive"
        label="取消結案"
        @click="reopenProject"
      />
      <q-btn flat label="刪除" color="negative" @click="confirmDelete" />
    </div>
  </q-form>

  <template v-if="isEdit">
    <q-separator class="q-mb-md" />

    <div class="text-h6 q-mb-sm">工作人員</div>

    <q-list bordered separator v-if="staffList.length > 0">
      <q-item v-for="staff in staffList" :key="staff.id">
        <q-item-section>
          <q-item-label>{{ staff.name }}</q-item-label>
          <q-item-label caption
            >{{ staff.email }} · {{ staff.phone }}</q-item-label
          >
        </q-item-section>
        <q-item-section side>
          <q-btn
            flat
            round
            icon="remove_circle"
            color="negative"
            @click="removeStaff(staff)"
          />
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else class="text-grey q-mb-sm">尚未加入工作人員</div>

    <q-btn
      color="secondary"
      icon="person_add"
      label="加入工作人員"
      @click="staffDialog = true"
    />

    <q-dialog v-model="staffDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">選擇聯絡人</div>
        </q-card-section>
        <q-card-section style="max-height: 400px" class="scroll">
          <q-list>
            <q-item
              v-for="contact in availableContacts"
              :key="contact.id"
              clickable
              @click="addStaff(contact)"
            >
              <q-item-section>
                <q-item-label>{{ contact.name }}</q-item-label>
                <q-item-label caption>{{ contact.email }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="availableContacts.length === 0">
              <q-item-section class="text-grey"
                >沒有可加入的聯絡人</q-item-section
              >
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

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
  </template>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/projectStore.js'
import { useContactStore } from '@/stores/contactStore.js'
import { useProjectStaffStore } from '@/stores/projectStaffStore.js'

const props = defineProps({
  projectId: { type: String, default: null }
})

const emit = defineEmits(['saved', 'cancel'])

const projectStore = useProjectStore()
const contactStore = useContactStore()
const staffStore = useProjectStaffStore()

const isEdit = computed(() => !!props.projectId)

const form = ref({ name: '', status: 'active', budget: null })
const staffDialog = ref(false)
const deleteDialog = ref(false)
const staffList = ref([])

const availableContacts = computed(() =>
  contactStore.contacts.filter(c => !staffStore.isMember(props.projectId, c.id))
)

if (isEdit.value) {
  const p = projectStore.find(props.projectId)
  if (p) form.value = { ...p }

  const members = staffStore.byProject(props.projectId)
  staffList.value = members.map(m => {
    const contact = contactStore.find(m.contactId)
    return contact
      ? {
          ...m,
          name: contact.name,
          email: contact.email,
          phone: contact.phone
        }
      : m
  })
}

async function onSubmit() {
  if (isEdit.value) {
    await projectStore.update(props.projectId, {
      ...form.value,
      updatedAt: new Date().toISOString()
    })
  } else {
    await projectStore.add({
      id: crypto.randomUUID(),
      ...form.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
  emit('saved')
}

function confirmDelete() {
  deleteDialog.value = true
}

async function closeProject() {
  await projectStore.closeProject(props.projectId)
  form.value.status = 'closed'
}

async function reopenProject() {
  await projectStore.reopenProject(props.projectId)
  form.value.status = 'active'
}

async function addStaff(contact) {
  await staffStore.add({
    id: crypto.randomUUID(),
    projectId: props.projectId,
    contactId: contact.id,
    addedAt: new Date().toISOString()
  })
  staffList.value.push({
    ...contact,
    contactId: contact.id,
    projectId: props.projectId
  })
  staffDialog.value = false
}

async function removeStaff(staff) {
  await staffStore.remove(staff.id)
  staffList.value = staffList.value.filter(s => s.id !== staff.id)
}

async function doDelete() {
  await projectStore.remove(props.projectId)
  emit('saved')
}
</script>
