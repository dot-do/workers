/**
 * analytics.do - Analytics and Business Intelligence SDK
 *
 * @example
 * ```typescript
 * import { analytics } from 'analytics.do'
 *
 * // Track events
 * await analytics.track('page_view', { path: '/home', userId: 'user_123' })
 *
 * // Query analytics
 * const data = await analytics.query({
 *   metrics: ['page_views', 'unique_users'],
 *   dimensions: ['path', 'country'],
 *   period: { start: '2024-01-01', end: '2024-01-31' }
 * })
 * ```
 */

import { createClient, type ClientOptions } from '@dotdo/rpc-client'

// Types
export interface Event {
  name: string
  properties?: Record<string, unknown>
  userId?: string
  sessionId?: string
  timestamp?: Date
}

export interface QueryOptions {
  metrics: string[]
  dimensions?: string[]
  filters?: Record<string, unknown>
  period?: { start: string | Date; end: string | Date }
  limit?: number
  offset?: number
}

export interface QueryResult {
  data: Array<Record<string, unknown>>
  meta: {
    metrics: string[]
    dimensions: string[]
    rowCount: number
    executionTime: number
  }
}

export interface Dashboard {
  id: string
  name: string
  widgets: Array<{
    type: 'chart' | 'metric' | 'table'
    query: QueryOptions
    config?: Record<string, unknown>
  }>
}

// Client interface
export interface AnalyticsClient {
  track(event: string, properties?: Record<string, unknown>): Promise<void>
  trackBatch(events: Event[]): Promise<void>

  query(options: QueryOptions): Promise<QueryResult>
  sql(query: string, params?: unknown[]): Promise<QueryResult>

  dashboards: {
    create(dashboard: Omit<Dashboard, 'id'>): Promise<Dashboard>
    get(dashboardId: string): Promise<Dashboard>
    list(): Promise<Dashboard[]>
    delete(dashboardId: string): Promise<void>
  }

  metrics: {
    list(): Promise<string[]>
    define(name: string, definition: { sql: string; description?: string }): Promise<void>
  }
}

export function Analytics(options?: ClientOptions): AnalyticsClient {
  return createClient<AnalyticsClient>('https://analytics.do', options)
}

export const analytics: AnalyticsClient = Analytics({
  apiKey: typeof process !== 'undefined' ? process.env?.ANALYTICS_API_KEY : undefined,
})

export type { ClientOptions } from '@dotdo/rpc-client'
