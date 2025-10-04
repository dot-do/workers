/**
 * Human Service - Human-in-the-Loop Task Management
 *
 * RPC-based service for creating tasks that require human interaction,
 * collecting responses, and managing task lifecycle.
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type {
  ExecutionRecord,
  ExecutionRequest,
  ExecutionStatus,
  HumanChannel,
  HumanFunction,
  ExecutionResult,
} from './types'

// ============================================================================
// Simplified Task Types for CLI Interaction
// ============================================================================

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'timeout'
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

export interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'email' | 'textarea' | 'select' | 'multiselect' | 'date' | 'boolean'
  required?: boolean
  placeholder?: string
  description?: string
  options?: { label: string; value: string }[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

export interface TaskRecord {
  id: string
  name: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  formFields: FormField[]
  context?: Record<string, any>
  response?: Record<string, any>
  assignedTo?: string
  respondedBy?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  respondedAt?: string
  expiresAt?: string
  error?: string
  tags?: string[]
  callbackUrl?: string
  attempts?: number
  maxAttempts?: number
}

// ============================================================================
// HumanService RPC Class
// ============================================================================

export class HumanService extends WorkerEntrypoint<Env> {
  /**
   * Create a new task requiring human interaction
   */
  async createTask(
    name: string,
    description: string,
    formFields: FormField[],
    options?: {
      priority?: TaskPriority
      timeoutMs?: number
      assignedTo?: string
      createdBy?: string
      context?: Record<string, any>
      tags?: string[]
      callbackUrl?: string
      maxAttempts?: number
    }
  ): Promise<string> {
    const taskId = crypto.randomUUID()
    const now = new Date().toISOString()

    const task: TaskRecord = {
      id: taskId,
      name,
      description,
      priority: options?.priority || 'normal',
      status: 'pending',
      formFields,
      context: options?.context,
      assignedTo: options?.assignedTo,
      createdBy: options?.createdBy || 'system',
      createdAt: now,
      updatedAt: now,
      expiresAt: options?.timeoutMs ? new Date(Date.now() + options.timeoutMs).toISOString() : undefined,
      tags: options?.tags,
      callbackUrl: options?.callbackUrl,
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
    }

    // Store in database
    await this.env.DB.upsert(
      [
        {
          $id: `human/tasks/${taskId}`,
          data: task,
        },
      ],
      {
        ns: 'human',
        $context: 'https://human.do',
        type: 'HumanTask',
        $type: 'HumanTask',
      }
    )

    // Schedule timeout check if needed
    if (options?.timeoutMs) {
      await this.env.SCHEDULE.schedule({
        name: `human-task-timeout-${taskId}`,
        cron: null,
        runAt: new Date(Date.now() + options.timeoutMs),
        data: { taskId, type: 'task_timeout' },
      })
    }

    // Notify via WebSocket if connected
    await this.notifyClients({
      type: 'task_created',
      taskId,
      task,
      timestamp: now,
    })

    return taskId
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<TaskRecord | null> {
    const result = await this.env.DB.get(`human/tasks/${taskId}`)

    if (!result?.data) {
      return null
    }

    return result.data.data as TaskRecord
  }

  /**
   * List tasks with optional filtering
   */
  async listTasks(options?: {
    status?: TaskStatus
    priority?: TaskPriority
    assignedTo?: string
    createdBy?: string
    tags?: string[]
    limit?: number
    offset?: number
    sortBy?: 'createdAt' | 'priority' | 'expiresAt'
    sortOrder?: 'asc' | 'desc'
  }): Promise<{ tasks: TaskRecord[]; total: number }> {
    const result = await this.env.DB.list('human', {
      ...options,
      limit: options?.limit || 100,
    })

    if (!result?.data) {
      return { tasks: [], total: 0 }
    }

    // Filter and map results
    let tasks = result.data
      .filter((item: any) => item.data.$id?.startsWith('human/tasks/'))
      .map((item: any) => item.data.data as TaskRecord)
      .filter((task: TaskRecord) => {
        if (options?.status && task.status !== options.status) return false
        if (options?.priority && task.priority !== options.priority) return false
        if (options?.assignedTo && task.assignedTo !== options.assignedTo) return false
        if (options?.createdBy && task.createdBy !== options.createdBy) return false
        if (options?.tags && !options.tags.some((tag) => task.tags?.includes(tag))) return false
        return true
      })

    // Sort tasks
    if (options?.sortBy) {
      const sortOrder = options.sortOrder === 'desc' ? -1 : 1
      tasks.sort((a, b) => {
        const aVal = a[options.sortBy!]
        const bVal = b[options.sortBy!]
        if (aVal === undefined) return 1
        if (bVal === undefined) return -1
        return aVal < bVal ? -sortOrder : aVal > bVal ? sortOrder : 0
      })
    }

    // Apply pagination
    const offset = options?.offset || 0
    const limit = options?.limit || 100
    const total = tasks.length
    tasks = tasks.slice(offset, offset + limit)

    return { tasks, total }
  }

  /**
   * Respond to a task
   */
  async respondToTask(
    taskId: string,
    response: Record<string, any>,
    respondedBy: string
  ): Promise<TaskRecord> {
    const task = await this.getTask(taskId)

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    if (task.status !== 'pending' && task.status !== 'processing') {
      throw new Error(`Task ${taskId} is not pending or processing (current status: ${task.status})`)
    }

    // Validate response against form fields
    const errors: string[] = []
    for (const field of task.formFields) {
      if (field.required && !response[field.name]) {
        errors.push(`${field.label} is required`)
      }
      // Add more validation here
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`)
    }

    const now = new Date().toISOString()
    const updatedTask: TaskRecord = {
      ...task,
      status: 'completed',
      response,
      respondedBy,
      respondedAt: now,
      updatedAt: now,
    }

    await this.env.DB.upsert(
      [
        {
          $id: `human/tasks/${taskId}`,
          data: updatedTask,
        },
      ],
      {
        ns: 'human',
        $context: 'https://human.do',
        type: 'HumanTask',
        $type: 'HumanTask',
      }
    )

    // Call callback if provided
    if (task.callbackUrl) {
      try {
        await fetch(task.callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, task: updatedTask }),
        })
      } catch (error) {
        console.error('Callback failed:', error)
      }
    }

    // Notify via WebSocket
    await this.notifyClients({
      type: 'task_completed',
      taskId,
      task: updatedTask,
      timestamp: now,
    })

    return updatedTask
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string, reason?: string): Promise<TaskRecord> {
    const task = await this.getTask(taskId)

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    if (task.status === 'completed') {
      throw new Error(`Task ${taskId} is already completed`)
    }

    const now = new Date().toISOString()
    const updatedTask: TaskRecord = {
      ...task,
      status: 'cancelled',
      error: reason || 'Cancelled by user',
      updatedAt: now,
    }

    await this.env.DB.upsert(
      [
        {
          $id: `human/tasks/${taskId}`,
          data: updatedTask,
        },
      ],
      {
        ns: 'human',
        $context: 'https://human.do',
        type: 'HumanTask',
        $type: 'HumanTask',
      }
    )

    await this.notifyClients({
      type: 'task_cancelled',
      taskId,
      task: updatedTask,
      timestamp: now,
    })

    return updatedTask
  }

  /**
   * Handle task timeout
   */
  async handleTaskTimeout(taskId: string): Promise<TaskRecord> {
    const task = await this.getTask(taskId)

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    if (task.status !== 'pending' && task.status !== 'processing') {
      // Already handled, ignore
      return task
    }

    const now = new Date().toISOString()
    const updatedTask: TaskRecord = {
      ...task,
      status: 'timeout',
      error: 'Task timed out',
      updatedAt: now,
    }

    await this.env.DB.upsert(
      [
        {
          $id: `human/tasks/${taskId}`,
          data: updatedTask,
        },
      ],
      {
        ns: 'human',
        $context: 'https://human.do',
        type: 'HumanTask',
        $type: 'HumanTask',
      }
    )

    await this.notifyClients({
      type: 'task_timeout',
      taskId,
      task: updatedTask,
      timestamp: now,
    })

    return updatedTask
  }

  /**
   * Get task statistics
   */
  async getStats(): Promise<{
    total: number
    pending: number
    processing: number
    completed: number
    cancelled: number
    timeout: number
    avgResponseTimeMs: number
    completionRate: string
    timeoutRate: string
  }> {
    const { tasks } = await this.listTasks({ limit: 10000 })

    const total = tasks.length
    const pending = tasks.filter((t) => t.status === 'pending').length
    const processing = tasks.filter((t) => t.status === 'processing').length
    const completed = tasks.filter((t) => t.status === 'completed').length
    const cancelled = tasks.filter((t) => t.status === 'cancelled').length
    const timeout = tasks.filter((t) => t.status === 'timeout').length

    // Calculate average response time
    const completedTasks = tasks.filter((t) => t.status === 'completed' && t.respondedAt)
    const avgResponseTimeMs =
      completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => {
            const created = new Date(t.createdAt).getTime()
            const responded = new Date(t.respondedAt!).getTime()
            return sum + (responded - created)
          }, 0) / completedTasks.length
        : 0

    return {
      total,
      pending,
      processing,
      completed,
      cancelled,
      timeout,
      avgResponseTimeMs,
      completionRate: total > 0 ? `${((completed / total) * 100).toFixed(2)}%` : '0%',
      timeoutRate: total > 0 ? `${((timeout / total) * 100).toFixed(2)}%` : '0%',
    }
  }

  /**
   * Notify WebSocket clients about task updates
   */
  private async notifyClients(message: any): Promise<void> {
    // This would connect to a Durable Object for WebSocket management
    // For now, we'll log and potentially queue for later
    console.log('Notify clients:', message)

    // In production, this would:
    // await this.env.WEBSOCKET_DO.broadcast(JSON.stringify(message))
  }
}

// ============================================================================
// HTTP API Routes
// ============================================================================

const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

/**
 * POST /tasks - Create a new task
 */
app.post('/tasks', async (c) => {
  try {
    const service = new HumanService(c.env.ctx, c.env)
    const body = await c.req.json()

    const taskId = await service.createTask(body.name, body.description, body.formFields, {
      priority: body.priority,
      timeoutMs: body.timeoutMs,
      assignedTo: body.assignedTo,
      createdBy: body.createdBy,
      context: body.context,
      tags: body.tags,
      callbackUrl: body.callbackUrl,
    })

    return c.json({
      success: true,
      taskId,
      message: 'Task created successfully',
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task',
      },
      500
    )
  }
})

/**
 * GET /tasks/:id - Get a task by ID
 */
app.get('/tasks/:id', async (c) => {
  try {
    const service = new HumanService(c.env.ctx, c.env)
    const taskId = c.req.param('id')

    const task = await service.getTask(taskId)

    if (!task) {
      return c.json({ success: false, error: 'Task not found' }, 404)
    }

    return c.json({ success: true, task })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get task',
      },
      500
    )
  }
})

/**
 * GET /tasks - List tasks
 */
app.get('/tasks', async (c) => {
  try {
    const service = new HumanService(c.env.ctx, c.env)

    const status = c.req.query('status') as TaskStatus | undefined
    const priority = c.req.query('priority') as TaskPriority | undefined
    const assignedTo = c.req.query('assignedTo')
    const createdBy = c.req.query('createdBy')
    const tags = c.req.query('tags')?.split(',')
    const limit = parseInt(c.req.query('limit') || '100')
    const offset = parseInt(c.req.query('offset') || '0')
    const sortBy = c.req.query('sortBy') as 'createdAt' | 'priority' | 'expiresAt' | undefined
    const sortOrder = c.req.query('sortOrder') as 'asc' | 'desc' | undefined

    const result = await service.listTasks({
      status,
      priority,
      assignedTo,
      createdBy,
      tags,
      limit,
      offset,
      sortBy,
      sortOrder,
    })

    return c.json({
      success: true,
      ...result,
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list tasks',
      },
      500
    )
  }
})

/**
 * POST /tasks/:id/respond - Respond to a task
 */
app.post('/tasks/:id/respond', async (c) => {
  try {
    const service = new HumanService(c.env.ctx, c.env)
    const taskId = c.req.param('id')
    const body = await c.req.json()

    const task = await service.respondToTask(taskId, body.response, body.respondedBy || 'anonymous')

    return c.json({
      success: true,
      task,
      message: 'Task completed successfully',
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to respond to task',
      },
      400
    )
  }
})

/**
 * DELETE /tasks/:id - Cancel a task
 */
app.delete('/tasks/:id', async (c) => {
  try {
    const service = new HumanService(c.env.ctx, c.env)
    const taskId = c.req.param('id')
    const reason = c.req.query('reason')

    const task = await service.cancelTask(taskId, reason)

    return c.json({
      success: true,
      task,
      message: 'Task cancelled',
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel task',
      },
      400
    )
  }
})

/**
 * GET /stats - Get task statistics
 */
app.get('/stats', async (c) => {
  try {
    const service = new HumanService(c.env.ctx, c.env)
    const stats = await service.getStats()

    return c.json({
      success: true,
      stats,
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats',
      },
      500
    )
  }
})

/**
 * GET /health - Health check
 */
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'human',
    timestamp: new Date().toISOString(),
  })
})

export default {
  fetch: app.fetch,
}
