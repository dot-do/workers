/**
 * Pipeline Worker - Tail Consumer for Cloudflare Pipelines
 *
 * Captures logs from all workers via tail consumers and streams them
 * to R2 Data Catalog via Cloudflare Pipelines for SQL querying.
 *
 * Features:
 * - Tail event enrichment (type, ulid, metadata)
 * - Error detection and classification
 * - Retry logic with exponential backoff
 * - Structured logging for R2 SQL
 * - Performance metrics tracking
 */

import { ulid as generateULID } from 'ulid'
import type {
  TailEvent,
  EnrichedLogEvent,
  ErrorClassification,
  Env,
} from './types'

// Sleep utility for retries
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Pipeline instance tracking
let pipelineInstance = Math.random().toString(36).substring(2, 10)
let eventCount = 0
let pipelineStart: number | undefined

/**
 * Classify error severity and type
 */
function classifyError(event: any): ErrorClassification {
  const outcome = event.outcome
  const status = event.event?.response?.status
  const logs = event.logs || []
  const exceptions = event.exceptions || []

  // Check for exceptions
  if (exceptions.length > 0) {
    const exception = exceptions[0]
    return {
      severity: 'critical',
      category: 'exception',
      errorType: exception.name || 'Error',
      errorMessage: exception.message || 'Unknown error',
      hasException: true,
    }
  }

  // Check outcome
  if (outcome === 'exception' || outcome === 'exceededCpu') {
    return {
      severity: 'critical',
      category: 'runtime',
      errorType: outcome,
      errorMessage: `Worker ${outcome}`,
      hasException: outcome === 'exception',
    }
  }

  // Check HTTP status codes
  if (status >= 500) {
    return {
      severity: 'error',
      category: 'http',
      errorType: 'server_error',
      errorMessage: `HTTP ${status}`,
      hasException: false,
    }
  }

  if (status >= 400) {
    return {
      severity: 'warning',
      category: 'http',
      errorType: 'client_error',
      errorMessage: `HTTP ${status}`,
      hasException: false,
    }
  }

  // Check logs for errors
  const errorLog = logs.find((log: any) =>
    log.message?.toLowerCase().includes('error')
  )
  if (errorLog) {
    return {
      severity: 'warning',
      category: 'application',
      errorType: 'logged_error',
      errorMessage: errorLog.message?.substring(0, 200) || 'Unknown error',
      hasException: false,
    }
  }

  // No error detected
  return {
    severity: 'info',
    category: 'success',
    errorType: null,
    errorMessage: null,
    hasException: false,
  }
}

/**
 * Determine event type from trace item
 */
function determineEventType(event: any): string {
  let type = event.scriptName || 'unknown'

  // Add dispatch namespace
  if (event.dispatchNamespace) {
    type = `${event.dispatchNamespace}.${type}`
  }

  // Add RPC method
  if (event.event?.rpcMethod) {
    type = `${type}.${event.event.rpcMethod}`
  }

  // Add event type
  if (event.event?.request) {
    type = `${type}.fetch`
  } else if (event.event?.rcptTo) {
    type = `${type}.email`
  } else if (event.event?.scheduledTime) {
    type = `${type}.scheduled`
  } else if (event.event?.queue) {
    type = `${type}.queue.${event.event.queue}`
  }

  // Add outcome
  if (event.outcome) {
    type = `${type}.${event.outcome}`
  }

  return type
}

/**
 * Extract URL from event
 */
function extractUrl(event: any): string | null {
  if (event.event?.request?.url) {
    return event.event.request.url
  }
  if (event.event?.rcptTo) {
    return `mailto:${event.event.rcptTo}`
  }
  if (event.event?.scheduledTime) {
    return `cron://${new Date(event.event.scheduledTime).toISOString()}`
  }
  return null
}

/**
 * Extract performance metrics
 */
function extractMetrics(event: any) {
  return {
    cpuTime: event.cpuTime || 0,
    wallTime: event.eventTimestamp - (event.event?.request?.headers?.['cf-request-start'] || event.eventTimestamp),
    memoryUsage: 0, // Not available from tail events
  }
}

/**
 * Enrich tail event with metadata and structure for R2 SQL
 */
function enrichEvent(event: any, ulid: string, timestamp: number): EnrichedLogEvent {
  const eventType = determineEventType(event)
  const url = extractUrl(event)
  const errorInfo = classifyError(event)
  const metrics = extractMetrics(event)

  return {
    // Identity
    ulid,
    timestamp,
    eventTimestamp: event.eventTimestamp || timestamp,

    // Source
    scriptName: event.scriptName || 'unknown',
    dispatchNamespace: event.dispatchNamespace || null,
    workerName: event.scriptName || 'unknown',
    eventType,

    // Request info
    url,
    method: event.event?.request?.method || null,
    cfRay: event.event?.request?.headers?.['cf-ray'] || null,
    userAgent: event.event?.request?.headers?.['user-agent'] || null,
    ip: event.event?.request?.headers?.['cf-connecting-ip'] || null,

    // Response info
    status: event.event?.response?.status || null,
    outcome: event.outcome || 'unknown',

    // RPC info
    rpcMethod: event.event?.rpcMethod || null,

    // Queue info
    queueName: event.event?.queue || null,

    // Email info
    emailTo: event.event?.rcptTo || null,

    // Scheduled info
    scheduledTime: event.event?.scheduledTime || null,
    cron: event.event?.cron || null,

    // Error information
    ...errorInfo,

    // Performance metrics
    cpuTime: metrics.cpuTime,
    wallTime: metrics.wallTime,

    // Logs
    logCount: event.logs?.length || 0,
    logs: event.logs ? JSON.stringify(event.logs) : null,

    // Exceptions
    exceptionCount: event.exceptions?.length || 0,
    exceptions: event.exceptions ? JSON.stringify(event.exceptions) : null,

    // Pipeline metadata
    pipelineInstance,
    pipelineBatchId: ulid,
    retryCount: 0,
  }
}

/**
 * Tail handler - main entrypoint
 */
export default {
  async tail(events: TailEvent[], env: Env): Promise<void> {
    if (!pipelineStart) {
      pipelineStart = Date.now()
    }

    // Generate batch ID
    const batchUlid = generateULID(events[0]?.eventTimestamp ?? Date.now())
    const timestamp = Date.now()

    // Enrich all events
    const enrichedEvents = events.map(event =>
      enrichEvent(event, batchUlid, timestamp)
    )

    // Send to pipeline with retry logic
    let retries = 0
    const maxRetries = 5

    while (retries < maxRetries) {
      try {
        // Update retry count
        enrichedEvents.forEach(event => {
          event.retryCount = retries
        })

        // Send to pipeline
        await env.PIPELINE.send(enrichedEvents)

        eventCount += enrichedEvents.length

        // Success - log stats
        if (eventCount % 1000 === 0) {
          console.log(
            JSON.stringify({
              type: 'pipeline_stats',
              instance: pipelineInstance,
              eventCount,
              uptime: Date.now() - pipelineStart!,
              batchSize: enrichedEvents.length,
              timestamp,
            })
          )
        }

        break
      } catch (error) {
        console.error(
          JSON.stringify({
            type: 'pipeline_error',
            attempt: retries + 1,
            maxRetries,
            error: error instanceof Error ? error.message : 'Unknown error',
            batchSize: enrichedEvents.length,
            timestamp,
          })
        )

        retries++

        if (retries < maxRetries) {
          // Exponential backoff: 1s, 4s, 9s, 16s
          await sleep(retries ** 2 * 1000)
        } else {
          // Max retries exceeded - log to console as fallback
          console.error(
            JSON.stringify({
              type: 'pipeline_failure',
              message: 'Failed to send events after max retries',
              batchSize: enrichedEvents.length,
              events: enrichedEvents,
              timestamp,
            })
          )
          throw error
        }
      }
    }
  },
} satisfies ExportedHandler<Env>
