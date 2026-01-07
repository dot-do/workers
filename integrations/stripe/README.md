# @dotdo/worker-stripe

Stripe SDK exposed as a multi-transport RPC worker.

## Overview

This worker wraps the [Stripe Node.js SDK](https://github.com/stripe/stripe-node), providing payment processing, subscription management, and billing capabilities via Cloudflare Workers RPC.

## Installation

```bash
pnpm add stripe @dotdo/rpc
```

## Usage

The worker follows the elegant 3-line pattern:

```typescript
import Stripe from 'stripe'
import { RPC } from 'workers.do/rpc'
export default RPC(new Stripe(env.STRIPE_SECRET_KEY))
```

## Binding Convention

Configure in `wrangler.json`:

```json
{
  "services": [
    {
      "binding": "STRIPE",
      "service": "worker-stripe"
    }
  ]
}
```

Access via:

```typescript
this.env.STRIPE
```

## Available Transports

| Transport | Example |
|-----------|---------|
| Workers RPC | `await env.STRIPE.customers.create({ email })` |
| REST | `POST /api/customers/create` |
| CapnWeb | WebSocket RPC protocol |
| MCP | `{ jsonrpc: '2.0', method: 'customers.create', params: [...] }` |

## Common Operations

```typescript
// Create a customer
const customer = await env.STRIPE.customers.create({
  email: 'alice@example.com',
  name: 'Alice'
})

// Create a payment intent
const intent = await env.STRIPE.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  customer: customer.id
})

// Create a subscription
const subscription = await env.STRIPE.subscriptions.create({
  customer: customer.id,
  items: [{ price: 'price_xxx' }]
})

// List invoices
const invoices = await env.STRIPE.invoices.list({
  customer: customer.id
})
```

## Environment Variables

The worker requires:

- `STRIPE_SECRET_KEY` - Your Stripe secret API key

## Dependencies

- `stripe` ^17.0.0
- `@dotdo/rpc` workspace:*

## License

MIT
