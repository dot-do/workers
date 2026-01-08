# Payments.do Architecture

> **Inspired by Polar's production-grade patterns, adapted for Cloudflare Workers**

This document describes the architecture of payments.do, our Stripe Connect implementation for the workers.do platform. The design takes deep inspiration from [Polar](https://github.com/polarsource/polar) while adapting patterns for Cloudflare's edge computing model.

## Table of Contents

1. [Overview](#overview)
2. [Core Entities](#core-entities)
3. [Stripe Connect Integration](#stripe-connect-integration)
4. [API Design Principles](#api-design-principles)
5. [Data Flow](#data-flow)
6. [Cloudflare Workers Adaptations](#cloudflare-workers-adaptations)

---

## Overview

payments.do provides a complete billing infrastructure for the workers.do platform, enabling:

- **One-time charges** - Simple payment collection
- **Recurring subscriptions** - Automatic billing with trials, upgrades, and cancellations
- **Usage-based billing** - Metered pricing with aggregation strategies
- **Marketplace payouts** - Stripe Connect Express for platform fees and creator payouts
- **Customer self-service** - Portal for subscription management
- **Entitlements** - Benefit provisioning tied to purchases

### Architecture Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SDK Layer (payments.do)                         │
│  TypeScript client with RPC pattern, type-safe operations           │
└─────────────────────────────────────────────────────────────────────┘
                                   │
┌─────────────────────────────────────────────────────────────────────┐
│                    Worker Layer (workers/payments)                  │
│  Cloudflare Worker handling REST/RPC/Webhooks                       │
└─────────────────────────────────────────────────────────────────────┘
                                   │
┌─────────────────────────────────────────────────────────────────────┐
│              Durable Object Layer (PaymentsDO)                      │
│  Stateful billing entity per organization                           │
└─────────────────────────────────────────────────────────────────────┘
                                   │
┌─────────────────────────────────────────────────────────────────────┐
│                 Integration Layer (@dotdo/stripe)                   │
│  Stripe API wrapper with error handling and retries                 │
└─────────────────────────────────────────────────────────────────────┘
                                   │
┌─────────────────────────────────────────────────────────────────────┐
│                        Stripe Connect                               │
│  Payment processing, Connect accounts, webhooks                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Entities

Based on Polar's data model, adapted for our use case:

### Organization (Multi-tenancy Root)

Every resource belongs to an organization. This provides tenant isolation.

```typescript
interface Organization {
  id: string
  name: string
  slug: string
  status: 'created' | 'onboarding' | 'active' | 'blocked'

  // Stripe Connect
  stripeAccountId?: string
  stripeAccountStatus: 'none' | 'onboarding' | 'active' | 'restricted'

  // Settings
  defaultCurrency: string
  invoicePrefix: string
  invoiceNextNumber: number

  metadata: Record<string, unknown>
  createdAt: Date
  modifiedAt: Date
}
```

### Customer

Represents a paying entity within an organization.

```typescript
interface Customer {
  id: string
  organizationId: string
  externalId?: string           // Your system's ID

  email: string
  emailVerified: boolean
  name?: string

  // Billing
  billingAddress?: Address
  taxId?: TaxId
  stripeCustomerId?: string
  defaultPaymentMethodId?: string

  // Invoice tracking
  invoiceNextNumber: number

  metadata: Record<string, unknown>
  createdAt: Date
  modifiedAt: Date
  deletedAt?: Date              // Soft delete
}
```

### Product

Defines what's being sold. Supports one-time and recurring billing.

```typescript
interface Product {
  id: string
  organizationId: string

  name: string
  description?: string
  isArchived: boolean

  // Billing type
  billingType: 'one_time' | 'recurring'
  recurringInterval?: 'day' | 'week' | 'month' | 'year'
  recurringIntervalCount?: number

  // Trial configuration
  trialInterval?: 'day' | 'week' | 'month' | 'year'
  trialIntervalCount?: number

  // Tax
  isTaxApplicable: boolean
  taxCode?: string

  // Related entities
  prices: ProductPrice[]
  benefits: Benefit[]

  metadata: Record<string, unknown>
  createdAt: Date
  modifiedAt: Date
}
```

### ProductPrice (Polymorphic)

Supports multiple pricing strategies via discriminated unions:

```typescript
type ProductPrice =
  | ProductPriceFixed
  | ProductPriceCustom
  | ProductPriceFree
  | ProductPriceMeteredUnit
  | ProductPriceSeatUnit

interface ProductPriceFixed {
  type: 'fixed'
  id: string
  productId: string
  amount: number              // In cents
  currency: string
  isArchived: boolean
  recurringInterval?: string
}

interface ProductPriceCustom {
  type: 'custom'
  id: string
  productId: string
  minimumAmount?: number
  maximumAmount?: number
  presetAmount?: number
  currency: string
  isArchived: boolean
}

interface ProductPriceFree {
  type: 'free'
  id: string
  productId: string
  isArchived: boolean
}

interface ProductPriceMeteredUnit {
  type: 'metered_unit'
  id: string
  productId: string
  unitAmount: number          // Price per unit (supports decimals)
  capAmount?: number          // Maximum charge per period
  meterId: string
  currency: string
  isArchived: boolean
}

interface ProductPriceSeatUnit {
  type: 'seat_unit'
  id: string
  productId: string
  seatTiers: SeatTier[]       // Tiered pricing
  currency: string
  isArchived: boolean
}
```

### Subscription

Recurring billing relationship between customer and product.

```typescript
interface Subscription {
  id: string
  organizationId: string
  customerId: string
  productId: string

  // Billing
  amount: number
  currency: string
  recurringInterval: 'day' | 'week' | 'month' | 'year'
  recurringIntervalCount: number

  // Status machine
  status: SubscriptionStatus

  // Period tracking
  currentPeriodStart: Date
  currentPeriodEnd: Date
  startedAt: Date

  // Trial
  trialStart?: Date
  trialEnd?: Date

  // Cancellation
  cancelAtPeriodEnd: boolean
  canceledAt?: Date
  endedAt?: Date

  // Payment
  paymentMethodId?: string
  discountId?: string

  // Seats (for seat-based)
  seats?: number

  metadata: Record<string, unknown>
  createdAt: Date
  modifiedAt: Date
}

type SubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'revoked'
```

### Order

Purchase record (one-time or subscription cycle).

```typescript
interface Order {
  id: string
  organizationId: string
  customerId: string
  productId?: string
  subscriptionId?: string
  checkoutId?: string

  // Status
  status: 'pending' | 'paid' | 'refunded' | 'partially_refunded'
  billingReason: 'purchase' | 'subscription_create' | 'subscription_cycle' | 'subscription_update'

  // Amounts (all in cents)
  subtotalAmount: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  refundedAmount: number
  refundedTaxAmount: number

  // Platform fees (for Connect)
  platformFeeAmount: number
  platformFeeCurrency?: string

  // Invoice
  invoiceNumber: string
  isInvoiceGenerated: boolean

  // Billing details
  billingName?: string
  billingAddress?: Address

  // Line items
  items: OrderItem[]

  metadata: Record<string, unknown>
  createdAt: Date
  modifiedAt: Date
}
```

### Checkout

Payment session for collecting payment.

```typescript
interface Checkout {
  id: string
  organizationId: string

  // Identification
  clientSecret: string        // For client-side access

  // Status
  status: 'open' | 'expired' | 'confirmed' | 'succeeded' | 'failed'
  expiresAt: Date

  // Products
  productId: string
  productPriceId: string

  // Amounts
  amount: number
  currency: string
  discountAmount: number
  taxAmount: number
  totalAmount: number

  // Customer info
  customerId?: string
  customerEmail: string
  customerName?: string
  customerBillingAddress?: Address

  // Configuration
  allowDiscountCodes: boolean
  allowTrial: boolean
  trialEnd?: Date

  // URLs
  successUrl?: string
  returnUrl?: string
  embedOrigin?: string

  // Stripe data
  paymentProcessorMetadata: Record<string, unknown>

  createdAt: Date
  modifiedAt: Date
}
```

### Payout

Disbursement to connected account.

```typescript
interface Payout {
  id: string
  accountId: string

  // Status
  status: 'pending' | 'in_transit' | 'succeeded'
  paidAt?: Date

  // Amounts
  currency: string
  amount: number              // Platform currency
  feesAmount: number

  // Account currency (may differ)
  accountCurrency: string
  accountAmount: number

  // Invoice
  invoiceNumber: string
  invoicePath?: string

  // Stripe references
  processorId?: string        // Stripe payout ID
  transferId?: string         // Stripe transfer ID

  createdAt: Date
  modifiedAt: Date
}
```

### Transaction (Double-Entry Ledger)

All financial movements recorded for audit.

```typescript
interface Transaction {
  id: string

  type: 'payment' | 'fee' | 'refund' | 'dispute' | 'balance' | 'payout'

  // Amounts (dual currency)
  currency: string
  amount: number
  accountCurrency: string
  accountAmount: number

  // Fee tracking
  platformFeeType?: 'payment' | 'payout' | 'transfer' | 'account'
  processorFeeType?: 'payment' | 'refund' | 'dispute'

  // Correlation
  accountId?: string
  customerId?: string
  orderId?: string
  payoutId?: string
  balanceCorrelationKey?: string    // Links paired balance transactions

  // Stripe references
  chargeId?: string
  transferId?: string

  createdAt: Date
}
```

---

## Stripe Connect Integration

### Account Type: Express

We use **Stripe Express** accounts for the fastest onboarding path:

- Stripe hosts the onboarding UI
- Stripe handles identity verification
- Stripe manages compliance
- We control payout timing

### Account Lifecycle

```
CREATED → ONBOARDING_STARTED → UNDER_REVIEW → ACTIVE
                                     ↓
                                  DENIED
```

### Two-Step Payout Process

Following Polar's pattern for safety:

**Step 1: Transfer to Connected Account**
```typescript
// Move funds from platform to connected account
const transfer = await stripe.transfers.create({
  amount: payoutAmount,
  currency: 'usd',
  destination: connectedAccountId,
  metadata: { payout_id: payoutId }
}, {
  idempotencyKey: `payout-${payoutId}`  // Critical: prevents duplicates
})
```

**Step 2: Trigger Payout (Scheduled)**
```typescript
// Only after balance is available (24h delay)
const stripePayout = await stripe.payouts.create({
  amount: accountAmount,
  currency: accountCurrency,
  metadata: { payout_id: payoutId }
}, {
  stripeAccount: connectedAccountId
})
```

### Fee Calculation

Platform fees calculated using reverse fee calculation:

```typescript
function calculatePayoutFees(amount: number, country: string) {
  const fees = COUNTRY_FEES[country] || US_FEES

  // Cross-border transfer fee
  const transferFee = Math.ceil(amount * fees.transferFeePercent / 100)

  // Payout fee (reverse calculation)
  const p1 = fees.transferFeePercent / 100
  const p2 = US_FEES.payoutFeePercent / 100
  const f2 = US_FEES.payoutFeeFlat

  const reversedAmount = Math.floor((f2 - amount) / (p2 * p1 - p1 - p2 - 1))
  const payoutFee = amount - reversedAmount - transferFee

  return { transferFee, payoutFee, total: transferFee + payoutFee }
}
```

---

## API Design Principles

Based on Polar's OpenAPI patterns:

### 1. Resource-Centric REST

```
GET    /v1/subscriptions          # List
POST   /v1/subscriptions          # Create
GET    /v1/subscriptions/{id}     # Get
PATCH  /v1/subscriptions/{id}     # Update
DELETE /v1/subscriptions/{id}     # Delete/Cancel
```

### 2. Pagination

```typescript
// Request
GET /v1/subscriptions?page=1&limit=10&sorting=-created_at

// Response
{
  "items": [...],
  "pagination": {
    "total_count": 150,
    "max_page": 15
  }
}
```

### 3. Error Responses

```typescript
// Validation error (422)
{
  "detail": [
    { "loc": ["body", "email"], "msg": "Invalid email", "type": "value_error" }
  ]
}

// Domain error (4xx)
{
  "error": "AlreadyCanceledSubscription",
  "detail": "This subscription is already canceled"
}
```

### 4. Authentication

Multiple schemes supported:
- **API Key** - `Authorization: Bearer <api_key>`
- **Customer Session** - Temporary tokens for portal
- **OAuth2** - Granular scopes for delegation

### 5. Webhooks

31 event types following `resource.action` pattern:

```typescript
{
  "type": "subscription.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": { /* full subscription object */ }
}
```

---

## Data Flow

### Checkout Flow

```
Customer → Create Checkout → Validate Products/Prices
        → Apply Discounts → Calculate Tax
        → Create Payment Intent (Stripe)
        → Return Client Secret → Customer Confirms
        → Stripe Webhook: payment_intent.succeeded
        → Create Order/Subscription → Grant Benefits
        → Webhook: checkout.succeeded
```

### Subscription Renewal

```
Cron Trigger (every 15 min)
        → Find subscriptions where current_period_end <= now
        → For each subscription:
           → Acquire distributed lock
           → Check cancel_at_period_end
              → If true: Cancel and revoke benefits
              → If false: Advance period, create billing entry
           → Enqueue order creation
           → Release lock
        → Webhook: subscription.cycled
```

### Payout Flow

```
User requests payout
        → Verify account status and balance
        → Acquire distributed lock
        → Calculate platform fees
        → Create fee transactions (ledger entries)
        → Create Payout record (status=pending)
        → Release lock
        → Enqueue transfer job

Transfer job (async):
        → Call Stripe Transfer API
        → Store transfer_id
        → Handle currency conversion

Payout trigger (cron, every 15 min):
        → Find pending payouts older than 24h
        → Check Stripe account balance
        → If sufficient: Create Stripe Payout
        → Webhook: payout.paid → Update status
```

---

## Cloudflare Workers Adaptations

### Durable Objects for State

Each organization has a PaymentsDO instance:

```typescript
export class PaymentsDO extends DurableObject {
  // Subscription state
  async getSubscription(id: string): Promise<Subscription>
  async createSubscription(data: CreateSubscription): Promise<Subscription>
  async cycleSubscription(id: string): Promise<void>

  // Meter accumulation
  async recordUsage(meterId: string, units: number): Promise<void>
  async getUsage(meterId: string, periodStart: Date): Promise<number>

  // Distributed locking
  async acquireLock(key: string, timeoutMs: number): Promise<boolean>
  async releaseLock(key: string): Promise<void>
}
```

### D1 for Persistence

SQLite-based storage for billing data:

```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  status TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  -- ...
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

### Queues for Async Processing

Cloudflare Queues for reliable background jobs:

```typescript
// Producer
await env.BILLING_QUEUE.send({
  type: 'subscription.cycle',
  subscriptionId: subscription.id,
  timestamp: Date.now()
})

// Consumer
export default {
  async queue(batch: MessageBatch, env: Env) {
    for (const message of batch.messages) {
      const { type, ...data } = message.body

      switch (type) {
        case 'subscription.cycle':
          await cycleSubscription(env, data.subscriptionId)
          break
        case 'payout.transfer':
          await transferToStripe(env, data.payoutId)
          break
      }

      message.ack()
    }
  }
}
```

### Cron Triggers for Scheduling

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    switch (event.cron) {
      case '*/15 * * * *':  // Every 15 minutes
        await processSubscriptionRenewals(env)
        await triggerPendingPayouts(env)
        break
      case '0 0 * * *':     // Daily at midnight
        await archiveExpiredCheckouts(env)
        break
    }
  }
}
```

### R2 for Invoice Storage

```typescript
// Generate and store invoice PDF
const pdfBuffer = await generateInvoicePDF(order)
const key = `invoices/${order.organizationId}/${order.id}.pdf`

await env.INVOICES_BUCKET.put(key, pdfBuffer, {
  customMetadata: {
    orderId: order.id,
    customerId: order.customerId
  }
})

// Generate presigned URL for download
const url = await env.INVOICES_BUCKET.createSignedUrl(key, {
  expiresIn: 3600  // 1 hour
})
```

---

## Related Documentation

- [Stripe Connect Guide](./STRIPE-CONNECT.md)
- [Subscription Billing](./SUBSCRIPTIONS.md)
- [Metered Billing](./METERED-BILLING.md)
- [Webhooks](./WEBHOOKS.md)
- [Customer Portal](./CUSTOMER-PORTAL.md)

---

## References

- [Polar GitHub Repository](https://github.com/polarsource/polar) - Primary inspiration
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
