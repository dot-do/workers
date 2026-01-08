/**
 * Router Snippet - Dynamic Routing to Static Assets
 *
 * Routes requests to static assets based on hostname.
 * Enables 100k+ sites from a single Workers Static Assets deployment.
 *
 * Architecture:
 * - Hostname extraction: my-site.workers.do -> my-site
 * - Static Assets path: sites/{siteName}.json
 * - Content negotiation: HTML (browsers), MDX (editors), JS (dynamic)
 *
 * Free-tier limits:
 * - Snippets: <5ms CPU, <32KB compressed, no bindings
 * - Static Assets: 100k files x 25MB per file
 * - Subrequests: 1 per snippet invocation
 *
 * Site bundle format:
 * { module: "compiled JS", mdx: "raw MDX", html: "rendered HTML", meta?: {...} }
 */

// ============================================================================
// Types
// ============================================================================

interface SiteMeta {
  name: string
  title?: string
  description?: string
  version?: number
  customHeaders?: Record<string, string>
}

interface SiteBundle {
  module: string
  mdx: string
  html: string
  meta?: SiteMeta
}

interface RouterConfig {
  /** Base domain for *.{baseDomain} pattern matching */
  baseDomain: string
  /** Static assets base URL */
  assetsBaseUrl: string
  /** Fallback worker URL for custom domains */
  fallbackWorkerUrl: string
  /** Cache TTL in seconds */
  cacheTtl: number
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: RouterConfig = {
  baseDomain: 'workers.do',
  assetsBaseUrl: 'https://static.workers.do',
  fallbackWorkerUrl: 'https://multi-tenant.workers.do',
  cacheTtl: 60,
}

// ============================================================================
// Hostname Extraction
// ============================================================================

/**
 * Extract site name from hostname
 *
 * Patterns:
 * - my-site.workers.do -> my-site
 * - sub.my-site.workers.do -> sub.my-site (nested subdomains)
 * - custom.example.com -> null (requires DO lookup)
 *
 * @param hostname - Request hostname
 * @param baseDomain - Base domain to match against
 * @returns Site name or null if custom domain
 */
function extractSiteName(hostname: string, baseDomain: string): string | null {
  const lowerHostname = hostname.toLowerCase()
  const lowerBaseDomain = baseDomain.toLowerCase()

  // Check if hostname ends with .{baseDomain}
  const suffix = `.${lowerBaseDomain}`
  if (lowerHostname.endsWith(suffix)) {
    // Extract everything before the base domain
    const sitePart = lowerHostname.slice(0, -suffix.length)
    if (sitePart && isValidSiteName(sitePart)) {
      return sitePart
    }
  }

  // Check if hostname is exactly the base domain (no subdomain)
  if (lowerHostname === lowerBaseDomain) {
    return 'www' // Default site for bare domain
  }

  // Custom domain - needs worker lookup
  return null
}

/**
 * Validate site name format
 *
 * Valid: lowercase alphanumeric with hyphens and dots (for nested)
 * Invalid: starts/ends with hyphen, consecutive dots, special chars
 */
function isValidSiteName(name: string): boolean {
  if (!name || name.length > 63) return false
  if (name.startsWith('-') || name.endsWith('-')) return false
  if (name.includes('..')) return false
  return /^[a-z0-9][a-z0-9.-]*[a-z0-9]$|^[a-z0-9]$/.test(name)
}

// ============================================================================
// Content Serving
// ============================================================================

/**
 * Serve site bundle with content negotiation
 *
 * @param request - Original request
 * @param bundle - Site bundle content
 * @param siteName - Site identifier
 * @param cacheTtl - Cache TTL in seconds
 */
function serveBundleContent(
  request: Request,
  bundle: SiteBundle,
  siteName: string,
  cacheTtl: number
): Response {
  const accept = request.headers.get('accept') || ''
  const meta = bundle.meta

  // Build common headers
  const commonHeaders: Record<string, string> = {
    'X-Site': siteName,
    'X-Served-By': 'router-snippet',
    'Cache-Control': `public, max-age=${cacheTtl}`,
    ...(meta?.version ? { 'X-Site-Version': String(meta.version) } : {}),
    ...(meta?.customHeaders || {}),
  }

  // HTML for browsers
  if (accept.includes('text/html')) {
    return new Response(bundle.html, {
      headers: {
        ...commonHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  }

  // Markdown for editors and documentation tools
  if (accept.includes('text/markdown') || accept.includes('text/x-markdown')) {
    return new Response(bundle.mdx, {
      headers: {
        ...commonHeaders,
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    })
  }

  // JavaScript module for dynamic execution
  return new Response(bundle.module, {
    headers: {
      ...commonHeaders,
      'Content-Type': 'application/javascript; charset=utf-8',
    },
  })
}

/**
 * Serve /llms.txt endpoint
 *
 * Returns all MDX content for LLM consumption (AI crawlers, Claude, etc.)
 */
function serveLlmsTxt(bundle: SiteBundle, siteName: string): Response {
  const meta = bundle.meta

  // Build LLM-friendly header with site context
  const header = meta
    ? `# ${meta.title || meta.name}\n${meta.description ? `\n${meta.description}\n` : ''}\n---\n\n`
    : ''

  const content = header + bundle.mdx

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Site': siteName,
      'X-Content-Type': 'llms.txt',
      'Cache-Control': 'public, max-age=3600', // Longer cache for LLM content
    },
  })
}

/**
 * Build error response
 */
function errorResponse(message: string, status: number, siteName?: string): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
  }

  if (siteName) {
    headers['X-Site'] = siteName
  }

  return new Response(message, { status, headers })
}

// ============================================================================
// Main Router
// ============================================================================

/**
 * Router Snippet - Main entry point
 *
 * Workflow:
 * 1. Extract site name from hostname
 * 2. If valid site name, fetch from Static Assets
 * 3. If custom domain or fetch fails, forward to worker
 * 4. Serve content with appropriate format
 *
 * This snippet uses 1 subrequest to either:
 * - Static Assets (fast path for known sites)
 * - Fallback worker (for custom domains or failures)
 */
export async function routerSnippet(
  request: Request,
  config: RouterConfig = DEFAULT_CONFIG
): Promise<Response> {
  const url = new URL(request.url)
  const hostname = url.hostname
  const pathname = url.pathname

  // Extract site name from hostname
  const siteName = extractSiteName(hostname, config.baseDomain)

  // Custom domain - forward to worker for DO lookup
  if (!siteName) {
    return forwardToWorker(request, config.fallbackWorkerUrl)
  }

  // Build Static Assets URL
  const bundleUrl = `${config.assetsBaseUrl}/sites/${siteName}.json`

  try {
    // Fetch bundle from Static Assets
    const bundleResponse = await fetch(bundleUrl)

    if (!bundleResponse.ok) {
      // Site not found in Static Assets
      // Could be a new site or custom domain - forward to worker
      if (bundleResponse.status === 404) {
        return forwardToWorker(request, config.fallbackWorkerUrl)
      }

      return errorResponse(
        `Failed to load site: ${bundleResponse.status}`,
        bundleResponse.status,
        siteName
      )
    }

    const bundle: SiteBundle = await bundleResponse.json()

    // Special route: /llms.txt
    if (pathname === '/llms.txt') {
      return serveLlmsTxt(bundle, siteName)
    }

    // Serve content based on Accept header
    return serveBundleContent(request, bundle, siteName, config.cacheTtl)
  } catch (error) {
    // Network or parsing error - forward to worker as fallback
    console.error(`Router snippet error for ${siteName}:`, error)
    return forwardToWorker(request, config.fallbackWorkerUrl)
  }
}

/**
 * Forward request to fallback worker
 *
 * Used when:
 * - Custom domain needs DO lookup
 * - Static Assets fetch fails
 * - Site not found in Static Assets
 */
async function forwardToWorker(request: Request, workerUrl: string): Promise<Response> {
  const url = new URL(request.url)

  // Build forwarded URL preserving path and query
  const forwardUrl = new URL(url.pathname + url.search, workerUrl)

  // Forward request with original headers
  const forwardRequest = new Request(forwardUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow',
  })

  // Add forwarding headers
  forwardRequest.headers.set('X-Forwarded-Host', url.hostname)
  forwardRequest.headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''))

  return fetch(forwardRequest)
}

// ============================================================================
// Export
// ============================================================================

export default { fetch: routerSnippet }
