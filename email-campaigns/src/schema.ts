/**
 * Email Campaigns Service Schemas (Zod Validation)
 */

import { z } from 'zod'

/**
 * Campaign Status Schema
 */
export const campaignStatusSchema = z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'archived'])

/**
 * Step Status Schema
 */
export const stepStatusSchema = z.enum(['pending', 'sent', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed', 'failed'])

/**
 * A/B Test Status Schema
 */
export const abTestStatusSchema = z.enum(['pending', 'running', 'completed', 'cancelled'])

/**
 * A/B Test Variant Schema
 */
export const abTestVariantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  weight: z.number().min(0).max(100),
  sent: z.number().int().min(0).default(0),
  opened: z.number().int().min(0).default(0),
  clicked: z.number().int().min(0).default(0),
  replied: z.number().int().min(0).default(0),
})

/**
 * A/B Test Schema
 */
export const abTestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  variants: z.array(abTestVariantSchema).min(2),
  status: abTestStatusSchema.default('pending'),
  winnerCriteria: z.enum(['open_rate', 'click_rate', 'reply_rate']),
  sampleSize: z.number().int().min(1),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  winnerId: z.string().optional(),
})

/**
 * Sequence Step Schema
 */
export const sequenceStepSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(0),
  delay: z.number().int().min(0),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
  trackOpens: z.boolean().default(true),
  trackClicks: z.boolean().default(true),
  abTests: z.array(abTestSchema).optional(),
})

/**
 * Contact Filter Schema
 */
export const contactFilterSchema = z.object({
  tags: z.array(z.string()).optional(),
  status: z.array(z.string()).optional(),
  validationScore: z
    .object({
      min: z.number().min(0).max(100).optional(),
      max: z.number().min(0).max(100).optional(),
    })
    .optional(),
  engagementScore: z
    .object({
      min: z.number().min(0).max(100).optional(),
      max: z.number().min(0).max(100).optional(),
    })
    .optional(),
  company: z
    .object({
      name: z.string().optional(),
      industry: z.string().optional(),
      size: z.string().optional(),
    })
    .optional(),
  location: z
    .object({
      country: z.string().optional(),
      state: z.string().optional(),
      city: z.string().optional(),
    })
    .optional(),
})

/**
 * Campaign Targeting Schema
 */
export const campaignTargetingSchema = z.object({
  contactIds: z.array(z.string()).optional(),
  filters: contactFilterSchema.optional(),
  excludeIds: z.array(z.string()).optional(),
  maxContacts: z.number().int().min(1).optional(),
})

/**
 * Sending Window Schema
 */
export const sendingWindowSchema = z.object({
  days: z.array(z.number().int().min(0).max(6)).min(1),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23),
})

/**
 * Throttle Schema
 */
export const throttleSchema = z.object({
  perHour: z.number().int().min(1).optional(),
  perDay: z.number().int().min(1).optional(),
  perDomain: z.number().int().min(1).optional(),
})

/**
 * Campaign Schedule Schema
 */
export const campaignScheduleSchema = z.object({
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  sendingWindow: sendingWindowSchema.optional(),
  throttle: throttleSchema.optional(),
  timezone: z.string().default('UTC'),
})

/**
 * Campaign Config Schema
 */
export const campaignConfigSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  domainId: z.string().min(1),
  sequences: z.array(sequenceStepSchema).min(1),
  targeting: campaignTargetingSchema,
  schedule: campaignScheduleSchema.optional(),
  unsubscribeUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
})

/**
 * Create Campaign Request Schema
 */
export const createCampaignRequestSchema = z.object({
  config: campaignConfigSchema,
})

/**
 * Update Campaign Request Schema
 */
export const updateCampaignRequestSchema = z.object({
  id: z.string().min(1),
  updates: campaignConfigSchema.partial(),
})

/**
 * Start Campaign Request Schema
 */
export const startCampaignRequestSchema = z.object({
  id: z.string().min(1),
  startAt: z.string().optional(),
})

/**
 * Pause Campaign Request Schema
 */
export const pauseCampaignRequestSchema = z.object({
  id: z.string().min(1),
})

/**
 * Resume Campaign Request Schema
 */
export const resumeCampaignRequestSchema = z.object({
  id: z.string().min(1),
})

/**
 * Delete Campaign Request Schema
 */
export const deleteCampaignRequestSchema = z.object({
  id: z.string().min(1),
})

/**
 * List Campaigns Request Schema
 */
export const listCampaignsRequestSchema = z.object({
  status: z.array(campaignStatusSchema).optional(),
  domainId: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  search: z.string().optional(),
})

/**
 * Get Campaign Stats Request Schema
 */
export const getCampaignStatsRequestSchema = z.object({
  id: z.string().min(1),
  includeABTests: z.boolean().default(true),
})

/**
 * Process Contact Request Schema
 */
export const processContactRequestSchema = z.object({
  campaignId: z.string().min(1),
  contactId: z.string().min(1),
})
