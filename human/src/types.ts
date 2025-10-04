/**
 * Human Functions Type System
 *
 * Core TypeScript types for human-in-the-loop function execution.
 * Provides type-safe schemas, routing configuration, and UI component types.
 */

import type { ZodSchema } from 'zod'
import type { ComponentType } from 'react'

/**
 * Supported channels for human interaction
 */
export type HumanChannel = 'slack' | 'web' | 'voice' | 'email'

/**
 * SLA (Service Level Agreement) thresholds
 */
export interface SLA {
  /** Warning threshold in milliseconds */
  warning: number
  /** Critical threshold in milliseconds */
  critical: number
}

/**
 * Routing configuration for human function execution
 */
export interface RoutingConfig<TInput = unknown> {
  /** Channels where this function can be executed */
  channels: HumanChannel[]

  /** Assignees who can execute this function (static or dynamic) */
  assignees?: string[] | ((input: TInput) => string[] | Promise<string[]>)

  /** Timeout in milliseconds before triggering onTimeout handler */
  timeout?: number

  /** SLA thresholds for monitoring and alerts */
  sla?: SLA

  /** Priority level (1=highest, 5=lowest) */
  priority?: 1 | 2 | 3 | 4 | 5

  /** Tags for categorization and filtering */
  tags?: string[]
}

/**
 * UI component props for prompt display
 */
export interface PromptProps<TInput> {
  input: TInput
}

/**
 * UI component props for form submission
 */
export interface FormProps<TInput, TOutput> {
  input: TInput
  onSubmit: (output: TOutput) => void | Promise<void>
  onCancel?: () => void
}

/**
 * UI component props for result review
 */
export interface ReviewProps<TInput, TOutput> {
  input: TInput
  output: TOutput
}

/**
 * UI configuration for human interaction
 */
export interface UIConfig<TInput, TOutput> {
  /** Component to display the prompt/request to the human */
  prompt: ComponentType<PromptProps<TInput>>

  /** Optional form component for structured input */
  form?: ComponentType<FormProps<TInput, TOutput>>

  /** Optional review component to display results */
  review?: ComponentType<ReviewProps<TInput, TOutput>>

  /** Optional custom CSS classes */
  className?: string

  /** Optional theme overrides */
  theme?: Record<string, string>
}

/**
 * Schema configuration with Zod validators
 */
export interface SchemaConfig<TInput, TOutput> {
  /** Input validation schema */
  input: ZodSchema<TInput>

  /** Output validation schema */
  output: ZodSchema<TOutput>

  /** Optional metadata schema */
  metadata?: ZodSchema<Record<string, unknown>>
}

/**
 * Execution context passed to lifecycle hooks
 */
export interface ExecutionContext<TInput = unknown> {
  /** Unique execution ID */
  executionId: string

  /** Function name */
  functionName: string

  /** Input data */
  input: TInput

  /** Timestamp when execution started */
  startedAt: Date

  /** Channel where execution is happening */
  channel: HumanChannel

  /** Assignee handling the execution */
  assignee?: string

  /** Custom metadata */
  metadata?: Record<string, unknown>
}

/**
 * Result of a completed execution
 */
export interface ExecutionResult<TOutput = unknown> {
  /** Unique execution ID */
  executionId: string

  /** Output data */
  output: TOutput

  /** Timestamp when execution completed */
  completedAt: Date

  /** Time taken in milliseconds */
  duration: number

  /** Assignee who completed the execution */
  assignee?: string

  /** Custom metadata */
  metadata?: Record<string, unknown>
}

/**
 * Lifecycle hooks for human function execution
 */
export interface LifecycleHooks<TInput, TOutput> {
  /** Called when execution times out */
  onTimeout?: (ctx: ExecutionContext<TInput>) => TOutput | Promise<TOutput>

  /** Called when execution is escalated */
  onEscalate?: (ctx: ExecutionContext<TInput>, reason: string) => void | Promise<void>

  /** Called when execution completes successfully */
  onComplete?: (result: ExecutionResult<TOutput>) => void | Promise<void>

  /** Called when execution is cancelled */
  onCancel?: (ctx: ExecutionContext<TInput>) => void | Promise<void>

  /** Called when execution encounters an error */
  onError?: (ctx: ExecutionContext<TInput>, error: Error) => void | Promise<void>
}

/**
 * Core human function definition
 *
 * @template TInput - Type of input data
 * @template TOutput - Type of output data
 *
 * @example
 * ```typescript
 * const approveExpense: HumanFunction<ExpenseInput, ApprovalOutput> = {
 *   name: 'approve-expense',
 *   description: 'Approve or reject an expense claim',
 *   schema: {
 *     input: z.object({
 *       amount: z.number(),
 *       category: z.string(),
 *       receipt: z.string().url()
 *     }),
 *     output: z.object({
 *       approved: z.boolean(),
 *       reason: z.string().optional()
 *     })
 *   },
 *   routing: {
 *     channels: ['slack', 'web'],
 *     assignees: ['manager-team'],
 *     timeout: 86400000, // 24 hours
 *     sla: { warning: 43200000, critical: 86400000 }
 *   },
 *   ui: {
 *     prompt: ExpensePrompt,
 *     form: ExpenseApprovalForm,
 *     review: ExpenseReview
 *   },
 *   onTimeout: async (ctx) => ({
 *     approved: false,
 *     reason: 'Timed out - auto-rejected'
 *   }),
 *   onComplete: async (result) => {
 *     await notifyUser(result)
 *   }
 * }
 * ```
 */
export interface HumanFunction<TInput = unknown, TOutput = unknown> {
  /** Unique function name (kebab-case) */
  name: string

  /** Human-readable description */
  description: string

  /** Validation schemas for input/output */
  schema: SchemaConfig<TInput, TOutput>

  /** Routing and assignment configuration */
  routing: RoutingConfig<TInput>

  /** UI components for human interaction */
  ui: UIConfig<TInput, TOutput>

  /** Lifecycle hooks */
  onTimeout?: LifecycleHooks<TInput, TOutput>['onTimeout']
  onEscalate?: LifecycleHooks<TInput, TOutput>['onEscalate']
  onComplete?: LifecycleHooks<TInput, TOutput>['onComplete']
  onCancel?: LifecycleHooks<TInput, TOutput>['onCancel']
  onError?: LifecycleHooks<TInput, TOutput>['onError']

  /** Optional metadata */
  metadata?: Record<string, unknown>

  /** Optional version string */
  version?: string

  /** Optional enabled flag */
  enabled?: boolean
}

/**
 * Execution request payload
 */
export interface ExecutionRequest<TInput = unknown> {
  /** Function name to execute */
  functionName: string

  /** Input data */
  input: TInput

  /** Optional channel override */
  channel?: HumanChannel

  /** Optional assignee override */
  assignee?: string

  /** Optional timeout override */
  timeout?: number

  /** Optional metadata */
  metadata?: Record<string, unknown>

  /** Optional correlation ID for tracking */
  correlationId?: string
}

/**
 * Execution status
 */
export type ExecutionStatus = 'pending' | 'in_progress' | 'completed' | 'timeout' | 'cancelled' | 'error'

/**
 * Execution record stored in database
 */
export interface ExecutionRecord<TInput = unknown, TOutput = unknown> {
  /** Unique execution ID */
  executionId: string

  /** Function name */
  functionName: string

  /** Current status */
  status: ExecutionStatus

  /** Input data */
  input: TInput

  /** Output data (if completed) */
  output?: TOutput

  /** Channel */
  channel: HumanChannel

  /** Assigned to */
  assignee?: string

  /** Timestamps */
  createdAt: Date
  startedAt?: Date
  completedAt?: Date

  /** Error information (if error status) */
  error?: {
    message: string
    stack?: string
  }

  /** Metadata */
  metadata?: Record<string, unknown>

  /** Correlation ID */
  correlationId?: string
}

/**
 * Function registry entry
 */
export interface FunctionRegistryEntry<TInput = unknown, TOutput = unknown> {
  /** The function definition */
  function: HumanFunction<TInput, TOutput>

  /** Registration timestamp */
  registeredAt: Date

  /** Number of active executions */
  activeExecutions: number

  /** Statistics */
  stats?: {
    totalExecutions: number
    completedExecutions: number
    timeoutExecutions: number
    cancelledExecutions: number
    averageDuration: number
  }
}

/**
 * Error types for human function execution
 */
export class HumanFunctionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'HumanFunctionError'
  }
}

export class ValidationError extends HumanFunctionError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class TimeoutError extends HumanFunctionError {
  constructor(message: string, details?: unknown) {
    super(message, 'TIMEOUT_ERROR', details)
    this.name = 'TimeoutError'
  }
}

export class NotFoundError extends HumanFunctionError {
  constructor(message: string, details?: unknown) {
    super(message, 'NOT_FOUND_ERROR', details)
    this.name = 'NotFoundError'
  }
}

export class RoutingError extends HumanFunctionError {
  constructor(message: string, details?: unknown) {
    super(message, 'ROUTING_ERROR', details)
    this.name = 'RoutingError'
  }
}
