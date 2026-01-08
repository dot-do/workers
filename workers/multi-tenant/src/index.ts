/**
 * @dotdo/multi-tenant - Free-tier Multi-tenant Hosting
 *
 * Serves 100k+ sites from a single Cloudflare Workers deployment using:
 * - Static Assets: Site bundles stored as files (100k files x 25MB)
 * - KV: Site configurations and hostname mappings
 * - Snippets: Auth, caching, and routing at the edge
 *
 * Architecture:
 * ```
 * Request (my-site.workers.do)
 *     |
 *     v
 * auth snippet (verify JWT)
 *     |
 *     v
 * cache snippet (cache + analytics)
 *     |
 *     v
 * router snippet (hostname -> site resolution)
 *     |
 *     v
 * MultiTenantDO (site config + content serving)
 *     |
 *     v
 * Static Assets / KV (site bundles)
 *     |
 *     v
 * Response { html | mdx | module }
 * ```
 *
 * @module @dotdo/multi-tenant
 */

import { Hono } from 'hono'
import { MultiTenantDO } from './multi-tenant-do.js'
import type {
  MultiTenantEnv,
  SiteBundle,
  SiteConfig,
  CreateSiteRequest,
  UpdateSiteRequest,
} from './types.js'

// Re-export types and DO
export { MultiTenantDO }
export * from './types.js'

// ============================================================================
// Worker Entry Point
// ============================================================================

const app = new Hono<{ Bindings: MultiTenantEnv }>()

/**
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'multi-tenant',
    timestamp: new Date().toISOString(),
  })
})

/**
 * Site management API
 *
 * All site operations go through the MultiTenantDO for consistency.
 */
app.all('/api/*', async (c) => {
  const doId = c.env.MULTI_TENANT.idFromName('global')
  const stub = c.env.MULTI_TENANT.get(doId)
  return stub.fetch(c.req.raw)
})

/**
 * Serve site content based on hostname
 *
 * This is the main entry point for serving multi-tenant sites.
 * The snippet cascade (auth -> cache -> router) happens before this.
 */
app.all('*', async (c) => {
  const hostname = c.req.header('Host') || new URL(c.req.url).hostname
  const path = new URL(c.req.url).pathname

  // Try to serve from Static Assets first (fastest path)
  const siteName = extractSiteName(hostname)

  if (siteName) {
    try {
      // Attempt to fetch from Static Assets
      const assetPath = `sites/${siteName}.json`
      const assetResponse = await c.env.ASSETS.fetch(
        new Request(`https://assets/${assetPath}`)
      )

      if (assetResponse.ok) {
        const bundle = await assetResponse.json() as SiteBundle

        // Serve based on path and content negotiation
        return serveBundle(c.req.raw, bundle, siteName)
      }
    } catch {
      // Fall through to DO for site resolution
    }
  }

  // Fall back to DO for dynamic resolution and API
  const doId = c.env.MULTI_TENANT.idFromName('global')
  const stub = c.env.MULTI_TENANT.get(doId)
  return stub.fetch(c.req.raw)
})

/**
 * Extract site name from hostname
 *
 * Examples:
 * - my-site.workers.do -> my-site
 * - custom.example.com -> null (needs DO lookup)
 */
function extractSiteName(hostname: string): string | null {
  const parts = hostname.split('.')

  // Check for *.workers.do pattern
  if (parts.length >= 3) {
    const domain = parts.slice(-2).join('.')
    if (domain === 'workers.do') {
      return parts[0]
    }
  }

  // Custom domains need DO lookup
  return null
}

/**
 * Serve site bundle based on request
 */
function serveBundle(request: Request, bundle: SiteBundle, siteName: string): Response {
  const url = new URL(request.url)
  const path = url.pathname

  // Special route: /llms.txt
  if (path === '/llms.txt') {
    return new Response(bundle.mdx, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Site': siteName,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  // Content negotiation
  const accept = request.headers.get('Accept') || ''

  if (accept.includes('text/html')) {
    return new Response(bundle.html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Site': siteName,
        'Cache-Control': 'public, max-age=60',
      },
    })
  }

  if (accept.includes('text/markdown') || accept.includes('text/x-markdown')) {
    return new Response(bundle.mdx, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'X-Site': siteName,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  // Default: JavaScript module
  return new Response(bundle.module, {
    headers: {
      'Content-Type': 'application/javascript',
      'X-Site': siteName,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

// ============================================================================
// Export
// ============================================================================

export default {
  fetch: app.fetch,
  // Export DO class for wrangler
  MultiTenantDO,
}
