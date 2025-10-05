/**
 * Real-Time Aggregation
 * Update KV counters for live dashboard updates
 */

import type { AnalyticsEvent } from '../types'

/**
 * Update real-time counters in KV
 */
export async function updateRealtimeCounters(kv: KVNamespace, event: AnalyticsEvent): Promise<void> {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  switch (event.eventType) {
    case 'service_execution':
      await incrementCounter(kv, `counter:executions:${today}`)
      if (event.success) {
        await incrementCounter(kv, `counter:executions:success:${today}`)
      } else {
        await incrementCounter(kv, `counter:executions:error:${today}`)
      }
      break

    case 'revenue_transaction':
      await incrementCounter(kv, `counter:revenue:transactions:${today}`)
      await addToSum(kv, `counter:revenue:amount:${today}`, event.revenueAmount || 0)
      break

    case 'marketplace_search':
      await incrementCounter(kv, `counter:searches:${today}`)
      break

    case 'marketplace_view':
      await incrementCounter(kv, `counter:views:${today}`)
      break

    case 'marketplace_conversion':
      await incrementCounter(kv, `counter:conversions:${today}`)
      break

    case 'user_session':
      await addToSet(kv, `set:users:active:${today}`, event.userId || 'anonymous')
      break

    case 'experiment_view':
      await incrementCounter(kv, `counter:experiment:${event.experimentId}:variant:${event.variantIndex}:views`)
      break

    case 'experiment_conversion':
      await incrementCounter(kv, `counter:experiment:${event.experimentId}:variant:${event.variantIndex}:conversions`)
      break
  }
}

/**
 * Increment a counter in KV
 */
async function incrementCounter(kv: KVNamespace, key: string, amount: number = 1): Promise<void> {
  const current = await kv.get(key)
  const newValue = (current ? parseInt(current) : 0) + amount
  await kv.put(key, newValue.toString(), { expirationTtl: 86400 * 7 }) // 7 days
}

/**
 * Add to a sum (for revenue tracking)
 */
async function addToSum(kv: KVNamespace, key: string, amount: number): Promise<void> {
  const current = await kv.get(key)
  const newValue = (current ? parseFloat(current) : 0) + amount
  await kv.put(key, newValue.toString(), { expirationTtl: 86400 * 7 }) // 7 days
}

/**
 * Add to a set (for unique user tracking)
 */
async function addToSet(kv: KVNamespace, key: string, value: string): Promise<void> {
  const current = await kv.get(key)
  const set = current ? new Set(JSON.parse(current)) : new Set()
  set.add(value)
  await kv.put(key, JSON.stringify([...set]), { expirationTtl: 86400 * 7 }) // 7 days
}

/**
 * Get real-time metrics for dashboard
 */
export async function getRealtimeMetrics(kv: KVNamespace): Promise<RealtimeMetrics> {
  const today = new Date().toISOString().split('T')[0]

  const [executions, searches, views, conversions, activeUsers] = await Promise.all([
    kv.get(`counter:executions:${today}`),
    kv.get(`counter:searches:${today}`),
    kv.get(`counter:views:${today}`),
    kv.get(`counter:conversions:${today}`),
    kv.get(`set:users:active:${today}`),
  ])

  const activeUserCount = activeUsers ? JSON.parse(activeUsers).length : 0

  return {
    executions: parseInt(executions || '0'),
    searches: parseInt(searches || '0'),
    views: parseInt(views || '0'),
    conversions: parseInt(conversions || '0'),
    activeUsers: activeUserCount,
    conversionRate: parseInt(views || '0') > 0 ? (parseInt(conversions || '0') / parseInt(views || '0')) * 100 : 0,
  }
}

interface RealtimeMetrics {
  executions: number
  searches: number
  views: number
  conversions: number
  activeUsers: number
  conversionRate: number
}
