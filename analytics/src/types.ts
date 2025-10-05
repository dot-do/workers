/**
 * Shared TypeScript types for Analytics Platform
 */

// ==================== Event Types ====================

export interface IngestEvent {
  // Core fields
  timestamp?: number
  event: string
  userId?: string
  sessionId?: string
  organizationId?: string

  // Properties
  properties?: Record<string, string | number | boolean>

  // Usage tracking (for billing)
  usage?: {
    quantity: number
    unit: string
    sku?: string
  }

  // Performance metrics
  performance?: {
    duration?: number
    success?: boolean
    statusCode?: number
  }
}

export interface BatchIngestRequest {
  events: IngestEvent[]
}

export interface IngestResponse {
  success: boolean
  accepted: number
  rejected: number
  errors?: string[]
}

// ==================== Query Types ====================

export interface QueryRequest {
  // Time range
  start: string // ISO 8601
  end: string // ISO 8601

  // Filters
  event?: string
  userId?: string
  organizationId?: string
  sessionId?: string

  // Aggregation
  groupBy?: 'hour' | 'day' | 'week' | 'month'
  metrics?: string[] // ['count', 'avg_duration', 'p95_duration', 'sum_usage']

  // Pagination
  limit?: number
  offset?: number
}

export interface QueryResponse {
  data: TimeSeriesDataPoint[]
  meta: {
    start: string
    end: string
    count: number
    hasMore: boolean
  }
}

export interface TimeSeriesDataPoint {
  timestamp: string
  count: number
  [key: string]: string | number // Additional metrics
}

// ==================== Billing Types ====================

export interface UsageBillingRequest {
  organizationId: string
  start: string
  end: string
  sku?: string
}

export interface UsageBillingResponse {
  organizationId: string
  period: {
    start: string
    end: string
  }
  items: Array<{
    sku: string
    quantity: number
    unit: string
  }>
  total: {
    quantity: number
    cost?: number
  }
}

// ==================== Performance Types ====================

export interface PerformanceMetricsRequest {
  start: string
  end: string
  path?: string
  groupBy?: 'hour' | 'day'
}

export interface PerformanceMetricsResponse {
  data: Array<{
    timestamp: string
    count: number
    avg_duration: number
    p50_duration: number
    p95_duration: number
    p99_duration: number
    error_rate: number
  }>
}

// ==================== Environment Types ====================

export interface AnalyticsEnv {
  ANALYTICS_ENGINE: AnalyticsEngineDataset
  PIPELINE?: Fetcher
  R2_BUCKET?: R2Bucket
  DB?: D1Database
  RATE_LIMITER?: RateLimit

  // Service bindings (for integration with other workers)
  ANALYTICS_INGESTION?: any
  ANALYTICS_QUERY?: any
}
