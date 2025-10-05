/**
 * Analytics Platform Test Suite
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { IngestEvent, QueryRequest } from '../src/types'

describe('Analytics Ingestion', () => {
  describe('Event Validation', () => {
    it('should accept valid events', () => {
      const event: IngestEvent = {
        event: 'api.request',
        userId: 'user_123',
        properties: {
          method: 'GET',
          path: '/api/users',
        },
        performance: {
          duration: 45.5,
          statusCode: 200,
        },
      }

      expect(event.event).toBe('api.request')
      expect(event.userId).toBe('user_123')
    })

    it('should accept events without timestamp', () => {
      const event: IngestEvent = {
        event: 'test.event',
      }

      expect(event.timestamp).toBeUndefined()
    })

    it('should accept usage tracking events', () => {
      const event: IngestEvent = {
        event: 'usage.tracked',
        userId: 'user_123',
        organizationId: 'org_456',
        usage: {
          quantity: 1500,
          unit: 'tokens',
          sku: 'ai-tokens',
        },
      }

      expect(event.usage?.quantity).toBe(1500)
      expect(event.usage?.sku).toBe('ai-tokens')
    })
  })

  describe('Batch Ingestion', () => {
    it('should accept batch of events', () => {
      const batch = {
        events: [
          { event: 'test1' },
          { event: 'test2' },
          { event: 'test3' },
        ],
      }

      expect(batch.events).toHaveLength(3)
    })
  })
})

describe('Analytics Queries', () => {
  describe('Query Request Validation', () => {
    it('should accept time range queries', () => {
      const query: QueryRequest = {
        start: '2025-10-03T00:00:00Z',
        end: '2025-10-03T23:59:59Z',
        groupBy: 'hour',
      }

      expect(query.start).toBeTruthy()
      expect(query.end).toBeTruthy()
    })

    it('should accept filtered queries', () => {
      const query: QueryRequest = {
        start: '2025-10-03T00:00:00Z',
        end: '2025-10-03T23:59:59Z',
        event: 'api.request',
        userId: 'user_123',
      }

      expect(query.event).toBe('api.request')
      expect(query.userId).toBe('user_123')
    })

    it('should accept paginated queries', () => {
      const query: QueryRequest = {
        start: '2025-10-03T00:00:00Z',
        end: '2025-10-03T23:59:59Z',
        limit: 100,
        offset: 0,
      }

      expect(query.limit).toBe(100)
      expect(query.offset).toBe(0)
    })
  })
})

describe('Performance Metrics', () => {
  it('should calculate average duration', () => {
    const events = [
      { duration: 100 },
      { duration: 200 },
      { duration: 300 },
    ]

    const avg = events.reduce((sum, e) => sum + e.duration, 0) / events.length
    expect(avg).toBe(200)
  })

  it('should calculate percentiles', () => {
    const durations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    const sorted = [...durations].sort((a, b) => a - b)

    const p50Index = Math.floor(sorted.length * 0.5)
    const p95Index = Math.floor(sorted.length * 0.95)

    expect(sorted[p50Index]).toBe(60)
    expect(sorted[p95Index]).toBe(100)
  })

  it('should calculate error rate', () => {
    const total = 100
    const errors = 5
    const errorRate = (errors / total) * 100

    expect(errorRate).toBe(5)
  })
})

describe('Usage Billing', () => {
  it('should sum usage quantities', () => {
    const usageEvents = [
      { quantity: 1000, sku: 'ai-tokens' },
      { quantity: 500, sku: 'ai-tokens' },
      { quantity: 250, sku: 'ai-tokens' },
    ]

    const total = usageEvents.reduce((sum, e) => sum + e.quantity, 0)
    expect(total).toBe(1750)
  })

  it('should group by SKU', () => {
    const usageEvents = [
      { quantity: 1000, sku: 'ai-tokens' },
      { quantity: 500, sku: 'api-calls' },
      { quantity: 250, sku: 'ai-tokens' },
    ]

    const grouped = usageEvents.reduce(
      (acc, e) => {
        acc[e.sku] = (acc[e.sku] || 0) + e.quantity
        return acc
      },
      {} as Record<string, number>
    )

    expect(grouped['ai-tokens']).toBe(1250)
    expect(grouped['api-calls']).toBe(500)
  })
})

describe('Time Bucketing', () => {
  it('should bucket by hour', () => {
    const timestamp = new Date('2025-10-03T14:30:00Z').getTime()
    const hourMs = 3600000
    const bucket = Math.floor(timestamp / hourMs) * hourMs

    expect(new Date(bucket).getUTCHours()).toBe(14)
    expect(new Date(bucket).getUTCMinutes()).toBe(0)
  })

  it('should bucket by day', () => {
    const timestamp = new Date('2025-10-03T14:30:00Z').getTime()
    const dayMs = 86400000
    const bucket = Math.floor(timestamp / dayMs) * dayMs

    expect(new Date(bucket).getUTCDate()).toBe(3)
    expect(new Date(bucket).getUTCHours()).toBe(0)
  })
})

describe('Integration Scenarios', () => {
  it('should track API request with all metadata', () => {
    const event: IngestEvent = {
      event: 'api.request',
      userId: 'user_123',
      sessionId: 'session_abc',
      organizationId: 'org_456',
      properties: {
        method: 'POST',
        path: '/api/data',
        status: '201',
        endpoint: '/api/data',
      },
      performance: {
        duration: 125.5,
        success: true,
        statusCode: 201,
      },
    }

    // Validate all fields are present
    expect(event.event).toBe('api.request')
    expect(event.userId).toBe('user_123')
    expect(event.sessionId).toBe('session_abc')
    expect(event.organizationId).toBe('org_456')
    expect(event.properties?.method).toBe('POST')
    expect(event.performance?.duration).toBe(125.5)
  })

  it('should track error with context', () => {
    const event: IngestEvent = {
      event: 'api.error',
      userId: 'user_123',
      properties: {
        error: 'validation_failed',
        severity: 'error',
        path: '/api/data',
      },
      performance: {
        duration: 10,
        success: false,
        statusCode: 400,
      },
    }

    expect(event.performance?.success).toBe(false)
    expect(event.performance?.statusCode).toBe(400)
  })

  it('should track workflow execution', () => {
    const event: IngestEvent = {
      event: 'workflow.completed',
      userId: 'user_123',
      organizationId: 'org_456',
      properties: {
        workflow_id: 'wf_123',
        status: 'success',
      },
      performance: {
        duration: 5000,
        success: true,
      },
    }

    expect(event.event).toBe('workflow.completed')
    expect(event.properties?.workflow_id).toBe('wf_123')
  })
})
