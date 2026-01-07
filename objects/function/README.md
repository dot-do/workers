# function.do

## Serverless Functions with Superpowers

Deploy functions that remember everything: every version, every execution, every metric. No more blind deployments. No more debugging in the dark.

```bash
npm install function.do
```

---

## The Problem: You're Flying Blind

Traditional serverless functions have a fatal flaw: **amnesia**.

Every time your function spins up, it forgets everything:

- **No versioning** - Something broke after a deploy? Good luck figuring out what changed
- **Blind deployments** - Push and pray, then scramble when production burns
- **No metrics** - Basic invocation counts don't tell you why your p99 just spiked 10x
- **Cold start chaos** - Random latency spikes with no way to predict or prevent them

You're running mission-critical code with less observability than a calculator app.

---

## The Solution: Functions That Remember

**function.do** gives your serverless functions persistent memory through Durable Objects:

```typescript
import { Function } from 'function.do'

export class MyFunctions extends Function {
  // Your functions now have superpowers:
  // - Automatic versioning with instant rollback
  // - Full execution history with input/output capture
  // - Built-in rate limiting per user, IP, or custom key
  // - Cold start tracking and pre-warming
  // - Real-time p50/p95/p99 metrics
}
```

Every deploy creates a version. Every execution is tracked. Every metric is recorded. **Your functions finally have a memory.**

---

## 3 Simple Steps

### Step 1: Deploy Your Function

```typescript
await functions.deploy({
  name: 'processPayment',
  code: `
    export default async (payment, env) => {
      const charge = await stripe.charges.create({
        amount: payment.amount,
        currency: 'usd',
        customer: payment.customerId
      })
      return { chargeId: charge.id, status: 'succeeded' }
    }
  `,
  timeout: 30000,
  env: { STRIPE_KEY: 'sk_live_...' }
})
```

Every deploy auto-increments the version. Roll back anytime with `functions.rollback('processPayment', 3)`.

### Step 2: Invoke with Full Tracking

```typescript
const result = await functions.invoke('processPayment', {
  amount: 5000,
  customerId: 'cus_abc123'
}, {
  rateLimitKey: 'cus_abc123'  // Built-in per-customer rate limiting
})

// {
//   id: 'exec_xyz789',
//   output: { chargeId: 'ch_123', status: 'succeeded' },
//   status: 'completed',
//   duration: 234,
//   coldStart: false
// }
```

### Step 3: See Everything

```typescript
const metrics = await functions.metrics('processPayment')
// {
//   invocations: 47832,
//   successRate: 99.8,
//   avgDuration: 187,
//   p50Duration: 156,
//   p95Duration: 312,
//   p99Duration: 489,
//   coldStartRate: 1.2
// }

// Debug failures with full context
const failed = await functions.executions('processPayment', {
  status: 'failed',
  limit: 10
})
// See exact input, error message, duration, and version for each failure
```

---

## Before and After

| Without function.do | With function.do |
|---------------------|------------------|
| Push code, hope it works | Deploy with automatic versioning |
| "It worked yesterday" debates | Instant rollback to any version |
| Grep through CloudWatch for hours | Structured logs with execution context |
| Build rate limiting from scratch | `rateLimitKey: 'user_123'` |
| Random cold start spikes | Track, measure, and pre-warm instances |
| "How many requests failed?" | Real-time success rates, p50/p95/p99 |
| Alert fires, panic begins | Full execution history shows exactly what broke |

---

## Why function.do?

### Built on Durable Objects

- **SQLite persistence** - Your function state survives restarts
- **Transactional guarantees** - No race conditions, no lost data
- **Global distribution** - Single-writer consistency worldwide
- **Always warm** - The Durable Object itself has zero cold starts

### Production-Ready Features

```typescript
// Pre-warm instances before traffic spikes
await functions.prewarm('processPayment', 5)

// Configure rate limits per function
functions.setRateLimit('processPayment', {
  windowMs: 60000,
  maxRequests: 1000
})

// Structured logging with correlation
await functions.log(executionId, 'info', 'Payment initiated', {
  customerId: 'cus_abc',
  amount: 5000
})
```

### Tree-Shakable

```typescript
import { Function } from 'function.do'       // Full featured
import { Function } from 'function.do/tiny'  // Minimal (~5KB)
import { Function } from 'function.do/rpc'   // Heavy deps via RPC
```

---

## Start Building

Stop flying blind. Give your functions the memory they deserve.

```bash
npm install function.do
```

```typescript
import { Function } from 'function.do'

export class MyFunctions extends Function {
  // Deploy, invoke, observe - all tracked automatically
}
```

Your on-call rotation will thank you.

---

[function.do](https://function.do) | Part of the [workers.do](https://workers.do) platform

MIT License
