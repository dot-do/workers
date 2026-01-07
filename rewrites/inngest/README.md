# inngest.do

Inngest on Cloudflare - Event-driven durable workflow execution without managing queues, infra, or state.

## The Problem

Modern applications need background jobs and workflows:
- Process webhooks reliably
- Orchestrate multi-step operations
- Handle retries and failures gracefully
- Control concurrency and rate limits

Traditional solutions require:
- Managing queue infrastructure
- Building retry logic
- Implementing state machines
- Operating distributed systems

## The Vision

Drop-in Inngest replacement running entirely on Cloudflare.

```typescript
import { Inngest } from '@dotdo/inngest'

const inngest = new Inngest({ id: 'my-app' })

// Define a function with durable steps
export const syncUser = inngest.createFunction(
  { id: 'sync-user', concurrency: { limit: 10 } },
  { event: 'user/created' },
  async ({ event, step }) => {
    // Each step is memoized - retries skip completed steps
    const user = await step.run('fetch-user', () =>
      fetchUser(event.data.id)
    )

    // Sleep without blocking workers
    await step.sleep('wait-for-propagation', '5m')

    // Continue from where we left off
    const synced = await step.run('sync-to-crm', () =>
      syncToCRM(user)
    )

    return { synced }
  }
)

// Send events to trigger functions
await inngest.send({
  name: 'user/created',
  data: { id: '123' }
})
```

No queues to manage. No state machines to build. Just functions that work.

## Features

- **Durable Steps** - `step.run()`, `step.sleep()`, `step.waitForEvent()` with memoization
- **Event-Driven** - Trigger functions via events, cron, or webhooks
- **Concurrency Control** - Limits, throttling, debouncing per function or key
- **Automatic Retries** - Exponential backoff with configurable policies
- **TypeScript First** - Full type safety matching Inngest SDK
- **Edge Native** - Runs on Cloudflare's global network

## Architecture

```
                    +----------------------+
                    |    inngest.do        |
                    |  (Cloudflare Worker) |
                    +----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    |     StepDO       | |    EventDO       | | ConcurrencyDO    |
    | (memoization)    | | (subscriptions)  | | (rate limits)    |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
                    +-------------------+
                    |  Cloudflare Queues |
                    |  (event delivery)  |
                    +-------------------+
```

**Key insight**: Durable Objects provide single-threaded, strongly consistent state. Each function execution gets its own StepDO for memoization. Event routing uses Queues for reliable delivery.

## Installation

```bash
npm install @dotdo/inngest
```

## Quick Start

### Define Functions

```typescript
import { Inngest } from '@dotdo/inngest'

const inngest = new Inngest({ id: 'my-app' })

// Simple function
const helloWorld = inngest.createFunction(
  { id: 'hello-world' },
  { event: 'test/hello' },
  async ({ event }) => {
    return { message: `Hello ${event.data.name}!` }
  }
)

// Multi-step function
const processOrder = inngest.createFunction(
  { id: 'process-order' },
  { event: 'order/created' },
  async ({ event, step }) => {
    const validated = await step.run('validate', () =>
      validateOrder(event.data.order)
    )

    const charged = await step.run('charge', () =>
      chargePayment(validated)
    )

    await step.run('notify', () =>
      sendConfirmation(charged)
    )

    return { orderId: charged.id, status: 'completed' }
  }
)
```

### Step Methods

```typescript
// Run and memoize a step
const result = await step.run('step-id', async () => {
  return await someAsyncOperation()
})

// Sleep for a duration
await step.sleep('wait-period', '1h')  // 1 hour
await step.sleep('brief-pause', '30s') // 30 seconds

// Sleep until a specific time
await step.sleepUntil('scheduled-time', new Date('2024-12-25'))

// Wait for an external event
const approval = await step.waitForEvent('wait-for-approval', {
  event: 'order/approved',
  timeout: '24h',
  match: 'data.orderId'
})

// Invoke another function
const result = await step.invoke('call-other', {
  function: otherFunction,
  data: { foo: 'bar' }
})
```

### Concurrency Control

```typescript
// Limit concurrent executions
inngest.createFunction(
  {
    id: 'limited-fn',
    concurrency: { limit: 5 }  // Max 5 parallel
  },
  { event: 'task/run' },
  handler
)

// Per-user concurrency
inngest.createFunction(
  {
    id: 'per-user-fn',
    concurrency: {
      limit: 1,
      key: 'event.data.userId'  // One per user
    }
  },
  { event: 'user/action' },
  handler
)

// Rate limiting
inngest.createFunction(
  {
    id: 'throttled-fn',
    throttle: {
      limit: 10,
      period: '1m'  // 10 per minute
    }
  },
  { event: 'api/call' },
  handler
)

// Debouncing
inngest.createFunction(
  {
    id: 'debounced-fn',
    debounce: {
      period: '5s',
      key: 'event.data.userId'
    }
  },
  { event: 'search/query' },
  handler
)
```

### Event Triggers

```typescript
// Event trigger
{ event: 'user/created' }

// Cron trigger
{ cron: '0 9 * * *' }  // Daily at 9am UTC

// Multiple triggers
[
  { event: 'user/created' },
  { event: 'user/updated' },
  { cron: '0 */6 * * *' }  // Every 6 hours
]
```

### Sending Events

```typescript
// Send a single event
await inngest.send({
  name: 'user/created',
  data: { userId: '123', email: 'user@example.com' }
})

// Send multiple events
await inngest.send([
  { name: 'user/created', data: { userId: '123' } },
  { name: 'email/send', data: { to: 'user@example.com' } }
])

// Send with idempotency key
await inngest.send({
  id: 'unique-event-id',
  name: 'order/created',
  data: { orderId: 'abc' }
})
```

### Serve with Hono

```typescript
import { Hono } from 'hono'
import { serve } from '@dotdo/inngest/hono'

const app = new Hono()

app.all('/api/inngest', serve({
  client: inngest,
  functions: [syncUser, processOrder]
}))

export default app
```

## Retry Policies

```typescript
inngest.createFunction(
  {
    id: 'retry-example',
    retries: {
      attempts: 5,
      backoff: 'exponential',
      maxDelay: '1h'
    }
  },
  { event: 'task/run' },
  handler
)
```

Default retry policy:
- 3 attempts
- Exponential backoff: 1s, 2s, 4s, 8s...
- Max delay: 1 hour

## Error Handling

```typescript
inngest.createFunction(
  { id: 'error-handling' },
  { event: 'task/run' },
  async ({ event, step }) => {
    try {
      await step.run('risky-operation', () => riskyOp())
    } catch (error) {
      // Handle or re-throw
      await step.run('fallback', () => fallbackOp())
    }
  }
)
```

## The Rewrites Ecosystem

inngest.do is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| **inngest.do** | Inngest | Workflows/Jobs for AI |
| kafka.do | Kafka | Event streaming for AI |
| nats.do | NATS | Messaging for AI |

Each rewrite follows the same pattern:
- Durable Objects for state
- SQLite for persistence
- Cloudflare Queues for messaging
- Compatible API with the original

## Why Cloudflare?

1. **Global Edge** - Functions run close to users
2. **No Cold Starts** - Durable Objects stay warm
3. **Unlimited Duration** - No execution timeouts
4. **Built-in Queues** - Reliable event delivery
5. **Single-Threaded DO** - No race conditions in step execution

## Related Domains

- **workflows.do** - Workflow orchestration
- **triggers.do** - Event triggers and webhooks
- **jobs.do** - Background job queue
- **cron.do** - Scheduled tasks

## License

MIT
