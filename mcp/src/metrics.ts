/**
 * Metrics and Observability for MCP Server
 *
 * Tracks CapnWeb queuing performance, tool execution times, and usage patterns.
 * Logs to Cloudflare observability platform for monitoring and alerting.
 */

export interface MetricEvent {
  timestamp: number
  type: 'tool_call' | 'batch_operation' | 'error' | 'performance'
  name: string
  duration?: number
  batchSize?: number
  authenticated?: boolean
  userId?: string
  metadata?: Record<string, any>
}

export interface CapnWebMetrics {
  operationCount: number
  batchSize: number
  estimatedRoundTrips: number
  estimatedLatency: number
  actualLatency: number
  speedup: number
}

/**
 * Track a tool call with timing and metadata
 */
export function trackToolCall(
  toolName: string,
  duration: number,
  authenticated: boolean,
  userId?: string,
  error?: Error
): void {
  const event: MetricEvent = {
    timestamp: Date.now(),
    type: error ? 'error' : 'tool_call',
    name: toolName,
    duration,
    authenticated,
    userId,
    metadata: error ? { error: error.message } : undefined,
  }

  logMetric(event)
}

/**
 * Track CapnWeb batch operation metrics
 *
 * This helps validate the performance improvements from CapnWeb queuing.
 * For example, 10 operations batched = 1 RPC call instead of 10 round-trips.
 */
export function trackBatchOperation(
  toolName: string,
  operationCount: number,
  actualDuration: number,
  operationType: 'create' | 'read' | 'update' | 'delete' | 'mixed'
): CapnWebMetrics {
  // Estimate performance without CapnWeb (sequential awaits)
  const ROUND_TRIP_LATENCY = 100 // ms average
  const estimatedRoundTrips = operationCount
  const estimatedLatency = estimatedRoundTrips * ROUND_TRIP_LATENCY

  // Actual performance with CapnWeb (batched)
  const actualRoundTrips = operationType === 'mixed' ? 2 : 1 // Mixed = reads + writes = 2 batches
  const actualLatency = actualDuration

  // Calculate speedup
  const speedup = estimatedLatency / actualLatency

  const metrics: CapnWebMetrics = {
    operationCount,
    batchSize: operationCount,
    estimatedRoundTrips,
    estimatedLatency,
    actualLatency,
    speedup,
  }

  const event: MetricEvent = {
    timestamp: Date.now(),
    type: 'batch_operation',
    name: `${toolName}.batch`,
    duration: actualLatency,
    batchSize: operationCount,
    metadata: {
      operationType,
      estimatedRoundTrips,
      actualRoundTrips,
      speedup: speedup.toFixed(2) + 'x',
    },
  }

  logMetric(event)

  return metrics
}

/**
 * Track performance metrics for async operations
 */
export function trackPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  const event: MetricEvent = {
    timestamp: Date.now(),
    type: 'performance',
    name: operation,
    duration,
    metadata,
  }

  logMetric(event)
}

/**
 * Log metric event to Cloudflare observability platform
 *
 * These logs are automatically collected by Cloudflare's observability
 * system and can be queried via GraphQL API or viewed in dashboard.
 */
function logMetric(event: MetricEvent): void {
  // Structured logging for Cloudflare observability
  console.log(JSON.stringify({
    level: event.type === 'error' ? 'error' : 'info',
    service: 'mcp-server',
    event: event.type,
    ...event,
  }))
}

/**
 * Calculate CapnWeb speedup ratio
 *
 * Formula: speedup = (operations * 100ms) / actual_duration
 *
 * Examples:
 * - 4 operations in 100ms = 4x speedup
 * - 10 operations in 100ms = 10x speedup
 * - 50 operations in 100ms = 50x speedup
 */
export function calculateSpeedup(operationCount: number, actualDuration: number): number {
  const ROUND_TRIP_LATENCY = 100 // ms
  const estimatedDuration = operationCount * ROUND_TRIP_LATENCY
  return estimatedDuration / actualDuration
}

/**
 * Format batch metrics for display
 */
export function formatBatchMetrics(metrics: CapnWebMetrics): string {
  return [
    `⚡ CapnWeb Performance:`,
    `   Operations: ${metrics.operationCount}`,
    `   Without batching: ~${metrics.estimatedLatency}ms (${metrics.estimatedRoundTrips} round-trips)`,
    `   With batching: ${metrics.actualLatency}ms (1 RPC batch)`,
    `   Speedup: ${metrics.speedup.toFixed(2)}x faster`,
  ].join('\n')
}

/**
 * Aggregate metrics for reporting
 *
 * This would typically be called by a scheduled task to aggregate
 * metrics over time and report to analytics systems.
 */
export interface AggregatedMetrics {
  period: { start: number; end: number }
  toolCalls: {
    total: number
    byTool: Record<string, number>
    authenticated: number
    errors: number
  }
  batching: {
    totalBatches: number
    totalOperations: number
    averageBatchSize: number
    averageSpeedup: number
    totalTimeSaved: number // ms
  }
  performance: {
    averageDuration: number
    p50: number
    p95: number
    p99: number
  }
}

/**
 * Wrapper to track tool execution with automatic metrics
 */
export async function trackToolExecution<T>(
  toolName: string,
  authenticated: boolean,
  userId: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await fn()
    const duration = Date.now() - startTime

    trackToolCall(toolName, duration, authenticated, userId)

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    trackToolCall(toolName, duration, authenticated, userId, error as Error)

    throw error
  }
}

/**
 * Example usage in tool handlers:
 *
 * @example
 * export async function memory_create_entities(args, c, user) {
 *   const startTime = Date.now()
 *
 *   // Queue all operations
 *   const promises = args.entities.map(entity =>
 *     db.upsert({ ... })
 *   )
 *
 *   // Batch execute
 *   await Promise.all(promises)
 *
 *   const duration = Date.now() - startTime
 *
 *   // Track metrics
 *   const metrics = trackBatchOperation(
 *     'memory_create_entities',
 *     args.entities.length,
 *     duration,
 *     'create'
 *   )
 *
 *   return {
 *     created: args.entities,
 *     performance: formatBatchMetrics(metrics)
 *   }
 * }
 */
