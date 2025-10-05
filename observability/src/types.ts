import { z } from 'zod'

// OpenTelemetry-compatible types
export const SpanKindSchema = z.enum(['INTERNAL', 'SERVER', 'CLIENT', 'PRODUCER', 'CONSUMER'])
export type SpanKind = z.infer<typeof SpanKindSchema>

export const SpanStatusSchema = z.object({
  code: z.enum(['UNSET', 'OK', 'ERROR']),
  message: z.string().optional(),
})
export type SpanStatus = z.infer<typeof SpanStatusSchema>

export const SpanContextSchema = z.object({
  traceId: z.string().length(32), // 128-bit hex
  spanId: z.string().length(16), // 64-bit hex
  traceFlags: z.number().default(1), // sampled
})
export type SpanContext = z.infer<typeof SpanContextSchema>

export const SpanAttributesSchema = z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
export type SpanAttributes = z.infer<typeof SpanAttributesSchema>

export const SpanEventSchema = z.object({
  name: z.string(),
  timestamp: z.number(),
  attributes: SpanAttributesSchema.optional(),
})
export type SpanEvent = z.infer<typeof SpanEventSchema>

export const SpanSchema = z.object({
  context: SpanContextSchema,
  parentSpanId: z.string().length(16).optional(),
  name: z.string(),
  kind: SpanKindSchema.default('INTERNAL'),
  startTime: z.number(), // microseconds
  endTime: z.number().optional(),
  status: SpanStatusSchema.optional(),
  attributes: SpanAttributesSchema.optional(),
  events: z.array(SpanEventSchema).optional(),
  links: z.array(SpanContextSchema).optional(),
})
export type Span = z.infer<typeof SpanSchema>

export const ResourceSchema = z.object({
  serviceName: z.string(),
  serviceVersion: z.string().optional(),
  serviceNamespace: z.string().optional(),
  deploymentEnvironment: z.string().optional(),
  attributes: SpanAttributesSchema.optional(),
})
export type Resource = z.infer<typeof ResourceSchema>

export const TraceDataSchema = z.object({
  resource: ResourceSchema,
  spans: z.array(SpanSchema),
})
export type TraceData = z.infer<typeof TraceDataSchema>

// Metrics
export const MetricTypeSchema = z.enum(['counter', 'gauge', 'histogram', 'summary'])
export type MetricType = z.infer<typeof MetricTypeSchema>

export const MetricDataSchema = z.object({
  name: z.string(),
  type: MetricTypeSchema,
  value: z.number(),
  timestamp: z.number().optional(),
  labels: z.record(z.string()).optional(),
  unit: z.string().optional(),
})
export type MetricData = z.infer<typeof MetricDataSchema>

export const MetricBatchSchema = z.object({
  resource: ResourceSchema,
  metrics: z.array(MetricDataSchema),
})
export type MetricBatch = z.infer<typeof MetricBatchSchema>

// Service Registry
export const ServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string().optional(),
  environment: z.string().default('production'),
  workerName: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})
export type Service = z.infer<typeof ServiceSchema>

export const ServiceDependencySchema = z.object({
  sourceServiceId: z.string(),
  targetServiceId: z.string(),
  dependencyType: z.enum(['rpc', 'http', 'queue', 'db']),
  requestCount: z.number().default(0),
  errorCount: z.number().default(0),
  avgLatencyMs: z.number().default(0),
})
export type ServiceDependency = z.infer<typeof ServiceDependencySchema>

// Alerts
export const AlertConditionSchema = z.enum(['gt', 'lt', 'gte', 'lte', 'eq'])
export type AlertCondition = z.infer<typeof AlertConditionSchema>

export const AlertSeveritySchema = z.enum(['info', 'warning', 'critical'])
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>

export const AlertConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  serviceId: z.string().optional(),
  metricName: z.string(),
  condition: AlertConditionSchema,
  threshold: z.number(),
  windowSeconds: z.number().default(300),
  severity: AlertSeveritySchema.default('warning'),
  enabled: z.boolean().default(true),
  labels: z.record(z.string()).optional(),
})
export type AlertConfig = z.infer<typeof AlertConfigSchema>

export const AlertIncidentSchema = z.object({
  id: z.string(),
  alertConfigId: z.string(),
  serviceId: z.string().optional(),
  state: z.enum(['firing', 'resolved']),
  value: z.number(),
  threshold: z.number(),
  message: z.string().optional(),
  labels: z.record(z.string()).optional(),
  firedAt: z.number(),
  resolvedAt: z.number().optional(),
  acknowledgedAt: z.number().optional(),
  acknowledgedBy: z.string().optional(),
})
export type AlertIncident = z.infer<typeof AlertIncidentSchema>

// Worker bindings
export interface Env {
  METRICS: AnalyticsEngineDataset
  TRACES: AnalyticsEngineDataset
  DB: D1Database
  ALERT_STATE: KVNamespace
  ENVIRONMENT: string
  SERVICE_NAME: string
  ALERT_WEBHOOK_URL?: string
}

// Analytics Engine dataset types
export interface AnalyticsEngineDataPoint {
  blobs?: string[]
  doubles?: number[]
  indexes?: string[]
}
