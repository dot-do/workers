/**
 * Type definitions for trigger.do
 */

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  /** Maximum number of retry attempts */
  maxAttempts?: number
  /** Backoff strategy */
  backoff?: 'exponential' | 'linear' | 'fixed'
  /** Initial delay between retries */
  initialDelay?: string
  /** Maximum delay between retries */
  maxDelay?: string
  /** Backoff multiplier for exponential backoff */
  factor?: number
  /** Add randomness to prevent thundering herd */
  jitter?: boolean
}

/**
 * Concurrency configuration
 */
export interface ConcurrencyConfig {
  /** Maximum concurrent runs */
  limit: number
  /** Key expression for per-key limits (e.g., 'payload.organizationId') */
  key?: string
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum runs in period */
  limit: number
  /** Time period (e.g., '1m', '1h') */
  period: string
}

/**
 * Task configuration
 */
export interface TaskConfig<TPayload = unknown, TResult = unknown> {
  /** Unique task identifier */
  id: string
  /** Retry policy */
  retry?: RetryPolicy
  /** Concurrency limits */
  concurrency?: ConcurrencyConfig
  /** Rate limiting */
  rateLimit?: RateLimitConfig
  /** Task execution function */
  run: (payload: TPayload, context: TaskContext) => Promise<TResult>
}

/**
 * Task execution context
 */
export interface TaskContext {
  /** Save checkpoint for resumption */
  checkpoint: (id: string, data: unknown) => Promise<void>
  /** Log a message */
  log: (level: 'info' | 'warn' | 'error', message: string) => void
}

/**
 * Schedule configuration for cron tasks
 */
export interface ScheduleConfig<TResult = unknown> {
  /** Unique schedule identifier */
  id: string
  /** Cron expression(s) */
  cron: string | string[]
  /** Retry policy */
  retry?: RetryPolicy
  /** Task execution function */
  run: () => Promise<TResult>
}

/**
 * Event trigger configuration
 */
export interface TriggerConfig<TEvent = unknown, TResult = unknown> {
  /** Unique trigger identifier */
  id: string
  /** Event source (e.g., 'github', 'stripe') */
  source?: string
  /** Event name pattern */
  event: string
  /** Retry policy */
  retry?: RetryPolicy
  /** Task execution function */
  run: (event: TEvent) => Promise<TResult>
}

/**
 * Handle for a triggered task
 */
export interface TaskHandle<TResult = unknown> {
  /** Unique run identifier */
  id: string
  /** Get current status */
  status: () => Promise<TaskStatus>
  /** Wait for result */
  result: () => Promise<TResult>
  /** Stream logs */
  logs: () => AsyncIterable<LogEntry>
  /** Cancel the run */
  cancel: () => Promise<void>
}

/**
 * Task run status
 */
export interface TaskStatus {
  /** Current state */
  state: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  /** Progress (0-1) */
  progress?: number
  /** Current checkpoint */
  checkpoint?: string
  /** Error if failed */
  error?: string
  /** Started at timestamp */
  startedAt?: Date
  /** Completed at timestamp */
  completedAt?: Date
}

/**
 * Log entry from task execution
 */
export interface LogEntry {
  /** Log level */
  level: 'info' | 'warn' | 'error'
  /** Log message */
  message: string
  /** Timestamp */
  timestamp: Date
  /** Additional data */
  data?: unknown
}

/**
 * Task result with metadata
 */
export interface TaskResult<TResult = unknown> {
  /** Run identifier */
  runId: string
  /** Result data */
  data: TResult
  /** Duration in milliseconds */
  durationMs: number
  /** Retry count */
  retryCount: number
}

/**
 * Defined task with trigger methods
 */
export interface Task<TPayload = unknown, TResult = unknown> {
  /** Task identifier */
  id: string
  /** Trigger task and wait for result */
  triggerAndWait: (payload: TPayload) => Promise<TaskResult<TResult>>
  /** Trigger task and get handle */
  trigger: (payload: TPayload) => Promise<TaskHandle<TResult>>
}

/**
 * Defined scheduled task
 */
export interface ScheduledTask<TResult = unknown> {
  /** Task identifier */
  id: string
  /** Cron expression(s) */
  cron: string | string[]
  /** Manually trigger the scheduled task */
  trigger: () => Promise<TaskHandle<TResult>>
}

/**
 * Defined event trigger
 */
export interface EventTrigger<TEvent = unknown, TResult = unknown> {
  /** Trigger identifier */
  id: string
  /** Event pattern */
  event: string
  /** Manually invoke with event */
  invoke: (event: TEvent) => Promise<TaskHandle<TResult>>
}
