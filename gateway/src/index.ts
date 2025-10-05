// Call gateway via RPC
const result = await env.GATEWAY.route('http://api.services.do/db/things', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer sk_live_...' }
})

// Health check
const health = await env.GATEWAY.health()
// => { status: 'healthy', timestamp: '...', services: [...] }


   { pattern: /^\/new\//, service: 'new-service', binding: 'NEW_SERVICE' }
   

   export interface GatewayEnv {
     NEW_SERVICE: any
     // ...
   }
   

const ROUTE_LIMITS: Record<string, RateLimitConfig> = {
  '/ai/': { windowMs: 60 * 1000, maxRequests: 20 },
  '/batch/': { windowMs: 60 * 1000, maxRequests: 5 },
  '/new/': { windowMs: 60 * 1000, maxRequests: 100 }, // Add custom limits
}


/**
 * API Gateway Service
 *
 * Pure router following Unix philosophy - does one thing well: route requests
 *
 * Features:
 * - Domain and path-based routing to worker services
 * - Authentication (Bearer tokens, API keys, WorkOS sessions)
 * - Rate limiting (per-user, per-IP)
 * - Request/response logging
 * - RPC interface for service-to-service calls
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

// ==================== Types ====================

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
  AGENT: any
  FN: any
  APP: any
  UNIVERSAL_API: any

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

// ==================== Router ====================

export interface RouteConfig {
  pattern: RegExp
  service: string
  binding: keyof GatewayEnv
  transform?: (path: string) => string
}

/**
 * Route configuration for all domains and paths
 */
export const routes: RouteConfig[] = [
  // Database service routes
  { pattern: /^\/db\//, service: 'db', binding: 'DB' },

  // AI service routes
  { pattern: /^\/ai\//, service: 'ai', binding: 'AI' },

  // Auth service routes
  { pattern: /^\/auth\//, service: 'auth', binding: 'AUTH' },

  // Queue service routes
  { pattern: /^\/queue\//, service: 'queue', binding: 'QUEUE' },

  // Relationships service routes
  { pattern: /^\/relationships\//, service: 'relationships', binding: 'RELATIONSHIPS' },

  // Events service routes (Durable Objects)
  { pattern: /^\/events\//, service: 'events', binding: 'EVENTS' },

  // Workflows service routes
  { pattern: /^\/workflows\//, service: 'workflows', binding: 'WORKFLOWS' },

  // Embeddings service routes
  { pattern: /^\/embeddings\//, service: 'embeddings', binding: 'EMBEDDINGS' },

  // Batch processing service routes
  { pattern: /^\/batch\//, service: 'batch', binding: 'BATCH' },

  // Schedule service routes
  { pattern: /^\/schedule\//, service: 'schedule', binding: 'SCHEDULE' },

  // Universal API service routes (AI-powered universal API calls)
  { pattern: /^\/universal\//, service: 'universal-api', binding: 'UNIVERSAL_API' },

  // Code execution service routes
  { pattern: /^\/code\//, service: 'code-exec', binding: 'CODE_EXEC' },

  // Claude Code service routes
  { pattern: /^\/claude-code\//, service: 'claude-code', binding: 'CLAUDE_CODE' },

  // Agent service routes (Durable Objects)
  { pattern: /^\/agent\//, service: 'agent', binding: 'AGENT' },

  // Fn service routes (function classification and routing)
  { pattern: /^\/fn\//, service: 'fn', binding: 'FN' },
]

/**
 * Domain-based routing configuration
 * Maps domains to default services
 */
export const domainRoutes: Record<string, keyof GatewayEnv> = {
  // Database service domains
  'db.services.do': 'DB',
  'database.do': 'DB',
  'db.mw': 'DB',
  'apis.do': 'DB',

  // International character domains - Data Layer
  '彡.io': 'DB', // Data Layer (彡 = shape/pattern/database)
  '口.io': 'DB', // Data Model - Nouns (口 = mouth/noun)
  '回.io': 'DB', // Data Model - Things (回 = rotation/thing)

  // International character domains - Other services
  '入.io': 'FN', // Functions (入 = enter/function)
  '巛.io': 'WORKFLOWS', // Workflows (巛 = flow/river)
  '人.io': 'AGENT', // Agents (人 = person/agent)

  // Other service domains
  'ai.services.do': 'AI',
  'auth.services.do': 'AUTH',
  'queue.services.do': 'QUEUE',
  'api.services.do': 'DB', // Default to DB for main API domain
  'api.mw': 'DB',
  'admin.do': 'APP', // Admin CMS
}

/**
 * Find matching route for a given path
 */
export function matchRoute(pathname: string): RouteMatch | null {
  for (const route of routes) {
    if (route.pattern.test(pathname)) {
      const transformedPath = route.transform ? route.transform(pathname) : pathname
      return {
        service: route.service,
        path: transformedPath,
        binding: route.binding,
      }
    }
  }

  return null
}

/**
 * Get service binding for domain
 */
export function getServiceForDomain(hostname: string): keyof GatewayEnv | null {
  // Check exact match
  if (domainRoutes[hostname]) {
    return domainRoutes[hostname]
  }

  // Check wildcard subdomains
  const parts = hostname.split('.')
  if (parts.length >= 2) {
    const baseDomain = parts.slice(-2).join('.')
    if (domainRoutes[baseDomain]) {
      return domainRoutes[baseDomain]
    }
  }

  return null
}

/**
 * Check if route requires authentication
 */
export function requiresAuth(pathname: string, method: string): boolean {
  // Public routes (no auth required)
  const publicRoutes = ['/auth/', '/health', '/']

  // Check if path starts with any public route
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return false
  }

  // Agent and fn services require auth
  if (pathname.startsWith('/agent/') || pathname.startsWith('/fn/')) {
    return true
  }

  // All mutations require auth
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return true
  }

  // Default to requiring auth for safety
  return false
}

/**
 * Check if route requires admin role
 */
export function requiresAdmin(pathname: string, method: string): boolean {
  // Admin-only routes
  const adminRoutes = ['/batch/', '/schedule/']

  // Check if path starts with any admin route
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    return true
  }

  // Mutations on certain paths require admin
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const mutationAdminRoutes = ['/db/', '/relationships/', '/workflows/']
    return mutationAdminRoutes.some(route => pathname.startsWith(route))
  }

  return false
}

// ==================== Middleware: Auth ====================

/**
 * Extract bearer token from Authorization header
 */
function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Validate API key format
 */
function isValidApiKeyFormat(token: string): boolean {
  // API keys should start with sk_live_ or sk_test_
  return token.startsWith('sk_live_') || token.startsWith('sk_test_')
}

/**
 * Validate API key via AUTH service
 */
async function validateApiKey(token: string, ctx: GatewayContext): Promise<AuthContext | null> {
  try {
    // Call AUTH service to validate API key
    const result = await ctx.env.AUTH.validateApiKey(token)

    if (!result || !result.valid) {
      return null
    }

    return {
      userId: result.userId,
      userEmail: result.email,
      role: result.role || 'user',
      apiKey: token,
    }
  } catch (error) {
    console.error('[Auth] API key validation failed:', error)
    return null
  }
}

/**
 * Validate WorkOS session via AUTH service
 */
async function validateWorkOSSession(sessionToken: string, ctx: GatewayContext): Promise<AuthContext | null> {
  try {
    // Call AUTH service to validate WorkOS session
    const result = await ctx.env.AUTH.validateSession(sessionToken)

    if (!result || !result.valid) {
      return null
    }

    return {
      userId: result.userId,
      userEmail: result.email,
      role: result.role || 'user',
      organizationId: result.organizationId,
    }
  } catch (error) {
    console.error('[Auth] WorkOS session validation failed:', error)
    return null
  }
}

/**
 * Extract session token from cookie
 */
function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) {
    return null
  }

  // Parse session cookie
  const sessionMatch = cookieHeader.match(/session=([^;]+)/)
  return sessionMatch ? sessionMatch[1] : null
}

/**
 * Authenticate request and populate auth context
 */
async function authenticate(request: Request, ctx: GatewayContext): Promise<AuthContext | null> {
  // Try bearer token first (API key)
  const bearerToken = getBearerToken(request)
  if (bearerToken && isValidApiKeyFormat(bearerToken)) {
    const auth = await validateApiKey(bearerToken, ctx)
    if (auth) {
      return auth
    }
  }

  // Try session cookie (WorkOS)
  const sessionToken = getSessionToken(request)
  if (sessionToken) {
    const auth = await validateWorkOSSession(sessionToken, ctx)
    if (auth) {
      return auth
    }
  }

  // No valid authentication found
  return null
}

/**
 * Require authentication - return 401 if not authenticated
 */
function requireAuth(ctx: GatewayContext): Response | null {
  if (!ctx.auth) {
    return Response.json(
      {
        error: 'Authentication required',
        message: 'Please provide a valid API key or session token',
      },
      { status: 401 }
    )
  }
  return null
}

/**
 * Require admin role - return 403 if not admin
 */
function requireAdmin(ctx: GatewayContext): Response | null {
  if (!ctx.auth) {
    return Response.json(
      {
        error: 'Authentication required',
        message: 'Please provide a valid API key or session token',
      },
      { status: 401 }
    )
  }

  if (ctx.auth.role !== 'admin') {
    return Response.json(
      {
        error: 'Admin access required',
        message: 'This endpoint requires admin privileges',
      },
      { status: 403 }
    )
  }

  return null
}

// ==================== Middleware: Rate Limiting ====================

/**
 * Default rate limit configuration
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
}

/**
 * Route-specific rate limits (stricter for expensive operations)
 */
const ROUTE_LIMITS: Record<string, RateLimitConfig> = {
  '/ai/': { windowMs: 60 * 1000, maxRequests: 20 }, // AI operations
  '/batch/': { windowMs: 60 * 1000, maxRequests: 5 }, // Batch operations
  '/workflows/': { windowMs: 60 * 1000, maxRequests: 30 }, // Workflow operations
  '/auth/': { windowMs: 60 * 1000, maxRequests: 10 }, // Auth operations
}

/**
 * In-memory rate limit store (for development)
 * In production, use KV for distributed rate limiting
 */
const rateLimitStore = new Map<
  string,
  {
    count: number
    resetAt: number
  }
>()

/**
 * Get rate limit configuration for a path
 */
function getRateLimitConfig(pathname: string): RateLimitConfig {
  for (const [prefix, config] of Object.entries(ROUTE_LIMITS)) {
    if (pathname.startsWith(prefix)) {
      return config
    }
  }
  return DEFAULT_CONFIG
}

/**
 * Get rate limit identifier (userId or IP)
 */
function getRateLimitIdentifier(request: Request, ctx: GatewayContext): string {
  // Use userId if authenticated
  if (ctx.auth?.userId) {
    return `user:${ctx.auth.userId}`
  }

  // Use IP address for anonymous users
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown'
  return `ip:${ip}`
}

/**
 * Check rate limit using in-memory store
 */
function checkRateLimitMemory(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  if (!record || record.resetAt < now) {
    // Reset the rate limit
    const resetAt = now + config.windowMs
    rateLimitStore.set(identifier, { count: 1, resetAt })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt }
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }

  record.count++
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
  }
}

/**
 * Check rate limit using KV (distributed)
 */
async function checkRateLimitKV(
  identifier: string,
  config: RateLimitConfig,
  kv: KVNamespace
): Promise<{
  allowed: boolean
  remaining: number
  resetAt: number
}> {
  const now = Date.now()
  const key = `ratelimit:${identifier}`

  // Get current count
  const recordStr = await kv.get(key)
  const record = recordStr ? JSON.parse(recordStr) : null

  if (!record || record.resetAt < now) {
    // Reset the rate limit
    const resetAt = now + config.windowMs
    const newRecord = { count: 1, resetAt }

    // Store with TTL
    await kv.put(key, JSON.stringify(newRecord), {
      expirationTtl: Math.ceil(config.windowMs / 1000),
    })

    return { allowed: true, remaining: config.maxRequests - 1, resetAt }
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }

  // Increment count
  record.count++
  await kv.put(key, JSON.stringify(record), {
    expirationTtl: Math.ceil((record.resetAt - now) / 1000),
  })

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
  }
}

/**
 * Rate limit middleware
 */
async function rateLimit(request: Request, ctx: GatewayContext): Promise<Response | null> {
  const url = new URL(request.url)
  const config = getRateLimitConfig(url.pathname)
  const identifier = getRateLimitIdentifier(request, ctx)

  // Use KV if available, otherwise use memory
  const result = ctx.env.GATEWAY_KV
    ? await checkRateLimitKV(identifier, config, ctx.env.GATEWAY_KV)
    : checkRateLimitMemory(identifier, config)

  if (!result.allowed) {
    return Response.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
        },
      }
    )
  }

  // Rate limit passed - can add headers to response later
  return null
}

// ==================== Middleware: Logging ====================

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Get client IP address from request headers
 */
function getClientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    request.headers.get('X-Real-IP') ||
    'unknown'
  )
}

/**
 * Log request start
 */
function logRequest(request: Request, ctx: GatewayContext): void {
  const url = new URL(request.url)

  const log = {
    level: 'info',
    type: 'request',
    requestId: ctx.requestId,
    timestamp: new Date().toISOString(),
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    userAgent: request.headers.get('User-Agent') || undefined,
    ip: getClientIp(request),
    userId: ctx.auth?.userId,
    organizationId: ctx.auth?.organizationId,
  }

  console.log(JSON.stringify(log))
}

/**
 * Log response completion
 */
function logResponse(
  request: Request,
  response: Response,
  ctx: GatewayContext,
  error?: Error
): void {
  const url = new URL(request.url)
  const duration = Date.now() - ctx.startTime

  const log = {
    level: response.status >= 500 ? 'error' : response.status >= 400 ? 'warn' : 'info',
    type: 'response',
    requestId: ctx.requestId,
    timestamp: new Date().toISOString(),
    method: request.method,
    path: url.pathname,
    status: response.status,
    duration: `${duration}ms`,
    userId: ctx.auth?.userId,
    ...(error && {
      error: error.message,
      stack: error.stack,
    }),
  }

  console.log(JSON.stringify(log))
}

/**
 * Log error
 */
function logError(error: Error, ctx: GatewayContext): void {
  const log = {
    level: 'error',
    type: 'error',
    requestId: ctx.requestId,
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    userId: ctx.auth?.userId,
  }

  console.error(JSON.stringify(log))
}

/**
 * Add request/response size headers
 */
function addMetricsHeaders(response: Response, ctx: GatewayContext): Response {
  const duration = Date.now() - ctx.startTime

  const headers = new Headers(response.headers)
  headers.set('X-Request-ID', ctx.requestId)
  headers.set('X-Response-Time', `${duration}ms`)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// ==================== RPC Service ====================

export class GatewayService extends WorkerEntrypoint<GatewayEnv> {
  /**
   * Route a request to the appropriate service via RPC
   */
  async route(url: string, options?: RequestInit): Promise<GatewayResponse> {
    const request = new Request(url, options)
    const response = await this.fetch!(request)

    return {
      body: await response.json().catch(() => response.text()),
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    }
  }

  /**
   * Health check
   */
  async health(): Promise<{ status: string; timestamp: string; services: string[] }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: ['db', 'ai', 'auth', 'queue', 'relationships', 'events', 'workflows'],
    }
  }
}

// ==================== HTTP Interface ====================

type HonoEnv = {
  Bindings: GatewayEnv
  Variables: {
    ctx: GatewayContext
  }
}

const app = new Hono<HonoEnv>()

// Global CORS middleware
app.use('*', cors())

// Main request handler with all middleware
app.use('*', async (c, next) => {
  const startTime = Date.now()
  const requestId = generateRequestId()

  // Create gateway context
  const ctx: GatewayContext = {
    requestId,
    startTime,
    env: c.env,
    executionCtx: c.executionCtx,
  }

  // Log incoming request
  logRequest(c.req.raw, ctx)

  try {
    // Authenticate (always attempt, even for public routes)
    const auth = await authenticate(c.req.raw, ctx)
    if (auth) {
      ctx.auth = auth
    }

    // Check rate limit
    const rateLimitResponse = await rateLimit(c.req.raw, ctx)
    if (rateLimitResponse) {
      logResponse(c.req.raw, rateLimitResponse, ctx)
      return rateLimitResponse
    }

    // Check authentication requirements
    const url = new URL(c.req.url)
    if (requiresAuth(url.pathname, c.req.method)) {
      const authResponse = requireAuth(ctx)
      if (authResponse) {
        logResponse(c.req.raw, authResponse, ctx)
        return authResponse
      }
    }

    // Check admin requirements
    if (requiresAdmin(url.pathname, c.req.method)) {
      const adminResponse = requireAdmin(ctx)
      if (adminResponse) {
        logResponse(c.req.raw, adminResponse, ctx)
        return adminResponse
      }
    }

    // Store context for downstream handlers
    c.set('ctx', ctx)

    // Continue to route handler
    await next()

    // Add metrics headers to response
    const response = c.res
    const enhancedResponse = addMetricsHeaders(response, ctx)
    logResponse(c.req.raw, enhancedResponse, ctx)

    return enhancedResponse
  } catch (error) {
    // Log error
    logError(error as Error, ctx)

    // Return 500 error
    const errorResponse = Response.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: ctx.requestId,
      },
      { status: 500 }
    )

    logResponse(c.req.raw, errorResponse, ctx, error as Error)
    return errorResponse
  }
})

// Health check endpoint
app.get('/health', c => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: ['db', 'ai', 'auth', 'queue', 'relationships', 'events', 'workflows'],
  })
})

// Route all other requests to appropriate services
app.all('*', async c => {
  const url = new URL(c.req.url)
  const ctx = c.get('ctx') as GatewayContext

  // Try path-based routing first
  const route = matchRoute(url.pathname)
  if (route && ctx.env[route.binding]) {
    try {
      // Forward request to service binding via fetch
      const serviceBinding = ctx.env[route.binding] as any

      // Clone request with updated path
      const serviceRequest = new Request(
        new URL(route.path, url.origin).toString(),
        c.req.raw
      )

      // Call service via fetch (HTTP interface)
      const response = await serviceBinding.fetch(serviceRequest)
      return response
    } catch (error) {
      console.error(`[Gateway] Service ${route.service} error:`, error)
      return c.json(
        {
          error: 'Service error',
          message: error instanceof Error ? error.message : 'Unknown error',
          service: route.service,
          requestId: ctx.requestId,
        },
        { status: 502 }
      )
    }
  }

  // Try domain-based routing
  const domainService = getServiceForDomain(url.hostname)
  if (domainService && ctx.env[domainService]) {
    try {
      const serviceBinding = ctx.env[domainService] as any
      const response = await serviceBinding.fetch(c.req.raw)
      return response
    } catch (error) {
      console.error(`[Gateway] Domain service ${domainService} error:`, error)
      return c.json(
        {
          error: 'Service error',
          message: error instanceof Error ? error.message : 'Unknown error',
          service: domainService,
          requestId: ctx.requestId,
        },
        { status: 502 }
      )
    }
  }

  // No matching route found
  return c.json(
    {
      error: 'Not found',
      message: `No service found for path: ${url.pathname}`,
      requestId: ctx.requestId,
    },
    { status: 404 }
  )
})

// ==================== Worker Export ====================

export default {
  fetch: app.fetch,
}
