/**
 * Waitlist & Beta Management Validation Schemas
 */

import { z } from 'zod'

// ============================================================================
// Waitlist Schemas
// ============================================================================

export const waitlistStatusSchema = z.enum(['pending', 'invited', 'accepted', 'rejected', 'expired'])

export const addToWaitlistSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  useCase: z.string().min(10, 'Use case must be at least 10 characters').max(500).optional(),
  source: z.string().optional(),
  referralCode: z.string().min(6).max(20).optional(),
  metadata: z.record(z.any()).optional(),
})

export const waitlistEntrySchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  useCase: z.string().optional(),
  source: z.string().optional(),
  referralCode: z.string().optional(),
  priorityScore: z.number().min(0).max(100),
  metadata: z.record(z.any()).optional(),
  status: waitlistStatusSchema,
  signedUpAt: z.string().datetime(),
  invitedAt: z.string().datetime().optional(),
  convertedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ============================================================================
// Beta Invitation Schemas
// ============================================================================

export const invitationStatusSchema = z.enum(['pending', 'sent', 'accepted', 'rejected', 'expired'])

export const generateInvitesSchema = z.object({
  count: z.number().int().min(1).max(1000, 'Cannot generate more than 1000 invites at once'),
  priorityThreshold: z.number().min(0).max(100).optional().default(0),
  excludeStatuses: z.array(waitlistStatusSchema).optional(),
  dryRun: z.boolean().optional().default(false),
})

export const checkInviteSchema = z.object({
  inviteCode: z.string().min(8).max(32),
})

export const acceptInviteSchema = z.object({
  inviteCode: z.string().min(8).max(32),
  userId: z.string().optional(),
})

export const betaInvitationSchema = z.object({
  id: z.string(),
  waitlistEntryId: z.string(),
  inviteCode: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  status: invitationStatusSchema,
  sentAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime(),
  acceptedAt: z.string().datetime().optional(),
  rejectedAt: z.string().datetime().optional(),
  reminderSentAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ============================================================================
// Query Schemas
// ============================================================================

export const getWaitlistSchema = z.object({
  status: waitlistStatusSchema.optional(),
  source: z.string().optional(),
  minPriority: z.number().min(0).max(100).optional(),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
  sortBy: z.enum(['priorityScore', 'signedUpAt', 'email']).optional().default('priorityScore'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const getInvitationsSchema = z.object({
  status: invitationStatusSchema.optional(),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
})
