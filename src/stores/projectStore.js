import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDriveStorage } from '@/composables/useDriveStorage.js'

export const useProjectStore = defineStore('project', () => {
  const projects = ref([])
  const loadError = ref(null)
  const filter = ref('active')
  const {
    readData,
    writeData,
    ensureProjectFolder,
    deleteProjectFolder,
    renameProjectFolder
  } = useDriveStorage()

  const filteredProjects = computed(() => {
    if (filter.value === 'all') return projects.value
    return projects.value.filter(p => p.status === 'active')
  })

  async function load() {
    loadError.value = null
    try {
      projects.value = await readData('projects')
    } catch (err) {
      loadError.value = err.message
      projects.value = []
    }
  }

  async function save() {
    await writeData('projects', projects.value)
  }

  function find(id) {
    return projects.value.find(p => p.id === id)
  }

  async function add(project) {
    projects.value.push(project)
    await save()
    try {
      await ensureProjectFolder(project.id, project.name)
    } catch (err) {
      console.error('建立專案資料夾失敗:', err)
    }
  }

  async function update(id, fields) {
    const idx = projects.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      const oldName = projects.value[idx].name
      projects.value[idx] = { ...projects.value[idx], ...fields }
      await save()
      if (fields.name && fields.name !== oldName) {
        try {
          await renameProjectFolder(id, oldName, fields.name)
        } catch (err) {
          console.error('重新命名專案資料夾失敗:', err)
        }
      }
    }
  }

  async function closeProject(id) {
    await update(id, { status: 'closed', updatedAt: new Date().toISOString() })
  }

  async function reopenProject(id) {
    await update(id, { status: 'active', updatedAt: new Date().toISOString() })
  }

  async function remove(id) {
    const project = projects.value.find(p => p.id === id)
    projects.value = projects.value.filter(p => p.id !== id)
    await save()
    if (project) {
      try {
        await deleteProjectFolder(id, project.name)
      } catch (err) {
        console.error('刪除專案資料夾失敗:', err)
      }
    }
  }

  function setFilter(val) {
    filter.value = val
  }

  return {
    projects,
    loadError,
    filter,
    filteredProjects,
    load,
    find,
    add,
    update,
    closeProject,
    reopenProject,
    remove,
    setFilter
  }
})
