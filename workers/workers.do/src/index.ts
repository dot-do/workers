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
import { cors } from 'hono/cors'
import { WorkersRegistryDO } from './workers-registry-do'
import { deployWorker, getDeployment, listDeployments, deleteDeployment, deployStaticSite, deployOpenNext } from './deploy'
import { dispatchToWorker, dispatchById, dispatchByName } from './dispatch'
import { routeRequest, extractAppId } from './router'
import { serveAsset, hasRangeHeader, serveRangeRequest, serve404 } from './assets'
import { withAnalytics, captureRequestEvent } from './middleware/analytics'
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

// CORS for browser clients
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// ============ HEALTH & LANDING ============

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'workers.do' }))

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
  if (!isWfPConfigured(c.env)) {
    return c.json({
      success: false,
      error: 'Workers for Platforms not configured. Required bindings: apps, esbuild, deployments, db'
    }, 503)
  }
  try {
    const body = (await c.req.json()) as DeployRequest
    const result = await deployWorker(body, c.env as any)
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

// User's workers list
app.get('/workers', async (c) => {
  const userId = getUserId(c)
  const id = c.env.WORKERS_REGISTRY.idFromName(userId)
  const stub = c.env.WORKERS_REGISTRY.get(id)
  return stub.fetch(c.req.raw)
})

// User's worker by ID
app.get('/workers/:workerId', async (c) => {
  const userId = getUserId(c)
  const id = c.env.WORKERS_REGISTRY.idFromName(userId)
  const stub = c.env.WORKERS_REGISTRY.get(id)
  return stub.fetch(c.req.raw)
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
    if (env.analytics) {
      const handler = async (req: Request, e: any, context: ExecutionContext) => {
        return app.fetch(req, e, context)
      }
      return await withAnalytics(handler)(request, env, ctx)
    }
    return app.fetch(request, env, ctx)
  }
} satisfies ExportedHandler<Env>
