/**
 * Waitlist & Beta Management Service Types
 */

export interface Env {
  DB: D1Database
  KV: KVNamespace
  EMAIL_SERVICE: any
  ANALYTICS_SERVICE: any
  AUTH_SERVICE: any
  WAITLIST_QUEUE: Queue
}

// ============================================================================
// Waitlist Entry
// ============================================================================

export interface WaitlistEntry {
  id: string // ULID
  email: string
  name?: string
  company?: string
  role?: string
  useCase?: string
  source?: string // utm_source
  referralCode?: string // Who referred them
  priorityScore: number // 0-100 (higher = earlier access)
  metadata?: Record<string, any>
  status: WaitlistStatus
  signedUpAt: string // ISO timestamp
  invitedAt?: string // ISO timestamp
  convertedAt?: string // ISO timestamp (accepted invite)
  createdAt: string
  updatedAt: string
}

export type WaitlistStatus = 'pending' | 'invited' | 'accepted' | 'rejected' | 'expired'

export interface AddToWaitlistRequest {
  email: string
  name?: string
  company?: string
  role?: string
  useCase?: string
  source?: string
  referralCode?: string
  metadata?: Record<string, any>
}

export interface WaitlistAnalytics {
  total: number
  byStatus: Record<WaitlistStatus, number>
  bySource: Record<string, number>
  averagePriorityScore: number
  conversionRate: number // invited → accepted
  topReferrers: Array<{ referralCode: string; count: number }>
}

// ============================================================================
// Beta Invitation
// ============================================================================

export interface BetaInvitation {
  id: string // ULID
  waitlistEntryId: string
  inviteCode: string // Unique redemption code
  email: string
  name?: string
  status: InvitationStatus
  sentAt?: string // ISO timestamp
  expiresAt: string // ISO timestamp
  acceptedAt?: string // ISO timestamp
  rejectedAt?: string // ISO timestamp
  reminderSentAt?: string // ISO timestamp
  createdAt: string
  updatedAt: string
}

export type InvitationStatus = 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired'

export interface GenerateInvitesRequest {
  count: number // Number of invites to generate
  priorityThreshold?: number // Minimum priority score (default: 0)
  excludeStatuses?: WaitlistStatus[] // Skip these statuses
  dryRun?: boolean // Preview without sending
}

export interface GenerateInvitesResponse {
  invitations: BetaInvitation[]
  dryRun: boolean
  summary: {
    generated: number
    sent: number
    failed: number
  }
}

export interface CheckInviteRequest {
  inviteCode: string
}

export interface CheckInviteResponse {
  valid: boolean
  invitation?: BetaInvitation
  error?: string
}

export interface AcceptInviteRequest {
  inviteCode: string
  userId?: string // Link to created user account
}

// ============================================================================
// Priority Scoring
// ============================================================================

export interface PriorityFactors {
  hasReferral: boolean // +20 points
  earlySignup: boolean // First 100 signups: +15 points
  hasCompany: boolean // +10 points
  hasUseCase: boolean // +10 points
  sourceValue: number // 0-20 points based on source quality
  referralCount: number // +5 points per referral made (up to 25)
}

export interface PriorityScoreBreakdown {
  totalScore: number
  factors: PriorityFactors
  breakdown: Record<string, number>
}

// ============================================================================
// Queue Messages
// ============================================================================

export interface SendInvitationMessage {
  type: 'send_invitation'
  invitationId: string
}

export interface SendReminderMessage {
  type: 'send_reminder'
  invitationId: string
}

export interface ExpireInvitationsMessage {
  type: 'expire_invitations'
}

export type WaitlistQueueMessage = SendInvitationMessage | SendReminderMessage | ExpireInvitationsMessage

// ============================================================================
// Email Templates
// ============================================================================

export interface WaitlistEmailData {
  email: string
  name?: string
  position?: number // Position in waitlist
  totalWaitlist?: number
}

export interface InvitationEmailData {
  email: string
  name?: string
  inviteCode: string
  inviteUrl: string
  expiresAt: string
}

export interface ReminderEmailData {
  email: string
  name?: string
  inviteCode: string
  inviteUrl: string
  expiresIn: string // "2 days"
}
