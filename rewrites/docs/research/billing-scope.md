# Billing Rewrite Scope: billing.do / meter.do

## Executive Summary

This document scopes a Cloudflare Workers rewrite of billing and metering functionality, combining the best patterns from leading platforms: Stripe Billing, Paddle, LemonSqueezy, Orb, Lago, and Stigg. The goal is to create a unified billing infrastructure that leverages edge computing for real-time usage metering, fast entitlement checks, and seamless integration with the workers.do ecosystem.

---

## Platform Research Summary

### 1. Stripe Billing

**Core Value Proposition**: Industry-leading subscription management with flexible pricing models, automatic proration, and the new Entitlements API for feature gating.

**Key APIs/Features**:
- **Subscription lifecycle**: Create, update, pause, cancel, resume with automatic proration
- **Usage metering**: New Meter API (replaces legacy usage records) - 1,000 events/sec standard, 10,000/sec with streams
- **Invoice generation**: Automatic with line items, prorations, and PDF rendering
- **Payment processing**: Smart Retries recovered $6.5B in 2024
- **Pricing models**: Flat, per-seat, usage-based, tiered, graduated, volume
- **Entitlements API**: Feature-to-product mapping, webhook-based provisioning

**Architecture Notes**:
- Billing Meters don't require subscriptions before reporting usage
- Idempotency keys prevent duplicate event reporting
- 35-day timestamp window for usage events
- Entitlements recommend caching in your database for performance

Sources: [Stripe Billing](https://stripe.com/billing), [Entitlements API](https://docs.stripe.com/billing/entitlements), [Meters API](https://docs.stripe.com/api/billing/meter)

---

### 2. Paddle

**Core Value Proposition**: Merchant of Record (MoR) handling all payments, tax compliance, fraud protection, and global payouts.

**Key APIs/Features**:
- **Subscription lifecycle**: Create, pause, resume, cancel with automatic renewals
- **Tax compliance**: Automatic VAT/GST calculation and remittance globally
- **Fraud protection**: Built-in chargeback handling
- **Checkout**: Hosted or embeddable with localized payment methods
- **Pricing**: 5% + $0.50 per transaction (no monthly fees)

**Architecture Notes**:
- Paddle Classic vs Paddle Billing (v2) - rebuilt from scratch
- Custom data storage on entities for integration
- Webhook-driven subscription management

Sources: [Paddle](https://www.paddle.com), [Paddle Developer Docs](https://developer.paddle.com)

---

### 3. LemonSqueezy

**Core Value Proposition**: Simple merchant of record for digital products with license key management and file hosting.

**Key APIs/Features**:
- **Products**: Variants, pay-what-you-want, subscription and one-time
- **License keys**: Automatic issuance, deactivation, re-issuance
- **File hosting**: Unlimited files per product, secure delivery
- **Webhooks**: Full webhook management API
- **API**: JSON:API spec with Bearer authentication

**Architecture Notes**:
- REST API at `api.lemonsqueezy.com/v1/`
- Product status: draft or published
- Good for indie developers and digital products

Sources: [LemonSqueezy](https://www.lemonsqueezy.com), [API Docs](https://docs.lemonsqueezy.com/api)

---

### 4. Orb

**Core Value Proposition**: Purpose-built for high-volume usage-based billing with raw event architecture and real-time pricing flexibility.

**Key APIs/Features**:
- **Event ingestion**: 1,000 events/sec standard, scales to billions/day for enterprise
- **Raw event storage**: Pricing calculated dynamically, not locked at ingestion
- **Billable metrics**: Flexible queries over raw events, auto-materialized
- **Real-time invoicing**: Amounts refresh as events stream in
- **Pricing models**: Tiered, graduated, prepaid consumption, hybrid

**Architecture Notes**:
- Events require: idempotency_key, customer identifier, timestamp
- Schema-less properties (key/value primitives)
- RevGraph stores all usage data in raw form
- Retrospective pricing changes without rewriting pipelines

Sources: [Orb](https://www.withorb.com), [Event Ingestion](https://docs.withorb.com/events-and-metrics/event-ingestion)

---

### 5. Lago

**Core Value Proposition**: Open-source billing API for metering and usage-based pricing, self-hostable with 15,000 events/sec capacity.

**Key APIs/Features**:
- **Billable metrics**: COUNT, UNIQUE_COUNT, SUM, MAX, LATEST, WEIGHTED_SUM, CUSTOM
- **Event processing**: Real-time aggregation with idempotency
- **Pricing models**: Tiers, packages, seat-based, prepaid credits, minimums
- **Payment agnostic**: Integrates with Stripe, GoCardless, or any processor
- **Invoicing**: Automatic calculation and PDF generation

**Architecture Notes**:
- AGPLv3 license, self-hosted free forever
- Expression-based unit calculations (ceil, concat, round, +, -, /, *)
- Recurring vs metered metrics (reset to 0 or persist)

Sources: [Lago](https://www.getlago.com), [GitHub](https://github.com/getlago/lago)

---

### 6. Stigg

**Core Value Proposition**: Entitlements-first platform for pricing and packaging with instant feature gating and experiment support.

**Key APIs/Features**:
- **Entitlements**: Metered and unmetered, hard and soft limits
- **Feature gating**: useBooleanEntitlement, useNumericEntitlement, useMeteredEntitlement hooks
- **Caching**: In-memory (30s polling), WebSocket real-time, persistent Redis
- **Sync**: Automatic sync to billing, CRM, CPQ, data warehouse
- **Migration**: 20M+ subscriptions/hour pipeline

**Architecture Notes**:
- Edge API with 300+ global PoPs, <100ms entitlement checks
- Sidecar service for low-latency with minimal host footprint
- Offline mode with buffered usage metering

Sources: [Stigg](https://www.stigg.io), [Local Caching](https://docs.stigg.io/docs/local-caching-and-fallback-strategy)

---

## Cloudflare Workers Rewrite Potential

### Why Edge Billing?

1. **Usage Metering**: Ingest events at the edge, aggregate in Durable Objects
2. **Entitlement Checks**: Sub-millisecond feature gating from KV cache
3. **Webhook Processing**: Instant webhook handling at global edge
4. **Invoice Generation**: Generate PDFs in Workers with R2 storage

### Edge-Native Advantages

| Capability | Traditional | Edge (Workers) |
|------------|-------------|----------------|
| Usage ingestion | Centralized, batched | Real-time, global |
| Entitlement check | API call (~100ms) | KV read (~10ms) |
| Webhook processing | Queue-based | Instant at edge |
| Event deduplication | Database lookup | DO-based state |

---

## Architecture Vision

```
billing.do / meter.do
├── metering/              # Edge usage ingestion
│   ├── ingest.ts          # High-throughput event endpoint
│   ├── aggregate.ts       # DO-based aggregation
│   └── dedup.ts           # Idempotency handling
│
├── entitlements/          # Feature gating
│   ├── cache.ts           # KV-based entitlement cache
│   ├── check.ts           # Fast boolean/numeric checks
│   └── sync.ts            # Stripe/Stigg sync
│
├── subscriptions/         # Subscription state
│   ├── durable-object/    # SubscriptionDO class
│   ├── lifecycle.ts       # Create, update, cancel
│   └── proration.ts       # Mid-cycle changes
│
├── invoicing/             # Invoice engine
│   ├── generator.ts       # Line item calculation
│   ├── pdf.ts             # PDF generation
│   └── storage.ts         # R2 invoice archive
│
├── pricing/               # Pricing models
│   ├── flat.ts            # Flat-rate pricing
│   ├── usage.ts           # Usage-based pricing
│   ├── tiered.ts          # Tiered/graduated
│   └── hybrid.ts          # Combined models
│
├── webhooks/              # Event processing
│   ├── stripe.ts          # Stripe webhook handler
│   ├── paddle.ts          # Paddle webhook handler
│   └── internal.ts        # Internal event bus
│
├── adapters/              # Payment processor adapters
│   ├── stripe.ts          # Stripe Connect
│   ├── paddle.ts          # Paddle Billing
│   └── interface.ts       # Common adapter interface
│
└── analytics/             # Revenue metrics
    ├── mrr.ts             # MRR/ARR calculations
    ├── churn.ts           # Churn analysis
    └── cohorts.ts         # Cohort analysis
```

---

## Core Components

### 1. MeterDO (Durable Object)

```typescript
// rewrites/billing/src/metering/durable-object/meter.ts

export class MeterDO extends DurableObject<Env> {
  private sql: SqlStorage

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sql = ctx.storage.sql
    this.initSchema()
  }

  private initSchema() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS events (
        idempotency_key TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        properties TEXT, -- JSON
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS aggregates (
        customer_id TEXT NOT NULL,
        metric_id TEXT NOT NULL,
        period_start INTEGER NOT NULL,
        period_end INTEGER NOT NULL,
        value REAL NOT NULL,
        PRIMARY KEY (customer_id, metric_id, period_start)
      );

      CREATE INDEX IF NOT EXISTS idx_events_customer
        ON events(customer_id, timestamp);
    `)
  }

  async ingest(event: MeterEvent): Promise<IngestResult> {
    // Idempotency check
    const existing = this.sql.exec(
      `SELECT 1 FROM events WHERE idempotency_key = ?`,
      event.idempotencyKey
    ).one()

    if (existing) {
      return { status: 'duplicate', idempotencyKey: event.idempotencyKey }
    }

    // Insert event
    this.sql.exec(`
      INSERT INTO events (idempotency_key, customer_id, event_type, timestamp, properties)
      VALUES (?, ?, ?, ?, ?)
    `, event.idempotencyKey, event.customerId, event.eventType,
       event.timestamp, JSON.stringify(event.properties))

    // Update aggregate
    await this.updateAggregate(event)

    return { status: 'ingested', idempotencyKey: event.idempotencyKey }
  }

  async getUsage(customerId: string, metricId: string, period: Period): Promise<number> {
    const result = this.sql.exec(`
      SELECT value FROM aggregates
      WHERE customer_id = ? AND metric_id = ?
        AND period_start = ? AND period_end = ?
    `, customerId, metricId, period.start, period.end).one()

    return result?.value ?? 0
  }
}
```

### 2. EntitlementCache (KV-based)

```typescript
// rewrites/billing/src/entitlements/cache.ts

export interface EntitlementCache {
  // Check if customer has boolean feature
  hasFeature(customerId: string, featureKey: string): Promise<boolean>

  // Get numeric limit for feature
  getLimit(customerId: string, featureKey: string): Promise<number | null>

  // Check metered usage against limit
  checkUsage(customerId: string, featureKey: string): Promise<{
    current: number
    limit: number
    remaining: number
    exceeded: boolean
  }>

  // Sync entitlements from Stripe/source of truth
  sync(customerId: string): Promise<void>
}

export class KVEntitlementCache implements EntitlementCache {
  constructor(private kv: KVNamespace, private meterDO: DurableObjectStub) {}

  async hasFeature(customerId: string, featureKey: string): Promise<boolean> {
    const key = `entitlement:${customerId}:${featureKey}`
    const cached = await this.kv.get(key)

    if (cached !== null) {
      return cached === 'true'
    }

    // Cache miss - sync from source
    await this.sync(customerId)
    const refreshed = await this.kv.get(key)
    return refreshed === 'true'
  }

  async getLimit(customerId: string, featureKey: string): Promise<number | null> {
    const key = `limit:${customerId}:${featureKey}`
    const cached = await this.kv.get(key)

    if (cached !== null) {
      return parseInt(cached, 10)
    }

    return null
  }

  async checkUsage(customerId: string, featureKey: string) {
    const [limit, current] = await Promise.all([
      this.getLimit(customerId, featureKey),
      this.getCurrentUsage(customerId, featureKey)
    ])

    const numLimit = limit ?? Infinity
    return {
      current,
      limit: numLimit,
      remaining: Math.max(0, numLimit - current),
      exceeded: current >= numLimit
    }
  }

  private async getCurrentUsage(customerId: string, featureKey: string): Promise<number> {
    // Query MeterDO for current period usage
    const period = this.getCurrentBillingPeriod(customerId)
    return await this.meterDO.getUsage(customerId, featureKey, period)
  }
}
```

### 3. SubscriptionDO (Durable Object)

```typescript
// rewrites/billing/src/subscriptions/durable-object/subscription.ts

export class SubscriptionDO extends DurableObject<Env> {
  private sql: SqlStorage

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sql = ctx.storage.sql
    this.initSchema()
  }

  private initSchema() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        status TEXT NOT NULL, -- active, canceled, past_due, paused
        current_period_start INTEGER NOT NULL,
        current_period_end INTEGER NOT NULL,
        cancel_at_period_end INTEGER DEFAULT 0,
        metadata TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS subscription_items (
        id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        price_id TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
      );

      CREATE TABLE IF NOT EXISTS prorations (
        id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        type TEXT NOT NULL, -- upgrade, downgrade, quantity_change
        amount INTEGER NOT NULL, -- cents
        description TEXT,
        applied_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
      );
    `)
  }

  async create(params: CreateSubscriptionParams): Promise<Subscription> {
    const id = crypto.randomUUID()
    const now = Math.floor(Date.now() / 1000)
    const periodEnd = this.calculatePeriodEnd(now, params.billingInterval)

    this.sql.exec(`
      INSERT INTO subscriptions
        (id, customer_id, plan_id, status, current_period_start, current_period_end)
      VALUES (?, ?, ?, 'active', ?, ?)
    `, id, params.customerId, params.planId, now, periodEnd)

    // Create subscription items
    for (const item of params.items) {
      this.sql.exec(`
        INSERT INTO subscription_items (id, subscription_id, price_id, quantity)
        VALUES (?, ?, ?, ?)
      `, crypto.randomUUID(), id, item.priceId, item.quantity ?? 1)
    }

    // Sync entitlements to KV
    await this.syncEntitlements(id)

    return this.get(id)!
  }

  async update(id: string, params: UpdateSubscriptionParams): Promise<Subscription> {
    const current = this.get(id)
    if (!current) throw new Error('Subscription not found')

    // Calculate proration if changing plan
    if (params.planId && params.planId !== current.planId) {
      const proration = this.calculateProration(current, params.planId)
      this.sql.exec(`
        INSERT INTO prorations (id, subscription_id, type, amount, description)
        VALUES (?, ?, ?, ?, ?)
      `, crypto.randomUUID(), id, proration.type, proration.amount, proration.description)
    }

    // Update subscription
    this.sql.exec(`
      UPDATE subscriptions
      SET plan_id = COALESCE(?, plan_id),
          status = COALESCE(?, status),
          cancel_at_period_end = COALESCE(?, cancel_at_period_end),
          updated_at = unixepoch()
      WHERE id = ?
    `, params.planId, params.status, params.cancelAtPeriodEnd ? 1 : 0, id)

    // Re-sync entitlements
    await this.syncEntitlements(id)

    return this.get(id)!
  }

  private calculateProration(current: Subscription, newPlanId: string): Proration {
    const now = Math.floor(Date.now() / 1000)
    const periodTotal = current.currentPeriodEnd - current.currentPeriodStart
    const periodRemaining = current.currentPeriodEnd - now
    const ratio = periodRemaining / periodTotal

    const currentPlan = this.getPlan(current.planId)
    const newPlan = this.getPlan(newPlanId)

    const currentProrated = Math.round(currentPlan.amount * ratio)
    const newProrated = Math.round(newPlan.amount * ratio)
    const amount = newProrated - currentProrated

    return {
      type: amount > 0 ? 'upgrade' : 'downgrade',
      amount,
      description: `Prorated ${amount > 0 ? 'charge' : 'credit'} for plan change`
    }
  }
}
```

### 4. InvoiceEngine

```typescript
// rewrites/billing/src/invoicing/generator.ts

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitAmount: number // cents
  amount: number // cents
  period?: { start: number; end: number }
}

export interface Invoice {
  id: string
  customerId: string
  subscriptionId?: string
  status: 'draft' | 'open' | 'paid' | 'void'
  currency: string
  lineItems: InvoiceLineItem[]
  subtotal: number
  tax: number
  total: number
  dueDate: number
  pdfUrl?: string
  createdAt: number
}

export class InvoiceEngine {
  constructor(
    private subscriptionDO: DurableObjectStub,
    private meterDO: DurableObjectStub,
    private pricingEngine: PricingEngine,
    private r2: R2Bucket
  ) {}

  async generateInvoice(customerId: string, subscriptionId: string): Promise<Invoice> {
    const subscription = await this.subscriptionDO.get(subscriptionId)
    if (!subscription) throw new Error('Subscription not found')

    const lineItems: InvoiceLineItem[] = []

    // Add subscription line items
    for (const item of subscription.items) {
      const price = await this.pricingEngine.getPrice(item.priceId)

      if (price.type === 'recurring') {
        lineItems.push({
          description: price.nickname || price.productName,
          quantity: item.quantity,
          unitAmount: price.unitAmount,
          amount: price.unitAmount * item.quantity,
          period: {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd
          }
        })
      } else if (price.type === 'metered') {
        const usage = await this.meterDO.getUsage(
          customerId,
          price.meterId,
          {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd
          }
        )

        const amount = await this.pricingEngine.calculateUsageAmount(
          price.id,
          usage
        )

        lineItems.push({
          description: `${price.nickname || price.productName} (${usage} units)`,
          quantity: usage,
          unitAmount: amount / usage,
          amount,
          period: {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd
          }
        })
      }
    }

    // Add prorations
    const prorations = await this.subscriptionDO.getProrations(subscriptionId)
    for (const proration of prorations) {
      if (!proration.appliedAt) {
        lineItems.push({
          description: proration.description,
          quantity: 1,
          unitAmount: proration.amount,
          amount: proration.amount
        })
      }
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
    const tax = await this.calculateTax(customerId, subtotal)

    const invoice: Invoice = {
      id: crypto.randomUUID(),
      customerId,
      subscriptionId,
      status: 'draft',
      currency: 'usd',
      lineItems,
      subtotal,
      tax,
      total: subtotal + tax,
      dueDate: subscription.currentPeriodEnd,
      createdAt: Math.floor(Date.now() / 1000)
    }

    return invoice
  }

  async generatePDF(invoice: Invoice): Promise<string> {
    const html = await this.renderInvoiceHTML(invoice)
    const pdf = await this.htmlToPDF(html)

    const key = `invoices/${invoice.customerId}/${invoice.id}.pdf`
    await this.r2.put(key, pdf, {
      httpMetadata: { contentType: 'application/pdf' }
    })

    return key
  }
}
```

### 5. PricingEngine

```typescript
// rewrites/billing/src/pricing/engine.ts

export interface Price {
  id: string
  productId: string
  type: 'one_time' | 'recurring' | 'metered'
  billingScheme: 'per_unit' | 'tiered'
  unitAmount?: number
  tiers?: PriceTier[]
  meterId?: string
  transformQuantity?: {
    divideBy: number
    round: 'up' | 'down'
  }
}

export interface PriceTier {
  upTo: number | null // null = infinity
  unitAmount?: number
  flatAmount?: number
}

export class PricingEngine {
  calculateUsageAmount(price: Price, usage: number): number {
    if (price.billingScheme === 'per_unit') {
      return this.calculatePerUnit(price, usage)
    } else {
      return this.calculateTiered(price, usage)
    }
  }

  private calculatePerUnit(price: Price, usage: number): number {
    let quantity = usage

    if (price.transformQuantity) {
      quantity = price.transformQuantity.round === 'up'
        ? Math.ceil(usage / price.transformQuantity.divideBy)
        : Math.floor(usage / price.transformQuantity.divideBy)
    }

    return quantity * (price.unitAmount ?? 0)
  }

  private calculateTiered(price: Price, usage: number): number {
    if (!price.tiers) return 0

    let total = 0
    let remaining = usage

    for (const tier of price.tiers) {
      if (remaining <= 0) break

      const tierLimit = tier.upTo ?? Infinity
      const inTier = Math.min(remaining, tierLimit)

      if (tier.flatAmount) {
        total += tier.flatAmount
      }

      if (tier.unitAmount) {
        total += inTier * tier.unitAmount
      }

      remaining -= inTier
    }

    return total
  }

  // Graduated pricing (each tier only applies to units in that tier)
  calculateGraduated(price: Price, usage: number): number {
    if (!price.tiers) return 0

    let total = 0
    let previousLimit = 0

    for (const tier of price.tiers) {
      const tierLimit = tier.upTo ?? Infinity

      if (usage <= previousLimit) break

      const inTier = Math.min(usage, tierLimit) - previousLimit

      if (tier.flatAmount && usage > previousLimit) {
        total += tier.flatAmount
      }

      if (tier.unitAmount) {
        total += inTier * tier.unitAmount
      }

      previousLimit = tierLimit
    }

    return total
  }

  // Volume pricing (tier applies to ALL units)
  calculateVolume(price: Price, usage: number): number {
    if (!price.tiers) return 0

    for (const tier of price.tiers) {
      const tierLimit = tier.upTo ?? Infinity

      if (usage <= tierLimit) {
        let total = tier.flatAmount ?? 0
        if (tier.unitAmount) {
          total += usage * tier.unitAmount
        }
        return total
      }
    }

    return 0
  }
}
```

---

## Integration Points

### Stripe Connect (Actual Payments)

```typescript
// rewrites/billing/src/adapters/stripe.ts

export class StripeAdapter implements PaymentAdapter {
  private stripe: Stripe

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey)
  }

  async createCustomer(params: CreateCustomerParams): Promise<string> {
    const customer = await this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata
    })
    return customer.id
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<string> {
    const subscription = await this.stripe.subscriptions.create({
      customer: params.customerId,
      items: params.items.map(item => ({
        price: item.priceId,
        quantity: item.quantity
      })),
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    })
    return subscription.id
  }

  async reportUsage(subscriptionItemId: string, quantity: number): Promise<void> {
    // Use new Meter API
    await this.stripe.billing.meterEvents.create({
      event_name: 'usage',
      payload: {
        stripe_customer_id: customerId,
        value: quantity.toString()
      }
    })
  }

  async chargeInvoice(invoiceId: string): Promise<void> {
    await this.stripe.invoices.pay(invoiceId)
  }
}
```

### Feature Flags (Entitlements)

```typescript
// rewrites/billing/src/entitlements/middleware.ts

export function requireFeature(featureKey: string) {
  return async (c: Context, next: Next) => {
    const customerId = c.get('customerId')
    const cache = c.get('entitlementCache') as EntitlementCache

    const hasFeature = await cache.hasFeature(customerId, featureKey)

    if (!hasFeature) {
      return c.json({
        error: 'feature_not_available',
        message: `Your plan does not include access to ${featureKey}`,
        upgradeUrl: `/billing/upgrade?feature=${featureKey}`
      }, 403)
    }

    await next()
  }
}

export function checkUsageLimit(featureKey: string) {
  return async (c: Context, next: Next) => {
    const customerId = c.get('customerId')
    const cache = c.get('entitlementCache') as EntitlementCache

    const usage = await cache.checkUsage(customerId, featureKey)

    if (usage.exceeded) {
      return c.json({
        error: 'usage_limit_exceeded',
        message: `You have exceeded your ${featureKey} limit`,
        current: usage.current,
        limit: usage.limit,
        upgradeUrl: `/billing/upgrade?feature=${featureKey}`
      }, 429)
    }

    // Add usage info to context for metering
    c.set('usageInfo', usage)

    await next()
  }
}
```

### Analytics (Revenue Metrics)

```typescript
// rewrites/billing/src/analytics/mrr.ts

export class RevenueAnalytics {
  constructor(private sql: SqlStorage) {}

  async calculateMRR(): Promise<MRRBreakdown> {
    const result = this.sql.exec(`
      SELECT
        SUM(CASE WHEN status = 'active' THEN monthly_amount ELSE 0 END) as mrr,
        SUM(CASE
          WHEN created_at >= date('now', '-1 month')
          THEN monthly_amount ELSE 0
        END) as new_mrr,
        SUM(CASE
          WHEN previous_amount < monthly_amount
          THEN monthly_amount - previous_amount ELSE 0
        END) as expansion_mrr,
        SUM(CASE
          WHEN previous_amount > monthly_amount
          THEN previous_amount - monthly_amount ELSE 0
        END) as contraction_mrr,
        SUM(CASE
          WHEN status = 'canceled' AND canceled_at >= date('now', '-1 month')
          THEN monthly_amount ELSE 0
        END) as churned_mrr
      FROM subscriptions
      WHERE status IN ('active', 'canceled')
    `).one()

    return {
      mrr: result.mrr,
      newMRR: result.new_mrr,
      expansionMRR: result.expansion_mrr,
      contractionMRR: result.contraction_mrr,
      churnedMRR: result.churned_mrr,
      netNewMRR: result.new_mrr + result.expansion_mrr - result.contraction_mrr - result.churned_mrr
    }
  }

  async calculateChurnRate(period: 'monthly' | 'annual'): Promise<number> {
    const periodDays = period === 'monthly' ? 30 : 365

    const result = this.sql.exec(`
      SELECT
        COUNT(CASE WHEN status = 'canceled' AND canceled_at >= date('now', '-${periodDays} days') THEN 1 END) as churned,
        COUNT(*) as total
      FROM subscriptions
      WHERE created_at < date('now', '-${periodDays} days')
    `).one()

    return result.total > 0 ? (result.churned / result.total) * 100 : 0
  }
}
```

---

## Deep Dive: Key Technical Challenges

### 1. Usage Aggregation Strategies

**Edge Ingestion Pattern**:
```typescript
// High-throughput edge ingestion with DO fan-out
export default {
  async fetch(request: Request, env: Env) {
    const events = await request.json<MeterEvent[]>()

    // Fan out to customer-specific DOs for aggregation
    const promises = events.map(async (event) => {
      const doId = env.METER.idFromName(event.customerId)
      const stub = env.METER.get(doId)
      return stub.ingest(event)
    })

    const results = await Promise.allSettled(promises)
    return Response.json({
      ingested: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    })
  }
}
```

**Aggregation Windows**:
- **Real-time**: Per-event updates in DO SQLite
- **Hourly**: Background job aggregates to hourly buckets
- **Daily**: Roll up hourly to daily for reporting
- **Billing period**: Sum daily for invoice generation

### 2. Billing Period Handling

```typescript
interface BillingPeriod {
  start: number // Unix timestamp
  end: number
  interval: 'day' | 'week' | 'month' | 'year'
  intervalCount: number
  anchorDate?: number // For anniversary billing
}

function calculateNextPeriod(current: BillingPeriod): BillingPeriod {
  const startDate = new Date(current.end * 1000)
  let endDate: Date

  switch (current.interval) {
    case 'day':
      endDate = addDays(startDate, current.intervalCount)
      break
    case 'week':
      endDate = addWeeks(startDate, current.intervalCount)
      break
    case 'month':
      endDate = addMonths(startDate, current.intervalCount)
      // Handle month-end anchoring
      if (current.anchorDate) {
        const day = Math.min(current.anchorDate, getDaysInMonth(endDate))
        endDate.setDate(day)
      }
      break
    case 'year':
      endDate = addYears(startDate, current.intervalCount)
      break
  }

  return {
    start: Math.floor(startDate.getTime() / 1000),
    end: Math.floor(endDate.getTime() / 1000),
    interval: current.interval,
    intervalCount: current.intervalCount,
    anchorDate: current.anchorDate
  }
}
```

### 3. Proration Calculations

```typescript
interface ProrationContext {
  subscription: Subscription
  oldPrice: Price
  newPrice: Price
  effectiveDate: number
}

function calculateProration(ctx: ProrationContext): number {
  const { subscription, oldPrice, newPrice, effectiveDate } = ctx

  // Time-based proration
  const periodTotal = subscription.currentPeriodEnd - subscription.currentPeriodStart
  const periodElapsed = effectiveDate - subscription.currentPeriodStart
  const periodRemaining = subscription.currentPeriodEnd - effectiveDate

  // Calculate unused portion of old plan
  const oldUnused = (oldPrice.unitAmount * periodRemaining) / periodTotal

  // Calculate cost of new plan for remaining period
  const newCost = (newPrice.unitAmount * periodRemaining) / periodTotal

  // Proration amount (positive = charge, negative = credit)
  return Math.round(newCost - oldUnused)
}

// Different proration behaviors
type ProrationBehavior =
  | 'create_prorations'        // Default - charge/credit immediately
  | 'none'                     // No proration, full charge at next renewal
  | 'always_invoice'           // Invoice proration immediately
  | 'pending_if_incomplete'    // Queue if payment incomplete
```

### 4. Multi-Currency Support

```typescript
interface CurrencyConfig {
  code: string // ISO 4217
  symbol: string
  decimalPlaces: number
  smallestUnit: number // Cents, pence, etc.
}

const CURRENCIES: Record<string, CurrencyConfig> = {
  usd: { code: 'USD', symbol: '$', decimalPlaces: 2, smallestUnit: 1 },
  eur: { code: 'EUR', symbol: '€', decimalPlaces: 2, smallestUnit: 1 },
  gbp: { code: 'GBP', symbol: '£', decimalPlaces: 2, smallestUnit: 1 },
  jpy: { code: 'JPY', symbol: '¥', decimalPlaces: 0, smallestUnit: 1 },
  // ...
}

interface MultiCurrencyPrice {
  default: { currency: string; amount: number }
  localized: Record<string, number> // currency -> amount
}

function getPriceForCustomer(
  price: MultiCurrencyPrice,
  customer: Customer
): { currency: string; amount: number } {
  // Check for localized price
  if (customer.currency && price.localized[customer.currency]) {
    return {
      currency: customer.currency,
      amount: price.localized[customer.currency]
    }
  }

  // Fall back to default
  return price.default
}

// Exchange rate handling for cosmetic localization
async function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRates
): Promise<number> {
  if (from === to) return amount

  const fromRate = rates[from]
  const toRate = rates[to]

  // Convert to USD (base) then to target
  const inUSD = amount / fromRate
  return Math.round(inUSD * toRate)
}
```

---

## SDK Interface

```typescript
// sdks/billing.do/index.ts

import { createClient, type ClientOptions } from 'rpc.do'

export interface BillingClient {
  // Metering
  meter: {
    ingest(event: MeterEvent): Promise<IngestResult>
    ingestBatch(events: MeterEvent[]): Promise<BatchIngestResult>
    getUsage(customerId: string, metricId: string, period: Period): Promise<number>
  }

  // Entitlements
  entitlements: {
    check(customerId: string, featureKey: string): Promise<EntitlementCheck>
    list(customerId: string): Promise<Entitlement[]>
    sync(customerId: string): Promise<void>
  }

  // Subscriptions
  subscriptions: {
    create(params: CreateSubscriptionParams): Promise<Subscription>
    get(id: string): Promise<Subscription>
    update(id: string, params: UpdateSubscriptionParams): Promise<Subscription>
    cancel(id: string, options?: CancelOptions): Promise<Subscription>
    list(customerId?: string): Promise<Subscription[]>
  }

  // Invoices
  invoices: {
    create(params: CreateInvoiceParams): Promise<Invoice>
    get(id: string): Promise<Invoice>
    finalize(id: string): Promise<Invoice>
    pay(id: string): Promise<Invoice>
    getPDF(id: string): Promise<Blob>
    list(customerId?: string): Promise<Invoice[]>
  }

  // Pricing
  prices: {
    create(params: CreatePriceParams): Promise<Price>
    get(id: string): Promise<Price>
    list(productId?: string): Promise<Price[]>
    calculate(priceId: string, quantity: number): Promise<number>
  }

  // Webhooks
  webhooks: {
    constructEvent(payload: string, signature: string, secret: string): WebhookEvent
  }

  // Analytics
  analytics: {
    mrr(): Promise<MRRBreakdown>
    churn(period: 'monthly' | 'annual'): Promise<number>
    cohorts(params: CohortParams): Promise<CohortAnalysis>
  }
}

export function Billing(options?: ClientOptions): BillingClient {
  return createClient<BillingClient>('https://billing.do', options)
}

export const billing: BillingClient = Billing()

export default billing
```

---

## Implementation Phases

### Phase 1: Core Metering (Week 1-2)
- [ ] MeterDO with event ingestion and aggregation
- [ ] Idempotency handling
- [ ] Basic aggregation types (COUNT, SUM)
- [ ] Usage query API

### Phase 2: Entitlements (Week 3)
- [ ] KV-based entitlement cache
- [ ] Boolean and numeric feature checks
- [ ] Metered entitlement checks
- [ ] Stripe entitlements sync

### Phase 3: Subscriptions (Week 4-5)
- [ ] SubscriptionDO with lifecycle management
- [ ] Proration calculations
- [ ] Plan change handling
- [ ] Stripe subscription sync

### Phase 4: Invoicing (Week 6)
- [ ] Invoice generation from subscriptions
- [ ] Usage-based line items
- [ ] PDF generation
- [ ] R2 storage

### Phase 5: Pricing Engine (Week 7)
- [ ] Per-unit pricing
- [ ] Tiered pricing (graduated and volume)
- [ ] Transform quantity
- [ ] Multi-currency support

### Phase 6: Analytics & Polish (Week 8)
- [ ] MRR/ARR calculations
- [ ] Churn analysis
- [ ] SDK finalization
- [ ] Documentation

---

## File Structure

```
rewrites/billing/
├── .beads/
│   └── issues.jsonl
├── src/
│   ├── metering/
│   │   ├── durable-object/
│   │   │   └── meter.ts
│   │   ├── ingest.ts
│   │   ├── aggregate.ts
│   │   ├── aggregate.test.ts
│   │   └── index.ts
│   ├── entitlements/
│   │   ├── cache.ts
│   │   ├── cache.test.ts
│   │   ├── check.ts
│   │   ├── middleware.ts
│   │   ├── sync.ts
│   │   └── index.ts
│   ├── subscriptions/
│   │   ├── durable-object/
│   │   │   └── subscription.ts
│   │   ├── lifecycle.ts
│   │   ├── lifecycle.test.ts
│   │   ├── proration.ts
│   │   ├── proration.test.ts
│   │   └── index.ts
│   ├── invoicing/
│   │   ├── generator.ts
│   │   ├── generator.test.ts
│   │   ├── pdf.ts
│   │   ├── storage.ts
│   │   └── index.ts
│   ├── pricing/
│   │   ├── engine.ts
│   │   ├── engine.test.ts
│   │   ├── flat.ts
│   │   ├── usage.ts
│   │   ├── tiered.ts
│   │   ├── currency.ts
│   │   └── index.ts
│   ├── webhooks/
│   │   ├── stripe.ts
│   │   ├── paddle.ts
│   │   ├── internal.ts
│   │   └── index.ts
│   ├── adapters/
│   │   ├── stripe.ts
│   │   ├── paddle.ts
│   │   ├── interface.ts
│   │   └── index.ts
│   ├── analytics/
│   │   ├── mrr.ts
│   │   ├── churn.ts
│   │   ├── cohorts.ts
│   │   └── index.ts
│   └── index.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── wrangler.toml
└── SCOPE.md
```

---

## Sources

### Stripe Billing
- [Stripe Billing Overview](https://stripe.com/billing)
- [Subscriptions API](https://docs.stripe.com/api/subscriptions)
- [Billing Meters](https://docs.stripe.com/api/billing/meter)
- [Entitlements API](https://docs.stripe.com/billing/entitlements)
- [Record Usage API](https://docs.stripe.com/billing/subscriptions/usage-based/recording-usage-api)

### Paddle
- [Paddle Platform](https://www.paddle.com)
- [Paddle Developer Docs](https://developer.paddle.com)
- [Webhooks Overview](https://developer.paddle.com/webhooks/overview)

### LemonSqueezy
- [LemonSqueezy](https://www.lemonsqueezy.com)
- [API Reference](https://docs.lemonsqueezy.com/api)
- [Digital Products](https://www.lemonsqueezy.com/ecommerce/digital-products)

### Orb
- [Orb Platform](https://www.withorb.com)
- [Event Ingestion](https://docs.withorb.com/events-and-metrics/event-ingestion)
- [Metering](https://www.withorb.com/products/metering)

### Lago
- [Lago](https://www.getlago.com)
- [GitHub Repository](https://github.com/getlago/lago)
- [Billable Metrics](https://doc.getlago.com/api-reference/billable-metrics/object)

### Stigg
- [Stigg Platform](https://www.stigg.io)
- [Local Caching](https://docs.stigg.io/docs/local-caching-and-fallback-strategy)
- [Persistent Caching](https://docs.stigg.io/docs/persistent-caching)
- [Entitlements Blog](https://www.stigg.io/blog-posts/entitlements-untangled-the-modern-way-to-software-monetization)
