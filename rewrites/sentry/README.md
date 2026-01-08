# sentry.do

> Error Monitoring. Edge-Native. AI-First. Open by Default.

Sentry charges $26/member/month for Team, $80/member for Business. Reserved capacity. Per-event pricing. Usage spikes punish you. Self-hosting requires 10+ services and a full-time SRE. Meanwhile, your AI agents throw millions of errors and your bill explodes.

**sentry.do** is the open-source alternative. Sub-50ms ingestion. Deploys in minutes. AI agents that debug themselves.

## AI-Native API

```typescript
import { sentry } from 'sentry.do'           // Full SDK
import { sentry } from 'sentry.do/tiny'      // Minimal client
import { sentry } from 'sentry.do/compat'    // Drop-in Sentry SDK replacement
```

Natural language for error monitoring:

```typescript
import { sentry } from 'sentry.do'

// Talk to it like a colleague
const issues = await sentry`top errors this week`
const checkout = await sentry`errors affecting checkout`
const spikes = await sentry`error spikes in the last hour`

// Chain like sentences
await sentry`unresolved errors assigned to me`
  .notify(`@channel heads up on these`)

// Errors that debug themselves
await sentry`database connection failed in checkout`
  .investigate()        // AI analyzes root cause
  .suggest()           // proposes fix
  .assign('ralph')     // routes to dev agent
```

## The Problem

Sentry dominates error monitoring but:

| What Sentry Charges | The Reality |
|---------------------|-------------|
| **Per-Event Pricing** | $0.00029/event adds up fast |
| **Reserved Capacity** | Pay for 500K even if you use 100K |
| **Overage Fees** | Surprise bills when traffic spikes |
| **Self-Hosting** | 10+ services (Kafka, Redis, Postgres, ClickHouse...) |
| **AI Features** | "Autofix" is premium only |
| **Team Seats** | $26-80/member/month |

### The Edge Problem

Every error travels:
```
Your Edge Worker -> Internet -> Sentry US/EU -> Processing -> Your Dashboard
```

That's 50-200ms latency per error. For AI agents making thousands of decisions per second, this is unacceptable.

### The Self-Hosting Tax

Want to run your own Sentry?

```
Kafka (3 nodes)
Redis Cluster
PostgreSQL
ClickHouse Cluster
Snuba
Symbolicator
Relay
Web Workers
Cron Workers
```

Full-time SRE required. $5K+/month in infrastructure. Updates break things.

### The AI Gap

AI agents need to understand and fix their own errors. Current error monitoring:
- Alerts humans (who are asleep)
- Groups by stack trace (missing semantic context)
- Suggests fixes (premium only, often wrong)
- No MCP integration

## The Solution

**sentry.do** reimagines error monitoring for the edge and AI:

```
Sentry                              sentry.do
-----------------------------------------------------------------
50-200ms latency                    Sub-50ms edge ingestion
$0.00029/event + overages           Flat pricing, unlimited events
10+ services to self-host           One Durable Object
Premium-only AI features            AI-native, Quinn investigates
Human-centric alerting              Agent-first error handling
Stack trace grouping                Semantic grouping with AI
US/EU regions only                  Global edge, your account
```

## One-Click Deploy

```bash
npx create-dotdo sentry
```

Edge-native error monitoring. Running on infrastructure you control.

```typescript
import { Sentry } from 'sentry.do'

export default Sentry({
  name: 'my-startup',
  domain: 'errors.my-startup.com',
})
```

## Features

### Error Capture

```typescript
// Report errors naturally
await sentry`database connection failed in checkout`
await sentry`payment timeout for order ${orderId}`
await sentry`user ${userId} hit rate limit on /api/search`

// AI infers severity, tags, and context
await sentry`critical: payment processing down`     // severity: fatal
await sentry`checkout button not responding`        // severity: error, tag: checkout
await sentry`slow query on user lookup`            // severity: warning
```

### Error Investigation

```typescript
// Query your errors naturally
const recent = await sentry`errors in the last hour`
const critical = await sentry`unresolved critical errors`
const checkout = await sentry`errors affecting checkout this week`

// AI-powered investigation
await sentry`investigate error abc123`
  .explain()    // what happened and why
  .suggest()    // how to fix it
  .similar()    // related errors
```

### Error Resolution

```typescript
// Fix workflows with AI agents
await sentry`error abc123`
  .investigate()
  .map(findings => ralph`fix this: ${findings}`)
  .map(fix => tom`review fix for ${fix}`)

// Or let Quinn (QA) handle the whole thing
await quinn`investigate and fix error abc123`
```

### Issue Management

```typescript
// Manage issues naturally
await sentry`mark abc123 resolved`
await sentry`assign xyz789 to ralph`
await sentry`ignore errors from /health endpoint`
await sentry`merge abc123 and def456`

// Bulk operations
await sentry`resolve all checkout errors from yesterday`
await sentry`assign authentication errors to tom`
```

### Alerting

```typescript
// Configure alerts naturally
await sentry`alert slack #engineering on critical errors`
await sentry`page on-call when error rate spikes 50%`
await sentry`notify ralph when checkout errors exceed 10/minute`

// Smart alerting (AI groups related issues)
await sentry`alert on new issue types only`
```

### Source Maps

```typescript
// Upload source maps naturally
await sentry`upload sourcemaps from ./dist for release 1.0.0`

// Query with symbolication
await sentry`errors in checkout.ts line 42`
```

## Promise Pipelining

Chain operations without round trips:

```typescript
// One network call, multiple operations
await sentry`critical errors this week`
  .map(error => quinn`investigate ${error}`)
  .map(findings => ralph`fix ${findings}`)
  .map(fix => [tom, priya].map(r => r`review ${fix}`))

// AI agent workflows
const resolved = await sentry`unresolved errors in payments`
  .each(error => error.investigate().suggest())
  .filter(e => e.confidence > 0.8)
  .each(error => error.assign('ralph'))
```

## Sentry SDK Compatibility

Drop-in replacement - just change the DSN:

```typescript
import * as Sentry from 'sentry.do/compat'

// Works with existing code
Sentry.init({
  dsn: 'https://key@errors.do/123',  // Point to your instance
})

// All existing Sentry SDK code works
Sentry.captureException(new Error('Something went wrong'))
Sentry.setUser({ id: 'user-123' })
Sentry.addBreadcrumb({ category: 'ui', message: 'Button clicked' })
```

## Cloudflare Workers Integration

```typescript
import { withSentry } from 'sentry.do/cloudflare'

export default withSentry({
  dsn: 'https://key@errors.do/123',
  handler: {
    async fetch(request, env, ctx) {
      // Errors automatically captured
      throw new Error('Worker error')
    }
  }
})
```

## AI Agent Integration

```typescript
import { quinn, ralph, tom } from 'agents.do'

// Quinn (QA) investigates errors
await quinn`what are the top unresolved errors this week?`
await quinn`investigate the checkout error spike`

// Ralph (Dev) debugs and fixes
await ralph`investigate error sentry-abc123 and suggest a fix`
await ralph`implement fix for ${findings}`

// Full workflow: detect -> investigate -> fix -> review
await sentry`new critical errors`
  .map(e => quinn`investigate ${e}`)
  .map(findings => ralph`fix ${findings}`)
  .map(fix => tom`review ${fix}`)
```

## Architecture

### Edge-Native Design

```
                    +-----------------------+
                    |     errors.do         |
                    |   (Cloudflare Worker) |
                    +-----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | ErrorIngestionDO | | IssueGroupingDO  | | SymbolicationDO  |
    |  Edge capture    | |  AI-powered      | |  Source maps     |
    |  <10ms p50       | |  fingerprinting  | |  symbolication   |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
                    +-------------------+
                    |  SQLite (hot)     |
                    |  R2 (warm/cold)   |
                    +-------------------+
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active issues, recent events | <10ms |
| **Warm** | R2 + SQLite Index | Historical events (30-90 days) | <100ms |
| **Cold** | R2 Archive | Compliance retention | <1s |

### Per-Project Isolation

Each project gets its own Durable Object. Complete data isolation. No noisy neighbor problems.

## vs Sentry

| Feature | Sentry | sentry.do |
|---------|--------|-----------|
| **Latency** | 50-200ms | <10ms edge |
| **Pricing** | Per-event + overages | Flat rate |
| **Self-Hosting** | 10+ services | One Durable Object |
| **AI Features** | Premium only | Built-in, open |
| **Agent Integration** | None | MCP native |
| **Data Location** | US/EU only | Your Cloudflare account |
| **Semantic Grouping** | Stack trace only | AI-powered |
| **Auto-Fix** | Premium, limited | Quinn + Ralph |

## Use Cases

### AI Agent Monitoring

```typescript
// Every agent gets their own error context
const ralphErrors = await sentry`errors from agent ralph today`
const quinnErrors = await sentry`errors from agent quinn today`

// Agents can monitor themselves
await ralph`check my recent errors and investigate any critical ones`
```

### Multi-Tenant Applications

```typescript
// Errors by tenant
await sentry`errors for tenant acme-corp this week`
await sentry`which tenants have the most errors?`

// Isolation by design
// Each tenant can have their own error.do instance
```

### CI/CD Integration

```typescript
// Block deploys on error spikes
await sentry`error rate for release 1.2.3`
await sentry`regressions in the last deploy`

// Release tracking
await sentry`compare errors between 1.2.2 and 1.2.3`
```

### On-Call Workflows

```typescript
// Smart on-call
await sentry`critical unresolved errors I should know about`
await sentry`errors affecting > 100 users`

// AI triage
await sentry`prioritize tonight's errors by impact`
  .each(e => e.investigate())
  .notify('#on-call')
```

## Roadmap

### Core
- [x] Error ingestion (<10ms p50)
- [x] Issue grouping (fingerprinting)
- [x] Source map support
- [x] Sentry SDK compatibility
- [x] Natural language API
- [ ] Performance monitoring (traces)
- [ ] Session replay
- [ ] Cron monitoring

### AI
- [x] Semantic grouping
- [x] AI investigation (Quinn)
- [x] Fix suggestions (Ralph)
- [x] MCP tools
- [ ] Auto-fix with review (experimental)
- [ ] Predictive alerting
- [ ] Root cause analysis

### Integrations
- [x] Slack alerts
- [x] Discord alerts
- [x] Webhook notifications
- [ ] PagerDuty
- [ ] Opsgenie
- [ ] Linear/Jira issue creation

## Contributing

```bash
git clone https://github.com/dotdo/sentry.do
cd sentry.do
pnpm install
pnpm test
```

## License

MIT License

---

<p align="center">
  <strong>Error monitoring for the edge age.</strong>
  <br />
  Sub-50ms ingestion. AI-native debugging. Your infrastructure.
  <br /><br />
  <a href="https://sentry.do">Website</a> |
  <a href="https://docs.sentry.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/sentry.do">GitHub</a>
</p>
