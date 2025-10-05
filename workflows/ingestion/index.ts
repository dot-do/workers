/**
 * Event Ingestion Service
 *
 * Handles high-throughput event ingestion with:
 * - Validation and enrichment
 * - Analytics Engine storage
 * - Queue buffering for downstream processing
 * - Real-time pattern matching triggers
 */

import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Event, ApiResponse } from '../types'
import { EventSchema } from '../types'

const app = new Hono<{ Bindings: Env }>()

// ============================================================================
// Event Ingestion Endpoint
// ============================================================================

/**
 * POST /events
 * Ingest a single event
 */
app.post('/events', async (c) => {
  try {
    const body = await c.req.json()

    // Validate and enrich event
    const event = await validateAndEnrichEvent(body, c.env, c.req)

    // Store in Analytics Engine (primary storage)
    await storeEvent(event, c.env)

    // Queue for downstream processing (pattern matching)
    await c.env.EVENT_QUEUE.send(event)

    // Track metric
    await trackMetric(c.env, {
      timestamp: Date.now(),
      accountId: event.accountId,
      metricType: 'event_ingested',
      value: 1,
      metadata: { eventType: event.type, source: event.source },
    })

    return c.json<ApiResponse<{ eventId: string }>>({
      success: true,
      data: { eventId: event.id },
    })
  } catch (error: any) {
    console.error('Event ingestion error:', error)
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'INGESTION_ERROR',
          message: error.message,
          details: error,
        },
      },
      400
    )
  }
})

/**
 * POST /events/batch
 * Ingest multiple events in a single request
 */
app.post('/events/batch', async (c) => {
  try {
    const body = await c.req.json()
    const events = z.array(z.any()).parse(body)

    // Validate and enrich all events
    const validatedEvents = await Promise.all(events.map((e) => validateAndEnrichEvent(e, c.env, c.req)))

    // Store in Analytics Engine (batch)
    await Promise.all(validatedEvents.map((e) => storeEvent(e, c.env)))

    // Queue for downstream processing (batch)
    await c.env.EVENT_QUEUE.sendBatch(validatedEvents.map((e) => ({ body: e })))

    // Track metric
    await trackMetric(c.env, {
      timestamp: Date.now(),
      accountId: validatedEvents[0].accountId,
      metricType: 'event_ingested',
      value: validatedEvents.length,
      metadata: { batch: true },
    })

    return c.json<ApiResponse<{ count: number; eventIds: string[] }>>({
      success: true,
      data: {
        count: validatedEvents.length,
        eventIds: validatedEvents.map((e) => e.id),
      },
    })
  } catch (error: any) {
    console.error('Batch ingestion error:', error)
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'BATCH_INGESTION_ERROR',
          message: error.message,
          details: error,
        },
      },
      400
    )
  }
})

// ============================================================================
// Event Query Endpoint (Analytics Engine SQL)
// ============================================================================

/**
 * POST /events/query
 * Query events using SQL (Analytics Engine SQL API)
 */
app.post('/events/query', async (c) => {
  try {
    const { query, accountId } = await c.req.json()

    if (!query || !accountId) {
      throw new Error('query and accountId required')
    }

    // Execute SQL query against Analytics Engine
    const results = await queryAnalyticsEngine(c.env, query, accountId)

    return c.json<ApiResponse>({
      success: true,
      data: results,
    })
  } catch (error: any) {
    console.error('Query error:', error)
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: error.message,
          details: error,
        },
      },
      400
    )
  }
})

// ============================================================================
// Webhook Endpoints (Payload CMS Integration)
// ============================================================================

/**
 * POST /webhooks/payload
 * Receive webhooks from Payload CMS
 */
app.post('/webhooks/payload', async (c) => {
  try {
    const signature = c.req.header('x-payload-signature')

    // Verify webhook signature
    if (!verifyWebhookSignature(c.req, c.env.WEBHOOK_SECRET, signature)) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature',
          },
        },
        401
      )
    }

    const body = await c.req.json()
    const { event: eventType, doc, collection } = body

    // Convert Payload webhook to platform event
    const event: Event = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: `payload.${collection}.${eventType}`,
      source: 'payload_cms',
      accountId: doc.accountId || 'system',
      data: {
        collection,
        eventType,
        document: doc,
      },
      metadata: {
        correlationId: doc.id,
      },
    }

    // Ingest the event
    await storeEvent(event, c.env)
    await c.env.EVENT_QUEUE.send(event)

    return c.json<ApiResponse>({
      success: true,
      data: { eventId: event.id },
    })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: error.message,
          details: error,
        },
      },
      400
    )
  }
})

// ============================================================================
// Queue Consumer (Pattern Matching Trigger)
// ============================================================================

export async function handleEventQueue(batch: MessageBatch<Event>, env: Env) {
  for (const message of batch.messages) {
    try {
      const event = message.body

      // Check event against all active patterns
      const matchedPatterns = await checkPatterns(event, env)

      // Trigger workflows for matched patterns
      for (const pattern of matchedPatterns) {
        await triggerWorkflow(pattern.workflowId, event, env)

        // Update pattern statistics
        await updatePatternStats(pattern.id, env)

        // Track metric
        await trackMetric(env, {
          timestamp: Date.now(),
          accountId: event.accountId,
          metricType: 'pattern_matched',
          value: 1,
          metadata: { patternId: pattern.id, workflowId: pattern.workflowId },
        })
      }

      message.ack()
    } catch (error) {
      console.error('Event processing error:', error)
      message.retry()
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function validateAndEnrichEvent(data: any, env: Env, req: Request): Promise<Event> {
  // Parse and validate
  const event = EventSchema.parse({
    id: data.id || crypto.randomUUID(),
    timestamp: data.timestamp || Date.now(),
    type: data.type,
    source: data.source,
    accountId: data.accountId,
    userId: data.userId,
    sessionId: data.sessionId,
    data: data.data || {},
    metadata: {
      ip: req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      referrer: req.headers.get('referer') || undefined,
      correlationId: data.metadata?.correlationId,
    },
  })

  return event
}

async function storeEvent(event: Event, env: Env) {
  // Write to Analytics Engine
  env.EVENTS.writeDataPoint({
    blobs: [event.id, event.type, event.source, event.accountId, event.userId || '', event.sessionId || ''],
    doubles: [event.timestamp],
    indexes: [event.accountId], // For efficient querying
  })
}

async function queryAnalyticsEngine(env: Env, query: string, accountId: string): Promise<any> {
  // Use Analytics Engine SQL API
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ANALYTICS_TOKEN}/analytics_engine/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.ANALYTICS_TOKEN}`,
    },
    body: JSON.stringify({
      query: query,
      dataset: 'automation_events',
    }),
  })

  if (!response.ok) {
    throw new Error(`Analytics query failed: ${response.statusText}`)
  }

  return await response.json()
}

async function checkPatterns(event: Event, env: Env): Promise<any[]> {
  // Get all active patterns for this account
  const patterns = await env.DB.prepare('SELECT * FROM patterns WHERE accountId = ? AND enabled = 1').bind(event.accountId).all()

  const matched: any[] = []

  for (const pattern of patterns.results || []) {
    const patternConfig = JSON.parse(pattern.pattern as string)

    // Check pattern type
    if (patternConfig.type === 'event') {
      // Simple event matching
      if (event.type === patternConfig.eventType) {
        // Check conditions
        if (!patternConfig.conditions || matchesConditions(event.data, patternConfig.conditions)) {
          matched.push(pattern)
        }
      }
    } else if (patternConfig.type === 'sql') {
      // SQL-based pattern matching
      const result = await queryAnalyticsEngine(env, patternConfig.query, event.accountId)
      if (result.data && result.data.length > 0) {
        matched.push(pattern)
      }
    }
    // Add more pattern types (sequence, threshold, anomaly) as needed
  }

  return matched
}

function matchesConditions(data: Record<string, any>, conditions: Record<string, any>): boolean {
  for (const [key, value] of Object.entries(conditions)) {
    if (data[key] !== value) {
      return false
    }
  }
  return true
}

async function triggerWorkflow(workflowId: string, event: Event, env: Env) {
  // Create workflow execution
  const execution = {
    id: crypto.randomUUID(),
    workflowId,
    accountId: event.accountId,
    triggeredBy: {
      type: 'pattern' as const,
      event,
    },
    status: 'pending' as const,
    input: event.data,
    context: {
      event,
    },
    startedAt: new Date().toISOString(),
  }

  // Queue workflow execution
  await env.WORKFLOW_QUEUE.send(execution)

  // Track metric
  await trackMetric(env, {
    timestamp: Date.now(),
    accountId: event.accountId,
    metricType: 'workflow_started',
    value: 1,
    metadata: { workflowId, executionId: execution.id },
  })
}

async function updatePatternStats(patternId: string, env: Env) {
  await env.DB.prepare('UPDATE patterns SET triggeredCount = triggeredCount + 1, lastTriggered = ? WHERE id = ?')
    .bind(new Date().toISOString(), patternId)
    .run()
}

function verifyWebhookSignature(req: Request, secret: string, signature?: string | null): boolean {
  if (!signature) return false
  // Implement signature verification logic
  // This is a placeholder - use HMAC-SHA256 in production
  return true
}

async function trackMetric(env: Env, metric: { timestamp: number; accountId: string; metricType: string; value: number; metadata?: any }) {
  env.METRICS.writeDataPoint({
    blobs: [metric.accountId, metric.metricType],
    doubles: [metric.timestamp, metric.value],
    indexes: [metric.accountId],
  })
}

export default app
