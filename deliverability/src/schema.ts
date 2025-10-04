/**
 * Deliverability Service Schemas (Zod Validation)
 */

import { z } from 'zod'

/**
 * Get Metrics Request Schema
 */
export const getMetricsRequestSchema = z.object({
  domainId: z.string().min(1),
  period: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

/**
 * Get Reputation Request Schema
 */
export const getReputationRequestSchema = z.object({
  domainId: z.string().min(1),
  refresh: z.boolean().default(false),
})

/**
 * Analyze Domain Request Schema
 */
export const analyzeDomainRequestSchema = z.object({
  domainId: z.string().min(1),
  depth: z.enum(['quick', 'full']).default('quick'),
})
