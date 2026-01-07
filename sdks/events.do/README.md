# events.do

**Ship event-driven systems in minutes. Not months.**

```bash
npm install events.do
```

---

## Event-Driven Architecture Shouldn't Require an Ops Team

You know events are the right pattern. Decoupled services. Guaranteed delivery. Real-time reactivity. It's how every modern system should work.

But implementing it means:
- Standing up Kafka, RabbitMQ, or SQS infrastructure
- Configuring dead letter queues and retry policies
- Building custom tooling to debug invisible message flows
- Managing consumer scaling and partition rebalancing
- Hoping nothing gets lost when things go wrong

**You wanted event-driven architecture. You got a full-time ops job.**

## What If Events Just Worked?

```typescript
import { events } from 'events.do'

// Publish an event
await events.publish('order.placed', {
  orderId: 'order_123',
  customerId: 'cust_456',
  total: 99.99
})

// Subscribe a webhook
await events.subscribe('order.*', 'https://my-worker.workers.do/process')

// That's it. Guaranteed delivery. Zero infrastructure.
```

**events.do** gives you:
- Guaranteed at-least-once delivery
- Wildcard pattern matching for flexible subscriptions
- Full event history with replay capability
- Built-in observability and debugging
- Automatic retries with exponential backoff

## Get Event-Driven in 3 Steps

### 1. Publish Events

```typescript
import { events } from 'events.do'

// Single event
await events.publish('user.created', {
  userId: 'user_123',
  email: 'alice@example.com'
})

// Batch for high-throughput
await events.publishBatch([
  { type: 'order.placed', data: { orderId: 'order_456' } },
  { type: 'order.paid', data: { orderId: 'order_456' } },
  { type: 'order.fulfilled', data: { orderId: 'order_456' } }
])
```

### 2. Subscribe Handlers

```typescript
// Exact match
await events.subscribe('payment.succeeded', 'https://billing.workers.do/confirm')

// Wildcard patterns for flexibility
await events.subscribe('order.*', 'https://orders.workers.do/process')
await events.subscribe('user.*.profile', 'https://analytics.workers.do/track')

// Manage subscriptions
const subscriptions = await events.subscriptions()
await events.unsubscribe('sub_789')
```

### 3. Debug and Replay

```typescript
// Replay past events (disaster recovery, new consumer catch-up)
const stream = await events.replay({
  pattern: 'order.*',
  from: new Date('2024-01-01'),
  limit: 1000
})

// Stream with cursor-based pagination
const { events: batch, cursor, hasMore } = await events.stream('user.*')

// Inspect specific events
const event = await events.get('evt_123')
console.log(`Event ${event.type} at ${event.timestamp}`)
```

## The Difference

**The Old Way:**
- 2 weeks to set up Kafka cluster
- Custom dead letter queue handling
- Invisible message failures
- Consumer lag dashboards you built yourself
- 3am pages when partitions go offline
- Events lost in the void

**The events.do Way:**
- Live in 5 minutes
- Automatic retry with DLQ
- Full event tracing and history
- Built-in observability
- Zero infrastructure to manage
- Every event accounted for

## Built for Real Systems

```typescript
import { Events, type Event, type Subscription } from 'events.do'

// Custom client configuration
const events = Events({
  apiKey: 'your_api_key'
})

// Full TypeScript support
interface OrderEvent {
  orderId: string
  total: number
  items: string[]
}

await events.publish('order.placed', {
  orderId: 'order_789',
  total: 149.99,
  items: ['SKU001', 'SKU002']
} satisfies OrderEvent)

// Production patterns
const subscription = await events.subscribe(
  'order.placed',
  'https://inventory.workers.do/reserve'
)
console.log(`Subscription active: ${subscription.status}`)
```

## Configuration

Set your API key via environment variable:

```bash
export EVENTS_API_KEY=your_api_key
```

Or configure the client directly:

```typescript
import { Events } from 'events.do'

const events = Events({
  apiKey: process.env.EVENTS_API_KEY
})
```

## Types

```typescript
interface Event {
  id: string
  type: string
  data: Record<string, unknown>
  source?: string
  timestamp: Date
}

interface Subscription {
  id: string
  pattern: string
  target: string
  status: 'active' | 'paused'
  createdAt: Date
}

interface EventStream {
  events: Event[]
  cursor?: string
  hasMore: boolean
}
```

## Stop Building Infrastructure. Start Shipping Features.

The best event-driven systems are invisible. They just work.

**Don't let messaging infrastructure slow your architecture down.**

```bash
npm install events.do
```

[Start building at events.do](https://events.do)

---

MIT License
