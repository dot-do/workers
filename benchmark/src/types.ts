/**
 * Types for Benchmark Worker
 */

/**
 * Content Event - extends EnrichedLogEvent with content fields
 */
export interface ContentEvent {
  // Identity
  ulid: string
  timestamp: number
  eventTimestamp: number

  // Event Classification
  eventType: string
  mutationType: 'create' | 'update' | 'delete' | null

  // Entity Reference
  entityNs: string | null
  entityId: string | null
  entityType: string | null

  // Web Content (5 formats) ⭐
  contentJson: string | null // Structured data
  contentCode: string | null // Extracted ESM/JavaScript
  contentMarkdown: string | null // Markdown/MDX with frontmatter
  contentHtml: string | null // Rendered HTML
  contentAst: string | null // Abstract Syntax Tree

  // Content Metadata
  contentLength: number
  contentHash: string
  contentLanguage: string | null
  contentFormat: string | null

  // Source
  scriptName: string
  dispatchNamespace: string | null
  workerName: string

  // Request info
  url: string | null
  method: string | null
  cfRay: string | null
  userAgent: string | null
  ip: string | null

  // Response info
  status: number | null
  outcome: string

  // RPC info
  rpcMethod: string | null

  // Queue info
  queueName: string | null

  // Email info
  emailTo: string | null

  // Scheduled info
  scheduledTime: number | null
  cron: string | null

  // Error information
  severity: 'critical' | 'error' | 'warning' | 'info'
  category: 'exception' | 'runtime' | 'http' | 'application' | 'success'
  errorType: string | null
  errorMessage: string | null
  hasException: boolean

  // Performance metrics
  cpuTime: number
  wallTime: number

  // Logs
  logCount: number
  logs: string | null

  // Exceptions
  exceptionCount: number
  exceptions: string | null

  // Pipeline metadata
  pipelineInstance: string
  pipelineBatchId: string
  retryCount: number
}

/**
 * Test Content
 */
export interface TestContent {
  ns: string
  id: string
  json: Record<string, any> | null
  code: string | null
  markdown: string
  html: string
  ast: Record<string, any> | null
  hash: string
  language: string
}

/**
 * Benchmark Result
 */
export interface BenchmarkResult {
  name: string
  description: string
  durationMs: number
  threshold: number
  passed: boolean
  details?: any
}

/**
 * Environment Bindings
 */
export interface Env {
  PIPELINE: {
    send: (events: ContentEvent[]) => Promise<void>
  }
  R2_SQL: any // R2 SQL binding (to be added)
}
