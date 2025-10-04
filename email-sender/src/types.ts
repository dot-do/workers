/**
 * Email Sender - Type Definitions
 * Comprehensive email sending with scheduling, rate limiting, and warmup
 */

export interface Env {
  // Environment variables
  ENVIRONMENT: string

  // Service bindings
  ESP_GATEWAY: any // ESP Gateway service
  EMAIL_VALIDATION: any // Email Validation service
  DNS_TOOLS: any // DNS Tools service (for domain validation)
  DB: any // Database service

  // KV namespace for caching
  EMAIL_SENDER_KV?: KVNamespace

  // Queue for async sending
  EMAIL_SEND_QUEUE?: Queue
}

/**
 * Email Send Request
 */
export interface SendEmailRequest {
  // Recipients
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]

  // Sender
  from: {
    email: string
    name?: string
  }
  replyTo?: string

  // Content
  subject: string
  html?: string
  text?: string

  // Attachments
  attachments?: EmailAttachment[]

  // Metadata
  tags?: string[]
  metadata?: Record<string, any>

  // Sending options
  options?: SendOptions
}

export interface EmailAttachment {
  filename: string
  content: string // Base64 encoded
  contentType: string
  size: number
}

export interface SendOptions {
  // Domain selection
  domainId?: string // Use specific domain

  // ESP selection
  provider?: string // Use specific ESP

  // Scheduling
  scheduledAt?: string // ISO 8601 timestamp
  timezone?: string

  // Sending strategy
  priority?: 'high' | 'normal' | 'low'
  batch?: boolean // Enable batching
  batchSize?: number // Max emails per batch

  // Tracking
  trackOpens?: boolean
  trackClicks?: boolean

  // Validation
  validateRecipients?: boolean
  skipInvalid?: boolean // Skip invalid emails instead of failing

  // Rate limiting
  respectWarmup?: boolean // Honor warmup schedule (default: true)
  respectRateLimits?: boolean // Honor rate limits (default: true)
}

/**
 * Email Send Result
 */
export interface SendEmailResult {
  success: boolean
  messageId?: string
  to: string | string[]
  from: string
  provider?: string
  status: 'sent' | 'queued' | 'scheduled' | 'failed' | 'rejected'
  statusMessage?: string
  scheduledAt?: string
  sentAt?: string
  error?: string
  validationErrors?: Record<string, string> // email -> error message
}

/**
 * Bulk Send Request
 */
export interface BulkSendRequest {
  emails: SendEmailRequest[]
  options?: BulkSendOptions
}

export interface BulkSendOptions {
  parallel?: boolean // Send in parallel (default: false)
  continueOnError?: boolean // Continue if one fails (default: true)
  batchSize?: number // Process in batches
  delayBetweenBatches?: number // Delay in ms
}

/**
 * Bulk Send Result
 */
export interface BulkSendResult {
  totalCount: number
  successCount: number
  failedCount: number
  queuedCount: number
  rejectedCount: number
  results: SendEmailResult[]
  totalTime: number
  errors: string[]
}

/**
 * Scheduled Email
 */
export interface ScheduledEmail {
  id: string
  request: SendEmailRequest
  scheduledAt: string
  timezone: string
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  attempts: number
  lastAttemptAt?: string
  sentAt?: string
  error?: string
  createdAt: string
  updatedAt: string
}

/**
 * Send Status Query
 */
export interface SendStatusQuery {
  messageId?: string
  email?: string
  domainId?: string
  campaignId?: string
  status?: 'sent' | 'queued' | 'scheduled' | 'failed' | 'rejected'
  from?: string
  to?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

/**
 * Send Status Result
 */
export interface SendStatusResult {
  messageId: string
  email: string
  from: string
  to: string
  subject: string
  status: 'sent' | 'delivered' | 'bounced' | 'opened' | 'clicked' | 'replied' | 'failed'
  provider: string
  domainId?: string
  campaignId?: string
  sentAt: string
  deliveredAt?: string
  openedAt?: string
  clickedAt?: string
  repliedAt?: string
  bouncedAt?: string
  bounceReason?: string
  error?: string
}

/**
 * Rate Limit Check
 */
export interface RateLimitCheck {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: string
  reason?: string
}

/**
 * Warmup Status
 */
export interface WarmupStatus {
  domainId: string
  status: 'not_started' | 'in_progress' | 'completed' | 'paused'
  currentDay: number
  dailyLimit: number
  sent: number
  remaining: number
  canSend: boolean
  resetAt: string
}

/**
 * Send Statistics
 */
export interface SendStats {
  period: string // e.g., "2025-10-03", "2025-W40", "2025-10"
  totalSent: number
  totalDelivered: number
  totalBounced: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  totalFailed: number
  deliveryRate: number
  openRate: number
  clickRate: number
  replyRate: number
  bounceRate: number
  byProvider: Record<string, number>
  byDomain: Record<string, number>
  byStatus: Record<string, number>
}
