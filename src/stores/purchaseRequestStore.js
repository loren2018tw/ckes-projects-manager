import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useDriveStorage } from '@/composables/useDriveStorage.js'

let nextItemId = 1

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function newItemId() {
  return `item_${nextItemId++}_${Date.now().toString(36)}`
}

export const usePurchaseRequestStore = defineStore('purchaseRequest', () => {
  const requests = ref([])
  const loadError = ref(null)
  const { readData, writeData } = useDriveStorage()

  async function load() {
    loadError.value = null
    try {
      const data = await readData('purchaseRequests')
      requests.value = (Array.isArray(data) ? data : []).sort((a, b) =>
        (b.date || '').localeCompare(a.date || '')
      )
    } catch (err) {
      loadError.value = err.message
      requests.value = []
    }
  }

  async function save() {
    await writeData('purchaseRequests', requests.value)
  }

  function find(id) {
    return requests.value.find(r => r.id === id)
  }

  async function add(request) {
    const newRequest = {
      ...request,
      id: genId(),
      items: request.items || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    if (!newRequest.date) {
      newRequest.date = new Date().toISOString().slice(0, 10)
    }
    requests.value.push(newRequest)
    await save()
    return newRequest
  }

  async function update(id, fields) {
    const idx = requests.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      requests.value[idx] = {
        ...requests.value[idx],
        ...fields,
        updatedAt: new Date().toISOString()
      }
      await save()
    }
  }

  async function remove(id) {
    requests.value = requests.value.filter(r => r.id !== id)
    await save()
  }

  async function duplicate(id) {
    const original = requests.value.find(r => r.id === id)
    if (!original) return null

    const newRequest = {
      ...original,
      id: genId(),
      date: new Date().toISOString().slice(0, 10),
      items: original.items.map(item => ({
        ...item,
        id: newItemId()
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    requests.value.push(newRequest)
    await save()
    return newRequest
  }

  return {
    requests,
    loadError,
    load,
    find,
    add,
    update,
    remove,
    duplicate
  }
})
