# fivetran.do

Data pipelines that speak human. Stop configuring. Start commanding.

## The Hero

Your data team is drowning. You're paying Fivetran $50k+/year for something that should be simple. Every new connector takes 3-5 days of back-and-forth with support. Something breaks at 2am and you're debugging a black box. You're locked into their ecosystem with no exit strategy.

You just want to say: *"sync Salesforce to our warehouse every 15 minutes"* and have it work.

## The Vision

Data pipelines you can talk to.

```typescript
import { fivetran } from '@dotdo/fivetran'

fivetran`sync salesforce every 15 minutes to d1`
fivetran`connect stripe payments to data lake`
fivetran`what's broken?`  // Returns status of failing connectors
fivetran`fix the broken connectors`  // AI handles it
```

Not configuration files. Not 47 dropdown menus. Just say what you want.

## Promise Pipelining

Chain operations with zero round-trip latency.

```typescript
const synced = await fivetran`list all connectors`
  .map(connector => fivetran`sync ${connector}`)
  .map(result => fivetran`verify ${result}`)
// One network round trip!

// Parallel syncs with verification
const verified = await fivetran`find stale connectors`
  .map(connector => fivetran`refresh ${connector}`)
  .filter(result => result.status === 'healthy')
  .map(result => fivetran`log ${result} to audit trail`)
```

CapnWeb pipelining means your data flows as fast as your thoughts.

## Agent Integration

Let your AI team handle data infrastructure.

```typescript
import { tom, ralph, priya } from 'agents.do'

// Tom sets up the data infrastructure
tom`set up automated sync from Salesforce to our warehouse`

// Ralph builds pipelines for new features
ralph`create a pipeline to sync Stripe subscriptions for the billing dashboard`

// Priya monitors data quality
priya`check if our customer data is current and flag any sync issues`

// Chain of command
const pipeline = await priya`plan the data architecture for Q1`
  .map(spec => tom`implement ${spec}`)
  .map(impl => ralph`test ${impl}`)
  .map(tested => priya`verify ${tested} meets requirements`)
```

## The Stakes

| Pain Point | Fivetran | fivetran.do |
|------------|----------|-------------|
| **Monthly Cost** | $5,000-50,000+/mo | $50-500/mo (90% less) |
| **New Connector Lead Time** | 3-5 business days | Instant - just ask |
| **Schema Changes** | Manual migration dance | AI handles it automatically |
| **Debugging** | Black box logs | Natural language: "why did Salesforce sync fail?" |
| **Vendor Lock-in** | Proprietary everything | Open, portable, yours |
| **Scaling** | Per-row pricing anxiety | Flat rate, sync freely |

**The math**: A Series A startup paying Fivetran $4,000/month saves $43,200/year switching to fivetran.do. That's a full-time data engineer you don't need to hire.

## Quick Start

```bash
npm install @dotdo/fivetran
```

```typescript
import { fivetran } from '@dotdo/fivetran'

// Natural language setup
await fivetran`connect to my salesforce org using ${env.SALESFORCE_CREDENTIALS}`
await fivetran`sync accounts, contacts, and opportunities to d1 every hour`
await fivetran`notify me on slack when sync fails`

// That's it. You're done.
```

## When You Need Control

The structured API is always there when you need precision.

```typescript
import { Fivetran } from '@dotdo/fivetran'

const fivetran = new Fivetran({ id: 'my-data-platform' })

// Define a connector with explicit configuration
const salesforce = fivetran.createConnector({
  id: 'salesforce-prod',
  source: {
    type: 'salesforce',
    credentials: env.SALESFORCE_CREDENTIALS,
    objects: ['Account', 'Contact', 'Opportunity']
  },
  destination: {
    type: 'd1',
    database: env.ANALYTICS_DB
  },
  sync: {
    schedule: 'every 15 minutes',
    mode: 'incremental'
  }
})

// Trigger manual sync
await salesforce.sync()

// Check sync status
const status = await salesforce.status()
// { lastSync: '2024-01-15T10:30:00Z', status: 'healthy', rowsSynced: 15420 }
```

## Features

- **500+ Pre-built Connectors** - Salesforce, HubSpot, Stripe, databases, APIs
- **Natural Language Control** - Tagged templates for intuitive pipeline management
- **Promise Pipelining** - Chain operations with single round-trip via CapnWeb
- **Automated Schema Migrations** - AI handles source changes without breaking pipelines
- **Incremental Updates** - Sync only what changed, efficiently
- **AI-Native** - MCP tools for autonomous data operations
- **Self-Healing** - Automatic retry, backfill, and error resolution

## Architecture

```
                    +----------------------+
                    |    fivetran.do       |
                    |  (Cloudflare Worker) |
                    +----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    |   ConnectorDO    | |  DestinationDO   | |    SyncDO        |
    | (source configs) | | (target schemas) | | (sync state)     |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    |     D1/R2        | | Cloudflare Queues| |   MCP Tools      |
    |  (data storage)  | | (sync jobs)      | | (AI operations)  |
    +------------------+ +------------------+ +------------------+
```

**Key insight**: Durable Objects provide reliable connector state and sync coordination. Each connector gets its own DO for isolation. Queues handle job scheduling. AI interprets your intent and executes.

## Connector Types

### Sources

```typescript
// Databases
fivetran`sync postgres tables users, orders, products to warehouse`
fivetran`connect mysql with logical replication for real-time sync`
fivetran`stream mongodb collections to data lake`

// SaaS
fivetran`pull salesforce data every 15 minutes`
fivetran`sync hubspot contacts and deals hourly`
fivetran`connect stripe for payment analytics`

// APIs
fivetran`fetch data from ${apiEndpoint} daily`
fivetran`sync graphql schema from ${endpoint}`
```

### Destinations

```typescript
// Cloudflare-native
fivetran`send all data to d1 database analytics`
fivetran`archive to r2 in parquet format`

// External warehouses
fivetran`sync to snowflake account ${account}`
fivetran`export to bigquery project ${project}`
```

## Transformations

```typescript
// SQL transforms (natural language)
fivetran`sync users but lowercase all emails and filter inactive`

// Or explicit SQL
const connector = fivetran.createConnector({
  // ...
  transform: {
    type: 'sql',
    query: `
      SELECT
        id,
        LOWER(email) as email,
        created_at
      FROM {{ source }}
      WHERE status = 'active'
    `
  }
})

// TypeScript transforms
const connector = fivetran.createConnector({
  // ...
  transform: {
    type: 'function',
    fn: (row) => ({
      ...row,
      email: row.email.toLowerCase(),
      fullName: `${row.firstName} ${row.lastName}`
    })
  }
})
```

## Monitoring

```typescript
// Natural language monitoring
fivetran`what's the status of all connectors?`
fivetran`which syncs failed in the last 24 hours?`
fivetran`how many rows did we sync last week?`

// Programmatic
fivetran.onSyncComplete(async (event) => {
  console.log(`Sync completed: ${event.connectorId}`)
  console.log(`Rows synced: ${event.stats.rowsSynced}`)
})

fivetran.onSyncError(async (event) => {
  // AI can automatically diagnose and fix
  await fivetran`diagnose and fix ${event.error}`
})
```

## AI Self-Healing

When things break, fivetran.do fixes itself.

```typescript
// Traditional approach: wake up at 2am, debug for hours
// fivetran.do approach:

fivetran.onSyncError(async (error) => {
  // AI diagnoses the issue
  const diagnosis = await fivetran`why did ${error.connector} fail?`

  // AI fixes it if possible
  const fix = await fivetran`fix ${diagnosis}`

  // If AI can't fix, escalate to human with full context
  if (!fix.resolved) {
    await slack.notify({
      channel: '#data-team',
      message: `Sync issue needs human attention: ${diagnosis.summary}`,
      context: diagnosis.fullContext
    })
  }
})
```

## Cost Comparison

| Usage Level | Fivetran Pricing | fivetran.do | Savings |
|-------------|------------------|-------------|---------|
| Startup (10 connectors) | $1,200/mo | $75/mo | $13,500/yr |
| Growth (50 connectors) | $5,000/mo | $250/mo | $57,000/yr |
| Scale (200 connectors) | $25,000/mo | $1,000/mo | $288,000/yr |
| Enterprise (500+) | $50,000+/mo | $2,500/mo | $570,000+/yr |

**Why the difference?** Fivetran charges per Monthly Active Row (MAR) with aggressive tier pricing. fivetran.do runs on Cloudflare's efficient infrastructure with usage-based pricing that scales linearly.

## The Rewrites Ecosystem

fivetran.do is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| [airbyte.do](https://airbyte.do) | Airbyte | Data integration for AI |
| **fivetran.do** | Fivetran | Data pipelines for AI |
| [kafka.do](https://kafka.do) | Kafka | Event streaming for AI |

Each rewrite follows the same pattern:
- Natural language first (tagged templates)
- Promise pipelining for efficient chains
- Durable Objects for state
- Compatible structured API when you need it

## The workers.do Platform

fivetran.do is a core service of [workers.do](https://workers.do) - the platform for building Autonomous Startups.

```typescript
import { priya, ralph, tom, mark } from 'agents.do'
import { fivetran } from '@dotdo/fivetran'

// AI agents that handle your entire data infrastructure
const dataTeam = {
  architect: tom,    // Designs data pipelines
  builder: ralph,    // Implements connectors
  product: priya,    // Defines data requirements
  analytics: mark,   // Creates reports
}

// Natural language orchestration
await tom`design a data pipeline for our new analytics dashboard`
  .map(design => ralph`implement ${design} with fivetran`)
  .map(pipeline => priya`verify ${pipeline} meets product requirements`)
  .map(verified => mark`create executive dashboard from ${verified}`)
```

Both kinds of workers. Working for you.

## Why Cloudflare?

1. **Global Edge** - Connectors run close to data sources
2. **No Cold Starts** - Durable Objects stay warm
3. **Unlimited Duration** - Long-running syncs supported
4. **Built-in Queues** - Reliable job scheduling
5. **D1 + R2** - Native destinations for data lake
6. **AI-Native** - Natural language control with LLM integration

## Related Domains

- **etl.do** - Extract, transform, load pipelines
- **pipelines.do** - Data pipeline orchestration
- **sync.do** - Real-time data synchronization
- **airbyte.do** - Open-source data integration

## License

MIT
