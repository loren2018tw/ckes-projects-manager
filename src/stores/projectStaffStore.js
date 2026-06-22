import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useDriveStorage } from '@/composables/useDriveStorage.js'

export const useProjectStaffStore = defineStore('projectStaff', () => {
  const staffList = ref([])
  const loadError = ref(null)
  const { readData, writeData } = useDriveStorage()

  async function load() {
    loadError.value = null
    try {
      staffList.value = await readData('projectStaff')
    } catch (err) {
      loadError.value = err.message
      staffList.value = []
    }
  }

  async function save() {
    await writeData('projectStaff', staffList.value)
  }

  function byProject(projectId) {
    return staffList.value.filter(s => s.projectId === projectId)
  }

  async function add(entry) {
    staffList.value.push(entry)
    await save()
  }

  async function remove(id) {
    staffList.value = staffList.value.filter(s => s.id !== id)
    await save()
  }

  function isMember(projectId, contactId) {
    return staffList.value.some(
      s => s.projectId === projectId && s.contactId === contactId
    )
  }

  return { staffList, loadError, load, byProject, add, remove, isMember }
})
