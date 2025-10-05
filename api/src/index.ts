/**
 * API Worker - The ONLY worker with a public fetch handler
 *
 * This worker serves as the single entry point for all HTTP traffic in the system.
 * It handles:
 * - Domain-based routing (domain.com → specific service)
 * - Path-based routing (/api/service/* → service)
 * - Auth requirements checking (anon vs authenticated routes)
 * - Dynamic domain routing stored in Workers Assets (with SWR cache, 10s updates)
 * - Waitlist routing for unmatched domains
 * - Request logging and metrics
 *
 * All other workers should ONLY expose RPC interfaces (WorkerEntrypoint).
 * The `do` worker provides RPC-to-RPC proxy functionality for internal service calls.
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'

// ==================== HTTP Interface ====================

type HonoEnv = {
  Bindings: Env
  Variables: {
    ctx: ApiContext
  }
}

const app = new Hono<HonoEnv>()

// Global CORS middleware
app.use('*', cors())

// Main request handler with all middleware
app.use('*', async (c, next) => {
  const startTime = Date.now()
  const requestId = generateRequestId()
  const url = new URL(c.req.url)

  // Create request context
  const ctx: ApiContext = {
    requestId,
    startTime,
    env: c.env,
    executionCtx: c.executionCtx,
  }

  // Store context for downstream handlers
  c.set('ctx', ctx)

  // Log incoming request
  logRequest(c.req.raw, ctx)

  try {
    // 1. Authenticate (always attempt, even for public routes)
    const auth = await authenticateRequest(c.req.raw, ctx)
    if (auth) {
      ctx.auth = auth
    }

    // 2. Check rate limit
    const rateLimitResponse = await rateLimitCheck(c.req.raw, ctx)
    if (rateLimitResponse) {
      logResponse(c.req.raw, rateLimitResponse, ctx)
      return rateLimitResponse
    }

    // 3. Determine routing strategy
    const route = await determineRoute(url, ctx)

    // 4. Check auth requirements for this route
    if (route.requiresAuth && !ctx.auth) {
      const response = new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required',
          requestId: ctx.requestId,
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
      logResponse(c.req.raw, response, ctx)
      return response
    }

    if (route.requiresAdmin && (!ctx.auth || !ctx.auth.isAdmin)) {
      const response = new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'Admin access required',
          requestId: ctx.requestId,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
      logResponse(c.req.raw, response, ctx)
      return response
    }

    // 5. Route to appropriate service
    const serviceResponse = await routeToService(c.req.raw, route, ctx)

    // 6. Add metrics and log response
    const enhancedResponse = addMetrics(serviceResponse, ctx)
    logResponse(c.req.raw, enhancedResponse, ctx)

    return enhancedResponse
  } catch (error) {
    console.error('[API] Error:', error)

    const errorResponse = new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: ctx.requestId,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )

    logResponse(c.req.raw, errorResponse, ctx)
    return errorResponse
  }
})

// Health check endpoint
app.get('/health', c => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'api',
  })
})

// ==================== Routing Logic ====================

/**
 * Determine which route to use based on domain and path
 *
 * Priority:
 * 1. Special routing (*.apis.do subdomains, sites.do paths)
 * 2. Path-based routes (/api/service/*)
 * 3. Domain-based routes (service.do, custom.domain.com)
 * 4. Waitlist for unmatched domains
 */
async function determineRoute(url: URL, ctx: ApiContext): Promise<RouteConfig> {
  // Strategy 0: Special subdomain/path routing
  const specialRoute = handleSpecialRouting(url)
  if (specialRoute) {
    return specialRoute
  }

  // Strategy 1: Path-based routing
  const pathRoute = matchPathRoute(url.pathname, url.hostname)
  if (pathRoute) {
    return pathRoute
  }

  // Strategy 2: Domain-based routing (from Workers Assets cache)
  const domainRoute = await getDomainRoute(url.hostname, ctx.env)
  if (domainRoute) {
    return {
      service: domainRoute.service,
      binding: domainRoute.binding,
      path: url.pathname,
      requiresAuth: domainRoute.requiresAuth ?? false,
      requiresAdmin: domainRoute.requiresAdmin ?? false,
      metadata: domainRoute.metadata,
    }
  }

  // Strategy 3: Route to waitlist for unmatched domains
  return {
    service: 'waitlist',
    binding: 'WAITLIST_SERVICE',
    path: url.pathname,
    requiresAuth: false,
    requiresAdmin: false,
    metadata: {
      domain: url.hostname,
      generatedWaitlist: true,
    },
  }
}

/**
 * Handle special routing patterns
 *
 * *.apis.do → Extract subdomain and route to service
 *   agents.apis.do → agent service
 *   db.apis.do → db service
 *   fn.apis.do → fn service
 *
 * sites.do/* → Extract path and route to service
 *   sites.do/api.management → path-based routing
 */
function handleSpecialRouting(url: URL): RouteConfig | null {
  const hostname = url.hostname

  // Handle *.apis.do subdomains
  if (hostname.endsWith('.apis.do')) {
    const subdomain = hostname.replace('.apis.do', '')

    // Map subdomain to service
    const serviceMap: Record<string, { service: string; binding: string }> = {
      'agents': { service: 'agent', binding: 'AGENT_SERVICE' },
      'agent': { service: 'agent', binding: 'AGENT_SERVICE' },
      'db': { service: 'db', binding: 'DB_SERVICE' },
      'database': { service: 'db', binding: 'DB_SERVICE' },
      'fn': { service: 'fn', binding: 'FN_SERVICE' },
      'functions': { service: 'fn', binding: 'FN_SERVICE' },
      'auth': { service: 'auth', binding: 'AUTH_SERVICE' },
      'gateway': { service: 'gateway', binding: 'GATEWAY_SERVICE' },
    }

    const mapping = serviceMap[subdomain]
    if (mapping) {
      return {
        service: mapping.service,
        binding: mapping.binding,
        path: url.pathname,
        requiresAuth: false,
        requiresAdmin: false,
      }
    }
  }

  // Handle sites.do/* path-based routing
  if (hostname === 'sites.do' || hostname.endsWith('.sites.do')) {
    // Extract first path segment as service name (for main domain)
    // Or use subdomain (for subdomains)
    let sitesPath: string | undefined

    if (hostname.endsWith('.sites.do')) {
      // For subdomains like api.management.sites.do, extract the full subdomain
      sitesPath = hostname.replace('.sites.do', '')
    } else {
      // For sites.do/api.management, extract the first path segment
      const pathParts = url.pathname.split('/').filter(Boolean)
      if (pathParts.length > 0) {
        sitesPath = pathParts[0]
      }
    }

    // Route to gateway for sites.do handling
    return {
      service: 'gateway',
      binding: 'GATEWAY_SERVICE',
      path: url.pathname,
      requiresAuth: false,
      requiresAdmin: false,
      metadata: {
        sitesPath,
        isSitesDomain: true,
      },
    }
  }

  return null
}

/**
 * Route request to the appropriate service binding
 */
async function routeToService(request: Request, route: RouteConfig, ctx: ApiContext): Promise<Response> {
  const serviceBinding = ctx.env[route.binding] as any

  if (!serviceBinding) {
    console.error(`[API] Service binding not found: ${route.binding}`)
    return new Response(
      JSON.stringify({
        error: 'Service not configured',
        message: `Service ${route.service} is not available`,
        requestId: ctx.requestId,
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Forward request to service via fetch (HTTP interface)
    const url = new URL(request.url)
    url.pathname = route.path

    const serviceRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    })

    // Call service via fetch
    const response = await serviceBinding.fetch(serviceRequest)
    return response
  } catch (error) {
    console.error(`[API] Service ${route.service} error:`, error)
    return new Response(
      JSON.stringify({
        error: 'Service error',
        message: error instanceof Error ? error.message : 'Unknown error',
        service: route.service,
        requestId: ctx.requestId,
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// ==================== Worker Export ====================

export default {
  fetch: app.fetch,
}
