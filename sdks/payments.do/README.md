# payments.do

**Accept payments today. Not next month.**

```bash
npm install payments.do
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { payments } from 'payments.do'

// Or use the factory for custom config
import { Payments } from 'payments.do'
const payments = Payments({ baseURL: 'https://custom.example.com' })
```

---

## You Just Want to Get Paid

You have customers ready to pay. You have a product people want. You should be collecting revenue right now.

But Stripe's API means:
- Reading 500 pages of documentation
- Building subscription billing from scratch
- Managing webhooks for every edge case
- Handling failed payments and retries yourself
- Wrestling with usage-based billing math
- Weeks of work before you see a dollar

**Your product is ready. Your billing infrastructure isn't. That's backwards.**

## Payments That Just Work

```typescript
import { payments } from 'payments.do'

// Create a subscription in one line
await payments.subscriptions.create({
  customer: 'cus_123',
  price: 'price_monthly'
})

// That's it. Billing starts. Revenue flows.
```

**payments.do** is Stripe without the complexity:
- Subscriptions that renew themselves
- Usage tracking that bills automatically
- Failed payments that retry intelligently
- Marketplace payouts that split correctly
- All the edge cases, already handled

## Start Accepting Payments in 3 Steps

### 1. Create Your Customer

```typescript
import { payments } from 'payments.do'

const customer = await payments.customers.create({
  email: 'user@company.com',
  name: 'Jane Smith'
})
```

### 2. Start Billing

```typescript
// One-time charge
await payments.charges.create({
  amount: 9900,  // $99.00
  currency: 'usd',
  customer: customer.id
})

// Or recurring subscription
await payments.subscriptions.create({
  customer: customer.id,
  price: 'price_pro_monthly'
})
```

### 3. Get Paid

```typescript
// Track your revenue
const charges = await payments.charges.list(customer.id)
const subscriptions = await payments.subscriptions.list(customer.id)

// Funds land in your Stripe account automatically
```

## The Billing Grind You Escape

**Without payments.do:**
- 3 weeks building Stripe integration
- Webhook handlers for 20+ event types
- Edge cases that break at 2am
- Proration bugs during upgrades
- Failed payment emails you write yourself
- Usage aggregation you build from scratch

**With payments.do:**
- One `npm install`
- One line to charge, subscribe, or record usage
- Edge cases handled by engineers who've seen them all
- More time building, less time billing

## Everything You Need to Get Paid

### Subscriptions That Manage Themselves

```typescript
// Create subscription
const sub = await payments.subscriptions.create({
  customer: 'cus_123',
  price: 'price_pro_monthly'
})

// Upgrade seamlessly (proration handled)
await payments.subscriptions.update(sub.id, {
  price: 'price_enterprise_monthly'
})

// Cancel when needed
await payments.subscriptions.cancel(sub.id)
```

### Usage-Based Billing Made Simple

```typescript
// Record usage as it happens
await payments.usage.record('cus_123', {
  quantity: 1000,
  model: 'claude-3-opus'
})

// Usage is aggregated and billed automatically
// No manual invoice math. No billing period tracking.
```

### Marketplace Payouts That Split Right

```typescript
// Customer pays $100
await payments.charges.create({
  amount: 10000,
  customer: 'cus_buyer'
})

// Pay your seller their cut
await payments.transfers.create({
  amount: 8500,  // Seller gets $85
  destination: 'acct_seller'
})

// You keep $15. Stripe handles the rest.
```

### Invoices That Send Themselves

```typescript
// Create and send invoice
const invoice = await payments.invoices.create({
  customer: 'cus_123',
  items: [
    { description: 'Consulting - January', amount: 500000 },
    { description: 'API Usage', amount: 12500 }
  ]
})

await payments.invoices.finalize(invoice.id)
// Customer receives invoice, pays online
```

## Configuration

Set your API key via environment variable:

```bash
export PAYMENTS_API_KEY=your_api_key
```

The client resolves API keys automatically:

```typescript
import 'rpc.do/env'
import { Payments } from 'payments.do'

const payments = Payments()
// API key resolved automatically from PAYMENTS_API_KEY or DO_API_KEY
```

## Full API Reference

### Customers
```typescript
await payments.customers.create({ email, name, metadata })
await payments.customers.get(customerId)
await payments.customers.list()
await payments.customers.delete(customerId)
```

### Charges
```typescript
await payments.charges.create({ amount, currency, customer })
await payments.charges.get(chargeId)
await payments.charges.list(customerId)
```

### Subscriptions
```typescript
await payments.subscriptions.create({ customer, price })
await payments.subscriptions.get(subId)
await payments.subscriptions.cancel(subId)
await payments.subscriptions.list(customerId)
```

### Usage Billing
```typescript
await payments.usage.record(customerId, { quantity, model, action })
await payments.usage.get(customerId, { start, end })
```

### Transfers
```typescript
await payments.transfers.create({ amount, destination, currency })
await payments.transfers.get(transferId)
await payments.transfers.list(destination)
```

### Invoices
```typescript
await payments.invoices.create({ customer, items })
await payments.invoices.finalize(invoiceId)
await payments.invoices.pay(invoiceId)
await payments.invoices.get(invoiceId)
await payments.invoices.list(customerId)
```

## You Should Be Getting Paid Already

Every day without billing is revenue you're leaving on the table. Your customers are ready. Your product is ready.

**Your payments should be ready too.**

```bash
npm install payments.do
```

[Start accepting payments at payments.do](https://payments.do)

---

Part of the [workers.do](https://workers.do) platform.
