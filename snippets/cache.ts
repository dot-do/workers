/**
 * Cache Snippet - Caching + Analytics Capture
 *
 * The outermost snippet in the cascade. Handles:
 * - Edge caching with Cloudflare Cache API
 * - Analytics event capture (even on cache hits)
 * - Settings/session cookie management (sqid-based)
 *
 * Analytics events sent to: HTTP → Pipelines → Streams → R2 Data Catalog
 */

import { encode } from 'sqids'

interface AnalyticsEvent {
  timestamp: number
  hostname: string
  path: string
  method: string
  status: number
  cache: 'HIT' | 'MISS'
  colo: string
  country: string
  userId?: string
  anonymousId: string
}

function generateAnonymousId(request: Request): string {
  const cf = (request as any).cf || {}
  // Generate consistent anonymous ID from: ASN, colo, country, IP prefix
  const components = [
    cf.asn || 0,
    cf.colo || 'UNK',
    cf.country || 'XX',
    request.headers.get('accept-language')?.slice(0, 2) || 'en',
  ]
  return encode(components.map((c) => typeof c === 'string' ? c.charCodeAt(0) : c))
}

export async function cacheSnippet(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const cacheKey = new Request(url.toString(), request)
  const cache = caches.default

  // Check cache
  let response = await cache.match(cacheKey)
  const cacheStatus: 'HIT' | 'MISS' = response ? 'HIT' : 'MISS'

  if (!response) {
    response = await fetch(request)
    // Cache successful responses
    if (response.ok) {
      const responseToCache = response.clone()
      await cache.put(cacheKey, responseToCache)
    }
  }

  // Capture analytics (even on cache hits)
  const cf = (request as any).cf || {}
  const event: AnalyticsEvent = {
    timestamp: Date.now(),
    hostname: url.hostname,
    path: url.pathname,
    method: request.method,
    status: response.status,
    cache: cacheStatus,
    colo: cf.colo || 'UNK',
    country: cf.country || 'XX',
    anonymousId: generateAnonymousId(request),
  }

  // Fire and forget analytics
  fetch('https://analytics.workers.do/events', {
    method: 'POST',
    body: JSON.stringify(event),
  }).catch(() => {})

  return response
}

export default { fetch: cacheSnippet }
