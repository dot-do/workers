/**
 * Scheduler
 * Manages task registration, scheduling, and execution orchestration
 */

import { shouldRun, getNextRun, isValidCron } from './utils'
import { executeTaskWithRetry } from './executor'
import { defaultTasks, hasTaskHandler } from './tasks'
import type { ScheduledTask, RegisterTaskOptions } from './types'

/**
 * Initialize default tasks in database
 */
export async function initializeDefaultTasks(env: Env): Promise<void> {
  console.log('Initializing default tasks...')

  for (const taskDef of defaultTasks) {
    try {
      // Check if task already exists
      const existing = await getTask(taskDef.name, env)

      if (!existing) {
        await registerTask(
          {
            name: taskDef.name,
            schedule: taskDef.schedule,
            handler: taskDef.handler,
            enabled: taskDef.enabled,
            metadata: taskDef.metadata,
          },
          env
        )
        console.log(`Registered default task: ${taskDef.name}`)
      }
    } catch (error: any) {
      console.error(`Failed to register default task ${taskDef.name}:`, error.message)
    }
  }
}

/**
 * Register a new scheduled task
 */
export async function registerTask(options: RegisterTaskOptions, env: Env): Promise<ScheduledTask> {
  const { name, schedule, handler, enabled = true, metadata = {} } = options

  // Validate schedule
  if (!isValidCron(schedule)) {
    throw new Error(`Invalid schedule expression: ${schedule}`)
  }

  // Validate handler exists
  if (!hasTaskHandler(handler)) {
    throw new Error(`Task handler not found: ${handler}`)
  }

  const now = new Date().toISOString()
  const nextRun = getNextRun(schedule).toISOString()

  const task: ScheduledTask = {
    id: `task_${name}`,
    name,
    schedule,
    handler,
    enabled,
    nextRun,
    metadata,
    createdAt: now,
    updatedAt: now,
  }

  // Store in database via RPC
  const db = env.DB as any // Service binding (RPC)
  await db.upsert({
    $id: `schedule/task/${task.id}`,
    data: task,
  })

  return task
}

/**
 * Unregister a task
 */
export async function unregisterTask(name: string, env: Env): Promise<boolean> {
  try {
    const db = env.DB as any // Service binding (RPC)
    await db.delete('schedule/task', `task_${name}`)
    return true
  } catch (error: any) {
    console.error(`Failed to unregister task ${name}:`, error.message)
    return false
  }
}

/**
 * Enable a task
 */
export async function enableTask(name: string, env: Env): Promise<boolean> {
  const task = await getTask(name, env)
  if (!task) return false

  task.enabled = true
  task.updatedAt = new Date().toISOString()

  const db = env.DB as any // Service binding (RPC)
  await db.upsert({
    $id: `schedule/task/${task.id}`,
    data: task,
  })

  return true
}

/**
 * Disable a task
 */
export async function disableTask(name: string, env: Env): Promise<boolean> {
  const task = await getTask(name, env)
  if (!task) return false

  task.enabled = false
  task.updatedAt = new Date().toISOString()

  const db = env.DB as any // Service binding (RPC)
  await db.upsert({
    $id: `schedule/task/${task.id}`,
    data: task,
  })

  return true
}

/**
 * Get a task by name
 */
export async function getTask(name: string, env: Env): Promise<ScheduledTask | null> {
  try {
    const db = env.DB as any // Service binding (RPC)
    const result = await db.get(`schedule/task/task_${name}`)
    if (!result?.data) return null
    return result.data.data as ScheduledTask
  } catch (error: any) {
    console.error(`Failed to get task ${name}:`, error.message)
    return null
  }
}

/**
 * List all tasks
 */
export async function listTasks(env: Env): Promise<ScheduledTask[]> {
  try {
    const db = env.DB as any // Service binding (RPC)
    const result = await db.list('schedule/task', {
      limit: 1000,
    })

    if (!result?.data) return []

    return result.data.map((item: any) => item.data as ScheduledTask)
  } catch (error: any) {
    console.error('Failed to list tasks:', error.message)
    return []
  }
}

/**
 * Update task's last run and next run times
 */
async function updateTaskRun(task: ScheduledTask, env: Env): Promise<void> {
  const now = new Date().toISOString()
  const nextRun = getNextRun(task.schedule).toISOString()

  task.lastRun = now
  task.nextRun = nextRun
  task.updatedAt = now

  const db = env.DB as any // Service binding (RPC)
  await db.upsert({
    $id: `schedule/task/${task.id}`,
    data: task,
  })
}

/**
 * Run tasks that are due
 * Called by cron trigger
 */
export async function runDueTasks(env: Env, cronExpression: string): Promise<void> {
  console.log(`Running due tasks for cron: ${cronExpression}`)

  const tasks = await listTasks(env)

  for (const task of tasks) {
    // Skip disabled tasks
    if (!task.enabled) {
      console.log(`Skipping disabled task: ${task.name}`)
      continue
    }

    // Check if task should run
    if (!shouldRun(task.schedule, task.lastRun)) {
      console.log(`Skipping task ${task.name} (not due yet)`)
      continue
    }

    console.log(`Running task: ${task.name}`)

    // Execute task (with retry)
    await executeTaskWithRetry(task, env, 3)

    // Update last run time
    await updateTaskRun(task, env)
  }
}

/**
 * Run a specific task immediately (manual execution)
 */
export async function runTaskNow(name: string, env: Env): Promise<boolean> {
  const task = await getTask(name, env)

  if (!task) {
    console.error(`Task not found: ${name}`)
    return false
  }

  if (!task.enabled) {
    console.error(`Task is disabled: ${name}`)
    return false
  }

  console.log(`Manually running task: ${name}`)

  // Execute task (with retry)
  const result = await executeTaskWithRetry(task, env, 3)

  // Update last run time
  await updateTaskRun(task, env)

  return result.success
}
