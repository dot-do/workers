/**
 * Analytics Event Writers
 * Write events to Analytics Engine with proper schema mapping
 */

import type { AnalyticsEvent } from './types'

/**
 * Write single event to Analytics Engine
 */
export function writeEvent(analytics: AnalyticsEngineDataset, event: AnalyticsEvent): void {
  const dataPoint = mapEventToDataPoint(event)
  analytics.writeDataPoint(dataPoint)
}

/**
 * Write batch of events to Analytics Engine
 */
export function batchWriteEvents(analytics: AnalyticsEngineDataset, events: AnalyticsEvent[]): void {
  for (const event of events) {
    writeEvent(analytics, event)
  }
}

/**
 * Map analytics event to Analytics Engine data point
 *
 * Schema:
 * - blob1: event_type
 * - blob2: service_id / experiment_id
 * - blob3: user_id
 * - blob4: session_id
 * - blob5: category
 * - blob6: status (success/error)
 * - blob7: currency
 * - blob8-20: reserved for future use
 *
 * - double1: latency_ms
 * - double2: revenue_amount
 * - double3-20: reserved for future use
 *
 * - index1: sample key (user_id or service_id)
 */
function mapEventToDataPoint(event: AnalyticsEvent): AnalyticsEngineDataPoint {
  const blobs: string[] = []
  const doubles: number[] = []

  // Blob1: event_type (required)
  blobs[0] = event.eventType

  // Blob2: primary identifier (service_id or experiment_id)
  blobs[1] = event.serviceId || event.experimentId || ''

  // Blob3: user_id
  blobs[2] = event.userId || ''

  // Blob4: session_id
  blobs[3] = event.sessionId || ''

  // Blob5: category
  blobs[4] = event.category || ''

  // Blob6: status
  blobs[5] = event.success !== undefined ? (event.success ? 'success' : 'error') : ''

  // Blob7: currency
  blobs[6] = event.currency || 'USD'

  // Blob8: error_code
  blobs[7] = event.errorCode || ''

  // Blob9: search_query (for marketplace searches)
  blobs[8] = event.searchQuery || ''

  // Blob10: conversion flag
  blobs[9] = event.conversion ? 'true' : 'false'

  // Double1: latency_ms
  doubles[0] = event.latencyMs || 0

  // Double2: revenue_amount
  doubles[1] = event.revenueAmount || 0

  // Double3: variant_index (for experiments)
  doubles[2] = event.variantIndex !== undefined ? event.variantIndex : -1

  return {
    blobs,
    doubles,
    indexes: [event.userId || event.serviceId || 'anonymous'],
  }
}

/**
 * Analytics Engine Data Point Interface
 */
interface AnalyticsEngineDataPoint {
  blobs: string[]
  doubles: number[]
  indexes: string[]
}
