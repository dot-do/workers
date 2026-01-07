# orb.do

Usage-based billing on Cloudflare Durable Objects - Metering at the edge for AI agents.

## The Problem

Usage-based billing is hard:
- High-volume event ingestion (thousands/second)
- Complex pricing models (tiered, graduated, volume)
- Real-time invoice amounts
- Sub-millisecond entitlement checks
- Proration for mid-cycle changes

Traditional billing platforms were built for centralized infrastructure. AI agents need billing that scales to millions of isolated instances.

## The Vision

Every AI agent gets their own billing meter.

```typescript
import { tom, ralph, priya } from 'agents.do'
import { Orb } from 'orb.do'

// Each agent has their own metering
const tomBilling = Orb.for(tom)
const ralphBilling = Orb.for(ralph)

// Ingest usage events
await tomBilling.meter.ingest({
  eventType: 'api_call',
  customerId: 'cust_123',
  idempotencyKey: 'req_abc',
  timestamp: Date.now(),
  properties: { endpoint: '/review', tokens: 1500 }
})

// Check entitlements in <1ms
const canAccess = await tomBilling.entitlements.hasFeature('cust_123', 'advanced_review')

// Real-time invoice amounts
const invoice = await tomBilling.invoices.preview('sub_xyz')
```

## Features

- **High-Volume Metering** - 1000+ events/sec per Durable Object
- **Flexible Pricing** - Per-unit, tiered, graduated, volume, package
- **Real-Time Invoices** - Amounts update as events stream in
- **Sub-ms Entitlements** - KV-cached feature gating at the edge
- **Proration** - Automatic mid-cycle upgrade/downgrade handling
- **Idempotency** - Built-in duplicate event detection
- **PDF Generation** - Invoice PDFs stored in R2

## Installation

```bash
npm install orb.do
# or
npm install @dotdo/orb
```

## Quick Start

### Event Ingestion

```typescript
import { Orb } from 'orb.do'

const orb = new Orb(env.ORB)

// Single event
await orb.meter.ingest({
  eventType: 'api_request',
  customerId: 'cust_123',
  idempotencyKey: crypto.randomUUID(),
  timestamp: Date.now(),
  properties: {
    model: 'gpt-4',
    tokens: 1500
  }
})

// Batch ingestion
await orb.meter.ingestBatch([
  { eventType: 'storage', customerId: 'cust_123', ... },
  { eventType: 'storage', customerId: 'cust_456', ... },
])

// Query usage
const usage = await orb.meter.getUsage('cust_123', 'tokens', {
  start: periodStart,
  end: periodEnd
})
```

### Pricing Models

```typescript
// Per-unit pricing
const perUnit = await orb.prices.create({
  productId: 'prod_api',
  type: 'metered',
  billingScheme: 'per_unit',
  unitAmount: 10, // $0.10 per unit
  meterId: 'api_calls'
})

// Tiered pricing
const tiered = await orb.prices.create({
  productId: 'prod_api',
  type: 'metered',
  billingScheme: 'tiered',
  tiers: [
    { upTo: 1000, unitAmount: 10 },      // First 1000: $0.10/unit
    { upTo: 10000, unitAmount: 8 },       // Next 9000: $0.08/unit
    { upTo: null, unitAmount: 5 }         // Beyond: $0.05/unit
  ],
  meterId: 'api_calls'
})

// Calculate price for usage
const amount = await orb.prices.calculate('price_xyz', 5000)
```

### Subscriptions

```typescript
// Create subscription
const subscription = await orb.subscriptions.create({
  customerId: 'cust_123',
  planId: 'plan_pro',
  items: [
    { priceId: 'price_base', quantity: 1 },
    { priceId: 'price_seats', quantity: 5 }
  ]
})

// Update (with proration)
await orb.subscriptions.update(subscription.id, {
  planId: 'plan_enterprise',
  prorate: true
})

// Cancel at period end
await orb.subscriptions.cancel(subscription.id, {
  atPeriodEnd: true
})
```

### Invoicing

```typescript
// Generate invoice
const invoice = await orb.invoices.create({
  customerId: 'cust_123',
  subscriptionId: 'sub_xyz'
})

// Finalize and send
await orb.invoices.finalize(invoice.id)

// Get PDF
const pdfUrl = await orb.invoices.getPdfUrl(invoice.id)
```

### Entitlements

```typescript
// Check boolean feature
const hasFeature = await orb.entitlements.hasFeature('cust_123', 'advanced_analytics')

// Check numeric limit
const limit = await orb.entitlements.getLimit('cust_123', 'api_calls')

// Check usage against limit
const usage = await orb.entitlements.checkUsage('cust_123', 'api_calls')
// { current: 8500, limit: 10000, remaining: 1500, exceeded: false }

// Hono middleware
app.use('/api/*', requireFeature('api_access'))
app.use('/api/*', checkUsageLimit('api_calls'))
```

## Architecture

```
                    +-------------------+
                    |      orb.do       |
                    | (Cloudflare Worker)|
                    +-------------------+
                            |
        +-------------------+-------------------+
        |                   |                   |
+---------------+   +---------------+   +---------------+
|   MeterDO     |   | SubscriptionDO|   |  InvoiceDO   |
|   (SQLite)    |   |   (SQLite)    |   |   (SQLite)   |
+---------------+   +---------------+   +---------------+
        |                   |                   |
        +-------------------+-------------------+
                            |
                    +---------------+
                    |  KV (Cache)   |
                    | Entitlements  |
                    +---------------+
                            |
                    +---------------+
                    |      R2       |
                    | Invoice PDFs  |
                    +---------------+
```

**Key Components:**

| Component | Storage | Purpose |
|-----------|---------|---------|
| MeterDO | SQLite | Event ingestion, aggregation |
| PricingDO | SQLite | Price definitions, calculations |
| SubscriptionDO | SQLite | Subscription state, proration |
| InvoiceDO | SQLite | Invoice generation, line items |
| KV | Edge Cache | Sub-ms entitlement checks |
| R2 | Object Storage | Invoice PDFs, archives |

## API Reference

### Metering

| Method | Description |
|--------|-------------|
| `meter.ingest(event)` | Ingest single usage event |
| `meter.ingestBatch(events)` | Ingest multiple events |
| `meter.getUsage(customerId, metricId, period)` | Query aggregated usage |

### Pricing

| Method | Description |
|--------|-------------|
| `prices.create(params)` | Create a price |
| `prices.get(id)` | Get price details |
| `prices.calculate(priceId, quantity)` | Calculate amount for usage |

### Subscriptions

| Method | Description |
|--------|-------------|
| `subscriptions.create(params)` | Create subscription |
| `subscriptions.get(id)` | Get subscription |
| `subscriptions.update(id, params)` | Update subscription |
| `subscriptions.cancel(id, options)` | Cancel subscription |

### Invoices

| Method | Description |
|--------|-------------|
| `invoices.create(params)` | Create draft invoice |
| `invoices.finalize(id)` | Finalize for payment |
| `invoices.pay(id)` | Mark as paid |
| `invoices.getPdfUrl(id)` | Get signed PDF URL |

### Entitlements

| Method | Description |
|--------|-------------|
| `entitlements.hasFeature(customerId, featureKey)` | Boolean check |
| `entitlements.getLimit(customerId, featureKey)` | Numeric limit |
| `entitlements.checkUsage(customerId, featureKey)` | Usage vs limit |

## The Rewrites Ecosystem

orb.do is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare Durable Objects:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| **orb.do** | Orb | Usage-based billing for AI |
| mongo.do | MongoDB | Document database for AI |
| kafka.do | Kafka | Event streaming for AI |

## The workers.do Platform

orb.do is a core service of [workers.do](https://workers.do) - the platform for building Autonomous Startups.

```typescript
import { priya, ralph, tom } from 'agents.do'
import { Orb } from 'orb.do'

// AI agents with usage-based billing
const startup = {
  product: priya,
  engineering: ralph,
  tech: tom,
}

// Track usage per agent
for (const [role, agent] of Object.entries(startup)) {
  const billing = Orb.for(agent)
  await billing.meter.ingest({
    eventType: 'agent_task',
    customerId: startup.customerId,
    idempotencyKey: `${role}-${Date.now()}`,
    timestamp: Date.now(),
    properties: { role, tokens: agent.lastTokenCount }
  })
}
```

Both kinds of workers. Working for you.

## License

MIT
