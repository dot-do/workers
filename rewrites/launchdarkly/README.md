# launchdarkly.do

LaunchDarkly on Cloudflare Durable Objects - Feature flags and experimentation at the edge.

## The Problem

Feature flags need to be fast. Really fast. Every millisecond of evaluation latency multiplies across millions of requests.

Traditional feature flag services:
- Evaluate flags in a central region
- Add network latency to every request
- Struggle with real-time updates
- Charge per MAU, not usage

## The Vision

Feature flags evaluated at the edge. Sub-millisecond. Real-time updates. Pay for what you use.

```typescript
import { init } from 'launchdarkly.do'
// or: import { init } from 'experiments.do'

const client = init({
  sdkKey: 'sdk-xxxx',
  options: { kvNamespace: env.FLAGS_KV }
})

await client.waitForInitialization()

// Sub-ms evaluation at edge
const showNewUI = await client.variation('new-ui', context, false)
const buttonColor = await client.variation('button-color', context, 'blue')
```

Drop-in compatible with `@launchdarkly/node-server-sdk`.

## Features

- **Sub-ms Flag Evaluation** - FNV32a hashing, KV cache, edge evaluation
- **Real-time Updates** - SSE/WebSocket streaming, <1s propagation
- **Targeting Rules** - MongoDB-style conditions ($eq, $in, $gt, $regex...)
- **User Segments** - Group users by attributes for targeted rollouts
- **A/B Experiments** - Variation assignment, exposure tracking, metrics
- **Statistical Analysis** - Bayesian + Frequentist, CUPED variance reduction
- **SDK Compatibility** - Drop-in for LaunchDarkly Node SDK
- **Audit Log** - Full history of flag changes

## Architecture

```
                    +-----------------------+
                    |   launchdarkly.do     |
                    |   (Cloudflare Worker) |
                    +-----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | FlagEvaluatorDO  | |   ExperimentDO   | |   StreamingDO    |
    |  SQLite + KV     | |  SQLite + Stats  | |  WebSocket/SSE   |
    +------------------+ +------------------+ +------------------+
```

**Key Components**:
- `FlagEvaluatorDO` - Flag configuration and evaluation logic
- `ExperimentDO` - Experiment state, exposures, conversions, analysis
- `StreamingDO` - Real-time flag update distribution

## Installation

```bash
npm install launchdarkly.do
# or
npm install experiments.do
```

## Quick Start

### Basic Flag Evaluation

```typescript
import { init } from 'launchdarkly.do'

const client = init({
  sdkKey: env.LD_SDK_KEY,
  options: { kvNamespace: env.FLAGS_KV }
})

await client.waitForInitialization()

const context = {
  kind: 'user',
  key: 'user-123',
  email: 'user@example.com',
  custom: {
    plan: 'pro',
    country: 'US'
  }
}

// Boolean flag
const enabled = await client.variation('feature-x', context, false)

// String flag
const variant = await client.variation('checkout-flow', context, 'control')

// JSON flag
const config = await client.variation('pricing-config', context, { tier: 'basic' })

// With evaluation reason
const detail = await client.variationDetail('feature-x', context, false)
// { value: true, variationIndex: 1, reason: { kind: 'RULE_MATCH', ruleIndex: 0 } }
```

### Targeting Rules

```typescript
// Flag configuration with targeting rules
const flagConfig = {
  key: 'new-checkout',
  name: 'New Checkout Flow',
  type: 'boolean',
  defaultValue: false,
  rules: [
    {
      id: 'beta-users',
      condition: { plan: { $in: ['pro', 'enterprise'] } },
      variations: [{ value: true, weight: 1.0 }]
    },
    {
      id: 'us-rollout',
      condition: { country: 'US' },
      coverage: 0.5,  // 50% of matching users
      variations: [{ value: true, weight: 1.0 }]
    }
  ]
}
```

### Experiments

```typescript
import { Experiment } from 'launchdarkly.do'

const experiment = new Experiment(env.EXPERIMENTS)

// Get experiment assignment
const assignment = await experiment.assign('checkout-redesign', {
  userId: 'user-123',
  attributes: { plan: 'pro' }
})
// { variation: 'treatment', payload: { layout: 'single-page' } }

// Track conversion
await experiment.track('purchase', {
  userId: 'user-123',
  value: 99.99,
  properties: { sku: 'WIDGET-001' }
})

// Get results
const results = await experiment.getResults('checkout-redesign')
// {
//   variations: [
//     { id: 'control', users: 5000, conversions: 150, rate: 0.03 },
//     { id: 'treatment', users: 5000, conversions: 180, rate: 0.036 }
//   ],
//   analysis: {
//     method: 'bayesian',
//     winner: 'treatment',
//     chanceToWin: 0.92,
//     uplift: 0.20
//   }
// }
```

### Real-time Streaming

```typescript
import { StreamingClient } from 'launchdarkly.do'

const stream = new StreamingClient({
  sdkKey: env.LD_SDK_KEY,
  onUpdate: (flag) => {
    console.log(`Flag ${flag.key} changed to`, flag.value)
  }
})

await stream.connect()
// Receives updates within <1s of flag changes
```

## API Overview

### LDClient

- `init(config)` - Initialize client
- `waitForInitialization()` - Wait for flags to load
- `variation(key, context, default)` - Evaluate flag
- `variationDetail(key, context, default)` - Evaluate with reason
- `allFlagsState(context)` - Get all flags for context
- `close()` - Shutdown client

### Targeting Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `$eq` | Equals | `{ plan: { $eq: 'pro' } }` |
| `$ne` | Not equals | `{ status: { $ne: 'banned' } }` |
| `$in` | In array | `{ country: { $in: ['US', 'CA'] } }` |
| `$nin` | Not in array | `{ country: { $nin: ['CN'] } }` |
| `$gt`, `$gte` | Greater than | `{ age: { $gte: 18 } }` |
| `$lt`, `$lte` | Less than | `{ usage: { $lt: 1000 } }` |
| `$exists` | Property exists | `{ premium: { $exists: true } }` |
| `$regex` | Regex match | `{ email: { $regex: '@corp\\.com$' } }` |
| `$and`, `$or` | Logical | `{ $and: [...] }` |

### Statistical Analysis

**Bayesian** (default):
- Chance to win (probability treatment beats control)
- Expected loss (risk of choosing wrong)
- 95% credible intervals

**Frequentist**:
- P-value with configurable significance (0.01, 0.05, 0.1)
- Confidence intervals
- Relative uplift

**Variance Reduction**:
- CUPED using pre-experiment data
- Winsorization for outliers
- SRM (Sample Ratio Mismatch) detection

## The Rewrites Ecosystem

launchdarkly.do is part of the rewrites family:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| **launchdarkly.do** | LaunchDarkly | Feature flags for AI |
| [kafka.do](https://kafka.do) | Kafka | Event streaming for AI |

## Why Durable Objects?

1. **Edge Evaluation** - Flags evaluated at nearest PoP
2. **Consistent Bucketing** - Deterministic hashing, no race conditions
3. **Real-time Updates** - WebSocket hibernation for efficient streaming
4. **SQLite Storage** - Fast flag lookups, experiment metrics
5. **Global Scale** - Millions of concurrent evaluations

## License

MIT
