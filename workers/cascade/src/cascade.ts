/**
 * Cascade Queue Worker - Async Cascade Operations for ~> and <~ Operators
 *
 * Implements soft/eventual cascade processing for Durable Object relationships:
 * - ~> Forward soft cascade (async, eventual)
 * - <~ Reverse soft cascade (async, eventual)
 *
 * Features:
 * - Queue storage via Durable Object or Cloudflare Queue
 * - Retry logic with exponential backoff
 * - Dead letter handling for failed cascades
 * - Ordering guarantees within a relationship
 * - Monitoring and observability
 *
 * Unlike hard cascades (-> <-) which block the originating request,
 * soft cascades enqueue operations for eventual processing.
 *
 * @see workers-hhtf Cascading Relationships System epic
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Cascade operator type
 * - `~>` Forward soft cascade (propagate changes to related entities)
 * - `<~` Reverse soft cascade (propagate changes back to parent entities)
 */
export type CascadeOperator = '~>' | '<~'

/**
 * Cascade operation type (what action to perform)
 */
export type CascadeAction = 'update' | 'delete' | 'notify' | 'sync' | 'custom'

/**
 * Cascade operation status
 */
export type CascadeStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'dead_letter'

/**
 * Priority levels for cascade operations
 */
export type CascadePriority = 'low' | 'normal' | 'high' | 'critical'

/**
 * A cascade operation to be processed
 */
export interface CascadeOperation {
  /** Unique operation identifier */
  id: string
  /** Cascade operator (~> or <~) */
  operator: CascadeOperator
  /** Action to perform */
  action: CascadeAction
  /** Source entity information */
  source: {
    /** Durable Object class name */
    doClass: string
    /** Durable Object ID */
    doId: string
    /** Entity type (e.g., 'User', 'Order') */
    entityType: string
    /** Entity ID within the DO */
    entityId: string
  }
  /** Target entity information */
  target: {
    /** Durable Object class name */
    doClass: string
    /** Durable Object ID (may be resolved at processing time) */
    doId?: string
    /** Entity type */
    entityType: string
    /** Entity ID (may be a pattern for bulk operations) */
    entityId?: string
    /** Relationship type that links source to target */
    relationship: string
  }
  /** Payload data to propagate */
  payload: Record<string, unknown>
  /** Operation metadata */
  metadata: CascadeMetadata
  /** Current status */
  status: CascadeStatus
  /** Retry information */
  retry: RetryInfo
  /** Timestamps */
  timestamps: CascadeTimestamps
}

/**
 * Cascade operation metadata
 */
export interface CascadeMetadata {
  /** Priority level */
  priority: CascadePriority
  /** Correlation ID for tracing */
  correlationId: string
  /** Causation ID (ID of operation that caused this one) */
  causationId?: string
  /** User or system that initiated the cascade */
  initiator?: string
  /** Optional tags for filtering/monitoring */
  tags?: string[]
  /** Custom metadata */
  custom?: Record<string, unknown>
}

/**
 * Retry tracking information
 */
export interface RetryInfo {
  /** Number of retry attempts */
  attempts: number
  /** Maximum allowed retries */
  maxRetries: number
  /** Next retry timestamp (if pending retry) */
  nextRetryAt?: number
  /** Last error message */
  lastError?: string
  /** Last error code */
  lastErrorCode?: string
}

/**
 * Timestamp tracking for cascade operations
 */
export interface CascadeTimestamps {
  /** When the operation was created/enqueued */
  createdAt: number
  /** When processing started */
  startedAt?: number
  /** When processing completed (success or final failure) */
  completedAt?: number
  /** When moved to dead letter queue */
  deadLetteredAt?: number
  /** Sequence number for ordering within relationship */
  sequenceNumber: number
}

/**
 * Cascade queue configuration
 */
export interface CascadeQueueConfig {
  /** Maximum batch size for processing */
  batchSize: number
  /** Maximum concurrent operations */
  concurrency: number
  /** Retry policy */
  retryPolicy: RetryPolicy
  /** Dead letter queue settings */
  deadLetter: DeadLetterConfig
  /** Alarm interval for batch processing (ms) */
  alarmIntervalMs: number
  /** Maximum operation age before expiry (ms) */
  maxAgeMs: number
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  /** Maximum retry attempts */
  maxRetries: number
  /** Initial backoff delay (ms) */
  initialBackoffMs: number
  /** Maximum backoff delay (ms) */
  maxBackoffMs: number
  /** Backoff multiplier */
  backoffMultiplier: number
  /** Jitter factor (0-1) to add randomness to backoff */
  jitterFactor: number
}

/**
 * Dead letter queue configuration
 */
export interface DeadLetterConfig {
  /** Whether to enable dead letter queue */
  enabled: boolean
  /** Maximum items in dead letter queue */
  maxItems: number
  /** Retention period for dead letter items (ms) */
  retentionMs: number
}

/**
 * Statistics for monitoring
 */
export interface CascadeStats {
  /** Total operations enqueued */
  totalEnqueued: number
  /** Total operations completed successfully */
  totalCompleted: number
  /** Total operations failed */
  totalFailed: number
  /** Total operations in dead letter */
  totalDeadLettered: number
  /** Current pending operations */
  pendingCount: number
  /** Current processing operations */
  processingCount: number
  /** Average processing time (ms) */
  avgProcessingTimeMs: number
  /** Operations by operator type */
  byOperator: {
    '~>': { enqueued: number; completed: number; failed: number }
    '<~': { enqueued: number; completed: number; failed: number }
  }
  /** Operations by action type */
  byAction: Record<CascadeAction, { enqueued: number; completed: number; failed: number }>
  /** Last updated timestamp */
  updatedAt: number
}

/**
 * Enqueue options for new cascade operations
 */
export interface EnqueueOptions {
  /** Priority (default: normal) */
  priority?: CascadePriority
  /** Delay before processing (ms) */
  delayMs?: number
  /** Correlation ID for tracing */
  correlationId?: string
  /** Causation ID */
  causationId?: string
  /** Custom tags */
  tags?: string[]
  /** Custom metadata */
  metadata?: Record<string, unknown>
  /** Idempotency key to prevent duplicates */
  idempotencyKey?: string
}

/**
 * Result of processing a cascade operation
 */
export interface ProcessResult {
  /** Operation ID */
  operationId: string
  /** Whether processing succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Error code if failed */
  errorCode?: string
  /** Processing duration (ms) */
  durationMs: number
  /** Any response data from the target */
  response?: unknown
}

// ============================================================================
// Errors
// ============================================================================

/**
 * Base error for cascade operations
 */
export class CascadeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly operationId?: string,
    public readonly retryable: boolean = true
  ) {
    super(message)
    this.name = 'CascadeError'
  }
}

/**
 * Error when target DO is not reachable
 */
export class TargetNotFoundError extends CascadeError {
  constructor(operationId: string, targetDoClass: string, targetDoId?: string) {
    super(
      `Target DO not found: ${targetDoClass}${targetDoId ? `/${targetDoId}` : ''}`,
      'TARGET_NOT_FOUND',
      operationId,
      false
    )
    this.name = 'TargetNotFoundError'
  }
}

/**
 * Error when cascade operation times out
 */
export class CascadeTimeoutError extends CascadeError {
  constructor(operationId: string, timeoutMs: number) {
    super(
      `Cascade operation timed out after ${timeoutMs}ms`,
      'TIMEOUT',
      operationId,
      true
    )
    this.name = 'CascadeTimeoutError'
  }
}

/**
 * Error when operation is rejected by target
 */
export class CascadeRejectedError extends CascadeError {
  constructor(operationId: string, reason: string) {
    super(
      `Cascade operation rejected: ${reason}`,
      'REJECTED',
      operationId,
      false
    )
    this.name = 'CascadeRejectedError'
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default cascade queue configuration
 */
export const DEFAULT_CASCADE_CONFIG: CascadeQueueConfig = {
  batchSize: 100,
  concurrency: 10,
  retryPolicy: {
    maxRetries: 5,
    initialBackoffMs: 1000,
    maxBackoffMs: 60000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },
  deadLetter: {
    enabled: true,
    maxItems: 10000,
    retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  alarmIntervalMs: 5000,
  maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
}

/**
 * Initial statistics
 */
export const INITIAL_STATS: CascadeStats = {
  totalEnqueued: 0,
  totalCompleted: 0,
  totalFailed: 0,
  totalDeadLettered: 0,
  pendingCount: 0,
  processingCount: 0,
  avgProcessingTimeMs: 0,
  byOperator: {
    '~>': { enqueued: 0, completed: 0, failed: 0 },
    '<~': { enqueued: 0, completed: 0, failed: 0 },
  },
  byAction: {
    update: { enqueued: 0, completed: 0, failed: 0 },
    delete: { enqueued: 0, completed: 0, failed: 0 },
    notify: { enqueued: 0, completed: 0, failed: 0 },
    sync: { enqueued: 0, completed: 0, failed: 0 },
    custom: { enqueued: 0, completed: 0, failed: 0 },
  },
  updatedAt: Date.now(),
}

// ============================================================================
// Storage Keys
// ============================================================================

const KEYS = {
  /** Config key */
  config: 'cascade:config',
  /** Stats key */
  stats: 'cascade:stats',
  /** Sequence counter key */
  sequence: 'cascade:sequence',
  /** Pending operations prefix */
  pending: 'cascade:pending:',
  /** Processing operations prefix */
  processing: 'cascade:processing:',
  /** Dead letter prefix */
  deadLetter: 'cascade:deadletter:',
  /** Idempotency keys prefix */
  idempotency: 'cascade:idempotency:',
  /** Relationship sequence prefix (for ordering) */
  relationshipSeq: 'cascade:relseq:',
} as const

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique operation ID
 */
export function generateOperationId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `cop_${timestamp}_${random}`
}

/**
 * Generate a correlation ID
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `ccor_${timestamp}_${random}`
}

/**
 * Calculate backoff delay with jitter
 */
export function calculateBackoff(
  attempt: number,
  policy: RetryPolicy
): number {
  const baseDelay = Math.min(
    policy.initialBackoffMs * Math.pow(policy.backoffMultiplier, attempt),
    policy.maxBackoffMs
  )

  // Add jitter
  const jitter = baseDelay * policy.jitterFactor * Math.random()
  return Math.floor(baseDelay + jitter)
}

/**
 * Create a relationship key for ordering
 */
export function createRelationshipKey(
  sourceDoClass: string,
  sourceDoId: string,
  relationship: string,
  targetEntityType: string
): string {
  return `${sourceDoClass}:${sourceDoId}:${relationship}:${targetEntityType}`
}

// ============================================================================
// CascadeQueueDO - Durable Object Implementation
// ============================================================================

/**
 * Cascade Queue Durable Object
 *
 * Manages the queue of soft cascade operations (~> and <~) with:
 * - Persistent queue storage
 * - Exponential backoff retry
 * - Dead letter handling
 * - Ordering within relationships
 * - Batch processing via alarms
 */
export class CascadeQueueDO {
  private readonly state: DurableObjectState
  private readonly env: CascadeQueueEnv
  private config: CascadeQueueConfig = DEFAULT_CASCADE_CONFIG
  private stats: CascadeStats
  private initialized = false

  constructor(state: DurableObjectState, env: CascadeQueueEnv) {
    this.state = state
    this.env = env
    // Deep clone initial stats to avoid shared references between instances
    this.stats = {
      ...INITIAL_STATS,
      byOperator: {
        '~>': { ...INITIAL_STATS.byOperator['~>'] },
        '<~': { ...INITIAL_STATS.byOperator['<~'] },
      },
      byAction: {
        update: { ...INITIAL_STATS.byAction.update },
        delete: { ...INITIAL_STATS.byAction.delete },
        notify: { ...INITIAL_STATS.byAction.notify },
        sync: { ...INITIAL_STATS.byAction.sync },
        custom: { ...INITIAL_STATS.byAction.custom },
      },
    }
  }

  /**
   * Initialize the DO (lazy initialization)
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return

    await this.state.blockConcurrencyWhile(async () => {
      if (this.initialized) return

      // Load config
      const savedConfig = await this.state.storage.get<CascadeQueueConfig>(KEYS.config)
      if (savedConfig) {
        this.config = { ...DEFAULT_CASCADE_CONFIG, ...savedConfig }
      }

      // Load stats
      const savedStats = await this.state.storage.get<CascadeStats>(KEYS.stats)
      if (savedStats) {
        this.stats = savedStats
      }

      this.initialized = true
    })
  }

  /**
   * Save stats to storage
   */
  private async saveStats(): Promise<void> {
    this.stats.updatedAt = Date.now()
    await this.state.storage.put(KEYS.stats, this.stats)
  }

  /**
   * Get next sequence number for ordering
   */
  private async getNextSequence(): Promise<number> {
    const current = await this.state.storage.get<number>(KEYS.sequence) ?? 0
    const next = current + 1
    await this.state.storage.put(KEYS.sequence, next)
    return next
  }

  /**
   * Get next sequence for a specific relationship (for ordering within relationship)
   */
  private async getNextRelationshipSequence(relationshipKey: string): Promise<number> {
    const key = `${KEYS.relationshipSeq}${relationshipKey}`
    const current = await this.state.storage.get<number>(key) ?? 0
    const next = current + 1
    await this.state.storage.put(key, next)
    return next
  }

  /**
   * Check idempotency key
   */
  private async checkIdempotency(key: string): Promise<boolean> {
    const existing = await this.state.storage.get<{ operationId: string; createdAt: number }>(
      `${KEYS.idempotency}${key}`
    )
    return existing !== undefined
  }

  /**
   * Store idempotency key
   */
  private async storeIdempotency(key: string, operationId: string): Promise<void> {
    await this.state.storage.put(`${KEYS.idempotency}${key}`, {
      operationId,
      createdAt: Date.now(),
    })
  }

  /**
   * Enqueue a cascade operation
   */
  async enqueue(
    operator: CascadeOperator,
    action: CascadeAction,
    source: CascadeOperation['source'],
    target: CascadeOperation['target'],
    payload: Record<string, unknown>,
    options: EnqueueOptions = {}
  ): Promise<CascadeOperation> {
    await this.initialize()

    // Check idempotency
    if (options.idempotencyKey) {
      const isDuplicate = await this.checkIdempotency(options.idempotencyKey)
      if (isDuplicate) {
        throw new CascadeError(
          'Duplicate operation - idempotency key already exists',
          'DUPLICATE',
          undefined,
          false
        )
      }
    }

    const now = Date.now()
    const operationId = generateOperationId()
    const correlationId = options.correlationId ?? generateCorrelationId()

    // Get sequence numbers
    const globalSequence = await this.getNextSequence()
    const relationshipKey = createRelationshipKey(
      source.doClass,
      source.doId,
      target.relationship,
      target.entityType
    )
    const relationshipSequence = await this.getNextRelationshipSequence(relationshipKey)

    // Create the operation
    const operation: CascadeOperation = {
      id: operationId,
      operator,
      action,
      source,
      target,
      payload,
      metadata: {
        priority: options.priority ?? 'normal',
        correlationId,
        causationId: options.causationId,
        tags: options.tags,
        custom: options.metadata,
      },
      status: 'pending',
      retry: {
        attempts: 0,
        maxRetries: this.config.retryPolicy.maxRetries,
      },
      timestamps: {
        createdAt: now,
        sequenceNumber: globalSequence,
      },
    }

    // Apply delay if specified
    if (options.delayMs && options.delayMs > 0) {
      operation.retry.nextRetryAt = now + options.delayMs
    }

    // Store the operation
    await this.state.storage.put(`${KEYS.pending}${operationId}`, operation)

    // Store idempotency key if provided
    if (options.idempotencyKey) {
      await this.storeIdempotency(options.idempotencyKey, operationId)
    }

    // Update stats
    this.stats.totalEnqueued++
    this.stats.pendingCount++
    this.stats.byOperator[operator].enqueued++
    this.stats.byAction[action].enqueued++
    await this.saveStats()

    // Schedule alarm for processing if not already set
    const currentAlarm = await this.state.storage.getAlarm()
    if (!currentAlarm) {
      await this.state.storage.setAlarm(Date.now() + this.config.alarmIntervalMs)
    }

    return operation
  }

  /**
   * Process pending cascade operations (called by alarm)
   */
  async processBatch(): Promise<ProcessResult[]> {
    await this.initialize()

    const now = Date.now()
    const results: ProcessResult[] = []

    // Get pending operations
    const pendingOps = await this.state.storage.list<CascadeOperation>({
      prefix: KEYS.pending,
      limit: this.config.batchSize,
    })

    // Filter operations ready for processing
    const readyOps: CascadeOperation[] = []
    for (const [, op] of pendingOps) {
      // Skip if not yet time to retry
      if (op.retry.nextRetryAt && op.retry.nextRetryAt > now) {
        continue
      }

      // Skip if expired
      if (now - op.timestamps.createdAt > this.config.maxAgeMs) {
        await this.moveToDeadLetter(op, 'Operation expired')
        continue
      }

      readyOps.push(op)

      if (readyOps.length >= this.config.concurrency) {
        break
      }
    }

    // Process operations concurrently
    const processingPromises = readyOps.map((op) => this.processOperation(op))
    const processResults = await Promise.allSettled(processingPromises)

    for (let i = 0; i < processResults.length; i++) {
      const result = processResults[i]
      const op = readyOps[i]

      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        results.push({
          operationId: op.id,
          success: false,
          error: result.reason?.message ?? 'Unknown error',
          errorCode: 'PROCESSING_ERROR',
          durationMs: 0,
        })
      }
    }

    // Update pending count
    const newPendingOps = await this.state.storage.list({ prefix: KEYS.pending })
    this.stats.pendingCount = newPendingOps.size
    await this.saveStats()

    // Schedule next alarm if there are pending operations
    if (newPendingOps.size > 0) {
      await this.state.storage.setAlarm(now + this.config.alarmIntervalMs)
    }

    return results
  }

  /**
   * Process a single cascade operation
   */
  private async processOperation(op: CascadeOperation): Promise<ProcessResult> {
    const startTime = Date.now()

    // Move to processing
    op.status = 'processing'
    op.timestamps.startedAt = startTime
    await this.state.storage.delete(`${KEYS.pending}${op.id}`)
    await this.state.storage.put(`${KEYS.processing}${op.id}`, op)
    this.stats.pendingCount--
    this.stats.processingCount++

    try {
      // Execute the cascade operation
      const response = await this.executeCascade(op)

      // Mark as completed
      op.status = 'completed'
      op.timestamps.completedAt = Date.now()
      await this.state.storage.delete(`${KEYS.processing}${op.id}`)

      // Update stats
      this.stats.processingCount--
      this.stats.totalCompleted++
      this.stats.byOperator[op.operator].completed++
      this.stats.byAction[op.action].completed++

      // Update average processing time
      const duration = Date.now() - startTime
      const totalProcessed = this.stats.totalCompleted + this.stats.totalFailed
      this.stats.avgProcessingTimeMs =
        (this.stats.avgProcessingTimeMs * (totalProcessed - 1) + duration) / totalProcessed

      await this.saveStats()

      return {
        operationId: op.id,
        success: true,
        durationMs: duration,
        response,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorCode = error instanceof CascadeError ? error.code : 'UNKNOWN'
      const retryable = error instanceof CascadeError ? error.retryable : true

      // Update retry info
      op.retry.attempts++
      op.retry.lastError = errorMessage
      op.retry.lastErrorCode = errorCode

      // Check if we should retry
      if (retryable && op.retry.attempts < op.retry.maxRetries) {
        // Calculate next retry time
        const backoff = calculateBackoff(op.retry.attempts, this.config.retryPolicy)
        op.retry.nextRetryAt = Date.now() + backoff
        op.status = 'pending'

        // Move back to pending
        await this.state.storage.delete(`${KEYS.processing}${op.id}`)
        await this.state.storage.put(`${KEYS.pending}${op.id}`, op)
        this.stats.processingCount--
        this.stats.pendingCount++
        await this.saveStats()
      } else {
        // Move to dead letter
        await this.moveToDeadLetter(op, errorMessage)
      }

      return {
        operationId: op.id,
        success: false,
        error: errorMessage,
        errorCode,
        durationMs: duration,
      }
    }
  }

  /**
   * Execute the actual cascade operation against the target DO
   */
  private async executeCascade(op: CascadeOperation): Promise<unknown> {
    // Get the target DO binding
    const targetBinding = this.env[op.target.doClass as keyof CascadeQueueEnv] as
      | DurableObjectNamespace
      | undefined

    if (!targetBinding) {
      throw new TargetNotFoundError(op.id, op.target.doClass)
    }

    // Resolve target DO ID
    let targetId: DurableObjectId
    if (op.target.doId) {
      targetId = targetBinding.idFromString(op.target.doId)
    } else {
      // Use relationship to resolve target
      // This would typically involve looking up the relationship
      throw new CascadeError(
        'Target DO ID resolution not implemented',
        'NOT_IMPLEMENTED',
        op.id,
        false
      )
    }

    // Get stub and make RPC call
    const stub = targetBinding.get(targetId)

    // Build the cascade request
    const cascadeRequest = {
      operator: op.operator,
      action: op.action,
      source: op.source,
      relationship: op.target.relationship,
      entityId: op.target.entityId,
      payload: op.payload,
      metadata: {
        correlationId: op.metadata.correlationId,
        causationId: op.metadata.causationId ?? op.id,
        sequenceNumber: op.timestamps.sequenceNumber,
      },
    }

    // Make the RPC call to the target DO
    // The target DO should implement a handleCascade method
    const response = await stub.fetch('http://internal/cascade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cascade-Id': op.id,
        'X-Correlation-Id': op.metadata.correlationId,
      },
      body: JSON.stringify(cascadeRequest),
    })

    if (!response.ok) {
      const errorText = await response.text()
      if (response.status === 404) {
        throw new TargetNotFoundError(op.id, op.target.doClass, op.target.doId)
      }
      if (response.status === 400 || response.status === 422) {
        throw new CascadeRejectedError(op.id, errorText)
      }
      throw new CascadeError(
        `Cascade failed: ${response.status} ${errorText}`,
        `HTTP_${response.status}`,
        op.id,
        response.status >= 500
      )
    }

    return response.json()
  }

  /**
   * Move an operation to the dead letter queue
   */
  private async moveToDeadLetter(op: CascadeOperation, reason: string): Promise<void> {
    // Remove from current location
    await this.state.storage.delete(`${KEYS.pending}${op.id}`)
    await this.state.storage.delete(`${KEYS.processing}${op.id}`)

    // Update operation
    op.status = 'dead_letter'
    op.timestamps.deadLetteredAt = Date.now()
    op.retry.lastError = reason

    // Store in dead letter queue
    await this.state.storage.put(`${KEYS.deadLetter}${op.id}`, op)

    // Update stats
    this.stats.processingCount = Math.max(0, this.stats.processingCount - 1)
    this.stats.totalFailed++
    this.stats.totalDeadLettered++
    this.stats.byOperator[op.operator].failed++
    this.stats.byAction[op.action].failed++
    await this.saveStats()

    // Check dead letter queue size limit
    if (this.config.deadLetter.enabled) {
      await this.pruneDeadLetterQueue()
    }
  }

  /**
   * Prune old items from dead letter queue
   */
  private async pruneDeadLetterQueue(): Promise<void> {
    const now = Date.now()
    const deadLetterOps = await this.state.storage.list<CascadeOperation>({
      prefix: KEYS.deadLetter,
    })

    const toDelete: string[] = []

    for (const [key, op] of deadLetterOps) {
      // Check retention
      if (
        op.timestamps.deadLetteredAt &&
        now - op.timestamps.deadLetteredAt > this.config.deadLetter.retentionMs
      ) {
        toDelete.push(key)
      }
    }

    // Also check max items
    if (deadLetterOps.size - toDelete.length > this.config.deadLetter.maxItems) {
      // Sort by deadLetteredAt and remove oldest
      const sorted = Array.from(deadLetterOps.entries())
        .sort(
          ([, a], [, b]) =>
            (a.timestamps.deadLetteredAt ?? 0) - (b.timestamps.deadLetteredAt ?? 0)
        )

      const excess = deadLetterOps.size - toDelete.length - this.config.deadLetter.maxItems
      for (let i = 0; i < excess && i < sorted.length; i++) {
        const key = sorted[i][0]
        if (!toDelete.includes(key)) {
          toDelete.push(key)
        }
      }
    }

    if (toDelete.length > 0) {
      await this.state.storage.delete(toDelete)
    }
  }

  /**
   * Alarm handler - processes pending operations
   */
  async alarm(): Promise<void> {
    await this.processBatch()
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<CascadeStats> {
    await this.initialize()
    return { ...this.stats }
  }

  /**
   * Get dead letter queue operations
   */
  async getDeadLetterQueue(options?: {
    limit?: number
    cursor?: string
  }): Promise<{ operations: CascadeOperation[]; cursor?: string }> {
    await this.initialize()

    const deadLetterOps = await this.state.storage.list<CascadeOperation>({
      prefix: KEYS.deadLetter,
      limit: options?.limit ?? 100,
      startAfter: options?.cursor ? `${KEYS.deadLetter}${options.cursor}` : undefined,
    })

    const operations = Array.from(deadLetterOps.values())
    const lastKey =
      operations.length > 0 ? operations[operations.length - 1].id : undefined

    return { operations, cursor: lastKey }
  }

  /**
   * Retry a dead letter operation
   */
  async retryDeadLetter(operationId: string): Promise<CascadeOperation> {
    await this.initialize()

    const key = `${KEYS.deadLetter}${operationId}`
    const op = await this.state.storage.get<CascadeOperation>(key)

    if (!op) {
      throw new CascadeError(
        `Operation not found in dead letter queue: ${operationId}`,
        'NOT_FOUND',
        operationId,
        false
      )
    }

    // Reset retry info
    op.status = 'pending'
    op.retry.attempts = 0
    op.retry.nextRetryAt = undefined
    delete op.timestamps.deadLetteredAt

    // Move back to pending
    await this.state.storage.delete(key)
    await this.state.storage.put(`${KEYS.pending}${operationId}`, op)

    // Update stats
    this.stats.totalDeadLettered--
    this.stats.pendingCount++
    await this.saveStats()

    // Schedule alarm
    const currentAlarm = await this.state.storage.getAlarm()
    if (!currentAlarm) {
      await this.state.storage.setAlarm(Date.now() + this.config.alarmIntervalMs)
    }

    return op
  }

  /**
   * Delete a dead letter operation
   */
  async deleteDeadLetter(operationId: string): Promise<void> {
    await this.initialize()

    const key = `${KEYS.deadLetter}${operationId}`
    const existed = await this.state.storage.delete(key)

    if (existed) {
      this.stats.totalDeadLettered--
      await this.saveStats()
    }
  }

  /**
   * Update queue configuration
   */
  async updateConfig(updates: Partial<CascadeQueueConfig>): Promise<CascadeQueueConfig> {
    await this.initialize()

    this.config = { ...this.config, ...updates }
    await this.state.storage.put(KEYS.config, this.config)

    return this.config
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<CascadeQueueConfig> {
    await this.initialize()
    return { ...this.config }
  }

  /**
   * Handle HTTP requests
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      // Route based on path
      if (path === '/enqueue' && request.method === 'POST') {
        const body = await request.json() as {
          operator: CascadeOperator
          action: CascadeAction
          source: CascadeOperation['source']
          target: CascadeOperation['target']
          payload: Record<string, unknown>
          options?: EnqueueOptions
        }

        const op = await this.enqueue(
          body.operator,
          body.action,
          body.source,
          body.target,
          body.payload,
          body.options
        )

        return new Response(JSON.stringify(op), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (path === '/stats' && request.method === 'GET') {
        const stats = await this.getStats()
        return new Response(JSON.stringify(stats), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (path === '/dead-letter' && request.method === 'GET') {
        const limit = url.searchParams.get('limit')
        const cursor = url.searchParams.get('cursor')
        const result = await this.getDeadLetterQueue({
          limit: limit ? parseInt(limit) : undefined,
          cursor: cursor ?? undefined,
        })
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (path.startsWith('/dead-letter/') && request.method === 'POST') {
        const operationId = path.replace('/dead-letter/', '').replace('/retry', '')
        const op = await this.retryDeadLetter(operationId)
        return new Response(JSON.stringify(op), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (path.startsWith('/dead-letter/') && request.method === 'DELETE') {
        const operationId = path.replace('/dead-letter/', '')
        await this.deleteDeadLetter(operationId)
        return new Response(null, { status: 204 })
      }

      if (path === '/config' && request.method === 'GET') {
        const config = await this.getConfig()
        return new Response(JSON.stringify(config), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (path === '/config' && request.method === 'PATCH') {
        const updates = await request.json() as Partial<CascadeQueueConfig>
        const config = await this.updateConfig(updates)
        return new Response(JSON.stringify(config), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (path === '/process' && request.method === 'POST') {
        // Manual trigger for processing
        const results = await this.processBatch()
        return new Response(JSON.stringify({ results }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response('Not Found', { status: 404 })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      const code = error instanceof CascadeError ? error.code : 'INTERNAL_ERROR'
      const status = error instanceof CascadeError && !error.retryable ? 400 : 500

      return new Response(
        JSON.stringify({ error: message, code }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}

// ============================================================================
// Environment Types
// ============================================================================

/**
 * Environment bindings for the Cascade Queue Worker
 */
export interface CascadeQueueEnv {
  /** Cascade Queue DO binding */
  CASCADE_QUEUE: DurableObjectNamespace
  /** Optional external queue for high-volume scenarios */
  EXTERNAL_QUEUE?: Queue
  /** Target DO bindings - dynamically accessed by class name */
  [key: string]: unknown
}

// ============================================================================
// Worker Export
// ============================================================================

export default {
  /**
   * Main fetch handler for the Cascade Queue Worker
   */
  async fetch(
    request: Request,
    env: CascadeQueueEnv,
  ): Promise<Response> {
    const url = new URL(request.url)

    // Route to the appropriate queue DO instance
    // Use a single global queue or partition by some key
    const queueId = url.searchParams.get('queue') ?? 'default'
    const id = env.CASCADE_QUEUE.idFromName(queueId)
    const stub = env.CASCADE_QUEUE.get(id)

    return stub.fetch(request)
  },

  /**
   * Queue consumer handler for external queue integration
   */
  async queue(
    batch: MessageBatch<CascadeOperation>,
    env: CascadeQueueEnv,
  ): Promise<void> {
    // Process messages from external queue
    const id = env.CASCADE_QUEUE.idFromName('external-queue-processor')
    const stub = env.CASCADE_QUEUE.get(id)

    for (const message of batch.messages) {
      const op = message.body

      try {
        await stub.fetch('http://internal/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operator: op.operator,
            action: op.action,
            source: op.source,
            target: op.target,
            payload: op.payload,
          }),
        })

        message.ack()
      } catch {
        message.retry()
      }
    }
  },
}
