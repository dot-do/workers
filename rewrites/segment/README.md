# segment.do

> Customer Data Platform. Edge-Native. Open by Default. AI-First.

Twilio paid $3.2 billion for Segment. Now they charge per Monthly Tracked User, gate identity resolution behind enterprise tiers, and treat your customer data as their asset. Simple event tracking costs more than your database.

**segment.do** is the open-source alternative. Edge-native. GDPR-compliant by design. Deploys in minutes, not weeks. AI agents and humans share the same analytics pipeline.

## AI-Native API

```typescript
import { segment } from 'segment.do'           // Full SDK
import { segment } from 'segment.do/tiny'      // Minimal client
import { segment } from 'segment.do/server'    // Server-side only
```

Natural language for analytics:

```typescript
import { segment } from 'segment.do'

// Talk to it like a colleague
await segment`user-123 signed up from Google Ads`
await segment`user-123 started checkout with $99.99 in cart`
await segment`user-123 completed order #456 revenue $99.99`

// Chain like sentences
await segment`users who abandoned checkout`
  .notify(`Complete your purchase for 10% off`)

// Identity resolution just works
await segment`link anonymous-xyz to user-123`
await segment`merge user-123 with user-456`
```

## The Problem

Twilio Segment dominates customer data:

| What Segment Charges | The Reality |
|----------------------|-------------|
| **10K MTU** | $120/month |
| **100K MTU** | $1,200/month |
| **1M MTU** | $25,000+/month custom |
| **Identity Resolution** | Enterprise add-on |
| **Warehouse Sync** | Enterprise add-on |
| **First-Party Tracking** | DIY proxy setup |

### The MTU Tax

Every user you track costs money. But:

- Segment counts everyone, even anonymous visitors
- Price tiers punish growth
- "Business" tier gates essential features
- Enterprise sales calls for anything serious

### The Data Hostage Problem

Your customer data lives in Segment's infrastructure:

- They process your events in their cloud
- Cross-border data transfers (GDPR nightmare)
- Vendor lock-in via proprietary schemas
- Data portability means paying for exports

## The Solution

**segment.do** reimagines CDP for the edge:

```
Twilio Segment                      segment.do
-----------------------------------------------------------------
$120/mo for 10K MTU                 ~$5/mo for 10K MTU
Enterprise for identity             Identity resolution included
Enterprise for warehouse            Warehouse sync included
Proxy DIY for first-party           First-party native
Their infrastructure                Your Cloudflare account
Cross-border transfers              Process in-region
Proprietary schemas                 Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo segment
```

A complete CDP. Running on infrastructure you control. GDPR-compliant from day one.

```typescript
import { Segment } from 'segment.do'

export default Segment({
  name: 'my-analytics',
  domain: 'analytics.mysite.com',
})
```

## The Vision

Every AI agent gets their own analytics pipeline.

```typescript
import { tom, ralph, priya } from 'agents.do'
import { segment } from 'segment.do'

// Each agent tracks naturally
await segment`tom reviewed PR 123 - 450 lines approved`
await segment`ralph deployed v2.1.0 to production`
await segment`priya updated Q1 roadmap`

// Query your agents like a database
await segment`tom activity this week`
await segment`most active agents today`
```

Not a shared analytics account. Not MTU-based billing. Each agent has their own complete analytics pipeline.

## Features

### Event Tracking

```typescript
// Just say what happened
await segment`user-123 clicked signup button`
await segment`user-123 viewed pricing page`
await segment`user-123 searched for widgets`

// Revenue tracking reads like a receipt
await segment`user-123 purchased widget for $49.99`
await segment`user-123 subscribed to pro plan $99/month`
await segment`user-123 upgraded from starter to business`

// Batch events read like a story
await segment`
  user-123:
  - viewed homepage
  - clicked pricing
  - started trial
  - invited teammate
`
```

### Identity Resolution

```typescript
// Link anonymous to known
await segment`link anon-xyz to user-123`

// Merge identities across devices
await segment`merge mobile-user with desktop-user`

// B2B account association
await segment`user-123 joined Acme Corp enterprise plan`

// The identity graph updates automatically
await segment`who is user-123?`
```

### Destinations

```typescript
// Route events naturally
await segment`send to GA4 and Mixpanel`
await segment`send purchases to Facebook Pixel`
await segment`webhook all signups to Slack`

// Query destinations
await segment`where does user signup go?`
await segment`active destinations`
```

### Warehouse Sync

```typescript
// Query your events like a database
await segment`signups this week`
await segment`revenue by campaign last month`
await segment`users who viewed but didnt purchase`

// Export for analysis
await segment`export signups to parquet`
await segment`sync to BigQuery hourly`
```

## Architecture

### Durable Object per Identity

```
Event Ingestion Flow:

Browser/Server --> Cloudflare Worker --> IdentityDO --> Destinations
                        |                    |              |
                   Edge Auth           SQLite Graph    Queues + Workers
                  (same domain)       (per-user)      (fan-out)
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Recent events (30 days) | <10ms |
| **Warm** | R2 + Index | Historical (30-365 days) | <100ms |
| **Cold** | R2 Archive | Compliance (1+ years) | <1s |

### Identity Graph

Each user is a Durable Object. Single-threaded consistency for:
- Anonymous to known identity merging
- Cross-device identity resolution
- B2B account association
- GDPR right-to-erasure

## Browser Tracking

```typescript
import { segment } from 'segment.do'

// Just drop it in - no config needed
await segment`page view pricing`
await segment`button click signup-cta`
await segment`form submit contact-us`

// Automatic context capture
// - UTM parameters
// - Referrer
// - Device info
// - Geo location

// First-party tracking (bypass ad blockers)
// Deploy to analytics.yoursite.com
```

## Server Tracking

```typescript
import { segment } from 'segment.do/server'

// Server-side events
await segment`user-123 completed order $99.99`
await segment`user-123 subscription renewed`
await segment`user-123 api call to /users endpoint`

// Backend events with full context
await segment`
  user-123 checkout completed:
  - order: order-456
  - revenue: $99.99
  - items: 3
  - coupon: SAVE10
`
```

## Population Analytics

```typescript
// Query your users like a database
await segment`users who signed up this week`
await segment`users from Google Ads who converted`
await segment`churned users last 30 days`

// Cohort analysis
await segment`users who did X but not Y`
await segment`users active in January inactive in February`

// Funnel analysis
await segment`signup to purchase funnel this month`
```

## Supported Destinations

| Category | Destinations |
|----------|--------------|
| **Analytics** | GA4, Mixpanel, Amplitude, Heap, Posthog |
| **Marketing** | HubSpot, Mailchimp, Intercom, Customer.io |
| **Advertising** | Google Ads, Facebook Pixel, LinkedIn |
| **Data Warehouse** | BigQuery, Snowflake, ClickHouse, R2 |
| **Custom** | Webhooks, HTTP API |

### Destination Routing

```typescript
// Route by event type
await segment`send signups to HubSpot`
await segment`send purchases to GA4 and Facebook`
await segment`send all events to BigQuery`

// Conditional routing
await segment`send enterprise signups to Salesforce`
await segment`send errors to PagerDuty`
```

## vs Twilio Segment

| Feature | Twilio Segment | segment.do |
|---------|----------------|------------|
| **10K MTU** | $120/mo | ~$5/mo |
| **100K MTU** | $1,200/mo | ~$20/mo |
| **1M MTU** | $25,000+/mo | ~$150/mo |
| **Identity Resolution** | Enterprise add-on | Included |
| **Warehouse Sync** | Enterprise add-on | Included |
| **First-Party Tracking** | DIY proxy | Native |
| **Data Location** | Segment's cloud | Your account |
| **GDPR Compliance** | Their responsibility | Your control |
| **Lock-in** | Proprietary schemas | MIT licensed |

## Use Cases

### E-commerce

```typescript
// Track the full customer journey
await segment`user-123 viewed product widget-500`
await segment`user-123 added widget to cart`
await segment`user-123 started checkout $49.99`
await segment`user-123 completed purchase order-789`

// Abandonment recovery
await segment`users with abandoned carts`
  .notify(`Complete your purchase for free shipping`)
```

### SaaS

```typescript
// Product analytics
await segment`user-123 used feature advanced-reporting`
await segment`user-123 invited teammate to workspace`
await segment`user-123 hit usage limit on API calls`

// Churn prediction
await segment`users inactive 14 days with active subscription`
```

### Marketing

```typescript
// Campaign attribution
await segment`users from utm_source=google who converted`
await segment`compare conversion Facebook vs Google Q1`

// Audience sync
await segment`sync high-value users to Facebook Custom Audience`
await segment`export churned users to email re-engagement`
```

## GDPR Compliance

```typescript
// Right to access
await segment`export all data for user-123`

// Right to erasure
await segment`delete user-123`

// Data stays in your region
// No cross-border transfers
// You control the infrastructure
```

## Deployment Options

### Cloudflare Workers (Recommended)

```bash
npx create-dotdo segment
# Deploys to your Cloudflare account
```

### Self-Hosted

```bash
# Docker
docker run -p 8787:8787 dotdo/segment

# Kubernetes
kubectl apply -f segment-do.yaml
```

## The Rewrites Ecosystem

segment.do is part of the rewrites family:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| **segment.do** | Segment | CDP for AI |
| [kafka.do](https://kafka.do) | Kafka | Event streaming for AI |
| [mongo.do](https://mongo.do) | MongoDB | Document database for AI |

## The workers.do Platform

segment.do is a core service of [workers.do](https://workers.do) - the platform for building Autonomous Startups.

```typescript
import { priya, ralph, tom, mark } from 'agents.do'
import { segment } from 'segment.do'

// AI agents with full analytics
await segment`priya started Q1 roadmap planning`
await segment`ralph deployed authentication service`
await segment`tom approved PR 456 for merge`
await segment`mark published launch announcement`

// Query agent activity
await segment`agent activity this week`
await segment`most productive agent today`
```

Both kinds of workers. Working for you.

## Why Open Source for CDP?

### 1. Data Sovereignty

Your customer data is your most valuable asset:
- Process events in your infrastructure
- No vendor access to your data
- Full GDPR compliance by design
- Export anytime, no lock-in

### 2. Cost Transparency

MTU pricing punishes growth:
- Pay for compute, not users
- No enterprise sales calls
- No surprise tier jumps
- Scale predictably

### 3. Real Interoperability

Segment destinations are vendor agreements:
- Build your own destinations
- Modify existing connectors
- No API rate limit surprises
- Community-driven integrations

### 4. Privacy First

First-party tracking should be default:
- Same-domain collection
- No third-party cookies
- Ad blocker resistant
- User trust preserved

## Roadmap

### Core CDP
- [x] Event tracking (track, identify, page, group)
- [x] Identity resolution
- [x] Destination routing
- [x] First-party tracking
- [ ] Computed traits
- [ ] Predictive audiences
- [ ] Journey orchestration

### Destinations
- [x] Google Analytics 4
- [x] Mixpanel
- [x] Amplitude
- [x] Webhooks
- [ ] Facebook Pixel
- [ ] Google Ads
- [ ] Salesforce
- [ ] HubSpot

### Warehouse
- [x] R2 export
- [x] Parquet format
- [ ] Iceberg tables
- [ ] BigQuery sync
- [ ] Snowflake sync

## Contributing

segment.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/segment.do
cd segment.do
pnpm install
pnpm test
```

## License

MIT License - Track everything. Own everything.

---

<p align="center">
  <strong>The $3.2B acquisition ends here.</strong>
  <br />
  Edge-native. Privacy-first. User-owned.
  <br /><br />
  <a href="https://segment.do">Website</a> |
  <a href="https://docs.segment.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/segment.do">GitHub</a>
</p>
