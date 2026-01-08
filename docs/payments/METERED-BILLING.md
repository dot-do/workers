# Metered (Usage-Based) Billing

This document covers usage-based billing patterns, meter management, and credit systems inspired by Polar's implementation.

## Overview

Metered billing charges customers based on actual usage rather than flat fees. Common use cases:

- **API calls** - Per-request or per-token pricing
- **Compute time** - Per-minute or per-hour billing
- **Storage** - Per-GB-month pricing
- **Seats** - Per-active-user billing
- **Events** - Per-event or per-message pricing

## Core Data Model

### Meters

```typescript
interface Meter {
  id: string
  name: string
  slug: string

  // Aggregation configuration
  aggregation: AggregationType
  aggregationKey?: string // For sum/max/min aggregations

  // Event filtering
  eventName: string
  filterKey?: string
  filterValue?: string

  // Display
  displayName: string
  unit: string // 'requests', 'tokens', 'GB', 'minutes'

  // Status
  status: 'active' | 'inactive'
  createdAt: Date
}

type AggregationType =
  | 'count'      // Count number of events
  | 'sum'        // Sum a numeric property
  | 'max'        // Maximum value in period
  | 'min'        // Minimum value in period
  | 'avg'        // Average value in period
  | 'unique'     // Count unique values
  | 'last'       // Last value in period (gauge)
```

### Meter Events

```typescript
interface MeterEvent {
  id: string
  meterId: string
  customerId: string
  timestamp: Date

  // Event data
  eventName: string
  properties: Record<string, string | number | boolean>

  // Aggregation value (extracted from properties)
  value: number

  // Idempotency
  idempotencyKey?: string

  // Processing
  processedAt: Date | null
  billingPeriodId: string | null
}
```

### Metered Prices

```typescript
interface MeteredPrice {
  id: string
  productId: string
  meterId: string

  // Pricing model
  pricingModel: 'per_unit' | 'tiered' | 'volume' | 'graduated'

  // Per-unit pricing
  unitAmount?: number
  currency: string

  // Tiered pricing
  tiers?: PriceTier[]

  // Billing
  billingScheme: 'arrears' | 'advance'
  aggregateUsage: 'sum' | 'max' | 'last'
}

interface PriceTier {
  upTo: number | 'inf'
  unitAmount?: number      // Per-unit price in this tier
  flatAmount?: number      // Flat fee for this tier
}
```

## Recording Usage

### Basic Usage Recording

```typescript
import { payments } from 'payments.do'

// Record a single usage event
await payments.usage.record('cus_123', {
  quantity: 1000,
  model: 'claude-3-opus'
})

// Record with timestamp (for batch imports)
await payments.usage.record('cus_123', {
  quantity: 500,
  action: 'image_generation',
  timestamp: new Date('2024-01-15T10:30:00Z')
})
```

### Idempotent Recording

```typescript
// Use idempotency key to prevent duplicates
await payments.usage.record('cus_123', {
  quantity: 1000,
  model: 'claude-3-opus',
  idempotencyKey: `request-${requestId}`
})

// Safe to retry - same key = no duplicate charge
await payments.usage.record('cus_123', {
  quantity: 1000,
  model: 'claude-3-opus',
  idempotencyKey: `request-${requestId}`
})
```

### Batch Recording

```typescript
// Record multiple events efficiently
await payments.usage.recordBatch('cus_123', [
  { quantity: 100, model: 'gpt-4', idempotencyKey: 'req-1' },
  { quantity: 200, model: 'gpt-4', idempotencyKey: 'req-2' },
  { quantity: 150, model: 'claude-3-opus', idempotencyKey: 'req-3' }
])
```

## Aggregation Strategies

### Count

Count the number of events in a billing period.

```typescript
// Meter definition
const apiCallsMeter = await payments.meters.create({
  name: 'API Calls',
  slug: 'api_calls',
  aggregation: 'count',
  eventName: 'api.request',
  unit: 'requests'
})

// Usage: Each event = 1 count
await payments.usage.record('cus_123', { eventName: 'api.request' })
await payments.usage.record('cus_123', { eventName: 'api.request' })
await payments.usage.record('cus_123', { eventName: 'api.request' })
// Total: 3 requests
```

### Sum

Sum a numeric property across all events.

```typescript
// Meter definition
const tokensMeter = await payments.meters.create({
  name: 'AI Tokens',
  slug: 'ai_tokens',
  aggregation: 'sum',
  aggregationKey: 'tokens',
  eventName: 'ai.completion',
  unit: 'tokens'
})

// Usage: Sum the 'tokens' property
await payments.usage.record('cus_123', {
  eventName: 'ai.completion',
  properties: { tokens: 1500, model: 'gpt-4' }
})
await payments.usage.record('cus_123', {
  eventName: 'ai.completion',
  properties: { tokens: 800, model: 'gpt-4' }
})
// Total: 2,300 tokens
```

### Max (High-Water Mark)

Track the maximum concurrent value in a period.

```typescript
// Meter definition
const storageMeter = await payments.meters.create({
  name: 'Storage',
  slug: 'storage_gb',
  aggregation: 'max',
  aggregationKey: 'gb_used',
  eventName: 'storage.snapshot',
  unit: 'GB'
})

// Usage: Track peak storage
await payments.usage.record('cus_123', {
  eventName: 'storage.snapshot',
  properties: { gb_used: 50 }
})
await payments.usage.record('cus_123', {
  eventName: 'storage.snapshot',
  properties: { gb_used: 75 }  // Peak
})
await payments.usage.record('cus_123', {
  eventName: 'storage.snapshot',
  properties: { gb_used: 60 }
})
// Billed: 75 GB (maximum)
```

### Unique

Count unique values of a property (e.g., active users).

```typescript
// Meter definition
const activeUsersMeter = await payments.meters.create({
  name: 'Active Users',
  slug: 'active_users',
  aggregation: 'unique',
  aggregationKey: 'user_id',
  eventName: 'user.activity',
  unit: 'users'
})

// Usage: Count unique user_ids
await payments.usage.record('cus_123', {
  eventName: 'user.activity',
  properties: { user_id: 'u1' }
})
await payments.usage.record('cus_123', {
  eventName: 'user.activity',
  properties: { user_id: 'u2' }
})
await payments.usage.record('cus_123', {
  eventName: 'user.activity',
  properties: { user_id: 'u1' }  // Duplicate
})
// Total: 2 unique users
```

### Last (Gauge)

Use the last reported value (for point-in-time metrics).

```typescript
// Meter definition
const seatsMeter = await payments.meters.create({
  name: 'Seats',
  slug: 'seats',
  aggregation: 'last',
  aggregationKey: 'seat_count',
  eventName: 'seats.updated',
  unit: 'seats'
})

// Usage: Only last value matters
await payments.usage.record('cus_123', {
  eventName: 'seats.updated',
  properties: { seat_count: 5 }
})
await payments.usage.record('cus_123', {
  eventName: 'seats.updated',
  properties: { seat_count: 8 }  // Current value
})
// Billed: 8 seats
```

## Pricing Models

### Per-Unit Pricing

Simple price per unit of usage.

```typescript
const price = await payments.prices.create({
  product: 'prod_api',
  meter: 'api_calls',
  pricingModel: 'per_unit',
  unitAmount: 1, // $0.01 per request (in cents)
  currency: 'usd'
})

// 10,000 requests = $100.00
```

### Tiered Pricing

Different rates at different usage levels.

```typescript
const price = await payments.prices.create({
  product: 'prod_api',
  meter: 'api_calls',
  pricingModel: 'tiered',
  tiers: [
    { upTo: 1000, unitAmount: 0 },      // First 1K free
    { upTo: 10000, unitAmount: 2 },     // $0.02 per request
    { upTo: 100000, unitAmount: 1 },    // $0.01 per request
    { upTo: 'inf', unitAmount: 0.5 }    // $0.005 per request
  ],
  currency: 'usd'
})
```

### Volume Pricing

Single rate based on total volume (entire usage charged at final tier rate).

```typescript
const price = await payments.prices.create({
  product: 'prod_storage',
  meter: 'storage_gb',
  pricingModel: 'volume',
  tiers: [
    { upTo: 10, unitAmount: 100 },      // $1.00/GB if <= 10GB
    { upTo: 100, unitAmount: 50 },      // $0.50/GB if <= 100GB
    { upTo: 'inf', unitAmount: 25 }     // $0.25/GB if > 100GB
  ],
  currency: 'usd'
})

// 150 GB at volume pricing = 150 × $0.25 = $37.50
// (All units charged at the tier rate for total volume)
```

### Graduated (Staircase) Pricing

Each tier applies only to usage within that tier's range.

```typescript
const price = await payments.prices.create({
  product: 'prod_api',
  meter: 'api_calls',
  pricingModel: 'graduated',
  tiers: [
    { upTo: 1000, flatAmount: 0, unitAmount: 0 },        // First 1K free
    { upTo: 10000, flatAmount: 0, unitAmount: 2 },      // Next 9K at $0.02
    { upTo: 'inf', flatAmount: 0, unitAmount: 1 }       // Rest at $0.01
  ],
  currency: 'usd'
})

// 15,000 requests at graduated pricing:
// Tier 1: 1,000 × $0.00 = $0.00
// Tier 2: 9,000 × $0.02 = $180.00
// Tier 3: 5,000 × $0.01 = $50.00
// Total: $230.00
```

## Credits System

### Credit Grants

Pre-paid usage credits that are consumed before billing.

```typescript
interface CreditGrant {
  id: string
  customerId: string

  // Grant details
  amount: number
  amountRemaining: number
  currency: string

  // Validity
  expiresAt: Date | null
  voidedAt: Date | null

  // Priority (lower = consumed first)
  priority: number

  // Metadata
  reason: string
  metadata: Record<string, string>
  createdAt: Date
}
```

### Granting Credits

```typescript
// Grant promotional credits
await payments.credits.grant('cus_123', {
  amount: 5000, // $50.00 in credits
  currency: 'usd',
  reason: 'signup_bonus',
  expiresAt: new Date('2024-12-31')
})

// Grant credits with priority
await payments.credits.grant('cus_123', {
  amount: 10000,
  currency: 'usd',
  reason: 'prepaid_purchase',
  priority: 1, // Consumed after promotional credits (priority 0)
  expiresAt: null // Never expires
})
```

### Credit Consumption

Credits are automatically consumed during invoice finalization:

```typescript
// Invoice calculation pseudocode
async function calculateInvoice(customerId: string, usage: UsageSummary) {
  const grossAmount = calculateUsageCharges(usage)

  // Get available credits (ordered by priority, then expiration)
  const credits = await getAvailableCredits(customerId, {
    orderBy: ['priority', 'expiresAt']
  })

  let remaining = grossAmount
  const creditsUsed: CreditUsage[] = []

  for (const credit of credits) {
    if (remaining <= 0) break

    const amountToUse = Math.min(credit.amountRemaining, remaining)
    creditsUsed.push({ creditId: credit.id, amount: amountToUse })
    remaining -= amountToUse
  }

  return {
    grossAmount,
    creditsApplied: grossAmount - remaining,
    netAmount: remaining,
    creditsUsed
  }
}
```

### Credit Balance

```typescript
// Get current credit balance
const balance = await payments.credits.balance('cus_123')
console.log({
  total: balance.amount,
  byType: balance.breakdown,
  expiringThisMonth: balance.expiringSoon
})

// Credit balance response
{
  amount: 7500,
  breakdown: {
    promotional: 2500,
    prepaid: 5000
  },
  expiringSoon: [
    { amount: 2500, expiresAt: '2024-02-28', reason: 'signup_bonus' }
  ]
}
```

### Credit Ledger

```typescript
// View credit transactions
const ledger = await payments.credits.ledger('cus_123', {
  limit: 50
})

// Ledger entries
[
  { type: 'grant', amount: 5000, reason: 'signup_bonus', createdAt: '2024-01-01' },
  { type: 'consumption', amount: -1500, invoiceId: 'inv_123', createdAt: '2024-01-15' },
  { type: 'grant', amount: 10000, reason: 'prepaid_purchase', createdAt: '2024-01-20' },
  { type: 'consumption', amount: -3000, invoiceId: 'inv_124', createdAt: '2024-02-01' },
  { type: 'expiration', amount: -2500, creditId: 'cre_456', createdAt: '2024-02-28' }
]
```

## Querying Usage

### Current Period Usage

```typescript
// Get usage for current billing period
const usage = await payments.usage.get('cus_123')

// Returns aggregated usage by meter
{
  period: {
    start: '2024-02-01T00:00:00Z',
    end: '2024-02-29T23:59:59Z'
  },
  meters: {
    api_calls: { value: 45000, unit: 'requests' },
    ai_tokens: { value: 2500000, unit: 'tokens' },
    storage_gb: { value: 75, unit: 'GB' }
  },
  estimatedCharges: {
    api_calls: 35000, // $350.00
    ai_tokens: 5000,  // $50.00
    storage_gb: 7500  // $75.00
  },
  totalEstimate: 47500, // $475.00
  creditsAvailable: 5000
}
```

### Historical Usage

```typescript
// Query usage for specific period
const usage = await payments.usage.get('cus_123', {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
})

// Query with meter filter
const apiUsage = await payments.usage.get('cus_123', {
  meter: 'api_calls',
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
})
```

### Usage Timeline

```typescript
// Get usage broken down by time
const timeline = await payments.usage.timeline('cus_123', {
  meter: 'api_calls',
  granularity: 'day',
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
})

// Returns daily values
[
  { date: '2024-01-01', value: 1500 },
  { date: '2024-01-02', value: 2300 },
  { date: '2024-01-03', value: 1800 },
  // ...
]
```

## Real-Time Usage Alerts

### Setting Alerts

```typescript
// Alert when approaching limits
await payments.usage.createAlert('cus_123', {
  meter: 'api_calls',
  thresholds: [
    { percent: 80, action: 'notify' },
    { percent: 100, action: 'notify' },
    { percent: 120, action: 'block' }  // Hard limit
  ]
})
```

### Webhook Events

```typescript
payments.webhooks.on('usage.threshold_reached', async (event) => {
  const { customerId, meter, threshold, currentUsage, limit } = event.data

  if (threshold.action === 'notify') {
    await sendUsageWarning(customerId, {
      meter,
      used: currentUsage,
      limit,
      percent: threshold.percent
    })
  }

  if (threshold.action === 'block') {
    // Flag account for rate limiting
    await flagAccountForLimit(customerId, meter)
  }
})
```

## Billing Calculation

### End-of-Period Invoice Generation

```typescript
// Cron job: Generate metered invoices
async function generateMeteredInvoices() {
  const subscriptions = await getSubscriptionsEndingToday()

  for (const sub of subscriptions) {
    // 1. Aggregate all usage for the period
    const usage = await aggregateUsage(sub.customerId, {
      start: sub.currentPeriodStart,
      end: sub.currentPeriodEnd
    })

    // 2. Calculate charges per meter
    const charges = await calculateCharges(usage, sub.prices)

    // 3. Apply credits
    const { netCharges, creditsUsed } = await applyCredits(
      sub.customerId,
      charges
    )

    // 4. Create invoice
    const invoice = await createInvoice({
      customerId: sub.customerId,
      subscriptionId: sub.id,
      lineItems: netCharges,
      creditsApplied: creditsUsed
    })

    // 5. Attempt payment
    await chargeInvoice(invoice.id)
  }
}
```

## Implementation with Cloudflare

### Durable Object for Real-Time Aggregation

```typescript
// Per-customer usage aggregator
export class UsageAggregator extends DurableObject {
  private cache = new Map<string, number>()

  async record(event: MeterEvent) {
    // Write to D1 for durability
    await this.ctx.storage.sql.exec(
      'INSERT INTO meter_events VALUES (?, ?, ?, ?)',
      [event.id, event.meterId, event.value, event.timestamp]
    )

    // Update in-memory aggregate for fast reads
    const key = `${event.meterId}:${this.getCurrentPeriod()}`
    const current = this.cache.get(key) ?? 0
    this.cache.set(key, current + event.value)
  }

  async getCurrentUsage(meterId: string): Promise<number> {
    const key = `${meterId}:${this.getCurrentPeriod()}`
    return this.cache.get(key) ?? await this.loadFromStorage(meterId)
  }
}
```

### Queue-Based Event Processing

```typescript
// Worker to process usage events
export default {
  async queue(batch: MessageBatch<MeterEvent>) {
    const byCustomer = groupBy(batch.messages, m => m.body.customerId)

    for (const [customerId, events] of Object.entries(byCustomer)) {
      const aggregator = env.USAGE_AGGREGATOR.get(
        env.USAGE_AGGREGATOR.idFromName(customerId)
      )

      await aggregator.recordBatch(events.map(e => e.body))
    }
  }
}
```

## Implementation Checklist

### Meter Management

- [ ] Create/update/delete meters
- [ ] Support all aggregation types
- [ ] Event filtering and validation

### Usage Recording

- [ ] Real-time event ingestion
- [ ] Idempotency handling
- [ ] Batch recording API
- [ ] Queue-based processing

### Billing Calculation

- [ ] Per-unit pricing
- [ ] Tiered pricing (all models)
- [ ] Credit application
- [ ] Invoice generation

### Credits System

- [ ] Grant credits with expiration
- [ ] Priority-based consumption
- [ ] Balance tracking
- [ ] Expiration handling

### Customer Experience

- [ ] Real-time usage dashboard
- [ ] Usage alerts and notifications
- [ ] Cost estimation
- [ ] Historical reporting

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall payments architecture
- [SUBSCRIPTIONS.md](./SUBSCRIPTIONS.md) - Subscription billing
- [WEBHOOKS.md](./WEBHOOKS.md) - Event handling patterns
- [CUSTOMER-PORTAL.md](./CUSTOMER-PORTAL.md) - Self-service portal
