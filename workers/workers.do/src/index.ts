/**
 * workers.do - Workers for Platforms Service
 *
 * Full Workers for Platforms implementation:
 * - Deployment API (deploy, static sites, OpenNext)
 * - Dispatch API (route to deployed workers)
 * - Proxy/Router (subdomain and path-based routing)
 * - User Registry DO (per-user worker metadata)
 * - Analytics pipeline integration
 */

import { Hono } from 'hono'
import { WorkersRegistryDO } from './workers-registry-do'
import { deployWorker, getDeployment, listDeployments, deleteDeployment, deployStaticSite, deployOpenNext } from './deploy'
import { dispatchToWorker, dispatchById, dispatchByName } from './dispatch'
import { routeRequest, extractAppId } from './router'
import { serveAsset, hasRangeHeader, serveRangeRequest, serve404 } from './assets'
import { withAnalytics, captureRequestEvent } from './middleware/analytics'
import {
  corsMiddleware,
  isAllowedOrigin,
  checkRateLimit,
  addRateLimitHeaders,
  rateLimitExceededResponse,
  deriveUserId,
  parseAuthHeader,
  validateAuthWithRateLimit,
  validateDeployRequest,
  validateJsonContentType,
  validationErrorResponse,
  addSecurityHeaders,
  SECURITY_HEADERS,
} from './middleware/security'
import type { DeployRequest, DispatchRequest } from './types'

export { WorkersRegistryDO }

// Pipeline type for Cloudflare Pipelines
interface Pipeline {
  send(event: unknown): Promise<void>
}

interface Env {
  WORKERS_REGISTRY: DurableObjectNamespace
  // Optional WfP bindings (configured separately)
  apps?: DispatchNamespace
  esbuild?: Fetcher
  deployments?: KVNamespace
  db?: D1Database
  analytics?: AnalyticsEngineDataset | Pipeline
  CLICKHOUSE?: Fetcher
}

const app = new Hono<{ Bindings: Env }>()

// Security middleware: CORS validation and security headers
app.use('*', corsMiddleware)

// ============ HEALTH & LANDING ============

// Health check (rate limited)
app.get('/health', async (c) => {
  // Get user ID for rate limiting (anonymous for health check is ok)
  const authHeader = c.req.header('Authorization')
  let userId = 'anonymous'
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) {
      userId = await deriveUserId(token)
    }
  }

  // Check rate limit
  const rateLimit = checkRateLimit(userId)
  const headers: Record<string, string> = {}
  addRateLimitHeaders(headers, rateLimit)

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit)
  }

  return c.json({ status: 'ok', service: 'workers.do' }, { headers })
})

// Landing page / info (browser GET without special headers)
app.get('/', (c) => {
  // Check if this is a WebSocket upgrade or RPC request - forward to DO
  const upgrade = c.req.header('Upgrade')?.toLowerCase()
  const contentType = c.req.header('Content-Type')
  const accept = c.req.header('Accept')

  // Capnweb RPC or JSON API requests go to user's registry DO
  if (upgrade === 'websocket' || contentType?.includes('application/json') || accept?.includes('application/json')) {
    const userId = getUserId(c)
    const id = c.env.WORKERS_REGISTRY.idFromName(userId)
    const stub = c.env.WORKERS_REGISTRY.get(id)
    return stub.fetch(c.req.raw)
  }

  return c.json({
    service: 'workers.do',
    status: 'healthy',
    version: '2.0.0',
    description: 'Workers for Platforms deployment and registry service',
    capabilities: ['deploy', 'dispatch', 'proxy', 'assets', 'analytics', 'registry'],
    endpoints: {
      health: 'GET /health',
      deploy: 'POST /api/deploy',
      deployStatic: 'POST /api/deploy-static',
      deployOpenNext: 'POST /api/deploy-opennext',
      dispatch: 'POST /api/dispatch',
      list: 'GET /api/deployments',
      get: 'GET /api/deployments/:id',
      delete: 'DELETE /api/deployments/:id',
      registry: 'POST / (capnweb RPC)',
      proxy: 'ANY {app-id}.apps.workers.do/*'
    }
  })
})

// POST to root - could be RPC or JSON body
app.post('/', async (c) => {
  const contentType = c.req.header('Content-Type') || ''

  // Capnweb RPC requests go to user's registry DO
  if (contentType.includes('application/json')) {
    const userId = getUserId(c)
    const id = c.env.WORKERS_REGISTRY.idFromName(userId)
    const stub = c.env.WORKERS_REGISTRY.get(id)
    return stub.fetch(c.req.raw)
  }

  // Otherwise 400
  return c.json({ error: 'Invalid request' }, 400)
})

// ============ DEPLOYMENT API ============

// Check if WfP is configured
function isWfPConfigured(env: Env): boolean {
  return !!(env.apps && env.esbuild && env.deployments && env.db)
}

// Deploy worker
app.post('/api/deploy', async (c) => {
  // Validate Content-Type first
  const contentType = c.req.header('Content-Type')
  if (!contentType || !contentType.includes('application/json')) {
    return c.json(
      { success: false, error: 'Content-Type must be application/json' },
      415
    )
  }

  // Parse and validate input BEFORE checking WfP
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const validationError = validateDeployRequest(body)
  if (validationError) {
    return c.json(validationError, 400)
  }

  // Now check WfP configuration
  if (!isWfPConfigured(c.env)) {
    return c.json({
      success: false,
      error: 'Workers for Platforms not configured. Required bindings: apps, esbuild, deployments, db'
    }, 503)
  }

  try {
    const result = await deployWorker(body as DeployRequest, c.env as any)
    return c.json(result, result.success ? 200 : 400)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return c.json({ success: false, error: errorMessage }, 500)
  }
})

// Deploy static site
app.post('/api/deploy-static', async (c) => {
  if (!isWfPConfigured(c.env)) {
    return c.json({
      success: false,
      error: 'Workers for Platforms not configured. Required bindings: apps, esbuild, deployments, db'
    }, 503)
  }
  try {
    const body = await c.req.json() as any
    const result = await deployStaticSite(body, c.env as any)
    return c.json(result, result.success ? 200 : 400)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return c.json({ success: false, error: errorMessage }, 500)
  }
})

// Deploy OpenNext (Next.js)
app.post('/api/deploy-opennext', async (c) => {
  if (!isWfPConfigured(c.env)) {
    return c.json({
      success: false,
      error: 'Workers for Platforms not configured. Required bindings: apps, esbuild, deployments, db'
    }, 503)
  }
  try {
    const body = await c.req.json() as any
    const result = await deployOpenNext(body, c.env as any)
    return c.json(result, result.success ? 200 : 400)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return c.json({ success: false, error: errorMessage }, 500)
  }
})

// ============ DISPATCH API ============

// Dispatch to worker (JSON API)
app.post('/api/dispatch', async (c) => {
  if (!c.env.apps || !c.env.deployments) {
    return c.json({
      success: false,
      error: 'Workers for Platforms not configured. Required bindings: apps, deployments'
    }, 503)
  }
  try {
    const body = (await c.req.json()) as DispatchRequest
    const result = await dispatchToWorker(body, c.env as any)
    return c.json(result, result.success ? 200 : 400)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return c.json({ success: false, error: errorMessage }, 500)
  }
})

// ============ DEPLOYMENTS MANAGEMENT ============

// List deployments
app.get('/api/deployments', async (c) => {
  if (!c.env.db) {
    return c.json({ success: false, error: 'D1 database not configured' }, 503)
  }
  const result = await listDeployments(c.env as any)
  return c.json(result)
})

// Get deployment by ID
app.get('/api/deployments/:id', async (c) => {
  if (!c.env.deployments) {
    return c.json({ success: false, error: 'KV not configured' }, 503)
  }
  const workerId = c.req.param('id')
  const result = await getDeployment(workerId, c.env as any)
  return c.json(result)
})

// Delete deployment
app.delete('/api/deployments/:id', async (c) => {
  if (!c.env.deployments || !c.env.db) {
    return c.json({ success: false, error: 'KV or D1 not configured' }, 503)
  }
  const workerId = c.req.param('id')
  const result = await deleteDeployment(workerId, c.env as any)
  return c.json(result)
})

// ============ USER REGISTRY (DO) ============

// User's workers list (protected endpoint)
app.get('/workers', async (c) => {
  // Validate authorization and check rate limit
  const authResult = await validateAuthWithRateLimit(c.req.header('Authorization'))
  if ('error' in authResult) {
    return authResult.error
  }

  const { userId, rateLimit } = authResult
  const headers: Record<string, string> = {
    'X-User-Id': userId,
  }
  addRateLimitHeaders(headers, rateLimit)

  const id = c.env.WORKERS_REGISTRY.idFromName(userId)
  const stub = c.env.WORKERS_REGISTRY.get(id)
  const response = await stub.fetch(c.req.raw)

  // Add headers to response
  const newResponse = new Response(response.body, response)
  Object.entries(headers).forEach(([key, value]) => {
    newResponse.headers.set(key, value)
  })

  return newResponse
})

// User's worker by ID (protected endpoint)
app.get('/workers/:workerId', async (c) => {
  // Validate authorization and check rate limit
  const authResult = await validateAuthWithRateLimit(c.req.header('Authorization'))
  if ('error' in authResult) {
    return authResult.error
  }

  const { userId, rateLimit } = authResult
  const headers: Record<string, string> = {
    'X-User-Id': userId,
  }
  addRateLimitHeaders(headers, rateLimit)

  const id = c.env.WORKERS_REGISTRY.idFromName(userId)
  const stub = c.env.WORKERS_REGISTRY.get(id)
  const response = await stub.fetch(c.req.raw)

  // Add headers to response
  const newResponse = new Response(response.body, response)
  Object.entries(headers).forEach(([key, value]) => {
    newResponse.headers.set(key, value)
  })

  return newResponse
})

// ============ HELPER FUNCTIONS ============

// Get user ID from auth token
function getUserId(c: { req: { header: (name: string) => string | undefined } }): string {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return 'anonymous'
  }
  // Hash token for user ID
  const token = auth.slice(7)
  return `user_${token.slice(0, 8)}`
}

// ============ CATCH-ALL: PROXY/ROUTER ============

// All other requests -> check if proxy pattern, otherwise forward to DO
app.all('*', async (c) => {
  const url = new URL(c.req.url)

  // Check if this matches a proxy pattern and WfP is configured
  if (c.env.apps && c.env.deployments) {
    const appMatch = extractAppId(url)
    if (appMatch) {
      // Route to deployed worker
      return await routeRequest(c.req.raw, c.env as any)
    }
  }

  // Forward to user's registry DO for any other paths
  const userId = getUserId(c)
  const id = c.env.WORKERS_REGISTRY.idFromName(userId)
  const stub = c.env.WORKERS_REGISTRY.get(id)
  return stub.fetch(c.req.raw)
})

// ============ EXPORT WITH ANALYTICS ============

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Wrap with analytics middleware if analytics binding exists
    let response: Response
    if (env.analytics) {
      const handler = async (req: Request, e: any, context: ExecutionContext) => {
        return app.fetch(req, e, context)
      }
      response = await withAnalytics(handler)(request, env, ctx)
    } else {
      response = await app.fetch(request, env, ctx)
    }

    // Ensure security headers are added to all responses
    // (they should already be added by corsMiddleware, but this is a safety net)
    return addSecurityHeaders(response, request.url.startsWith('https://'))
  }
} satisfies ExportedHandler<Env>
