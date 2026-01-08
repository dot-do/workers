# Webhook Event Handling

This document covers webhook delivery, event types, signature verification, and idempotent event processing inspired by Polar's implementation.

## Overview

Webhooks provide real-time notifications when events occur in your payments system. Instead of polling for changes, your application receives HTTP POST requests with event data.

## Webhook Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Event Source  │──────▶│  Event Queue    │──────▶│ Webhook Worker  │
│ (Stripe, etc.)  │      │  (Cloudflare)   │      │                 │
└─────────────────┘      └─────────────────┘      └────────┬────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │  Your Endpoint  │
                                                  │  /webhooks/pay  │
                                                  └─────────────────┘
```

## Event Types

### Event Naming Convention

Events follow the `resource.action` pattern:

```
subscription.created
subscription.updated
subscription.canceled
order.completed
payout.paid
```

### Complete Event List

| Category | Events |
|----------|--------|
| **Customer** | `customer.created`, `customer.updated`, `customer.deleted` |
| **Subscription** | `subscription.created`, `subscription.updated`, `subscription.canceled`, `subscription.revoked`, `subscription.trial_will_end` |
| **Order** | `order.created`, `order.completed`, `order.refunded`, `order.disputed` |
| **Invoice** | `invoice.created`, `invoice.finalized`, `invoice.payment_succeeded`, `invoice.payment_failed`, `invoice.voided` |
| **Checkout** | `checkout.created`, `checkout.completed`, `checkout.expired` |
| **Payout** | `payout.created`, `payout.paid`, `payout.failed` |
| **Transfer** | `transfer.created`, `transfer.reversed` |
| **Payment Method** | `payment_method.attached`, `payment_method.detached`, `payment_method.updated` |
| **Account** | `account.created`, `account.updated`, `account.onboarding_completed` |
| **Usage** | `usage.threshold_reached`, `usage.alert_triggered` |
| **Credits** | `credits.granted`, `credits.consumed`, `credits.expired` |

## Webhook Configuration

### Creating Webhooks

```typescript
import { payments } from 'payments.do'

// Create webhook endpoint
const webhook = await payments.webhooks.create({
  url: 'https://api.example.com/webhooks/payments',
  events: [
    'subscription.created',
    'subscription.canceled',
    'invoice.payment_failed'
  ],
  secret: 'whsec_...' // Optional, auto-generated if not provided
})

// Subscribe to all events
const allEventsWebhook = await payments.webhooks.create({
  url: 'https://api.example.com/webhooks/payments',
  events: ['*']
})
```

### Managing Webhooks

```typescript
// List webhooks
const webhooks = await payments.webhooks.list()

// Update webhook
await payments.webhooks.update(webhook.id, {
  events: ['subscription.*', 'invoice.*'],
  enabled: true
})

// Delete webhook
await payments.webhooks.delete(webhook.id)

// Rotate secret
const newSecret = await payments.webhooks.rotateSecret(webhook.id)
```

## Event Payload Structure

### Standard Event Format

```typescript
interface WebhookEvent {
  id: string              // Unique event ID: evt_123abc
  type: string            // Event type: subscription.created
  timestamp: string       // ISO 8601 timestamp
  data: object            // The affected resource
  previousAttributes?: object  // For .updated events, previous values
  metadata: {
    webhookId: string     // Which webhook received this
    deliveryAttempt: number
  }
}
```

### Example Events

**subscription.created**
```json
{
  "id": "evt_1234567890",
  "type": "subscription.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "sub_abc123",
    "customerId": "cus_xyz789",
    "productId": "prod_pro",
    "priceId": "price_monthly",
    "status": "active",
    "currentPeriodStart": "2024-01-15T00:00:00Z",
    "currentPeriodEnd": "2024-02-15T00:00:00Z",
    "trialEnd": null,
    "cancelAtPeriodEnd": false
  }
}
```

**subscription.updated**
```json
{
  "id": "evt_1234567891",
  "type": "subscription.updated",
  "timestamp": "2024-01-20T14:00:00Z",
  "data": {
    "id": "sub_abc123",
    "customerId": "cus_xyz789",
    "status": "past_due",
    "currentPeriodEnd": "2024-02-15T00:00:00Z"
  },
  "previousAttributes": {
    "status": "active"
  }
}
```

**invoice.payment_failed**
```json
{
  "id": "evt_1234567892",
  "type": "invoice.payment_failed",
  "timestamp": "2024-02-15T00:05:00Z",
  "data": {
    "id": "inv_def456",
    "customerId": "cus_xyz789",
    "subscriptionId": "sub_abc123",
    "amount": 9900,
    "currency": "usd",
    "status": "open",
    "attemptCount": 1,
    "nextRetryAt": "2024-02-18T00:00:00Z",
    "lastError": {
      "code": "card_declined",
      "message": "Your card was declined."
    }
  }
}
```

## Signature Verification

### Why Verify?

Webhook signatures ensure:
1. The event came from payments.do (not an attacker)
2. The payload wasn't modified in transit

### Signature Format

Webhooks include signature headers:

```http
POST /webhooks/payments HTTP/1.1
Content-Type: application/json
X-Webhook-ID: wh_abc123
X-Webhook-Timestamp: 1705312200
X-Webhook-Signature: v1=abc123def456...
```

### Verification Implementation

```typescript
import { createHmac, timingSafeEqual } from 'crypto'

function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  // 1. Check timestamp is recent (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000)
  const eventTime = parseInt(timestamp, 10)
  if (Math.abs(now - eventTime) > 300) { // 5 minute tolerance
    return false
  }

  // 2. Compute expected signature
  const signedPayload = `${timestamp}.${payload}`
  const expectedSig = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex')

  // 3. Compare signatures (timing-safe)
  const providedSig = signature.replace('v1=', '')
  return timingSafeEqual(
    Buffer.from(expectedSig),
    Buffer.from(providedSig)
  )
}
```

### Using the SDK

```typescript
import { payments } from 'payments.do'

export async function handleWebhook(request: Request) {
  const payload = await request.text()
  const signature = request.headers.get('X-Webhook-Signature')!
  const timestamp = request.headers.get('X-Webhook-Timestamp')!

  // SDK handles verification
  const event = payments.webhooks.verify(payload, {
    signature,
    timestamp,
    secret: process.env.WEBHOOK_SECRET!
  })

  // Process verified event
  await processEvent(event)

  return new Response('OK', { status: 200 })
}
```

## Webhook Delivery

### Retry Policy

Failed deliveries are retried with exponential backoff:

| Attempt | Delay | Cumulative Time |
|---------|-------|-----------------|
| 1 | Immediate | 0 |
| 2 | 1 minute | 1 minute |
| 3 | 5 minutes | 6 minutes |
| 4 | 30 minutes | 36 minutes |
| 5 | 2 hours | ~2.5 hours |
| 6 | 8 hours | ~10.5 hours |
| 7 | 24 hours | ~34.5 hours |

After 7 failed attempts, the webhook is marked as failed and no further retries occur.

### Success Criteria

A delivery is considered successful when:
- HTTP status code is 2xx (200-299)
- Response is received within 30 seconds

### Failure Handling

```typescript
// Webhook endpoint should return quickly
export async function handleWebhook(request: Request) {
  const event = await verifyAndParse(request)

  // Queue for async processing to respond quickly
  await env.WEBHOOK_QUEUE.send({
    eventId: event.id,
    type: event.type,
    data: event.data
  })

  // Return 200 immediately
  return new Response('OK', { status: 200 })
}

// Process asynchronously
export default {
  async queue(batch: MessageBatch<WebhookEvent>) {
    for (const message of batch.messages) {
      await processEvent(message.body)
    }
  }
}
```

## Idempotent Event Processing

### Why Idempotency Matters

Webhooks may be delivered multiple times due to:
- Network timeouts (your server received it, but we didn't get the response)
- Retries after partial failures
- System recovery after outages

### Implementing Idempotency

```typescript
// Store processed event IDs
const PROCESSED_EVENTS = new Set<string>()

async function processEvent(event: WebhookEvent) {
  // Check if already processed
  if (await hasProcessed(event.id)) {
    console.log(`Event ${event.id} already processed, skipping`)
    return
  }

  // Process the event
  try {
    await handleEvent(event)
    await markProcessed(event.id)
  } catch (error) {
    // Don't mark as processed - allow retry
    throw error
  }
}

// Using D1 for durability
async function hasProcessed(eventId: string): Promise<boolean> {
  const result = await env.DB.prepare(
    'SELECT 1 FROM processed_events WHERE event_id = ?'
  ).bind(eventId).first()
  return result !== null
}

async function markProcessed(eventId: string) {
  await env.DB.prepare(
    'INSERT INTO processed_events (event_id, processed_at) VALUES (?, ?)'
  ).bind(eventId, new Date().toISOString()).run()
}
```

### Idempotent Operations

Design your handlers to be naturally idempotent:

```typescript
// BAD: Not idempotent - creates duplicate records
async function handleSubscriptionCreated(sub: Subscription) {
  await db.insert('user_subscriptions', {
    userId: sub.customerId,
    plan: sub.priceId,
    startedAt: new Date()
  })
}

// GOOD: Idempotent - uses subscription ID as key
async function handleSubscriptionCreated(sub: Subscription) {
  await db.upsert('user_subscriptions', {
    subscriptionId: sub.id, // Natural idempotency key
    userId: sub.customerId,
    plan: sub.priceId,
    startedAt: new Date()
  })
}
```

## Event Handler Patterns

### Router Pattern

```typescript
type EventHandler = (event: WebhookEvent) => Promise<void>

const handlers: Record<string, EventHandler> = {
  'subscription.created': handleSubscriptionCreated,
  'subscription.updated': handleSubscriptionUpdated,
  'subscription.canceled': handleSubscriptionCanceled,
  'invoice.payment_failed': handlePaymentFailed,
  'invoice.payment_succeeded': handlePaymentSucceeded,
}

async function processEvent(event: WebhookEvent) {
  const handler = handlers[event.type]
  if (!handler) {
    console.log(`No handler for event type: ${event.type}`)
    return
  }
  await handler(event)
}
```

### Type-Safe Event Handling

```typescript
// Define event type discriminators
type SubscriptionEvent = WebhookEvent & {
  type: `subscription.${string}`
  data: Subscription
}

type InvoiceEvent = WebhookEvent & {
  type: `invoice.${string}`
  data: Invoice
}

// Type-safe handlers
function handleSubscriptionEvent(event: SubscriptionEvent) {
  const subscription = event.data // Typed as Subscription
  // ...
}

function handleInvoiceEvent(event: InvoiceEvent) {
  const invoice = event.data // Typed as Invoice
  // ...
}
```

### Event Filtering

```typescript
// Only process relevant status changes
async function handleSubscriptionUpdated(event: WebhookEvent) {
  const { data, previousAttributes } = event

  // Only care about status changes
  if (!previousAttributes?.status) {
    return
  }

  const statusChange = {
    from: previousAttributes.status,
    to: data.status
  }

  // Route by status transition
  if (statusChange.to === 'past_due') {
    await handleBecamePastDue(data)
  } else if (statusChange.to === 'active' && statusChange.from === 'past_due') {
    await handleRecovered(data)
  } else if (statusChange.to === 'canceled') {
    await handleCanceled(data)
  }
}
```

## Common Event Handlers

### Subscription Lifecycle

```typescript
async function handleSubscriptionCreated(event: WebhookEvent) {
  const subscription = event.data as Subscription

  // Provision access
  await provisionUserAccess(subscription.customerId, subscription.productId)

  // Send welcome email
  await sendWelcomeEmail(subscription.customerId, {
    plan: subscription.productId,
    trialEnd: subscription.trialEnd
  })

  // Track in analytics
  await analytics.track('subscription_started', {
    customerId: subscription.customerId,
    plan: subscription.productId,
    value: subscription.amount
  })
}

async function handleSubscriptionCanceled(event: WebhookEvent) {
  const subscription = event.data as Subscription

  // Schedule access revocation (at period end if cancelAtPeriodEnd)
  if (subscription.cancelAtPeriodEnd) {
    await scheduleAccessRevocation(
      subscription.customerId,
      subscription.currentPeriodEnd
    )
  } else {
    await revokeAccess(subscription.customerId)
  }

  // Request feedback
  await sendCancellationSurvey(subscription.customerId)

  // Track churn
  await analytics.track('subscription_canceled', {
    customerId: subscription.customerId,
    reason: subscription.cancellationReason,
    mrr_lost: subscription.amount
  })
}
```

### Payment Events

```typescript
async function handlePaymentSucceeded(event: WebhookEvent) {
  const invoice = event.data as Invoice

  // Send receipt
  await sendReceipt(invoice.customerId, {
    invoiceId: invoice.id,
    amount: invoice.amount,
    pdfUrl: invoice.pdfUrl
  })

  // Update internal records
  await updatePaymentStatus(invoice.subscriptionId, 'paid')
}

async function handlePaymentFailed(event: WebhookEvent) {
  const invoice = event.data as Invoice

  // Notify customer
  await sendPaymentFailedEmail(invoice.customerId, {
    amount: invoice.amount,
    error: invoice.lastError,
    updatePaymentUrl: await generateUpdatePaymentUrl(invoice.customerId),
    nextRetryAt: invoice.nextRetryAt
  })

  // Internal alerting
  if (invoice.attemptCount >= 3) {
    await alertChurnRisk(invoice.customerId, invoice.subscriptionId)
  }
}
```

### Payout Events

```typescript
async function handlePayoutPaid(event: WebhookEvent) {
  const payout = event.data as Payout

  // Notify seller
  await sendPayoutNotification(payout.accountId, {
    amount: payout.amount,
    arrivalDate: payout.arrivalDate
  })

  // Update ledger
  await updatePayoutStatus(payout.id, 'paid')
}

async function handlePayoutFailed(event: WebhookEvent) {
  const payout = event.data as Payout

  // Notify seller with instructions
  await sendPayoutFailedNotification(payout.accountId, {
    amount: payout.amount,
    error: payout.failureMessage,
    updateBankUrl: await generateBankUpdateUrl(payout.accountId)
  })

  // Internal alerting
  await alertPayoutFailure(payout.id, payout.accountId)
}
```

## Testing Webhooks

### Local Development

```typescript
// Use Cloudflare Tunnel for local testing
// wrangler tunnel --hostname dev-webhooks.example.com

// Or use the CLI
// npx payments webhook listen --forward-to localhost:8787/webhooks
```

### Test Events

```typescript
// Send test events
await payments.webhooks.sendTestEvent(webhook.id, {
  type: 'subscription.created',
  data: {
    id: 'sub_test123',
    customerId: 'cus_test456',
    status: 'active'
  }
})
```

### Webhook Logs

```typescript
// View delivery attempts
const deliveries = await payments.webhooks.deliveries(webhook.id, {
  limit: 50
})

// Each delivery includes:
// - HTTP status code
// - Response body
// - Duration
// - Retry count
```

## Implementation Checklist

### Webhook Infrastructure

- [ ] Endpoint URL accepting POST requests
- [ ] Signature verification
- [ ] Quick 2xx response (queue for async processing)
- [ ] Idempotency handling (store processed event IDs)
- [ ] Error handling and logging

### Event Handlers

- [ ] `subscription.created` - Provision access, welcome email
- [ ] `subscription.updated` - Handle status changes
- [ ] `subscription.canceled` - Revoke access, feedback request
- [ ] `subscription.trial_will_end` - Reminder email
- [ ] `invoice.payment_succeeded` - Send receipt
- [ ] `invoice.payment_failed` - Payment failure notification
- [ ] `payout.paid` - Seller notification
- [ ] `payout.failed` - Failure handling

### Monitoring

- [ ] Track delivery success rate
- [ ] Alert on repeated failures
- [ ] Log all events for debugging
- [ ] Dashboard for webhook health

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall payments architecture
- [SUBSCRIPTIONS.md](./SUBSCRIPTIONS.md) - Subscription billing
- [METERED-BILLING.md](./METERED-BILLING.md) - Usage-based billing
- [CUSTOMER-PORTAL.md](./CUSTOMER-PORTAL.md) - Self-service portal
