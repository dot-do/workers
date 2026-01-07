# posthog.do

PostHog on Cloudflare Durable Objects - Product analytics for every AI agent.

## The Problem

AI agents need analytics. Millions of them. Running in parallel. Each isolated. Each with their own telemetry.

Traditional analytics were built for humans:
- One shared analytics instance for many users
- Centralized data warehouses
- Manual event schema management
- Expensive per-project

AI agents need the opposite:
- One analytics instance per agent
- Distributed by default
- Automatic schema evolution
- Free at the instance level, pay for usage

## The Vision

Every AI agent gets their own PostHog.

```typescript
import { tom, ralph, priya } from 'agents.do'
import { PostHog } from 'posthog.do'

// Each agent has their own isolated analytics
const tomAnalytics = PostHog.for(tom)
const ralphAnalytics = PostHog.for(ralph)
const priyaAnalytics = PostHog.for(priya)

// Full PostHog API
await tomAnalytics.capture('code_reviewed', { pr: 123, approved: true })
await ralphAnalytics.capture('build_completed', { success: true, duration: 42 })
await priyaAnalytics.capture('spec_written', { feature: 'auth' })
```

Not a shared analytics platform with project keys. Not a multi-tenant nightmare. Each agent has their own complete PostHog instance.

## Features

- **Event Capture** - `posthog.capture()` with full API compatibility
- **Feature Flags** - `posthog.isFeatureEnabled()` evaluated at the edge
- **Experiments** - A/B testing with deterministic bucketing
- **Analytics Queries** - Funnels, retention, cohorts
- **MCP Tools** - Model Context Protocol for AI-native analytics
- **Session Recording** - DOM snapshots (future)
- **Surveys** - In-app feedback (future)

## Architecture

```
                    +-----------------------+
                    |     posthog.do        |
                    |   (Cloudflare Worker) |
                    +-----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | EventsDO (Tom)   | | EventsDO (Ralph) | | EventsDO (...)   |
    |   SQLite + AE    | |   SQLite + AE    | |   SQLite + AE    |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
         +--------------------+--------------------+
         |                    |                    |
    +----------+       +-----------+        +------------+
    |    KV    |       |    D1     |        | Analytics  |
    |  (flags) |       |  (meta)   |        |  Engine    |
    +----------+       +-----------+        +------------+
```

**Key insight**: Durable Objects provide single-threaded, strongly consistent state. Each agent's analytics is a Durable Object. SQLite handles recent events. Analytics Engine handles aggregations at scale.

## Installation

```bash
npm install posthog.do
```

## Quick Start

### Event Capture

```typescript
import { PostHog } from 'posthog.do'

const posthog = new PostHog(env.POSTHOG)

// Capture events
await posthog.capture('$pageview', {
  distinct_id: 'user-123',
  properties: {
    $current_url: 'https://example.com/dashboard',
    plan: 'pro'
  }
})

// Capture with timestamp
await posthog.capture('purchase_completed', {
  distinct_id: 'user-123',
  timestamp: new Date('2024-01-15T10:30:00Z'),
  properties: {
    amount: 99.99,
    currency: 'USD'
  }
})

// Batch capture
await posthog.captureBatch([
  { event: 'item_viewed', distinct_id: 'user-123', properties: { item_id: 'abc' } },
  { event: 'item_added_to_cart', distinct_id: 'user-123', properties: { item_id: 'abc' } }
])
```

### Feature Flags

```typescript
import { PostHog } from 'posthog.do'

const posthog = new PostHog(env.POSTHOG)

// Simple boolean flag
const enabled = await posthog.isFeatureEnabled('new-checkout-flow', 'user-123')

// With context for targeting
const variant = await posthog.getFeatureFlag('pricing-experiment', 'user-123', {
  personProperties: {
    plan: 'pro',
    company_size: 50
  },
  groups: {
    company: 'acme-corp'
  }
})

// Get all flags for a user
const flags = await posthog.getAllFlags('user-123')
// { 'new-checkout-flow': true, 'pricing-experiment': 'variant-b', ... }
```

### Experiments

```typescript
import { PostHog } from 'posthog.do'

const posthog = new PostHog(env.POSTHOG)

// Get experiment variant (deterministic)
const variant = await posthog.getExperimentVariant('signup-flow', 'user-123')
// 'control' | 'variant-a' | 'variant-b'

// Track experiment exposure
await posthog.capture('$experiment_started', {
  distinct_id: 'user-123',
  properties: {
    $experiment_name: 'signup-flow',
    $experiment_variant: variant
  }
})

// Track conversion
await posthog.capture('signup_completed', {
  distinct_id: 'user-123',
  properties: {
    experiment: 'signup-flow',
    variant: variant
  }
})
```

### Analytics Queries

```typescript
import { PostHog } from 'posthog.do'

const posthog = new PostHog(env.POSTHOG)

// Funnel analysis
const funnel = await posthog.query.funnel({
  steps: ['$pageview', 'signup_started', 'signup_completed'],
  dateRange: { from: '2024-01-01', to: '2024-01-31' }
})
// { steps: [{ event: '$pageview', count: 1000, dropoff: 0.3 }, ...] }

// Retention analysis
const retention = await posthog.query.retention({
  startEvent: 'signup_completed',
  returnEvent: '$pageview',
  dateRange: { from: '2024-01-01', to: '2024-01-31' }
})
// { cohorts: [{ date: '2024-01-01', size: 100, retention: [1.0, 0.4, 0.3, ...] }] }

// Event trends
const trends = await posthog.query.trends({
  events: ['$pageview', 'signup_completed'],
  breakdown: 'plan',
  dateRange: { from: '2024-01-01', to: '2024-01-31' },
  interval: 'day'
})
```

### MCP Tools

```typescript
import { posthogTools, invokeTool } from 'posthog.do/mcp'

// List available analytics tools
console.log(posthogTools.map(t => t.name))
// ['capture_event', 'get_feature_flag', 'query_funnel', 'query_retention', ...]

// Invoke a tool
const result = await invokeTool('capture_event', {
  event: 'task_completed',
  distinct_id: 'agent-tom',
  properties: { task_type: 'code_review' }
})

// AI-native analytics access
await invokeTool('query_funnel', {
  natural: 'show me the signup funnel for pro users last month'
})
```

## API Overview

### Capture (`posthog.do`)

- `capture(event, options)` - Capture single event
- `captureBatch(events)` - Capture multiple events
- `identify(distinctId, properties)` - Set person properties
- `alias(alias, distinctId)` - Link identities

### Feature Flags (`posthog.do/flags`)

- `isFeatureEnabled(flag, distinctId, context?)` - Boolean check
- `getFeatureFlag(flag, distinctId, context?)` - Get variant
- `getAllFlags(distinctId, context?)` - Get all flags

### Experiments (`posthog.do/experiments`)

- `getExperimentVariant(experiment, distinctId)` - Get bucket
- `getExperimentResults(experiment)` - Get statistics

### Analytics (`posthog.do/analytics`)

- `query.funnel(options)` - Funnel analysis
- `query.retention(options)` - Retention analysis
- `query.trends(options)` - Event trends
- `query.paths(options)` - User paths

## The Rewrites Ecosystem

posthog.do is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare Durable Objects:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| **posthog.do** | PostHog | Product analytics for AI |
| mongo.do | MongoDB | Document database for AI |
| kafka.do | Kafka | Event streaming for AI |

Each rewrite follows the same pattern:
- Durable Object per instance (per agent)
- SQLite for hot tier storage
- Cloudflare primitives for scale (KV, Analytics Engine, D1)
- MCP tools for AI-native access
- Compatible API with the original

## Why Durable Objects?

1. **Single-threaded consistency** - No race conditions in event ordering
2. **Per-instance isolation** - Each agent's analytics is completely separate
3. **Automatic scaling** - Millions of instances, zero configuration
4. **Global distribution** - Events captured at the edge
5. **SQLite inside** - Real SQL for analytics queries
6. **Analytics Engine** - Cloudflare's native time-series database

## The workers.do Platform

posthog.do is a core service of [workers.do](https://workers.do) - the platform for building Autonomous Startups.

```typescript
import { priya, ralph, tom, mark } from 'agents.do'
import { PostHog } from 'posthog.do'

// AI agents with full-stack analytics
const startup = {
  product: priya,
  engineering: ralph,
  tech: tom,
  marketing: mark,
}

// Track agent activity
for (const [role, agent] of Object.entries(startup)) {
  const analytics = PostHog.for(agent)
  await analytics.capture('agent_started', {
    role,
    started: new Date(),
    status: 'active'
  })
}
```

Both kinds of workers. Working for you.

## License

MIT
