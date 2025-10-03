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
import type { GatewayEnv, GatewayContext, GatewayResponse } from './types'
import { matchRoute, getServiceForDomain, requiresAuth as routeRequiresAuth, requiresAdmin as routeRequiresAdmin } from './router'
import { authenticate, requireAuth, requireAdmin } from './middleware/auth'
import { rateLimit } from './middleware/ratelimit'
import { generateRequestId, logRequest, logResponse, logError, addMetricsHeaders } from './middleware/logging'

// ==================== RPC Service ====================

export class GatewayService extends WorkerEntrypoint<GatewayEnv> {
  /**
   * Route a request to the appropriate service via RPC
   */
  async route(url: string, options?: RequestInit): Promise<GatewayResponse> {
    const request = new Request(url, options)
    const response = await this.fetch(request)

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

const app = new Hono<{ Bindings: GatewayEnv }>()

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
    if (routeRequiresAuth(url.pathname, c.req.method)) {
      const authResponse = requireAuth(ctx)
      if (authResponse) {
        logResponse(c.req.raw, authResponse, ctx)
        return authResponse
      }
    }

    // Check admin requirements
    if (routeRequiresAdmin(url.pathname, c.req.method)) {
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

// Export types for consumers
export * from './types'
export * from './router'
