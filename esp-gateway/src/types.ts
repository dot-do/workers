// ESP Gateway Service Types

export type ESPProvider = 'mailgun' | 'sendgrid' | 'postmark' | 'amazon-ses' | 'resend'

export interface EmailMessage {
  from: string // email or "Name <email>"
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  subject: string
  html?: string
  text?: string
  attachments?: Attachment[]
  headers?: Record<string, string>
  tags?: string[]
  metadata?: Record<string, any>
}

export interface Attachment {
  filename: string
  content: string // base64 encoded
  contentType: string
  disposition?: 'attachment' | 'inline'
  contentId?: string // for inline images
}

export interface SendResult {
  success: boolean
  provider: ESPProvider
  messageId: string
  error?: string
  metadata?: Record<string, any>
}

export interface ESPConfig {
  provider: ESPProvider
  apiKey: string
  domain?: string // For Mailgun, SendGrid sender domain
  endpoint?: string // Custom API endpoint
  enabled: boolean
  priority: number // 1-10, higher = preferred
  rateLimit: number // requests per minute
  dailyLimit?: number // emails per day
  cost: number // cost per 1000 emails (for routing optimization)
}

export interface ESPHealth {
  provider: ESPProvider
  healthy: boolean
  lastCheck: number
  consecutiveFailures: number
  currentRate: number // emails sent this minute
  dailyCount: number // emails sent today
}

export interface SendOptions {
  provider?: ESPProvider // Force specific provider
  fallback?: boolean // Allow fallback to other providers
  tracking?: {
    opens?: boolean
    clicks?: boolean
    unsubscribe?: boolean
  }
  scheduledAt?: number // Unix timestamp for scheduled sending
}

export interface BulkSendRequest {
  messages: EmailMessage[]
  options?: SendOptions
}

export interface BulkSendResult {
  sent: SendResult[]
  failed: SendResult[]
  summary: {
    total: number
    success: number
    failed: number
    byProvider: Record<ESPProvider, number>
  }
}

// Env bindings
export interface Env {
  DB: any // Database service
  KV: KVNamespace // Cache ESP health and configs
  QUEUE: Queue // For async sending

  // ESP API Keys (set via wrangler secret put)
  MAILGUN_API_KEY?: string
  MAILGUN_DOMAIN?: string
  SENDGRID_API_KEY?: string
  POSTMARK_API_KEY?: string
  AWS_ACCESS_KEY_ID?: string
  AWS_SECRET_ACCESS_KEY?: string
  AWS_REGION?: string
  RESEND_API_KEY?: string
}
