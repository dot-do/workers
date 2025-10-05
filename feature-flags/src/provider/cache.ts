/**
 * Cache Manager for KV-based flag caching
 */

import type { EvaluationContext, JsonValue, ResolutionDetails } from '@openfeature/server-sdk'
import type { CacheEntry } from './types'

/**
 * CacheManager handles KV-based caching of flag evaluations
 */
export class CacheManager {
  private kv: KVNamespace
  private defaultTTL: number

  constructor(kv: KVNamespace, ttl: number = 300) {
    this.kv = kv
    this.defaultTTL = ttl
  }

  /**
   * Get cached flag evaluation
   */
  async get<T extends JsonValue>(flagKey: string, context: EvaluationContext): Promise<CacheEntry | null> {
    try {
      const cacheKey = this.getCacheKey(flagKey, context)
      const cached = await this.kv.get(cacheKey, 'json')

      if (!cached) return null

      const entry = cached as CacheEntry

      // Check if cache is expired
      const now = Date.now()
      if (now - entry.cachedAt > entry.ttl * 1000) {
        // Expired - delete and return null
        await this.kv.delete(cacheKey)
        return null
      }

      return entry
    } catch (error) {
      // Cache errors should not break evaluation
      console.error('Cache get error:', error)
      return null
    }
  }

  /**
   * Set cache entry
   */
  async set<T extends JsonValue>(flagKey: string, context: EvaluationContext, result: ResolutionDetails<T>, ttl?: number): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(flagKey, context)
      const entry: CacheEntry = {
        value: result.value,
        variant: result.variant,
        reason: result.reason,
        flagMetadata: result.flagMetadata,
        cachedAt: Date.now(),
        ttl: ttl || this.defaultTTL,
      }

      // Store in KV with expiration
      await this.kv.put(cacheKey, JSON.stringify(entry), {
        expirationTtl: ttl || this.defaultTTL,
      })
    } catch (error) {
      // Cache errors should not break evaluation
      console.error('Cache set error:', error)
    }
  }

  /**
   * Invalidate cache for a flag
   */
  async invalidate(flagKey: string, context?: EvaluationContext): Promise<void> {
    try {
      if (context) {
        // Invalidate specific context
        const cacheKey = this.getCacheKey(flagKey, context)
        await this.kv.delete(cacheKey)
      } else {
        // Invalidate all contexts for this flag
        // KV doesn't support wildcard delete, so we use a list to track keys
        const listKey = `flags:${flagKey}:list`
        const list = await this.kv.get(listKey, 'json')
        if (list && Array.isArray(list)) {
          await Promise.all(list.map((key: string) => this.kv.delete(key)))
          await this.kv.delete(listKey)
        }
      }
    } catch (error) {
      console.error('Cache invalidate error:', error)
    }
  }

  /**
   * Generate cache key from flag key and context
   * Format: flag:<flagKey>:<contextHash>
   */
  private getCacheKey(flagKey: string, context: EvaluationContext): string {
    // Include targetingKey and any custom attributes that affect targeting
    const contextHash = this.hashContext(context)
    return `flag:${flagKey}:${contextHash}`
  }

  /**
   * Hash context to create consistent cache key
   */
  private hashContext(context: EvaluationContext): string {
    // Create deterministic hash from context
    // Include targetingKey and sorted custom attributes
    const parts = [context.targetingKey || 'anonymous']

    // Add custom attributes (sorted by key for consistency)
    const customAttrs = { ...context }
    delete customAttrs.targetingKey
    const sortedKeys = Object.keys(customAttrs).sort()

    for (const key of sortedKeys) {
      parts.push(`${key}=${JSON.stringify(customAttrs[key])}`)
    }

    return this.simpleHash(parts.join('|'))
  }

  /**
   * Simple hash function for context
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }
}
