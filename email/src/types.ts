/**
 * Email Service Types
 *
 * Type definitions for email service including providers, messages, and templates
 */

// ============================================================================
// Email Message Types
// ============================================================================

export interface Attachment {
  filename: string
  content: string | ArrayBuffer // base64 string or binary
  contentType?: string
  encoding?: 'base64' | 'binary'
}

export interface EmailAddress {
  email: string
  name?: string
}

export interface EmailMessage {
  to: string | string[] | EmailAddress | EmailAddress[]
  from: string | EmailAddress
  subject: string
  html?: string
  text?: string
  cc?: string | string[] | EmailAddress | EmailAddress[]
  bcc?: string | string[] | EmailAddress | EmailAddress[]
  replyTo?: string | EmailAddress
  attachments?: Attachment[]
  headers?: Record<string, string>
  tags?: Record<string, string>
}

export interface EmailResult {
  id: string
  provider: string
  status: 'sent' | 'queued' | 'failed'
  providerId?: string
  error?: string
  timestamp: string
}

export interface EmailStatus {
  id: string
  providerId: string
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'complained'
  sentAt?: string
  deliveredAt?: string
  openedAt?: string
  clickedAt?: string
  bouncedAt?: string
  error?: string
  recipient: string
}

// ============================================================================
// Email Provider Interface
// ============================================================================

export interface EmailProvider {
  name: string
  send(message: EmailMessage): Promise<EmailResult>
  getStatus?(id: string): Promise<EmailStatus | null>
}

// ============================================================================
// Template Types
// ============================================================================

export interface TemplateData {
  [key: string]: any
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export type TemplateRenderer = (data: TemplateData) => RenderedEmail

export interface Template {
  name: string
  description: string
  requiredFields: string[]
  render: TemplateRenderer
}

// ============================================================================
// Template-Specific Data Types
// ============================================================================

export interface WelcomeData {
  name: string
  loginUrl: string
  companyName?: string
}

export interface PasswordResetData {
  name: string
  resetUrl: string
  expiresIn?: string
}

export interface MagicLinkData {
  name?: string
  loginUrl: string
  expiresIn?: string
  ipAddress?: string
}

export interface ApiKeyData {
  name: string
  apiKey: string
  createdAt: string
  expiresAt?: string
}

export interface InviteData {
  inviterName: string
  organizationName: string
  inviteUrl: string
  role?: string
  expiresIn?: string
}

export interface NotificationData {
  title: string
  message: string
  actionUrl?: string
  actionText?: string
}

export interface VerificationData {
  name: string
  verificationUrl: string
  code?: string
  expiresIn?: string
}

// ============================================================================
// Database Types
// ============================================================================

export interface EmailLog {
  id: string
  userId?: string
  recipient: string
  subject: string
  template?: string
  provider: string
  providerId?: string
  status: string
  error?: string
  sentAt: string
  deliveredAt?: string
  openedAt?: string
  clickedAt?: string
  bouncedAt?: string
}

// ============================================================================
// Service Options
// ============================================================================

export interface SendOptions {
  provider?: 'resend' | 'sendgrid' | 'workos' | 'cloudflare' | 'ses'
  userId?: string
  trackOpens?: boolean
  trackClicks?: boolean
}

export interface SendTemplateOptions extends SendOptions {
  template: string
  to: string | string[]
  data: TemplateData
  from?: string
}

export interface ListEmailsOptions {
  userId?: string
  limit?: number
  offset?: number
  status?: string
  template?: string
}
