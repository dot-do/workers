# fivetran.do

Fivetran on Cloudflare - Automated data movement with zero maintenance.

## The Problem

Modern data teams need reliable data pipelines:
- Connect to hundreds of data sources
- Keep data synchronized automatically
- Handle schema changes gracefully
- Manage sync scheduling and retries
- Monitor pipeline health

Traditional solutions require:
- Managing complex ETL infrastructure
- Building custom connectors for each source
- Handling rate limits and API changes
- Maintaining schema evolution logic
- Operating distributed orchestration systems

## The Vision

Drop-in Fivetran replacement running entirely on Cloudflare.

```typescript
import { Fivetran } from '@dotdo/fivetran'

const fivetran = new Fivetran({
  id: 'my-data-platform',
  // MCP tools for AI-native operations
  tools: ['fsx.do', 'gitx.do']
})

// Define a connector
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

No ETL infrastructure to manage. No connectors to maintain. Just data that flows.

## Features

- **500+ Pre-built Connectors** - Salesforce, HubSpot, Stripe, databases, APIs
- **Automated Schema Migrations** - Handle source changes without breaking pipelines
- **Incremental Updates** - Sync only what changed, efficiently
- **Data Transformations** - Transform data in-flight with SQL or TypeScript
- **Sync Scheduling** - Cron, interval, or event-driven triggers
- **Usage-based Billing** - Pay for rows synced, not infrastructure
- **AI-Native** - MCP tools for autonomous data operations

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
    |     D1/R2        | | Cloudflare Queues| |   fsx.do/gitx.do |
    |  (data storage)  | | (sync jobs)      | |   (MCP tools)    |
    +------------------+ +------------------+ +------------------+
```

**Key insight**: Durable Objects provide reliable connector state and sync coordination. Each connector gets its own DO for isolation. Queues handle job scheduling. MCP tools enable AI-driven operations.

## Installation

```bash
npm install @dotdo/fivetran
```

## Quick Start

### Define Connectors

```typescript
import { Fivetran } from '@dotdo/fivetran'

const fivetran = new Fivetran({ id: 'analytics' })

// Database connector
const postgres = fivetran.createConnector({
  id: 'postgres-prod',
  source: {
    type: 'postgres',
    connectionString: env.POSTGRES_URL,
    tables: ['users', 'orders', 'products'],
    replication: 'logical'  // CDC support
  },
  destination: {
    type: 'd1',
    database: env.ANALYTICS_DB
  },
  sync: {
    schedule: 'every 5 minutes',
    mode: 'incremental'
  }
})

// SaaS connector
const stripe = fivetran.createConnector({
  id: 'stripe-payments',
  source: {
    type: 'stripe',
    apiKey: env.STRIPE_API_KEY,
    objects: ['customers', 'subscriptions', 'invoices', 'charges']
  },
  destination: {
    type: 'r2',
    bucket: env.DATA_LAKE,
    format: 'parquet'
  },
  sync: {
    schedule: 'every 1 hour',
    mode: 'incremental',
    lookback: '7 days'
  }
})
```

### Connector Types

```typescript
// Database sources
{ type: 'postgres', connectionString, tables, replication }
{ type: 'mysql', connectionString, tables }
{ type: 'mongodb', connectionString, collections }
{ type: 'snowflake', account, warehouse, database }

// SaaS sources
{ type: 'salesforce', credentials, objects }
{ type: 'hubspot', apiKey, objects }
{ type: 'stripe', apiKey, objects }
{ type: 'shopify', shopDomain, accessToken }

// API sources
{ type: 'rest', baseUrl, endpoints, auth }
{ type: 'graphql', endpoint, queries, auth }

// File sources
{ type: 's3', bucket, prefix, format }
{ type: 'gcs', bucket, prefix, format }
{ type: 'fsx', path, pattern }  // fsx.do integration
```

### Destination Types

```typescript
// Cloudflare destinations
{ type: 'd1', database }
{ type: 'r2', bucket, format: 'parquet' | 'json' | 'csv' }

// External destinations
{ type: 'postgres', connectionString }
{ type: 'snowflake', account, warehouse, database }
{ type: 'bigquery', project, dataset }
```

### Sync Configuration

```typescript
fivetran.createConnector({
  // ...source and destination
  sync: {
    // Schedule options
    schedule: 'every 5 minutes',  // or 'every 1 hour', 'daily at 9am'
    cron: '0 */6 * * *',          // or cron expression

    // Sync modes
    mode: 'full' | 'incremental',

    // Incremental options
    cursor: 'updated_at',         // Cursor field
    lookback: '24 hours',         // Safety overlap

    // Retry options
    retries: 3,
    backoff: 'exponential'
  }
})
```

### Transformations

```typescript
// SQL transformation
const connector = fivetran.createConnector({
  // ...
  transform: {
    type: 'sql',
    query: `
      SELECT
        id,
        LOWER(email) as email,
        created_at,
        CASE WHEN status = 'active' THEN true ELSE false END as is_active
      FROM {{ source }}
    `
  }
})

// TypeScript transformation
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

### Monitoring and Webhooks

```typescript
// Get connector status
const status = await connector.status()
// {
//   id: 'salesforce-prod',
//   status: 'healthy',
//   lastSync: '2024-01-15T10:30:00Z',
//   nextSync: '2024-01-15T10:45:00Z',
//   stats: {
//     rowsSynced: 15420,
//     bytesTransferred: 2_340_000,
//     duration: 45_000
//   }
// }

// Webhook notifications
fivetran.onSyncComplete(async (event) => {
  console.log(`Sync completed: ${event.connectorId}`)
  console.log(`Rows synced: ${event.stats.rowsSynced}`)
})

fivetran.onSyncError(async (event) => {
  await slack.notify(`Sync failed: ${event.error}`)
})
```

### Schema Management

```typescript
// Auto-detect schema changes
const connector = fivetran.createConnector({
  // ...
  schema: {
    autoMigrate: true,              // Auto-apply DDL changes
    allowBreaking: false,           // Block column drops
    trackHistory: true,             // Schema change history
    notify: ['data-team@example.com']
  }
})

// Manual schema operations
await connector.schema.evolve({
  addColumn: { name: 'region', type: 'string' }
})

await connector.schema.history()
// [{ change: 'add_column', column: 'region', timestamp: '...' }]
```

## MCP Tools Integration

Fivetran.do is AI-native with MCP tool support:

```typescript
import { Fivetran } from '@dotdo/fivetran'
import { fsx } from 'fsx.do'
import { gitx } from 'gitx.do'

const fivetran = new Fivetran({
  id: 'ai-data-platform',
  tools: { fsx, gitx }
})

// AI agent can:
// - Read source files with fsx.do
// - Track schema changes with gitx.do
// - Explore data transformations
// - Debug sync issues
```

## API Reference

### Fivetran Class

```typescript
new Fivetran(options: FivetranOptions)

interface FivetranOptions {
  id: string
  tools?: { fsx?: FSx, gitx?: GitX }
}
```

### Connector Methods

```typescript
connector.sync()           // Trigger immediate sync
connector.pause()          // Pause scheduled syncs
connector.resume()         // Resume syncs
connector.status()         // Get current status
connector.history()        // Get sync history
connector.schema.evolve()  // Apply schema changes
connector.schema.history() // Get schema change history
connector.delete()         // Remove connector
```

### Events

```typescript
fivetran.onSyncStart(handler)
fivetran.onSyncComplete(handler)
fivetran.onSyncError(handler)
fivetran.onSchemaChange(handler)
```

## The Rewrites Ecosystem

fivetran.do is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| [inngest.do](https://inngest.do) | Inngest | Workflows/Jobs for AI |
| **fivetran.do** | Fivetran | Data pipelines for AI |
| kafka.do | Kafka | Event streaming for AI |
| nats.do | NATS | Messaging for AI |

Each rewrite follows the same pattern:
- Durable Objects for state
- SQLite for persistence
- Cloudflare Queues for messaging
- Compatible API with the original

## Why Cloudflare?

1. **Global Edge** - Connectors run close to data sources
2. **No Cold Starts** - Durable Objects stay warm
3. **Unlimited Duration** - Long-running syncs supported
4. **Built-in Queues** - Reliable job scheduling
5. **D1 + R2** - Native destinations for data lake

## Related Domains

- **etl.do** - Extract, transform, load pipelines
- **pipelines.do** - Data pipeline orchestration
- **sync.do** - Real-time data synchronization
- **transform.do** - Data transformations

## License

MIT
