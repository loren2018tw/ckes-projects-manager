import { defineStore } from 'pinia'
import { ref } from 'vue'

const TASK_DATA_TYPE = 'tasks'

function isValidDate(d) {
  return d instanceof Date && !isNaN(d)
}

function sanitizeDate(value) {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value)
    if (!isValidDate(d)) return null
    const iso = d.toISOString().slice(0, 10)
    const year = parseInt(iso.slice(0, 4), 10)
    if (year < 2000 || year > 2100) return null
    return iso
  }
  const year = parseInt(value.slice(0, 4), 10)
  if (year < 2000 || year > 2100) return null
  return value
}

function migrateLegacyTask(task) {
  const t = { ...task }
  t.deadline = sanitizeDate(t.deadline)
  t.startDate = sanitizeDate(t.startDate)
  t.completedDate = sanitizeDate(t.completedDate)
  if (!('status' in t)) {
    t.status = t.completedDate ? 'completed' : 'not_started'
  }
  if (!t.startDate && t.deadline) {
    t.startDate = new Date(new Date(t.deadline).getTime() - 7 * 864e5)
      .toISOString()
      .slice(0, 10)
  }
  if (!('description' in t)) {
    t.description = ''
  }
  if (!('assignee' in t)) {
    t.assignee = null
  }
  return t
}

function validateTask(tasksList, task) {
  if (task.status === 'completed' && task.predecessorId) {
    const pred = tasksList.find(t => t.id === task.predecessorId)
    if (pred && pred.status !== 'completed') {
      return {
        valid: false,
        message: '前置任務尚未完成，無法將此任務設為已完成'
      }
    }
  }
  if (
    task.startDate &&
    task.deadline &&
    isValidDate(new Date(task.startDate)) &&
    isValidDate(new Date(task.deadline)) &&
    task.startDate > task.deadline
  ) {
    return { valid: false, message: '開始日期不能晚於截止日期', adjust: true }
  }
  return { valid: true }
}

function isBlocked(tasksList, task) {
  if (!task.predecessorId) return false
  const pred = tasksList.find(t => t.id === task.predecessorId)
  if (!pred) return true
  if (task.dependencyType === 'SS') {
    return !pred.startDate && pred.status === 'not_started'
  }
  if (task.dependencyType === 'FF') {
    return false
  }
  return pred.status !== 'completed'
}

function getTasksByStatus(tasksList, status) {
  return tasksList.filter(t => t.status === status)
}

function getBlockedTasks(tasksList) {
  return tasksList.filter(t => isBlocked(tasksList, t))
}

export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])
  const loading = ref(false)
  const loadError = ref(null)

  async function migrateAssigneeFormat(projectId) {
    try {
      const { useProjectStaffStore } =
        await import('@/stores/projectStaffStore.js')
      const { useContactStore } = await import('@/stores/contactStore.js')
      const staffStore = useProjectStaffStore()
      const contactStore = useContactStore()
      if (staffStore.staffList.length === 0) {
        await staffStore.load()
      }
      if (contactStore.contacts.length === 0) {
        await contactStore.load()
      }
      const projectStaff = staffStore.byProject(projectId)
      if (projectStaff.length === 0) return

      let migrated = false
      tasks.value = tasks.value.map(task => {
        if (!task.assignee) return task
        const staff = projectStaff.find(s => s.id === task.assignee)
        if (staff) {
          migrated = true
          const contact = contactStore.find(staff.contactId)
          return { ...task, assignee: contact ? contact.id : null }
        }
        return task
      })

      if (migrated) {
        await save(projectId)
      }
    } catch {
      // projectStaffStore no longer exists — migration already done
    }
  }

  async function load(projectId) {
    loading.value = true
    loadError.value = null
    const { useDriveStorage } = await import('@/composables/useDriveStorage.js')
    const { readProjectData } = useDriveStorage()
    try {
      const data = await readProjectData(projectId, null, TASK_DATA_TYPE)
      if (Array.isArray(data)) {
        tasks.value = data.map(migrateLegacyTask)
        await migrateAssigneeFormat(projectId)
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
    for (const t of tasks.value) {
      t.deadline = sanitizeDate(t.deadline)
      t.startDate = sanitizeDate(t.startDate)
      t.completedDate = sanitizeDate(t.completedDate)
    }
    const { useDriveStorage } = await import('@/composables/useDriveStorage.js')
    const { writeProjectData } = useDriveStorage()
    await writeProjectData(projectId, null, TASK_DATA_TYPE, tasks.value)
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

  async function runSchedule(projectId, triggerTaskId) {
    const triggerTask = tasks.value.find(t => t.id === triggerTaskId)
    if (!triggerTask) return null
    if (
      triggerTask.predecessorId &&
      hasCycle(tasks.value, triggerTask.predecessorId, triggerTaskId)
    ) {
      return null
    }
    const { useScheduleEngine } =
      await import('@/composables/useScheduleEngine.js')
    const { cascadeSchedule } = useScheduleEngine()
    const result = cascadeSchedule(tasks.value, triggerTaskId)
    if (result && result.adjustments.length > 0) {
      for (const adj of result.adjustments) {
        const t = tasks.value.find(t => t.id === adj.taskId)
        if (t) {
          if (adj.changes.startDate) t.startDate = adj.changes.startDate.to
          if (adj.changes.deadline) t.deadline = adj.changes.deadline.to
        }
      }
      return result.adjustments
    }
    return null
  }

  async function add(projectId, task) {
    tasks.value.push({
      startDate: null,
      status: 'not_started',
      description: '',
      assignee: null,
      ...task
    })
    const newTask = tasks.value[tasks.value.length - 1]
    const adjustments = newTask.predecessorId
      ? await runSchedule(projectId, newTask.id)
      : null
    await save(projectId)
    return adjustments
  }

  async function update(projectId, taskId, fields) {
    const idx = tasks.value.findIndex(t => t.id === taskId)
    if (idx !== -1) {
      tasks.value[idx] = { ...tasks.value[idx], ...fields }
      const adjustments = await runSchedule(projectId, taskId)
      await save(projectId)
      return adjustments
    }
    return null
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

  function getDependencyChain(taskId) {
    const chain = []
    const visited = new Set()
    function traverse(id) {
      if (visited.has(id)) return
      visited.add(id)
      const task = tasks.value.find(t => t.id === id)
      if (!task) return
      chain.push(task)
      if (task.predecessorId) {
        traverse(task.predecessorId)
      }
    }
    traverse(taskId)
    return chain
  }

  return {
    tasks,
    loading,
    loadError,
    load,
    save,
    migrateAssigneeFormat,
    add,
    update,
    remove,
    find,
    getDependents,
    getDependencyChain,
    hasCycle,
    generateId,
    migrateLegacyTask,
    validateTask,
    isBlocked,
    getTasksByStatus,
    getBlockedTasks,
    runSchedule
  }
})
