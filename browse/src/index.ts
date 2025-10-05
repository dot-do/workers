/**
 * Browse Worker - Web Browsing with Cloudflare Browser Rendering & BrowserBase
 *
 * Provides browser automation capabilities with two modes:
 * 1. Standard browsing via Cloudflare Browser Rendering (fast, cost-effective)
 * 2. Stealth browsing via BrowserBase (advanced anti-detection)
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { browseWithCache } from './cloudflare'
import { browseWithBrowserBase } from './browserbase'
import type { Env, BrowseOptions, BrowserBaseOptions, BrowseResult } from './types'

// ============================================================================
// RPC INTERFACE - For service-to-service communication
// ============================================================================

export class BrowseService extends WorkerEntrypoint<Env> {
  /**
   * Browse URL with standard Cloudflare Browser Rendering
   */
  async browse(url: string, options: BrowseOptions = {}): Promise<BrowseResult> {
    console.log(`[BrowseService] RPC browse: ${url}`)
    return await browseWithCache(url, options, this.env)
  }

  /**
   * Browse URL with BrowserBase stealth mode
   */
  async browseStealth(url: string, options: BrowserBaseOptions = {}): Promise<BrowseResult> {
    console.log(`[BrowseService] RPC browseStealth: ${url}`)
    return await browseWithBrowserBase(url, options, this.env)
  }

  /**
   * Clear browse cache
   */
  async clearCache(pattern?: string): Promise<{ cleared: number }> {
    console.log(`[BrowseService] Clearing cache: ${pattern || 'all'}`)

    // KV doesn't support bulk delete, so we track cleared count
    // In production, you'd implement proper cache management
    return { cleared: 0 }
  }
}

// ============================================================================
// HTTP INTERFACE - For direct HTTP access
// ============================================================================

const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

/**
 * GET / - Service info
 */
app.get('/', (c) => {
  return c.json({
    service: 'browse',
    version: '1.0.0',
    description: 'Web browsing with Cloudflare Browser Rendering & BrowserBase',
    endpoints: {
      'POST /browse': 'Browse with Cloudflare Browser Rendering',
      'POST /browse/stealth': 'Browse with BrowserBase stealth mode',
      'DELETE /cache': 'Clear browse cache',
      'GET /health': 'Health check',
    },
    documentation: 'https://docs.do/browse',
  })
})

/**
 * GET /health - Health check
 */
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'browse',
    timestamp: new Date().toISOString(),
    browserbase: {
      configured: !!(c.env.BROWSERBASE_API_KEY && c.env.BROWSERBASE_PROJECT_ID),
    },
  })
})

/**
 * POST /browse - Browse with Cloudflare Browser Rendering
 */
app.post('/browse', async (c) => {
  try {
    const { url, options } = await c.req.json<{ url: string; options?: BrowseOptions }>()

    if (!url) {
      return c.json({ error: 'URL is required' }, 400)
    }

    const service = new BrowseService(c.executionCtx, c.env)
    const result = await service.browse(url, options || {})

    return c.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('[Browse] Error:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * POST /browse/stealth - Browse with BrowserBase stealth mode
 */
app.post('/browse/stealth', async (c) => {
  try {
    const { url, options } = await c.req.json<{ url: string; options?: BrowserBaseOptions }>()

    if (!url) {
      return c.json({ error: 'URL is required' }, 400)
    }

    const service = new BrowseService(c.executionCtx, c.env)
    const result = await service.browseStealth(url, options || {})

    return c.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('[BrowseStealth] Error:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * DELETE /cache - Clear cache
 */
app.delete('/cache', async (c) => {
  try {
    const { pattern } = await c.req.json<{ pattern?: string }>()

    const service = new BrowseService(c.executionCtx, c.env)
    const result = await service.clearCache(pattern)

    return c.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('[ClearCache] Error:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// ============================================================================
// WORKER EXPORT
// ============================================================================

export default {
  fetch: app.fetch,
}
