<template>
  <div class="q-pa-md">
    <div class="text-h5 q-mb-md">偏好設定</div>

    <q-banner
      v-if="store.loadError"
      class="bg-negative text-white q-mb-md"
      rounded
    >
      <template v-slot:avatar>
        <q-icon name="error" />
      </template>
      無法讀取設定：{{ store.loadError }}
    </q-banner>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-h6 q-mb-md">請購單設定</div>

        <q-input
          v-model="schoolTitle"
          label="請購單抬頭"
          outlined
          class="q-mb-md"
          hint="此抬頭將用於請購單列印的 {{school_title}} 欄位"
        />

        <q-btn
          color="primary"
          icon="save"
          label="儲存設定"
          :loading="saving"
          @click="doSave"
        />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useSettingsStore } from '@/stores/settingsStore.js'

const $q = useQuasar()
const store = useSettingsStore()

const schoolTitle = ref('')
const saving = ref(false)

async function doSave() {
  saving.value = true
  try {
    await store.update({ schoolTitle: schoolTitle.value })
    $q.notify({ type: 'positive', message: '設定已儲存', timeout: 2000 })
  } catch {
    $q.notify({
      type: 'negative',
      message: '儲存失敗，請稍後再試',
      timeout: 3000
    })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await store.load()
  schoolTitle.value = store.settings.schoolTitle
})
</script>
