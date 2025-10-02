/**
 * Events Service - Real-time event streaming and webhooks
 *
 * Features:
 * - Event publishing with database persistence
 * - Server-Sent Events (SSE) for real-time streaming
 * - Webhook registration and delivery with retries
 * - Event history and querying
 * - Analytics tracking
 */

import { WorkerEntrypoint, RpcTarget } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { EventStream } from './stream'

export { EventStream } from './stream'

// ============================================================================
// Types
// ============================================================================

export interface Env {
  DB: any // DB service binding
  EVENT_STREAM: DurableObjectNamespace<EventStream>
  WEBHOOK_QUEUE: Queue
  EVENTS_ANALYTICS: AnalyticsEngineDataset
}

export interface Event {
  id: string
  type: string // user.created, thing.created, etc.
  source: string // Service that generated the event
  payload: Record<string, any>
  timestamp: Date
  metadata?: Record<string, any>
}

export interface EventFilter {
  type?: string
  source?: string
  since?: Date
  until?: Date
  limit?: number
}

export interface Webhook {
  id: string
  url: string
  events: string[] // Event types to trigger on
  secret?: string
  active: boolean
  createdAt: Date
  lastTriggeredAt?: Date
}

export interface WebhookDelivery {
  webhookId: string
  eventId: string
  event: Event
  url: string
  secret?: string
}

// ============================================================================
// EventsService RPC Class
// ============================================================================

export class EventsService extends WorkerEntrypoint<Env> implements RpcTarget {
  /**
   * Publish an event to the event bus
   * - Stores in database
   * - Broadcasts to SSE clients
   * - Triggers webhooks
   */
  async publishEvent(event: Omit<Event, 'id' | 'timestamp'>): Promise<Event> {
    const fullEvent: Event = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event,
    }

    try {
      // Store event in database
      await this.env.DB.createThing({
        ns: 'events',
        id: fullEvent.id,
        type: 'Event',
        data: {
          eventType: fullEvent.type,
          source: fullEvent.source,
          payload: fullEvent.payload,
          metadata: fullEvent.metadata,
          timestamp: fullEvent.timestamp.toISOString(),
        },
        visibility: 'public',
      })

      // Track in analytics
      this.env.EVENTS_ANALYTICS.writeDataPoint({
        indexes: ['events'],
        blobs: [fullEvent.type, fullEvent.source],
        doubles: [Date.now()],
      })

      // Broadcast to SSE clients via Durable Object
      const eventStream = this.env.EVENT_STREAM.get(this.env.EVENT_STREAM.idFromName('global'))
      await eventStream.broadcast(fullEvent)

      // Trigger webhooks asynchronously
      await this.triggerWebhooks(fullEvent)

      return fullEvent
    } catch (error) {
      console.error('Failed to publish event:', error)
      throw new Error(`Event publishing failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Subscribe to events via SSE
   * Returns a ReadableStream that can be sent as SSE response
   */
  async subscribe(filters?: EventFilter): Promise<ReadableStream<Uint8Array>> {
    const eventStream = this.env.EVENT_STREAM.get(this.env.EVENT_STREAM.idFromName('global'))

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))

        // Subscribe to event stream
        try {
          const response = await eventStream.subscribe(filters)
          const reader = response.body?.getReader()

          if (!reader) {
            throw new Error('Failed to create reader')
          }

          // Read and forward events
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
        } catch (error) {
          console.error('SSE stream error:', error)
          controller.error(error)
        } finally {
          controller.close()
        }
      },
    })

    return stream
  }

  /**
   * Get events from database with filtering
   */
  async getEvents(filters?: EventFilter): Promise<Event[]> {
    const limit = filters?.limit || 100

    // Query events from database
    const things = await this.env.DB.listThings('events', 'Event', { limit })

    // Filter and transform
    let events: Event[] = things.map((thing: any) => ({
      id: thing.id,
      type: thing.data.eventType,
      source: thing.data.source,
      payload: thing.data.payload,
      timestamp: new Date(thing.data.timestamp),
      metadata: thing.data.metadata,
    }))

    // Apply filters
    if (filters?.type) {
      events = events.filter(e => e.type === filters.type)
    }
    if (filters?.source) {
      events = events.filter(e => e.source === filters.source)
    }
    if (filters?.since) {
      events = events.filter(e => e.timestamp >= filters.since!)
    }
    if (filters?.until) {
      events = events.filter(e => e.timestamp <= filters.until!)
    }

    return events
  }

  /**
   * Register a webhook for event notifications
   */
  async registerWebhook(url: string, events: string[], secret?: string): Promise<string> {
    const webhookId = crypto.randomUUID()

    await this.env.DB.createThing({
      ns: 'webhooks',
      id: webhookId,
      type: 'Webhook',
      data: {
        url,
        events,
        secret,
        active: true,
        createdAt: new Date().toISOString(),
      },
      visibility: 'private',
    })

    return webhookId
  }

  /**
   * Get webhook details
   */
  async getWebhook(webhookId: string): Promise<Webhook | null> {
    try {
      const thing = await this.env.DB.getThing('webhooks', webhookId)

      return {
        id: thing.id,
        url: thing.data.url,
        events: thing.data.events,
        secret: thing.data.secret,
        active: thing.data.active,
        createdAt: new Date(thing.data.createdAt),
        lastTriggeredAt: thing.data.lastTriggeredAt ? new Date(thing.data.lastTriggeredAt) : undefined,
      }
    } catch {
      return null
    }
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(webhookId: string, updates: Partial<Pick<Webhook, 'url' | 'events' | 'active'>>): Promise<void> {
    const webhook = await this.getWebhook(webhookId)
    if (!webhook) {
      throw new Error('Webhook not found')
    }

    await this.env.DB.updateThing('webhooks', webhookId, {
      data: {
        ...webhook,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    })
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.env.DB.deleteThing('webhooks', webhookId)
  }

  /**
   * List all webhooks
   */
  async listWebhooks(): Promise<Webhook[]> {
    const things = await this.env.DB.listThings('webhooks', 'Webhook')

    return things.map((thing: any) => ({
      id: thing.id,
      url: thing.data.url,
      events: thing.data.events,
      secret: thing.data.secret,
      active: thing.data.active,
      createdAt: new Date(thing.data.createdAt),
      lastTriggeredAt: thing.data.lastTriggeredAt ? new Date(thing.data.lastTriggeredAt) : undefined,
    }))
  }

  /**
   * Trigger webhooks for an event
   * Queues webhook deliveries for async processing
   */
  private async triggerWebhooks(event: Event): Promise<void> {
    const webhooks = await this.listWebhooks()

    // Find matching webhooks
    const matchingWebhooks = webhooks.filter(
      webhook => webhook.active && webhook.events.includes(event.type)
    )

    // Queue deliveries for async processing with retries
    for (const webhook of matchingWebhooks) {
      const delivery: WebhookDelivery = {
        webhookId: webhook.id,
        eventId: event.id,
        event,
        url: webhook.url,
        secret: webhook.secret,
      }

      await this.env.WEBHOOK_QUEUE.send(delivery)
    }
  }
}

// ============================================================================
// HTTP Interface
// ============================================================================

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

/**
 * GET /events/stream - Server-Sent Events endpoint
 * Subscribe to real-time events
 */
app.get('/stream', async (c) => {
  const service = new EventsService(c.env, c.executionCtx)

  // Parse filters from query params
  const filters: EventFilter = {}
  if (c.req.query('type')) filters.type = c.req.query('type')
  if (c.req.query('source')) filters.source = c.req.query('source')
  if (c.req.query('since')) filters.since = new Date(c.req.query('since')!)
  if (c.req.query('until')) filters.until = new Date(c.req.query('until')!)

  const stream = await service.subscribe(filters)

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
})

/**
 * POST /events - Publish an event
 */
app.post('/', async (c) => {
  const service = new EventsService(c.env, c.executionCtx)
  const body = await c.req.json()

  if (!body.type || !body.source || !body.payload) {
    return c.json({ error: 'Missing required fields: type, source, payload' }, 400)
  }

  const event = await service.publishEvent({
    type: body.type,
    source: body.source,
    payload: body.payload,
    metadata: body.metadata,
  })

  return c.json({ success: true, event })
})

/**
 * GET /events - Query events
 */
app.get('/', async (c) => {
  const service = new EventsService(c.env, c.executionCtx)

  const filters: EventFilter = {}
  if (c.req.query('type')) filters.type = c.req.query('type')
  if (c.req.query('source')) filters.source = c.req.query('source')
  if (c.req.query('since')) filters.since = new Date(c.req.query('since')!)
  if (c.req.query('until')) filters.until = new Date(c.req.query('until')!)
  if (c.req.query('limit')) filters.limit = parseInt(c.req.query('limit')!)

  const events = await service.getEvents(filters)

  return c.json({ events, count: events.length })
})

/**
 * POST /webhooks - Register webhook
 */
app.post('/webhooks', async (c) => {
  const service = new EventsService(c.env, c.executionCtx)
  const body = await c.req.json()

  if (!body.url || !body.events) {
    return c.json({ error: 'Missing required fields: url, events' }, 400)
  }

  const webhookId = await service.registerWebhook(body.url, body.events, body.secret)

  return c.json({ success: true, webhookId })
})

/**
 * GET /webhooks - List webhooks
 */
app.get('/webhooks', async (c) => {
  const service = new EventsService(c.env, c.executionCtx)
  const webhooks = await service.listWebhooks()

  return c.json({ webhooks })
})

/**
 * GET /webhooks/:id - Get webhook details
 */
app.get('/webhooks/:id', async (c) => {
  const service = new EventsService(c.env, c.executionCtx)
  const webhook = await service.getWebhook(c.req.param('id'))

  if (!webhook) {
    return c.json({ error: 'Webhook not found' }, 404)
  }

  return c.json({ webhook })
})

/**
 * PATCH /webhooks/:id - Update webhook
 */
app.patch('/webhooks/:id', async (c) => {
  const service = new EventsService(c.env, c.executionCtx)
  const updates = await c.req.json()

  await service.updateWebhook(c.req.param('id'), updates)

  return c.json({ success: true })
})

/**
 * DELETE /webhooks/:id - Delete webhook
 */
app.delete('/webhooks/:id', async (c) => {
  const service = new EventsService(c.env, c.executionCtx)
  await service.deleteWebhook(c.req.param('id'))

  return c.json({ success: true })
})

/**
 * Health check
 */
app.get('/health', (c) => c.json({ status: 'ok', service: 'events' }))

// ============================================================================
// Worker Exports
// ============================================================================

export default {
  fetch: app.fetch,
  queue: async (batch: MessageBatch<WebhookDelivery>, env: Env) => {
    // Process webhook deliveries from queue
    for (const message of batch.messages) {
      const delivery = message.body

      try {
        // Create webhook payload
        const payload = {
          event: delivery.event,
          deliveredAt: new Date().toISOString(),
        }

        // Sign payload if secret provided
        let signature: string | undefined
        if (delivery.secret) {
          const encoder = new TextEncoder()
          const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(delivery.secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          )
          const signatureBuffer = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(JSON.stringify(payload))
          )
          signature = Array.from(new Uint8Array(signatureBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        }

        // Send webhook
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'EventsService/1.0',
          'X-Event-ID': delivery.eventId,
          'X-Event-Type': delivery.event.type,
        }

        if (signature) {
          headers['X-Signature'] = `sha256=${signature}`
        }

        const response = await fetch(delivery.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000), // 10s timeout
        })

        if (!response.ok) {
          throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`)
        }

        // Update last triggered timestamp
        const service = new EventsService(env, {} as any)
        const webhook = await service.getWebhook(delivery.webhookId)
        if (webhook) {
          await service.updateWebhook(delivery.webhookId, {
            active: webhook.active,
          })
          await env.DB.updateThing('webhooks', delivery.webhookId, {
            data: {
              lastTriggeredAt: new Date().toISOString(),
            },
          })
        }

        // Ack message
        message.ack()
      } catch (error) {
        console.error('Webhook delivery failed:', error)
        // Message will be retried automatically due to max_retries in wrangler.toml
        message.retry()
      }
    }
  },
}
