/**
 * Schedule Service - Cron Job and Task Scheduling
 *
 * Manages scheduled tasks, executes on cron triggers, tracks execution history
 *
 * Interfaces:
 * - RPC: WorkerEntrypoint methods for service-to-service calls
 * - HTTP: Hono routes for task management and monitoring
 * - Cron: Cloudflare Cron Triggers for scheduled execution
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  registerTask,
  unregisterTask,
  enableTask,
  disableTask,
  getTask,
  listTasks,
  runDueTasks,
  runTaskNow,
  initializeDefaultTasks,
} from './scheduler'
import { getExecutionHistory, getRecentExecutions } from './executor'
import { getAllTaskHandlers } from './tasks'
import type { RegisterTaskOptions } from './types'

// ============================================================================
// RPC INTERFACE - For service-to-service communication
// ============================================================================

export class ScheduleService extends WorkerEntrypoint<Env> {
  /**
   * Register a new scheduled task
   */
  async registerTask(options: RegisterTaskOptions) {
    return registerTask(options, this.env)
  }

  /**
   * Unregister a task
   */
  async unregisterTask(name: string) {
    return unregisterTask(name, this.env)
  }

  /**
   * Enable a task
   */
  async enableTask(name: string) {
    return enableTask(name, this.env)
  }

  /**
   * Disable a task
   */
  async disableTask(name: string) {
    return disableTask(name, this.env)
  }

  /**
   * Get a task by name
   */
  async getTask(name: string) {
    return getTask(name, this.env)
  }

  /**
   * List all tasks
   */
  async listTasks() {
    return listTasks(this.env)
  }

  /**
   * Get execution history for a task
   */
  async getTaskHistory(name: string, limit?: number) {
    const task = await getTask(name, this.env)
    if (!task) return []
    return getExecutionHistory(task.id, this.env, limit)
  }

  /**
   * Get recent executions (all tasks)
   */
  async getRecentExecutions(limit?: number) {
    return getRecentExecutions(this.env, limit)
  }

  /**
   * Run a task immediately (manual execution)
   */
  async runTaskNow(name: string) {
    return runTaskNow(name, this.env)
  }

  /**
   * Get all available task handlers
   */
  async getAvailableHandlers() {
    return getAllTaskHandlers()
  }

  /**
   * Initialize default tasks
   */
  async initializeDefaultTasks() {
    return initializeDefaultTasks(this.env)
  }
}

// ============================================================================
// HTTP INTERFACE - For task management and monitoring
// ============================================================================

const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

/**
 * GET / - Service info
 */
app.get('/', (c) => {
  return c.json({
    service: 'schedule',
    version: '1.0.0',
    description: 'Cron job and task scheduling service',
    interfaces: {
      rpc: 'WorkerEntrypoint methods for service-to-service calls',
      http: 'REST API for task management and monitoring',
      cron: 'Cloudflare Cron Triggers for scheduled execution',
    },
    endpoints: {
      tasks: {
        list: 'GET /tasks',
        get: 'GET /tasks/:name',
        register: 'POST /tasks',
        enable: 'POST /tasks/:name/enable',
        disable: 'POST /tasks/:name/disable',
        delete: 'DELETE /tasks/:name',
        run: 'POST /tasks/:name/run',
        history: 'GET /tasks/:name/history',
      },
      handlers: 'GET /handlers',
      executions: 'GET /executions',
      health: 'GET /health',
    },
  })
})

/**
 * GET /health - Health check
 */
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'schedule',
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /tasks - List all tasks
 */
app.get('/tasks', async (c) => {
  try {
    const tasks = await listTasks(c.env)

    return c.json({
      success: true,
      count: tasks.length,
      tasks,
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    )
  }
})

/**
 * GET /tasks/:name - Get task details
 */
app.get('/tasks/:name', async (c) => {
  try {
    const service = new ScheduleService(undefined as any, c.env)
    const name = c.req.param('name')

    const task = await service.getTask(name)

    if (!task) {
      return c.json({ success: false, error: 'Task not found' }, 404)
    }

    return c.json({
      success: true,
      task,
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    )
  }
})

/**
 * POST /tasks - Register new task
 */
app.post('/tasks', async (c) => {
  try {
    const service = new ScheduleService(undefined as any, c.env)
    const options = await c.req.json<RegisterTaskOptions>()

    const task = await service.registerTask(options)

    return c.json({
      success: true,
      task,
      message: `Task ${task.name} registered successfully`,
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      400
    )
  }
})

/**
 * POST /tasks/:name/enable - Enable task
 */
app.post('/tasks/:name/enable', async (c) => {
  try {
    const service = new ScheduleService(undefined as any, c.env)
    const name = c.req.param('name')

    const success = await service.enableTask(name)

    if (!success) {
      return c.json({ success: false, error: 'Task not found' }, 404)
    }

    return c.json({
      success: true,
      message: `Task ${name} enabled`,
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    )
  }
})

/**
 * POST /tasks/:name/disable - Disable task
 */
app.post('/tasks/:name/disable', async (c) => {
  try {
    const service = new ScheduleService(undefined as any, c.env)
    const name = c.req.param('name')

    const success = await service.disableTask(name)

    if (!success) {
      return c.json({ success: false, error: 'Task not found' }, 404)
    }

    return c.json({
      success: true,
      message: `Task ${name} disabled`,
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    )
  }
})

/**
 * DELETE /tasks/:name - Unregister task
 */
app.delete('/tasks/:name', async (c) => {
  try {
    const service = new ScheduleService(undefined as any, c.env)
    const name = c.req.param('name')

    const success = await service.unregisterTask(name)

    if (!success) {
      return c.json({ success: false, error: 'Task not found' }, 404)
    }

    return c.json({
      success: true,
      message: `Task ${name} unregistered`,
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    )
  }
})

/**
 * POST /tasks/:name/run - Run task immediately
 */
app.post('/tasks/:name/run', async (c) => {
  try {
    const service = new ScheduleService(undefined as any, c.env)
    const name = c.req.param('name')

    const success = await service.runTaskNow(name)

    if (!success) {
      return c.json(
        {
          success: false,
          error: 'Failed to run task (task not found or disabled)',
        },
        400
      )
    }

    return c.json({
      success: true,
      message: `Task ${name} executed successfully`,
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    )
  }
})

/**
 * GET /tasks/:name/history - Get execution history
 */
app.get('/tasks/:name/history', async (c) => {
  try {
    const service = new ScheduleService(undefined as any, c.env)
    const name = c.req.param('name')
    const limit = parseInt(c.req.query('limit') || '50')

    const history = await service.getTaskHistory(name, limit)

    return c.json({
      success: true,
      count: history.length,
      history,
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    )
  }
})

/**
 * GET /executions - Get recent executions (all tasks)
 */
app.get('/executions', async (c) => {
  try {
    const service = new ScheduleService(undefined as any, c.env)
    const limit = parseInt(c.req.query('limit') || '100')

    const executions = await service.getRecentExecutions(limit)

    return c.json({
      success: true,
      count: executions.length,
      executions,
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    )
  }
})

/**
 * GET /handlers - List available task handlers
 */
app.get('/handlers', async (c) => {
  try {
    const service = new ScheduleService(undefined as any, c.env)
    const handlers = await service.getAvailableHandlers()

    return c.json({
      success: true,
      count: handlers.length,
      handlers,
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    )
  }
})

/**
 * POST /init - Initialize default tasks (one-time setup)
 */
app.post('/init', async (c) => {
  try {
    const service = new ScheduleService(undefined as any, c.env)
    await service.initializeDefaultTasks()

    return c.json({
      success: true,
      message: 'Default tasks initialized',
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    )
  }
})

// ============================================================================
// CRON HANDLER - Triggered by Cloudflare Cron Triggers
// ============================================================================

export default {
  fetch: app.fetch,

  /**
   * Scheduled handler - runs on cron triggers
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Cron triggered: ${event.cron}`)

    try {
      // Run tasks that are due
      await runDueTasks(env, event.cron)
    } catch (error: any) {
      console.error('Cron execution failed:', error.message)
    }
  },
}
