import { z } from 'zod'

// ============================================================================
// Core Types (from POC #7)
// ============================================================================

export interface Env {
  // Analytics Engine
  METRICS: AnalyticsEngineDataset
  TRACES: AnalyticsEngineDataset
  LOGS: AnalyticsEngineDataset
  RUM: AnalyticsEngineDataset

  // D1 Database
  DB: D1Database

  // R2 Storage
  LOGS_ARCHIVE: R2Bucket
  TRACES_ARCHIVE: R2Bucket
  RUM_SESSIONS: R2Bucket

  // KV
  ALERT_STATE: KVNamespace
  SAMPLING_STATE: KVNamespace

  // Durable Objects
  METRICS_AGGREGATOR: DurableObjectNamespace
  LOG_AGGREGATOR: DurableObjectNamespace

  // Workers AI
  AI: Ai
}

// OpenTelemetry types
export interface SpanContext {
  traceId: string
  spanId: string
  traceFlags: number
}

export interface Span {
  context: SpanContext
  parentSpanId?: string
  name: string
  kind: 'INTERNAL' | 'SERVER' | 'CLIENT' | 'PRODUCER' | 'CONSUMER'
  startTime: number
  endTime?: number
  attributes?: SpanAttributes
  events?: SpanEvent[]
  status?: SpanStatus
}

export interface SpanAttributes {
  [key: string]: string | number | boolean
}

export interface SpanEvent {
  name: string
  timestamp: number
  attributes?: SpanAttributes
}

export interface SpanStatus {
  code: 'UNSET' | 'OK' | 'ERROR'
  message?: string
}

export interface Resource {
  serviceName: string
  serviceVersion: string
  deploymentEnvironment?: string
}

export interface TraceData {
  resource: Resource
  spans: Span[]
}

export const TraceDataSchema = z.object({
  resource: z.object({
    serviceName: z.string(),
    serviceVersion: z.string(),
    deploymentEnvironment: z.string().optional(),
  }),
  spans: z.array(z.any()),
})

// ============================================================================
// RUM Types
// ============================================================================

export interface RUMEvent {
  type: 'pageview' | 'interaction' | 'error' | 'webvital' | 'resource' | 'longtask'
  timestamp: number
  sessionId: string
  viewId: string
  userId?: string

  // Page context
  url: string
  referrer?: string
  userAgent: string

  // Device context
  deviceType: 'desktop' | 'mobile' | 'tablet'
  viewport: { width: number; height: number }
  connection?: { effectiveType: string; downlink?: number; rtt?: number }

  // Geographic context
  country?: string
  region?: string
  city?: string

  // Event-specific data
  data: RUMEventData
}

export type RUMEventData =
  | PageViewData
  | InteractionData
  | ErrorData
  | WebVitalData
  | ResourceData
  | LongTaskData

export interface PageViewData {
  title: string
  loadTime: number
  domContentLoadedTime: number
  firstPaintTime?: number
  firstContentfulPaintTime?: number
}

export interface InteractionData {
  elementType: string
  elementId?: string
  elementText?: string
  duration: number
}

export interface ErrorData {
  message: string
  stack?: string
  filename?: string
  lineno?: number
  colno?: number
  errorType: 'js' | 'network' | 'console'
}

export interface WebVitalData {
  name: 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB' | 'INP'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta?: number
}

export interface ResourceData {
  url: string
  type: 'script' | 'stylesheet' | 'image' | 'fetch' | 'xhr'
  duration: number
  size?: number
  status?: number
}

export interface LongTaskData {
  duration: number
  startTime: number
  attribution?: string[]
}

// ============================================================================
// Synthetic Monitoring Types
// ============================================================================

export interface SyntheticCheck {
  id: string
  name: string
  type: 'http' | 'ping' | 'tcp' | 'dns' | 'ssl' | 'playwright'
  interval: number // seconds
  timeout: number // milliseconds
  locations: string[] // Cloudflare colo codes
  enabled: boolean

  // HTTP-specific
  url?: string
  method?: string
  headers?: Record<string, string>
  body?: string
  expectedStatus?: number
  expectedBody?: string

  // Playwright-specific
  script?: string // JavaScript code to execute

  // Alerting
  alertOnFailure: boolean
  alertThreshold: number // consecutive failures
  alertChannels: string[]
}

export interface SyntheticResult {
  checkId: string
  timestamp: number
  location: string
  success: boolean
  duration: number
  statusCode?: number
  errorMessage?: string
  steps?: SyntheticStep[]
}

export interface SyntheticStep {
  name: string
  success: boolean
  duration: number
  screenshot?: string // base64 or R2 URL
  errorMessage?: string
}

// ============================================================================
// Log Aggregation Types
// ============================================================================

export interface LogEntry {
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message: string
  service: string
  environment: string
  traceId?: string
  spanId?: string
  userId?: string
  requestId?: string

  // Structured fields
  fields: Record<string, any>

  // Stack trace (for errors)
  stack?: string
}

export interface LogQuery {
  query: string // Lucene-style query
  from: number
  to: number
  services?: string[]
  levels?: string[]
  limit: number
  offset: number
}

export interface LogSearchResult {
  total: number
  logs: LogEntry[]
  aggregations?: Record<string, any>
}

// ============================================================================
// AI Anomaly Detection Types
// ============================================================================

export interface AnomalyDetectionConfig {
  metricName: string
  algorithm: 'zscore' | 'mad' | 'isolation-forest' | 'prophet' | 'lstm'
  sensitivity: 'low' | 'medium' | 'high'
  seasonality?: 'hourly' | 'daily' | 'weekly'
  minDataPoints: number
}

export interface Anomaly {
  id: string
  timestamp: number
  metricName: string
  value: number
  expectedValue: number
  expectedRange: [number, number]
  severity: 'info' | 'warning' | 'critical'
  score: number // 0-1
  confidence: number // 0-1

  // Context
  service: string
  labels: Record<string, string>

  // Root cause analysis
  possibleCauses?: string[]
  relatedEvents?: string[]
  recommendation?: string
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface Dashboard {
  id: string
  name: string
  description?: string
  panels: DashboardPanel[]
  variables?: DashboardVariable[]
  timeRange: { from: string; to: string }
  refreshInterval?: number
}

export interface DashboardPanel {
  id: string
  type: 'graph' | 'stat' | 'table' | 'heatmap' | 'logs' | 'traces' | 'flamegraph'
  title: string
  queries: PanelQuery[]
  options: Record<string, any>
  position: { x: number; y: number; w: number; h: number }
}

export interface PanelQuery {
  datasource: 'metrics' | 'traces' | 'logs' | 'rum'
  query: string
  legend?: string
}

export interface DashboardVariable {
  name: string
  type: 'query' | 'constant' | 'custom' | 'interval'
  query?: string
  options?: string[]
  default?: string
}

// ============================================================================
// Alerting Types (Enhanced)
// ============================================================================

export interface AlertConfig {
  id: string
  name: string
  description?: string
  enabled: boolean

  // Query
  datasource: 'metrics' | 'traces' | 'logs' | 'rum'
  query: string

  // Condition
  condition: 'gt' | 'lt' | 'eq' | 'ne' | 'range'
  threshold: number | [number, number]
  windowSeconds: number
  evaluationInterval: number

  // Severity
  severity: 'info' | 'warning' | 'critical'

  // Notification
  channels: AlertChannel[]
  suppressionWindow?: number // seconds

  // Labels
  labels: Record<string, string>
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'pagerduty' | 'webhook' | 'sms'
  config: Record<string, any>
}

export interface AlertIncident {
  id: string
  alertId: string
  state: 'firing' | 'resolved' | 'acknowledged'
  severity: 'info' | 'warning' | 'critical'
  timestamp: number
  value: number
  message: string
  labels: Record<string, string>
  acknowledgedBy?: string
  acknowledgedAt?: number
  resolvedAt?: number
}

// ============================================================================
// Cost Attribution Types
// ============================================================================

export interface CostAttribution {
  service: string
  customer?: string
  resourceType: 'requests' | 'cpu' | 'memory' | 'egress' | 'storage'
  usage: number
  cost: number // USD
  timestamp: number
  labels: Record<string, string>
}

export interface CostReport {
  from: number
  to: number
  totalCost: number
  breakdown: {
    byService: Record<string, number>
    byCustomer: Record<string, number>
    byResourceType: Record<string, number>
  }
  topCostDrivers: Array<{
    name: string
    type: string
    cost: number
    percentage: number
  }>
}
