# inngest.do

> Durable Workflows. Event-Driven. Natural Language. Edge-Native.

Inngest charges for function runs, limits concurrency, and forces you through their cloud. You define workflows in verbose configuration objects. Boilerplate everywhere.

**inngest.do** is the open-source alternative. Runs on your Cloudflare. Say what you want in plain English. Durable by default.

## AI-Native API

```typescript
import { inngest } from 'inngest.do'           // Full SDK
import { inngest } from 'inngest.do/tiny'      // Minimal client
import { inngest } from 'inngest.do/workflows' // Workflow helpers
```

Natural language for durable workflows:

```typescript
import { inngest } from 'inngest.do'

// Talk to it like a colleague
await inngest`when user signs up, send welcome email`
await inngest`process orders every 5 minutes`
await inngest`when payment fails, retry 3 times then notify support`

// Chain like sentences
const workflow = await inngest`when user signs up`
  .run('fetch user', () => fetchUser(event.data.id))
  .sleep('5 minutes')
  .run('sync to CRM', () => syncToCRM(user))

// Concurrency as methods, not config
inngest`when task runs`.concurrency(5)
inngest`when api called`.throttle(10, 'per minute')
inngest`when search typed`.debounce('500ms')
```

No queues to manage. No state machines to build. Just say what you want.

## The Problem

Inngest (the company) dominates the durable workflow space:

| What Inngest Charges | The Reality |
|---------------------|-------------|
| **Function Runs** | $0.15-0.50 per 1,000 runs |
| **Concurrency Limits** | Pay more for higher limits |
| **Step Execution** | Charged per step |
| **Cloud Lock-in** | Must use Inngest Cloud |
| **Verbose Config** | `createFunction({ id, concurrency, throttle, retries... })` |

### The Configuration Tax

Every function requires a configuration object:

```typescript
// The old way: configuration objects everywhere
inngest.createFunction(
  { id: 'sync-user', concurrency: { limit: 10 } },
  { event: 'user/created' },
  async ({ event, step }) => { ... }
)
```

You can't dictate that. Try saying "createFunction open brace id colon sync-user comma concurrency colon open brace limit colon 10..."

## The Solution

**inngest.do** reimagines workflows for humans:

```
Inngest (original)                inngest.do
-----------------------------------------------------------------
$0.15-0.50 per 1,000 runs         $0 - run your own
Concurrency limits tier-gated     Unlimited, you control
Cloud lock-in                     Your Cloudflare account
createFunction({ config })        inngest\`when user signs up\`
Step IDs required                 Steps inferred from context
Event schemas boilerplate         Natural language triggers
```

## One-Click Deploy

```bash
npx create-dotdo inngest
```

A durable workflow engine. Running on your infrastructure. Say what you want.

```typescript
import { Inngest } from 'inngest.do'

export default Inngest({
  name: 'my-app',
  domain: 'workflows.my-app.com',
})
```

## Features

### Durable Workflows

```typescript
// Define workflows naturally
const syncUser = await inngest`when user signs up`
  .run('fetch user', () => fetchUser(event.data.id))
  .sleep('5 minutes')
  .run('sync to CRM', () => syncToCRM(user))
  .run('send welcome email', () => sendEmail(user))

// AI infers step boundaries
await inngest`when order placed, validate payment, reserve inventory, notify warehouse`

// Long-running workflows just work
await inngest`when trial starts`
  .sleep('14 days')
  .run('send trial ending reminder', () => notifyTrialEnding())
```

### Step Methods

```typescript
// Run and memoize a step
await inngest`sync user data`
  .run('fetch from source', () => fetchData())
  .run('transform data', () => transform(data))
  .run('save to destination', () => save(transformed))

// Sleep naturally
await inngest`wait 1 hour then send reminder`
await inngest`pause for 30 seconds`

// Sleep until a specific time
await inngest`run on Christmas`.sleepUntil('2024-12-25')

// Wait for external events
await inngest`when order created, wait for approval up to 24 hours`

// Invoke other workflows
await inngest`process order then notify shipping`
```

### Concurrency Control

```typescript
// Limit concurrent executions
inngest`when task runs`.concurrency(5)

// Per-user concurrency
inngest`when user acts`.concurrency(1, 'per user')

// Rate limiting - reads like English
inngest`when api called`.throttle(10, 'per minute')
inngest`when email sent`.throttle(100, 'per hour')

// Debouncing
inngest`when search typed`.debounce('500ms')
inngest`when form saved`.debounce('5 seconds', 'per user')
```

### Event Triggers

```typescript
// Event triggers - just say it
await inngest`when user signs up`
await inngest`when order placed`
await inngest`when payment fails`

// Cron triggers - natural language
await inngest`every day at 9am`
await inngest`every 6 hours`
await inngest`every monday at midnight`

// Multiple triggers
await inngest`when user signs up or updates profile`
```

### Sending Events

```typescript
// Send events naturally
await inngest`user signed up: ${userId}`
await inngest`order placed: ${orderId}`

// Batch events
await inngest`
  user ${userId} signed up
  send welcome email to ${email}
`

// With idempotency
await inngest`order ${orderId} created`.idempotent()
```

### Serve with Hono

```typescript
import { Hono } from 'hono'
import { serve } from 'inngest.do/hono'

const app = new Hono()

app.all('/api/inngest', serve())

export default app
```

## Retry Policies

```typescript
// Natural language retries
inngest`process payment`.retry(5, 'exponential')
inngest`send email`.retry(3, 'max 1 hour delay')

// Or in the workflow definition
await inngest`when payment fails, retry 3 times then notify support`
```

Default retry policy:
- 3 attempts
- Exponential backoff: 1s, 2s, 4s, 8s...
- Max delay: 1 hour

## Error Handling

```typescript
// Try-catch in natural language
await inngest`when task runs`
  .run('risky operation', () => riskyOp())
  .onError('run fallback', () => fallbackOp())

// Or with explicit handling
await inngest`process data or fallback to cached version`
```

## Architecture

```
Internet --> Cloudflare Worker --> Durable Objects --> SQLite
                   |                     |                |
              Event Router          Step State        Memoization
                                   Concurrency        Durability
```

### Durable Object per Workflow

```
WorkflowDO (execution state)
  |
  +-- StepDO (step memoization)
  |     |-- SQLite: Step results
  |     +-- Retry state
  |
  +-- EventDO (subscriptions)
  |     |-- SQLite: Event matching
  |     +-- Correlation IDs
  |
  +-- ConcurrencyDO (rate limits)
        |-- SQLite: Counters
        +-- Throttle/debounce state
```

### Storage

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active workflows, step state | <10ms |
| **Warm** | R2 | Completed workflows | <100ms |
| **Cold** | R2 Archive | Historical runs | <1s |

## vs Inngest

| Feature | Inngest | inngest.do |
|---------|---------|-----------|
| **Pricing** | $0.15-0.50 per 1K runs | $0 - run your own |
| **Concurrency** | Tier-gated limits | Unlimited, you control |
| **Architecture** | Inngest Cloud | Edge-native, global |
| **API** | `createFunction({ config })` | `inngest\`when user signs up\`` |
| **Step IDs** | Required strings | Inferred from context |
| **Triggers** | Event schema objects | Natural language |
| **Data Location** | Inngest's servers | Your Cloudflare account |
| **Customization** | Limited | Code it yourself |
| **Lock-in** | Proprietary | MIT licensed |

## Use Cases

### Background Jobs

```typescript
// Process uploads in the background
await inngest`when file uploaded, resize images, generate thumbnails, update database`

// AI processes naturally
await inngest`when document uploaded, extract text, summarize, index for search`
```

### Scheduled Tasks

```typescript
// Cron jobs in plain English
await inngest`every morning at 6am, send daily digest`
await inngest`every hour, sync inventory with warehouse`
await inngest`first monday of month, generate reports`
```

### Webhooks

```typescript
// Process webhooks reliably
await inngest`when stripe payment succeeds, provision account, send receipt`
await inngest`when github push, run tests, deploy if passing`
```

### Multi-Step Workflows

```typescript
// E-commerce order flow
await inngest`when order placed`
  .run('validate payment', () => validatePayment())
  .run('reserve inventory', () => reserveInventory())
  .run('notify warehouse', () => notifyWarehouse())
  .sleep('1 hour')
  .run('send confirmation', () => sendConfirmation())

// User onboarding
await inngest`when user signs up`
  .run('create account', () => createAccount())
  .sleep('5 minutes')
  .run('send welcome email', () => sendWelcome())
  .sleep('1 day')
  .run('check if active', () => checkActivity())
  .run('send tips if inactive', () => sendTips())
```

## Promise Pipelining

Chain workflows without `Promise.all`:

```typescript
// One network round trip
const result = await inngest`process order ${orderId}`
  .run('validate', validateOrder)
  .run('charge', chargePayment)
  .run('fulfill', fulfillOrder)
  .map(item => inngest`ship ${item.id}`)
```

## Why Cloudflare?

1. **Global Edge** - Workflows run close to users
2. **No Cold Starts** - Durable Objects stay warm
3. **Unlimited Duration** - No execution timeouts
4. **Built-in Queues** - Reliable event delivery
5. **Single-Threaded DO** - No race conditions in step execution

## Why Natural Language?

### The Dictation Test

Every API should pass the dictation test: could you describe it to a voice assistant?

```typescript
// OLD: Try dictating this
inngest.createFunction(
  { id: 'sync-user', concurrency: { limit: 10 } },
  { event: 'user/created' },
  async ({ event, step }) => { ... }
)

// NEW: Natural as speech
inngest`when user created, sync to CRM with concurrency 10`
```

### Benefits

- **Onboarding** - New developers understand immediately
- **Maintenance** - Code reads like documentation
- **AI Integration** - LLMs can generate and modify workflows
- **Accessibility** - Voice coding becomes possible

## Related Domains

- **workflows.do** - Workflow orchestration
- **triggers.do** - Event triggers and webhooks
- **jobs.do** - Background job queue
- **cron.do** - Scheduled tasks

## Contributing

inngest.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/inngest.do
cd inngest.do
pnpm install
pnpm test
```

## License

MIT License

---

<p align="center">
  <strong>Workflows should read like sentences.</strong>
  <br />
  Durable. Event-driven. Natural language.
  <br /><br />
  <a href="https://inngest.do">Website</a> |
  <a href="https://docs.inngest.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/inngest.do">GitHub</a>
</p>
