/**
 * Domain-based routing with Workers Assets and SWR cache
 *
 * Domain routes are stored in Workers Assets as a JSON file.
 * We maintain an in-memory cache with a stale-while-revalidate (SWR) strategy
 * that updates within 10 seconds of routing changes.
 */

import type { Env, DomainRoute, DomainRoutesCache } from '../types'
import { safeJsonParse } from '../utils'

// In-memory cache (persists across requests in same Worker instance)
let domainRoutesCache: DomainRoutesCache | null = null

// SWR configuration
const CACHE_DURATION_MS = 10000 // 10 seconds
const KV_CACHE_KEY = 'domain-routes:cache'

/**
 * Load domain routes from cache or Workers Assets
 */
export async function loadDomainRoutes(env: Env, forceRefresh = false): Promise<DomainRoute[]> {
  const now = Date.now()

  // Check if we have a valid cache
  if (!forceRefresh && domainRoutesCache && domainRoutesCache.expiresAt > now) {
    return domainRoutesCache.routes
  }

  // Cache expired or force refresh - load from KV first (faster than Assets)
  try {
    const kvCache = await env.KV.get(KV_CACHE_KEY)
    if (kvCache) {
      const cached = safeJsonParse<DomainRoutesCache>(kvCache, null)
      if (cached && cached.expiresAt > now) {
        domainRoutesCache = cached
        return cached.routes
      }
    }
  } catch (error) {
    console.error('[DomainRoutes] KV cache error:', error)
  }

  // Load from Workers Assets (authoritative source)
  try {
    const routes = await loadFromAssets(env)

    // Update caches
    domainRoutesCache = {
      routes,
      lastUpdated: now,
      expiresAt: now + CACHE_DURATION_MS,
    }

    // Store in KV for cross-instance caching
    await env.KV.put(KV_CACHE_KEY, JSON.stringify(domainRoutesCache), {
      expirationTtl: Math.ceil(CACHE_DURATION_MS / 1000) * 2, // Double TTL for safety
    })

    return routes
  } catch (error) {
    console.error('[DomainRoutes] Assets load error:', error)

    // Fall back to stale cache if available
    if (domainRoutesCache) {
      console.warn('[DomainRoutes] Using stale cache')
      return domainRoutesCache.routes
    }

    // No cache available, return empty array
    return []
  }
}

/**
 * Load domain routes from Workers Assets
 */
async function loadFromAssets(env: Env): Promise<DomainRoute[]> {
  try {
    // Workers Assets API: fetch domain-routes.json
    const response = await env.ASSETS.fetch('domain-routes.json')

    if (!response.ok) {
      throw new Error(`Assets fetch failed: ${response.status}`)
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('[DomainRoutes] Assets fetch error:', error)
    return []
  }
}

/**
 * Get route for a specific domain
 */
export async function getDomainRoute(hostname: string, env: Env): Promise<DomainRoute | null> {
  const routes = await loadDomainRoutes(env)

  // Exact domain match
  const exactMatch = routes.find(r => r.domain === hostname)
  if (exactMatch) return exactMatch

  // Wildcard subdomain match (*.example.com)
  const wildcardMatch = routes.find(r => {
    if (!r.domain.startsWith('*.')) return false
    const baseDomain = r.domain.substring(2) // Remove *.
    return hostname.endsWith(baseDomain)
  })
  if (wildcardMatch) return wildcardMatch

  return null
}

/**
 * Invalidate cache (called when domain routes are updated)
 */
export async function invalidateDomainRoutesCache(env: Env): Promise<void> {
  domainRoutesCache = null
  await env.KV.delete(KV_CACHE_KEY)
}
