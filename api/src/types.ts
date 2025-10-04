/**
 * Type definitions for API worker
 */

export interface Env {
  // Service bindings (all other workers)
  DB_SERVICE: any
  AUTH_SERVICE: any
  GATEWAY_SERVICE: any
  SCHEDULE_SERVICE: any
  WEBHOOKS_SERVICE: any
  EMAIL_SERVICE: any
  MCP_SERVICE: any
  QUEUE_SERVICE: any
  WAITLIST_SERVICE: any
  DO_SERVICE: any

  // AI services
  AI_SERVICE: any
  EMBEDDINGS_SERVICE: any

  // Integration services
  STRIPE_SERVICE: any
  GITHUB_SERVICE: any
  ANTHROPIC_SERVICE: any

  // Domain services
  AGENTS_SERVICE: any
  WORKFLOWS_SERVICE: any
  BUSINESS_SERVICE: any

  // Dispatch namespaces (Workers for Platforms)
  PRODUCTION: DispatchNamespace
  STAGING: DispatchNamespace
  DEVELOPMENT: DispatchNamespace

  // Storage
  KV: KVNamespace // For caching domain routes
  ASSETS: any // Workers Assets for domain routing config

  // Environment variables
  ENVIRONMENT: 'production' | 'staging' | 'development'
}

export interface ApiContext {
  requestId: string
  startTime: number
  env: Env
  executionCtx: ExecutionContext
  auth?: AuthContext
  rateLimitInfo?: {
    limit: number
    remaining: number
    reset: number
  }
}

export interface AuthContext {
  userId: string
  email: string
  isAdmin: boolean
  permissions: string[]
  sessionId?: string
  apiKey?: string
}

export interface DomainRoute {
  domain: string
  service: string
  binding: string
  requiresAuth?: boolean
  requiresAdmin?: boolean
  metadata?: Record<string, any>
  updatedAt: string
}

export interface RouteConfig {
  service: string
  binding: string
  path: string
  requiresAuth: boolean
  requiresAdmin: boolean
  metadata?: Record<string, any>
}

export interface DomainRoutesCache {
  routes: DomainRoute[]
  lastUpdated: number
  expiresAt: number
}

export interface PathRouteRule {
  pattern: RegExp
  service: string
  binding: string
  requiresAuth: boolean
  requiresAdmin: boolean
}

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyPrefix: string
}
