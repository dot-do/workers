# posthog.do

> Product Analytics. Edge-Native. AI-First. Open by Default.

PostHog charges $450/month for 2M events. Requires self-hosting for privacy. Treats AI agents as afterthoughts. Feature flags need configuration UIs. Funnels require point-and-click builders.

**posthog.do** is the open-source alternative. Privacy-first. Edge-native. Deploys in seconds. AI agents are first-class citizens.

## AI-Native API

```typescript
import { posthog } from 'posthog.do'           // Full SDK
import { posthog } from 'posthog.do/tiny'      // Minimal client
import { posthog } from 'posthog.do/flags'     // Feature flags only
```

Natural language for product analytics:

```typescript
import { posthog } from 'posthog.do'

// Talk to it like a PM
const funnel = await posthog`users who clicked buy but didn't checkout`
const cohort = await posthog`power users who logged in 10+ times last week`
const trend = await posthog`signups by country this month`

// Chain like sentences
await posthog`pro users who haven't used feature X`
  .notify(`Check out our new feature X!`)

// Feature flags that read like questions
const enabled = await posthog`is new-checkout-flow on for user-123?`
const variant = await posthog`which pricing-experiment variant for user-456?`
```

## The Problem

PostHog dominates open-source analytics but:

| What PostHog Charges | The Reality |
|----------------------|-------------|
| **Cloud Pricing** | $450/month for 2M events |
| **Self-Hosting** | Complex Kubernetes setup |
| **Feature Flags** | UI configuration required |
| **AI Agents** | No first-class support |
| **Edge Performance** | Centralized servers |

### AI Agents Need Analytics Too

Traditional analytics track humans clicking buttons. But AI agents need:
- One analytics instance per agent
- Distributed by default
- Automatic schema evolution
- Events captured at the edge

## The Solution

**posthog.do** reimagines analytics for AI-native applications:

```
PostHog Cloud                      posthog.do
-----------------------------------------------------------------
$450/month for 2M events          Usage-based, starts free
Complex self-hosting              Deploy in seconds
Centralized servers               Edge-native, global
UI configuration                  Code-first, natural language
Human-only analytics              AI agents are first-class
```

## One-Click Deploy

```bash
npx create-dotdo posthog
```

Product analytics on infrastructure you control. Edge-native from day one.

```typescript
import { PostHog } from 'posthog.do'

export default PostHog({
  name: 'my-app',
  domain: 'analytics.my-app.com',
})
```

## Features

### Event Capture

```typescript
// Just say what happened
await posthog`user-123 viewed dashboard on pro plan`
await posthog`user-123 purchased $99.99 USD`
await posthog`user-123 clicked buy then added to cart`

// AI infers the schema
await posthog`user-123 viewed dashboard`        // creates $pageview
await posthog`user-123 signed up`               // creates signup_completed
await posthog`user-123 purchased item abc`      // creates purchase with item_id
```

### Feature Flags

```typescript
// Flags are questions
const enabled = await posthog`is new-checkout-flow on for user-123?`
const variant = await posthog`which pricing-experiment for user-456?`
const flags = await posthog`all flags for user-123`

// With context - just describe it
const result = await posthog`is premium-feature on for user-123 on pro plan at acme-corp?`
```

### Experiments

```typescript
// Get experiment variant
const variant = await posthog`signup-flow variant for user-123`
// 'control' | 'variant-a' | 'variant-b'

// Track the whole experiment naturally
await posthog`user-123 started signup-flow experiment as ${variant}`
await posthog`user-123 completed signup in signup-flow experiment`
```

### Funnels

```typescript
// Funnels read like sentences
await posthog`funnel: pageview -> signup -> purchase in Jan 2024`
await posthog`funnel: landing -> trial -> paid last 30 days`.by('source')
await posthog`funnel: add to cart -> checkout -> payment for pro users`

// Get conversion rates
const conversion = await posthog`how many users go from trial to paid?`
const dropoff = await posthog`where do users drop off in onboarding?`
```

### Retention

```typescript
// Retention in plain English
await posthog`retention: signup -> return visit last month`
await posthog`retention: first purchase -> second purchase by week`
await posthog`do pro users come back more than free users?`
```

### Trends

```typescript
// Trends are just questions
await posthog`signups per day this month`
await posthog`purchases by country last 30 days`
await posthog`pageviews vs signups this week`.by('plan')

// Breakdowns are natural
await posthog`revenue by plan by month in 2024`
```

### Cohorts

```typescript
// Define cohorts naturally
await posthog`users who signed up in January`
await posthog`power users: 10+ logins last week`
await posthog`churned: no activity in 30 days`

// Use cohorts in queries
await posthog`retention for power users`
await posthog`funnel for users who came from Google`
```

### User Identification

```typescript
// Identify and alias
await posthog`user-123 is john@example.com on pro plan`
await posthog`anonymous-456 is actually user-123`

// Set properties
await posthog`user-123 upgraded to enterprise`
await posthog`user-123 works at Acme Corp with 50 employees`
```

## Agent Analytics

Every AI agent gets their own analytics instance:

```typescript
import { tom, ralph, priya } from 'agents.do'
import { posthog } from 'posthog.do'

// Each agent has isolated analytics
await posthog.for(tom)`reviewed PR 123 and approved`
await posthog.for(ralph)`build completed in 42s`
await posthog.for(priya)`wrote spec for auth feature`

// Query agent performance
await posthog.for(tom)`average review time this week`
await posthog`which agent completes tasks fastest?`
```

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
    | EventsDO (User)  | | EventsDO (Agent) | | EventsDO (...)   |
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

**Key insight**: Durable Objects provide single-threaded, strongly consistent state. Each project's analytics is a Durable Object. SQLite handles recent events. Analytics Engine handles aggregations at scale.

## vs PostHog

| Feature | PostHog | posthog.do |
|---------|---------|------------|
| **Pricing** | $450/month for 2M events | Usage-based, starts free |
| **Self-Hosting** | Complex Kubernetes | Deploy in seconds |
| **Configuration** | UI point-and-click | Natural language |
| **Feature Flags** | Dashboard required | Code-first |
| **AI Agents** | Not supported | First-class citizens |
| **Edge Performance** | Centralized | Global edge |
| **Data Location** | Their servers | Your Cloudflare account |
| **Open Source** | Yes | Yes, MIT licensed |

## Promise Pipelining

Chain operations without `Promise.all`:

```typescript
// Find users, analyze, and act - one network round trip
await posthog`users who abandoned checkout`
  .map(user => posthog`${user} purchase history`)
  .filter(history => history.total > 100)
  .notify(`Come back for 10% off!`)

// Parallel cohort analysis
await posthog`compare pro vs free users`
  .retention()
  .funnel(`signup -> activation -> payment`)
  .export()
```

## MCP Tools

AI-native analytics access via Model Context Protocol:

```typescript
// AI agents query analytics naturally
await agent`analyze our conversion funnel`
// Agent uses posthog MCP tools automatically

// Available tools
// - capture_event: Track user actions
// - query_funnel: Analyze conversion paths
// - query_retention: Measure user return rates
// - get_feature_flag: Check flag status
// - define_cohort: Create user segments
```

## Why Durable Objects?

1. **Single-threaded consistency** - No race conditions in event ordering
2. **Per-instance isolation** - Each project's analytics is completely separate
3. **Automatic scaling** - Millions of instances, zero configuration
4. **Global distribution** - Events captured at the edge
5. **SQLite inside** - Real SQL for analytics queries
6. **Analytics Engine** - Cloudflare's native time-series database

## The workers.do Platform

posthog.do is a core service of [workers.do](https://workers.do) - the platform for building Autonomous Startups.

```typescript
import { priya, ralph, tom, mark } from 'agents.do'
import { posthog } from 'posthog.do'

// Track your AI startup naturally
await posthog`priya wrote spec for auth feature`
await posthog`ralph implemented auth in 2 hours`
await posthog`tom reviewed and approved auth PR`
await posthog`mark wrote launch blog post`

// Query startup metrics
await posthog`average feature completion time this week`
await posthog`which agent ships fastest?`
await posthog`funnel: spec -> implement -> review -> ship`
```

Both kinds of workers. Working for you.

## License

MIT

---

<p align="center">
  <strong>Analytics that speak your language.</strong>
  <br />
  Edge-native. AI-first. Open source.
  <br /><br />
  <a href="https://posthog.do">Website</a> |
  <a href="https://docs.posthog.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/posthog.do">GitHub</a>
</p>
