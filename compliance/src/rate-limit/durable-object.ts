/**
 * Rate Limit Durable Object
 *
 * Global state for distributed rate limiting at edge
 */

import type { RateLimitState } from '../policy/types'

export class RateLimitDO implements DurableObject {
  private state: DurableObjectState
  private storage: DurableObjectStorage

  constructor(state: DurableObjectState) {
    this.state = state
    this.storage = state.storage
  }

  /**
   * Check rate limit for a key
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const key = url.searchParams.get('key')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const window = parseInt(url.searchParams.get('window') || '60')

    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing key parameter' }), { status: 400 })
    }

    const method = request.method

    if (method === 'GET') {
      // Check current state
      const state = await this.getRateLimitState(key, limit, window)
      return new Response(JSON.stringify(state), {
        headers: { 'Content-Type': 'application/json' },
      })
    } else if (method === 'POST') {
      // Increment and check
      const state = await this.checkAndIncrement(key, limit, window)
      return new Response(JSON.stringify(state), {
        headers: { 'Content-Type': 'application/json' },
        status: state.blocked ? 429 : 200,
      })
    } else if (method === 'DELETE') {
      // Reset counter
      await this.reset(key)
      return new Response(JSON.stringify({ reset: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Method not allowed', { status: 405 })
  }

  /**
   * Get current rate limit state
   */
  private async getRateLimitState(key: string, limit: number, window: number): Promise<RateLimitState> {
    const now = Date.now()
    const stored = await this.storage.get<RateLimitState>(key)

    if (!stored || now >= stored.resetAt) {
      return {
        count: 0,
        resetAt: now + window * 1000,
        blocked: false,
      }
    }

    return stored
  }

  /**
   * Check rate limit and increment counter
   */
  private async checkAndIncrement(key: string, limit: number, window: number): Promise<RateLimitState> {
    const now = Date.now()
    const stored = await this.storage.get<RateLimitState>(key)

    let state: RateLimitState

    if (!stored || now >= stored.resetAt) {
      // New window
      state = {
        count: 1,
        resetAt: now + window * 1000,
        blocked: false,
      }
    } else {
      // Existing window
      const newCount = stored.count + 1
      state = {
        count: newCount,
        resetAt: stored.resetAt,
        blocked: newCount > limit,
      }
    }

    await this.storage.put(key, state)

    return state
  }

  /**
   * Reset counter for a key
   */
  private async reset(key: string): Promise<void> {
    await this.storage.delete(key)
  }

  /**
   * Cleanup expired entries (called periodically)
   */
  async alarm(): Promise<void> {
    const now = Date.now()
    const allKeys = await this.storage.list<RateLimitState>()

    const toDelete: string[] = []

    for (const [key, value] of allKeys) {
      if (now >= value.resetAt) {
        toDelete.push(key)
      }
    }

    if (toDelete.length > 0) {
      await this.storage.delete(toDelete)
    }

    // Schedule next cleanup in 1 minute
    await this.state.storage.setAlarm(Date.now() + 60000)
  }
}
