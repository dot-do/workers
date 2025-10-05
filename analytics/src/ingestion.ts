/**
 * Event Ingestion Worker
 *
 * Accepts events via HTTP POST and writes to Analytics Engine
 * Provides auto-instrumentation middleware for other workers
 *
 * Features:
 * - Event validation and normalization
 * - Batch writing to Analytics Engine
 * - Auto-instrumentation middleware
 * - Usage tracking for billing
 * - Performance metrics
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AnalyticsEngineDataPoint } from '@cloudflare/workers-types'

// ==================== Types ====================

interface Env {
  ANALYTICS_ENGINE: AnalyticsEngineDataset
  PIPELINE: Fetcher // Cloudflare Pipeline binding for streaming to R2
  DB?: D1Database // Optional: for enrichment or metadata
  RATE_LIMITER?: RateLimit
}

interface IngestEvent {
  // Core fields
  timestamp?: number
  event: string
  userId?: string
  sessionId?: string
  organizationId?: string

  // Properties
  properties?: Record<string, string | number | boolean>

  // Usage tracking (for billing)
  usage?: {
    quantity: number
    unit: string
    sku?: string
  }

  // Performance metrics
  performance?: {
    duration?: number
    success?: boolean
    statusCode?: number
  }
}

interface BatchIngestRequest {
  events: IngestEvent[]
}

interface IngestResponse {
  success: boolean
  accepted: number
  rejected: number
  errors?: string[]
}

// ==================== RPC Service ====================

export class AnalyticsIngestionService extends WorkerEntrypoint<Env> {
  /**
   * Ingest a single event via RPC
   */
  async ingestEvent(event: IngestEvent): Promise<{ success: boolean; error?: string }> {
    try {
      await this.writeToAnalyticsEngine([event])
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Ingest multiple events via RPC
   */
  async ingestBatch(events: IngestEvent[]): Promise<IngestResponse> {
    try {
      const validated = events.map(e => this.validateEvent(e)).filter(e => e !== null) as IngestEvent[]

      await this.writeToAnalyticsEngine(validated)

      return {
        success: true,
        accepted: validated.length,
        rejected: events.length - validated.length,
      }
    } catch (error) {
      return {
        success: false,
        accepted: 0,
        rejected: events.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  /**
   * Write events to Analytics Engine
   */
  private async writeToAnalyticsEngine(events: IngestEvent[]): Promise<void> {
    const dataPoints: AnalyticsEngineDataPoint[] = events.map(event => {
      const timestamp = event.timestamp || Date.now()

      // Build indexes (strings only)
      const indexes: string[] = []
      if (event.userId) indexes.push(`user:${event.userId}`)
      if (event.sessionId) indexes.push(`session:${event.sessionId}`)
      if (event.organizationId) indexes.push(`org:${event.organizationId}`)

      // Build blobs (doubles only)
      const blobs: number[] = []
      if (event.performance?.duration) blobs.push(event.performance.duration)
      if (event.performance?.statusCode) blobs.push(event.performance.statusCode)
      if (event.usage?.quantity) blobs.push(event.usage.quantity)

      // Add properties to indexes
      if (event.properties) {
        for (const [key, value] of Object.entries(event.properties)) {
          if (typeof value === 'string') {
            indexes.push(`${key}:${value}`)
          } else if (typeof value === 'number') {
            blobs.push(value)
          }
        }
      }

      return {
        indexes,
        blobs,
        // Doubles are deprecated - use blobs instead
        doubles: [],
      }
    })

    // Write to Analytics Engine
    this.env.ANALYTICS_ENGINE.writeDataPoint(...dataPoints)

    // Also send to Pipeline for streaming to R2 (if configured)
    if (this.env.PIPELINE) {
      try {
        await this.env.PIPELINE.fetch('https://pipeline/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events }),
        })
      } catch (error) {
        console.error('[Ingestion] Pipeline write failed:', error)
        // Don't fail ingestion if pipeline fails
      }
    }
  }

  /**
   * Validate and normalize event
   */
  private validateEvent(event: IngestEvent): IngestEvent | null {
    if (!event.event || typeof event.event !== 'string') {
      return null
    }

    return {
      ...event,
      timestamp: event.timestamp || Date.now(),
    }
  }
}

// ==================== HTTP Interface ====================

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

// Health check
app.get('/health', c => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// Ingest single event
app.post('/events', async c => {
  try {
    const event = (await c.req.json()) as IngestEvent

    // Validate and normalize event
    if (!event.event || typeof event.event !== 'string') {
      return c.json({ error: 'Missing or invalid event field' }, 400)
    }

    const normalizedEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
    }

    // Write to Analytics Engine
    const dataPoints: AnalyticsEngineDataPoint[] = [normalizedEvent].map(e => {
      // Analytics Engine supports only 1 index - use the most important identifier
      const index = e.organizationId
        ? `org:${e.organizationId}`
        : e.userId
          ? `user:${e.userId}`
          : e.sessionId
            ? `session:${e.sessionId}`
            : 'anonymous'

      const blobs: number[] = []
      if (e.performance?.duration) blobs.push(e.performance.duration)
      if (e.performance?.statusCode) blobs.push(e.performance.statusCode)
      if (e.usage?.quantity) blobs.push(e.usage.quantity)

      if (e.properties) {
        for (const [key, value] of Object.entries(e.properties)) {
          if (typeof value === 'number') {
            blobs.push(value)
          }
        }
      }

      return { indexes: [index], blobs, doubles: [] }
    })

    c.env.ANALYTICS_ENGINE.writeDataPoint(...dataPoints)

    return c.json({ success: true, accepted: 1 })
  } catch (error) {
    console.error('[Ingestion] Event error:', error)
    return c.json(
      {
        error: 'Invalid event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    )
  }
})

// Ingest batch of events
app.post('/events/batch', async c => {
  try {
    const request = (await c.req.json()) as BatchIngestRequest

    if (!Array.isArray(request.events)) {
      return c.json({ error: 'Invalid request: events must be an array' }, 400)
    }

    const validated = request.events
      .map(e => {
        if (!e.event || typeof e.event !== 'string') return null
        return { ...e, timestamp: e.timestamp || Date.now() }
      })
      .filter(e => e !== null) as IngestEvent[]

    // Write to Analytics Engine
    const dataPoints: AnalyticsEngineDataPoint[] = validated.map(e => {
      // Analytics Engine supports only 1 index - use the most important identifier
      const index = e.organizationId
        ? `org:${e.organizationId}`
        : e.userId
          ? `user:${e.userId}`
          : e.sessionId
            ? `session:${e.sessionId}`
            : 'anonymous'

      const blobs: number[] = []
      if (e.performance?.duration) blobs.push(e.performance.duration)
      if (e.performance?.statusCode) blobs.push(e.performance.statusCode)
      if (e.usage?.quantity) blobs.push(e.usage.quantity)

      if (e.properties) {
        for (const [key, value] of Object.entries(e.properties)) {
          if (typeof value === 'number') {
            blobs.push(value)
          }
        }
      }

      return { indexes: [index], blobs, doubles: [] }
    })

    c.env.ANALYTICS_ENGINE.writeDataPoint(...dataPoints)

    return c.json({
      success: true,
      accepted: validated.length,
      rejected: request.events.length - validated.length,
    })
  } catch (error) {
    console.error('[Ingestion] Batch error:', error)
    return c.json(
      {
        error: 'Invalid batch',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    )
  }
})

// ==================== Auto-Instrumentation Middleware ====================

/**
 * Hono middleware for automatic event tracking
 *
 * Usage:
 *   app.use('*', analyticsMiddleware(env.ANALYTICS_INGESTION))
 */
export function analyticsMiddleware(ingestionService: AnalyticsIngestionService) {
  return async (c: any, next: () => Promise<void>) => {
    const startTime = Date.now()
    const requestId = crypto.randomUUID()

    // Continue to handler
    await next()

    // Track request event
    const duration = Date.now() - startTime
    const url = new URL(c.req.url)

    await ingestionService.ingestEvent({
      event: 'api.request',
      sessionId: requestId,
      properties: {
        method: c.req.method,
        path: url.pathname,
        status: c.res.status.toString(),
      },
      performance: {
        duration,
        success: c.res.status < 400,
        statusCode: c.res.status,
      },
    })
  }
}

/**
 * Usage tracking helper for billing
 *
 * Usage:
 *   await trackUsage(env.ANALYTICS_INGESTION, {
 *     userId: 'user_123',
 *     organizationId: 'org_456',
 *     sku: 'ai-tokens',
 *     quantity: 1500,
 *     unit: 'tokens'
 *   })
 */
export async function trackUsage(
  ingestionService: AnalyticsIngestionService,
  params: {
    userId?: string
    organizationId?: string
    sku: string
    quantity: number
    unit: string
  }
) {
  await ingestionService.ingestEvent({
    event: 'usage.tracked',
    userId: params.userId,
    organizationId: params.organizationId,
    usage: {
      quantity: params.quantity,
      unit: params.unit,
      sku: params.sku,
    },
  })
}

// ==================== Worker Export ====================

export default {
  fetch: app.fetch,
}

export * from './types'
