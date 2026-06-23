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
const props = defineProps({
  projectId: { type: String, default: null }
})

const emit = defineEmits(['saved', 'cancel'])

const projectStore = useProjectStore()

const isEdit = computed(() => !!props.projectId)

const form = ref({ name: '', status: 'active', budget: null })
const deleteDialog = ref(false)

if (isEdit.value) {
  const p = projectStore.find(props.projectId)
  if (p) form.value = { ...p }
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
  emit('saved')
}

async function reopenProject() {
  await projectStore.reopenProject(props.projectId)
  form.value.status = 'active'
  emit('saved')
}

async function doDelete() {
  await projectStore.remove(props.projectId)
  emit('saved')
}
</script>
