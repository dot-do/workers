/**
 * Type definitions for DO RPC proxy service
 */

export interface Env {
  // Core services
  DB_SERVICE: any
  AUTH_SERVICE: any
  SCHEDULE_SERVICE: any
  WEBHOOKS_SERVICE: any
  EMAIL_SERVICE: any
  MCP_SERVICE: any
  QUEUE_SERVICE: any
  WAITLIST_SERVICE: any

  // AI services
  AI_SERVICE: any
  EMBEDDINGS_SERVICE: any

  // Domain services
  AGENTS_SERVICE: any
  WORKFLOWS_SERVICE: any
  BUSINESS_SERVICE: any

  // Integration services
  STRIPE_SERVICE: any
  GITHUB_SERVICE: any
  ANTHROPIC_SERVICE: any

  // Environment
  ENVIRONMENT: 'production' | 'staging' | 'development'
}

export interface ServiceCall {
  service: string
  method: string
  args: any[]
}

export interface ServiceCallResult {
  success: boolean
  result?: any
  error?: string
}

export interface ServiceMetadata {
  name: string
  binding: string
  description: string
  available: boolean
  methods: string[]
}
