/**
 * execution.do - Execution Orchestration with Retry and Rate Limiting
 *
 * A Durable Object for managing task execution with:
 * - Automatic retry with exponential backoff
 * - Rate limiting per execution or globally
 * - Execution history and status tracking
 * - Timeout handling
 * - Concurrent execution control
 *
 * Extends dotdo for database and AI capabilities.
 */

// ============================================================================
// Base DO Types (minimal for independence)
// ============================================================================

export interface DOState {
  readonly id: DurableObjectId
  readonly storage: DOStorage
  waitUntil(promise: Promise<unknown>): void
}

export interface DurableObjectId {
  readonly name?: string
  toString(): string
  equals(other: DurableObjectId): boolean
}

export interface DOStorage {
  get<T = unknown>(key: string): Promise<T | undefined>
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>
  put<T>(key: string, value: T): Promise<void>
  put<T>(entries: Record<string, T>): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  list<T = unknown>(options?: { prefix?: string }): Promise<Map<string, T>>
  setAlarm(scheduledTime: number | Date): Promise<void>
  getAlarm(): Promise<number | null>
  deleteAlarm(): Promise<void>
}

/**
 * Minimal DO base class for execution management
 */
export class DO<Env = unknown> {
  protected readonly ctx: DOState
  protected readonly env: Env

  constructor(ctx: DOState, env: Env) {
    this.ctx = ctx
    this.env = env
  }

  async fetch(_request: Request): Promise<Response> {
    return new Response('Not implemented', { status: 501 })
  }

  async alarm(): Promise<void> {
    // Override in subclass
  }
}

// ============================================================================
// Types
// ============================================================================

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rate_limited' | 'cancelled'

export interface ExecutionConfig {
  /** Maximum number of retry attempts */
  maxRetries?: number
  /** Initial retry delay in milliseconds */
  initialRetryDelay?: number
  /** Maximum retry delay in milliseconds */
  maxRetryDelay?: number
  /** Backoff multiplier (default: 2 for exponential backoff) */
  backoffMultiplier?: number
  /** Execution timeout in milliseconds */
  timeout?: number
  /** Rate limit: max executions per time window */
  rateLimit?: {
    /** Maximum number of executions allowed */
    maxExecutions: number
    /** Time window in milliseconds */
    windowMs: number
  }
}

export interface ExecutionTask<TInput = unknown, TOutput = unknown> {
  /** Unique task ID */
  id: string
  /** Task name/type for categorization */
  name: string
  /** Input data for the task */
  input: TInput
  /** Task configuration */
  config?: ExecutionConfig
  /** Priority (higher = more important) */
  priority?: number
  /** Optional idempotency key */
  idempotencyKey?: string
  /** Optional metadata */
  metadata?: Record<string, unknown>
}

export interface ExecutionResult<TOutput = unknown> {
  /** Task ID */
  taskId: string
  /** Execution status */
  status: ExecutionStatus
  /** Output data if successful */
  output?: TOutput
  /** Error message if failed */
  error?: string
  /** Error stack trace */
  stack?: string
  /** Number of retry attempts made */
  retries: number
  /** When the task started */
  startedAt: number
  /** When the task completed */
  completedAt?: number
  /** Total duration in milliseconds */
  duration?: number
  /** Whether this was a rate limited execution */
  wasRateLimited?: boolean
  /** Next retry time if scheduled */
  nextRetryAt?: number
}

export interface ExecutionRecord<TInput = unknown, TOutput = unknown> extends ExecutionTask<TInput, TOutput> {
  /** Current execution status */
  status: ExecutionStatus
  /** Current result */
  result?: ExecutionResult<TOutput>
  /** Retry count */
  retries: number
  /** When created */
  createdAt: number
  /** Last update time */
  updatedAt: number
  /** Next scheduled execution time (for retries) */
  scheduledAt?: number
}

export interface RateLimitState {
  /** Execution IDs in current window */
  executions: string[]
  /** Window start timestamp */
  windowStart: number
  /** Window duration in ms */
  windowMs: number
  /** Max executions allowed */
  maxExecutions: number
}

// ============================================================================
// Execution Durable Object
// ============================================================================

export class Execution<Env = unknown> extends DO<Env> {
  private defaultConfig: ExecutionConfig = {
    maxRetries: 3,
    initialRetryDelay: 1000, // 1 second
    maxRetryDelay: 60000, // 60 seconds
    backoffMultiplier: 2,
    timeout: 30000, // 30 seconds
  }

  /**
   * Configure default execution settings
   */
  configure(config: Partial<ExecutionConfig>): this {
    this.defaultConfig = { ...this.defaultConfig, ...config }
    return this
  }

  // --------------------------------------------------------------------------
  // Task Execution
  // --------------------------------------------------------------------------

  /**
   * Submit a task for execution
   */
  async submit<TInput = unknown, TOutput = unknown>(
    task: ExecutionTask<TInput, TOutput>
  ): Promise<ExecutionRecord<TInput, TOutput>> {
    // Check for idempotency
    if (task.idempotencyKey) {
      const existing = await this.findByIdempotencyKey<TInput, TOutput>(task.idempotencyKey)
      if (existing) {
        return existing
      }
    }

    // Check rate limit
    const config = { ...this.defaultConfig, ...task.config }
    if (config.rateLimit) {
      const isAllowed = await this.checkRateLimit(config.rateLimit)
      if (!isAllowed) {
        const record: ExecutionRecord<TInput, TOutput> = {
          ...task,
          status: 'rate_limited',
          retries: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        await this.saveRecord(record)
        return record
      }
    }

    const now = Date.now()
    const record: ExecutionRecord<TInput, TOutput> = {
      ...task,
      status: 'pending',
      retries: 0,
      createdAt: now,
      updatedAt: now,
    }

    await this.saveRecord(record)

    // Start execution asynchronously
    this.ctx.waitUntil(this.executeTask(record))

    return record
  }

  /**
   * Execute a task with retry logic
   */
  private async executeTask<TInput = unknown, TOutput = unknown>(
    record: ExecutionRecord<TInput, TOutput>
  ): Promise<ExecutionResult<TOutput>> {
    const config = { ...this.defaultConfig, ...record.config }
    const startedAt = Date.now()

    record.status = 'running'
    record.updatedAt = startedAt
    await this.saveRecord(record)

    // Update rate limit counter
    if (config.rateLimit) {
      await this.recordExecution(record.id, config.rateLimit)
    }

    try {
      // Execute with timeout
      const output = await this.executeWithTimeout<TInput, TOutput>(
        record,
        config.timeout || 30000
      )

      const completedAt = Date.now()
      const result: ExecutionResult<TOutput> = {
        taskId: record.id,
        status: 'completed',
        output,
        retries: record.retries,
        startedAt,
        completedAt,
        duration: completedAt - startedAt,
      }

      record.status = 'completed'
      record.result = result
      record.updatedAt = completedAt
      await this.saveRecord(record)

      return result
    } catch (error) {
      const completedAt = Date.now()
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      // Check if we should retry
      if (record.retries < (config.maxRetries || 3)) {
        const retryDelay = this.calculateRetryDelay(record.retries, config)
        const nextRetryAt = Date.now() + retryDelay

        const result: ExecutionResult<TOutput> = {
          taskId: record.id,
          status: 'failed',
          error: errorMessage,
          stack: errorStack,
          retries: record.retries,
          startedAt,
          completedAt,
          duration: completedAt - startedAt,
          nextRetryAt,
        }

        record.status = 'pending'
        record.result = result
        record.retries++
        record.scheduledAt = nextRetryAt
        record.updatedAt = completedAt
        await this.saveRecord(record)

        // Schedule retry using alarm
        await this.ctx.storage.setAlarm(nextRetryAt)

        return result
      } else {
        // Max retries exceeded, mark as failed
        const result: ExecutionResult<TOutput> = {
          taskId: record.id,
          status: 'failed',
          error: errorMessage,
          stack: errorStack,
          retries: record.retries,
          startedAt,
          completedAt,
          duration: completedAt - startedAt,
        }

        record.status = 'failed'
        record.result = result
        record.updatedAt = completedAt
        await this.saveRecord(record)

        return result
      }
    }
  }

  /**
   * Execute task with timeout
   */
  private async executeWithTimeout<TInput = unknown, TOutput = unknown>(
    record: ExecutionRecord<TInput, TOutput>,
    timeout: number
  ): Promise<TOutput> {
    return Promise.race([
      this.handleTask<TInput, TOutput>(record),
      new Promise<TOutput>((_, reject) =>
        setTimeout(() => reject(new Error(`Task timeout after ${timeout}ms`)), timeout)
      ),
    ])
  }

  /**
   * Handle task execution - override this method to implement custom task handling
   */
  protected async handleTask<TInput = unknown, TOutput = unknown>(
    record: ExecutionRecord<TInput, TOutput>
  ): Promise<TOutput> {
    // Default implementation - subclasses should override
    // Try to call a method matching the task name
    const handler = (this as unknown as Record<string, unknown>)[record.name]
    if (typeof handler === 'function') {
      return await (handler as Function).call(this, record.input)
    }

    throw new Error(`No handler found for task: ${record.name}`)
  }

  // --------------------------------------------------------------------------
  // Rate Limiting
  // --------------------------------------------------------------------------

  /**
   * Check if execution is allowed under rate limit
   */
  private async checkRateLimit(rateLimit: NonNullable<ExecutionConfig['rateLimit']>): Promise<boolean> {
    const state = await this.getRateLimitState(rateLimit)
    const now = Date.now()

    // Check if we need to reset the window
    if (now - state.windowStart >= state.windowMs) {
      // Reset window
      state.executions = []
      state.windowStart = now
      await this.saveRateLimitState(state)
      return true
    }

    // Check if we're under the limit
    return state.executions.length < state.maxExecutions
  }

  /**
   * Record an execution for rate limiting
   */
  private async recordExecution(
    executionId: string,
    rateLimit: NonNullable<ExecutionConfig['rateLimit']>
  ): Promise<void> {
    const state = await this.getRateLimitState(rateLimit)
    const now = Date.now()

    // Reset window if needed
    if (now - state.windowStart >= state.windowMs) {
      state.executions = []
      state.windowStart = now
    }

    state.executions.push(executionId)
    await this.saveRateLimitState(state)
  }

  /**
   * Get rate limit state
   */
  private async getRateLimitState(
    rateLimit: NonNullable<ExecutionConfig['rateLimit']>
  ): Promise<RateLimitState> {
    const state = await this.ctx.storage.get<RateLimitState>('ratelimit:state')
    if (state) {
      return state
    }

    return {
      executions: [],
      windowStart: Date.now(),
      windowMs: rateLimit.windowMs,
      maxExecutions: rateLimit.maxExecutions,
    }
  }

  /**
   * Save rate limit state
   */
  private async saveRateLimitState(state: RateLimitState): Promise<void> {
    await this.ctx.storage.put('ratelimit:state', state)
  }

  // --------------------------------------------------------------------------
  // Retry Logic
  // --------------------------------------------------------------------------

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number, config: ExecutionConfig): number {
    const { initialRetryDelay = 1000, maxRetryDelay = 60000, backoffMultiplier = 2 } = config

    const delay = initialRetryDelay * Math.pow(backoffMultiplier, retryCount)

    // Add jitter (random 0-25% of delay)
    const jitter = delay * 0.25 * Math.random()

    return Math.min(delay + jitter, maxRetryDelay)
  }

  /**
   * Handle alarm for scheduled retries
   */
  async alarm(): Promise<void> {
    const now = Date.now()
    const records = await this.listRecords({ status: 'pending' })

    for (const record of records) {
      if (record.scheduledAt && record.scheduledAt <= now) {
        // Execute retry
        this.ctx.waitUntil(this.executeTask(record))
      }
    }
  }

  // --------------------------------------------------------------------------
  // Task Management
  // --------------------------------------------------------------------------

  /**
   * Get task status
   */
  async getStatus<TInput = unknown, TOutput = unknown>(
    taskId: string
  ): Promise<ExecutionRecord<TInput, TOutput> | null> {
    return this.getRecord<TInput, TOutput>(taskId)
  }

  /**
   * Cancel a task
   */
  async cancel(taskId: string): Promise<boolean> {
    const record = await this.getRecord(taskId)
    if (!record) return false

    if (record.status === 'pending' || record.status === 'rate_limited') {
      record.status = 'cancelled'
      record.updatedAt = Date.now()
      await this.saveRecord(record)
      return true
    }

    return false
  }

  /**
   * Retry a failed task immediately
   */
  async retry<TInput = unknown, TOutput = unknown>(
    taskId: string
  ): Promise<ExecutionRecord<TInput, TOutput> | null> {
    const record = await this.getRecord<TInput, TOutput>(taskId)
    if (!record) return null

    if (record.status === 'failed' || record.status === 'rate_limited') {
      record.status = 'pending'
      record.retries = 0
      record.scheduledAt = undefined
      record.updatedAt = Date.now()
      await this.saveRecord(record)

      // Execute immediately
      this.ctx.waitUntil(this.executeTask(record))

      return record
    }

    return null
  }

  /**
   * List tasks with optional filters
   */
  async listRecords<TInput = unknown, TOutput = unknown>(filters?: {
    status?: ExecutionStatus
    name?: string
    limit?: number
  }): Promise<ExecutionRecord<TInput, TOutput>[]> {
    const entries = await this.ctx.storage.list<ExecutionRecord<TInput, TOutput>>({
      prefix: 'task:',
    })
    let records = Array.from(entries.values())

    if (filters?.status) {
      records = records.filter((r) => r.status === filters.status)
    }

    if (filters?.name) {
      records = records.filter((r) => r.name === filters.name)
    }

    // Sort by priority (desc) then createdAt (desc)
    records.sort((a, b) => {
      const priorityA = a.priority || 0
      const priorityB = b.priority || 0
      if (priorityA !== priorityB) {
        return priorityB - priorityA
      }
      return b.createdAt - a.createdAt
    })

    if (filters?.limit) {
      records = records.slice(0, filters.limit)
    }

    return records
  }

  /**
   * Get metrics about execution performance
   */
  async getMetrics(): Promise<{
    total: number
    completed: number
    failed: number
    pending: number
    running: number
    rateLimited: number
    cancelled: number
    averageDuration: number
    averageRetries: number
  }> {
    const records = await this.listRecords()
    const metrics = {
      total: records.length,
      completed: 0,
      failed: 0,
      pending: 0,
      running: 0,
      rateLimited: 0,
      cancelled: 0,
      averageDuration: 0,
      averageRetries: 0,
    }

    let totalDuration = 0
    let totalRetries = 0
    let completedCount = 0

    for (const record of records) {
      switch (record.status) {
        case 'completed':
          metrics.completed++
          if (record.result?.duration) {
            totalDuration += record.result.duration
            completedCount++
          }
          break
        case 'failed':
          metrics.failed++
          break
        case 'pending':
          metrics.pending++
          break
        case 'running':
          metrics.running++
          break
        case 'rate_limited':
          metrics.rateLimited++
          break
        case 'cancelled':
          metrics.cancelled++
          break
      }
      totalRetries += record.retries
    }

    if (completedCount > 0) {
      metrics.averageDuration = totalDuration / completedCount
    }

    if (records.length > 0) {
      metrics.averageRetries = totalRetries / records.length
    }

    return metrics
  }

  // --------------------------------------------------------------------------
  // Storage Operations
  // --------------------------------------------------------------------------

  private async saveRecord<TInput = unknown, TOutput = unknown>(
    record: ExecutionRecord<TInput, TOutput>
  ): Promise<void> {
    await this.ctx.storage.put(`task:${record.id}`, record)

    // Also index by idempotency key if provided
    if (record.idempotencyKey) {
      await this.ctx.storage.put(`idempotency:${record.idempotencyKey}`, record.id)
    }
  }

  private async getRecord<TInput = unknown, TOutput = unknown>(
    taskId: string
  ): Promise<ExecutionRecord<TInput, TOutput> | null> {
    return (await this.ctx.storage.get<ExecutionRecord<TInput, TOutput>>(`task:${taskId}`)) || null
  }

  private async findByIdempotencyKey<TInput = unknown, TOutput = unknown>(
    idempotencyKey: string
  ): Promise<ExecutionRecord<TInput, TOutput> | null> {
    const taskId = await this.ctx.storage.get<string>(`idempotency:${idempotencyKey}`)
    if (!taskId) return null
    return this.getRecord<TInput, TOutput>(taskId)
  }
}

// ============================================================================
// Exports
// ============================================================================

export default Execution
