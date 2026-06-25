<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">複製專案</div>
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <q-input
          v-model="projectName"
          label="新專案名稱"
          :rules="[
            v => !!v || '專案名稱不可為空白',
            v => !isDuplicate(v) || '此專案名稱已存在'
          ]"
          :disable="loading"
          outlined
          autofocus
          ref="nameInput"
        />

        <q-checkbox
          v-model="copyResources"
          label="複製資源檔案"
          :disable="loading"
        />

        <div v-if="error" class="text-negative text-body2">{{ error }}</div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat
          label="取消"
          :disable="loading"
          v-close-popup
          @click="$emit('cancel')"
        />
        <q-btn
          color="primary"
          label="複製"
          :loading="loading"
          :disable="loading"
          @click="onConfirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  sourceProject: { type: Object, default: null },
  existingProjectNames: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const show = ref(props.modelValue)
const projectName = ref('')
const copyResources = ref(true)
const nameInput = ref(null)

watch(
  () => props.modelValue,
  val => {
    show.value = val
    if (val && props.sourceProject) {
      projectName.value = `${props.sourceProject.name} - 複製`
      copyResources.value = true
    }
  }
)

watch(show, val => {
  emit('update:modelValue', val)
})

function isDuplicate(name) {
  if (!name || !props.sourceProject) return false
  return props.existingProjectNames.some(
    n => n.toLowerCase() === name.trim().toLowerCase()
  )
}

function onConfirm() {
  if (!projectName.value?.trim()) return
  if (isDuplicate(projectName.value.trim())) return
  emit('confirm', {
    name: projectName.value.trim(),
    copyResources: copyResources.value
  })
}

function reset() {
  projectName.value = ''
  copyResources.value = true
}
</script>
