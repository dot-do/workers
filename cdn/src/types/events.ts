/**
 * Content Supply Chain Event Types
 * EPCIS 2.0 inspired event model for digital content lifecycle
 */

import { z } from 'zod'

// Base event schema (EPCIS-inspired)
export const BaseEventSchema = z.object({
  id: z.string(),
  eventType: z.enum(['creation', 'edit', 'approval', 'publish', 'distribution', 'consumption', 'archive']),
  contentId: z.string(),
  timestamp: z.number(),
  actorId: z.string(),
  actorType: z.enum(['human', 'ai', 'system']),

  // EPCIS core fields
  action: z.enum(['observe', 'add', 'delete', 'modify']),
  bizStep: z.string().optional(), // business step: creating, reviewing, publishing
  disposition: z.string().optional(), // in_progress, active, inactive

  // Location context (adapted for digital content)
  readPoint: z.string().optional(), // where: cms, api, website, mobile
  bizLocation: z.string().optional(), // org unit: editorial, marketing

  // Event metadata
  version: z.number().optional(),
  changes: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
})

export type BaseEvent = z.infer<typeof BaseEventSchema>

// Creation event - content is born
export const CreationEventSchema = BaseEventSchema.extend({
  eventType: z.literal('creation'),
  action: z.literal('add'),
  contentType: z.enum(['article', 'video', 'image', 'code', 'document']),
  title: z.string(),
  creatorType: z.enum(['human', 'ai', 'hybrid']),
  aiModel: z.string().optional(),
  initialContent: z.string().optional(),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    language: z.string().optional(),
  }).optional(),
})

export type CreationEvent = z.infer<typeof CreationEventSchema>

// Edit event - content is modified
export const EditEventSchema = BaseEventSchema.extend({
  eventType: z.literal('edit'),
  action: z.literal('modify'),
  previousVersion: z.number(),
  newVersion: z.number(),
  changes: z.object({
    title: z.boolean().optional(),
    content: z.boolean().optional(),
    metadata: z.boolean().optional(),
    media: z.boolean().optional(),
    diff: z.string().optional(), // text diff
  }),
  editType: z.enum(['minor', 'major', 'revision']),
})

export type EditEvent = z.infer<typeof EditEventSchema>

// Approval event - content passes review
export const ApprovalEventSchema = BaseEventSchema.extend({
  eventType: z.literal('approval'),
  action: z.literal('observe'),
  workflowId: z.string(),
  workflowType: z.enum(['editorial', 'legal', 'compliance', 'technical']),
  decision: z.enum(['approved', 'rejected', 'needs_revision']),
  approverRole: z.string(),
  comments: z.string().optional(),
  metadata: z.object({
    checklistItems: z.array(z.object({
      item: z.string(),
      passed: z.boolean(),
    })).optional(),
  }).optional(),
})

export type ApprovalEvent = z.infer<typeof ApprovalEventSchema>

// Publish event - content goes live
export const PublishEventSchema = BaseEventSchema.extend({
  eventType: z.literal('publish'),
  action: z.literal('modify'),
  disposition: z.literal('active'),
  scheduledTime: z.number().optional(),
  actualTime: z.number(),
  publishType: z.enum(['immediate', 'scheduled', 'updated']),
  metadata: z.object({
    seo: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      keywords: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
})

export type PublishEvent = z.infer<typeof PublishEventSchema>

// Distribution event - content sent to channel
export const DistributionEventSchema = BaseEventSchema.extend({
  eventType: z.literal('distribution'),
  action: z.literal('add'),
  channelId: z.string(),
  channelType: z.enum(['website', 'mobile_app', 'api', 'social', 'email', 'newsletter']),
  platform: z.string().optional(), // twitter, linkedin, etc.
  distributionUrl: z.string().optional(),
  status: z.enum(['scheduled', 'published', 'failed', 'retracted']),
  metadata: z.object({
    scheduledTime: z.number().optional(),
    publishedTime: z.number().optional(),
    customizations: z.record(z.any()).optional(), // channel-specific tweaks
  }).optional(),
})

export type DistributionEvent = z.infer<typeof DistributionEventSchema>

// Consumption event - user interacts with content
export const ConsumptionEventSchema = BaseEventSchema.extend({
  eventType: z.literal('consumption'),
  action: z.literal('observe'),
  channelId: z.string().optional(),
  consumerId: z.string().optional(), // user ID if authenticated
  consumerType: z.enum(['human', 'bot', 'crawler']),
  interactionType: z.enum(['view', 'click', 'share', 'comment', 'download', 'complete']),
  timeSpent: z.number().optional(), // seconds
  completionRate: z.number().optional(), // 0.0-1.0
  metadata: z.object({
    deviceType: z.string().optional(),
    referrer: z.string().optional(),
    location: z.string().optional(), // geographic
    sessionId: z.string().optional(),
  }).optional(),
})

export type ConsumptionEvent = z.infer<typeof ConsumptionEventSchema>

// Archive event - content removed from active use
export const ArchiveEventSchema = BaseEventSchema.extend({
  eventType: z.literal('archive'),
  action: z.literal('delete'),
  disposition: z.literal('inactive'),
  reason: z.enum(['outdated', 'superseded', 'policy_violation', 'expired', 'requested']),
  retentionPeriod: z.number().optional(), // days to keep in archive
  metadata: z.object({
    supersededBy: z.string().optional(), // new content ID
    archiveLocation: z.string().optional(),
  }).optional(),
})

export type ArchiveEvent = z.infer<typeof ArchiveEventSchema>

// Union type for all events
export const ContentEventSchema = z.discriminatedUnion('eventType', [
  CreationEventSchema,
  EditEventSchema,
  ApprovalEventSchema,
  PublishEventSchema,
  DistributionEventSchema,
  ConsumptionEventSchema,
  ArchiveEventSchema,
])

export type ContentEvent = z.infer<typeof ContentEventSchema>

// Event envelope for storage and transmission
export const EventEnvelopeSchema = z.object({
  envelope: z.object({
    version: z.string().default('1.0'),
    timestamp: z.number(),
    source: z.string(), // system that generated the event
    correlationId: z.string().optional(), // for tracing related events
  }),
  event: ContentEventSchema,
})

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>
