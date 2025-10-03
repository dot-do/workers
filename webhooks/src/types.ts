// Environment bindings
export interface Env {
  // Secrets
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  WORKOS_API_KEY: string
  WORKOS_WEBHOOK_SECRET: string
  GITHUB_WEBHOOK_SECRET: string
  RESEND_WEBHOOK_SECRET: string

  // Service bindings
  DB: DatabaseService
  QUEUE: QueueService
}

// Database service interface
export interface DatabaseService {
  query(options: { sql: string; params?: any[] }): Promise<{ rows: any[]; columns: string[] }>
}

// Queue service interface
export interface QueueService {
  enqueue(message: QueueMessage): Promise<void>
}

export interface QueueMessage {
  type: string
  payload: any
}

// Webhook event stored in database
export interface WebhookEvent {
  id: string
  provider: 'stripe' | 'workos' | 'github' | 'resend'
  event_id: string
  event_type: string
  payload: string // JSON string
  signature?: string
  processed: boolean
  processed_at?: string
  error?: string
  created_at: string
}

// Stripe event types
export interface StripeEvent {
  id: string
  object: 'event'
  type: string
  created: number
  data: {
    object: any
  }
  livemode: boolean
}

export interface StripePaymentIntent {
  id: string
  object: 'payment_intent'
  amount: number
  currency: string
  status: string
  customer: string
  metadata: Record<string, string>
}

export interface StripeSubscription {
  id: string
  object: 'subscription'
  customer: string
  status: string
  items: {
    data: Array<{
      id: string
      price: { id: string }
    }>
  }
  metadata: Record<string, string>
}

export interface StripeInvoice {
  id: string
  object: 'invoice'
  customer: string
  subscription: string
  status: string
  amount_due: number
  currency: string
}

// WorkOS event types
export interface WorkOSEvent {
  id: string
  event: string
  data: any
  created_at: string
}

export interface WorkOSDirectorySync {
  id: string
  name: string
  organization_id: string
  state: 'active' | 'inactive' | 'deleting'
  type: string
}

export interface WorkOSUser {
  id: string
  email: string
  first_name?: string
  last_name?: string
  username?: string
  state: 'active' | 'inactive'
  custom_attributes: Record<string, any>
}

// GitHub event types
export interface GitHubPushEvent {
  ref: string
  before: string
  after: string
  repository: {
    id: number
    name: string
    full_name: string
  }
  pusher: {
    name: string
    email: string
  }
  commits: Array<{
    id: string
    message: string
    timestamp: string
    author: {
      name: string
      email: string
    }
  }>
}

export interface GitHubPullRequestEvent {
  action: 'opened' | 'closed' | 'reopened' | 'edited' | 'synchronize'
  number: number
  pull_request: {
    id: number
    title: string
    state: 'open' | 'closed'
    merged: boolean
    user: {
      login: string
    }
    head: {
      ref: string
      sha: string
    }
    base: {
      ref: string
      sha: string
    }
  }
  repository: {
    id: number
    name: string
    full_name: string
  }
}

export interface GitHubIssueEvent {
  action: 'opened' | 'closed' | 'edited' | 'deleted' | 'reopened'
  issue: {
    id: number
    number: number
    title: string
    state: 'open' | 'closed'
    user: {
      login: string
    }
    labels: Array<{
      name: string
    }>
  }
  repository: {
    id: number
    name: string
    full_name: string
  }
}

export interface GitHubReleaseEvent {
  action: 'published' | 'unpublished' | 'created' | 'edited' | 'deleted'
  release: {
    id: number
    tag_name: string
    name: string
    draft: boolean
    prerelease: boolean
    created_at: string
    published_at: string
  }
  repository: {
    id: number
    name: string
    full_name: string
  }
}

// Resend event types (via Svix)
export interface ResendEvent {
  id: string
  type: string
  created_at: string
  data: any
}

export interface ResendEmailSent {
  email_id: string
  from: string
  to: string[]
  subject: string
  created_at: string
}

export interface ResendEmailDelivered {
  email_id: string
  from: string
  to: string
  subject: string
  created_at: string
}

export interface ResendEmailOpened {
  email_id: string
  opened_at: string
  user_agent?: string
  ip?: string
}

export interface ResendEmailClicked {
  email_id: string
  clicked_at: string
  link: string
  user_agent?: string
  ip?: string
}

export interface ResendEmailBounced {
  email_id: string
  bounced_at: string
  bounce_type: 'hard' | 'soft'
  reason: string
}
