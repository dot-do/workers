/**
 * Analytics Service Types
 * TypeScript definitions for analytics events and queries
 */

export interface Env {
  ANALYTICS: AnalyticsEngineDataset
  ANALYTICS_KV: KVNamespace
  DB: any
  ACCOUNT_ID: string
  API_TOKEN: string
}

/**
 * Analytics Event Schema
 * Maps to Analytics Engine data point structure
 */
export interface AnalyticsEvent {
  // Event identification
  eventType: EventType
  timestamp?: number

  // Service execution metrics
  serviceId?: string
  executionId?: string
  latencyMs?: number
  success?: boolean
  errorCode?: string

  // Revenue metrics
  revenueAmount?: number
  currency?: string
  orderId?: string

  // Marketplace metrics
  searchQuery?: string
  category?: string
  conversion?: boolean

  // Experiment metrics
  experimentId?: string
  variantIndex?: number

  // User metrics
  userId?: string
  sessionId?: string
  cohort?: string

  // Additional context
  metadata?: Record<string, any>
}

export type EventType =
  | 'service_execution'
  | 'marketplace_search'
  | 'marketplace_view'
  | 'marketplace_conversion'
  | 'revenue_transaction'
  | 'experiment_view'
  | 'experiment_conversion'
  | 'user_session'
  | 'user_action'

/**
 * Metric Aggregations
 */
export interface ServiceMetrics {
  serviceId: string
  serviceName: string
  executions: number
  latency: {
    p50: number
    p95: number
    p99: number
    avg: number
  }
  errorRate: number
  successRate: number
  period: string
}

export interface RevenueMetrics {
  gmv: number // Gross Marketplace Volume
  mrr: number // Monthly Recurring Revenue
  takeRate: number
  creatorEarnings: number
  transactionCount: number
  avgOrderValue: number
  period: string
}

export interface MarketplaceMetrics {
  searches: number
  views: number
  conversions: number
  conversionRate: number
  topServices: Array<{ id: string; name: string; views: number }>
  topCategories: Array<{ category: string; views: number }>
  period: string
}

export interface ExperimentMetrics {
  experimentId: string
  experimentName: string
  variants: Array<{
    index: number
    name: string
    views: number
    conversions: number
    conversionRate: number
  }>
  winner?: number
  confidence: number
  period: string
}

export interface UserMetrics {
  dau: number // Daily Active Users
  mau: number // Monthly Active Users
  retention: {
    day1: number
    day7: number
    day30: number
  }
  avgSessionDuration: number
  churnRate: number
  period: string
}

/**
 * Query Parameters
 */
export interface QueryParams {
  startDate?: string
  endDate?: string
  serviceId?: string
  category?: string
  userId?: string
  experimentId?: string
  granularity?: 'hour' | 'day' | 'week' | 'month'
  limit?: number
}

/**
 * Real-time Counter
 */
export interface RealtimeCounter {
  key: string
  count: number
  lastUpdated: number
}
