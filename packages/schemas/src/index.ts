/**
 * Shared Zod validation schemas for all Workers services
 * @module @dot-do/worker-schemas
 */

import { z } from 'zod'

/**
 * Common schemas
 */

export const idSchema = z.string().min(1)
export const emailSchema = z.string().email()
export const urlSchema = z.string().url()
export const dateSchema = z.coerce.date()
export const timestampSchema = z.number().int().positive()

/**
 * Pagination schemas
 */

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
})

export type Pagination = z.infer<typeof paginationSchema>

/**
 * Filter schemas
 */

export const filterOperatorSchema = z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'like', 'exists'])

export const filterSchema = z.object({
  field: z.string(),
  operator: filterOperatorSchema,
  value: z.any(),
})

export type Filter = z.infer<typeof filterSchema>

/**
 * Sort schemas
 */

export const sortDirectionSchema = z.enum(['asc', 'desc'])

export const sortSchema = z.object({
  field: z.string(),
  direction: sortDirectionSchema,
})

export type Sort = z.infer<typeof sortSchema>

/**
 * Query schemas
 */

export const querySchema = z.object({
  filters: z.array(filterSchema).optional(),
  sort: z.array(sortSchema).optional(),
  pagination: paginationSchema.optional(),
})

export type Query = z.infer<typeof querySchema>

/**
 * Response schemas
 */

export const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
  stack: z.string().optional(),
})

export const responseMetaSchema = z.object({
  timestamp: timestampSchema,
  requestId: z.string().optional(),
  version: z.string().optional(),
  cached: z.boolean().optional(),
})

export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: errorSchema.optional(),
  meta: responseMetaSchema.optional(),
})

export const paginatedResponseSchema = z.object({
  items: z.array(z.any()),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
})

/**
 * Queue message schema
 */

export const queueMessageSchema = z.object({
  id: idSchema,
  timestamp: timestampSchema,
  type: z.string(),
  data: z.any(),
  retry: z.number().int().nonnegative().optional(),
})

export type QueueMessage = z.infer<typeof queueMessageSchema>

/**
 * Helper to create a typed schema validator
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    return schema.parse(data)
  }
}

/**
 * Helper to create a safe validator that returns errors
 */
export function createSafeValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } => {
    const result = schema.safeParse(data)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
  }
}
