/**
 * Multi-Tenant Snippet - Hostname Resolution for 100k+ Sites
 *
 * This snippet handles the multi-tenant routing layer in the cascade:
 * auth -> cache -> multi-tenant -> origin
 *
 * It resolves hostnames to site bundles using a two-tier strategy:
 * 1. Fast path: Extract site name from subdomain, fetch from Static Assets
 * 2. Fallback: Forward to worker for custom domain resolution via DO
 *
 * Free-tier optimization:
 * - Uses 1 subrequest (within snippet limits)
 * - Static Assets: 100k files x 25MB = 2.5TB total capacity
 * - No per-site Worker costs
 *
 * @module @dotdo/snippets/multi-tenant
 */

// ============================================================================
// Types
// ============================================================================

interface SiteMeta {
  name: string
  title?: string
  description?: string
  version?: number
  features?: {
    analytics?: boolean
    caching?: boolean
    auth?: boolean
    api?: boolean
    customHeaders?: Record<string, string>
  }
}

interface SiteBundle {
  module: string
  mdx: string
  html: string
  meta?: SiteMeta
}

interface MultiTenantConfig {
  /** Base domains for subdomain extraction (e.g., ['workers.do', 'my-platform.com']) */
  baseDomains: string[]
  /** Static Assets base URL */
  assetsBaseUrl: string
  /** Fallback worker for custom domains and dynamic content */
  fallbackWorkerUrl: string
  /** Default cache TTL for static content */
  defaultCacheTtl: number
  /** Cache TTL for HTML content (shorter for freshness) */
  htmlCacheTtl: number
  /** Cache TTL for LLM content (longer, less time-sensitive) */
  llmCacheTtl: number
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: MultiTenantConfig = {
  baseDomains: ['workers.do'],
  assetsBaseUrl: 'https://static.workers.do',
  fallbackWorkerUrl: 'https://multi-tenant.workers.do',
  defaultCacheTtl: 3600,
  htmlCacheTtl: 60,
  llmCacheTtl: 86400, // 24 hours
}

// ============================================================================
// Hostname Resolution
// ============================================================================

/**
 * Resolve hostname to site name using base domains
 *
 * Tries each base domain in order, returning the first match.
 * Custom domains (no match) return null for worker lookup.
 */
function resolveHostnameToSite(hostname: string, baseDomains: string[]): string | null {
  const lowerHostname = hostname.toLowerCase()

  for (const baseDomain of baseDomains) {
    const lowerBaseDomain = baseDomain.toLowerCase()
    const suffix = `.${lowerBaseDomain}`

    // Check subdomain pattern: {site}.{baseDomain}
    if (lowerHostname.endsWith(suffix)) {
      const sitePart = lowerHostname.slice(0, -suffix.length)
      if (sitePart && isValidSiteName(sitePart)) {
        return sitePart
      }
    }

    // Check bare domain -> www site
    if (lowerHostname === lowerBaseDomain) {
      return 'www'
    }
  }

  // No match - custom domain
  return null
}

/**
 * Validate site name format
 */
function isValidSiteName(name: string): boolean {
  if (!name || name.length > 63) return false
  if (name.startsWith('-') || name.endsWith('-')) return false
  if (name.includes('..')) return false
  return /^[a-z0-9][a-z0-9.-]*[a-z0-9]$|^[a-z0-9]$/.test(name)
}

// ============================================================================
// Content Delivery
// ============================================================================

/**
 * Content type enumeration for metrics and headers
 */
type ContentType = 'html' | 'mdx' | 'module' | 'llms.txt'

/**
 * Determine content type from request
 */
function determineContentType(request: Request, pathname: string): ContentType {
  if (pathname === '/llms.txt') {
    return 'llms.txt'
  }

  const accept = request.headers.get('accept') || ''

  if (accept.includes('text/html')) {
    return 'html'
  }

  if (accept.includes('text/markdown') || accept.includes('text/x-markdown')) {
    return 'mdx'
  }

  return 'module'
}

/**
 * Get cache TTL based on content type
 */
function getCacheTtl(contentType: ContentType, config: MultiTenantConfig): number {
  switch (contentType) {
    case 'html':
      return config.htmlCacheTtl
    case 'llms.txt':
      return config.llmCacheTtl
    default:
      return config.defaultCacheTtl
  }
}

/**
 * Serve bundle content with appropriate headers
 */
function serveBundleContent(
  bundle: SiteBundle,
  siteName: string,
  contentType: ContentType,
  cacheTtl: number
): Response {
  const meta = bundle.meta

  // Common headers
  const headers: Record<string, string> = {
    'X-Site': siteName,
    'X-Content-Type': contentType,
    'X-Served-By': 'multi-tenant-snippet',
    'Cache-Control': `public, max-age=${cacheTtl}`,
    'Vary': 'Accept', // Important for content negotiation caching
  }

  // Add version header if available
  if (meta?.version) {
    headers['X-Site-Version'] = String(meta.version)
    headers['ETag'] = `"${siteName}-v${meta.version}"`
  }

  // Add custom headers from site config
  if (meta?.features?.customHeaders) {
    Object.assign(headers, meta.features.customHeaders)
  }

  // Serve based on content type
  switch (contentType) {
    case 'html':
      return new Response(bundle.html, {
        headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
      })

    case 'mdx':
      return new Response(bundle.mdx, {
        headers: { ...headers, 'Content-Type': 'text/markdown; charset=utf-8' },
      })

    case 'llms.txt': {
      // Build LLM-friendly content with metadata header
      const llmHeader = meta
        ? `# ${meta.title || meta.name}\n${meta.description ? `\n> ${meta.description}\n` : ''}\n---\n\n`
        : ''
      return new Response(llmHeader + bundle.mdx, {
        headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    case 'module':
    default:
      return new Response(bundle.module, {
        headers: { ...headers, 'Content-Type': 'application/javascript; charset=utf-8' },
      })
  }
}

// ============================================================================
// Worker Forwarding
// ============================================================================

/**
 * Forward request to fallback worker
 *
 * Preserves original request details in forwarding headers.
 */
async function forwardToWorker(
  request: Request,
  workerUrl: string,
  reason: string
): Promise<Response> {
  const url = new URL(request.url)

  // Build forwarded URL
  const forwardUrl = new URL(url.pathname + url.search, workerUrl)

  // Clone headers and add forwarding info
  const headers = new Headers(request.headers)
  headers.set('X-Forwarded-Host', url.hostname)
  headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''))
  headers.set('X-Forward-Reason', reason)

  // Forward the request
  const forwardRequest = new Request(forwardUrl.toString(), {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'follow',
  })

  return fetch(forwardRequest)
}

// ============================================================================
// Main Snippet Handler
// ============================================================================

/**
 * Multi-Tenant Snippet - Main Handler
 *
 * Request flow:
 * 1. Extract hostname from request
 * 2. Resolve to site name (subdomain) or forward to worker (custom domain)
 * 3. Fetch site bundle from Static Assets
 * 4. Serve content with content negotiation
 *
 * Error handling:
 * - 404 from Static Assets -> forward to worker (might be dynamic/new site)
 * - Network error -> forward to worker with error context
 * - Invalid site name -> forward to worker for DO lookup
 */
export async function multiTenantSnippet(
  request: Request,
  config: MultiTenantConfig = DEFAULT_CONFIG
): Promise<Response> {
  const url = new URL(request.url)
  const hostname = url.hostname
  const pathname = url.pathname

  // Step 1: Resolve hostname to site name
  const siteName = resolveHostnameToSite(hostname, config.baseDomains)

  // Custom domain - needs DO lookup
  if (!siteName) {
    return forwardToWorker(request, config.fallbackWorkerUrl, 'custom-domain')
  }

  // Step 2: Determine content type
  const contentType = determineContentType(request, pathname)
  const cacheTtl = getCacheTtl(contentType, config)

  // Step 3: Fetch from Static Assets
  const bundleUrl = `${config.assetsBaseUrl}/sites/${siteName}.json`

  try {
    const bundleResponse = await fetch(bundleUrl)

    // Handle 404 - site might be new or using custom domain
    if (bundleResponse.status === 404) {
      return forwardToWorker(request, config.fallbackWorkerUrl, 'site-not-in-assets')
    }

    // Handle other errors
    if (!bundleResponse.ok) {
      return forwardToWorker(
        request,
        config.fallbackWorkerUrl,
        `assets-error-${bundleResponse.status}`
      )
    }

    // Parse bundle
    const bundle: SiteBundle = await bundleResponse.json()

    // Step 4: Serve content
    return serveBundleContent(bundle, siteName, contentType, cacheTtl)
  } catch (error) {
    // Network or parse error - forward to worker
    console.error(`Multi-tenant snippet error for ${siteName}:`, error)
    return forwardToWorker(request, config.fallbackWorkerUrl, 'fetch-error')
  }
}

// ============================================================================
// Cascade Integration
// ============================================================================

/**
 * Snippet cascade handler
 *
 * This is designed to work in the snippet cascade:
 * auth snippet -> cache snippet -> multi-tenant snippet
 *
 * It receives the request after auth headers are added and
 * before caching is applied.
 */
export async function handleCascade(request: Request): Promise<Response> {
  // Check for auth context from upstream snippet
  const userId = request.headers.get('x-user-id')
  const userEmail = request.headers.get('x-user-email')

  // Forward auth context if present
  const response = await multiTenantSnippet(request)

  // Optionally add auth context to response headers for debugging
  if (userId) {
    const headers = new Headers(response.headers)
    headers.set('X-Auth-User', userId)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }

  return response
}

// ============================================================================
// Export
// ============================================================================

export default {
  fetch: multiTenantSnippet,
  handleCascade,
}
