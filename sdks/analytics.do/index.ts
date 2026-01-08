/**
 * analytics.do - Analytics that tell you what to do next.
 *
 * AI-powered analytics that surface insights and recommend actions.
 * Stop drowning in dashboards. Start getting answers.
 *
 * @see https://analytics.do
 *
 * @example
 * ```typescript
 * import analytics from 'analytics.do'
 *
 * // Tagged template - ask questions in natural language
 * const insight = await analytics.do`
 *   Why did signups drop last week?
 *   What should we do about it?
 * `
 *
 * // Track events
 * await analytics.track('signup', { plan: 'pro', source: 'twitter' })
 *
 * // Identify users
 * await analytics.identify('user_123', { name: 'Alice', plan: 'pro' })
 *
 * // Analyze funnels
 * const funnel = await analytics.funnel({
 *   name: 'signup-to-purchase',
 *   steps: ['signup', 'onboarding_complete', 'purchase']
 * })
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate, type DoOptions } from 'rpc.do'

// Types

export interface Event {
  id?: string
  name: string
  properties?: Record<string, unknown>
  userId?: string
  anonymousId?: string
  sessionId?: string
  timestamp?: Date
  context?: EventContext
}

export interface EventContext {
  page?: { path?: string; title?: string; url?: string; referrer?: string }
  device?: { type?: string; manufacturer?: string; model?: string }
  browser?: { name?: string; version?: string }
  os?: { name?: string; version?: string }
  location?: { country?: string; region?: string; city?: string }
  campaign?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string }
  ip?: string
  userAgent?: string
}

export interface Metric {
  id: string
  name: string
  description?: string
  type: 'count' | 'sum' | 'average' | 'min' | 'max' | 'unique' | 'custom'
  sql?: string
  event?: string
  property?: string
  createdAt: Date
  updatedAt: Date
}

export interface Report {
  id: string
  name: string
  description?: string
  query: QueryOptions
  schedule?: { frequency: 'daily' | 'weekly' | 'monthly'; time?: string; timezone?: string }
  recipients?: string[]
  format?: 'pdf' | 'csv' | 'json'
  createdAt: Date
  updatedAt: Date
}

export interface Dashboard {
  id: string
  name: string
  description?: string
  widgets: DashboardWidget[]
  filters?: DashboardFilter[]
  shared?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DashboardWidget {
  id?: string
  type: 'chart' | 'metric' | 'table' | 'funnel' | 'cohort' | 'insight'
  title?: string
  query: QueryOptions
  visualization?: {
    chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap'
    colors?: string[]
    showLegend?: boolean
    stacked?: boolean
  }
  size?: { width: number; height: number }
  position?: { x: number; y: number }
}

export interface DashboardFilter {
  name: string
  dimension: string
  type: 'select' | 'multi-select' | 'date-range' | 'search'
  defaultValue?: unknown
}

export interface Funnel {
  id: string
  name: string
  description?: string
  steps: FunnelStep[]
  conversionWindow?: string // e.g., '7d', '30d'
  createdAt: Date
  updatedAt: Date
}

export interface FunnelStep {
  name: string
  event: string
  filters?: Record<string, unknown>
}

export interface FunnelResult {
  funnel: Funnel
  period: { start: Date; end: Date }
  steps: Array<{
    name: string
    event: string
    count: number
    conversionRate: number
    dropoffRate: number
  }>
  overallConversion: number
  medianTimeToConvert?: string
}

export interface Cohort {
  id: string
  name: string
  description?: string
  definition: CohortDefinition
  createdAt: Date
  updatedAt: Date
}

export interface CohortDefinition {
  /** Initial event that defines cohort membership */
  entryEvent: string
  entryFilters?: Record<string, unknown>
  /** Retention event to track */
  retentionEvent: string
  retentionFilters?: Record<string, unknown>
  /** Cohort grouping */
  groupBy?: 'day' | 'week' | 'month'
}

export interface CohortResult {
  cohort: Cohort
  period: { start: Date; end: Date }
  data: Array<{
    cohortDate: Date
    size: number
    retention: number[] // retention rates by period (week 0, week 1, etc.)
  }>
}

export interface QueryOptions {
  metrics: string[]
  dimensions?: string[]
  filters?: Record<string, unknown>
  period?: { start: string | Date; end: string | Date }
  granularity?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
  orderBy?: { field: string; direction: 'asc' | 'desc' }[]
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
    period?: { start: Date; end: Date }
  }
}

export interface Insight {
  id: string
  type: 'anomaly' | 'trend' | 'recommendation' | 'correlation' | 'prediction'
  title: string
  description: string
  severity?: 'info' | 'warning' | 'critical'
  metric?: string
  dimension?: string
  data?: Record<string, unknown>
  suggestedActions?: string[]
  createdAt: Date
}

export interface UserProfile {
  userId: string
  traits: Record<string, unknown>
  firstSeen: Date
  lastSeen: Date
  eventCount: number
  sessionCount: number
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'parquet'
  query?: QueryOptions
  events?: { names?: string[]; period?: { start: string | Date; end: string | Date } }
  destination?: { type: 's3' | 'gcs' | 'webhook'; config: Record<string, unknown> }
}

// Client interface
export interface AnalyticsClient {
  /**
   * Ask questions about your data in natural language
   *
   * @example
   * ```typescript
   * const insight = await analytics.do`
   *   Why did signups drop last week?
   *   What should we do about it?
   * `
   *
   * const answer = await analytics.do`
   *   What's our best performing acquisition channel?
   * `
   * ```
   */
  do: TaggedTemplate<Promise<Insight>>

  // Event Tracking

  /**
   * Track an event
   *
   * @example
   * ```typescript
   * await analytics.track('purchase', {
   *   amount: 99,
   *   product: 'starter-kit',
   *   currency: 'USD'
   * })
   * ```
   */
  track(event: string, properties?: Record<string, unknown>): Promise<void>

  /**
   * Track multiple events in a batch
   */
  trackBatch(events: Event[]): Promise<void>

  /**
   * Identify a user and set traits
   *
   * @example
   * ```typescript
   * await analytics.identify('user_123', {
   *   name: 'Alice',
   *   email: 'alice@example.com',
   *   plan: 'pro'
   * })
   * ```
   */
  identify(userId: string, traits: Record<string, unknown>): Promise<void>

  /**
   * Track a page view
   *
   * @example
   * ```typescript
   * await analytics.page('/pricing', {
   *   title: 'Pricing',
   *   referrer: 'https://google.com'
   * })
   * ```
   */
  page(path: string, properties?: Record<string, unknown>): Promise<void>

  /**
   * Alias two user identities
   */
  alias(userId: string, previousId: string): Promise<void>

  /**
   * Start or update a session
   */
  session(sessionId: string, properties?: Record<string, unknown>): Promise<void>

  // Funnels

  /**
   * Create a funnel analysis
   *
   * @example
   * ```typescript
   * const funnel = await analytics.funnel({
   *   name: 'signup-to-purchase',
   *   steps: ['signup', 'onboarding_complete', 'purchase'],
   *   conversionWindow: '7d'
   * })
   * ```
   */
  funnel(options: {
    name: string
    steps: string[] | FunnelStep[]
    conversionWindow?: string
    filters?: Record<string, unknown>
    period?: { start: string | Date; end: string | Date }
  }): Promise<FunnelResult>

  /**
   * Save a funnel definition
   */
  funnels: {
    create(funnel: Omit<Funnel, 'id' | 'createdAt' | 'updatedAt'>): Promise<Funnel>
    get(funnelId: string): Promise<Funnel>
    list(): Promise<Funnel[]>
    analyze(funnelId: string, period?: { start: string | Date; end: string | Date }): Promise<FunnelResult>
    delete(funnelId: string): Promise<void>
  }

  // Cohorts

  /**
   * Create a cohort analysis
   *
   * @example
   * ```typescript
   * const cohort = await analytics.cohort({
   *   name: 'weekly-retention',
   *   entryEvent: 'signup',
   *   retentionEvent: 'login',
   *   groupBy: 'week'
   * })
   * ```
   */
  cohort(options: {
    name: string
    entryEvent: string
    entryFilters?: Record<string, unknown>
    retentionEvent: string
    retentionFilters?: Record<string, unknown>
    groupBy?: 'day' | 'week' | 'month'
    period?: { start: string | Date; end: string | Date }
  }): Promise<CohortResult>

  /**
   * Saved cohort definitions
   */
  cohorts: {
    create(cohort: Omit<Cohort, 'id' | 'createdAt' | 'updatedAt'>): Promise<Cohort>
    get(cohortId: string): Promise<Cohort>
    list(): Promise<Cohort[]>
    analyze(cohortId: string, period?: { start: string | Date; end: string | Date }): Promise<CohortResult>
    delete(cohortId: string): Promise<void>
  }

  // Reports

  /**
   * Generate a report
   *
   * @example
   * ```typescript
   * const report = await analytics.report({
   *   name: 'Weekly Growth',
   *   metrics: ['signups', 'revenue', 'churn_rate'],
   *   dimensions: ['source'],
   *   period: { start: '2024-01-01', end: '2024-01-31' }
   * })
   * ```
   */
  report(options: {
    name: string
    metrics: string[]
    dimensions?: string[]
    filters?: Record<string, unknown>
    period?: { start: string | Date; end: string | Date }
    format?: 'pdf' | 'csv' | 'json'
  }): Promise<QueryResult & { downloadUrl?: string }>

  /**
   * Scheduled reports
   */
  reports: {
    create(report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report>
    get(reportId: string): Promise<Report>
    list(): Promise<Report[]>
    run(reportId: string): Promise<QueryResult & { downloadUrl?: string }>
    delete(reportId: string): Promise<void>
  }

  // Dashboards

  /**
   * Create a dashboard
   *
   * @example
   * ```typescript
   * const dashboard = await analytics.dashboard({
   *   name: 'Growth Metrics',
   *   widgets: [
   *     { type: 'metric', query: { metrics: ['mrr'] } },
   *     { type: 'chart', query: { metrics: ['signups'], dimensions: ['date'] } }
   *   ]
   * })
   * ```
   */
  dashboard(options: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dashboard>

  /**
   * Dashboard management
   */
  dashboards: {
    create(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dashboard>
    get(dashboardId: string): Promise<Dashboard>
    list(): Promise<Dashboard[]>
    update(dashboardId: string, updates: Partial<Dashboard>): Promise<Dashboard>
    delete(dashboardId: string): Promise<void>
    share(dashboardId: string, options?: { public?: boolean; users?: string[] }): Promise<{ shareUrl: string }>
  }

  // Querying

  /**
   * Query analytics data
   *
   * @example
   * ```typescript
   * const data = await analytics.query({
   *   metrics: ['unique_users', 'page_views', 'conversions'],
   *   dimensions: ['path', 'country'],
   *   period: { start: '2024-01-01', end: '2024-01-31' }
   * })
   * ```
   */
  query(options: QueryOptions): Promise<QueryResult>

  /**
   * Execute raw SQL query
   *
   * @example
   * ```typescript
   * const result = await analytics.sql`
   *   SELECT path, COUNT(DISTINCT userId) as users
   *   FROM events
   *   WHERE name = 'signup'
   *   GROUP BY path
   *   ORDER BY users DESC
   * `
   * ```
   */
  sql: TaggedTemplate<Promise<QueryResult>>

  // Metrics

  /**
   * Metric management
   */
  metrics: {
    list(): Promise<Metric[]>
    get(metricId: string): Promise<Metric>
    define(name: string, definition: Omit<Metric, 'id' | 'name' | 'createdAt' | 'updatedAt'>): Promise<Metric>
    delete(metricId: string): Promise<void>
  }

  // Insights

  /**
   * Get AI-generated insights
   *
   * @example
   * ```typescript
   * const insights = await analytics.insights()
   * // Returns anomalies, trends, and recommended actions
   * ```
   */
  insights(options?: {
    type?: Insight['type']
    severity?: Insight['severity']
    limit?: number
  }): Promise<Insight[]>

  // Users

  /**
   * User profile management
   */
  users: {
    get(userId: string): Promise<UserProfile>
    list(options?: { limit?: number; offset?: number }): Promise<UserProfile[]>
    events(userId: string, options?: { limit?: number; offset?: number }): Promise<Event[]>
    delete(userId: string): Promise<void>
  }

  // Export

  /**
   * Export analytics data
   *
   * @example
   * ```typescript
   * const exportJob = await analytics.export({
   *   format: 'csv',
   *   events: { names: ['signup', 'purchase'], period: { start: '2024-01-01', end: '2024-01-31' } }
   * })
   * ```
   */
  export(options: ExportOptions): Promise<{ jobId: string; downloadUrl?: string; status: 'pending' | 'processing' | 'completed' | 'failed' }>

  /**
   * Check export status
   */
  exportStatus(jobId: string): Promise<{ jobId: string; downloadUrl?: string; status: 'pending' | 'processing' | 'completed' | 'failed' }>
}

/**
 * Create a configured analytics client
 *
 * @example
 * ```typescript
 * // With custom options
 * import { Analytics } from 'analytics.do'
 * const analytics = Analytics({ baseURL: 'https://custom.example.com' })
 *
 * // In Cloudflare Workers, import env adapter first
 * import 'rpc.do/env'
 * import { analytics } from 'analytics.do'
 * ```
 */
export function Analytics(options?: ClientOptions): AnalyticsClient {
  return createClient<AnalyticsClient>('https://analytics.do', options)
}

/**
 * Default analytics client instance
 *
 * Note: For Cloudflare Workers, import 'rpc.do/env' first to set up environment.
 * API key is read from ANALYTICS_API_KEY or DO_API_KEY environment variables.
 */
export const analytics: AnalyticsClient = Analytics()

// Named exports
export { Analytics, analytics }

// Default export = camelCase instance
export default analytics

export type { ClientOptions } from 'rpc.do'

// Dashboard layout and section management
export {
  DashboardLayout,
  createDashboard,
  WIDGET_SIZE_PRESETS,
  type DashboardSection,
  type GridConfig,
  type LayoutStrategy,
  type WidgetSizePreset,
} from './dashboard'
