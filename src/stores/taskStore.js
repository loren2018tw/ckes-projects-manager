import { defineStore } from 'pinia'
import { ref } from 'vue'

const TASK_DATA_TYPE = 'tasks'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])
  const loading = ref(false)
  const loadError = ref(null)

  async function getProjectNameAsync(projectId) {
    try {
      const { useProjectStore } = await import('@/stores/projectStore.js')
      const store = useProjectStore()
      const p = store.find(projectId)
      return p ? p.name : projectId
    } catch {
      return projectId
    }
  }

  async function load(projectId) {
    loading.value = true
    loadError.value = null
    const { useDriveStorage } = await import('@/composables/useDriveStorage.js')
    const { readProjectData } = useDriveStorage()
    const projectName = await getProjectNameAsync(projectId)
    try {
      const data = await readProjectData(projectId, projectName, TASK_DATA_TYPE)
      if (Array.isArray(data)) {
        tasks.value = data
      } else {
        tasks.value = []
      }
    } catch (err) {
      if (err.message?.includes('Not authenticated')) {
        tasks.value = []
        return
      }
      tasks.value = []
      loadError.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function save(projectId) {
    const { useDriveStorage } = await import('@/composables/useDriveStorage.js')
    const { writeProjectData } = useDriveStorage()
    const projectName = await getProjectNameAsync(projectId)
    await writeProjectData(projectId, projectName, TASK_DATA_TYPE, tasks.value)
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  }

  function hasCycle(tasksList, predecessorId, currentId) {
    const visited = new Set()
    function dfs(nodeId) {
      if (nodeId === currentId) return true
      if (visited.has(nodeId)) return false
      visited.add(nodeId)
      const task = tasksList.find(t => t.id === nodeId)
      if (task && task.predecessorId) {
        return dfs(task.predecessorId)
      }
      return false
    }
    return predecessorId ? dfs(predecessorId) : false
  }

  async function add(projectId, task) {
    tasks.value.push(task)
    await save(projectId)
  }

  async function update(projectId, taskId, fields) {
    const idx = tasks.value.findIndex(t => t.id === taskId)
    if (idx !== -1) {
      tasks.value[idx] = { ...tasks.value[idx], ...fields }
      await save(projectId)
    }
  }

  async function remove(projectId, taskId) {
    tasks.value = tasks.value.filter(t => t.id !== taskId)
    await save(projectId)
  }

  function find(taskId) {
    return tasks.value.find(t => t.id === taskId)
  }

  function getDependents(taskId) {
    return tasks.value.filter(t => t.predecessorId === taskId)
  }

  return {
    tasks,
    loading,
    loadError,
    load,
    save,
    add,
    update,
    remove,
    find,
    getDependents,
    hasCycle,
    generateId
  }
})
