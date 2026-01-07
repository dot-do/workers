# airbyte.do

Airbyte on Cloudflare - ELT data integration with 300+ connectors, running entirely on Durable Objects.

## The Problem

Modern businesses need to move data between systems:
- Extract from APIs, databases, files, and SaaS apps
- Load into data warehouses and lakes
- Transform for analytics and AI
- Keep data in sync continuously

Traditional solutions require:
- Managing orchestration infrastructure (Kubernetes, Docker)
- Self-hosting connector runtimes
- Complex deployment pipelines
- Significant operational overhead

## The Vision

Drop-in Airbyte replacement running entirely on Cloudflare.

```typescript
import { Airbyte } from '@dotdo/airbyte'

const airbyte = new Airbyte({ workspace: 'my-workspace' })

// Define a source (GitHub)
const github = await airbyte.sources.create({
  name: 'github-source',
  type: 'github',
  config: {
    credentials: { personal_access_token: env.GITHUB_TOKEN },
    repositories: ['myorg/myrepo'],
    start_date: '2024-01-01'
  }
})

// Define a destination (Snowflake)
const snowflake = await airbyte.destinations.create({
  name: 'snowflake-dest',
  type: 'snowflake',
  config: {
    host: 'account.snowflakecomputing.com',
    database: 'analytics',
    schema: 'raw',
    credentials: { password: env.SNOWFLAKE_PASSWORD }
  }
})

// Create a connection (sync job)
const connection = await airbyte.connections.create({
  name: 'github-to-snowflake',
  source: github.id,
  destination: snowflake.id,
  streams: [
    { name: 'commits', syncMode: 'incremental', cursorField: 'date' },
    { name: 'pull_requests', syncMode: 'incremental', cursorField: 'updated_at' },
    { name: 'issues', syncMode: 'full_refresh' }
  ],
  schedule: { cron: '0 */6 * * *' }  // Every 6 hours
})

// Trigger a manual sync
await airbyte.connections.sync(connection.id)
```

No Kubernetes. No Docker. Just data pipelines that work.

## Features

- **300+ Connectors** - Sources and destinations via MCP tools (fsx.do, gitx.do)
- **Incremental Sync** - Only sync changed data with cursor-based tracking
- **Schema Discovery** - Automatically detect and map source schemas
- **CDC Support** - Change Data Capture for database sources
- **Normalization** - Optional transformation to analytics-ready schemas
- **TypeScript First** - Full type safety for configurations
- **Edge Native** - Runs on Cloudflare's global network

## Architecture

```
                    +----------------------+
                    |    airbyte.do        |
                    |  (Cloudflare Worker) |
                    +----------------------+
                              |
              +---------------+---------------+---------------+
              |               |               |               |
    +------------------+ +------------------+ +------------------+ +------------------+
    |    SourceDO      | | DestinationDO    | |  ConnectionDO    | |    SyncDO        |
    | (connectors)     | | (connectors)     | | (orchestration)  | | (job execution)  |
    +------------------+ +------------------+ +------------------+ +------------------+
              |               |               |               |
              +---------------+-------+-------+---------------+
                                      |
                    +-------------------+-------------------+
                    |                                       |
           +-------------------+                  +-------------------+
           |  Cloudflare Queues |                  |   MCP Tools        |
           |  (job scheduling)  |                  |  (fsx.do, gitx.do) |
           +-------------------+                  +-------------------+
```

**Key insight**: Durable Objects provide single-threaded, strongly consistent state. Each connection gets its own ConnectionDO for orchestration, and each sync job gets a SyncDO for execution tracking. MCP tools (fsx.do, gitx.do) provide the AI-native connector runtime.

## Installation

```bash
npm install @dotdo/airbyte
```

## Quick Start

### Define Sources

```typescript
import { Airbyte } from '@dotdo/airbyte'

const airbyte = new Airbyte({ workspace: 'my-workspace' })

// Database source (Postgres)
const postgres = await airbyte.sources.create({
  name: 'postgres-prod',
  type: 'postgres',
  config: {
    host: 'db.example.com',
    port: 5432,
    database: 'production',
    username: 'airbyte',
    password: env.POSTGRES_PASSWORD,
    replication_method: { method: 'CDC' }  // Change Data Capture
  }
})

// API source (Stripe)
const stripe = await airbyte.sources.create({
  name: 'stripe-source',
  type: 'stripe',
  config: {
    client_secret: env.STRIPE_SECRET_KEY,
    account_id: 'acct_xxx',
    start_date: '2024-01-01'
  }
})

// File source (S3)
const s3 = await airbyte.sources.create({
  name: 's3-events',
  type: 's3',
  config: {
    bucket: 'my-events-bucket',
    aws_access_key_id: env.AWS_ACCESS_KEY,
    aws_secret_access_key: env.AWS_SECRET_KEY,
    path_pattern: 'events/**/*.parquet'
  }
})
```

### Define Destinations

```typescript
// Data warehouse (BigQuery)
const bigquery = await airbyte.destinations.create({
  name: 'bigquery-analytics',
  type: 'bigquery',
  config: {
    project_id: 'my-project',
    dataset_id: 'raw_data',
    credentials_json: env.BIGQUERY_CREDENTIALS
  }
})

// Data lake (Databricks)
const databricks = await airbyte.destinations.create({
  name: 'databricks-lakehouse',
  type: 'databricks',
  config: {
    host: 'my-workspace.databricks.com',
    http_path: '/sql/1.0/warehouses/xxx',
    token: env.DATABRICKS_TOKEN,
    catalog: 'main',
    schema: 'raw'
  }
})

// Vector store (Pinecone)
const pinecone = await airbyte.destinations.create({
  name: 'pinecone-embeddings',
  type: 'pinecone',
  config: {
    api_key: env.PINECONE_API_KEY,
    index: 'documents',
    embedding_model: 'text-embedding-3-small'
  }
})
```

### Create Connections

```typescript
// Full pipeline with incremental sync
const pipeline = await airbyte.connections.create({
  name: 'postgres-to-bigquery',
  source: postgres.id,
  destination: bigquery.id,
  streams: [
    { name: 'users', syncMode: 'incremental', cursorField: 'updated_at' },
    { name: 'orders', syncMode: 'incremental', cursorField: 'created_at' },
    { name: 'products', syncMode: 'full_refresh' }
  ],
  schedule: { cron: '0 * * * *' },  // Hourly
  normalization: 'basic'
})

// On-demand sync
await airbyte.connections.sync(pipeline.id)

// Check sync status
const status = await airbyte.connections.status(pipeline.id)
console.log(status)
// {
//   state: 'running',
//   progress: { users: 1234, orders: 5678, products: 100 },
//   started_at: '2024-01-15T10:00:00Z'
// }
```

### Schema Discovery

```typescript
// Discover available streams from a source
const schema = await airbyte.sources.discover(postgres.id)
console.log(schema)
// {
//   streams: [
//     {
//       name: 'users',
//       jsonSchema: { type: 'object', properties: { ... } },
//       supportedSyncModes: ['full_refresh', 'incremental'],
//       sourceDefinedCursor: true,
//       defaultCursorField: ['updated_at']
//     },
//     ...
//   ]
// }

// Test source connectivity
const check = await airbyte.sources.check(postgres.id)
console.log(check)
// { status: 'succeeded', message: 'Successfully connected to database' }
```

### Sync Modes

```typescript
// Full Refresh - Replace all data each sync
{ name: 'dim_products', syncMode: 'full_refresh', destinationSyncMode: 'overwrite' }

// Full Refresh + Append - Append all data each sync
{ name: 'event_log', syncMode: 'full_refresh', destinationSyncMode: 'append' }

// Incremental - Only new/updated records
{ name: 'fact_orders', syncMode: 'incremental', cursorField: 'updated_at' }

// Incremental + Dedup - Deduplicate by primary key
{ name: 'users', syncMode: 'incremental', cursorField: 'updated_at', primaryKey: [['id']] }
```

## AI-Native Integration

Airbyte.do integrates with MCP tools for AI-native data operations:

```typescript
import { airbyte } from '@dotdo/airbyte'
import { fsx } from 'fsx.do'
import { gitx } from 'gitx.do'

// AI agent can query connector catalogs
const sources = await airbyte.catalog.sources.list()
const destinations = await airbyte.catalog.destinations.list()

// AI agent can create pipelines via natural language
tom`Set up a pipeline from Salesforce to Snowflake, syncing accounts and opportunities hourly`

// AI agent can monitor and troubleshoot
priya`Why did the postgres-to-bigquery sync fail last night?`
```

## MCP Tools

```typescript
// Register as MCP tools for AI agents
export const mcpTools = {
  'airbyte.sources.create': airbyte.sources.create,
  'airbyte.sources.discover': airbyte.sources.discover,
  'airbyte.sources.check': airbyte.sources.check,
  'airbyte.destinations.create': airbyte.destinations.create,
  'airbyte.destinations.check': airbyte.destinations.check,
  'airbyte.connections.create': airbyte.connections.create,
  'airbyte.connections.sync': airbyte.connections.sync,
  'airbyte.connections.status': airbyte.connections.status,
  'airbyte.catalog.sources.list': airbyte.catalog.sources.list,
  'airbyte.catalog.destinations.list': airbyte.catalog.destinations.list
}
```

## The Rewrites Ecosystem

airbyte.do is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| [inngest.do](https://inngest.do) | Inngest | Workflows/Jobs for AI |
| **airbyte.do** | Airbyte | Data integration for AI |
| kafka.do | Kafka | Event streaming for AI |
| nats.do | NATS | Messaging for AI |

Each rewrite follows the same pattern:
- Durable Objects for state
- SQLite for persistence
- Cloudflare Queues for messaging
- Compatible API with the original

## Why Cloudflare?

1. **Global Edge** - Sync jobs run close to data sources
2. **No Cold Starts** - Durable Objects stay warm
3. **Unlimited Duration** - Long-running syncs work naturally
4. **Built-in Queues** - Reliable job scheduling
5. **R2 Storage** - Staging area for large syncs
6. **Workers AI** - Embeddings and transformations

## Related Domains

- **etl.do** - ETL pipeline orchestration
- **pipelines.do** - Data pipeline management
- **connectors.do** - Connector marketplace
- **catalog.do** - Data catalog and discovery

## License

MIT
