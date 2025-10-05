/**
 * Scraper Worker - Screenshot Service
 *
 * Captures screenshots of web pages using the browse worker.
 * Provides intelligent caching via R2 storage.
 * Optimized for Claude Code screenshot analysis.
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { captureScreenshot, cleanupExpiredScreenshots } from './screenshot'
import type { Env, ScreenshotOptions, ScreenshotResult } from './types'

// ============================================================================
// RPC INTERFACE - For service-to-service communication
// ============================================================================

export class ScraperService extends WorkerEntrypoint<Env> {
  /**
   * Capture screenshot of URL
   */
  async screenshot(url: string, options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
    console.log(`[ScraperService] RPC screenshot: ${url}`)
    return await captureScreenshot(url, options, this.env)
  }

  /**
   * Clear screenshot cache
   */
  async clearCache(urlPattern?: string): Promise<{ cleared: number }> {
    console.log(`[ScraperService] Clearing cache: ${urlPattern || 'all'}`)

    let cleared = 0

    try {
      // List all objects
      const list = await this.env.SCREENSHOT_CACHE.list()

      for (const object of list.objects) {
        // Match URL pattern if provided
        if (urlPattern) {
          const metadata = object.customMetadata
          if (metadata?.url && metadata.url.includes(urlPattern)) {
            await this.env.SCREENSHOT_CACHE.delete(object.key)
            cleared++
          }
        } else {
          // Clear all
          await this.env.SCREENSHOT_CACHE.delete(object.key)
          cleared++
        }
      }

      console.log(`[ScraperService] Cleared ${cleared} screenshots`)
    } catch (error) {
      console.error('[ScraperService] Cache clear error:', error)
    }

    return { cleared }
  }

  /**
   * Cleanup expired screenshots
   */
  async cleanupExpired(): Promise<{ deleted: number }> {
    console.log('[ScraperService] Running cleanup')
    return await cleanupExpiredScreenshots(this.env)
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
    service: 'scraper',
    version: '1.0.0',
    description: 'Screenshot service with R2 caching',
    endpoints: {
      'POST /screenshot': 'Capture screenshot',
      'DELETE /cache': 'Clear cache',
      'POST /cleanup': 'Cleanup expired screenshots',
      'GET /health': 'Health check',
    },
    documentation: 'https://docs.do/scraper',
  })
})

/**
 * GET /health - Health check
 */
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'scraper',
    timestamp: new Date().toISOString(),
    storage: {
      type: 'R2',
      bucket: 'SCREENSHOT_CACHE',
    },
  })
})

/**
 * POST /screenshot - Capture screenshot
 */
app.post('/screenshot', async (c) => {
  try {
    const { url, options } = await c.req.json<{ url: string; options?: ScreenshotOptions }>()

    if (!url) {
      return c.json({ error: 'URL is required' }, 400)
    }

    const service = new ScraperService(c.executionCtx, c.env)
    const result = await service.screenshot(url, options || {})

    return c.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('[Screenshot] Error:', error)
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
    const { url } = await c.req.json<{ url?: string }>().catch(() => ({}))

    const service = new ScraperService(c.executionCtx, c.env)
    const result = await service.clearCache(url)

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

/**
 * POST /cleanup - Cleanup expired screenshots
 */
app.post('/cleanup', async (c) => {
  try {
    const service = new ScraperService(c.executionCtx, c.env)
    const result = await service.cleanupExpired()

    return c.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('[Cleanup] Error:', error)
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
// SCHEDULED HANDLER - Automatic cleanup
// ============================================================================

export default {
  fetch: app.fetch,

  // Run cleanup daily
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('[Scraper] Running scheduled cleanup')

    ctx.waitUntil(
      cleanupExpiredScreenshots(env)
        .then((result) => console.log(`[Scraper] Cleanup complete: ${result.deleted} deleted`))
        .catch((error) => console.error('[Scraper] Cleanup error:', error))
    )
  },
}
