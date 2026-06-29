function isValidDate(d) {
  return d instanceof Date && !isNaN(d)
}

function addDays(dateStr, days) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (!isValidDate(d)) return null
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function dateAfter(dateStr) {
  return addDays(dateStr, 1)
}

function getEffectiveEnd(task) {
  return task.completedDate || task.deadline || null
}

function scheduleTaskDate(task, predecessor, dependencyType) {
  if (!predecessor || !dependencyType) return null

  const changes = {}

  if (dependencyType === 'FS') {
    const predEnd = getEffectiveEnd(predecessor)
    if (predEnd) {
      const newStart = dateAfter(predEnd)
      if (newStart !== task.startDate) {
        changes.startDate = newStart
      }
    }
  } else if (dependencyType === 'SS') {
    if (predecessor.startDate && predecessor.startDate !== task.startDate) {
      changes.startDate = predecessor.startDate
    }
  } else if (dependencyType === 'FF') {
    const predEnd = getEffectiveEnd(predecessor)
    if (predEnd && (!task.deadline || predEnd > task.deadline)) {
      const depDate = new Date(predEnd)
      const taskDate = task.deadline ? new Date(task.deadline) : null
      if (
        !taskDate ||
        (isValidDate(depDate) &&
          isValidDate(taskDate) &&
          predEnd > task.deadline)
      ) {
        changes.deadline = predEnd
      }
    }
  }

  return Object.keys(changes).length > 0 ? changes : null
}

function applyScheduleChange(dep, predecessor, adjustments) {
  if (!dep.predecessorId || !predecessor) return false

  const prevStart = dep.startDate
  const prevDeadline = dep.deadline

  const result = scheduleTaskDate(dep, predecessor, dep.dependencyType)
  if (!result) return false

  if (result.startDate !== undefined) {
    dep.startDate = result.startDate
  }
  if (result.deadline !== undefined) {
    dep.deadline = result.deadline
  }

  if (dep.startDate && dep.deadline && dep.startDate > dep.deadline) {
    dep.deadline = dep.startDate
    result.deadline = dep.startDate
  }

  const changes = {
    startDate:
      prevStart !== dep.startDate
        ? { from: prevStart, to: dep.startDate }
        : undefined,
    deadline:
      prevDeadline !== dep.deadline
        ? { from: prevDeadline, to: dep.deadline }
        : undefined
  }

  if (changes.startDate || changes.deadline) {
    adjustments.push({
      taskId: dep.id,
      taskName: dep.name,
      changes
    })
  }

  return true
}

function cascadeSchedule(tasks, triggerTaskId) {
  const queue = []
  const visited = new Set()
  const adjustments = []
  const tasksCopy = tasks.map(t => ({ ...t }))

  const taskMap = new Map()
  for (const t of tasksCopy) {
    taskMap.set(t.id, t)
  }

  const dependentsMap = new Map()
  for (const t of tasksCopy) {
    if (t.predecessorId) {
      const list = dependentsMap.get(t.predecessorId) || []
      list.push(t.id)
      dependentsMap.set(t.predecessorId, list)
    }
  }

  const triggerTask = taskMap.get(triggerTaskId)
  if (!triggerTask) return { tasks: tasksCopy, adjustments }

  if (triggerTask.predecessorId) {
    const predecessor = taskMap.get(triggerTask.predecessorId)
    if (predecessor) {
      applyScheduleChange(triggerTask, predecessor, adjustments)
    }
  }

  queue.push(triggerTaskId)

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const current = taskMap.get(currentId)
    if (!current) continue

    const dependents = dependentsMap.get(currentId) || []
    for (const depId of dependents) {
      if (visited.has(depId)) continue

      const dep = taskMap.get(depId)
      if (!dep) continue

      const predecessor = taskMap.get(dep.predecessorId)
      if (!predecessor) continue

      applyScheduleChange(dep, predecessor, adjustments)
      queue.push(depId)
    }
  }

  return { tasks: tasksCopy, adjustments }
}

export function useScheduleEngine() {
  return {
    scheduleTaskDate,
    cascadeSchedule
  }
}
