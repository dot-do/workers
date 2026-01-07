/**
 * HumansDO - Human-in-the-Loop Durable Object
 *
 * Implements the humans.do worker for human oversight, approval gates,
 * review queues, and escalation in AI workflows.
 *
 * @see ARCHITECTURE.md lines 983, 1338
 */

// Types
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'rejected' | 'expired'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TaskType = 'approval' | 'review' | 'decision' | 'input' | 'escalation'

export interface HITLTask {
  _id: string
  type: TaskType
  title: string
  description?: string
  context?: Record<string, unknown>
  requiredBy?: string
  assignee?: string
  status: TaskStatus
  priority: TaskPriority
  createdAt: string
  updatedAt: string
  expiresAt?: string
  timeoutMs?: number
  response?: HITLResponse
  metadata?: Record<string, unknown>
}

export interface HITLResponse {
  decision?: 'approve' | 'reject' | 'defer'
  value?: unknown
  comment?: string
  respondedBy: string
  respondedAt: string
}

export interface CreateTaskInput {
  type: TaskType
  title: string
  description?: string
  context?: Record<string, unknown>
  requiredBy?: string
  assignee?: string
  priority?: TaskPriority
  timeoutMs?: number
  metadata?: Record<string, unknown>
}

export interface ListTasksOptions {
  status?: TaskStatus
  assignee?: string
  type?: string
  priority?: TaskPriority
  limit?: number
  offset?: number
}

// Priority order for sorting
const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
}

// RPC method allowlist
const ALLOWED_METHODS = new Set([
  'createTask',
  'getTask',
  'listTasks',
  'assignTask',
  'unassignTask',
  'reassignTask',
  'respondToTask',
  'approve',
  'reject',
  'defer',
  'submitInput',
  'decide',
  'getQueue',
  'getPendingCount',
  'getMyTasks',
  'assignMultiple',
  'escalate',
  'setTaskTimeout',
  'clearTaskTimeout',
  'extendTimeout',
  'getExpiredTasks',
  'getExpiringTasks',
])

/**
 * Generate a unique task ID
 */
function generateId(): string {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Deep clone a task to avoid reference mutations affecting test comparisons
 */
function cloneTask(task: HITLTask): HITLTask {
  return JSON.parse(JSON.stringify(task))
}

/**
 * HumansDO Durable Object class
 */
export class HumansDO {
  private ctx: DurableObjectState
  private env: unknown
  private tasks: Map<string, HITLTask> = new Map()
  private initialized = false
  private onTimeoutCallback?: (task: HITLTask) => Promise<void>
  private onExpiringSoonCallback?: { threshold: number; callback: (task: HITLTask) => Promise<void> }

  constructor(ctx: DurableObjectState, env: unknown) {
    this.ctx = ctx
    this.env = env
  }

  /**
   * Initialize state from storage
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return

    const stored = await this.ctx.storage.list<HITLTask>({ prefix: 'task:' })
    for (const [key, task] of stored) {
      this.tasks.set(task._id, task)
    }
    this.initialized = true
  }

  /**
   * Save a task to storage
   */
  private async saveTask(task: HITLTask): Promise<void> {
    this.tasks.set(task._id, task)
    await this.ctx.storage.put(`task:${task._id}`, task)
  }

  /**
   * Schedule alarm for next expiring task
   */
  private async scheduleNextAlarm(): Promise<void> {
    const now = Date.now()
    let nextExpiry: number | null = null

    for (const task of this.tasks.values()) {
      if (task.expiresAt && task.status !== 'completed' && task.status !== 'rejected' && task.status !== 'expired') {
        const expiryTime = new Date(task.expiresAt).getTime()
        if (expiryTime > now) {
          if (nextExpiry === null || expiryTime < nextExpiry) {
            nextExpiry = expiryTime
          }
        }
      }
    }

    if (nextExpiry !== null) {
      await this.ctx.storage.setAlarm(nextExpiry)
    }
  }

  // ========== Task Creation ==========

  async createTask(input: CreateTaskInput): Promise<HITLTask> {
    await this.ensureInitialized()

    const now = new Date().toISOString()
    const task: HITLTask = {
      _id: generateId(),
      type: input.type,
      title: input.title,
      description: input.description,
      context: input.context,
      requiredBy: input.requiredBy,
      assignee: input.assignee,
      status: input.assignee ? 'assigned' : 'pending',
      priority: input.priority ?? 'normal',
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata,
    }

    if (input.timeoutMs) {
      task.timeoutMs = input.timeoutMs
      task.expiresAt = new Date(Date.now() + input.timeoutMs).toISOString()
    }

    await this.saveTask(task)

    if (task.expiresAt) {
      await this.scheduleNextAlarm()
    }

    return cloneTask(task)
  }

  // ========== Task Retrieval ==========

  async getTask(taskId: string): Promise<HITLTask | null> {
    await this.ensureInitialized()
    const task = this.tasks.get(taskId)
    return task ? cloneTask(task) : null
  }

  async listTasks(options?: ListTasksOptions): Promise<HITLTask[]> {
    await this.ensureInitialized()

    let tasks = Array.from(this.tasks.values())

    if (options?.status) {
      tasks = tasks.filter(t => t.status === options.status)
    }
    if (options?.assignee) {
      tasks = tasks.filter(t => t.assignee === options.assignee)
    }
    if (options?.type) {
      tasks = tasks.filter(t => t.type === options.type)
    }
    if (options?.priority) {
      tasks = tasks.filter(t => t.priority === options.priority)
    }

    // Sort by creation date descending
    tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    if (options?.offset) {
      tasks = tasks.slice(options.offset)
    }
    if (options?.limit) {
      tasks = tasks.slice(0, options.limit)
    }

    return tasks.map(cloneTask)
  }

  // ========== Task Assignment ==========

  async assignTask(taskId: string, assignee: string): Promise<HITLTask | null> {
    await this.ensureInitialized()

    const task = this.tasks.get(taskId)
    if (!task) return null

    task.assignee = assignee
    task.status = 'assigned'
    task.updatedAt = new Date().toISOString()

    await this.saveTask(task)
    return cloneTask(task)
  }

  async unassignTask(taskId: string): Promise<HITLTask | null> {
    await this.ensureInitialized()

    const task = this.tasks.get(taskId)
    if (!task) return null

    task.assignee = undefined
    task.status = 'pending'
    task.updatedAt = new Date().toISOString()

    await this.saveTask(task)
    return cloneTask(task)
  }

  async reassignTask(taskId: string, newAssignee: string): Promise<HITLTask | null> {
    await this.ensureInitialized()

    const task = this.tasks.get(taskId)
    if (!task) return null

    task.assignee = newAssignee
    task.status = 'assigned'
    task.updatedAt = new Date().toISOString()

    await this.saveTask(task)
    return cloneTask(task)
  }

  // ========== Queue Operations ==========

  async getQueue(assignee?: string): Promise<HITLTask[]> {
    await this.ensureInitialized()

    let tasks = Array.from(this.tasks.values()).filter(
      t => t.status !== 'completed' && t.status !== 'rejected' && t.status !== 'expired'
    )

    if (assignee) {
      tasks = tasks.filter(t => t.assignee === assignee)
    }

    // Sort by priority (urgent first), then by creation date
    tasks.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

    return tasks.map(cloneTask)
  }

  async getPendingCount(assignee?: string): Promise<number> {
    await this.ensureInitialized()

    let tasks = Array.from(this.tasks.values()).filter(
      t => t.status === 'pending' || t.status === 'assigned'
    )

    if (assignee) {
      tasks = tasks.filter(t => t.assignee === assignee)
    }

    return tasks.length
  }

  async getMyTasks(assignee: string): Promise<HITLTask[]> {
    await this.ensureInitialized()

    return Array.from(this.tasks.values()).filter(t => t.assignee === assignee).map(cloneTask)
  }

  async assignMultiple(taskIds: string[], assignee: string): Promise<HITLTask[]> {
    await this.ensureInitialized()

    const assigned: HITLTask[] = []

    for (const taskId of taskIds) {
      const task = this.tasks.get(taskId)
      if (task) {
        task.assignee = assignee
        task.status = 'assigned'
        task.updatedAt = new Date().toISOString()
        await this.saveTask(task)
        assigned.push(cloneTask(task))
      }
    }

    return assigned
  }

  // ========== Escalation ==========

  async escalate(taskId: string, to: string, reason: string): Promise<HITLTask | null> {
    await this.ensureInitialized()

    const task = this.tasks.get(taskId)
    if (!task) return null

    task.assignee = to
    task.type = 'escalation'
    task.metadata = {
      ...task.metadata,
      escalationReason: reason,
    }
    task.updatedAt = new Date().toISOString()

    await this.saveTask(task)
    return cloneTask(task)
  }

  // ========== Response Handling ==========

  async respondToTask(taskId: string, response: HITLResponse): Promise<HITLTask | null> {
    await this.ensureInitialized()

    const task = this.tasks.get(taskId)
    if (!task) return null

    if (task.status === 'completed' || task.status === 'rejected') {
      throw new Error('Task already completed or rejected')
    }

    task.response = response
    task.updatedAt = new Date().toISOString()

    if (response.decision === 'approve' || response.value !== undefined) {
      task.status = 'completed'
    } else if (response.decision === 'reject') {
      task.status = 'rejected'
    }
    // defer keeps status as pending

    await this.saveTask(task)
    return cloneTask(task)
  }

  async approve(taskId: string, comment?: string, respondedBy?: string): Promise<HITLTask | null> {
    await this.ensureInitialized()

    const task = this.tasks.get(taskId)
    if (!task) return null

    return this.respondToTask(taskId, {
      decision: 'approve',
      comment,
      respondedBy: respondedBy ?? task.assignee ?? 'system',
      respondedAt: new Date().toISOString(),
    })
  }

  async reject(taskId: string, reason: string, respondedBy?: string): Promise<HITLTask | null> {
    await this.ensureInitialized()

    const task = this.tasks.get(taskId)
    if (!task) return null

    return this.respondToTask(taskId, {
      decision: 'reject',
      comment: reason,
      respondedBy: respondedBy ?? task.assignee ?? 'system',
      respondedAt: new Date().toISOString(),
    })
  }

  async defer(taskId: string, reason?: string, respondedBy?: string): Promise<HITLTask | null> {
    await this.ensureInitialized()

    const task = this.tasks.get(taskId)
    if (!task) return null

    const response: HITLResponse = {
      decision: 'defer',
      comment: reason,
      respondedBy: respondedBy ?? task.assignee ?? 'system',
      respondedAt: new Date().toISOString(),
    }

    task.response = response
    task.status = 'pending'
    task.assignee = undefined
    task.updatedAt = new Date().toISOString()

    await this.saveTask(task)
    return cloneTask(task)
  }

  async submitInput(taskId: string, value: unknown, respondedBy: string): Promise<HITLTask | null> {
    await this.ensureInitialized()

    const task = this.tasks.get(taskId)
    if (!task) return null

    return this.respondToTask(taskId, {
      value,
      respondedBy,
      respondedAt: new Date().toISOString(),
    })
  }

  async decide(taskId: string, decision: string, rationale: string, respondedBy: string): Promise<HITLTask | null> {
    await this.ensureInitialized()

    const task = this.tasks.get(taskId)
    if (!task) return null

    return this.respondToTask(taskId, {
      value: decision,
      comment: rationale,
      respondedBy,
      respondedAt: new Date().toISOString(),
    })
  }

  // ========== Timeout Management ==========

  async setTaskTimeout(taskId: string, timeoutMs: number): Promise<HITLTask | null> {
    await this.ensureInitialized()

    const task = this.tasks.get(taskId)
    if (!task) return null

    task.timeoutMs = timeoutMs
    task.expiresAt = new Date(Date.now() + timeoutMs).toISOString()
    task.updatedAt = new Date().toISOString()

    await this.saveTask(task)
    await this.scheduleNextAlarm()
    return cloneTask(task)
  }

  async clearTaskTimeout(taskId: string): Promise<HITLTask | null> {
    await this.ensureInitialized()

    const task = this.tasks.get(taskId)
    if (!task) return null

    task.timeoutMs = undefined
    task.expiresAt = undefined
    task.updatedAt = new Date().toISOString()

    await this.saveTask(task)
    return cloneTask(task)
  }

  async extendTimeout(taskId: string, additionalMs: number): Promise<HITLTask | null> {
    await this.ensureInitialized()

    const task = this.tasks.get(taskId)
    if (!task) return null

    if (!task.expiresAt) {
      throw new Error('Task has no timeout set')
    }

    const currentExpiry = new Date(task.expiresAt).getTime()
    task.expiresAt = new Date(currentExpiry + additionalMs).toISOString()
    task.updatedAt = new Date().toISOString()

    await this.saveTask(task)
    await this.scheduleNextAlarm()
    return cloneTask(task)
  }

  async getExpiredTasks(): Promise<HITLTask[]> {
    await this.ensureInitialized()

    const now = Date.now()
    return Array.from(this.tasks.values()).filter(task => {
      if (!task.expiresAt) return false
      if (task.status === 'completed' || task.status === 'rejected' || task.status === 'expired') return false
      return new Date(task.expiresAt).getTime() <= now
    }).map(cloneTask)
  }

  async getExpiringTasks(withinMs: number): Promise<HITLTask[]> {
    await this.ensureInitialized()

    const now = Date.now()
    const threshold = now + withinMs

    return Array.from(this.tasks.values()).filter(task => {
      if (!task.expiresAt) return false
      if (task.status === 'completed' || task.status === 'rejected' || task.status === 'expired') return false
      const expiryTime = new Date(task.expiresAt).getTime()
      return expiryTime > now && expiryTime <= threshold
    }).map(cloneTask)
  }

  // ========== Timeout Callbacks ==========

  onTimeout(callback: (task: HITLTask) => Promise<void>): void {
    this.onTimeoutCallback = callback
  }

  onExpiringSoon(threshold: number, callback: (task: HITLTask) => Promise<void>): void {
    this.onExpiringSoonCallback = { threshold, callback }
  }

  // ========== Alarm Handler ==========

  async alarm(): Promise<void> {
    await this.ensureInitialized()

    const now = Date.now()

    // Mark expired tasks
    const expiredTasks: HITLTask[] = []
    for (const task of this.tasks.values()) {
      if (task.expiresAt && task.status !== 'completed' && task.status !== 'rejected' && task.status !== 'expired') {
        if (new Date(task.expiresAt).getTime() <= now) {
          task.status = 'expired'
          task.updatedAt = new Date().toISOString()
          await this.saveTask(task)
          expiredTasks.push(task)
        }
      }
    }

    // Call timeout callbacks
    if (this.onTimeoutCallback) {
      for (const task of expiredTasks) {
        await this.onTimeoutCallback(task)
      }
    }

    // Check for expiring soon tasks
    if (this.onExpiringSoonCallback) {
      const expiringSoon = await this.getExpiringTasks(this.onExpiringSoonCallback.threshold)
      for (const task of expiringSoon) {
        await this.onExpiringSoonCallback.callback(task)
      }
    }

    // Schedule next alarm
    await this.scheduleNextAlarm()
  }

  // ========== RPC Interface ==========

  hasMethod(name: string): boolean {
    return ALLOWED_METHODS.has(name)
  }

  async invoke(method: string, params: unknown[]): Promise<unknown> {
    if (!this.hasMethod(method)) {
      throw new Error(`Method not allowed: ${method}`)
    }

    const fn = (this as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>)[method]
    if (typeof fn !== 'function') {
      throw new Error(`Method not found: ${method}`)
    }

    return fn.apply(this, params)
  }

  // ========== HTTP Handler ==========

  async fetch(request: Request): Promise<Response> {
    await this.ensureInitialized()

    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    try {
      // Discovery endpoint
      if (path === '/' && method === 'GET') {
        return this.handleDiscovery()
      }

      // RPC endpoint
      if (path === '/rpc' && method === 'POST') {
        return this.handleRpc(request)
      }

      // REST API endpoints
      if (path.startsWith('/api/')) {
        return this.handleRestApi(request, path, method, url)
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  private handleDiscovery(): Response {
    const methods = Array.from(ALLOWED_METHODS).map(name => ({ name }))

    return new Response(
      JSON.stringify({
        api: 'humans.do',
        version: '1.0.0',
        links: {
          tasks: '/api/tasks',
          queue: '/api/queue',
          rpc: '/rpc',
        },
        discover: { methods },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  private async handleRpc(request: Request): Promise<Response> {
    const body = await request.json() as { method: string; params: unknown[] }

    if (!this.hasMethod(body.method)) {
      return new Response(JSON.stringify({ error: `Method not allowed: ${body.method}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const result = await this.invoke(body.method, body.params ?? [])
      return new Response(JSON.stringify({ result }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  private async handleRestApi(request: Request, path: string, method: string, url: URL): Promise<Response> {
    // GET /api/tasks
    if (path === '/api/tasks' && method === 'GET') {
      const tasks = await this.listTasks()
      return new Response(JSON.stringify(tasks), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // POST /api/tasks
    if (path === '/api/tasks' && method === 'POST') {
      const input = await request.json() as CreateTaskInput
      const task = await this.createTask(input)
      return new Response(JSON.stringify(task), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // GET /api/queue
    if (path === '/api/queue' && method === 'GET') {
      const assignee = url.searchParams.get('assignee') ?? undefined
      const queue = await this.getQueue(assignee)
      return new Response(JSON.stringify(queue), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // GET /api/tasks/expired
    if (path === '/api/tasks/expired' && method === 'GET') {
      const expired = await this.getExpiredTasks()
      return new Response(JSON.stringify(expired), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // GET /api/tasks/expiring
    if (path === '/api/tasks/expiring' && method === 'GET') {
      const withinMs = parseInt(url.searchParams.get('withinMs') ?? '0', 10)
      const expiring = await this.getExpiringTasks(withinMs)
      return new Response(JSON.stringify(expiring), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Match /api/tasks/:id patterns
    const taskIdMatch = path.match(/^\/api\/tasks\/([^/]+)$/)
    if (taskIdMatch && method === 'GET') {
      const taskId = taskIdMatch[1]
      const task = await this.getTask(taskId)
      if (!task) {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify(task), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Match /api/tasks/:id/action patterns
    const actionMatch = path.match(/^\/api\/tasks\/([^/]+)\/(\w+)$/)
    if (actionMatch) {
      const taskId = actionMatch[1]
      const action = actionMatch[2]

      // Check if task exists for certain actions
      const task = await this.getTask(taskId)
      const taskNotFoundActions = ['respond', 'approve', 'reject', 'defer', 'input', 'assign', 'escalate', 'timeout']
      if (!task && taskNotFoundActions.includes(action)) {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Check if task is already completed
      if (task && (task.status === 'completed' || task.status === 'rejected') &&
          ['respond', 'approve', 'reject', 'defer', 'input'].includes(action)) {
        return new Response(JSON.stringify({ error: 'Task already completed' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      switch (action) {
        case 'respond': {
          if (method !== 'POST') break
          const body = await request.json() as HITLResponse
          const result = await this.respondToTask(taskId, body)
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        case 'approve': {
          if (method !== 'POST') break
          const body = await request.json() as { comment?: string; respondedBy?: string }
          const result = await this.approve(taskId, body.comment, body.respondedBy)
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        case 'reject': {
          if (method !== 'POST') break
          const body = await request.json() as { reason: string; respondedBy?: string }
          const result = await this.reject(taskId, body.reason, body.respondedBy)
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        case 'defer': {
          if (method !== 'POST') break
          const body = await request.json() as { reason?: string; respondedBy?: string }
          const result = await this.defer(taskId, body.reason, body.respondedBy)
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        case 'input': {
          if (method !== 'POST') break
          const body = await request.json() as { value: unknown; respondedBy: string }
          const result = await this.submitInput(taskId, body.value, body.respondedBy)
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        case 'assign': {
          if (method === 'POST') {
            const body = await request.json() as { assignee: string }
            const result = await this.assignTask(taskId, body.assignee)
            return new Response(JSON.stringify(result), {
              headers: { 'Content-Type': 'application/json' },
            })
          }
          if (method === 'DELETE') {
            const result = await this.unassignTask(taskId)
            return new Response(JSON.stringify(result), {
              headers: { 'Content-Type': 'application/json' },
            })
          }
          break
        }

        case 'escalate': {
          if (method !== 'POST') break
          const body = await request.json() as { to: string; reason: string }
          const result = await this.escalate(taskId, body.to, body.reason)
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        case 'timeout': {
          if (method === 'POST') {
            const body = await request.json() as { timeoutMs: number }
            const result = await this.setTaskTimeout(taskId, body.timeoutMs)
            return new Response(JSON.stringify(result), {
              headers: { 'Content-Type': 'application/json' },
            })
          }
          if (method === 'DELETE') {
            const result = await this.clearTaskTimeout(taskId)
            return new Response(JSON.stringify(result), {
              headers: { 'Content-Type': 'application/json' },
            })
          }
          break
        }
      }
    }

    // Match /api/tasks/:id/timeout/extend
    const extendMatch = path.match(/^\/api\/tasks\/([^/]+)\/timeout\/extend$/)
    if (extendMatch && method === 'PUT') {
      const taskId = extendMatch[1]
      const body = await request.json() as { additionalMs: number }
      const result = await this.extendTimeout(taskId, body.additionalMs)
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Type declarations for Durable Object state
interface DurableObjectState {
  id: { toString(): string }
  storage: DurableObjectStorage
}

interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>
  get<T>(keys: string[]): Promise<Map<string, T>>
  put<T>(key: string, value: T): Promise<void>
  put<T>(entries: Record<string, T>): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  deleteAll(): Promise<void>
  list<T>(options?: { prefix?: string; limit?: number }): Promise<Map<string, T>>
  setAlarm(time: number | Date): Promise<void>
  getAlarm(): Promise<number | null>
  deleteAlarm(): Promise<void>
}
