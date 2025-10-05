/**
 * Content Supply Chain Content Types
 */

import { z } from 'zod'

// Content metadata
export const ContentMetadataSchema = z.object({
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  language: z.string().default('en'),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    image: z.string().optional(),
  }).optional(),
  custom: z.record(z.any()).optional(),
})

export type ContentMetadata = z.infer<typeof ContentMetadataSchema>

// Content provenance entry
export const ProvenanceEntrySchema = z.object({
  id: z.string(),
  contentId: z.string(),
  creatorId: z.string(),
  creatorType: z.enum(['human', 'ai_model', 'ai_tool']),
  creatorName: z.string(),
  role: z.enum(['author', 'editor', 'contributor', 'ai_assistant', 'reviewer']),
  contributionType: z.enum(['original', 'edit', 'translation', 'enhancement', 'review']),
  timestamp: z.number(),
  metadata: z.object({
    aiModel: z.string().optional(),
    modelVersion: z.string().optional(),
    prompt: z.string().optional(),
    temperature: z.number().optional(),
    tokensUsed: z.number().optional(),
  }).optional(),
})

export type ProvenanceEntry = z.infer<typeof ProvenanceEntrySchema>

// AI disclosure
export const AIDisclosureSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  aiGenerated: z.boolean().default(false),
  aiAssisted: z.boolean().default(false),
  aiModels: z.array(z.object({
    name: z.string(),
    version: z.string().optional(),
    purpose: z.string(), // generation, editing, translation, etc.
  })).optional(),
  humanReview: z.boolean().default(false),
  disclosureText: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  metadata: z.object({
    gdprCompliant: z.boolean().optional(),
    aiActCompliant: z.boolean().optional(),
    disclosureVersion: z.string().optional(),
  }).optional(),
})

export type AIDisclosure = z.infer<typeof AIDisclosureSchema>

// License information
export const LicenseSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  license: z.string(), // CC-BY, CC-BY-SA, proprietary, etc.
  sourceLicense: z.string().optional(),
  effectiveDate: z.number(),
  expirationDate: z.number().optional(),
  constraints: z.object({
    commercial: z.boolean().optional(),
    derivatives: z.boolean().optional(),
    attribution: z.boolean().optional(),
    shareAlike: z.boolean().optional(),
  }).optional(),
  attributions: z.array(z.object({
    name: z.string(),
    url: z.string().optional(),
    license: z.string().optional(),
  })).optional(),
})

export type License = z.infer<typeof LicenseSchema>

// Content entity
export const ContentSchema = z.object({
  id: z.string(),
  type: z.enum(['article', 'video', 'image', 'code', 'document']),
  title: z.string(),
  status: z.enum(['draft', 'review', 'approved', 'published', 'archived']),
  creatorId: z.string(),
  creatorType: z.enum(['human', 'ai', 'hybrid']),
  aiModel: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  publishedAt: z.number().optional(),
  archivedAt: z.number().optional(),
  version: z.number().default(1),
  metadata: ContentMetadataSchema.optional(),
  license: z.string().optional(),
  sourceContentId: z.string().optional(),
})

export type Content = z.infer<typeof ContentSchema>

// Distribution channel
export const DistributionChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['website', 'mobile_app', 'api', 'social', 'email', 'newsletter']),
  platform: z.string().optional(), // twitter, linkedin, etc.
  config: z.record(z.any()).optional(),
  createdAt: z.number(),
  active: z.boolean().default(true),
})

export type DistributionChannel = z.infer<typeof DistributionChannelSchema>

// Content distribution
export const ContentDistributionSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  channelId: z.string(),
  status: z.enum(['scheduled', 'published', 'failed', 'retracted']),
  scheduledAt: z.number().optional(),
  publishedAt: z.number().optional(),
  retractedAt: z.number().optional(),
  distributionUrl: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export type ContentDistribution = z.infer<typeof ContentDistributionSchema>

// Approval workflow
export const ApprovalWorkflowSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  workflowType: z.enum(['editorial', 'legal', 'compliance', 'technical']),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  requiredApprovers: z.array(z.string()),
  approvals: z.array(z.object({
    approverId: z.string(),
    decision: z.enum(['approved', 'rejected', 'needs_revision']),
    timestamp: z.number(),
    comments: z.string().optional(),
  })),
  createdAt: z.number(),
  completedAt: z.number().optional(),
  metadata: z.record(z.any()).optional(),
})

export type ApprovalWorkflow = z.infer<typeof ApprovalWorkflowSchema>

// Content relationship (graph)
export const ContentRelationshipSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  relationshipType: z.enum(['references', 'derived_from', 'translates', 'updates', 'supersedes']),
  strength: z.number().min(0).max(1).optional(),
  createdAt: z.number(),
  metadata: z.record(z.any()).optional(),
})

export type ContentRelationship = z.infer<typeof ContentRelationshipSchema>

// Consumption analytics
export const ConsumptionAnalyticsSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  channelId: z.string().optional(),
  date: z.string(), // YYYY-MM-DD
  views: z.number().default(0),
  uniqueViewers: z.number().default(0),
  timeSpent: z.number().default(0), // seconds
  interactions: z.number().default(0),
  completions: z.number().default(0),
  metadata: z.object({
    avgTimeSpent: z.number().optional(),
    avgCompletionRate: z.number().optional(),
    topReferrers: z.array(z.string()).optional(),
    deviceBreakdown: z.record(z.number()).optional(),
  }).optional(),
})

export type ConsumptionAnalytics = z.infer<typeof ConsumptionAnalyticsSchema>
