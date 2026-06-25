import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDriveStorage } from '@/composables/useDriveStorage.js'

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const useProjectStore = defineStore('project', () => {
  const projects = ref([])
  const loadError = ref(null)
  const cloneError = ref(null)
  const cloning = ref(false)
  const filter = ref('active')
  const {
    readData,
    writeData,
    ensureProjectFolder,
    ensureProjectSubfolder,
    deleteProjectFolder,
    renameProjectFolder,
    copyDriveFile,
    readProjectData,
    writeProjectData,
    listFolderItems
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

  async function duplicate(projectId, newName, copyResources) {
    const original = projects.value.find(p => p.id === projectId)
    if (!original) throw new Error('找不到原始專案')

    cloneError.value = null
    cloning.value = true
    let newId = null

    try {
      newId = genId()
      const now = new Date().toISOString()

      const newProject = {
        ...original,
        id: newId,
        name: newName,
        status: 'active',
        createdAt: now,
        updatedAt: now
      }
      delete newProject.closedAt

      projects.value.push(newProject)
      await save()

      await ensureProjectFolder(newId, newName)

      const taskData = await readProjectData(projectId, original.name, 'tasks')
      if (Array.isArray(taskData) && taskData.length > 0) {
        const idMap = {}
        const clonedTasks = taskData.map(task => {
          const newTaskId = genId()
          idMap[task.id] = newTaskId
          return {
            ...task,
            id: newTaskId,
            startDate: null,
            deadline: null,
            completedDate: null,
            assignee: null,
            status: 'not_started'
          }
        })
        for (const task of clonedTasks) {
          if (task.predecessorId && idMap[task.predecessorId]) {
            task.predecessorId = idMap[task.predecessorId]
          }
        }
        await writeProjectData(newId, newName, 'tasks', clonedTasks)
      }

      if (copyResources) {
        const categories = ['公文', '附件', '報表', '其他']
        for (const cat of categories) {
          const subfolderId = await ensureProjectSubfolder(newId, newName, cat)
          const srcSubfolderId = await ensureProjectSubfolder(
            projectId,
            original.name,
            cat
          )
          const files = await listFolderItems(srcSubfolderId)
          for (const file of files) {
            if (file.mimeType !== 'application/vnd.google-apps.folder') {
              await copyDriveFile(file.id, file.name, subfolderId)
            }
          }
        }
      }

      return newProject
    } catch (err) {
      cloneError.value = err.message
      const idx = projects.value.findIndex(p => p.id === newId)
      if (idx !== -1) {
        projects.value.splice(idx, 1)
        await save()
      }
      if (newId) {
        try {
          await deleteProjectFolder(newId, newName)
        } catch {}
      }
      throw err
    } finally {
      cloning.value = false
    }
  }

  function setFilter(val) {
    filter.value = val
  }

  return {
    projects,
    loadError,
    cloneError,
    cloning,
    filter,
    filteredProjects,
    load,
    find,
    add,
    update,
    closeProject,
    reopenProject,
    remove,
    duplicate,
    setFilter
  }
})
