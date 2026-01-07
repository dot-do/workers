/**
 * kpis.do - What do you want KPIs to .do for you?
 *
 * Key Performance Indicators that update themselves.
 * Real-time metrics from live data sources.
 *
 * @see https://kpis.do
 *
 * @example
 * ```typescript
 * import kpis from 'kpis.do'
 *
 * // Tagged template - describe what you want to measure
 * const mrr = await kpis.do`
 *   Track Monthly Recurring Revenue from Stripe subscriptions,
 *   alert me when it drops more than 10% week-over-week
 * `
 *
 * // Define with full control
 * const churn = kpis.create({
 *   name: 'customer-churn',
 *   metric: 'churn_rate',
 *   source: 'stripe',
 *   target: { max: 5, unit: 'percent' },
 *   alert: { when: 'exceeds', threshold: 5 }
 * })
 *
 * // Query and analyze
 * const trend = await kpis.trend('mrr', { period: '30d' })
 * const dashboard = await kpis.dashboard('executive')
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface KPI {
  id: string
  name: string
  description?: string
  metric: string
  source: DataSource
  formula?: string
  unit?: string
  target?: Target
  thresholds?: Threshold[]
  alerts?: AlertConfig[]
  tags?: string[]
  owner?: string
  createdAt: Date
  updatedAt: Date
}

export interface DataSource {
  type: 'stripe' | 'database' | 'api' | 'webhook' | 'analytics' | 'custom'
  config: Record<string, unknown>
  refreshInterval?: string // '1m', '5m', '1h', '1d'
}

export interface Metric {
  kpiId: string
  value: number
  previousValue?: number
  change?: number
  changePercent?: number
  timestamp: Date
  period?: string
  dimensions?: Record<string, string>
}

export interface Target {
  value?: number
  min?: number
  max?: number
  unit?: string
  period?: string // 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
}

export interface Threshold {
  name: string
  level: 'info' | 'warning' | 'critical'
  condition: 'above' | 'below' | 'equals' | 'between'
  value: number
  upperValue?: number // For 'between' condition
  color?: string
}

export interface AlertConfig {
  id: string
  name: string
  when: 'exceeds' | 'drops_below' | 'changes_by' | 'target_missed'
  threshold: number
  unit?: 'absolute' | 'percent'
  channels: AlertChannel[]
  cooldown?: string // '1h', '4h', '1d'
  enabled: boolean
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty'
  config: Record<string, unknown>
}

export interface Alert {
  id: string
  kpiId: string
  kpiName: string
  alertConfigId: string
  level: 'info' | 'warning' | 'critical'
  message: string
  currentValue: number
  threshold: number
  triggeredAt: Date
  acknowledgedAt?: Date
  resolvedAt?: Date
  status: 'active' | 'acknowledged' | 'resolved'
}

export interface Dashboard {
  id: string
  name: string
  description?: string
  kpis: DashboardKPI[]
  layout?: DashboardLayout
  refreshInterval?: string
  isPublic: boolean
  shareToken?: string
  createdAt: Date
  updatedAt: Date
}

export interface DashboardKPI {
  kpiId: string
  position: { x: number; y: number; width: number; height: number }
  visualization: 'number' | 'gauge' | 'sparkline' | 'chart' | 'table'
  options?: Record<string, unknown>
}

export interface DashboardLayout {
  columns: number
  rows: number
  gap?: number
}

export interface TrendData {
  kpiId: string
  period: string
  dataPoints: Array<{
    timestamp: Date
    value: number
  }>
  summary: {
    current: number
    previous: number
    change: number
    changePercent: number
    min: number
    max: number
    average: number
    trend: 'up' | 'down' | 'stable'
  }
}

export interface ComparisonResult {
  kpis: string[]
  period: string
  data: Array<{
    kpiId: string
    kpiName: string
    current: number
    previous: number
    changePercent: number
    trend: 'up' | 'down' | 'stable'
  }>
}

export interface DoOptions {
  source?: DataSource['type']
  refreshInterval?: string
  target?: Target
  alerts?: boolean
}

// Tagged template helper
type TaggedTemplate<T> = {
  (strings: TemplateStringsArray, ...values: unknown[]): T
  (prompt: string, options?: DoOptions): T
}

function tagged<T>(fn: (prompt: string, options?: DoOptions) => T): TaggedTemplate<T> {
  return function (stringsOrPrompt: TemplateStringsArray | string, ...values: unknown[]): T {
    if (typeof stringsOrPrompt === 'string') {
      return fn(stringsOrPrompt, values[0] as DoOptions | undefined)
    }
    const prompt = stringsOrPrompt.reduce((acc, str, i) =>
      acc + str + (values[i] !== undefined ? String(values[i]) : ''), ''
    )
    return fn(prompt)
  } as TaggedTemplate<T>
}

// Client interface
export interface KPIsClient {
  /**
   * Create a KPI from natural language
   *
   * @example
   * ```typescript
   * const mrr = await kpis.do`
   *   Track Monthly Recurring Revenue from Stripe,
   *   alert when it drops more than 10% week-over-week
   * `
   * ```
   */
  do: TaggedTemplate<Promise<KPI>>

  /**
   * Create a new KPI with full configuration
   *
   * @example
   * ```typescript
   * const kpi = await kpis.create({
   *   name: 'monthly-recurring-revenue',
   *   metric: 'mrr',
   *   source: { type: 'stripe', config: { metric: 'subscriptions.mrr' } },
   *   target: { min: 100000, unit: 'usd' },
   *   alerts: [{ when: 'drops_below', threshold: 90000, channels: [{ type: 'slack' }] }]
   * })
   * ```
   */
  create(definition: Omit<KPI, 'id' | 'createdAt' | 'updatedAt'>): Promise<KPI>

  /**
   * Get a KPI by name or ID
   */
  get(nameOrId: string): Promise<KPI>

  /**
   * List all KPIs
   */
  list(options?: {
    tags?: string[]
    owner?: string
    source?: DataSource['type']
    limit?: number
  }): Promise<KPI[]>

  /**
   * Update a KPI
   */
  update(nameOrId: string, updates: Partial<Omit<KPI, 'id' | 'createdAt' | 'updatedAt'>>): Promise<KPI>

  /**
   * Delete a KPI
   */
  delete(nameOrId: string): Promise<void>

  // Measurement

  /**
   * Get the current value of a KPI
   *
   * @example
   * ```typescript
   * const metric = await kpis.measure('mrr')
   * console.log(metric.value) // 125000
   * console.log(metric.changePercent) // 5.2
   * ```
   */
  measure(nameOrId: string, options?: {
    dimensions?: Record<string, string>
    period?: string
  }): Promise<Metric>

  /**
   * Get trend data for a KPI over time
   *
   * @example
   * ```typescript
   * const trend = await kpis.trend('mrr', { period: '30d', granularity: 'daily' })
   * console.log(trend.summary.trend) // 'up'
   * ```
   */
  trend(nameOrId: string, options?: {
    period?: string // '7d', '30d', '90d', '1y'
    granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly'
    compare?: string // 'previous_period', 'year_over_year'
  }): Promise<TrendData>

  // Alerts

  /**
   * Configure alerts for a KPI
   *
   * @example
   * ```typescript
   * await kpis.alert('mrr', {
   *   when: 'drops_below',
   *   threshold: 100000,
   *   channels: [{ type: 'slack', config: { channel: '#alerts' } }]
   * })
   * ```
   */
  alert(nameOrId: string, config: Omit<AlertConfig, 'id'>): Promise<AlertConfig>

  /**
   * List active alerts
   */
  alerts(options?: {
    kpiId?: string
    level?: Alert['level']
    status?: Alert['status']
    limit?: number
  }): Promise<Alert[]>

  /**
   * Acknowledge an alert
   */
  acknowledge(alertId: string): Promise<Alert>

  /**
   * Resolve an alert
   */
  resolve(alertId: string): Promise<Alert>

  // Dashboards

  /**
   * Get or create a dashboard
   *
   * @example
   * ```typescript
   * const dashboard = await kpis.dashboard('executive', {
   *   kpis: ['mrr', 'churn', 'nps', 'cac'],
   *   layout: { columns: 2, rows: 2 }
   * })
   * ```
   */
  dashboard(nameOrId: string, options?: {
    kpis?: string[]
    layout?: DashboardLayout
    refreshInterval?: string
    isPublic?: boolean
  }): Promise<Dashboard>

  /**
   * List all dashboards
   */
  dashboards(): Promise<Dashboard[]>

  /**
   * Share a dashboard
   */
  share(dashboardId: string): Promise<{ url: string; token: string }>

  // Comparison

  /**
   * Compare multiple KPIs
   *
   * @example
   * ```typescript
   * const comparison = await kpis.compare(['mrr', 'arr', 'nrr'], { period: '30d' })
   * ```
   */
  compare(kpiIds: string[], options?: {
    period?: string
    normalize?: boolean
  }): Promise<ComparisonResult>

  // Batch operations

  /**
   * Refresh all KPIs from their sources
   */
  refresh(options?: { kpiIds?: string[] }): Promise<void>

  /**
   * Export KPI data
   */
  export(options?: {
    kpiIds?: string[]
    format?: 'json' | 'csv' | 'excel'
    period?: string
  }): Promise<{ url: string }>
}

/**
 * Create a configured KPIs client
 *
 * @example
 * ```typescript
 * import { KPIs } from 'kpis.do'
 * const kpis = KPIs({ baseURL: 'https://custom.example.com' })
 * ```
 */
export function KPIs(options?: ClientOptions): KPIsClient {
  return createClient<KPIsClient>('kpis', options)
}

/**
 * Default KPIs client instance
 *
 * For Workers environment, import 'rpc.do/env' first to configure API keys
 * from environment variables automatically.
 *
 * @example
 * ```typescript
 * // Workers - import env adapter first
 * import 'rpc.do/env'
 * import { kpis } from 'kpis.do'
 *
 * await kpis.measure('mrr')
 * ```
 */
export const kpis: KPIsClient = KPIs()

// Named exports
export { KPIs, kpis }

// Default export = camelCase instance
export default kpis

export type { ClientOptions } from 'rpc.do'
