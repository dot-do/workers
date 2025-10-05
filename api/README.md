# api

# API Worker - Single HTTP Entry Point

The API worker is the **only** worker with public HTTP access in the entire system. All other workers are accessed exclusively via RPC (service bindings), making this the single gateway for all external traffic.

## Overview

The API worker implements a sophisticated multi-layer routing system that:
- Routes HTTP requests to appropriate microservices
- Validates authentication and authorization
- Enforces rate limiting
- Logs all requests and responses
- Manages domain-based routing with dynamic configuration
- Provides fallback waitlist functionality for unmatched domains

## Architecture

```
External Request → Cloudflare DNS → API Worker → Service Binding (RPC) → Target Worker
```

All workers have `workers.dev` disabled and no direct routes. Only the API worker handles HTTP traffic, ensuring:
- ✅ **Centralized Security** - Single authentication point
- ✅ **Unified Rate Limiting** - Consistent across all services
- ✅ **Complete Observability** - All requests logged in one place
- ✅ **Dynamic Routing** - No deployment needed for route changes
- ✅ **Flexible Scaling** - Route traffic to any service dynamically

## Key Features

### 1. Multi-Layer Routing

**Routing Priority (highest to lowest):**

1. **Special Domain Routing** - Hardcoded patterns for `*.apis.do` and `sites.do`
2. **Path-Based Routing** - Pattern matching on URL paths (e.g., `/api/db/*`)
3. **Domain-Based Routing** - JSON configuration in Workers Assets (1,273+ domains)
4. **Waitlist Fallback** - Any unmatched domain routes to waitlist service

**Special Domain Patterns:**

```ts
// *.apis.do subdomains → service routing
agents.apis.do → AGENT_SERVICE
db.apis.do → DB_SERVICE
fn.apis.do → FN_SERVICE
auth.apis.do → AUTH_SERVICE
gateway.apis.do → GATEWAY_SERVICE

// sites.do path/subdomain routing
sites.do/api.management → GATEWAY_SERVICE (with path metadata)
api.management.sites.do → GATEWAY_SERVICE (with subdomain metadata)
```

**Path-Based Routes:**

```ts
/api/db/* → DB_SERVICE (requires auth)
/api/auth/* → AUTH_SERVICE (public)
/api/agents/* → AGENTS_SERVICE (requires auth)
/api/workflows/* → WORKFLOWS_SERVICE (requires auth)
/mcp/* → MCP_SERVICE (public)
/health → Built-in health check
```

**Domain-Based Routes:**

Stored in `assets/domain-routes.json` with 1,273+ domain mappings:

```json
{
  "domain": "agent.do",
  "service": "agent",
  "binding": "AGENT_SERVICE",
  "requiresAuth": false,
  "requiresAdmin": false,
  "metadata": {
    "description": "AI agent service",
    "category": "Service"
  },
  "updatedAt": "2025-10-04T20:00:00.000Z"
}
```

### 2. Authentication & Authorization

The API worker supports three authentication methods:

1. **Bearer Token** - `Authorization: Bearer <token>`
2. **API Key** - `X-API-Key: <key>`
3. **Session Cookie** - `Cookie: session=<id>`

All authentication is validated through the `AUTH_SERVICE` via RPC.

**Auth Context:**

```ts
interface AuthContext {
  userId: string
  email: string
  isAdmin: boolean
  permissions: string[]
  sessionId?: string
  apiKey?: string
}
```

**Route Protection:**

- Routes can require authentication (`requiresAuth: true`)
- Routes can require admin access (`requiresAdmin: true`)
- Public routes are accessible without authentication
- Failed auth returns `401 Unauthorized` or `403 Forbidden`

### 3. Rate Limiting

Rate limits are enforced per user or IP address:

- **Authenticated Users** - Keyed by `user:{userId}`
- **Anonymous Users** - Keyed by `ip:{clientIp}`
- **Default Limit** - 100 requests per 60 seconds
- **Storage** - KV namespace for distributed rate limiting
- **Headers** - Returns `X-RateLimit-*` headers

Rate limit exceeded returns `429 Too Many Requests` with retry information.

### 4. Request Logging

All requests and responses are logged with:

- Request ID (ULID)
- Timestamp
- Method and URL
- Client IP and User Agent
- User ID (if authenticated)
- Response status and duration
- Async analytics logging via Queue Service

**Log Format:**

```json
{
  "type": "request",
  "requestId": "01HQRS9WXYZ...",
  "timestamp": "2025-10-04T20:00:00.000Z",
  "method": "POST",
  "url": "/api/db/query",
  "hostname": "api.do",
  "ip": "203.0.113.1",
  "userAgent": "Mozilla/5.0...",
  "userId": "user_123"
}
```

### 5. Dynamic Domain Routing

Domain routes are stored in Workers Assets and cached with a stale-while-revalidate (SWR) strategy:

- **Cache Duration** - 10 seconds (configurable)
- **Two-Level Cache** - In-memory + KV namespace
- **Automatic Refresh** - Stale cache served while fetching new data
- **Fallback** - Uses stale cache if Assets fetch fails
- **Wildcard Support** - `*.example.com` patterns supported

**Cache Invalidation:**

```ts
// Force refresh domain routes
await invalidateDomainRoutesCache(env)
```

### 6. Metrics & Headers

All responses include:

- `X-Request-Id` - Unique request identifier
- `X-Response-Time` - Duration in milliseconds
- `X-RateLimit-Limit` - Maximum requests per window
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset timestamp (ISO 8601)

## RPC Interface

The API worker does not export an RPC interface. It only provides HTTP endpoints and routes to other services via RPC.

## HTTP API

### `GET /health`

Health check endpoint (public, no auth required).

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-10-04T20:00:00.000Z",
  "service": "api"
}
```

### All Other Routes

Dynamically routed based on:

1. Special routing patterns (*.apis.do, sites.do)
2. Path-based rules (/api/service/*)
3. Domain-based configuration (domain-routes.json)
4. Waitlist fallback (unmatched domains)

## Configuration

### Adding Domains

**Method 1: Zone Routes (Cloudflare Dashboard)**

1. Go to Cloudflare Dashboard → Zone → DNS
2. Add CNAME record: `@ → api.drivly.workers.dev`
3. Go to Workers & Pages → api → Triggers → Routes
4. Add route: `yourdomain.com/*` (zone: yourdomain.com)

**Method 2: Custom Domains for SaaS**

1. Go to Cloudflare Dashboard → SSL/TLS → Custom Hostnames
2. Add custom hostname: `customer.yourdomain.com`
3. Point to: `api.drivly.workers.dev`
4. No wrangler.jsonc changes needed

**Method 3: DNS CNAME**

For domains already in your Cloudflare account:

1. Add CNAME record: `subdomain → api.drivly.workers.dev`
2. No additional configuration needed
3. API worker automatically routes based on domain-routes.json

### Adding Domain Routes

Update `assets/domain-routes.json`:

```json
{
  "domain": "newservice.do",
  "service": "newservice",
  "binding": "NEWSERVICE_SERVICE",
  "requiresAuth": false,
  "requiresAdmin": false,
  "metadata": {
    "description": "New service description",
    "category": "Service"
  },
  "updatedAt": "2025-10-04T20:00:00.000Z"
}
```

Changes are cached with SWR (10s refresh) - no deployment needed!

### Adding Service Bindings

To add a new service:

1. Deploy the service worker
2. Add binding to frontmatter (this file):
   ```yaml
   services:
     - binding: NEW_SERVICE
       service: new-service
   ```
3. Update routing logic (if needed) in `src/routing/paths.ts`
4. Rebuild: `pnpm build-mdx api.mdx`
5. Deploy: `npx wrangler deploy`

### Adding Path Routes

Edit the `PATH_ROUTES` array in implementation below to add new path-based routes.

## Development

```bash
# Local development (from workers/api/)
pnpm dev

# Build from .mdx
pnpm build-mdx api.mdx

# Deploy
npx wrangler deploy

# View logs
npx wrangler tail api --format pretty

# Check deployments
npx wrangler deployments list
```

## Testing Routes

```bash
# Test via workers.dev URL
curl -s https://api.drivly.workers.dev/health

# Test subdomain routing (*.apis.do)
curl -s https://agents.apis.do/health

# Test sites.do path routing
curl -s https://sites.do/api.management

# Test with authentication
curl -s https://api.do/api/db/query \
  -H "Authorization: Bearer $TOKEN"

# Test with API key
curl -s https://api.do/api/agents/list \
  -H "X-API-Key: $API_KEY"

# Test custom domain (after DNS setup)
curl -s https://yourdomain.com/health
```

## Implementation

The API worker is implemented with:

- **Hono** - Fast, lightweight HTTP router
- **Service Bindings** - RPC communication with all services
- **Workers Assets** - Domain routing configuration storage
- **KV Namespace** - Rate limiting and caching
- **Dispatch Namespaces** - Workers for Platforms support

### Type Definitions

```ts
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
```

### Utility Functions

```ts
/**
 * Utility functions for API worker
 */

import { ulid } from 'ulid'

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return ulid()
}

/**
 * Extract client IP from request
 */
export function getClientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || 'unknown'
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}

/**
 * Check if request is from internal service
 */
export function isInternalRequest(request: Request): boolean {
  // Check for internal service header
  const internalHeader = request.headers.get('x-internal-service')
  return internalHeader === 'true'
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Parse JSON safely
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}
```

### Authentication Middleware

```ts
/**
 * Authentication middleware
 */

/**
 * Authenticate a request using various methods:
 * 1. Bearer token (Authorization: Bearer <token>)
 * 2. API key (X-API-Key: <key>)
 * 3. Session cookie
 */
export async function authenticateRequest(request: Request, ctx: ApiContext): Promise<AuthContext | null> {
  // Try Bearer token
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const auth = await validateBearerToken(token, ctx)
    if (auth) return auth
  }

  // Try API key
  const apiKey = request.headers.get('x-api-key')
  if (apiKey) {
    const auth = await validateApiKey(apiKey, ctx)
    if (auth) return auth
  }

  // Try session cookie
  const cookie = request.headers.get('cookie')
  if (cookie) {
    const sessionId = extractSessionFromCookie(cookie)
    if (sessionId) {
      const auth = await validateSession(sessionId, ctx)
      if (auth) return auth
    }
  }

  return null
}

/**
 * Validate Bearer token via AUTH_SERVICE
 */
async function validateBearerToken(token: string, ctx: ApiContext): Promise<AuthContext | null> {
  try {
    const result = await ctx.env.AUTH_SERVICE.validateToken(token)
    if (!result || !result.valid) return null

    return {
      userId: result.user.id,
      email: result.user.email,
      isAdmin: result.user.role === 'admin',
      permissions: result.user.permissions || [],
      sessionId: result.sessionId,
    }
  } catch (error) {
    console.error('[Auth] Bearer token validation error:', error)
    return null
  }
}

/**
 * Validate API key via AUTH_SERVICE
 */
async function validateApiKey(apiKey: string, ctx: ApiContext): Promise<AuthContext | null> {
  try {
    const result = await ctx.env.AUTH_SERVICE.validateApiKey(apiKey)
    if (!result || !result.valid) return null

    return {
      userId: result.user.id,
      email: result.user.email,
      isAdmin: result.user.role === 'admin',
      permissions: result.permissions || [],
      apiKey,
    }
  } catch (error) {
    console.error('[Auth] API key validation error:', error)
    return null
  }
}

/**
 * Validate session via AUTH_SERVICE
 */
async function validateSession(sessionId: string, ctx: ApiContext): Promise<AuthContext | null> {
  try {
    const result = await ctx.env.AUTH_SERVICE.validateSession(sessionId)
    if (!result || !result.valid) return null

    return {
      userId: result.user.id,
      email: result.user.email,
      isAdmin: result.user.role === 'admin',
      permissions: result.user.permissions || [],
      sessionId,
    }
  } catch (error) {
    console.error('[Auth] Session validation error:', error)
    return null
  }
}

/**
 * Extract session ID from cookie string
 */
function extractSessionFromCookie(cookie: string): string | null {
  const match = cookie.match(/session=([^;]+)/)
  return match ? match[1] : null
}

/**
 * Check if a route requires authentication
 */
export function requiresAuth(pathname: string, method: string): boolean {
  // Public routes (no auth required)
  const publicRoutes = [
    /^\/health$/,
    /^\/api\/public\//,
    /^\/waitlist/,
  ]

  return !publicRoutes.some(pattern => pattern.test(pathname))
}

/**
 * Check if a route requires admin access
 */
export function requiresAdmin(pathname: string, method: string): boolean {
  // Admin routes
  const adminRoutes = [
    /^\/api\/admin\//,
    /^\/api\/users\/.*\/ban$/,
    /^\/api\/deploy$/,
  ]

  return adminRoutes.some(pattern => pattern.test(pathname))
}
```

### Rate Limiting Middleware

```ts
/**
 * Rate limiting middleware
 */

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  keyPrefix: 'ratelimit',
}

/**
 * Check rate limit for request
 * Returns Response if rate limit exceeded, null otherwise
 */
export async function rateLimitCheck(request: Request, ctx: ApiContext): Promise<Response | null> {
  const config = DEFAULT_RATE_LIMIT

  // Determine rate limit key (by user ID or IP)
  const key = ctx.auth ? `user:${ctx.auth.userId}` : `ip:${getClientIp(request)}`
  const rateLimitKey = `${config.keyPrefix}:${key}`

  try {
    // Get current count from KV
    const currentValue = await ctx.env.KV.get(rateLimitKey)
    const current = currentValue ? parseInt(currentValue, 10) : 0

    if (current >= config.maxRequests) {
      // Rate limit exceeded
      const ttl = await ctx.env.KV.getWithMetadata(rateLimitKey)
      const resetTime = ttl.metadata?.resetTime || Date.now() + config.windowMs

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again later.`,
          limit: config.maxRequests,
          resetTime: new Date(resetTime).toISOString(),
          requestId: ctx.requestId,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(resetTime).toISOString(),
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // Increment counter
    const newCount = current + 1
    const resetTime = Date.now() + config.windowMs
    await ctx.env.KV.put(rateLimitKey, newCount.toString(), {
      expirationTtl: Math.ceil(config.windowMs / 1000),
      metadata: { resetTime },
    })

    // Add rate limit headers to context for later use
    ctx.rateLimitInfo = {
      limit: config.maxRequests,
      remaining: config.maxRequests - newCount,
      reset: resetTime,
    }

    return null
  } catch (error) {
    console.error('[RateLimit] Error:', error)
    // Don't block requests on rate limit errors
    return null
  }
}
```

### Logging Middleware

```ts
/**
 * Request/response logging middleware
 */

/**
 * Log incoming request
 */
export function logRequest(request: Request, ctx: ApiContext): void {
  const url = new URL(request.url)
  const ip = getClientIp(request)
  const userAgent = getUserAgent(request)

  console.log(
    JSON.stringify({
      type: 'request',
      requestId: ctx.requestId,
      timestamp: new Date().toISOString(),
      method: request.method,
      url: url.pathname + url.search,
      hostname: url.hostname,
      ip,
      userAgent,
      userId: ctx.auth?.userId,
    })
  )
}

/**
 * Log outgoing response
 */
export function logResponse(request: Request, response: Response, ctx: ApiContext): void {
  const duration = Date.now() - ctx.startTime
  const url = new URL(request.url)

  console.log(
    JSON.stringify({
      type: 'response',
      requestId: ctx.requestId,
      timestamp: new Date().toISOString(),
      method: request.method,
      url: url.pathname + url.search,
      status: response.status,
      duration,
      userId: ctx.auth?.userId,
    })
  )

  // Log to analytics queue (async, don't await)
  ctx.executionCtx.waitUntil(
    logToAnalytics({
      requestId: ctx.requestId,
      timestamp: new Date().toISOString(),
      method: request.method,
      url: url.pathname + url.search,
      hostname: url.hostname,
      status: response.status,
      duration,
      userId: ctx.auth?.userId,
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    }, ctx)
  )
}

/**
 * Add metrics headers to response
 */
export function addMetrics(response: Response, ctx: ApiContext): Response {
  const duration = Date.now() - ctx.startTime

  const newResponse = new Response(response.body, response)
  newResponse.headers.set('X-Request-Id', ctx.requestId)
  newResponse.headers.set('X-Response-Time', `${duration}ms`)

  if (ctx.rateLimitInfo) {
    newResponse.headers.set('X-RateLimit-Limit', ctx.rateLimitInfo.limit.toString())
    newResponse.headers.set('X-RateLimit-Remaining', ctx.rateLimitInfo.remaining.toString())
    newResponse.headers.set('X-RateLimit-Reset', new Date(ctx.rateLimitInfo.reset).toISOString())
  }

  return newResponse
}

/**
 * Log request/response data to analytics service
 */
async function logToAnalytics(data: any, ctx: ApiContext): Promise<void> {
  try {
    // Send to analytics queue for async processing
    await ctx.env.QUEUE_SERVICE.send('analytics', data)
  } catch (error) {
    console.error('[Logging] Failed to log to analytics:', error)
  }
}
```

### Domain Routing

```ts
/**
 * Domain-based routing with Workers Assets and SWR cache
 *
 * Domain routes are stored in Workers Assets as a JSON file.
 * We maintain an in-memory cache with a stale-while-revalidate (SWR) strategy
 * that updates within 10 seconds of routing changes.
 */

// In-memory cache (persists across requests in same Worker instance)
let domainRoutesCache: DomainRoutesCache | null = null

// SWR configuration
const CACHE_DURATION_MS = 10000 // 10 seconds
const KV_CACHE_KEY = 'domain-routes:cache'

/**
 * Load domain routes from cache or Workers Assets
 */
export async function loadDomainRoutes(env: Env, forceRefresh = false): Promise<DomainRoute[]> {
  const now = Date.now()

  // Check if we have a valid cache
  if (!forceRefresh && domainRoutesCache && domainRoutesCache.expiresAt > now) {
    return domainRoutesCache.routes
  }

  // Cache expired or force refresh - load from KV first (faster than Assets)
  try {
    const kvCache = await env.KV.get(KV_CACHE_KEY)
    if (kvCache) {
      const cached = safeJsonParse<DomainRoutesCache>(kvCache, null)
      if (cached && cached.expiresAt > now) {
        domainRoutesCache = cached
        return cached.routes
      }
    }
  } catch (error) {
    console.error('[DomainRoutes] KV cache error:', error)
  }

  // Load from Workers Assets (authoritative source)
  try {
    const routes = await loadFromAssets(env)

    // Update caches
    domainRoutesCache = {
      routes,
      lastUpdated: now,
      expiresAt: now + CACHE_DURATION_MS,
    }

    // Store in KV for cross-instance caching
    await env.KV.put(KV_CACHE_KEY, JSON.stringify(domainRoutesCache), {
      expirationTtl: Math.ceil(CACHE_DURATION_MS / 1000) * 2, // Double TTL for safety
    })

    return routes
  } catch (error) {
    console.error('[DomainRoutes] Assets load error:', error)

    // Fall back to stale cache if available
    if (domainRoutesCache) {
      console.warn('[DomainRoutes] Using stale cache')
      return domainRoutesCache.routes
    }

    // No cache available, return empty array
    return []
  }
}

/**
 * Load domain routes from Workers Assets
 */
async function loadFromAssets(env: Env): Promise<DomainRoute[]> {
  try {
    // Workers Assets API: fetch domain-routes.json
    const response = await env.ASSETS.fetch('domain-routes.json')

    if (!response.ok) {
      throw new Error(`Assets fetch failed: ${response.status}`)
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('[DomainRoutes] Assets fetch error:', error)
    return []
  }
}

/**
 * Get route for a specific domain
 */
export async function getDomainRoute(hostname: string, env: Env): Promise<DomainRoute | null> {
  const routes = await loadDomainRoutes(env)

  // Exact domain match
  const exactMatch = routes.find(r => r.domain === hostname)
  if (exactMatch) return exactMatch

  // Wildcard subdomain match (*.example.com)
  const wildcardMatch = routes.find(r => {
    if (!r.domain.startsWith('*.')) return false
    const baseDomain = r.domain.substring(2) // Remove *.
    return hostname.endsWith(baseDomain)
  })
  if (wildcardMatch) return wildcardMatch

  return null
}

/**
 * Invalidate cache (called when domain routes are updated)
 */
export async function invalidateDomainRoutesCache(env: Env): Promise<void> {
  domainRoutesCache = null
  await env.KV.delete(KV_CACHE_KEY)
}
```

### Path-Based Routing

```ts
/**
 * Path-based routing rules
 *
 * These routes take priority over domain-based routing.
 */

/**
 * Path-based route rules (highest priority)
 */
const PATH_ROUTES: PathRouteRule[] = [
  // Core services
  {
    pattern: /^\/api\/db\//,
    service: 'db',
    binding: 'DB_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/auth\//,
    service: 'auth',
    binding: 'AUTH_SERVICE',
    requiresAuth: false,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/schedule\//,
    service: 'schedule',
    binding: 'SCHEDULE_SERVICE',
    requiresAuth: true,
    requiresAdmin: true,
  },
  {
    pattern: /^\/api\/webhooks\//,
    service: 'webhooks',
    binding: 'WEBHOOKS_SERVICE',
    requiresAuth: false,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/email\//,
    service: 'email',
    binding: 'EMAIL_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/queue\//,
    service: 'queue',
    binding: 'QUEUE_SERVICE',
    requiresAuth: true,
    requiresAdmin: true,
  },

  // AI services
  {
    pattern: /^\/api\/ai\//,
    service: 'ai',
    binding: 'AI_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/embeddings\//,
    service: 'embeddings',
    binding: 'EMBEDDINGS_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },

  // Domain services
  {
    pattern: /^\/api\/agents\//,
    service: 'agents',
    binding: 'AGENTS_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/workflows\//,
    service: 'workflows',
    binding: 'WORKFLOWS_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/business\//,
    service: 'business',
    binding: 'BUSINESS_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },

  // Integration services
  {
    pattern: /^\/api\/stripe\//,
    service: 'stripe',
    binding: 'STRIPE_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/github\//,
    service: 'github',
    binding: 'GITHUB_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },

  // MCP server (AI agent tools)
  {
    pattern: /^\/mcp\//,
    service: 'mcp',
    binding: 'MCP_SERVICE',
    requiresAuth: false,
    requiresAdmin: false,
  },

  // Public routes
  {
    pattern: /^\/waitlist\//,
    service: 'waitlist',
    binding: 'WAITLIST_SERVICE',
    requiresAuth: false,
    requiresAdmin: false,
  },
]

/**
 * Match a path against route rules
 */
export function matchPathRoute(pathname: string, hostname: string): RouteConfig | null {
  for (const rule of PATH_ROUTES) {
    if (rule.pattern.test(pathname)) {
      return {
        service: rule.service,
        binding: rule.binding,
        path: pathname,
        requiresAuth: rule.requiresAuth,
        requiresAdmin: rule.requiresAdmin,
      }
    }
  }

  return null
}
```

### Main Worker Implementation



## Related Documentation

- **[workers/CLAUDE.md](../CLAUDE.md)** - Workers architecture overview
- **[Root CLAUDE.md](../../CLAUDE.md)** - Multi-repo structure
- **Assets:** `assets/domain-routes.json` - Domain mappings (1,273 domains)

## Architecture Benefits

✅ **Single Entry Point** - One worker handles all HTTP traffic
✅ **Flexible Routing** - DNS, zones, or custom domains
✅ **No Route Limits** - No wrangler.jsonc route limits (1,273+ domains supported)
✅ **Dynamic Configuration** - domain-routes.json updates without redeploy (10s SWR cache)
✅ **Custom Domains for SaaS** - Easy tenant-specific domains
✅ **Complete Observability** - All requests logged centrally
✅ **Unified Security** - Single authentication and rate limiting point
✅ **Independent Service Scaling** - Route traffic based on load
✅ **Zero Service Exposure** - No worker has public access except this one

## Production Deployment

**Current Deployment:** https://api.drivly.workers.dev

The API worker is deployed to Cloudflare Workers and handles all incoming HTTP traffic for the entire platform. It is the **only** worker with public routes enabled.

**Key Metrics:**
- **Services Connected:** 20+ microservices via RPC
- **Domains Supported:** 1,273+ via domain-routes.json
- **Rate Limiting:** 100 requests/minute per user/IP
- **Cache Duration:** 10 seconds (SWR for domain routes)
- **Dependencies:** KV (cache + rate limiting), Assets (domain config)

---

**Generated from:** api.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts api.mdx`
