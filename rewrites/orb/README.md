# orb.do

> Usage-Based Billing. Edge-Native. AI-First.

Orb charges $30K-100K+/year for usage-based billing. Complex pricing models, metering APIs, and entitlement checks locked behind enterprise contracts. Implementations take months. Billing becomes another vendor dependency.

**orb.do** is the open-source alternative. Deploy in minutes. Run on your Cloudflare account. Natural language billing that finance people can understand.

## AI-Native API

```typescript
import { orb } from 'orb.do'           // Full SDK
import { orb } from 'orb.do/tiny'      // Minimal client
import { orb } from 'orb.do/metering'  // Metering-only operations
```

Natural language for billing workflows:

```typescript
import { orb } from 'orb.do'

// Talk to it like a finance person
await orb`bill ralph for 1500 tokens on gpt-4`
await orb`bill customer for API usage this month`
await orb`charge startup-xyz for 50GB storage`

// Chain like sentences
await orb`customers over usage limit`
  .notify(`You've exceeded your plan limits`)

// Invoices that generate themselves
await orb`invoice acme-corp for January`
  .calculate()    // usage aggregation
  .generate()     // PDF creation
  .send()         // email delivery
```

## The Problem

Orb dominates usage-based billing:

| What Orb Charges | The Reality |
|------------------|-------------|
| **Platform Fee** | $30K-100K+/year |
| **Per-Event Fee** | $0.0001+ per metered event |
| **Implementation** | Weeks of engineering |
| **Pricing Models** | Limited to their abstractions |
| **Entitlements** | Separate add-on costs |
| **Lock-in** | Years of billing data trapped |

### The SaaS Tax

Modern billing platforms:
- Complex SDKs requiring significant integration
- Event schemas that don't match your domain
- Pricing changes require engineering work
- Finance can't self-serve

AI agents bill millions of micro-transactions. Traditional platforms weren't built for this scale.

## The Solution

**orb.do** reimagines billing for the AI era:

```
Orb                                 orb.do
-----------------------------------------------------------------
$30K-100K+/year                     $0 - run your own
Weeks of implementation             Deploy in minutes
Complex SDK integration             Natural language API
Engineering-driven pricing          Finance-friendly syntax
Separate entitlements               Entitlements included
Vendor lock-in                      Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo orb
```

A complete billing system. Running on infrastructure you control. Usage-based from day one.

```typescript
import { Orb } from 'orb.do'

export default Orb({
  name: 'my-saas',
  domain: 'billing.my-saas.com',
})
```

## Features

### Metering

```typescript
// Bill for anything
await orb`bill ralph for 1500 tokens on gpt-4`
await orb`charge acme for 100 API calls`
await orb`record 50GB storage for customer-xyz`

// AI infers the meter
await orb`ralph used the API`               // increments api_calls
await orb`ralph used 1500 tokens`           // records token usage
await orb`ralph stored 50GB`                // records storage

// Query usage naturally
await orb`ralph usage this month`
await orb`acme token usage since Monday`
await orb`all customers over 10000 API calls`
```

### Pricing

```typescript
// Pricing as natural language
await orb`$0.10 per API call`
await orb`$0.001 per token`
await orb`$5 per GB per month`

// Tiered pricing reads like a rate card
await orb`
  API calls:
  - first 1000 at $0.10
  - next 9000 at $0.08
  - beyond at $0.05
`

// Volume discounts
await orb`20% off over 100000 API calls`

// Package pricing
await orb`$99/month includes 10000 API calls`
```

### Subscriptions

```typescript
// Create subscriptions naturally
await orb`subscribe acme to Pro plan`
await orb`subscribe ralph to Enterprise with 10 seats`

// Changes just work
await orb`upgrade acme to Enterprise`        // automatic proration
await orb`add 5 seats to acme`               // mid-cycle adjustment
await orb`cancel acme at period end`         // graceful cancellation

// Query subscriptions
await orb`acme subscription status`
await orb`customers on Pro plan`
await orb`subscriptions expiring this week`
```

### Invoicing

```typescript
// Generate invoices naturally
await orb`invoice acme for January`
await orb`invoice all customers for this month`

// Invoice lifecycle
await orb`invoice acme`
  .calculate()    // aggregate usage
  .generate()     // create PDF
  .send()         // email to customer

// Query invoices
await orb`acme unpaid invoices`
await orb`overdue invoices`
await orb`invoices over $10000`
```

### Entitlements

```typescript
// Entitlements as questions
const can = await orb`can ralph use advanced_analytics`
const limit = await orb`ralph API call limit`
const remaining = await orb`ralph remaining API calls`

// Check before action
if (await orb`can acme use premium_features`) {
  // grant access
}

// Usage against limits
await orb`ralph usage vs limits`
// { api_calls: { used: 8500, limit: 10000, remaining: 1500 } }
```

### Real-Time Updates

```typescript
// Stream usage as it happens
await orb`stream ralph usage`
  .on('usage', u => updateDashboard(u))

// Alerts when approaching limits
await orb`alert when ralph exceeds 80% of API limit`

// Webhooks for billing events
await orb`notify on invoice.created, payment.failed`
```

## Promise Pipelining

Chain operations without waiting:

```typescript
// Find customers, calculate bills, send invoices - one round trip
await orb`customers with usage this month`
  .map(customer => orb`invoice ${customer}`)
  .map(invoice => invoice.send())

// Overage handling as a pipeline
await orb`customers over limit`
  .map(customer => orb`suspend ${customer} API access`)
  .map(customer => orb`notify ${customer} about overage`)
```

## Agent Billing

Every AI agent gets their own billing meter:

```typescript
import { tom, ralph, priya } from 'agents.do'
import { orb } from 'orb.do'

// Bill per agent naturally
await orb`bill tom for code review: 2000 tokens`
await orb`bill ralph for implementation: 5000 tokens`
await orb`bill priya for product planning: 1500 tokens`

// Query by agent
await orb`tom usage this week`
await orb`which agent used the most tokens`

// Team billing
await orb`engineering team usage this month`
```

## Architecture

### Durable Object per Customer

```
CustomerDO (billing configuration)
  |
  +-- MeterDO (usage events)
  |     |-- SQLite: Events (high-volume append)
  |     +-- Aggregations (real-time rollups)
  |
  +-- SubscriptionDO (subscription state)
  |     |-- SQLite: Subscription records
  |     +-- Proration calculations
  |
  +-- InvoiceDO (invoicing)
  |     |-- SQLite: Invoice records
  |     +-- R2: PDF storage
  |
  +-- EntitlementDO (feature gating)
        |-- KV: Sub-ms lookups
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Current period events | <10ms |
| **Warm** | R2 + Index | Historical billing (2-7 years) | <100ms |
| **Cold** | R2 Archive | Compliance retention (7+ years) | <1s |

## vs Orb

| Feature | Orb | orb.do |
|---------|-----|--------|
| **Annual Cost** | $30K-100K+ | ~$50/month |
| **Implementation** | Weeks | Minutes |
| **API** | Complex SDK | Natural language |
| **Pricing Changes** | Engineering required | Finance self-serve |
| **Entitlements** | Separate product | Included |
| **Data Location** | Their servers | Your Cloudflare |
| **Customization** | Limited | Fully customizable |
| **Lock-in** | Years of data | MIT licensed |

## Use Cases

### SaaS Platforms

```typescript
// Bill customers for API usage
await orb`bill ${customer} for ${tokens} tokens`

// Enforce rate limits
if (await orb`${customer} over API limit`) {
  return { error: 'Rate limit exceeded' }
}
```

### AI Agent Platforms

```typescript
// Per-model billing
await orb`bill ${customer} for gpt-4: ${tokens} tokens at $0.03/1k`
await orb`bill ${customer} for claude: ${tokens} tokens at $0.01/1k`

// Track by agent
await orb`tom usage by model this month`
```

### Multi-Tenant Applications

```typescript
// Tenant-isolated billing
await orb`bill tenant-${id} for ${storage}GB storage`
await orb`tenant-${id} total spend this month`
```

## Deployment Options

### Cloudflare Workers

```bash
npx create-dotdo orb
# Deploys to your Cloudflare account
```

### Self-Hosted

```bash
# Docker
docker run -p 8787:8787 dotdo/orb

# Kubernetes
kubectl apply -f orb-do.yaml
```

## Roadmap

### Core Billing
- [x] Usage Metering
- [x] Tiered Pricing
- [x] Volume Pricing
- [x] Package Pricing
- [x] Subscriptions
- [x] Proration
- [x] Invoice Generation
- [x] PDF Invoices
- [ ] Credit Grants
- [ ] Prepaid Balances

### Entitlements
- [x] Boolean Features
- [x] Numeric Limits
- [x] Usage-Based Limits
- [ ] Time-Based Access
- [ ] Seat-Based Licensing

### Integrations
- [x] Stripe Payments
- [x] Webhooks
- [ ] QuickBooks Sync
- [ ] Xero Sync
- [ ] Salesforce Sync

### AI
- [x] Natural Language Queries
- [x] Usage Prediction
- [ ] Anomaly Detection
- [ ] Revenue Forecasting

## Contributing

orb.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/orb.do
cd orb.do
pnpm install
pnpm test
```

## License

MIT License - Bill everything, own nothing.

---

<p align="center">
  <strong>Usage-based billing without the enterprise tax.</strong>
  <br />
  Natural language. Real-time. Edge-native.
  <br /><br />
  <a href="https://orb.do">Website</a> |
  <a href="https://docs.orb.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/orb.do">GitHub</a>
</p>
