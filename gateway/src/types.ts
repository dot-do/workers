/**
 * Gateway Service Types
 */

export interface GatewayEnv {
  // Service bindings (RPC)
  DB: any
  AI: any
  AUTH: any
  QUEUE: any
  RELATIONSHIPS: any
  EVENTS: any
  WORKFLOWS: any
  EMBEDDINGS: any
  BATCH: any
  SCHEDULE: any
  CODE_EXEC: any
  CLAUDE_CODE: any

  // D1 Database (optional, for caching/config)
  GATEWAY_DB?: D1Database

  // KV Namespace (for rate limiting)
  GATEWAY_KV?: KVNamespace

  // Secrets
  WORKOS_API_KEY?: string
  WORKOS_CLIENT_ID?: string

  // Environment
  ENVIRONMENT?: string
}

export interface RouteMatch {
  service: string
  path: string
  binding: keyof GatewayEnv
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export interface AuthContext {
  userId?: string
  userEmail?: string
  role?: 'user' | 'admin'
  organizationId?: string
  apiKey?: string
}

export interface GatewayContext {
  requestId: string
  startTime: number
  auth?: AuthContext
  env: GatewayEnv
  executionCtx: ExecutionContext
}

export interface GatewayResponse {
  body: any
  status: number
  headers?: Record<string, string>
}
