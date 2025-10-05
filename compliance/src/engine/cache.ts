/**
 * Policy Cache - KV-based policy caching for <5ms reads
 */

import type { Policy, PolicyCacheEntry } from '../policy/types'

export class PolicyCache {
  private kv: KVNamespace

  constructor(kv: KVNamespace) {
    this.kv = kv
  }

  /**
   * Get policy from cache (KV)
   */
  async get(policyId: string): Promise<Policy | null> {
    const cached = await this.kv.get<PolicyCacheEntry>(`policy:${policyId}`, 'json')

    if (!cached) {
      return null
    }

    // Check if expired
    const now = Date.now()
    if (now > cached.cachedAt + cached.ttl * 1000) {
      return null
    }

    return cached.policy
  }

  /**
   * Put policy in cache
   */
  async put(policy: Policy, ttl: number = 300): Promise<void> {
    const entry: PolicyCacheEntry = {
      policy,
      cachedAt: Date.now(),
      ttl,
    }

    await this.kv.put(`policy:${policy.id}`, JSON.stringify(entry), {
      expirationTtl: ttl,
    })
  }

  /**
   * Get multiple policies
   */
  async getMany(policyIds: string[]): Promise<Map<string, Policy>> {
    const results = await Promise.all(policyIds.map((id) => this.get(id)))

    const map = new Map<string, Policy>()
    for (let i = 0; i < policyIds.length; i++) {
      const policy = results[i]
      if (policy) {
        map.set(policyIds[i], policy)
      }
    }

    return map
  }

  /**
   * List all policies (for admin/debugging)
   */
  async list(prefix: string = 'policy:'): Promise<Policy[]> {
    const list = await this.kv.list<PolicyCacheEntry>({ prefix })
    const policies: Policy[] = []

    for (const key of list.keys) {
      const cached = await this.kv.get<PolicyCacheEntry>(key.name, 'json')
      if (cached) {
        policies.push(cached.policy)
      }
    }

    return policies
  }

  /**
   * Delete policy from cache
   */
  async delete(policyId: string): Promise<void> {
    await this.kv.delete(`policy:${policyId}`)
  }

  /**
   * Clear all policies from cache
   */
  async clear(): Promise<void> {
    const list = await this.kv.list({ prefix: 'policy:' })
    const keys = list.keys.map((k) => k.name)

    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.kv.delete(key)))
    }
  }
}
