/**
 * human.do - Human-in-the-Loop Durable Object
 *
 * Seamlessly integrate human judgment into AI workflows.
 * Provides task queues, approval workflows, escalation handling,
 * feedback collection, and SLA tracking.
 *
 * @example
 * ```typescript
 * import { Human } from 'human.do'
 *
 * export class MyHumanDO extends Human {
 *   // Add custom methods or override defaults
 * }
 * ```
 */

import { DO } from 'dotdo'
import type {
  HumanTask,
  HumanResponse,
  HumanFeedback,
  CreateTaskInput,
  ListTasksOptions,
  QueueStats,
  HumanEnv,
  TaskStatus,
  TaskPriority,
  EscalationLevel,
  DecisionType,
} from './types'

export * from './types'

/**
 * Generate a short unique ID
 */
function generateId(prefix = 'htask'): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${timestamp}${random}`
}

/**
 * Human - A Durable Object for human-in-the-loop operations
 *
 * Extends the base DO class to provide:
 * - Task queue management
 * - Approval/review workflows
 * - Escalation handling
 * - Human feedback collection
 * - SLA/deadline tracking
 */
export class Human extends DO {
  declare env: HumanEnv

  // ============================================================
  // Task Management
  // ============================================================

  /**
   * Create a new human task
   */
  async createTask(input: CreateTaskInput): Promise<HumanTask> {
    const now = new Date().toISOString()
    const task: HumanTask = {
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
      deadline: input.deadline,
      expiresAt: input.timeoutMs
        ? new Date(Date.now() + input.timeoutMs).toISOString()
        : undefined,
      timeoutMs: input.timeoutMs,
      metadata: input.metadata,
      options: input.options,
      escalationChain: input.escalationChain,
      escalationLevel: input.escalationChain ? 0 : undefined,
      sla: input.sla,
      tags: input.tags,
      source: input.source,
      callbackUrl: input.callbackUrl,
    }

    await this.ctx.storage.put(`task:${task._id}`, task)

    // Set alarm for expiration/escalation
    if (task.expiresAt || task.escalationChain) {
      await this.scheduleAlarm(task)
    }

    // Notify assignee if pre-assigned
    if (task.assignee) {
      await this.notifyAssignment(task)
    }

    return task
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<HumanTask | null> {
    return (await this.ctx.storage.get<HumanTask>(`task:${taskId}`)) ?? null
  }

  /**
   * List tasks with optional filters
   */
  async listTasks(options: ListTasksOptions = {}): Promise<HumanTask[]> {
    const { status, assignee, type, priority, tags, limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options

    const all = await this.ctx.storage.list<HumanTask>({ prefix: 'task:' })
    let tasks = Array.from(all.values())

    // Apply filters
    if (status) tasks = tasks.filter(t => t.status === status)
    if (assignee) tasks = tasks.filter(t => t.assignee === assignee)
    if (type) tasks = tasks.filter(t => t.type === type)
    if (priority) tasks = tasks.filter(t => t.priority === priority)
    if (tags?.length) tasks = tasks.filter(t => t.tags?.some(tag => tags.includes(tag)))

    // Sort
    tasks.sort((a, b) => {
      const aVal = a[sortBy] ?? ''
      const bVal = b[sortBy] ?? ''
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortOrder === 'asc' ? comparison : -comparison
    })

    // Paginate
    return tasks.slice(offset, offset + limit)
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, updates: Partial<HumanTask>): Promise<HumanTask | null> {
    const task = await this.getTask(taskId)
    if (!task) return null

    const updated: HumanTask = {
      ...task,
      ...updates,
      _id: task._id, // Prevent ID changes
      createdAt: task.createdAt, // Prevent creation time changes
      updatedAt: new Date().toISOString(),
    }

    await this.ctx.storage.put(`task:${taskId}`, updated)
    return updated
  }

  // ============================================================
  // Task Assignment
  // ============================================================

  /**
   * Assign a task to a human
   */
  async assignTask(taskId: string, assignee: string): Promise<HumanTask | null> {
    const task = await this.getTask(taskId)
    if (!task || task.status === 'completed' || task.status === 'expired') return null

    const updated = await this.updateTask(taskId, {
      assignee,
      status: 'assigned',
    })

    if (updated) {
      await this.notifyAssignment(updated)
    }

    return updated
  }

  /**
   * Unassign a task
   */
  async unassignTask(taskId: string): Promise<HumanTask | null> {
    const task = await this.getTask(taskId)
    if (!task || task.status === 'completed' || task.status === 'expired') return null

    return this.updateTask(taskId, {
      assignee: undefined,
      status: 'pending',
    })
  }

  /**
   * Start working on a task
   */
  async startTask(taskId: string, worker: string): Promise<HumanTask | null> {
    const task = await this.getTask(taskId)
    if (!task) return null

    // Auto-assign if not assigned
    if (!task.assignee) {
      await this.assignTask(taskId, worker)
    }

    return this.updateTask(taskId, {
      status: 'in_progress',
    })
  }

  // ============================================================
  // Task Response
  // ============================================================

  /**
   * Respond to a task
   */
  async respondToTask(taskId: string, response: Omit<HumanResponse, 'respondedAt' | 'responseTimeMs'>): Promise<HumanTask | null> {
    const task = await this.getTask(taskId)
    if (!task || task.status === 'completed' || task.status === 'expired') return null

    const respondedAt = new Date().toISOString()
    const responseTimeMs = Date.now() - new Date(task.createdAt).getTime()

    const fullResponse: HumanResponse = {
      ...response,
      respondedAt,
      responseTimeMs,
    }

    const newStatus: TaskStatus = response.decision === 'escalate' ? 'escalated' : response.decision === 'reject' ? 'rejected' : 'completed'

    const updated = await this.updateTask(taskId, {
      response: fullResponse,
      status: newStatus,
    })

    // Trigger callback if configured
    if (updated?.callbackUrl) {
      await this.sendCallback(updated)
    }

    return updated
  }

  /**
   * Quick approve a task
   */
  async approve(taskId: string, comment?: string, respondedBy?: string): Promise<HumanTask | null> {
    return this.respondToTask(taskId, {
      decision: 'approve',
      comment,
      respondedBy: respondedBy ?? 'system',
    })
  }

  /**
   * Quick reject a task
   */
  async reject(taskId: string, reason: string, respondedBy?: string): Promise<HumanTask | null> {
    return this.respondToTask(taskId, {
      decision: 'reject',
      comment: reason,
      respondedBy: respondedBy ?? 'system',
    })
  }

  /**
   * Defer a task for later
   */
  async defer(taskId: string, reason?: string, respondedBy?: string): Promise<HumanTask | null> {
    return this.respondToTask(taskId, {
      decision: 'defer',
      comment: reason,
      respondedBy: respondedBy ?? 'system',
    })
  }

  /**
   * Escalate a task to the next level
   */
  async escalate(taskId: string, reason?: string, respondedBy?: string): Promise<HumanTask | null> {
    const task = await this.getTask(taskId)
    if (!task) return null

    const currentLevel = task.escalationLevel ?? 0
    const nextLevel = currentLevel + 1
    const chain = task.escalationChain

    // If there's an escalation chain, move to next level
    if (chain && nextLevel < chain.length) {
      const level = chain[nextLevel]
      const updated = await this.updateTask(taskId, {
        escalationLevel: nextLevel,
        status: 'escalated',
        assignee: level.assignees[0], // Assign to first person at new level
      })

      if (updated) {
        await this.notifyEscalation(updated, level)
        await this.scheduleAlarm(updated)
      }

      return updated
    }

    // No more levels, just mark as escalated
    return this.respondToTask(taskId, {
      decision: 'escalate',
      comment: reason ?? 'Escalated - no more levels available',
      respondedBy: respondedBy ?? 'system',
    })
  }

  // ============================================================
  // Queue Management
  // ============================================================

  /**
   * Get pending tasks queue for a user
   */
  async getQueue(assignee?: string): Promise<HumanTask[]> {
    return this.listTasks({
      assignee,
      status: assignee ? 'assigned' : 'pending',
      sortBy: 'priority',
      sortOrder: 'desc',
    })
  }

  /**
   * Get count of pending tasks
   */
  async getPendingCount(assignee?: string): Promise<number> {
    const queue = await this.getQueue(assignee)
    return queue.length
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const all = await this.ctx.storage.list<HumanTask>({ prefix: 'task:' })
    const tasks = Array.from(all.values())

    const byStatus: Record<TaskStatus, number> = {
      pending: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      rejected: 0,
      expired: 0,
      escalated: 0,
    }

    const byPriority: Record<TaskPriority, number> = {
      low: 0,
      normal: 0,
      high: 0,
      urgent: 0,
      critical: 0,
    }

    const byType: Record<string, number> = {}

    let totalResponseTime = 0
    let completedCount = 0
    let slaBreaches = 0
    let expiringSoon = 0
    const now = Date.now()
    const oneHour = 60 * 60 * 1000

    for (const task of tasks) {
      byStatus[task.status]++
      byPriority[task.priority]++
      byType[task.type] = (byType[task.type] ?? 0) + 1

      if (task.response?.responseTimeMs) {
        totalResponseTime += task.response.responseTimeMs
        completedCount++

        if (task.sla && task.response.responseTimeMs > task.sla.maxResponseMs) {
          slaBreaches++
        }
      }

      if (task.expiresAt && task.status !== 'completed') {
        const expiresAt = new Date(task.expiresAt).getTime()
        if (expiresAt - now < oneHour && expiresAt > now) {
          expiringSoon++
        }
      }
    }

    const completedWithSla = tasks.filter(t => t.response && t.sla).length

    return {
      total: tasks.length,
      byStatus,
      byPriority,
      byType: byType as Record<string, number>,
      avgResponseTimeMs: completedCount > 0 ? totalResponseTime / completedCount : 0,
      slaComplianceRate: completedWithSla > 0 ? (completedWithSla - slaBreaches) / completedWithSla : 1,
      slaBreaches,
      expiringSoon,
    }
  }

  // ============================================================
  // Feedback Collection
  // ============================================================

  /**
   * Submit feedback on AI output
   */
  async submitFeedback(
    taskId: string,
    feedback: Omit<HumanFeedback, '_id' | 'taskId' | 'providedAt' | 'processed'>
  ): Promise<HumanFeedback> {
    const fb: HumanFeedback = {
      _id: generateId('hfb'),
      taskId,
      ...feedback,
      providedAt: new Date().toISOString(),
      processed: false,
    }

    await this.ctx.storage.put(`feedback:${fb._id}`, fb)
    return fb
  }

  /**
   * Get feedback for a task
   */
  async getFeedback(taskId: string): Promise<HumanFeedback[]> {
    const all = await this.ctx.storage.list<HumanFeedback>({ prefix: 'feedback:' })
    return Array.from(all.values()).filter(fb => fb.taskId === taskId)
  }

  /**
   * Get all unprocessed feedback
   */
  async getUnprocessedFeedback(): Promise<HumanFeedback[]> {
    const all = await this.ctx.storage.list<HumanFeedback>({ prefix: 'feedback:' })
    return Array.from(all.values()).filter(fb => !fb.processed)
  }

  /**
   * Mark feedback as processed
   */
  async markFeedbackProcessed(feedbackId: string): Promise<HumanFeedback | null> {
    const fb = await this.ctx.storage.get<HumanFeedback>(`feedback:${feedbackId}`)
    if (!fb) return null

    const updated: HumanFeedback = { ...fb, processed: true }
    await this.ctx.storage.put(`feedback:${feedbackId}`, updated)
    return updated
  }

  // ============================================================
  // SLA & Deadline Tracking
  // ============================================================

  /**
   * Get tasks breaching or about to breach SLA
   */
  async getSLAAtRisk(thresholdMs = 3600000): Promise<HumanTask[]> {
    const tasks = await this.listTasks({ status: 'pending' })
    const now = Date.now()

    return tasks.filter(task => {
      if (!task.sla) return false
      const age = now - new Date(task.createdAt).getTime()
      return age > task.sla.targetResponseMs - thresholdMs
    })
  }

  /**
   * Get tasks expiring soon
   */
  async getExpiringSoon(thresholdMs = 3600000): Promise<HumanTask[]> {
    const tasks = await this.listTasks()
    const now = Date.now()

    return tasks.filter(task => {
      if (!task.expiresAt || task.status === 'completed') return false
      const expiresAt = new Date(task.expiresAt).getTime()
      return expiresAt > now && expiresAt - now < thresholdMs
    })
  }

  // ============================================================
  // Alarm Handling
  // ============================================================

  /**
   * Handle scheduled alarms for expiration/escalation
   */
  async alarm(): Promise<void> {
    const now = Date.now()
    const tasks = await this.listTasks()

    for (const task of tasks) {
      if (task.status === 'completed' || task.status === 'expired') continue

      // Check expiration
      if (task.expiresAt) {
        const expiresAt = new Date(task.expiresAt).getTime()
        if (expiresAt <= now) {
          await this.handleExpiration(task)
          continue
        }
      }

      // Check escalation
      if (task.escalationChain && task.escalationLevel !== undefined) {
        const level = task.escalationChain[task.escalationLevel]
        if (level) {
          const escalateAt = new Date(task.updatedAt).getTime() + level.timeoutMs
          if (escalateAt <= now) {
            await this.escalate(task._id, 'Auto-escalated due to timeout', 'system')
          }
        }
      }

      // Check SLA breach
      if (task.sla) {
        const age = now - new Date(task.createdAt).getTime()
        if (age > task.sla.maxResponseMs) {
          await this.handleSLABreach(task)
        }
      }
    }

    // Schedule next alarm
    await this.scheduleNextAlarm()
  }

  // ============================================================
  // RPC Interface
  // ============================================================

  /**
   * Check if a method is allowed for RPC
   */
  hasMethod(name: string): boolean {
    const allowedMethods = [
      'createTask',
      'getTask',
      'listTasks',
      'updateTask',
      'assignTask',
      'unassignTask',
      'startTask',
      'respondToTask',
      'approve',
      'reject',
      'defer',
      'escalate',
      'getQueue',
      'getPendingCount',
      'getStats',
      'submitFeedback',
      'getFeedback',
      'getUnprocessedFeedback',
      'markFeedbackProcessed',
      'getSLAAtRisk',
      'getExpiringSoon',
    ]
    return allowedMethods.includes(name)
  }

  /**
   * Invoke an RPC method
   */
  async invoke(method: string, params: unknown[]): Promise<unknown> {
    if (!this.hasMethod(method)) {
      throw new Error(`Method not allowed: ${method}`)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this as any)[method](...params)
  }

  // ============================================================
  // HTTP Handler
  // ============================================================

  /**
   * Handle HTTP requests
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    try {
      // Discovery endpoint
      if (path === '/' && method === 'GET') {
        return this.jsonResponse({
          api: 'human.do',
          version: '0.0.1',
          description: 'Human-in-the-Loop Durable Object',
          links: {
            tasks: '/api/tasks',
            queue: '/api/queue',
            stats: '/api/stats',
            feedback: '/api/feedback',
          },
          discover: {
            methods: [
              { name: 'createTask', description: 'Create a new human task' },
              { name: 'getTask', description: 'Get task by ID' },
              { name: 'listTasks', description: 'List tasks with filters' },
              { name: 'assignTask', description: 'Assign task to human' },
              { name: 'respondToTask', description: 'Submit response to task' },
              { name: 'approve', description: 'Quick approve task' },
              { name: 'reject', description: 'Quick reject task' },
              { name: 'defer', description: 'Defer task for later' },
              { name: 'escalate', description: 'Escalate task' },
              { name: 'getQueue', description: 'Get pending tasks queue' },
              { name: 'getStats', description: 'Get queue statistics' },
              { name: 'submitFeedback', description: 'Submit feedback on AI' },
            ],
          },
        })
      }

      // RPC endpoint
      if (path === '/rpc' && method === 'POST') {
        const { method: rpcMethod, params } = await request.json() as { method: string; params: unknown[] }
        if (!this.hasMethod(rpcMethod)) {
          return this.errorResponse(`Invalid method: ${rpcMethod}`, 400)
        }
        const result = await this.invoke(rpcMethod, params ?? [])
        return this.jsonResponse({ result })
      }

      // REST API
      // GET /api/tasks
      if (path === '/api/tasks' && method === 'GET') {
        const options = this.parseQueryParams(url.searchParams)
        const tasks = await this.listTasks(options)
        return this.jsonResponse(tasks)
      }

      // POST /api/tasks
      if (path === '/api/tasks' && method === 'POST') {
        const input = await request.json() as CreateTaskInput
        const task = await this.createTask(input)
        return this.jsonResponse(task, 201)
      }

      // GET /api/tasks/:id
      const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/)
      if (taskMatch && method === 'GET') {
        const task = await this.getTask(taskMatch[1])
        if (!task) return this.errorResponse('Task not found', 404)
        return this.jsonResponse(task)
      }

      // POST /api/tasks/:id/respond
      const respondMatch = path.match(/^\/api\/tasks\/([^/]+)\/respond$/)
      if (respondMatch && method === 'POST') {
        const response = await request.json() as Omit<HumanResponse, 'respondedAt' | 'responseTimeMs'>
        const task = await this.respondToTask(respondMatch[1], response)
        if (!task) return this.errorResponse('Task not found', 404)
        return this.jsonResponse(task)
      }

      // POST /api/tasks/:id/assign
      const assignMatch = path.match(/^\/api\/tasks\/([^/]+)\/assign$/)
      if (assignMatch && method === 'POST') {
        const { assignee } = await request.json() as { assignee: string }
        const task = await this.assignTask(assignMatch[1], assignee)
        if (!task) return this.errorResponse('Task not found', 404)
        return this.jsonResponse(task)
      }

      // POST /api/tasks/:id/approve
      const approveMatch = path.match(/^\/api\/tasks\/([^/]+)\/approve$/)
      if (approveMatch && method === 'POST') {
        const { comment, respondedBy } = await request.json() as { comment?: string; respondedBy?: string }
        const task = await this.approve(approveMatch[1], comment, respondedBy)
        if (!task) return this.errorResponse('Task not found', 404)
        return this.jsonResponse(task)
      }

      // POST /api/tasks/:id/reject
      const rejectMatch = path.match(/^\/api\/tasks\/([^/]+)\/reject$/)
      if (rejectMatch && method === 'POST') {
        const { reason, respondedBy } = await request.json() as { reason: string; respondedBy?: string }
        const task = await this.reject(rejectMatch[1], reason, respondedBy)
        if (!task) return this.errorResponse('Task not found', 404)
        return this.jsonResponse(task)
      }

      // POST /api/tasks/:id/escalate
      const escalateMatch = path.match(/^\/api\/tasks\/([^/]+)\/escalate$/)
      if (escalateMatch && method === 'POST') {
        const { reason, respondedBy } = await request.json() as { reason?: string; respondedBy?: string }
        const task = await this.escalate(escalateMatch[1], reason, respondedBy)
        if (!task) return this.errorResponse('Task not found', 404)
        return this.jsonResponse(task)
      }

      // GET /api/queue
      if (path === '/api/queue' && method === 'GET') {
        const assignee = url.searchParams.get('assignee') ?? undefined
        const queue = await this.getQueue(assignee)
        return this.jsonResponse(queue)
      }

      // GET /api/stats
      if (path === '/api/stats' && method === 'GET') {
        const stats = await this.getStats()
        return this.jsonResponse(stats)
      }

      // POST /api/feedback
      if (path === '/api/feedback' && method === 'POST') {
        const input = await request.json() as { taskId: string } & Omit<HumanFeedback, '_id' | 'taskId' | 'providedAt' | 'processed'>
        const { taskId, ...feedback } = input
        const fb = await this.submitFeedback(taskId, feedback)
        return this.jsonResponse(fb, 201)
      }

      // GET /api/feedback
      if (path === '/api/feedback' && method === 'GET') {
        const taskId = url.searchParams.get('taskId')
        if (taskId) {
          const feedback = await this.getFeedback(taskId)
          return this.jsonResponse(feedback)
        }
        const unprocessed = await this.getUnprocessedFeedback()
        return this.jsonResponse(unprocessed)
      }

      return this.errorResponse('Not found', 404)
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Internal error', 500)
    }
  }

  // ============================================================
  // Private Helpers
  // ============================================================

  private jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private errorResponse(message: string, status: number): Response {
    return this.jsonResponse({ error: message }, status)
  }

  private parseQueryParams(params: URLSearchParams): ListTasksOptions {
    return {
      status: params.get('status') as TaskStatus | undefined,
      assignee: params.get('assignee') ?? undefined,
      type: params.get('type') as ListTasksOptions['type'] ?? undefined,
      priority: params.get('priority') as TaskPriority | undefined,
      tags: params.get('tags')?.split(','),
      limit: params.get('limit') ? parseInt(params.get('limit')!) : undefined,
      offset: params.get('offset') ? parseInt(params.get('offset')!) : undefined,
      sortBy: params.get('sortBy') as ListTasksOptions['sortBy'] ?? undefined,
      sortOrder: params.get('sortOrder') as ListTasksOptions['sortOrder'] ?? undefined,
    }
  }

  private async scheduleAlarm(task: HumanTask): Promise<void> {
    const now = Date.now()
    let nextAlarm = Infinity

    // Check expiration
    if (task.expiresAt) {
      const expiresAt = new Date(task.expiresAt).getTime()
      if (expiresAt > now && expiresAt < nextAlarm) {
        nextAlarm = expiresAt
      }
    }

    // Check escalation
    if (task.escalationChain && task.escalationLevel !== undefined) {
      const level = task.escalationChain[task.escalationLevel]
      if (level) {
        const escalateAt = new Date(task.updatedAt).getTime() + level.timeoutMs
        if (escalateAt > now && escalateAt < nextAlarm) {
          nextAlarm = escalateAt
        }
      }
    }

    // Check SLA warning
    if (task.sla?.warningThresholdMs) {
      const warnAt = new Date(task.createdAt).getTime() + task.sla.warningThresholdMs
      if (warnAt > now && warnAt < nextAlarm) {
        nextAlarm = warnAt
      }
    }

    if (nextAlarm !== Infinity) {
      await this.ctx.storage.setAlarm(nextAlarm)
    }
  }

  private async scheduleNextAlarm(): Promise<void> {
    const tasks = await this.listTasks()
    let nextAlarm = Infinity
    const now = Date.now()

    for (const task of tasks) {
      if (task.status === 'completed' || task.status === 'expired') continue

      if (task.expiresAt) {
        const expiresAt = new Date(task.expiresAt).getTime()
        if (expiresAt > now && expiresAt < nextAlarm) {
          nextAlarm = expiresAt
        }
      }

      if (task.escalationChain && task.escalationLevel !== undefined) {
        const level = task.escalationChain[task.escalationLevel]
        if (level) {
          const escalateAt = new Date(task.updatedAt).getTime() + level.timeoutMs
          if (escalateAt > now && escalateAt < nextAlarm) {
            nextAlarm = escalateAt
          }
        }
      }
    }

    if (nextAlarm !== Infinity) {
      await this.ctx.storage.setAlarm(nextAlarm)
    }
  }

  private async handleExpiration(task: HumanTask): Promise<void> {
    await this.updateTask(task._id, { status: 'expired' })

    // Trigger callback if configured
    if (task.callbackUrl) {
      await this.sendCallback({ ...task, status: 'expired' })
    }
  }

  private async handleSLABreach(task: HumanTask): Promise<void> {
    if (!task.sla) return

    switch (task.sla.onBreach) {
      case 'escalate':
        await this.escalate(task._id, 'SLA breach - auto-escalated', 'system')
        break
      case 'auto-approve':
        await this.approve(task._id, 'SLA breach - auto-approved', 'system')
        break
      case 'auto-reject':
        await this.reject(task._id, 'SLA breach - auto-rejected', 'system')
        break
      case 'notify':
        await this.notifySLABreach(task)
        break
    }
  }

  private async notifyAssignment(task: HumanTask): Promise<void> {
    if (!this.env.NOTIFY || !task.assignee) return

    await this.env.NOTIFY.send({
      channel: 'email',
      recipient: task.assignee,
      subject: `[human.do] Task assigned: ${task.title}`,
      body: `You have been assigned a new ${task.type} task: ${task.title}\n\n${task.description ?? ''}\n\nPriority: ${task.priority}`,
    })
  }

  private async notifyEscalation(task: HumanTask, level: EscalationLevel): Promise<void> {
    if (!this.env.NOTIFY) return

    for (const channel of level.notifyVia ?? ['email']) {
      for (const assignee of level.assignees) {
        await this.env.NOTIFY.send({
          channel,
          recipient: assignee,
          subject: `[human.do] ESCALATED: ${task.title}`,
          body: `Task escalated to level ${level.level}: ${task.title}\n\n${task.description ?? ''}`,
        })
      }
    }
  }

  private async notifySLABreach(task: HumanTask): Promise<void> {
    if (!this.env.NOTIFY || !task.sla?.notifyOnBreach) return

    for (const recipient of task.sla.notifyOnBreach) {
      await this.env.NOTIFY.send({
        channel: 'email',
        recipient,
        subject: `[human.do] SLA BREACH: ${task.title}`,
        body: `Task has breached SLA: ${task.title}\n\nTarget: ${task.sla.targetResponseMs}ms\nMax: ${task.sla.maxResponseMs}ms`,
      })
    }
  }

  private async sendCallback(task: HumanTask): Promise<void> {
    if (!task.callbackUrl) return

    try {
      if (this.env.WEBHOOKS) {
        await this.env.WEBHOOKS.send(task.callbackUrl, task)
      } else {
        await fetch(task.callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task),
        })
      }
    } catch {
      // Silently fail callback - could add retry logic
    }
  }
}

export default Human
