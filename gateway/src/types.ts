/**
 * Gateway Service Types
 */

// ============================================================================
// RPC Types (from apis.do)
// ============================================================================

/**
 * RPC Request
 */
export interface RpcRequest {
  /** Method name or path segments */
  method: string | any[]
  /** Method arguments */
  args: any[]
  /** Request ID for tracing */
  requestId?: string
  /** Metadata */
  metadata?: Record<string, any>
}

/**
 * RPC Response
 */
export interface RpcResponse<T = any> {
  /** Response data */
  data?: T
  /** Error information */
  error?: RpcError
  /** Request ID (for correlation) */
  requestId?: string
  /** Metadata */
  metadata?: Record<string, any>
}

/**
 * RPC Error
 */
export interface RpcError {
  /** Error code */
  code: string
  /** Error message */
  message: string
  /** Error details */
  details?: any
  /** Stack trace (development only) */
  stack?: string
}

// ============================================================================
// Gateway Service Types
// ============================================================================

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

/**
 * Gateway Response (extends RpcResponse for compatibility)
 */
export interface GatewayResponse extends Omit<RpcResponse, 'data' | 'error'> {
  body: any
  status: number
  headers?: Record<string, string>
}
