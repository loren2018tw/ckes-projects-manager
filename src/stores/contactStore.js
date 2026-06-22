import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useDriveStorage } from '@/composables/useDriveStorage.js'

export const useContactStore = defineStore('contact', () => {
  const contacts = ref([])
  const loadError = ref(null)
  const { readData, writeData } = useDriveStorage()

  async function load() {
    loadError.value = null
    try {
      contacts.value = await readData('contacts')
    } catch (err) {
      loadError.value = err.message
      contacts.value = []
    }
  }

  async function save() {
    await writeData('contacts', contacts.value)
  }

  function find(id) {
    return contacts.value.find(c => c.id === id)
  }

  async function add(contact) {
    contacts.value.push(contact)
    await save()
  }

  async function update(id, fields) {
    const idx = contacts.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      contacts.value[idx] = { ...contacts.value[idx], ...fields }
      await save()
    }
  }

  async function remove(id) {
    contacts.value = contacts.value.filter(c => c.id !== id)
    await save()
  }

  return { contacts, loadError, load, find, add, update, remove }
})
