/**
 * Saga Pattern for Cross-DO Transaction Support
 *
 * Implements the saga pattern for coordinating transactions across multiple
 * Durable Objects. This module provides:
 *
 * - Transaction Coordinator DO for orchestrating multi-DO operations
 * - Two-Phase Commit (2PC) protocol for hard cascades
 * - Compensation handlers for rollback
 * - Timeout and failure handling
 * - Distributed lock management
 *
 * Required for reliable -> and <- operations across DO boundaries.
 *
 * @module saga
 */

import type { DOState, DOEnv, DOStorage, SqlStorage } from './core.js'
import { DOCore } from './core.js'

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Unique transaction identifier
 */
export type TransactionId = string

/**
 * Unique participant identifier (typically DO ID)
 */
export type ParticipantId = string

/**
 * Transaction states in the saga lifecycle
 */
export enum TransactionState {
  /** Transaction initiated, preparing participants */
  Preparing = 'preparing',
  /** All participants prepared, ready to commit */
  Prepared = 'prepared',
  /** Transaction committing */
  Committing = 'committing',
  /** Transaction committed successfully */
  Committed = 'committed',
  /** Transaction aborting */
  Aborting = 'aborting',
  /** Transaction aborted, compensations applied */
  Aborted = 'aborted',
  /** Transaction failed */
  Failed = 'failed',
  /** Transaction timed out */
  TimedOut = 'timed_out',
}

/**
 * Participant states in the 2PC protocol
 */
export enum ParticipantState {
  /** Initial state */
  Initial = 'initial',
  /** Prepare phase started */
  Preparing = 'preparing',
  /** Prepared, ready to commit */
  Prepared = 'prepared',
  /** Prepare failed */
  PrepareFailed = 'prepare_failed',
  /** Committing */
  Committing = 'committing',
  /** Committed */
  Committed = 'committed',
  /** Commit failed */
  CommitFailed = 'commit_failed',
  /** Aborting */
  Aborting = 'aborting',
  /** Aborted */
  Aborted = 'aborted',
  /** Abort failed */
  AbortFailed = 'abort_failed',
}

/**
 * A step in the saga that operates on a participant DO
 */
export interface SagaStep<TInput = unknown, TOutput = unknown> {
  /** Unique step identifier */
  id: string
  /** Participant DO identifier */
  participantId: ParticipantId
  /** RPC method to call on the participant */
  method: string
  /** Parameters for the method */
  params?: TInput
  /** Compensation method to call on rollback */
  compensationMethod?: string
  /** Compensation parameters (defaults to step output) */
  compensationParams?: unknown
  /** Timeout for this step in milliseconds */
  timeout?: number
  /** Retry policy */
  retryPolicy?: RetryPolicy
  /** Dependencies - step IDs that must complete first */
  dependsOn?: string[]
  /** Expected output type (for validation) */
  expectedOutput?: TOutput
}

/**
 * Retry policy for saga steps
 */
export interface RetryPolicy {
  /** Maximum number of retry attempts */
  maxAttempts: number
  /** Base delay in milliseconds */
  baseDelayMs: number
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number
  /** Maximum delay in milliseconds */
  maxDelayMs?: number
  /** Jitter factor (0-1, default: 0.1) */
  jitter?: number
}

/**
 * Saga definition for a distributed transaction
 */
export interface SagaDefinition {
  /** Unique saga identifier */
  id: string
  /** Human-readable name */
  name?: string
  /** Saga steps in execution order */
  steps: SagaStep[]
  /** Global timeout for the entire saga (ms) */
  timeout?: number
  /** Global retry policy (can be overridden per step) */
  retryPolicy?: RetryPolicy
  /** Compensation execution strategy */
  compensationStrategy?: CompensationStrategy
  /** Metadata for tracing */
  metadata?: Record<string, unknown>
}

/**
 * Compensation execution strategies
 */
export enum CompensationStrategy {
  /** Execute compensations in reverse order of successful steps (default) */
  ReverseOrder = 'reverse_order',
  /** Execute all compensations in parallel */
  Parallel = 'parallel',
  /** Execute in dependency-aware order (respects step dependencies) */
  DependencyAware = 'dependency_aware',
}

/**
 * Result of a saga step execution
 */
export interface StepResult<T = unknown> {
  /** Step identifier */
  stepId: string
  /** Whether the step succeeded */
  success: boolean
  /** Step output data */
  data?: T
  /** Error if step failed */
  error?: StepError
  /** Execution duration in milliseconds */
  durationMs: number
  /** Timestamp when step started */
  startedAt: number
  /** Timestamp when step completed */
  completedAt: number
  /** Number of retry attempts */
  retryCount: number
}

/**
 * Step error information
 */
export interface StepError {
  /** Error code */
  code: string
  /** Human-readable message */
  message: string
  /** Whether this error is retryable */
  retryable: boolean
  /** Original error stack (if available) */
  stack?: string
  /** Additional context */
  context?: Record<string, unknown>
}

/**
 * Saga execution result
 */
export interface SagaResult {
  /** Transaction identifier */
  transactionId: TransactionId
  /** Final transaction state */
  state: TransactionState
  /** Whether the saga completed successfully */
  success: boolean
  /** Results for each step */
  stepResults: Map<string, StepResult>
  /** Error if saga failed */
  error?: string
  /** Total execution duration in milliseconds */
  totalDurationMs: number
  /** Timestamp when saga started */
  startedAt: number
  /** Timestamp when saga completed */
  completedAt: number
  /** Compensation results (if any) */
  compensationResults?: Map<string, StepResult>
}

/**
 * Participant interface that DOs must implement to participate in sagas
 */
export interface ISagaParticipant {
  /**
   * Prepare phase - validate and lock resources
   * @returns true if prepared successfully
   */
  sagaPrepare(transactionId: TransactionId, method: string, params: unknown): Promise<boolean>

  /**
   * Commit phase - apply the changes
   */
  sagaCommit(transactionId: TransactionId): Promise<void>

  /**
   * Abort phase - release locks and rollback
   */
  sagaAbort(transactionId: TransactionId): Promise<void>

  /**
   * Compensate - undo a committed operation
   * @param method The compensation method to call
   * @param params Parameters for compensation
   */
  sagaCompensate(transactionId: TransactionId, method: string, params: unknown): Promise<void>
}

/**
 * Distributed lock for coordinating access across DOs
 */
export interface DistributedLock {
  /** Lock identifier */
  lockId: string
  /** Resource being locked */
  resource: string
  /** Owner (transaction ID or participant ID) */
  owner: string
  /** When the lock was acquired */
  acquiredAt: number
  /** When the lock expires */
  expiresAt: number
  /** Lock mode */
  mode: LockMode
}

/**
 * Lock modes for distributed locks
 */
export enum LockMode {
  /** Exclusive lock - no other locks allowed */
  Exclusive = 'exclusive',
  /** Shared lock - multiple readers allowed */
  Shared = 'shared',
}

/**
 * Lock acquisition options
 */
export interface LockOptions {
  /** How long to wait for the lock (ms) */
  timeout?: number
  /** Lock duration (ms) */
  duration?: number
  /** Lock mode */
  mode?: LockMode
}

/**
 * Participant stub for calling remote DOs
 */
export interface ParticipantStub {
  /** Call an RPC method on the participant */
  call<TParams, TResult>(method: string, params?: TParams): Promise<TResult>
  /** Get participant ID */
  getId(): ParticipantId
}

/**
 * Transaction record stored by the coordinator
 */
export interface TransactionRecord {
  /** Transaction identifier */
  id: TransactionId
  /** Saga definition */
  saga: SagaDefinition
  /** Current transaction state */
  state: TransactionState
  /** Participant states */
  participantStates: Map<ParticipantId, ParticipantState>
  /** Step results */
  stepResults: Map<string, StepResult>
  /** When the transaction started */
  startedAt: number
  /** When the transaction completed */
  completedAt?: number
  /** Error message if failed */
  error?: string
  /** Whether compensation has been triggered */
  compensationTriggered: boolean
  /** Compensation results */
  compensationResults?: Map<string, StepResult>
}

// ============================================================================
// Schema
// ============================================================================

/**
 * SQL schema for the saga coordinator
 */
export const SAGA_SCHEMA_SQL = `
-- Transactions table
CREATE TABLE IF NOT EXISTS saga_transactions (
  id TEXT PRIMARY KEY,
  saga_definition TEXT NOT NULL,
  state TEXT NOT NULL,
  error TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  compensation_triggered INTEGER DEFAULT 0
);

-- Participants table
CREATE TABLE IF NOT EXISTS saga_participants (
  transaction_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  state TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (transaction_id, participant_id),
  FOREIGN KEY (transaction_id) REFERENCES saga_transactions(id)
);

-- Step results table
CREATE TABLE IF NOT EXISTS saga_step_results (
  transaction_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  success INTEGER NOT NULL,
  data TEXT,
  error TEXT,
  duration_ms INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  retry_count INTEGER DEFAULT 0,
  is_compensation INTEGER DEFAULT 0,
  PRIMARY KEY (transaction_id, step_id, is_compensation),
  FOREIGN KEY (transaction_id) REFERENCES saga_transactions(id)
);

-- Distributed locks table
CREATE TABLE IF NOT EXISTS saga_locks (
  lock_id TEXT PRIMARY KEY,
  resource TEXT NOT NULL,
  owner TEXT NOT NULL,
  mode TEXT NOT NULL,
  acquired_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Index for lock expiry cleanup
CREATE INDEX IF NOT EXISTS idx_saga_locks_expires ON saga_locks(expires_at);

-- Index for transaction lookups
CREATE INDEX IF NOT EXISTS idx_saga_transactions_state ON saga_transactions(state);
`

// ============================================================================
// Errors
// ============================================================================

/**
 * Error thrown when a saga step fails
 */
export class SagaStepError extends Error {
  readonly stepId: string
  readonly code: string
  readonly retryable: boolean

  constructor(stepId: string, code: string, message: string, retryable = false) {
    super(message)
    this.name = 'SagaStepError'
    this.stepId = stepId
    this.code = code
    this.retryable = retryable
  }
}

/**
 * Error thrown when a transaction times out
 */
export class SagaTimeoutError extends Error {
  readonly transactionId: TransactionId
  readonly stepId?: string

  constructor(transactionId: TransactionId, stepId?: string) {
    super(`Transaction ${transactionId} timed out${stepId ? ` at step ${stepId}` : ''}`)
    this.name = 'SagaTimeoutError'
    this.transactionId = transactionId
    this.stepId = stepId
  }
}

/**
 * Error thrown when a lock cannot be acquired
 */
export class LockAcquisitionError extends Error {
  readonly resource: string
  readonly owner: string

  constructor(resource: string, currentOwner: string) {
    super(`Failed to acquire lock on ${resource}, currently held by ${currentOwner}`)
    this.name = 'LockAcquisitionError'
    this.resource = resource
    this.owner = currentOwner
  }
}

/**
 * Error thrown when compensation fails
 */
export class CompensationError extends Error {
  readonly transactionId: TransactionId
  readonly failedSteps: string[]

  constructor(transactionId: TransactionId, failedSteps: string[]) {
    super(`Compensation failed for transaction ${transactionId}: steps ${failedSteps.join(', ')} failed`)
    this.name = 'CompensationError'
    this.transactionId = transactionId
    this.failedSteps = failedSteps
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique transaction ID
 */
export function generateTransactionId(): TransactionId {
  return `saga_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(
  attempt: number,
  policy: RetryPolicy
): number {
  const baseDelay = policy.baseDelayMs
  const multiplier = policy.backoffMultiplier ?? 2
  const maxDelay = policy.maxDelayMs ?? 30000
  const jitter = policy.jitter ?? 0.1

  // Exponential backoff
  let delay = baseDelay * Math.pow(multiplier, attempt)

  // Apply max delay cap
  delay = Math.min(delay, maxDelay)

  // Apply jitter
  const jitterAmount = delay * jitter * (Math.random() * 2 - 1)
  delay += jitterAmount

  return Math.max(0, Math.round(delay))
}

/**
 * Default retry policy
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 100,
  backoffMultiplier: 2,
  maxDelayMs: 5000,
  jitter: 0.1,
}

/**
 * Default step timeout (30 seconds)
 */
export const DEFAULT_STEP_TIMEOUT = 30000

/**
 * Default saga timeout (5 minutes)
 */
export const DEFAULT_SAGA_TIMEOUT = 300000

// ============================================================================
// Saga Executor
// ============================================================================

/**
 * Options for creating a saga executor
 */
export interface SagaExecutorOptions {
  /** SQL storage for persisting transaction state */
  sql: SqlStorage
  /** Function to resolve participant stubs by ID */
  resolveParticipant: (id: ParticipantId) => ParticipantStub
  /** Custom timestamp provider */
  timestampProvider?: () => number
}

/**
 * Saga Executor - Orchestrates saga execution
 *
 * Coordinates the execution of saga steps across multiple participant DOs,
 * handles failures with compensation, and manages distributed locks.
 */
export class SagaExecutor {
  private readonly sql: SqlStorage
  private readonly resolveParticipant: (id: ParticipantId) => ParticipantStub
  private readonly getTimestamp: () => number
  private schemaInitialized = false

  constructor(options: SagaExecutorOptions) {
    this.sql = options.sql
    this.resolveParticipant = options.resolveParticipant
    this.getTimestamp = options.timestampProvider ?? (() => Date.now())
  }

  /**
   * Initialize schema if needed
   */
  private ensureSchema(): void {
    if (this.schemaInitialized) return
    this.sql.exec(SAGA_SCHEMA_SQL)
    this.schemaInitialized = true
  }

  /**
   * Execute a saga transaction
   */
  async execute(saga: SagaDefinition): Promise<SagaResult> {
    this.ensureSchema()

    const transactionId = generateTransactionId()
    const startedAt = this.getTimestamp()
    const timeout = saga.timeout ?? DEFAULT_SAGA_TIMEOUT

    // Create transaction record
    this.createTransaction(transactionId, saga)

    const stepResults = new Map<string, StepResult>()
    const completedSteps: string[] = []
    let currentState = TransactionState.Preparing

    try {
      // Set up timeout
      const timeoutPromise = this.createTimeout(timeout)

      // Execute steps in dependency order
      const executionOrder = this.resolveExecutionOrder(saga.steps)

      for (const stepId of executionOrder) {
        const step = saga.steps.find((s) => s.id === stepId)
        if (!step) continue

        // Check for timeout
        if (this.getTimestamp() - startedAt > timeout) {
          throw new SagaTimeoutError(transactionId)
        }

        // Execute the step
        const result = await this.executeStep(transactionId, step, saga.retryPolicy)
        stepResults.set(stepId, result)
        this.saveStepResult(transactionId, result, false)

        if (result.success) {
          completedSteps.push(stepId)
        } else {
          // Step failed - trigger compensation
          currentState = TransactionState.Aborting
          this.updateTransactionState(transactionId, currentState)

          const compensationResults = await this.runCompensations(
            transactionId,
            saga,
            completedSteps
          )

          currentState = TransactionState.Aborted
          this.updateTransactionState(transactionId, currentState, result.error?.message)

          return {
            transactionId,
            state: currentState,
            success: false,
            stepResults,
            error: result.error?.message,
            totalDurationMs: this.getTimestamp() - startedAt,
            startedAt,
            completedAt: this.getTimestamp(),
            compensationResults,
          }
        }
      }

      // All steps completed successfully
      currentState = TransactionState.Committed
      this.updateTransactionState(transactionId, currentState)

      return {
        transactionId,
        state: currentState,
        success: true,
        stepResults,
        totalDurationMs: this.getTimestamp() - startedAt,
        startedAt,
        completedAt: this.getTimestamp(),
      }
    } catch (error) {
      // Handle timeout or unexpected errors
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (error instanceof SagaTimeoutError) {
        currentState = TransactionState.TimedOut
      } else {
        currentState = TransactionState.Failed
      }

      // Run compensations for completed steps
      if (completedSteps.length > 0) {
        await this.runCompensations(transactionId, saga, completedSteps)
      }

      this.updateTransactionState(transactionId, currentState, errorMessage)

      return {
        transactionId,
        state: currentState,
        success: false,
        stepResults,
        error: errorMessage,
        totalDurationMs: this.getTimestamp() - startedAt,
        startedAt,
        completedAt: this.getTimestamp(),
      }
    }
  }

  /**
   * Execute a single saga step with retries
   */
  private async executeStep(
    transactionId: TransactionId,
    step: SagaStep,
    globalRetryPolicy?: RetryPolicy
  ): Promise<StepResult> {
    const startedAt = this.getTimestamp()
    const retryPolicy = step.retryPolicy ?? globalRetryPolicy ?? DEFAULT_RETRY_POLICY
    const timeout = step.timeout ?? DEFAULT_STEP_TIMEOUT

    let lastError: StepError | undefined
    let retryCount = 0

    for (let attempt = 0; attempt <= retryPolicy.maxAttempts; attempt++) {
      retryCount = attempt
      try {
        // Get participant stub
        const participant = this.resolveParticipant(step.participantId)

        // Execute with timeout
        const result = await Promise.race([
          participant.call(step.method, step.params),
          this.createTimeout(timeout).then(() => {
            throw new SagaTimeoutError(transactionId, step.id)
          }),
        ])

        const completedAt = this.getTimestamp()

        return {
          stepId: step.id,
          success: true,
          data: result,
          durationMs: completedAt - startedAt,
          startedAt,
          completedAt,
          retryCount,
        }
      } catch (error) {
        lastError = {
          code: error instanceof SagaStepError ? error.code : 'STEP_ERROR',
          message: error instanceof Error ? error.message : String(error),
          retryable: error instanceof SagaStepError ? error.retryable : true,
          stack: error instanceof Error ? error.stack : undefined,
        }

        // Check if we should retry
        if (attempt < retryPolicy.maxAttempts && lastError.retryable) {
          const delay = calculateRetryDelay(attempt, retryPolicy)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        break
      }
    }

    const completedAt = this.getTimestamp()

    return {
      stepId: step.id,
      success: false,
      error: lastError,
      durationMs: completedAt - startedAt,
      startedAt,
      completedAt,
      retryCount,
    }
  }

  /**
   * Run compensations for completed steps
   */
  private async runCompensations(
    transactionId: TransactionId,
    saga: SagaDefinition,
    completedSteps: string[]
  ): Promise<Map<string, StepResult>> {
    const compensationResults = new Map<string, StepResult>()
    const strategy = saga.compensationStrategy ?? CompensationStrategy.ReverseOrder

    // Mark compensation as triggered
    this.markCompensationTriggered(transactionId)

    // Determine compensation order
    let compensationOrder: string[]
    switch (strategy) {
      case CompensationStrategy.Parallel:
        // All at once (handled differently below)
        compensationOrder = completedSteps
        break
      case CompensationStrategy.DependencyAware:
        // Reverse dependency order
        compensationOrder = this.resolveExecutionOrder(
          saga.steps.filter((s) => completedSteps.includes(s.id))
        ).reverse()
        break
      case CompensationStrategy.ReverseOrder:
      default:
        compensationOrder = [...completedSteps].reverse()
    }

    // Execute compensations
    if (strategy === CompensationStrategy.Parallel) {
      const promises = compensationOrder.map((stepId) =>
        this.executeCompensation(transactionId, saga, stepId)
      )
      const results = await Promise.allSettled(promises)

      results.forEach((result, i) => {
        const stepId = compensationOrder[i]
        if (stepId && result.status === 'fulfilled') {
          compensationResults.set(stepId, result.value)
          this.saveStepResult(transactionId, result.value, true)
        }
      })
    } else {
      for (const stepId of compensationOrder) {
        const result = await this.executeCompensation(transactionId, saga, stepId)
        compensationResults.set(stepId, result)
        this.saveStepResult(transactionId, result, true)
      }
    }

    return compensationResults
  }

  /**
   * Execute compensation for a single step
   */
  private async executeCompensation(
    transactionId: TransactionId,
    saga: SagaDefinition,
    stepId: string
  ): Promise<StepResult> {
    const startedAt = this.getTimestamp()
    const step = saga.steps.find((s) => s.id === stepId)

    if (!step || !step.compensationMethod) {
      return {
        stepId,
        success: true,
        durationMs: 0,
        startedAt,
        completedAt: startedAt,
        retryCount: 0,
      }
    }

    const retryPolicy = step.retryPolicy ?? saga.retryPolicy ?? DEFAULT_RETRY_POLICY
    let lastError: StepError | undefined
    let retryCount = 0

    for (let attempt = 0; attempt <= retryPolicy.maxAttempts; attempt++) {
      retryCount = attempt
      try {
        const participant = this.resolveParticipant(step.participantId)

        // Use compensation params or step result
        const params = step.compensationParams

        await participant.call(step.compensationMethod, params)

        const completedAt = this.getTimestamp()

        return {
          stepId,
          success: true,
          durationMs: completedAt - startedAt,
          startedAt,
          completedAt,
          retryCount,
        }
      } catch (error) {
        lastError = {
          code: 'COMPENSATION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
          stack: error instanceof Error ? error.stack : undefined,
        }

        if (attempt < retryPolicy.maxAttempts) {
          const delay = calculateRetryDelay(attempt, retryPolicy)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        break
      }
    }

    const completedAt = this.getTimestamp()

    return {
      stepId,
      success: false,
      error: lastError,
      durationMs: completedAt - startedAt,
      startedAt,
      completedAt,
      retryCount,
    }
  }

  /**
   * Resolve step execution order based on dependencies
   */
  private resolveExecutionOrder(steps: SagaStep[]): string[] {
    const order: string[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (stepId: string) => {
      if (visited.has(stepId)) return
      if (visiting.has(stepId)) {
        throw new Error(`Circular dependency detected at step ${stepId}`)
      }

      visiting.add(stepId)

      const step = steps.find((s) => s.id === stepId)
      if (step?.dependsOn) {
        for (const depId of step.dependsOn) {
          visit(depId)
        }
      }

      visiting.delete(stepId)
      visited.add(stepId)
      order.push(stepId)
    }

    for (const step of steps) {
      visit(step.id)
    }

    return order
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(ms: number): Promise<void> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new SagaTimeoutError('timeout')), ms)
    })
  }

  // =========================================================================
  // Database Operations
  // =========================================================================

  private createTransaction(transactionId: TransactionId, saga: SagaDefinition): void {
    this.sql.exec(
      `INSERT INTO saga_transactions (id, saga_definition, state, started_at)
       VALUES (?, ?, ?, ?)`,
      transactionId,
      JSON.stringify(saga),
      TransactionState.Preparing,
      this.getTimestamp()
    )
  }

  private updateTransactionState(
    transactionId: TransactionId,
    state: TransactionState,
    error?: string
  ): void {
    if (
      state === TransactionState.Committed ||
      state === TransactionState.Aborted ||
      state === TransactionState.Failed ||
      state === TransactionState.TimedOut
    ) {
      this.sql.exec(
        `UPDATE saga_transactions SET state = ?, error = ?, completed_at = ? WHERE id = ?`,
        state,
        error ?? null,
        this.getTimestamp(),
        transactionId
      )
    } else {
      this.sql.exec(
        `UPDATE saga_transactions SET state = ?, error = ? WHERE id = ?`,
        state,
        error ?? null,
        transactionId
      )
    }
  }

  private markCompensationTriggered(transactionId: TransactionId): void {
    this.sql.exec(
      `UPDATE saga_transactions SET compensation_triggered = 1 WHERE id = ?`,
      transactionId
    )
  }

  private saveStepResult(
    transactionId: TransactionId,
    result: StepResult,
    isCompensation: boolean
  ): void {
    this.sql.exec(
      `INSERT OR REPLACE INTO saga_step_results
       (transaction_id, step_id, success, data, error, duration_ms, started_at, completed_at, retry_count, is_compensation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      transactionId,
      result.stepId,
      result.success ? 1 : 0,
      result.data ? JSON.stringify(result.data) : null,
      result.error ? JSON.stringify(result.error) : null,
      result.durationMs,
      result.startedAt,
      result.completedAt,
      result.retryCount,
      isCompensation ? 1 : 0
    )
  }

  // =========================================================================
  // Distributed Lock Management
  // =========================================================================

  /**
   * Acquire a distributed lock
   */
  async acquireLock(
    resource: string,
    owner: string,
    options?: LockOptions
  ): Promise<DistributedLock | null> {
    this.ensureSchema()

    const now = this.getTimestamp()
    const mode = options?.mode ?? LockMode.Exclusive
    const duration = options?.duration ?? 30000
    const timeout = options?.timeout ?? 5000

    const lockId = `lock_${resource}_${now}`
    const expiresAt = now + duration

    // Clean up expired locks first
    this.sql.exec('DELETE FROM saga_locks WHERE expires_at < ?', now)

    const startTime = now
    while (this.getTimestamp() - startTime < timeout) {
      // Check for existing lock
      const existing = this.sql
        .exec<{ lock_id: string; owner: string; mode: string; expires_at: number }>(
          'SELECT lock_id, owner, mode, expires_at FROM saga_locks WHERE resource = ? AND expires_at > ?',
          resource,
          this.getTimestamp()
        )
        .one()

      if (!existing) {
        // No existing lock - try to acquire
        try {
          this.sql.exec(
            `INSERT INTO saga_locks (lock_id, resource, owner, mode, acquired_at, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            lockId,
            resource,
            owner,
            mode,
            now,
            expiresAt
          )

          return {
            lockId,
            resource,
            owner,
            mode,
            acquiredAt: now,
            expiresAt,
          }
        } catch {
          // Race condition - another lock was acquired
          await new Promise((r) => setTimeout(r, 50))
          continue
        }
      }

      // Lock exists - check if compatible
      if (existing.mode === LockMode.Shared && mode === LockMode.Shared) {
        // Shared locks are compatible
        try {
          this.sql.exec(
            `INSERT INTO saga_locks (lock_id, resource, owner, mode, acquired_at, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            lockId,
            resource,
            owner,
            mode,
            now,
            expiresAt
          )

          return {
            lockId,
            resource,
            owner,
            mode,
            acquiredAt: now,
            expiresAt,
          }
        } catch {
          await new Promise((r) => setTimeout(r, 50))
          continue
        }
      }

      // Incompatible lock - wait and retry
      await new Promise((r) => setTimeout(r, 100))
    }

    return null
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(lockId: string): Promise<boolean> {
    this.ensureSchema()

    const result = this.sql.exec('DELETE FROM saga_locks WHERE lock_id = ?', lockId)
    return result.rowsWritten > 0
  }

  /**
   * Extend a lock's expiration
   */
  async extendLock(lockId: string, additionalDuration: number): Promise<boolean> {
    this.ensureSchema()

    const now = this.getTimestamp()
    const result = this.sql.exec(
      'UPDATE saga_locks SET expires_at = expires_at + ? WHERE lock_id = ? AND expires_at > ?',
      additionalDuration,
      lockId,
      now
    )
    return result.rowsWritten > 0
  }

  // =========================================================================
  // Query Methods
  // =========================================================================

  /**
   * Get a transaction by ID
   */
  async getTransaction(transactionId: TransactionId): Promise<TransactionRecord | null> {
    this.ensureSchema()

    const row = this.sql
      .exec<{
        id: string
        saga_definition: string
        state: string
        error: string | null
        started_at: number
        completed_at: number | null
        compensation_triggered: number
      }>('SELECT * FROM saga_transactions WHERE id = ?', transactionId)
      .one()

    if (!row) return null

    // Get step results
    const stepRows = this.sql
      .exec<{
        step_id: string
        success: number
        data: string | null
        error: string | null
        duration_ms: number
        started_at: number
        completed_at: number
        retry_count: number
        is_compensation: number
      }>(
        'SELECT * FROM saga_step_results WHERE transaction_id = ? AND is_compensation = 0',
        transactionId
      )
      .toArray()

    const compensationRows = this.sql
      .exec<{
        step_id: string
        success: number
        data: string | null
        error: string | null
        duration_ms: number
        started_at: number
        completed_at: number
        retry_count: number
      }>(
        'SELECT * FROM saga_step_results WHERE transaction_id = ? AND is_compensation = 1',
        transactionId
      )
      .toArray()

    const stepResults = new Map<string, StepResult>()
    for (const r of stepRows) {
      stepResults.set(r.step_id, {
        stepId: r.step_id,
        success: r.success === 1,
        data: r.data ? JSON.parse(r.data) : undefined,
        error: r.error ? JSON.parse(r.error) : undefined,
        durationMs: r.duration_ms,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        retryCount: r.retry_count,
      })
    }

    const compensationResults = new Map<string, StepResult>()
    for (const r of compensationRows) {
      compensationResults.set(r.step_id, {
        stepId: r.step_id,
        success: r.success === 1,
        data: r.data ? JSON.parse(r.data) : undefined,
        error: r.error ? JSON.parse(r.error) : undefined,
        durationMs: r.duration_ms,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        retryCount: r.retry_count,
      })
    }

    return {
      id: row.id,
      saga: JSON.parse(row.saga_definition),
      state: row.state as TransactionState,
      participantStates: new Map(),
      stepResults,
      startedAt: row.started_at,
      completedAt: row.completed_at ?? undefined,
      error: row.error ?? undefined,
      compensationTriggered: row.compensation_triggered === 1,
      compensationResults: compensationResults.size > 0 ? compensationResults : undefined,
    }
  }

  /**
   * List transactions by state
   */
  async listTransactions(
    state?: TransactionState,
    limit = 100
  ): Promise<TransactionRecord[]> {
    this.ensureSchema()

    let query = 'SELECT * FROM saga_transactions'
    const params: unknown[] = []

    if (state) {
      query += ' WHERE state = ?'
      params.push(state)
    }

    query += ' ORDER BY started_at DESC LIMIT ?'
    params.push(limit)

    const rows = this.sql
      .exec<{
        id: string
        saga_definition: string
        state: string
        error: string | null
        started_at: number
        completed_at: number | null
        compensation_triggered: number
      }>(query, ...params)
      .toArray()

    const results: TransactionRecord[] = []
    for (const row of rows) {
      const record = await this.getTransaction(row.id)
      if (record) results.push(record)
    }

    return results
  }
}

// ============================================================================
// Saga Mixin
// ============================================================================

/**
 * Constructor type for mixin application
 */
type Constructor<T = object> = new (...args: unknown[]) => T

/**
 * Base interface required by SagaMixin
 */
interface SagaMixinBase {
  readonly ctx: DOState
  readonly env: DOEnv
}

/**
 * Apply SagaMixin to a base class
 *
 * Adds saga participant capabilities to a Durable Object.
 */
export function applySagaMixin<TBase extends Constructor<SagaMixinBase>>(Base: TBase) {
  return class SagaMixin extends Base {
    private _pendingTransactions: Map<TransactionId, { method: string; params: unknown }> = new Map()
    private _sagaExecutor?: SagaExecutor

    /**
     * Get or create the saga executor
     */
    protected getSagaExecutor(): SagaExecutor {
      if (!this._sagaExecutor) {
        this._sagaExecutor = new SagaExecutor({
          sql: this.ctx.storage.sql,
          resolveParticipant: (id: ParticipantId) => this.resolveParticipant(id),
        })
      }
      return this._sagaExecutor
    }

    /**
     * Override to provide participant resolution
     */
    protected resolveParticipant(_id: ParticipantId): ParticipantStub {
      throw new Error('resolveParticipant must be implemented')
    }

    /**
     * Execute a saga transaction
     */
    async executeSaga(saga: SagaDefinition): Promise<SagaResult> {
      return this.getSagaExecutor().execute(saga)
    }

    /**
     * Saga prepare phase (2PC)
     */
    async sagaPrepare(
      transactionId: TransactionId,
      method: string,
      params: unknown
    ): Promise<boolean> {
      try {
        // Store the pending operation
        this._pendingTransactions.set(transactionId, { method, params })
        return true
      } catch {
        return false
      }
    }

    /**
     * Saga commit phase (2PC)
     */
    async sagaCommit(transactionId: TransactionId): Promise<void> {
      const pending = this._pendingTransactions.get(transactionId)
      if (!pending) {
        throw new Error(`No pending transaction: ${transactionId}`)
      }

      try {
        // Execute the actual operation
        const fn = (this as unknown as Record<string, (params: unknown) => Promise<unknown>>)[pending.method]
        if (typeof fn === 'function') {
          await fn.call(this, pending.params)
        }
        this._pendingTransactions.delete(transactionId)
      } catch (error) {
        this._pendingTransactions.delete(transactionId)
        throw error
      }
    }

    /**
     * Saga abort phase (2PC)
     */
    async sagaAbort(transactionId: TransactionId): Promise<void> {
      // Simply remove the pending transaction
      this._pendingTransactions.delete(transactionId)
    }

    /**
     * Saga compensate
     */
    async sagaCompensate(
      transactionId: TransactionId,
      method: string,
      params: unknown
    ): Promise<void> {
      const fn = (this as unknown as Record<string, (params: unknown) => Promise<unknown>>)[method]
      if (typeof fn === 'function') {
        await fn.call(this, params)
      }
    }

    /**
     * Acquire a distributed lock
     */
    async acquireLock(resource: string, options?: LockOptions): Promise<DistributedLock | null> {
      const owner = this.ctx.id.toString()
      return this.getSagaExecutor().acquireLock(resource, owner, options)
    }

    /**
     * Release a distributed lock
     */
    async releaseLock(lockId: string): Promise<boolean> {
      return this.getSagaExecutor().releaseLock(lockId)
    }
  }
}

/**
 * SagaBase - Pre-composed SagaMixin with DOCore
 */
export class SagaBase<Env extends DOEnv = DOEnv> extends applySagaMixin(DOCore)<Env> {
  constructor(ctx: DOState, env: Env) {
    super(ctx, env)
  }
}
