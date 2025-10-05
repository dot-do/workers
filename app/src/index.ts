/**
 * App Service - Admin CMS Worker
 *
 * Proxies requests to Payload CMS deployed on Cloudflare Pages
 * Provides RPC interface for service-to-service calls
 *
 * Features:
 * - Proxies to Payload CMS Pages deployment
 * - Session management
 * - File upload handling
 * - Database access via service bindings
 *
 * Interfaces:
 * - RPC (WorkerEntrypoint) for service-to-service calls
 * - HTTP (Hono) for REST API proxy
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

/**
 * App Service RPC Interface
 */
export class AppService extends WorkerEntrypoint<AppEnv> {
  /**
   * Handle HTTP requests via Hono app
   */
  fetch(request: Request): Response | Promise<Response> {
    return app.fetch(request, this.env, this.ctx)
  }

  /**
   * Get app health status
   */
  async health(): Promise<HealthResponse> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    }
  }
}

// ==================== HTTP Interface ====================

type HonoEnv = {
  Bindings: AppEnv
}

const app = new Hono<HonoEnv>()

// Global CORS middleware
app.use('*', cors())

// Health check endpoint
app.get('/health', c => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'app',
  })
})

// Proxy all other requests to Payload CMS (deployed via Pages)
app.all('*', async c => {
  const url = new URL(c.req.url)

  // Determine Payload URL (default or custom)
  const payloadBaseUrl = c.env.PAYLOAD_URL || 'https://admin-payload.pages.dev'
  const payloadUrl = new URL(url.pathname + url.search, payloadBaseUrl)

  try {
    // Forward request to Payload Pages deployment
    const response = await fetch(payloadUrl, {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
    })

    // Return response from Payload
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  } catch (error) {
    console.error('[App Worker] Error proxying to Payload:', error)
    return c.json(
      {
        error: 'Proxy error',
        message: error instanceof Error ? error.message : 'Unknown error',
        service: 'app',
      },
      { status: 502 }
    )
  }
})

// ==================== Worker Export ====================

export default {
  fetch: app.fetch,
}
