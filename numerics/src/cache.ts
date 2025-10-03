/**
 * Metrics Caching Layer
 * KV-based caching with configurable TTL
 */

import type { Env, MetricsCacheKey, MetricResult } from './types'

/**
 * Generate cache key from metric parameters
 */
export function generateCacheKey(params: MetricsCacheKey): string {
  return `metric:${params.metric}:${params.period}:${params.compare ? 'compare' : 'current'}`
}

/**
 * Get cached metric result
 */
export async function getCachedMetric(key: string, env: Env): Promise<MetricResult | null> {
  try {
    const cached = await env.METRICS_KV.get(key)

    if (!cached) {
      return null
    }

    const result: MetricResult = JSON.parse(cached)
    return result
  } catch (error) {
    console.error('Error reading from cache:', error)
    return null
  }
}

/**
 * Cache metric result
 */
export async function cacheMetric(key: string, result: MetricResult, env: Env): Promise<void> {
  try {
    const ttl = parseInt(env.CACHE_TTL || '300', 10) // Default 5 minutes

    await env.METRICS_KV.put(key, JSON.stringify(result), {
      expirationTtl: ttl,
    })
  } catch (error) {
    console.error('Error writing to cache:', error)
  }
}

/**
 * Invalidate cached metric
 */
export async function invalidateMetricCache(metric: string, env: Env): Promise<void> {
  try {
    const periods = ['today', 'week', 'month', 'quarter', 'year']
    const variants = [true, false] // compare variants

    for (const period of periods) {
      for (const compare of variants) {
        const key = generateCacheKey({ metric, period: period as any, compare })
        await env.METRICS_KV.delete(key)
      }
    }
  } catch (error) {
    console.error('Error invalidating cache:', error)
  }
}

/**
 * Clear all cached metrics
 */
export async function clearAllCache(env: Env): Promise<void> {
  try {
    // List all keys with 'metric:' prefix and delete them
    const list = await env.METRICS_KV.list({ prefix: 'metric:' })

    for (const key of list.keys) {
      await env.METRICS_KV.delete(key.name)
    }
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}
