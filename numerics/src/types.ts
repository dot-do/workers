/**
 * Numerics Dashboard Service Types
 * TypeScript definitions for Numerics JSON API format
 */

export interface Env {
  DB: any // Database service binding
  ANALYTICS: any // Analytics service binding
  METRICS_KV: KVNamespace // Metrics cache
  NUMERICS_API_KEY?: string // Authentication secret
  CACHE_TTL: string // Cache TTL in seconds (default: 300)
  ENVIRONMENT: string
}

/**
 * Numerics Widget Data Point
 */
export interface NumericsDataPoint {
  value: number
  name?: string // Optional for named line graphs
}

/**
 * Numerics JSON Widget Response
 * https://docs.numericsdashboard.app/json-api
 */
export interface NumericsWidget {
  postfix: string // Unit label (e.g., "Visitors", "USD", "%", "★")
  data: NumericsDataPoint[] // 1-31 data points
  color?: string // Optional color override (hex)
}

/**
 * Time Period for Metrics Queries
 */
export type MetricsPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year'

/**
 * Metrics Cache Key
 */
export interface MetricsCacheKey {
  metric: string
  period: MetricsPeriod
  compare: boolean
}

/**
 * Internal Metric Calculation Result
 */
export interface MetricResult {
  current: number
  previous?: number
  timeseries?: Array<{ timestamp: string; value: number; name?: string }>
}

/**
 * Supported Metrics
 */
export type MetricName =
  | 'visitors'
  | 'signups'
  | 'active-users'
  | 'mrr'
  | 'arr'
  | 'gmv'
  | 'gmv-growth'
  | 'services-listed'
  | 'services-active'
  | 'providers'
  | 'service-rating'
  | 'dispute-rate'
  | 'creators'
  | 'top-creators-revenue'
  | 'functions'
  | 'api-calls'

/**
 * Metric Metadata
 */
export interface MetricMeta {
  name: MetricName
  postfix: string
  color?: string
  target?: number
  format: 'number' | 'currency' | 'percentage' | 'rating'
  requiresComparison: boolean
  cacheKey: string
}
