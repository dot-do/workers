# temporal.do

> Durable Workflows. Edge-Native. Zero Infrastructure. AI-First.

Temporal charges enterprises millions. Clusters, Cassandra, Elasticsearch, DevOps teams, months of setup. All to run a workflow that sends an email, waits a week, and follows up.

**temporal.do** is the open-source alternative. Deploys in seconds. Runs on Cloudflare. Natural language workflows that read like business logic.

## AI-Native API

```typescript
import { temporal } from 'temporal.do'           // Full SDK
import { temporal } from 'temporal.do/tiny'      // Minimal client
import { temporal } from 'temporal.do/durable'   // Durable-only operations
```

Natural language for durable workflows:

```typescript
import { temporal } from 'temporal.do'

// Talk to it like you're dictating
await temporal`onboard ${user.email}`
  .send(`Welcome! Thanks for joining`)
  .wait('7 days')
  .notify(`How are things?`)

// Approvals that wait forever
await temporal`request approval for ${request}`
  .waitFor('approval')
  .then(a => a.approved ? temporal`process ${request}` : temporal`reject ${request}`)

// Schedules read like calendar entries
await temporal`run daily at 9am: generate sales report`
```

## The Problem

Traditional Temporal requires:

| What Temporal Needs | The Reality |
|---------------------|-------------|
| **Temporal Server** | Complex multi-service cluster |
| **Cassandra/MySQL** | Production database ops |
| **Elasticsearch** | Another cluster to manage |
| **Networking** | Service mesh complexity |
| **DevOps Team** | $150k/year minimum |
| **Time to Production** | 47 hours (optimistic) |

Every hour debugging infrastructure is an hour not building your product. Every $500/month on servers is runway burned.

## The Solution

```
Traditional Temporal              temporal.do
-----------------------------------------------------------------
47 hours to production            47 seconds
$500/month infrastructure         $0 (included)
3+ services to manage             0 services
Cassandra expertise required      Just TypeScript
DevOps team needed                Solo founder ready
Complex Worker setup              One line deploys
```

## One-Click Deploy

```bash
npx create-dotdo temporal
```

A durable workflow engine. Running on infrastructure you control. Natural language from day one.

```typescript
import { Temporal } from 'temporal.do'

export default Temporal({
  name: 'my-startup',
  domain: 'workflows.my-startup.com',
})
```

## Features

### Order Processing

```typescript
// Just say what you want
await temporal`process order ${orderId}`

// AI infers the workflow
await temporal`process order ${orderId}`
  .validate()
  .charge()
  .ship()
  .notify()

// Or chain explicitly
await temporal`validate order ${order}`
  .map(validated => temporal`charge ${validated.payment}`)
  .map(charged => temporal`ship ${charged.items}`)
  .map(shipped => temporal`email tracking to ${order.customer}`)
```

### User Onboarding

```typescript
// The canonical example - one readable chain
await temporal`create account for ${email}`
  .send(`Welcome! Thanks for joining`)
  .wait('7 days')
  .send(`How are things going?`)
  .check('completed onboarding')
  .then(done => done
    ? temporal`mark ${email} as active`
    : temporal`escalate ${email} to sales`)
```

### Approvals

```typescript
// Wait for human input, forever if needed
await temporal`request budget approval for ${expense}`
  .waitFor('approval', { timeout: '48h' })
  .then(result => result?.approved
    ? temporal`reimburse ${expense}`
    : temporal`notify ${expense.submitter} of rejection`)

// Multi-level approvals
await temporal`purchase request ${request}`
  .waitFor('manager approval')
  .waitFor('finance approval')
  .waitFor('legal approval')
  .process()
```

### Scheduled Jobs

```typescript
// Cron in plain English
await temporal`run daily at 9am: generate sales report`
await temporal`run weekly on Monday: sync CRM data`
await temporal`run monthly on the 1st: process billing`

// Intervals
await temporal`run every 5 minutes: check queue depth`
await temporal`run hourly: aggregate metrics`
```

### Compensation (Sagas)

```typescript
// When things go wrong, undo gracefully
await temporal`book trip ${booking}`
  .reserve('flight')
  .reserve('hotel')
  .reserve('car')
  .onFailure(step => temporal`cancel ${step}`)

// AI handles compensation automatically
await temporal`order ${order} with compensation`
```

### Long-Running Workflows

```typescript
// Workflows that span days, weeks, months
await temporal`subscription lifecycle for ${customer}`
  .onStart(() => temporal`provision ${customer}`)
  .onRenewal(() => temporal`charge ${customer}`)
  .onCancel(() => temporal`offboard ${customer}`)

// Insurance claims that take months
await temporal`process claim ${claimId}`
  .waitFor('documentation')
  .waitFor('adjuster review')
  .waitFor('approval')
  .payout()
```

## Promise Pipelining

Chain workflows without `Promise.all`. One network round trip:

```typescript
// All of this is ONE network request
const result = await temporal`validate order ${order}`
  .map(validated => temporal`charge ${validated.payment}`)
  .map(charged => temporal`ship ${charged.items}`)
  .map(shipped => temporal`email tracking to ${order.customer}`)

// Branching logic
const support = await temporal`customer ticket ${ticket}`
  .map(t => priya`triage: ${t.description}`)
  .map(priority => priority === 'urgent'
    ? temporal`page on-call with ${ticket}`
    : temporal`queue ${ticket} for next business day`)
```

## Agent Integration

Ask Ralph to build your workflows:

```typescript
import { ralph, tom, priya } from 'agents.do'

ralph`implement order processing with retries and compensation`
tom`review the workflow for failure handling edge cases`
priya`add monitoring for workflow SLA violations`
```

Workflows can invoke agents:

```typescript
await temporal`support ticket ${ticket}`
  .map(t => priya`triage: ${t.description}`)
  .map(priority => priority === 'urgent'
    ? temporal`page on-call`
    : temporal`queue for next business day`)
```

## Signals and Queries

```typescript
// Query any workflow's state
const status = await temporal`order ${orderId}`.query('status')

// Send signals to running workflows
await temporal`order ${orderId}`.signal('approval', { approved: true })

// Wait for signals in workflows
await temporal`process refund ${refundId}`
  .waitFor('customer confirmation')
  .then(() => temporal`issue refund`)
```

## Child Workflows

```typescript
// Compose workflows naturally
await temporal`fulfill order ${orderId}`
  .spawn(temporal`process payment ${payment}`)
  .spawn(temporal`reserve inventory ${items}`)
  .spawn(temporal`schedule shipping ${address}`)
  .join()  // wait for all

// Or let AI compose them
await temporal`fulfill order ${orderId} with parallel payment and shipping`
```

## Why temporal.do?

| Feature | Traditional Temporal | temporal.do |
|---------|---------------------|-------------|
| **Time to Production** | 47 hours | 47 seconds |
| **Infrastructure** | Temporal + Cassandra + Elasticsearch | Zero |
| **Monthly Cost** | $500+ (servers) | $0 (included) |
| **Deployment** | Multi-service cluster | One line |
| **Expertise Required** | DevOps team | Just TypeScript |
| **Cold Starts** | Yes | No (Durable Objects) |
| **Global Distribution** | Complex | Automatic (Edge) |

## Architecture

### Durable Object per Workflow

```
WorkflowEngineDO (routing, scheduling)
  |
  +-- WorkflowDO (execution state per workflow)
  |     |-- SQLite: Event history, state snapshots
  |     +-- Alarm: Timer management
  |
  +-- ActivityDO (retry isolation per activity)
  |     |-- SQLite: Attempt tracking
  |     +-- Queues: Task dispatch
  |
  +-- SchedulerDO (cron, intervals)
        |-- SQLite: Schedule definitions
        +-- Alarms: Next execution times
```

**Key insight**: Durable Objects provide single-threaded, strongly consistent state per workflow execution. Each workflow gets its own DO for deterministic execution. Activities run in separate DOs with retry isolation.

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active workflows, recent history | <10ms |
| **Warm** | R2 + SQLite Index | Completed workflows (30 days) | <100ms |
| **Cold** | R2 Archive | Compliance retention (years) | <1s |

## Retry Policies

```typescript
// Automatic retries with sensible defaults
await temporal`charge customer ${customerId}`
  .retry({ max: 10, backoff: 'exponential' })

// Or specify inline
await temporal`risky operation ${data}`
  .retry({ max: 5, interval: '1s', maxInterval: '1h' })

// Non-retryable errors
await temporal`validate input ${data}`
  .noRetry(['ValidationError', 'AuthError'])
```

Default policy: exponential backoff, 1s initial, 2x coefficient, unlimited attempts.

## MCP Tools

```typescript
// AI agents can manage workflows directly
await mcp`start order workflow for ${orderId}`
await mcp`what's the status of order ${orderId}?`
await mcp`approve order ${orderId}`
await mcp`list running workflows`

// Or use structured tools
await mcp.invoke('temporal.start', { workflow: 'order', args: [orderId] })
await mcp.invoke('temporal.query', { workflowId: orderId, query: 'status' })
await mcp.invoke('temporal.signal', { workflowId: orderId, signal: 'approve' })
```

## vs Traditional Temporal

```bash
# Before - Traditional Temporal
docker-compose up temporal cassandra elasticsearch
# 47 hours of configuration, debugging, and prayer
# $500/month minimum for servers
# DevOps team on call

# After - temporal.do
npm install temporal.do
# Ship your product
# $0 infrastructure
# Sleep well
```

## The Rewrites Ecosystem

temporal.do is part of the rewrites family - popular infrastructure reimplemented on Cloudflare:

| Rewrite | Replaces | Purpose |
|---------|----------|---------|
| **temporal.do** | Temporal | Durable workflows |
| [inngest.do](https://inngest.do) | Inngest | Event-driven functions |
| [kafka.do](https://kafka.do) | Kafka | Event streaming |
| [nats.do](https://nats.do) | NATS | Messaging |
| [fsx.do](https://fsx.do) | fs | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |

## Why Cloudflare?

1. **Global Edge** - Workflows run close to users
2. **No Cold Starts** - Durable Objects stay warm
3. **Unlimited Duration** - No execution timeouts
4. **Built-in Queues** - Reliable task dispatch
5. **Single-Threaded DO** - No race conditions
6. **SQLite + R2** - Infinite retention

## Roadmap

### Core Workflows
- [x] Natural Language Workflows
- [x] Promise Pipelining
- [x] Activity Retry with Backoff
- [x] Timers and Sleep
- [x] Signals and Queries
- [x] Child Workflows
- [x] Cron Scheduling
- [ ] Workflow Versioning
- [ ] Continue-as-new

### Durability
- [x] Event History
- [x] Replay Recovery
- [x] Activity Heartbeats
- [ ] Sticky Execution
- [ ] Search Attributes

### Observability
- [x] Workflow Status
- [x] Activity Tracking
- [ ] OpenTelemetry Export
- [ ] Metrics Dashboard
- [ ] Workflow Visualization

## Contributing

temporal.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/temporal.do
cd temporal.do
pnpm install
pnpm test
```

## License

MIT

---

<p align="center">
  <strong>47 seconds beats 47 hours.</strong>
  <br />
  Durable workflows. Zero infrastructure. Natural language.
  <br /><br />
  <a href="https://temporal.do">Website</a> |
  <a href="https://docs.temporal.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/temporal.do">GitHub</a>
</p>
