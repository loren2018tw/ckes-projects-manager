import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useDriveStorage } from '@/composables/useDriveStorage.js'

const DEFAULTS = {
  schoolTitle: '臺中市東區成功國民小學'
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref({ ...DEFAULTS })
  const loadError = ref(null)
  const { readData, writeData } = useDriveStorage()

  async function load() {
    loadError.value = null
    try {
      const data = await readData('settings')
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        settings.value = { ...DEFAULTS, ...data }
      } else {
        settings.value = { ...DEFAULTS }
      }
    } catch {
      settings.value = { ...DEFAULTS }
    }
  }

  async function save() {
    await writeData('settings', settings.value)
  }

  async function update(fields) {
    settings.value = { ...settings.value, ...fields }
    await save()
  }

  return {
    settings,
    loadError,
    load,
    save,
    update
  }
})
