/**
 * Email Warming Service Schemas (Zod Validation)
 */

import { z } from 'zod'

/**
 * Warmup Status Schema
 */
export const warmupStatusSchema = z.enum(['not_started', 'in_progress', 'paused', 'completed', 'failed'])

/**
 * Warmup Schedule Type Schema
 */
export const warmupScheduleTypeSchema = z.enum(['conservative', 'standard', 'aggressive', 'custom'])

/**
 * Warmup Config Schema
 */
export const warmupConfigSchema = z.object({
  domainId: z.string().min(1),
  scheduleType: warmupScheduleTypeSchema,
  customSchedule: z.array(z.number().int().min(1)).optional(),
  startDate: z.string().optional(),
  maxDays: z.number().int().min(1).max(180).optional(),
  autoAdvance: z.boolean().default(true),
  pauseOnHighBounce: z.boolean().default(true),
  pauseOnHighComplaint: z.boolean().default(true),
  bounceThreshold: z.number().min(0).max(1).default(0.05),
  complaintThreshold: z.number().min(0).max(1).default(0.001),
})

/**
 * Start Warmup Request Schema
 */
export const startWarmupRequestSchema = z.object({
  config: warmupConfigSchema,
})

/**
 * Pause Warmup Request Schema
 */
export const pauseWarmupRequestSchema = z.object({
  domainId: z.string().min(1),
  reason: z.string().optional(),
})

/**
 * Resume Warmup Request Schema
 */
export const resumeWarmupRequestSchema = z.object({
  domainId: z.string().min(1),
})

/**
 * Reset Warmup Request Schema
 */
export const resetWarmupRequestSchema = z.object({
  domainId: z.string().min(1),
  preserveStats: z.boolean().default(false),
})

/**
 * Advance Warmup Request Schema
 */
export const advanceWarmupRequestSchema = z.object({
  domainId: z.string().min(1),
  force: z.boolean().default(false),
})

/**
 * Record Send Request Schema
 */
export const recordSendRequestSchema = z.object({
  domainId: z.string().min(1),
  status: z.enum(['delivered', 'bounced', 'failed', 'complained']),
  timestamp: z.string().optional(),
})

/**
 * Check Warmup Limit Request Schema
 */
export const checkWarmupLimitRequestSchema = z.object({
  domainId: z.string().min(1),
  count: z.number().int().min(1).default(1),
})
