/**
 * Referral Program Service Types
 */

export interface Env {
  DB: D1Database
  KV: KVNamespace
  EMAIL_SERVICE: any
  ANALYTICS_SERVICE: any
  AUTH_SERVICE: any
  WAITLIST_SERVICE: any
  REFERRAL_QUEUE: Queue
}

// ============================================================================
// Referral Code
// ============================================================================

export interface ReferralCode {
  id: string // ULID
  userId: string // User who owns this code
  code: string // Unique referral code
  email: string // User's email (for easy lookup)
  name?: string
  status: ReferralCodeStatus
  referralCount: number // Total referrals
  successfulReferrals: number // Converted referrals
  creditsEarned: number // Total rewards earned
  tier: ReferralTier
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export type ReferralCodeStatus = 'active' | 'inactive' | 'suspended'

export type ReferralTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export interface GenerateReferralCodeRequest {
  userId: string
  email: string
  name?: string
  customCode?: string // Optional custom code
}

// ============================================================================
// Referral
// ============================================================================

export interface Referral {
  id: string // ULID
  referralCodeId: string // FK to referral_codes
  referrerUserId: string // User who referred
  referredUserId?: string // User who was referred (after signup)
  referredEmail: string // Email of referred user
  status: ReferralStatus
  source?: string // Where referral came from (waitlist, signup, etc.)
  referredAt: string // When referral was created
  convertedAt?: string // When referred user signed up
  creditedAt?: string // When reward was credited
  rewardAmount: number // Credits awarded
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export type ReferralStatus = 'pending' | 'converted' | 'credited' | 'rejected' | 'fraudulent'

export interface TrackReferralRequest {
  referralCode: string
  referredEmail: string
  source?: string
  metadata?: Record<string, any>
}

export interface ConvertReferralRequest {
  referredEmail: string
  referredUserId: string
}

// ============================================================================
// Rewards
// ============================================================================

export interface RewardDistribution {
  id: string // ULID
  referralId: string
  referrerUserId: string
  rewardType: RewardType
  amount: number // Credits or bonus amount
  status: RewardStatus
  distributedAt?: string
  redeemedAt?: string
  expiresAt?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export type RewardType = 'referral_credit' | 'tier_bonus' | 'milestone_bonus' | 'special_promotion'

export type RewardStatus = 'pending' | 'distributed' | 'redeemed' | 'expired' | 'cancelled'

export interface RewardConfig {
  referralCredit: number // Base credit per referral
  tierBonuses: Record<ReferralTier, number> // Bonus multiplier by tier
  milestones: MilestoneConfig[]
}

export interface MilestoneConfig {
  count: number // Number of referrals
  bonus: number // Bonus credits
  title: string
}

// ============================================================================
// Leaderboard
// ============================================================================

export interface LeaderboardEntry {
  rank: number
  userId: string
  email: string
  name?: string
  referralCount: number
  creditsEarned: number
  tier: ReferralTier
  badge?: string
}

export interface GetLeaderboardRequest {
  timeframe?: 'day' | 'week' | 'month' | 'alltime'
  limit?: number
  offset?: number
}

// ============================================================================
// Analytics
// ============================================================================

export interface ReferralAnalytics {
  totalReferrals: number
  totalConverted: number
  conversionRate: number // %
  viralCoefficient: number // referrals per user
  totalCreditsDistributed: number
  averageRewardPerReferral: number
  byStatus: Record<ReferralStatus, number>
  bySource: Record<string, number>
  byTier: Record<ReferralTier, number>
  topReferrers: LeaderboardEntry[]
}

export interface UserReferralStats {
  userId: string
  email: string
  referralCode: string
  totalReferrals: number
  successfulReferrals: number
  pendingReferrals: number
  conversionRate: number
  creditsEarned: number
  tier: ReferralTier
  nextTierAt: number // Referrals needed for next tier
  recentReferrals: Referral[]
}

// ============================================================================
// Fraud Detection
// ============================================================================

export interface FraudCheckResult {
  isFraudulent: boolean
  confidence: number // 0-1
  reasons: string[]
  flags: FraudFlag[]
}

export interface FraudFlag {
  type: FraudFlagType
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
}

export type FraudFlagType =
  | 'same_ip'
  | 'same_device'
  | 'rapid_referrals'
  | 'disposable_email'
  | 'suspicious_pattern'
  | 'known_fraudster'
  | 'invalid_email'

// ============================================================================
// Queue Messages
// ============================================================================

export interface DistributeRewardMessage {
  type: 'distribute_reward'
  referralId: string
}

export interface CheckFraudMessage {
  type: 'check_fraud'
  referralId: string
}

export interface UpdateTierMessage {
  type: 'update_tier'
  userId: string
}

export type ReferralQueueMessage = DistributeRewardMessage | CheckFraudMessage | UpdateTierMessage

// ============================================================================
// Tier Configuration
// ============================================================================

export interface TierConfig {
  tier: ReferralTier
  minReferrals: number
  maxReferrals: number
  multiplier: number // Reward multiplier
  badge: string
  benefits: string[]
}

export const TIER_CONFIGS: TierConfig[] = [
  {
    tier: 'bronze',
    minReferrals: 0,
    maxReferrals: 4,
    multiplier: 1.0,
    badge: '🥉',
    benefits: ['Base referral credits'],
  },
  {
    tier: 'silver',
    minReferrals: 5,
    maxReferrals: 14,
    multiplier: 1.2,
    badge: '🥈',
    benefits: ['20% bonus credits', 'Priority support'],
  },
  {
    tier: 'gold',
    minReferrals: 15,
    maxReferrals: 29,
    multiplier: 1.5,
    badge: '🥇',
    benefits: ['50% bonus credits', 'Early feature access', 'Custom referral link'],
  },
  {
    tier: 'platinum',
    minReferrals: 30,
    maxReferrals: 49,
    multiplier: 2.0,
    badge: '💎',
    benefits: ['2x bonus credits', 'VIP support', 'Featured in leaderboard'],
  },
  {
    tier: 'diamond',
    minReferrals: 50,
    maxReferrals: Infinity,
    multiplier: 3.0,
    badge: '💎✨',
    benefits: ['3x bonus credits', 'Direct line to team', 'Affiliate partnership opportunity'],
  },
]
