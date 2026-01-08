# fivetran.do

> Data Pipelines. Natural Language. Self-Healing. AI-First.

Fivetran charges $50k+/year for data pipelines. New connectors take 3-5 days. Something breaks at 2am and you're debugging a black box. You're locked into per-row pricing that scales against you.

**fivetran.do** is the open-source alternative. 500+ connectors. Natural language control. AI that fixes itself while you sleep.

## AI-Native API

```typescript
import { fivetran } from 'fivetran.do'           // Full SDK
import { fivetran } from 'fivetran.do/tiny'      // Minimal client
import { fivetran } from 'fivetran.do/sync'      // Sync-only operations
```

Natural language for data pipelines:

```typescript
import { fivetran } from 'fivetran.do'

// Talk to it like a data engineer
const salesforce = await fivetran`sync salesforce to snowflake`
const payments = await fivetran`stripe to data lake hourly`
const broken = await fivetran`what's broken?`

// Chain like sentences
await fivetran`stale connectors`
  .refresh()
  .verify()

// Self-healing pipelines
await fivetran`sync salesforce`
  .every('15 minutes')
  .onError(e => fivetran`diagnose and fix ${e}`)
```

## The Problem

Fivetran dominates data integration with per-row pricing that scales against you:

| What Fivetran Charges | The Reality |
|-----------------------|-------------|
| **Monthly Active Rows** | $0.50-5.00 per 1M rows |
| **Connector Setup** | 3-5 business days |
| **Enterprise Tier** | $50,000+/year |
| **Schema Changes** | Manual migration dance |
| **Debugging** | Black box logs |
| **Vendor Lock-in** | Proprietary everything |

### The Fivetran Tax

Your data grows. Your bill grows faster:
- 10M rows: $500/month
- 100M rows: $5,000/month
- 1B rows: $50,000/month

Every successful sync costs you more. Growth is punished.

### The Real Problem

Data engineers spend their time:
- Configuring dropdowns instead of building
- Debugging black boxes at 2am
- Waiting for connector support tickets
- Manually handling schema changes

## The Solution

**fivetran.do** reimagines data pipelines for the AI era:

```
Fivetran                            fivetran.do
-----------------------------------------------------------------
3-5 day connector setup             Connect in one line
$50k+/year enterprise               $500/year flat rate
Per-row pricing anxiety             Sync freely
Black box debugging                 "why did salesforce fail?"
Manual schema migrations            AI handles it
47 dropdown menus                   Natural language
```

## One-Click Deploy

```bash
npx create-dotdo fivetran
```

A data pipeline platform. Running on infrastructure you control. AI-native from day one.

```typescript
import { Fivetran } from 'fivetran.do'

export default Fivetran({
  name: 'my-data-platform',
  domain: 'data.my-startup.com',
})
```

## Features

### Connectors

```typescript
// Connect anything in one line
const salesforce = await fivetran`connect salesforce`
const stripe = await fivetran`connect stripe`
const postgres = await fivetran`connect postgres ${env.DATABASE_URL}`

// AI infers what you need
await fivetran`salesforce`              // connects to salesforce
await fivetran`sync salesforce`         // syncs existing connector
await fivetran`salesforce to snowflake` // full pipeline setup
```

### Syncing

```typescript
// Sync is one line
await fivetran`sync salesforce to d1`
  .objects('Account', 'Contact', 'Opportunity')
  .every('15 minutes')
  .incremental()

// Full refresh when you need it
await fivetran`full sync stripe to warehouse`

// Batch syncs just work
await fivetran`sync all stale connectors`
```

### Destinations

```typescript
// Natural as saying where data goes
await fivetran`salesforce to d1`
await fivetran`stripe to snowflake`
await fivetran`hubspot to bigquery`
await fivetran`all sources to data lake`

// Archive to R2
await fivetran`archive old data to r2 parquet`
```

### Scheduling

```typescript
// Natural as talking to a scheduler
await fivetran`sync salesforce every 15 minutes`
await fivetran`stripe hourly`
await fivetran`hubspot daily at 6am`

// Bulk scheduling just works
await fivetran`all connectors every hour`
```

### Transformations

```typescript
// Transform in plain English
await fivetran`sync users but lowercase emails and filter inactive`

// Or be specific
await fivetran`sync accounts`
  .transform(row => ({
    ...row,
    email: row.email.toLowerCase(),
    fullName: `${row.firstName} ${row.lastName}`
  }))
```

## Promise Pipelining

```typescript
// Chain operations - one network round trip
await fivetran`all connectors`
  .map(c => fivetran`sync ${c}`)
  .map(r => fivetran`verify ${r}`)

// Parallel syncs with verification
await fivetran`stale connectors`
  .refresh()
  .filter(r => r.status === 'healthy')
  .audit()
```

## AI-Native Data Pipelines

### Self-Healing

```typescript
// Pipelines that fix themselves
await fivetran`sync salesforce`
  .onError(async (error) => {
    const diagnosis = await fivetran`why did ${error.connector} fail?`
    const fix = await fivetran`fix ${diagnosis}`
    if (!fix.resolved) {
      await slack.notify('#data-team', diagnosis.summary)
    }
  })

// Or just ask
await fivetran`diagnose and fix all broken connectors`
```

### Schema Evolution

```typescript
// AI handles schema changes automatically
// - New columns detected
// - Type changes handled
// - Renames inferred
// - Breaking changes flagged for review

// Or ask directly
await fivetran`salesforce schema changed?`
await fivetran`migrate accounts table to new schema`
```

### Monitoring

```typescript
// Query your pipelines like talking to your data team
await fivetran`what's the status of all connectors?`
await fivetran`which syncs failed in the last 24 hours?`
await fivetran`how many rows did we sync last week?`
await fivetran`why is salesforce slow?`

// Close gaps at scale
await fivetran`stale connectors`
  .refresh()
  .verify()
  .notify('#data-team')
```

### Agent Integration

```typescript
import { tom, ralph, priya } from 'agents.do'

// AI agents handle your data infrastructure
await tom`set up salesforce to warehouse pipeline`
  .map(pipeline => ralph`test ${pipeline}`)
  .map(tested => priya`verify ${tested} meets requirements`)

// Chain of command - one network round trip
await priya`plan Q1 data architecture`
  .map(spec => tom`implement ${spec}`)
  .map(impl => ralph`test ${impl}`)
```

## Architecture

### Durable Object per Connector

```
PlatformDO (config, users, connectors, destinations)
  |
  +-- ConnectorDO (source configs, credentials)
  |     |-- SQLite: Connector state (encrypted)
  |     +-- R2: Credentials vault (encrypted)
  |
  +-- SyncDO (sync state, history, metrics)
  |     |-- SQLite: Sync records
  |     +-- Queues: Job scheduling
  |
  +-- DestinationDO (target configs, schemas)
  |     |-- SQLite: Schema cache
  |     +-- R2: Large payloads
  |
  +-- AIDO (diagnostics, healing, suggestions)
        |-- LLM: Intent parsing, diagnostics
        +-- MCP: Tool definitions
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active syncs, recent state | <10ms |
| **Warm** | R2 + SQLite Index | Historical sync data (30 days) | <100ms |
| **Cold** | R2 Archive | Compliance retention (7+ years) | <1s |

## vs Fivetran

| Feature | Fivetran | fivetran.do |
|---------|----------|-------------|
| **Pricing** | Per-row (MAR) | Flat rate |
| **Setup** | 3-5 days | One line |
| **Schema Changes** | Manual migration | AI handles it |
| **Debugging** | Black box logs | Natural language |
| **Data Location** | Fivetran's cloud | Your Cloudflare account |
| **Customization** | Limited | Code it yourself |
| **AI** | None | AI-first design |
| **Lock-in** | Proprietary | MIT licensed |

## Cost Comparison

| Usage Level | Fivetran | fivetran.do | Savings |
|-------------|----------|-------------|---------|
| Startup (10M rows) | $500/mo | $50/mo | $5,400/yr |
| Growth (100M rows) | $5,000/mo | $250/mo | $57,000/yr |
| Scale (1B rows) | $50,000/mo | $1,000/mo | $588,000/yr |

**Why the difference?** Fivetran charges per Monthly Active Row. fivetran.do runs on Cloudflare's efficient infrastructure with flat-rate pricing. Growth is rewarded, not punished.

## Connector Types

### Sources

```typescript
// Databases
await fivetran`postgres to warehouse`
await fivetran`mysql with replication`
await fivetran`mongodb collections to lake`

// SaaS
await fivetran`salesforce every 15 minutes`
await fivetran`hubspot contacts hourly`
await fivetran`stripe payments daily`

// APIs
await fivetran`${apiEndpoint} daily`
await fivetran`graphql ${endpoint}`
```

### Destinations

```typescript
// Cloudflare-native
await fivetran`to d1`
await fivetran`archive to r2 parquet`

// External warehouses
await fivetran`to snowflake`
await fivetran`to bigquery`
await fivetran`to databricks`
```

## Use Cases

### Analytics Pipeline

```typescript
// Full analytics pipeline in three lines
await fivetran`salesforce to snowflake hourly`
await fivetran`stripe to snowflake hourly`
await fivetran`hubspot to snowflake daily`
```

### Real-Time Sync

```typescript
// Keep systems in sync
await fivetran`postgres to d1`
  .every('1 minute')
  .incremental()
```

### Data Lake

```typescript
// Archive everything
await fivetran`all sources to r2`
  .format('parquet')
  .partition('date')
```

## Why Open Source for Data Pipelines?

### 1. Cost Transparency

Fivetran pricing is opaque. Open source means:
- No per-row surprises
- Run it yourself for free
- Or pay for managed hosting

### 2. No Lock-in

Your data, your infrastructure:
- Export anytime
- Switch destinations freely
- No proprietary formats

### 3. AI-First

Closed platforms limit AI capabilities:
- Integrate any LLM
- Build custom diagnostics
- Train on your patterns

### 4. Community-Driven

500+ connectors maintained by:
- Data engineers
- Platform teams
- The community

## Roadmap

### Connectors
- [x] Databases (Postgres, MySQL, MongoDB)
- [x] SaaS (Salesforce, HubSpot, Stripe)
- [x] APIs (REST, GraphQL)
- [ ] CDC (Change Data Capture)
- [ ] Streaming (Kafka, Kinesis)

### Destinations
- [x] D1 (Cloudflare SQL)
- [x] R2 (Object Storage)
- [x] Snowflake
- [x] BigQuery
- [ ] Databricks
- [ ] Redshift

### AI
- [x] Natural Language Control
- [x] Self-Healing
- [x] Schema Evolution
- [ ] Anomaly Detection
- [ ] Cost Optimization

## Contributing

fivetran.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/fivetran.do
cd fivetran.do
pnpm install
pnpm test
```

## License

MIT License - Sync freely.

---

<p align="center">
  <strong>Stop paying per row. Start syncing freely.</strong>
  <br />
  Natural language. Self-healing. Open source.
  <br /><br />
  <a href="https://fivetran.do">Website</a> |
  <a href="https://docs.fivetran.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/fivetran.do">GitHub</a>
</p>
