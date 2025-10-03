/**
 * Task Executor
 * Handles execution of scheduled tasks with retry logic and logging
 */

import { getTaskHandler } from './tasks'
import { generateExecutionId } from './utils'
import type { ScheduledTask, TaskExecution, TaskExecutionResult } from './types'

/**
 * Execute a single task
 */
export async function executeTask(task: ScheduledTask, env: Env): Promise<TaskExecutionResult> {
  const startTime = Date.now()
  const executionId = generateExecutionId(task.name)

  console.log(`Executing task: ${task.name} (${executionId})`)

  // Create execution record
  const execution: TaskExecution = {
    id: executionId,
    taskId: task.id,
    taskName: task.name,
    startedAt: new Date().toISOString(),
    status: 'running',
  }

  // Store execution record in DB
  await storeExecution(execution, env)

  try {
    // Get task handler
    const handler = getTaskHandler(task.handler)

    // Execute with timeout (30s max for Workers)
    const result = await executeWithTimeout(handler(env), 29000)

    const durationMs = Date.now() - startTime

    // Update execution record
    execution.completedAt = new Date().toISOString()
    execution.status = 'success'
    execution.result = result
    execution.durationMs = durationMs

    await storeExecution(execution, env)

    console.log(`Task ${task.name} completed successfully in ${durationMs}ms`)

    return {
      success: true,
      result,
      durationMs,
    }
  } catch (error: any) {
    const durationMs = Date.now() - startTime

    // Update execution record
    execution.completedAt = new Date().toISOString()
    execution.status = 'failed'
    execution.error = error.message
    execution.durationMs = durationMs

    await storeExecution(execution, env)

    console.error(`Task ${task.name} failed after ${durationMs}ms:`, error.message)

    return {
      success: false,
      error: error.message,
      durationMs,
    }
  }
}

/**
 * Execute a task with retry logic
 */
export async function executeTaskWithRetry(
  task: ScheduledTask,
  env: Env,
  maxRetries: number = 3
): Promise<TaskExecutionResult> {
  let lastError: string | undefined
  let attempt = 0

  while (attempt < maxRetries) {
    attempt++

    const result = await executeTask(task, env)

    if (result.success) {
      return result
    }

    lastError = result.error

    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries) {
      const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000)
      console.log(`Retrying task ${task.name} in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return {
    success: false,
    error: lastError || 'Unknown error',
    durationMs: 0,
  }
}

/**
 * Execute function with timeout
 */
async function executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Task execution timeout')), timeoutMs)),
  ])
}

/**
 * Store execution record in database
 */
async function storeExecution(execution: TaskExecution, env: Env): Promise<void> {
  try {
    const db = env.DB as any // Service binding (RPC)
    await db.upsert({
      $id: `schedule/execution/${execution.id}`,
      data: execution,
    })
  } catch (error: any) {
    console.error('Failed to store execution record:', error.message)
  }
}

/**
 * Get execution history for a task
 */
export async function getExecutionHistory(taskId: string, env: Env, limit: number = 50): Promise<TaskExecution[]> {
  try {
    const db = env.DB as any // Service binding (RPC)
    const result = await db.list('schedule/execution', {
      limit,
    })

    if (!result?.data) {
      return []
    }

    // Filter by task ID and sort by start time
    const executions = result.data
      .map((item: any) => item.data as TaskExecution)
      .filter((exec: TaskExecution) => exec.taskId === taskId)
      .sort((a: TaskExecution, b: TaskExecution) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit)

    return executions
  } catch (error: any) {
    console.error('Failed to get execution history:', error.message)
    return []
  }
}

/**
 * Get recent executions (all tasks)
 */
export async function getRecentExecutions(env: Env, limit: number = 100): Promise<TaskExecution[]> {
  try {
    const db = env.DB as any // Service binding (RPC)
    const result = await db.list('schedule/execution', {
      limit,
    })

    if (!result?.data) {
      return []
    }

    // Sort by start time
    const executions = result.data
      .map((item: any) => item.data as TaskExecution)
      .sort((a: TaskExecution, b: TaskExecution) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit)

    return executions
  } catch (error: any) {
    console.error('Failed to get recent executions:', error.message)
    return []
  }
}
