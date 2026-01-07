/**
 * function.do - Serverless Function Durable Object
 *
 * Add state, versioning, and observability to your serverless functions.
 * Built on dotdo with:
 * - Function deployment and versioning
 * - Execution tracking and structured logs
 * - Per-function rate limiting
 * - Cold start optimization with pre-warming
 * - Resource usage metrics and analytics
 */

import { DO } from 'dotdo'
import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core'
import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm'

// Schema definitions
export const functions = sqliteTable('functions', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  code: text('code').notNull(),
  runtime: text('runtime').notNull().default('v8'),
  version: integer('version').notNull().default(1),
  timeout: integer('timeout').default(30000),
  memory: integer('memory').default(128),
  env: text('env'), // JSON string of environment variables
  metadata: text('metadata'), // JSON string for custom metadata
  status: text('status').notNull().default('active'), // active, disabled, deprecated
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const functionVersions = sqliteTable('function_versions', {
  id: text('id').primaryKey(),
  functionId: text('function_id').notNull().references(() => functions.id),
  version: integer('version').notNull(),
  code: text('code').notNull(),
  changelog: text('changelog'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  createdBy: text('created_by'),
})

export const executions = sqliteTable('executions', {
  id: text('id').primaryKey(),
  functionId: text('function_id').notNull().references(() => functions.id),
  functionVersion: integer('function_version').notNull(),
  input: text('input'), // JSON string
  output: text('output'), // JSON string
  error: text('error'),
  status: text('status').notNull().default('pending'), // pending, running, completed, failed, timeout
  duration: integer('duration'), // milliseconds
  coldStart: integer('cold_start', { mode: 'boolean' }).default(false),
  cpuTime: real('cpu_time'), // milliseconds
  memoryUsed: integer('memory_used'), // bytes
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const logs = sqliteTable('logs', {
  id: text('id').primaryKey(),
  executionId: text('execution_id').notNull().references(() => executions.id),
  functionId: text('function_id').notNull().references(() => functions.id),
  level: text('level').notNull().default('info'), // debug, info, warn, error
  message: text('message').notNull(),
  data: text('data'), // JSON string for structured data
  timestamp: integer('timestamp', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const rateLimits = sqliteTable('rate_limits', {
  id: text('id').primaryKey(),
  functionId: text('function_id').notNull().references(() => functions.id),
  key: text('key').notNull(), // identifier for rate limit (e.g., userId, IP)
  windowStart: integer('window_start', { mode: 'timestamp' }).notNull(),
  count: integer('count').notNull().default(0),
})

export const metrics = sqliteTable('metrics', {
  id: text('id').primaryKey(),
  functionId: text('function_id').notNull().references(() => functions.id),
  date: text('date').notNull(), // YYYY-MM-DD
  invocations: integer('invocations').notNull().default(0),
  successes: integer('successes').notNull().default(0),
  failures: integer('failures').notNull().default(0),
  timeouts: integer('timeouts').notNull().default(0),
  coldStarts: integer('cold_starts').notNull().default(0),
  totalDuration: integer('total_duration').notNull().default(0),
  totalCpuTime: real('total_cpu_time').notNull().default(0),
  totalMemory: integer('total_memory').notNull().default(0),
  p50Duration: integer('p50_duration'),
  p95Duration: integer('p95_duration'),
  p99Duration: integer('p99_duration'),
})

export const warmInstances = sqliteTable('warm_instances', {
  id: text('id').primaryKey(),
  functionId: text('function_id').notNull().references(() => functions.id),
  instanceId: text('instance_id').notNull(),
  status: text('status').notNull().default('warm'), // warm, busy, expired
  lastUsed: integer('last_used', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const schema = {
  functions,
  functionVersions,
  executions,
  logs,
  rateLimits,
  metrics,
  warmInstances,
}

// Types
export type FunctionRecord = typeof functions.$inferSelect
export type FunctionInsert = typeof functions.$inferInsert
export type ExecutionRecord = typeof executions.$inferSelect
export type LogRecord = typeof logs.$inferSelect
export type MetricsRecord = typeof metrics.$inferSelect

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export interface ExecutionResult<T = unknown> {
  id: string
  output?: T
  error?: string
  status: 'completed' | 'failed' | 'timeout'
  duration: number
  coldStart: boolean
}

export interface FunctionMetrics {
  invocations: number
  successRate: number
  avgDuration: number
  p50Duration: number
  p95Duration: number
  p99Duration: number
  coldStartRate: number
}

// Utility functions
function generateId(): string {
  return crypto.randomUUID()
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Function - Durable Object for serverless function management
 *
 * Extends the base DO class to provide:
 * - Function deployment with automatic versioning
 * - Execution tracking with structured logging
 * - Configurable per-function rate limiting
 * - Cold start optimization via instance pre-warming
 * - Real-time and historical metrics
 */
export class Function extends DO {
  db = drizzle(this.ctx.storage.sql, { schema })

  private rateLimitConfigs: Map<string, RateLimitConfig> = new Map()
  private defaultRateLimit: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }

  // ============================================
  // Function Management
  // ============================================

  /**
   * Deploy a new function or update an existing one
   */
  async deploy(params: {
    name: string
    code: string
    runtime?: 'v8' | 'node' | 'python' | 'wasm'
    timeout?: number
    memory?: number
    env?: Record<string, string>
    metadata?: Record<string, unknown>
    changelog?: string
  }): Promise<FunctionRecord> {
    const existing = await this.db
      .select()
      .from(functions)
      .where(eq(functions.name, params.name))
      .get()

    if (existing) {
      // Create version snapshot before updating
      await this.db.insert(functionVersions).values({
        id: generateId(),
        functionId: existing.id,
        version: existing.version,
        code: existing.code,
        changelog: params.changelog,
      })

      // Update function
      const [updated] = await this.db
        .update(functions)
        .set({
          code: params.code,
          runtime: params.runtime || existing.runtime,
          timeout: params.timeout ?? existing.timeout,
          memory: params.memory ?? existing.memory,
          env: params.env ? JSON.stringify(params.env) : existing.env,
          metadata: params.metadata ? JSON.stringify(params.metadata) : existing.metadata,
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(functions.id, existing.id))
        .returning()

      return updated
    }

    // Create new function
    const [created] = await this.db
      .insert(functions)
      .values({
        id: generateId(),
        name: params.name,
        code: params.code,
        runtime: params.runtime || 'v8',
        timeout: params.timeout,
        memory: params.memory,
        env: params.env ? JSON.stringify(params.env) : undefined,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      })
      .returning()

    return created
  }

  /**
   * Get a function by name
   */
  async get(name: string): Promise<FunctionRecord | undefined> {
    return this.db.select().from(functions).where(eq(functions.name, name)).get()
  }

  /**
   * List all functions
   */
  async list(params?: {
    status?: 'active' | 'disabled' | 'deprecated'
    limit?: number
    offset?: number
  }): Promise<FunctionRecord[]> {
    let query = this.db.select().from(functions)

    if (params?.status) {
      query = query.where(eq(functions.status, params.status)) as typeof query
    }

    return query.limit(params?.limit || 100).offset(params?.offset || 0).all()
  }

  /**
   * Get function version history
   */
  async versions(name: string): Promise<Array<typeof functionVersions.$inferSelect>> {
    const fn = await this.get(name)
    if (!fn) throw new Error(`Function not found: ${name}`)

    return this.db
      .select()
      .from(functionVersions)
      .where(eq(functionVersions.functionId, fn.id))
      .orderBy(desc(functionVersions.version))
      .all()
  }

  /**
   * Rollback to a specific version
   */
  async rollback(name: string, version: number): Promise<FunctionRecord> {
    const fn = await this.get(name)
    if (!fn) throw new Error(`Function not found: ${name}`)

    const targetVersion = await this.db
      .select()
      .from(functionVersions)
      .where(and(eq(functionVersions.functionId, fn.id), eq(functionVersions.version, version)))
      .get()

    if (!targetVersion) throw new Error(`Version ${version} not found for function ${name}`)

    return this.deploy({
      name,
      code: targetVersion.code,
      changelog: `Rollback to version ${version}`,
    })
  }

  /**
   * Disable or deprecate a function
   */
  async setStatus(name: string, status: 'active' | 'disabled' | 'deprecated'): Promise<FunctionRecord> {
    const fn = await this.get(name)
    if (!fn) throw new Error(`Function not found: ${name}`)

    const [updated] = await this.db
      .update(functions)
      .set({ status, updatedAt: new Date() })
      .where(eq(functions.id, fn.id))
      .returning()

    return updated
  }

  /**
   * Delete a function and all its data
   */
  async delete(name: string): Promise<void> {
    const fn = await this.get(name)
    if (!fn) return

    // Delete in order due to foreign keys
    await this.db.delete(logs).where(eq(logs.functionId, fn.id))
    await this.db.delete(executions).where(eq(executions.functionId, fn.id))
    await this.db.delete(functionVersions).where(eq(functionVersions.functionId, fn.id))
    await this.db.delete(rateLimits).where(eq(rateLimits.functionId, fn.id))
    await this.db.delete(metrics).where(eq(metrics.functionId, fn.id))
    await this.db.delete(warmInstances).where(eq(warmInstances.functionId, fn.id))
    await this.db.delete(functions).where(eq(functions.id, fn.id))
  }

  // ============================================
  // Execution Tracking
  // ============================================

  /**
   * Execute a function with full tracking
   */
  async invoke<T = unknown>(
    name: string,
    input?: unknown,
    options?: { rateLimitKey?: string }
  ): Promise<ExecutionResult<T>> {
    const fn = await this.get(name)
    if (!fn) throw new Error(`Function not found: ${name}`)
    if (fn.status === 'disabled') throw new Error(`Function is disabled: ${name}`)

    // Check rate limit
    if (options?.rateLimitKey) {
      const allowed = await this.checkRateLimit(fn.id, options.rateLimitKey)
      if (!allowed) {
        throw new Error(`Rate limit exceeded for function: ${name}`)
      }
    }

    // Create execution record
    const executionId = generateId()
    const coldStart = await this.isColdStart(fn.id)

    await this.db.insert(executions).values({
      id: executionId,
      functionId: fn.id,
      functionVersion: fn.version,
      input: input ? JSON.stringify(input) : undefined,
      status: 'running',
      coldStart,
      startedAt: new Date(),
    })

    const startTime = Date.now()

    try {
      // Execute the function (this would integrate with your runtime)
      const output = await this.executeCode<T>(fn, input)
      const duration = Date.now() - startTime

      // Update execution record
      await this.db
        .update(executions)
        .set({
          status: 'completed',
          output: JSON.stringify(output),
          duration,
          completedAt: new Date(),
        })
        .where(eq(executions.id, executionId))

      // Update metrics
      await this.recordMetrics(fn.id, {
        success: true,
        duration,
        coldStart,
      })

      return {
        id: executionId,
        output,
        status: 'completed',
        duration,
        coldStart,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isTimeout = duration >= (fn.timeout || 30000)

      // Update execution record
      await this.db
        .update(executions)
        .set({
          status: isTimeout ? 'timeout' : 'failed',
          error: errorMessage,
          duration,
          completedAt: new Date(),
        })
        .where(eq(executions.id, executionId))

      // Update metrics
      await this.recordMetrics(fn.id, {
        success: false,
        timeout: isTimeout,
        duration,
        coldStart,
      })

      return {
        id: executionId,
        error: errorMessage,
        status: isTimeout ? 'timeout' : 'failed',
        duration,
        coldStart,
      }
    }
  }

  /**
   * Execute function asynchronously (fire and forget)
   */
  async invokeAsync(name: string, input?: unknown): Promise<{ executionId: string }> {
    const fn = await this.get(name)
    if (!fn) throw new Error(`Function not found: ${name}`)

    const executionId = generateId()

    await this.db.insert(executions).values({
      id: executionId,
      functionId: fn.id,
      functionVersion: fn.version,
      input: input ? JSON.stringify(input) : undefined,
      status: 'pending',
    })

    // Schedule execution via alarm or queue
    // In production, this would use ctx.storage.setAlarm or a queue
    this.ctx.waitUntil(
      this.invoke(name, input).catch((err) => {
        console.error(`Async execution failed: ${err}`)
      })
    )

    return { executionId }
  }

  /**
   * Get execution status
   */
  async status(executionId: string): Promise<ExecutionRecord | undefined> {
    return this.db.select().from(executions).where(eq(executions.id, executionId)).get()
  }

  /**
   * List recent executions
   */
  async executions(
    name: string,
    params?: { status?: string; limit?: number; from?: Date; to?: Date }
  ): Promise<ExecutionRecord[]> {
    const fn = await this.get(name)
    if (!fn) throw new Error(`Function not found: ${name}`)

    const conditions = [eq(executions.functionId, fn.id)]

    if (params?.status) {
      conditions.push(eq(executions.status, params.status))
    }
    if (params?.from) {
      conditions.push(gte(executions.createdAt, params.from))
    }
    if (params?.to) {
      conditions.push(lte(executions.createdAt, params.to))
    }

    return this.db
      .select()
      .from(executions)
      .where(and(...conditions))
      .orderBy(desc(executions.createdAt))
      .limit(params?.limit || 100)
      .all()
  }

  // ============================================
  // Logging
  // ============================================

  /**
   * Add a log entry for an execution
   */
  async log(
    executionId: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: unknown
  ): Promise<void> {
    const execution = await this.status(executionId)
    if (!execution) throw new Error(`Execution not found: ${executionId}`)

    await this.db.insert(logs).values({
      id: generateId(),
      executionId,
      functionId: execution.functionId,
      level,
      message,
      data: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * Get logs for a function
   */
  async logs(
    name: string,
    params?: { level?: string; limit?: number; from?: Date; executionId?: string }
  ): Promise<LogRecord[]> {
    const fn = await this.get(name)
    if (!fn) throw new Error(`Function not found: ${name}`)

    const conditions = [eq(logs.functionId, fn.id)]

    if (params?.level) {
      conditions.push(eq(logs.level, params.level))
    }
    if (params?.from) {
      conditions.push(gte(logs.timestamp, params.from))
    }
    if (params?.executionId) {
      conditions.push(eq(logs.executionId, params.executionId))
    }

    return this.db
      .select()
      .from(logs)
      .where(and(...conditions))
      .orderBy(desc(logs.timestamp))
      .limit(params?.limit || 100)
      .all()
  }

  // ============================================
  // Rate Limiting
  // ============================================

  /**
   * Configure rate limit for a function
   */
  setRateLimit(name: string, config: RateLimitConfig): void {
    this.rateLimitConfigs.set(name, config)
  }

  /**
   * Check if request is within rate limit
   */
  private async checkRateLimit(functionId: string, key: string): Promise<boolean> {
    const fn = await this.db.select().from(functions).where(eq(functions.id, functionId)).get()
    if (!fn) return true

    const config = this.rateLimitConfigs.get(fn.name) || this.defaultRateLimit
    const windowStart = new Date(Date.now() - config.windowMs)

    // Get or create rate limit record
    const existing = await this.db
      .select()
      .from(rateLimits)
      .where(and(eq(rateLimits.functionId, functionId), eq(rateLimits.key, key)))
      .get()

    if (!existing) {
      await this.db.insert(rateLimits).values({
        id: generateId(),
        functionId,
        key,
        windowStart: new Date(),
        count: 1,
      })
      return true
    }

    // Check if window has expired
    if (existing.windowStart < windowStart) {
      await this.db
        .update(rateLimits)
        .set({ windowStart: new Date(), count: 1 })
        .where(eq(rateLimits.id, existing.id))
      return true
    }

    // Check if within limit
    if (existing.count >= config.maxRequests) {
      return false
    }

    // Increment counter
    await this.db
      .update(rateLimits)
      .set({ count: existing.count + 1 })
      .where(eq(rateLimits.id, existing.id))

    return true
  }

  // ============================================
  // Cold Start Optimization
  // ============================================

  /**
   * Pre-warm function instances
   */
  async prewarm(name: string, count: number = 1): Promise<void> {
    const fn = await this.get(name)
    if (!fn) throw new Error(`Function not found: ${name}`)

    for (let i = 0; i < count; i++) {
      await this.db.insert(warmInstances).values({
        id: generateId(),
        functionId: fn.id,
        instanceId: generateId(),
        status: 'warm',
      })
    }

    // In production, this would actually spin up isolates
  }

  /**
   * Check if this will be a cold start
   */
  private async isColdStart(functionId: string): Promise<boolean> {
    const warm = await this.db
      .select()
      .from(warmInstances)
      .where(and(eq(warmInstances.functionId, functionId), eq(warmInstances.status, 'warm')))
      .get()

    if (warm) {
      // Mark as busy
      await this.db.update(warmInstances).set({ status: 'busy' }).where(eq(warmInstances.id, warm.id))
      return false
    }

    return true
  }

  /**
   * Release a warm instance back to the pool
   */
  async releaseInstance(instanceId: string): Promise<void> {
    await this.db
      .update(warmInstances)
      .set({ status: 'warm', lastUsed: new Date() })
      .where(eq(warmInstances.instanceId, instanceId))
  }

  /**
   * Clean up expired warm instances
   */
  async cleanupWarmInstances(maxAge: number = 300000): Promise<void> {
    const cutoff = new Date(Date.now() - maxAge)

    await this.db.delete(warmInstances).where(lte(warmInstances.lastUsed, cutoff))
  }

  // ============================================
  // Metrics
  // ============================================

  /**
   * Record metrics for an execution
   */
  private async recordMetrics(
    functionId: string,
    data: { success: boolean; timeout?: boolean; duration: number; coldStart: boolean }
  ): Promise<void> {
    const dateKey = today()

    const existing = await this.db
      .select()
      .from(metrics)
      .where(and(eq(metrics.functionId, functionId), eq(metrics.date, dateKey)))
      .get()

    if (existing) {
      await this.db
        .update(metrics)
        .set({
          invocations: existing.invocations + 1,
          successes: existing.successes + (data.success ? 1 : 0),
          failures: existing.failures + (!data.success && !data.timeout ? 1 : 0),
          timeouts: existing.timeouts + (data.timeout ? 1 : 0),
          coldStarts: existing.coldStarts + (data.coldStart ? 1 : 0),
          totalDuration: existing.totalDuration + data.duration,
        })
        .where(eq(metrics.id, existing.id))
    } else {
      await this.db.insert(metrics).values({
        id: generateId(),
        functionId,
        date: dateKey,
        invocations: 1,
        successes: data.success ? 1 : 0,
        failures: !data.success && !data.timeout ? 1 : 0,
        timeouts: data.timeout ? 1 : 0,
        coldStarts: data.coldStart ? 1 : 0,
        totalDuration: data.duration,
      })
    }
  }

  /**
   * Get metrics for a function
   */
  async metrics(
    name: string,
    params?: { from?: Date; to?: Date }
  ): Promise<FunctionMetrics> {
    const fn = await this.get(name)
    if (!fn) throw new Error(`Function not found: ${name}`)

    const conditions = [eq(metrics.functionId, fn.id)]

    if (params?.from) {
      conditions.push(gte(metrics.date, params.from.toISOString().split('T')[0]))
    }
    if (params?.to) {
      conditions.push(lte(metrics.date, params.to.toISOString().split('T')[0]))
    }

    const rows = await this.db
      .select()
      .from(metrics)
      .where(and(...conditions))
      .all()

    if (rows.length === 0) {
      return {
        invocations: 0,
        successRate: 0,
        avgDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        coldStartRate: 0,
      }
    }

    const totals = rows.reduce(
      (acc, row) => ({
        invocations: acc.invocations + row.invocations,
        successes: acc.successes + row.successes,
        coldStarts: acc.coldStarts + row.coldStarts,
        totalDuration: acc.totalDuration + row.totalDuration,
      }),
      { invocations: 0, successes: 0, coldStarts: 0, totalDuration: 0 }
    )

    // Get percentiles from executions
    const recentExecutions = await this.db
      .select({ duration: executions.duration })
      .from(executions)
      .where(eq(executions.functionId, fn.id))
      .orderBy(executions.duration)
      .limit(1000)
      .all()

    const durations = recentExecutions.filter((e) => e.duration != null).map((e) => e.duration!)
    const p50 = durations[Math.floor(durations.length * 0.5)] || 0
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0

    return {
      invocations: totals.invocations,
      successRate: totals.invocations > 0 ? (totals.successes / totals.invocations) * 100 : 0,
      avgDuration: totals.invocations > 0 ? totals.totalDuration / totals.invocations : 0,
      p50Duration: p50,
      p95Duration: p95,
      p99Duration: p99,
      coldStartRate: totals.invocations > 0 ? (totals.coldStarts / totals.invocations) * 100 : 0,
    }
  }

  /**
   * Get daily metrics breakdown
   */
  async dailyMetrics(
    name: string,
    params?: { from?: Date; to?: Date }
  ): Promise<MetricsRecord[]> {
    const fn = await this.get(name)
    if (!fn) throw new Error(`Function not found: ${name}`)

    const conditions = [eq(metrics.functionId, fn.id)]

    if (params?.from) {
      conditions.push(gte(metrics.date, params.from.toISOString().split('T')[0]))
    }
    if (params?.to) {
      conditions.push(lte(metrics.date, params.to.toISOString().split('T')[0]))
    }

    return this.db
      .select()
      .from(metrics)
      .where(and(...conditions))
      .orderBy(desc(metrics.date))
      .all()
  }

  // ============================================
  // Code Execution (Integration Point)
  // ============================================

  /**
   * Execute function code - override this for custom runtimes
   */
  protected async executeCode<T>(fn: FunctionRecord, input: unknown): Promise<T> {
    // Default implementation uses eval (for v8 runtime)
    // In production, this would integrate with your actual execution runtime
    // such as Cloudflare Workers, containers, or other isolates

    // For now, we'll use a simple Function constructor approach
    // WARNING: This is for demonstration - use proper sandboxing in production

    const env = fn.env ? JSON.parse(fn.env) : {}

    // Create a sandboxed context
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    const handler = new AsyncFunction(
      'input',
      'env',
      `
      ${fn.code}
      if (typeof exports !== 'undefined' && exports.default) {
        return exports.default(input, env)
      }
      throw new Error('Function must export a default handler')
    `
    )

    return handler(input, env) as T
  }
}

export { Function as DO }
export default Function
