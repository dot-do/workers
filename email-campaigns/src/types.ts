/**
 * Email Campaigns Service Types
 */

/**
 * Campaign Status
 */
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived'

/**
 * Sequence Step Status
 */
export type StepStatus = 'pending' | 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'unsubscribed' | 'failed'

/**
 * A/B Test Status
 */
export type ABTestStatus = 'pending' | 'running' | 'completed' | 'cancelled'

/**
 * Campaign Sequence Step
 */
export interface SequenceStep {
  id: string
  order: number
  delay: number // hours after previous step (0 for first step)
  subject: string
  html: string
  text?: string
  trackOpens?: boolean
  trackClicks?: boolean
  abTests?: ABTest[]
}

/**
 * A/B Test Configuration
 */
export interface ABTest {
  id: string
  name: string
  variants: ABTestVariant[]
  status: ABTestStatus
  winnerCriteria: 'open_rate' | 'click_rate' | 'reply_rate'
  sampleSize: number // contacts per variant
  startedAt?: string
  completedAt?: string
  winnerId?: string
}

/**
 * A/B Test Variant
 */
export interface ABTestVariant {
  id: string
  name: string
  subject?: string
  html?: string
  text?: string
  weight: number // 0-100, must sum to 100 across variants
  sent: number
  opened: number
  clicked: number
  replied: number
}

/**
 * Campaign Targeting
 */
export interface CampaignTargeting {
  contactIds?: string[] // Explicit list of contact IDs
  filters?: ContactFilter // Dynamic filtering
  excludeIds?: string[] // Contacts to exclude
  maxContacts?: number // Limit total contacts
}

/**
 * Contact Filter
 */
export interface ContactFilter {
  tags?: string[]
  status?: string[]
  validationScore?: { min?: number; max?: number }
  engagementScore?: { min?: number; max?: number }
  company?: { name?: string; industry?: string; size?: string }
  location?: { country?: string; state?: string; city?: string }
}

/**
 * Campaign Schedule
 */
export interface CampaignSchedule {
  startAt?: string // ISO 8601 timestamp
  endAt?: string // ISO 8601 timestamp
  sendingWindow?: SendingWindow
  throttle?: Throttle
  timezone?: string // IANA timezone (e.g., 'America/New_York')
}

/**
 * Sending Window
 */
export interface SendingWindow {
  days: number[] // 0-6 (Sunday-Saturday)
  startHour: number // 0-23
  endHour: number // 0-23
}

/**
 * Throttle Configuration
 */
export interface Throttle {
  perHour?: number
  perDay?: number
  perDomain?: number // Limit per email domain
}

/**
 * Campaign Configuration
 */
export interface CampaignConfig {
  name: string
  description?: string
  domainId: string
  sequences: SequenceStep[]
  targeting: CampaignTargeting
  schedule?: CampaignSchedule
  unsubscribeUrl?: string
  metadata?: Record<string, unknown>
}

/**
 * Campaign
 */
export interface Campaign {
  id: string
  name: string
  description?: string
  domainId: string
  status: CampaignStatus
  sequences: SequenceStep[]
  targeting: CampaignTargeting
  schedule?: CampaignSchedule
  unsubscribeUrl?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
}

/**
 * Contact Progress in Campaign
 */
export interface ContactProgress {
  campaignId: string
  contactId: string
  currentStep: number // 0-based index
  status: StepStatus
  sentCount: number
  openedCount: number
  clickedCount: number
  repliedCount: number
  lastSentAt?: string
  lastOpenedAt?: string
  lastClickedAt?: string
  lastRepliedAt?: string
  completedAt?: string
  unsubscribedAt?: string
  metadata?: Record<string, unknown>
}

/**
 * Campaign Statistics
 */
export interface CampaignStats {
  campaignId: string
  contacts: {
    total: number
    pending: number
    active: number
    completed: number
    unsubscribed: number
    bounced: number
  }
  emails: {
    sent: number
    delivered: number
    opened: number
    clicked: number
    replied: number
    bounced: number
    failed: number
  }
  rates: {
    deliveryRate: number // delivered / sent
    openRate: number // opened / delivered
    clickRate: number // clicked / delivered
    replyRate: number // replied / delivered
    bounceRate: number // bounced / sent
    unsubscribeRate: number // unsubscribed / delivered
  }
  sequences: SequenceStepStats[]
  abTests?: ABTestStats[]
}

/**
 * Sequence Step Statistics
 */
export interface SequenceStepStats {
  stepId: string
  order: number
  sent: number
  opened: number
  clicked: number
  replied: number
  bounced: number
  openRate: number
  clickRate: number
  replyRate: number
}

/**
 * A/B Test Statistics
 */
export interface ABTestStats {
  testId: string
  name: string
  status: ABTestStatus
  variants: ABTestVariant[]
  winnerId?: string
}

/**
 * Create Campaign Request
 */
export interface CreateCampaignRequest {
  config: CampaignConfig
}

/**
 * Update Campaign Request
 */
export interface UpdateCampaignRequest {
  id: string
  updates: Partial<CampaignConfig>
}

/**
 * Start Campaign Request
 */
export interface StartCampaignRequest {
  id: string
  startAt?: string // Optional delayed start
}

/**
 * Pause Campaign Request
 */
export interface PauseCampaignRequest {
  id: string
}

/**
 * Resume Campaign Request
 */
export interface ResumeCampaignRequest {
  id: string
}

/**
 * Delete Campaign Request
 */
export interface DeleteCampaignRequest {
  id: string
}

/**
 * List Campaigns Request
 */
export interface ListCampaignsRequest {
  status?: CampaignStatus[]
  domainId?: string
  limit?: number
  offset?: number
  search?: string
}

/**
 * List Campaigns Response
 */
export interface ListCampaignsResponse {
  campaigns: Campaign[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

/**
 * Get Campaign Stats Request
 */
export interface GetCampaignStatsRequest {
  id: string
  includeABTests?: boolean
}

/**
 * Process Contact Request
 */
export interface ProcessContactRequest {
  campaignId: string
  contactId: string
}

/**
 * Process Contact Response
 */
export interface ProcessContactResponse {
  campaignId: string
  contactId: string
  currentStep: number
  status: StepStatus
  nextSendAt?: string
  completed: boolean
}

/**
 * Environment Bindings
 */
export interface Env {
  // Service Bindings
  DB?: any // Database service
  EMAIL_SENDER?: any // Email sender service
  EMAIL?: any // Email service (cold email)

  // KV Namespace
  KV?: KVNamespace

  // Queue
  CAMPAIGN_QUEUE?: Queue

  // Environment
  ENVIRONMENT?: string
}
