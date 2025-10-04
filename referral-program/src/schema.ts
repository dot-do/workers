/**
 * Referral Program Validation Schemas
 */

import { z } from 'zod'

// ============================================================================
// Referral Code Schemas
// ============================================================================

export const referralCodeStatusSchema = z.enum(['active', 'inactive', 'suspended'])

export const referralTierSchema = z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond'])

export const generateReferralCodeSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).optional(),
  customCode: z
    .string()
    .min(4)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Code must be alphanumeric with hyphens/underscores only')
    .optional(),
})

export const referralCodeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  code: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  status: referralCodeStatusSchema,
  referralCount: z.number().int().min(0),
  successfulReferrals: z.number().int().min(0),
  creditsEarned: z.number().min(0),
  tier: referralTierSchema,
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ============================================================================
// Referral Schemas
// ============================================================================

export const referralStatusSchema = z.enum(['pending', 'converted', 'credited', 'rejected', 'fraudulent'])

export const trackReferralSchema = z.object({
  referralCode: z.string().min(4).max(50),
  referredEmail: z.string().email(),
  source: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export const convertReferralSchema = z.object({
  referredEmail: z.string().email(),
  referredUserId: z.string().min(1),
})

export const referralSchema = z.object({
  id: z.string(),
  referralCodeId: z.string(),
  referrerUserId: z.string(),
  referredUserId: z.string().optional(),
  referredEmail: z.string().email(),
  status: referralStatusSchema,
  source: z.string().optional(),
  referredAt: z.string().datetime(),
  convertedAt: z.string().datetime().optional(),
  creditedAt: z.string().datetime().optional(),
  rewardAmount: z.number().min(0),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ============================================================================
// Reward Schemas
// ============================================================================

export const rewardTypeSchema = z.enum(['referral_credit', 'tier_bonus', 'milestone_bonus', 'special_promotion'])

export const rewardStatusSchema = z.enum(['pending', 'distributed', 'redeemed', 'expired', 'cancelled'])

export const rewardDistributionSchema = z.object({
  id: z.string(),
  referralId: z.string(),
  referrerUserId: z.string(),
  rewardType: rewardTypeSchema,
  amount: z.number().min(0),
  status: rewardStatusSchema,
  distributedAt: z.string().datetime().optional(),
  redeemedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ============================================================================
// Query Schemas
// ============================================================================

export const getLeaderboardSchema = z.object({
  timeframe: z.enum(['day', 'week', 'month', 'alltime']).optional().default('alltime'),
  limit: z.number().int().min(1).max(100).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
})

export const getUserReferralsSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
  status: referralStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
})
