# temporal.do

Durable workflows for startup founders. No servers. No Cassandra. Just code.

## The Problem

You're building a startup. You need durable workflows:
- Send a welcome email, wait 7 days, send a follow-up
- Process an order with payment, inventory, and shipping
- Onboard a customer with approval gates and retries

Traditional Temporal requires:
- Running Temporal server clusters
- Managing Cassandra or MySQL persistence
- Operating Elasticsearch for visibility
- Complex networking and service mesh
- **47 hours to production** (and a DevOps engineer you don't have)

**Every hour debugging infrastructure is an hour not building your product.**
**Every $500/month on servers is runway burned.**

## The Vision

Durable workflows in 47 seconds.

```typescript
import { temporal } from '@dotdo/temporal'

temporal`process order ${order} with payment and shipping`
temporal`onboard ${user.email} with welcome email, wait 7 days, then follow up`
temporal`run daily at 9am: generate sales report`
```

Natural language. Tagged templates. Workflows as conversations.

## Promise Pipelining

Chain workflows without `Promise.all`. One network round trip:

```typescript
const result = await temporal`validate order ${order}`
  .map(validated => temporal`charge ${validated.payment}`)
  .map(charged => temporal`ship ${charged.items}`)
  .map(shipped => temporal`email tracking to ${order.customer}`)
// One network round trip!
```

Compose complex business processes:

```typescript
const onboarding = await temporal`create account for ${email}`
  .map(account => temporal`send welcome email to ${account.email}`)
  .map(() => temporal`wait 7 days`)
  .map(() => temporal`send follow-up to ${email}`)
  .map(() => temporal`check if ${email} completed onboarding`)
  .map(status => status.completed
    ? temporal`mark ${email} as active`
    : temporal`escalate ${email} to sales`)
```

## Agent Integration

Ask Ralph to build your workflows:

```typescript
import { ralph, tom, priya } from 'agents.do'

ralph`implement an order processing workflow with retries and compensation`
tom`review the workflow for failure handling edge cases`
priya`add monitoring for workflow SLA violations`
```

Workflows can invoke agents:

```typescript
const support = await temporal`customer ${customer.id} submitted ticket ${ticket}`
  .map(ticket => priya`triage support ticket: ${ticket.description}`)
  .map(priority => priority === 'urgent'
    ? temporal`page on-call with ${ticket}`
    : temporal`queue ${ticket} for next business day`)
```

## The Transformation

| Before (Traditional) | After (temporal.do) |
|---------------------|---------------------|
| 47 hours to production | 47 seconds |
| $500/month infrastructure | $0 (included) |
| 3 services to manage | 0 services |
| Cassandra expertise required | Just TypeScript |
| DevOps team needed | Solo founder ready |

```bash
# Before
docker-compose up temporal cassandra elasticsearch
# 47 hours of configuration, debugging, and prayer

# After
npm install @dotdo/temporal
# Ship your product
```

## For Temporal Users (Familiar API)

Already know Temporal? Use the structured API:

```typescript
import { Temporal } from '@dotdo/temporal'

const temporal = new Temporal({ namespace: 'my-app' })

// Define a workflow
const orderWorkflow = temporal.defineWorkflow(
  'order-workflow',
  async (ctx, order: Order) => {
    // Each activity is retried automatically
    const validated = await ctx.activity('validate-order', () =>
      validateOrder(order)
    )

    // Timers without blocking workers
    await ctx.sleep('wait-for-payment', '5m')

    // Wait for external signals
    const approval = await ctx.waitForSignal('approval', { timeout: '24h' })

    // Execute child workflow
    const shipping = await ctx.executeChild(shippingWorkflow, validated)

    return { orderId: order.id, status: 'completed', shipping }
  }
)

// Start workflow execution
const handle = await temporal.startWorkflow(orderWorkflow, {
  workflowId: `order-${orderId}`,
  args: [orderData]
})

// Query workflow state
const status = await handle.query('status')

// Send signals
await handle.signal('approval', { approved: true })
```

No servers to manage. No databases to operate. Just durable workflows that work.

## Features

- **Natural Language Workflows** - Define business logic in plain English
- **Promise Pipelining** - Chain workflows with `.map()` in one round trip
- **Activity Execution** - Automatic retries with exponential backoff
- **Signals and Queries** - Real-time workflow interaction
- **Child Workflows** - Compose workflows hierarchically
- **Timers and Scheduling** - Sleep, cron schedules, delayed execution
- **Event History Replay** - Deterministic replay for failure recovery
- **TypeScript First** - Full type safety matching Temporal SDK patterns
- **Edge Native** - Runs on Cloudflare's global network

## Architecture

```
                    +----------------------+
                    |    temporal.do       |
                    |  (Cloudflare Worker) |
                    +----------------------+
                              |
              +---------------+---------------+---------------+
              |               |               |               |
    +------------------+ +------------------+ +------------------+ +------------------+
    |   WorkflowDO     | |   ActivityDO     | |    TimerDO       | |   HistoryDO      |
    | (execution state)| | (retry/timeout)  | | (schedules)      | | (event sourcing) |
    +------------------+ +------------------+ +------------------+ +------------------+
              |               |               |               |
              +---------------+---------------+---------------+
                              |
                    +-------------------+
                    |  Cloudflare Queues |
                    |  (task dispatch)   |
                    +-------------------+
                              |
                    +-------------------+
                    |   fsx.do / gitx.do |
                    |  (AI-native state) |
                    +-------------------+
```

**Key insight**: Durable Objects provide single-threaded, strongly consistent state per workflow execution. Each workflow gets its own WorkflowDO for deterministic execution. Activities run in separate ActivityDOs with retry isolation. Event history enables replay for recovery.

## Installation

```bash
npm install @dotdo/temporal
```

## Quick Start

### Tagged Template Style (Recommended)

```typescript
import { temporal } from '@dotdo/temporal'

// Simple workflow
await temporal`send welcome email to ${user.email}`

// With timing
await temporal`wait 7 days then send follow-up to ${user.email}`

// With conditions
await temporal`
  if ${user.plan} is premium
  then schedule onboarding call
  else send self-service guide
`

// Scheduled
await temporal`run daily at 9am: generate sales report and email to ${team}`
```

### Define Activities

```typescript
import { Temporal } from '@dotdo/temporal'

const temporal = new Temporal({ namespace: 'my-app' })

// Define activities with automatic retry
const activities = temporal.defineActivities({
  fetchUser: async (userId: string) => {
    return await db.users.findById(userId)
  },

  sendEmail: async (to: string, subject: string, body: string) => {
    return await emailService.send({ to, subject, body })
  },

  chargePayment: async (amount: number, customerId: string) => {
    return await stripe.charges.create({ amount, customer: customerId })
  }
})
```

### Define Workflows

```typescript
const userOnboardingWorkflow = temporal.defineWorkflow(
  'user-onboarding',
  async (ctx, userId: string) => {
    // Fetch user data (auto-retried on failure)
    const user = await ctx.activity('fetch-user', () =>
      activities.fetchUser(userId)
    )

    // Send welcome email
    await ctx.activity('send-welcome', () =>
      activities.sendEmail(user.email, 'Welcome!', 'Thanks for joining')
    )

    // Wait 7 days
    await ctx.sleep('onboarding-delay', '7d')

    // Send follow-up
    await ctx.activity('send-followup', () =>
      activities.sendEmail(user.email, 'How are things?', 'Check in message')
    )

    return { userId, status: 'onboarded' }
  }
)
```

### Start Workflows

```typescript
// Start a workflow execution
const handle = await temporal.startWorkflow(userOnboardingWorkflow, {
  workflowId: `onboard-${userId}`,
  taskQueue: 'onboarding',
  args: [userId]
})

// Get the result (waits for completion)
const result = await handle.result()

// Or get handle to existing workflow
const existing = temporal.getHandle('onboard-123')
```

### Signals and Queries

```typescript
const approvalWorkflow = temporal.defineWorkflow(
  'approval-workflow',
  async (ctx, request: ApprovalRequest) => {
    // Set up queryable state
    let status = 'pending'
    ctx.setQueryHandler('status', () => status)

    // Wait for approval signal
    const approval = await ctx.waitForSignal<{ approved: boolean }>('approval', {
      timeout: '48h'
    })

    if (!approval || !approval.approved) {
      status = 'rejected'
      return { status: 'rejected' }
    }

    status = 'approved'
    await ctx.activity('process-approval', () => processApproval(request))

    return { status: 'completed' }
  }
)

// Query workflow state
const handle = temporal.getHandle('approval-123')
const status = await handle.query('status')

// Send signal
await handle.signal('approval', { approved: true })
```

### Child Workflows

```typescript
const parentWorkflow = temporal.defineWorkflow(
  'parent-workflow',
  async (ctx, orderId: string) => {
    const order = await ctx.activity('fetch-order', () =>
      fetchOrder(orderId)
    )

    // Execute child workflows in parallel
    const [payment, shipping] = await Promise.all([
      ctx.executeChild(paymentWorkflow, {
        workflowId: `payment-${orderId}`,
        args: [order.payment]
      }),
      ctx.executeChild(shippingWorkflow, {
        workflowId: `shipping-${orderId}`,
        args: [order.shipping]
      })
    ])

    return { orderId, payment, shipping }
  }
)
```

### Scheduled Workflows

```typescript
// Run workflow on a schedule
await temporal.scheduleWorkflow(dailyReportWorkflow, {
  scheduleId: 'daily-report',
  cron: '0 9 * * *',  // Daily at 9am UTC
  args: []
})

// Or with more control
await temporal.scheduleWorkflow(cleanupWorkflow, {
  scheduleId: 'cleanup',
  interval: '1h',  // Every hour
  jitter: '5m',    // Random delay up to 5 minutes
  args: []
})
```

## Retry Policies

```typescript
const robustWorkflow = temporal.defineWorkflow(
  'robust-workflow',
  async (ctx, data: Data) => {
    // Custom retry policy for specific activity
    const result = await ctx.activity('risky-operation', () =>
      riskyOperation(data),
      {
        retry: {
          initialInterval: '1s',
          backoffCoefficient: 2,
          maximumAttempts: 10,
          maximumInterval: '1h',
          nonRetryableErrors: ['ValidationError']
        },
        startToCloseTimeout: '10m',
        heartbeatTimeout: '1m'
      }
    )

    return result
  }
)
```

Default retry policy:
- Initial interval: 1s
- Backoff coefficient: 2
- Maximum attempts: unlimited
- Maximum interval: 100s

## Worker Setup

```typescript
import { Worker } from '@dotdo/temporal'

// Create worker to process workflows and activities
const worker = new Worker({
  namespace: 'my-app',
  taskQueue: 'main',
  workflows: [orderWorkflow, userOnboardingWorkflow],
  activities
})

// Start the worker
export default {
  async fetch(request: Request, env: Env) {
    return worker.fetch(request, env)
  }
}
```

## MCP Tools Integration

temporal.do exposes MCP tools for AI-native workflow management:

```typescript
// AI can start workflows
await mcp.invoke('temporal.startWorkflow', {
  workflow: 'order-workflow',
  workflowId: 'order-123',
  args: [{ productId: 'abc', quantity: 2 }]
})

// AI can query state
const status = await mcp.invoke('temporal.query', {
  workflowId: 'order-123',
  queryType: 'status'
})

// AI can send signals
await mcp.invoke('temporal.signal', {
  workflowId: 'order-123',
  signalName: 'approval',
  args: [{ approved: true }]
})

// AI can list workflows
const workflows = await mcp.invoke('temporal.list', {
  namespace: 'my-app',
  status: 'running'
})
```

Integration with fsx.do for workflow state persistence:
```typescript
// Workflow state automatically persisted to fsx.do
await fsx.read('/.temporal/workflows/order-123/history.json')

// Version control with gitx.do
await gitx.log('/.temporal/workflows/order-123')
```

## The Rewrites Ecosystem

temporal.do is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [inngest.do](https://inngest.do) | Inngest | Event-driven workflows |
| **temporal.do** | Temporal | Durable workflow orchestration |
| [kafka.do](https://kafka.do) | Kafka | Event streaming |
| [nats.do](https://nats.do) | NATS | Messaging |

Each rewrite follows the same pattern:
- Durable Objects for state
- SQLite for persistence
- Cloudflare Queues for messaging
- Compatible API with the original

## Why Cloudflare?

1. **Global Edge** - Workflows run close to users
2. **No Cold Starts** - Durable Objects stay warm
3. **Unlimited Duration** - No execution timeouts
4. **Built-in Queues** - Reliable task dispatch
5. **Single-Threaded DO** - No race conditions in workflow execution
6. **SQLite + R2** - Event history persistence with infinite retention

## Related Domains

- **workflows.do** - Workflow orchestration
- **inngest.do** - Event-driven functions
- **jobs.do** - Background job queue
- **cron.do** - Scheduled tasks
- **triggers.do** - Event triggers

## License

MIT
