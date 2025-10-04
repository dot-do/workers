/**
 * Types for Pipeline Worker
 */

/**
 * Cloudflare Tail Event
 */
export interface TailEvent {
  scriptName?: string
  dispatchNamespace?: string
  eventTimestamp?: number
  outcome?: string
  event?: {
    request?: {
      url?: string
      method?: string
      headers?: Record<string, string>
    }
    response?: {
      status?: number
    }
    rpcMethod?: string
    queue?: string
    rcptTo?: string
    scheduledTime?: number
    cron?: string
  }
  logs?: Array<{
    level: string
    message?: string
    timestamp: number
  }>
  exceptions?: Array<{
    name?: string
    message?: string
    stack?: string
  }>
  cpuTime?: number
}

/**
 * Error Classification
 */
export interface ErrorClassification {
  severity: 'critical' | 'error' | 'warning' | 'info'
  category: 'exception' | 'runtime' | 'http' | 'application' | 'success'
  errorType: string | null
  errorMessage: string | null
  hasException: boolean
}

/**
 * Enriched Log Event (sent to Pipeline)
 */
export interface EnrichedLogEvent {
  // Identity
  ulid: string
  timestamp: number
  eventTimestamp: number

  // Source
  scriptName: string
  dispatchNamespace: string | null
  workerName: string
  eventType: string

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
 * Environment Bindings
 */
export interface Env {
  PIPELINE: {
    send: (events: EnrichedLogEvent[]) => Promise<void>
  }
}
