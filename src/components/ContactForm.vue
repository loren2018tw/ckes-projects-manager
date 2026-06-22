<template>
  <q-form @submit="onSubmit" class="q-gutter-md">
    <q-input
      v-model="form.name"
      label="姓名"
      :rules="[v => !!v || '姓名不可為空白']"
      outlined
    />
    <q-input v-model="form.email" label="電子郵件" type="email" outlined />
    <q-input v-model="form.phone" label="電話" outlined />

    <div class="row q-gutter-sm">
      <q-btn type="submit" color="primary" :label="isEdit ? '更新' : '新增'" />
      <q-btn flat label="取消" @click="$emit('cancel')" />
    </div>
  </q-form>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useContactStore } from '@/stores/contactStore.js'

const props = defineProps({
  contactId: { type: String, default: null }
})

const emit = defineEmits(['saved', 'cancel'])

const contactStore = useContactStore()

const isEdit = computed(() => !!props.contactId)

const form = ref({ name: '', email: '', phone: '' })

if (isEdit.value) {
  const c = contactStore.find(props.contactId)
  if (c) form.value = { ...c }
}

async function onSubmit() {
  if (isEdit.value) {
    await contactStore.update(props.contactId, {
      ...form.value,
      updatedAt: new Date().toISOString()
    })
  } else {
    await contactStore.add({
      id: crypto.randomUUID(),
      ...form.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
  emit('saved')
}
</script>
