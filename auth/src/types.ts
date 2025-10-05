/**
 * Auth Service Type Definitions
 */

import type { User as WorkOSUser } from '@workos-inc/node'

// ============================================================================
// RPC Types (from apis.do package)
// ============================================================================

/**
 * Base RPC Context - Available to RPC handlers
 */
export interface BaseRpcContext {
  /** Request ID */
  requestId: string
  /** Environment bindings */
  env: any
  /** Execution context */
  executionCtx?: any
  /** Authentication info */
  auth?: {
    userId?: string
    roles?: string[]
    metadata?: Record<string, any>
  }
  /** Request metadata */
  metadata?: Record<string, any>
}

/**
 * RPC Method Definition
 */
export interface RpcMethod {
  /** Method name */
  name: string
  /** Handler function */
  handler: RpcHandler
  /** Input schema (optional, for validation) */
  inputSchema?: any
  /** Output schema (optional, for validation) */
  outputSchema?: any
  /** Whether authentication is required */
  requiresAuth?: boolean
  /** Required roles */
  requiredRoles?: string[]
}

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

/**
 * RPC Handler - Function that handles RPC requests
 */
export type RpcHandler<T = any> = (
  request: RpcRequest,
  context: RpcContext
) => Promise<RpcResponse<T>>

// Environment bindings
export interface AuthServiceEnv {
  // WorkOS credentials
  WORKOS_API_KEY: string
  WORKOS_CLIENT_ID: string
  WORKOS_CLIENT_SECRET: string
  WORKOS_WEBHOOK_SECRET?: string

  // JWT secrets
  JWT_SECRET: string
  JWT_REFRESH_SECRET: string

  // Service bindings
  DB: any // Database service RPC binding

  // KV for sessions
  SESSIONS_KV: KVNamespace

  // Rate limiting KV
  RATE_LIMIT_KV?: KVNamespace
}

// RPC Context - extends base RpcContext with auth-specific env
export interface RpcContext extends BaseRpcContext {
  env: AuthServiceEnv
}

// User types
export interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  role: 'user' | 'admin' | 'viewer'
  emailVerified: boolean
  workosId?: string
  organizationId?: string
  createdAt: Date
  updatedAt: Date
}

export interface UserCreateInput {
  email: string
  name?: string
  workosId?: string
  role?: 'user' | 'admin' | 'viewer'
}

// Session types
export interface Session {
  id: string
  userId: string
  token: string
  refreshToken?: string
  expiresAt: Date
  device?: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  updatedAt: Date
}

export interface SessionCreateInput {
  userId: string
  device?: string
  ipAddress?: string
  userAgent?: string
  expiresInDays?: number
}

export interface JWTPayload {
  sub: string // userId
  email: string
  role: string
  sessionId: string
  iat: number
  exp: number
}

export interface RefreshTokenPayload {
  sub: string // userId
  sessionId: string
  iat: number
  exp: number
}

// API Key types
export interface ApiKey {
  id: string
  userId: string
  name: string
  keyHash: string
  prefix: string // sk_live_ or sk_test_
  lastUsedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  revokedAt: Date | null
}

export interface ApiKeyCreateInput {
  userId: string
  name: string
  expiresInDays?: number
  environment?: 'live' | 'test'
}

export interface ApiKeyResponse {
  id: string
  name: string
  prefix: string
  key?: string // Only returned on creation
  lastUsedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
}

// Permission types
export interface Permission {
  id: string
  userId: string
  resource: string // e.g., 'things', 'relationships', 'ai'
  action: string // 'read', 'write', 'delete', 'admin'
  organizationId?: string
  grantedAt: Date
}

export interface PermissionCheck {
  userId: string
  resource: string
  action: string
  organizationId?: string
}

// RBAC types
export type Role = 'admin' | 'user' | 'viewer'

export interface RolePermissions {
  admin: string[] // All permissions
  user: string[] // Standard user permissions
  viewer: string[] // Read-only permissions
}

// WorkOS types
export interface WorkOSAuthResponse {
  user: WorkOSUser
  accessToken: string
  refreshToken?: string
  organizationId?: string
  permissions: string[]
}

export interface WorkOSSSOOptions {
  organizationId?: string
  connection?: string
  provider?: string
  redirectUri: string
  state?: string
}

// OAuth types
export interface OAuthRequest {
  clientId: string
  redirectUri: string
  state?: string
  scope?: string[]
}

// Middleware types
export interface AuthContext {
  user?: User
  session?: Session
  apiKey?: ApiKey
}

// Rate limiting
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  keyPrefix?: string
}

// Response types
export interface AuthResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ValidateTokenResponse {
  valid: boolean
  user?: User
  session?: Session
  error?: string
}

export interface CreateApiKeyResponse {
  success: boolean
  apiKey?: ApiKeyResponse
  error?: string
}

// Error types
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 401,
    public details?: any
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super('UNAUTHORIZED', message, 401, details)
  }
}

export class ForbiddenError extends AuthError {
  constructor(message: string = 'Forbidden', details?: any) {
    super('FORBIDDEN', message, 403, details)
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message: string = 'Token expired', details?: any) {
    super('TOKEN_EXPIRED', message, 401, details)
  }
}

export class InvalidTokenError extends AuthError {
  constructor(message: string = 'Invalid token', details?: any) {
    super('INVALID_TOKEN', message, 401, details)
  }
}

export class RateLimitError extends AuthError {
  constructor(retryAfter: number, message: string = 'Rate limit exceeded') {
    super('RATE_LIMIT_EXCEEDED', message, 429, { retryAfter })
  }
}
