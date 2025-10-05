/**
 * Service Execution Event Collector
 * Track service calls, latency, and errors
 */

import type { AnalyticsEvent } from '../types'

export interface ServiceExecutionData {
  serviceId: string
  executionId: string
  latencyMs: number
  success: boolean
  errorCode?: string
  userId?: string
  sessionId?: string
}

/**
 * Track service execution
 */
export function trackServiceExecution(data: ServiceExecutionData): AnalyticsEvent {
  return {
    eventType: 'service_execution',
    timestamp: Date.now(),
    serviceId: data.serviceId,
    executionId: data.executionId,
    latencyMs: data.latencyMs,
    success: data.success,
    errorCode: data.errorCode,
    userId: data.userId,
    sessionId: data.sessionId,
  }
}

/**
 * Example usage in service worker:
 *
 * const startTime = Date.now()
 * try {
 *   const result = await executeService(params)
 *   const event = trackServiceExecution({
 *     serviceId: 'service-123',
 *     executionId: generateId(),
 *     latencyMs: Date.now() - startTime,
 *     success: true,
 *     userId: user.id,
 *     sessionId: session.id,
 *   })
 *   await env.ANALYTICS.track(event)
 * } catch (error) {
 *   const event = trackServiceExecution({
 *     serviceId: 'service-123',
 *     executionId: generateId(),
 *     latencyMs: Date.now() - startTime,
 *     success: false,
 *     errorCode: error.code,
 *   })
 *   await env.ANALYTICS.track(event)
 * }
 */
