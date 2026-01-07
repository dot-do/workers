# segment.do

Segment on Cloudflare Durable Objects - A Customer Data Platform for every AI agent.

## The Problem

AI agents need to track events. Millions of them. In real-time. Each routed to dozens of destinations.

Traditional CDPs were built for humans:
- Centralized infrastructure
- Complex pricing per MTU
- Slow identity resolution
- Data leaves your control

AI agents need the opposite:
- Edge-native, sub-millisecond ingestion
- Simple usage-based pricing
- Real-time identity resolution
- Data stays in your infrastructure

## The Vision

Every AI agent gets their own analytics pipeline.

```typescript
import { tom, ralph, priya } from 'agents.do'
import { Analytics } from 'segment.do'

// Each agent tracks their own events
const tomAnalytics = Analytics.for(tom)
const ralphAnalytics = Analytics.for(ralph)
const priyaAnalytics = Analytics.for(priya)

// Full Segment-compatible API
await tomAnalytics.track('Code Review Completed', {
  pr: 123,
  approved: true,
  linesReviewed: 450
})

await ralphAnalytics.identify('ralph@agents.do', {
  role: 'developer',
  expertise: ['typescript', 'rust']
})

await priyaAnalytics.page('Roadmap', {
  section: 'Q1 Planning'
})
```

Not a shared analytics account. Not MTU-based billing. Each agent has their own complete analytics pipeline.

## Features

- **Segment-Compatible API** - Drop-in replacement for analytics.js
- **Identity Resolution** - Durable Object-based identity graph
- **300+ Destinations** - Route events to GA4, Mixpanel, Amplitude, etc.
- **Warehouse Sync** - Real-time export to R2/Parquet/Iceberg
- **First-Party Tracking** - Bypass ad blockers with same-domain collection
- **Edge-Native** - Sub-millisecond ingestion at the edge
- **GDPR Compliant** - Process data in-region, no cross-border transfers

## Architecture

```
                    +-----------------------+
                    |     segment.do        |
                    |   (Cloudflare Worker) |
                    +-----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | IdentityDO (Tom) | |IdentityDO (Ralph)| | IdentityDO (...) |
    |   SQLite Graph   | |   SQLite Graph   | |   SQLite Graph   |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
                    +-------------------+
                    |    Destinations   |
                    | (Queues + Workers)|
                    +-------------------+
                              |
              +---------------+---------------+
              |               |               |
        +-----------+   +-----------+   +-----------+
        |    GA4    |   | Mixpanel  |   | Webhooks  |
        +-----------+   +-----------+   +-----------+
```

**Key insight**: Durable Objects provide single-threaded identity resolution. Each user's identity graph is a Durable Object. Workers handle ingestion. Queues handle destination delivery.

## Installation

```bash
npm install segment.do
```

## Quick Start

### Browser SDK

```typescript
import { Analytics } from 'segment.do'

const analytics = Analytics({
  writeKey: 'your-write-key',
  // First-party tracking (bypass ad blockers)
  apiHost: 'analytics.yoursite.com'
})

// Track events
analytics.track('Button Clicked', {
  buttonId: 'cta-signup',
  page: '/pricing'
})

// Identify users
analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro'
})

// Track page views
analytics.page('Pricing', {
  section: 'enterprise'
})
```

### Server SDK

```typescript
import { Analytics } from 'segment.do/server'

const analytics = Analytics({ writeKey: 'your-write-key' })

// Track server-side events
await analytics.track({
  userId: 'user_123',
  event: 'Order Completed',
  properties: {
    orderId: 'order_456',
    revenue: 99.99,
    products: [
      { id: 'prod_1', name: 'Widget', price: 49.99 }
    ]
  }
})

// Batch multiple events
await analytics.batch([
  { type: 'track', userId: 'user_123', event: 'Checkout Started' },
  { type: 'identify', userId: 'user_123', traits: { cartValue: 99.99 } }
])
```

### Identity Resolution

```typescript
import { Analytics } from 'segment.do'

const analytics = Analytics({ writeKey: 'your-write-key' })

// Anonymous tracking
analytics.track('Page Viewed')  // Uses anonymousId

// Later, identify the user
analytics.identify('user_123', {
  email: 'user@example.com'
})
// Anonymous events are now merged with user_123

// Alias for cross-device tracking
analytics.alias('user_123', 'previous_anonymous_id')
```

### Group (B2B)

```typescript
import { Analytics } from 'segment.do'

const analytics = Analytics({ writeKey: 'your-write-key' })

// Associate user with organization
analytics.group('org_456', {
  name: 'Acme Corp',
  plan: 'enterprise',
  employees: 500
})

// Events now include group context
analytics.track('Feature Used', {
  feature: 'advanced-reporting'
})
```

## API Overview

### Track API

| Endpoint | Description |
|----------|-------------|
| `POST /v1/track` | Track a single event |
| `POST /v1/page` | Track a page view |
| `POST /v1/screen` | Track a mobile screen view |
| `POST /v1/identify` | Identify a user with traits |
| `POST /v1/group` | Associate user with group |
| `POST /v1/alias` | Merge user identities |
| `POST /v1/batch` | Send multiple events |

### Event Schema

```typescript
interface SegmentEvent {
  type: 'track' | 'identify' | 'page' | 'screen' | 'group' | 'alias'
  anonymousId?: string
  userId?: string
  timestamp: string
  context: {
    ip?: string
    userAgent?: string
    locale?: string
    campaign?: { source, medium, term, content, name }
    device?: { type, manufacturer, model }
    os?: { name, version }
  }
  // Type-specific fields
  properties?: Record<string, unknown>  // track, page, screen
  traits?: Record<string, unknown>       // identify, group
  event?: string                          // track only
  groupId?: string                        // group only
}
```

## Destinations

### Supported Destinations

| Category | Destinations |
|----------|--------------|
| Analytics | GA4, Mixpanel, Amplitude, Heap, Posthog |
| Marketing | HubSpot, Mailchimp, Intercom, Customer.io |
| Advertising | Google Ads, Facebook Pixel, LinkedIn |
| Data Warehouse | BigQuery, Snowflake, ClickHouse, R2 |
| Custom | Webhooks, HTTP API |

### Destination Configuration

```typescript
// Configure destinations in dashboard or via API
const config = {
  destinations: {
    ga4: {
      enabled: true,
      measurementId: 'G-XXXXX',
      apiSecret: 'xxxxx'
    },
    mixpanel: {
      enabled: true,
      projectToken: 'xxxxx'
    },
    webhook: {
      enabled: true,
      url: 'https://your-server.com/webhook',
      headers: { 'X-API-Key': 'xxxxx' }
    }
  }
}
```

## Warehouse Sync

Real-time export to R2 in Parquet/Iceberg format:

```typescript
import { query } from 'segment.do/warehouse'

// Query events directly
const results = await query.sql(`
  SELECT
    event,
    count(*) as count,
    avg(revenue) as avgRevenue
  FROM events
  WHERE timestamp > now() - INTERVAL 7 DAY
  GROUP BY event
  ORDER BY count DESC
`)

// Export to external warehouse
await query.export({
  format: 'parquet',
  destination: 's3://your-bucket/events/',
  partitionBy: ['date', 'event']
})
```

## Pricing Comparison

| Feature | Segment | segment.do |
|---------|---------|------------|
| 10K MTU | $120/mo | ~$5/mo |
| 100K MTU | $1,200/mo | ~$20/mo |
| 1M MTU | Custom ($25K+) | ~$150/mo |
| Identity Resolution | Add-on | Included |
| Warehouse Sync | Add-on | Included |
| First-Party Tracking | Proxy setup | Native |

## The Rewrites Ecosystem

segment.do is part of the rewrites family:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| **segment.do** | Segment | CDP for AI |
| kafka.do | Kafka | Event streaming for AI |
| mongo.do | MongoDB | Document database for AI |

## The workers.do Platform

segment.do is a core service of [workers.do](https://workers.do) - the platform for building Autonomous Startups.

```typescript
import { priya, ralph, tom, mark } from 'agents.do'
import { Analytics } from 'segment.do'

// AI agents with full analytics
const startup = {
  product: priya,
  engineering: ralph,
  tech: tom,
  marketing: mark,
}

// Each agent tracks their own events
for (const [role, agent] of Object.entries(startup)) {
  const analytics = Analytics.for(agent)
  await analytics.track('Agent Started', {
    role,
    timestamp: new Date()
  })
}
```

Both kinds of workers. Working for you.

## License

MIT
