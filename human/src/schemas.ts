/**
 * Zod Validation Schemas for Human Functions
 *
 * Runtime validation schemas for all human function types and payloads.
 */

import { z } from 'zod'
import type { HumanChannel, ExecutionStatus } from './types'

/**
 * Schema for human channel enum
 */
export const humanChannelSchema = z.enum(['slack', 'web', 'voice', 'email'])

/**
 * Schema for execution status enum
 */
export const executionStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'timeout', 'cancelled', 'error'])

/**
 * Schema for priority levels
 */
export const prioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])

/**
 * Schema for SLA configuration
 */
export const slaSchema = z.object({
  warning: z.number().int().positive().describe('Warning threshold in milliseconds'),
  critical: z.number().int().positive().describe('Critical threshold in milliseconds'),
})

/**
 * Schema for routing configuration (metadata only, functions not validated)
 */
export const routingConfigSchema = z.object({
  channels: z.array(humanChannelSchema).min(1).describe('Channels where this function can be executed'),
  assignees: z.union([z.array(z.string()), z.function()]).optional().describe('Assignees who can execute this function'),
  timeout: z.number().int().positive().optional().describe('Timeout in milliseconds'),
  sla: slaSchema.optional().describe('SLA thresholds'),
  priority: prioritySchema.optional().describe('Priority level (1=highest, 5=lowest)'),
  tags: z.array(z.string()).optional().describe('Tags for categorization'),
})

/**
 * Schema for UI configuration (metadata only, React components not validated)
 */
export const uiConfigSchema = z.object({
  prompt: z.any().describe('React component for prompt display'),
  form: z.any().optional().describe('React component for form submission'),
  review: z.any().optional().describe('React component for result review'),
  className: z.string().optional().describe('Custom CSS classes'),
  theme: z.record(z.string()).optional().describe('Theme overrides'),
})

/**
 * Schema for schema configuration (metadata only, Zod schemas not validated)
 */
export const schemaConfigSchema = z.object({
  input: z.any().describe('Input validation schema'),
  output: z.any().describe('Output validation schema'),
  metadata: z.any().optional().describe('Metadata validation schema'),
})

/**
 * Schema for human function definition (metadata validation)
 *
 * Note: This validates the structure but not the actual Zod schemas or React components.
 * Use validateHumanFunction() for full validation with type information.
 */
export const humanFunctionSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/).describe('Unique function name (kebab-case)'),
  description: z.string().min(1).describe('Human-readable description'),
  schema: schemaConfigSchema,
  routing: routingConfigSchema,
  ui: uiConfigSchema,
  onTimeout: z.function().optional(),
  onEscalate: z.function().optional(),
  onComplete: z.function().optional(),
  onCancel: z.function().optional(),
  onError: z.function().optional(),
  metadata: z.record(z.unknown()).optional(),
  version: z.string().optional(),
  enabled: z.boolean().optional(),
})

/**
 * Schema for execution request
 */
export const executionRequestSchema = z.object({
  functionName: z.string().regex(/^[a-z0-9-]+$/).describe('Function name to execute'),
  input: z.unknown().describe('Input data (validated by function schema)'),
  channel: humanChannelSchema.optional().describe('Channel override'),
  assignee: z.string().optional().describe('Assignee override'),
  timeout: z.number().int().positive().optional().describe('Timeout override'),
  metadata: z.record(z.unknown()).optional().describe('Custom metadata'),
  correlationId: z.string().optional().describe('Correlation ID for tracking'),
})

/**
 * Schema for execution context
 */
export const executionContextSchema = z.object({
  executionId: z.string().uuid().describe('Unique execution ID'),
  functionName: z.string().regex(/^[a-z0-9-]+$/).describe('Function name'),
  input: z.unknown().describe('Input data'),
  startedAt: z.date().describe('Start timestamp'),
  channel: humanChannelSchema.describe('Execution channel'),
  assignee: z.string().optional().describe('Assigned to'),
  metadata: z.record(z.unknown()).optional().describe('Custom metadata'),
})

/**
 * Schema for execution result
 */
export const executionResultSchema = z.object({
  executionId: z.string().uuid().describe('Unique execution ID'),
  output: z.unknown().describe('Output data (validated by function schema)'),
  completedAt: z.date().describe('Completion timestamp'),
  duration: z.number().int().nonnegative().describe('Duration in milliseconds'),
  assignee: z.string().optional().describe('Assignee who completed'),
  metadata: z.record(z.unknown()).optional().describe('Custom metadata'),
})

/**
 * Schema for execution record
 */
export const executionRecordSchema = z.object({
  executionId: z.string().uuid(),
  functionName: z.string().regex(/^[a-z0-9-]+$/),
  status: executionStatusSchema,
  input: z.unknown(),
  output: z.unknown().optional(),
  channel: humanChannelSchema,
  assignee: z.string().optional(),
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  error: z
    .object({
      message: z.string(),
      stack: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  correlationId: z.string().optional(),
})

/**
 * Schema for function registry entry statistics
 */
export const functionStatsSchema = z.object({
  totalExecutions: z.number().int().nonnegative(),
  completedExecutions: z.number().int().nonnegative(),
  timeoutExecutions: z.number().int().nonnegative(),
  cancelledExecutions: z.number().int().nonnegative(),
  averageDuration: z.number().nonnegative(),
})

/**
 * Schema for function registry entry (metadata only)
 */
export const functionRegistryEntrySchema = z.object({
  function: humanFunctionSchema,
  registeredAt: z.date(),
  activeExecutions: z.number().int().nonnegative(),
  stats: functionStatsSchema.optional(),
})

/**
 * Helper type for inferred schemas
 */
export type InferredHumanFunction = z.infer<typeof humanFunctionSchema>
export type InferredExecutionRequest = z.infer<typeof executionRequestSchema>
export type InferredExecutionResult = z.infer<typeof executionResultSchema>
export type InferredExecutionRecord = z.infer<typeof executionRecordSchema>
export type InferredExecutionContext = z.infer<typeof executionContextSchema>
export type InferredFunctionRegistryEntry = z.infer<typeof functionRegistryEntrySchema>

/**
 * Validation helper functions
 */

/**
 * Validate execution request
 */
export function validateExecutionRequest(data: unknown): InferredExecutionRequest {
  return executionRequestSchema.parse(data)
}

/**
 * Validate execution result
 */
export function validateExecutionResult(data: unknown): InferredExecutionResult {
  return executionResultSchema.parse(data)
}

/**
 * Validate execution record
 */
export function validateExecutionRecord(data: unknown): InferredExecutionRecord {
  return executionRecordSchema.parse(data)
}

/**
 * Validate human function metadata
 *
 * Note: This only validates the structure, not the actual Zod schemas or React components.
 * For full validation, use the function's own schema.input/output validators.
 */
export function validateHumanFunction(data: unknown): InferredHumanFunction {
  return humanFunctionSchema.parse(data)
}

/**
 * Validate function registry entry
 */
export function validateFunctionRegistryEntry(data: unknown): InferredFunctionRegistryEntry {
  return functionRegistryEntrySchema.parse(data)
}

/**
 * Safe validation that returns errors instead of throwing
 */
export function safeValidateExecutionRequest(data: unknown): z.SafeParseReturnType<unknown, InferredExecutionRequest> {
  return executionRequestSchema.safeParse(data)
}

export function safeValidateExecutionResult(data: unknown): z.SafeParseReturnType<unknown, InferredExecutionResult> {
  return executionResultSchema.safeParse(data)
}

export function safeValidateExecutionRecord(data: unknown): z.SafeParseReturnType<unknown, InferredExecutionRecord> {
  return executionRecordSchema.safeParse(data)
}

export function safeValidateHumanFunction(data: unknown): z.SafeParseReturnType<unknown, InferredHumanFunction> {
  return humanFunctionSchema.safeParse(data)
}

/**
 * Type guard helpers
 */

export function isHumanChannel(value: unknown): value is HumanChannel {
  return humanChannelSchema.safeParse(value).success
}

export function isExecutionStatus(value: unknown): value is ExecutionStatus {
  return executionStatusSchema.safeParse(value).success
}

/**
 * Schema validation with custom error messages
 */
export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public issues: z.ZodIssue[]
  ) {
    super(message)
    this.name = 'SchemaValidationError'
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      issues: this.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    }
  }
}

/**
 * Validate with custom error formatting
 */
export function validateWithError<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message = context ? `Validation failed for ${context}` : 'Validation failed'
    throw new SchemaValidationError(message, result.error.issues)
  }
  return result.data
}

/**
 * Batch validation for multiple inputs
 */
export function validateBatch<T>(schema: z.ZodSchema<T>, data: unknown[]): { valid: T[]; errors: Array<{ index: number; error: z.ZodError }> } {
  const valid: T[] = []
  const errors: Array<{ index: number; error: z.ZodError }> = []

  data.forEach((item, index) => {
    const result = schema.safeParse(item)
    if (result.success) {
      valid.push(result.data)
    } else {
      errors.push({ index, error: result.error })
    }
  })

  return { valid, errors }
}
