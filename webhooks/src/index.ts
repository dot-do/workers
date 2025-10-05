import { Hono } from 'hono'
import { protocolRouter } from '@dot-do/protocol-router'
import { WorkerEntrypoint } from 'cloudflare:workers'
import type { Env } from './types'
import { verifyStripeSignature, verifyWorkOSSignature, verifyGitHubSignature, verifyResendSignature } from './verification'
import { handleStripeWebhook } from './handlers/stripe'
import { handleWorkOSWebhook } from './handlers/workos'
import { handleGitHubWebhook, syncToGitHub } from './handlers/github'
import { handleResendWebhook } from './handlers/resend'
import { storeWebhookEvent, checkIdempotency } from './utils'
import { handleQueueMessage } from './queue'
import { resolveConflict } from './conflicts'

const app = new Hono<{ Bindings: Env }>()

// Server info at root (for backward compatibility)
app.get('/', (c) => {
  return c.json({
    service: 'webhooks',
    status: 'healthy',
    providers: ['stripe', 'workos', 'github', 'resend'],
    timestamp: new Date().toISOString(),
  })
})

// Stripe webhook handler
app.post('/stripe', async (c) => {
  const signature = c.req.header('stripe-signature')
  const rawBody = await c.req.text()

  if (!signature) {
    return c.json({ error: 'Missing stripe-signature header' }, 401)
  }

  try {
    // Verify signature
    const event = await verifyStripeSignature(rawBody, signature, c.env.STRIPE_WEBHOOK_SECRET)

    // Check idempotency
    const existing = await checkIdempotency(c.env.DB, 'stripe', event.id)
    if (existing) {
      return c.json({ already_processed: true })
    }

    // Store event
    await storeWebhookEvent(c.env.DB, {
      provider: 'stripe',
      eventId: event.id,
      eventType: event.type,
      payload: JSON.stringify(event),
      signature,
    })

    // Handle event
    const result = await handleStripeWebhook(event, c.env)

    // Mark as processed
    await c.env.DB.query({
      sql: `UPDATE webhook_events SET processed = TRUE, processed_at = NOW() WHERE provider = ? AND event_id = ?`,
      params: ['stripe', event.id],
    })

    return c.json(result)
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Webhook processing failed' }, 500)
  }
})

// WorkOS webhook handler
app.post('/workos', async (c) => {
  const signature = c.req.header('workos-signature')
  const rawBody = await c.req.text()

  if (!signature) {
    return c.json({ error: 'Missing workos-signature header' }, 401)
  }

  try {
    // Verify signature
    const event = await verifyWorkOSSignature(rawBody, signature, c.env.WORKOS_WEBHOOK_SECRET)

    // Check idempotency
    const existing = await checkIdempotency(c.env.DB, 'workos', event.id)
    if (existing) {
      return c.json({ already_processed: true })
    }

    // Store event
    await storeWebhookEvent(c.env.DB, {
      provider: 'workos',
      eventId: event.id,
      eventType: event.event,
      payload: JSON.stringify(event),
      signature,
    })

    // Handle event
    const result = await handleWorkOSWebhook(event, c.env)

    // Mark as processed
    await c.env.DB.query({
      sql: `UPDATE webhook_events SET processed = TRUE, processed_at = NOW() WHERE provider = ? AND event_id = ?`,
      params: ['workos', event.id],
    })

    return c.json(result)
  } catch (error) {
    console.error('WorkOS webhook error:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Webhook processing failed' }, 500)
  }
})

// GitHub webhook handler
app.post('/github', async (c) => {
  const signature = c.req.header('x-hub-signature-256')
  const eventType = c.req.header('x-github-event')
  const deliveryId = c.req.header('x-github-delivery')
  const rawBody = await c.req.text()

  if (!signature || !eventType || !deliveryId) {
    return c.json({ error: 'Missing required GitHub webhook headers' }, 401)
  }

  try {
    // Verify signature
    await verifyGitHubSignature(rawBody, signature, c.env.GITHUB_WEBHOOK_SECRET)

    // Parse payload
    const payload = JSON.parse(rawBody)

    // Check idempotency
    const existing = await checkIdempotency(c.env.DB, 'github', deliveryId)
    if (existing) {
      return c.json({ already_processed: true })
    }

    // Store event
    await storeWebhookEvent(c.env.DB, {
      provider: 'github',
      eventId: deliveryId,
      eventType,
      payload: rawBody,
      signature,
    })

    // Handle event
    const result = await handleGitHubWebhook(eventType, payload, c.env)

    // Mark as processed
    await c.env.DB.query({
      sql: `UPDATE webhook_events SET processed = TRUE, processed_at = NOW() WHERE provider = ? AND event_id = ?`,
      params: ['github', deliveryId],
    })

    return c.json(result)
  } catch (error) {
    console.error('GitHub webhook error:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Webhook processing failed' }, 500)
  }
})

// Resend webhook handler (uses Svix)
app.post('/resend', async (c) => {
  const rawBody = await c.req.text()
  const headers = Object.fromEntries(c.req.raw.headers)

  try {
    // Verify signature
    const event = await verifyResendSignature(rawBody, headers, c.env.RESEND_WEBHOOK_SECRET)

    // Check idempotency
    const existing = await checkIdempotency(c.env.DB, 'resend', event.id)
    if (existing) {
      return c.json({ already_processed: true })
    }

    // Store event
    await storeWebhookEvent(c.env.DB, {
      provider: 'resend',
      eventId: event.id,
      eventType: event.type,
      payload: JSON.stringify(event),
      signature: headers['svix-signature'],
    })

    // Handle event
    const result = await handleResendWebhook(event, c.env)

    // Mark as processed
    await c.env.DB.query({
      sql: `UPDATE webhook_events SET processed = TRUE, processed_at = NOW() WHERE provider = ? AND event_id = ?`,
      params: ['resend', event.id],
    })

    return c.json(result)
  } catch (error) {
    console.error('Resend webhook error:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Webhook processing failed' }, 500)
  }
})

// Management endpoints under /api/ prefix

// List webhook events (for debugging/monitoring)
app.get('/api/events', async (c) => {
  const provider = c.req.query('provider')
  const processed = c.req.query('processed')
  const limit = parseInt(c.req.query('limit') || '100')

  let sql = 'SELECT * FROM webhook_events WHERE 1=1'
  const params: any[] = []

  if (provider) {
    sql += ' AND provider = ?'
    params.push(provider)
  }

  if (processed !== undefined) {
    sql += ' AND processed = ?'
    params.push(processed === 'true')
  }

  sql += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)

  const result = await c.env.DB.query({ sql, params })

  return c.json({
    events: result.rows,
    count: result.rows.length,
  })
})

// Get webhook event by ID
app.get('/api/events/:provider/:eventId', async (c) => {
  const { provider, eventId } = c.req.param()

  const result = await c.env.DB.query({
    sql: `SELECT * FROM webhook_events WHERE provider = ? AND event_id = ?`,
    params: [provider, eventId],
  })

  if (result.rows.length === 0) {
    return c.json({ error: 'Event not found' }, 404)
  }

  return c.json(result.rows[0])
})

// Retry failed webhook
app.post('/api/events/:provider/:eventId/retry', async (c) => {
  const { provider, eventId } = c.req.param()

  const result = await c.env.DB.query({
    sql: `SELECT * FROM webhook_events WHERE provider = ? AND event_id = ?`,
    params: [provider, eventId],
  })

  if (result.rows.length === 0) {
    return c.json({ error: 'Event not found' }, 404)
  }

  const event = result.rows[0]
  const payload = JSON.parse(event.payload)

  try {
    let retryResult
    switch (provider) {
      case 'stripe':
        retryResult = await handleStripeWebhook(payload, c.env)
        break
      case 'workos':
        retryResult = await handleWorkOSWebhook(payload, c.env)
        break
      case 'github':
        retryResult = await handleGitHubWebhook(event.event_type, payload, c.env)
        break
      case 'resend':
        retryResult = await handleResendWebhook(payload, c.env)
        break
      default:
        return c.json({ error: 'Unknown provider' }, 400)
    }

    // Mark as processed
    await c.env.DB.query({
      sql: `UPDATE webhook_events SET processed = TRUE, processed_at = NOW(), error = NULL WHERE provider = ? AND event_id = ?`,
      params: [provider, eventId],
    })

    return c.json({ success: true, result: retryResult })
  } catch (error) {
    // Update error message
    await c.env.DB.query({
      sql: `UPDATE webhook_events SET error = ? WHERE provider = ? AND event_id = ?`,
      params: [error instanceof Error ? error.message : 'Unknown error', provider, eventId],
    })

    return c.json({ error: error instanceof Error ? error.message : 'Retry failed' }, 500)
  }
})

/**
 * RPC interface for service-to-service calls
 */
export class WebhooksService extends WorkerEntrypoint<Env> {
  /**
   * Sync entity to GitHub (Database → GitHub)
   */
  async syncToGitHub(options: any): Promise<any> {
    return await syncToGitHub(options, this.env)
  }

  /**
   * Resolve a sync conflict
   */
  async resolveConflict(conflictId: string, strategy: string): Promise<any> {
    return await resolveConflict(conflictId, strategy as any, this.env)
  }
}

// Wrap in protocol-router for standardized endpoints and CORS
const router = protocolRouter({
  api: app,
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    headers: ['Content-Type', 'stripe-signature', 'workos-signature', 'x-hub-signature-256', 'x-github-event', 'x-github-delivery', 'svix-signature', 'svix-id', 'svix-timestamp'],
  },
})

// Export both HTTP handler (with protocol-router) and queue handler
export default {
  fetch: router.fetch,
  queue: handleQueueMessage,
}
