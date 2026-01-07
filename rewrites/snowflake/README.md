# snowflake.do

> The $90B data cloud. Now open source. AI-native.

Snowflake revolutionized cloud data warehousing with separated storage and compute, near-infinite scalability, and zero-maintenance operations. But at $2-4/credit with credits burning faster than you can track, plus $12k/year minimum enterprise contracts - data warehousing has become a luxury only well-funded companies can afford.

**snowflake.do** reimagines the data warehouse for the AI era. Natural language queries. Zero-copy cloning. Time travel. All running on Cloudflare's edge - at a fraction of the cost.

## The Problem

Snowflake built a brilliant data platform, then priced it out of reach:

- **Credit-based pricing** - $2-4 per credit, with warehouses burning 1-256 credits/hour
- **Warehouse spin-up tax** - Minimum 60-second billing even for 100ms queries
- **Storage costs** - $23/TB/month on top of compute
- **Enterprise lock-in** - Data sharing, Snowpipe, and Iceberg require premium tiers
- **Unpredictable bills** - "We ran a dashboard refresh and spent $50k"
- **AI as premium upsell** - Cortex AI features locked behind additional licensing

A startup running analytics on 1TB of data? **$50k-500k/year** before you know what hit you.

## The Solution

**snowflake.do** is Snowflake reimagined:

```
Traditional Snowflake           snowflake.do
-----------------------------------------------------------------
$2-4/credit (unpredictable)     $0 - run your own
60-second minimum billing       Pay only for actual compute
Data sharing = enterprise       Data sharing built-in
Snowpipe = premium              Streaming ingestion included
Cortex AI = extra cost          Natural language built-in
Iceberg = enterprise only       Iceberg-native from day one
Managed service only            Self-host or managed
```

## One-Click Deploy

```bash
npx create-dotdo snowflake
```

Your own data warehouse. Running on Cloudflare. Predictable costs.

## Natural Language to SQL

Skip the SQL. Just ask:

```typescript
import { snowflake } from 'snowflake.do'

// Natural language queries
const revenue = await snowflake`what was our total revenue last quarter?`
const trends = await snowflake`show me customer churn trends by cohort`
const anomaly = await snowflake`why did costs spike on Tuesday?`

// Returns data, SQL, and narrative
console.log(revenue.data)       // Query results
console.log(revenue.sql)        // Generated SQL
console.log(revenue.insight)    // AI-generated explanation
```

## Promise Pipelining: Data Pipelines in One Round Trip

Chain transformations without waiting:

```typescript
import { snowflake } from 'snowflake.do'
import { priya, tom, ralph } from 'agents.do'

// Build a complete data pipeline with promise pipelining
const pipeline = await snowflake`load sales from s3://bucket/sales.parquet`
  .map(data => snowflake`transform ${data} with currency conversion`)
  .map(transformed => snowflake`aggregate ${transformed} by region, month`)
  .map(aggregated => [
    snowflake`materialize ${aggregated} as sales_summary`,
    priya`analyze ${aggregated} for Q1 planning`,
    tom`review the pipeline architecture`,
  ])

// One network round trip. Full data pipeline.
```

### Real-World Pipeline Examples

```typescript
// ETL Pipeline
const etl = await snowflake`stage files from @my_s3_stage`
  .map(staged => snowflake`copy into raw.events from ${staged}`)
  .map(raw => snowflake`merge into clean.events using ${raw}`)
  .map(clean => snowflake`refresh materialized view analytics.daily_events`)

// Machine Learning Pipeline
const ml = await snowflake`select features from training_data`
  .map(features => snowflake`train model churn_predictor on ${features}`)
  .map(model => snowflake`predict using ${model} on new_customers`)
  .map(predictions => ralph`build alerting system for ${predictions}`)

// Multi-Team Analytics
const analysis = await snowflake`query customer_360 for enterprise accounts`
  .map(data => [
    priya`create product roadmap from ${data}`,
    mark`draft customer success playbook from ${data}`,
    sally`identify expansion opportunities in ${data}`,
  ])
```

## Features

### Virtual Warehouses

Create isolated compute clusters that scale independently:

```typescript
import { Warehouse } from 'snowflake.do'

// Create warehouses for different workloads
const analytics = Warehouse.create({
  name: 'ANALYTICS_WH',
  size: 'medium',
  autoSuspend: 60,        // Suspend after 60s idle
  autoResume: true,
  minCluster: 1,
  maxCluster: 4,          // Auto-scale to 4 clusters
  scalingPolicy: 'economy',
})

const etl = Warehouse.create({
  name: 'ETL_WH',
  size: 'xlarge',
  autoSuspend: 120,
  resourceMonitor: 'ETL_BUDGET',
  maxCredits: 1000,
})

// Run queries on specific warehouses
await snowflake.use(analytics)`select * from sales`
await snowflake.use(etl)`copy into events from @stage`
```

### Zero-Copy Cloning

Clone databases, schemas, or tables instantly without copying data:

```typescript
import { Database, Schema, Table } from 'snowflake.do'

// Clone entire database for testing
const prodClone = await Database.clone({
  source: 'PRODUCTION',
  target: 'DEV_TESTING',
  // Zero storage cost - shares underlying data
})

// Clone schema for experimentation
const schemaClone = await Schema.clone({
  source: 'PRODUCTION.ANALYTICS',
  target: 'PRODUCTION.ANALYTICS_EXPERIMENT',
})

// Clone table at a point in time
const tableClone = await Table.clone({
  source: 'ORDERS',
  target: 'ORDERS_BACKUP',
  at: { timestamp: '2024-01-15 10:30:00' },
})

// Test against production data safely
await snowflake.use(prodClone)`
  -- Safe to run destructive queries
  delete from customers where status = 'test'
`
```

### Time Travel

Query data as it existed at any point in the past:

```typescript
import { TimeTravel } from 'snowflake.do'

// Query historical data
const yesterday = await snowflake`
  select * from orders
  at (timestamp => '2024-01-14 00:00:00'::timestamp)
`

// Recover deleted data
const deleted = await snowflake`
  select * from customers
  before (statement => '${deleteStatementId}')
`

// Undo a bad update
await TimeTravel.restore({
  table: 'PRODUCTS',
  to: { timestamp: '2024-01-14 23:59:59' },
})

// Compare data across time
const diff = await TimeTravel.diff({
  table: 'INVENTORY',
  from: { offset: '-24 hours' },
  to: { timestamp: 'current' },
})
```

### Semi-Structured Data (JSON/Avro/Parquet)

Query JSON, Avro, and Parquet natively:

```typescript
import { Variant } from 'snowflake.do'

// Load JSON directly
await snowflake`
  copy into events
  from @json_stage
  file_format = (type = JSON)
`

// Query nested JSON with dot notation
const events = await snowflake`
  select
    raw:user.id::string as user_id,
    raw:event.type::string as event_type,
    raw:properties.amount::number as amount,
    raw:metadata.tags[0]::string as first_tag
  from events
  where raw:event.timestamp::timestamp > dateadd(hour, -24, current_timestamp())
`

// Flatten arrays
const items = await snowflake`
  select
    order_id,
    f.value:product_id::string as product_id,
    f.value:quantity::number as quantity,
    f.value:price::number as price
  from orders,
  lateral flatten(input => order_data:items) f
`

// Load Parquet with schema inference
await snowflake`
  create table logs using template (
    select array_agg(object_construct(*))
    from table(infer_schema(
      location => '@parquet_stage',
      file_format => 'parquet_format'
    ))
  )
`
```

### Data Sharing & Marketplace

Share data securely without copying:

```typescript
import { Share, DataExchange } from 'snowflake.do'

// Create a share
const share = await Share.create({
  name: 'CUSTOMER_INSIGHTS',
  database: 'ANALYTICS',
  schemas: ['PUBLIC'],
  tables: ['CUSTOMER_METRICS', 'PRODUCT_USAGE'],
})

// Add consumers
await share.addAccount('PARTNER_ACCOUNT_123')
await share.addAccount('PARTNER_ACCOUNT_456')

// Create a listing for the marketplace
const listing = await DataExchange.createListing({
  share: 'CUSTOMER_INSIGHTS',
  title: 'Real-Time Customer Analytics',
  description: 'Live customer metrics updated hourly',
  pricing: { type: 'free' },  // or { type: 'paid', perQuery: 0.01 }
  categories: ['Analytics', 'Marketing'],
})

// Consume shared data (as a consumer)
const sharedDb = await DataExchange.mount({
  listing: 'provider.CUSTOMER_INSIGHTS',
  database: 'PARTNER_DATA',
})

await snowflake`select * from PARTNER_DATA.PUBLIC.CUSTOMER_METRICS`
```

### Snowpipe: Continuous Data Ingestion

Stream data in real-time:

```typescript
import { Snowpipe, Stage } from 'snowflake.do'

// Create a stage pointing to S3
const stage = await Stage.create({
  name: 'EVENTS_STAGE',
  url: 's3://my-bucket/events/',
  credentials: {
    awsKeyId: env.AWS_KEY_ID,
    awsSecretKey: env.AWS_SECRET_KEY,
  },
  fileFormat: { type: 'JSON' },
})

// Create a Snowpipe for automatic ingestion
const pipe = await Snowpipe.create({
  name: 'EVENTS_PIPE',
  stage: 'EVENTS_STAGE',
  table: 'RAW_EVENTS',
  autoIngest: true,
  // Files loaded within seconds of arrival
})

// Monitor pipe status
const status = await pipe.status()
console.log(status.pendingFileCount)
console.log(status.lastIngestTimestamp)

// Manual refresh if needed
await pipe.refresh({ prefix: 'events/2024/01/' })
```

### Streams & Tasks: Change Data Capture

Track changes and automate processing:

```typescript
import { Stream, Task } from 'snowflake.do'

// Create a stream to capture changes
const stream = await Stream.create({
  name: 'ORDERS_CHANGES',
  table: 'ORDERS',
  appendOnly: false,  // Capture inserts, updates, and deletes
})

// Query the stream for changes
const changes = await snowflake`
  select
    METADATA$ACTION as action,
    METADATA$ISUPDATE as is_update,
    *
  from ORDERS_CHANGES
  where METADATA$ACTION = 'INSERT'
`

// Create a task to process changes automatically
const task = await Task.create({
  name: 'PROCESS_ORDER_CHANGES',
  warehouse: 'ANALYTICS_WH',
  schedule: 'USING CRON 0/5 * * * * UTC',  // Every 5 minutes
  statement: `
    merge into ORDER_SUMMARY s
    using (select * from ORDERS_CHANGES) c
    on s.order_date = c.order_date
    when matched then update set total = s.total + c.amount
    when not matched then insert (order_date, total) values (c.order_date, c.amount)
  `,
  when: 'SYSTEM$STREAM_HAS_DATA(\'ORDERS_CHANGES\')',
})

// Task dependencies (DAG)
await Task.create({
  name: 'DOWNSTREAM_ANALYTICS',
  after: ['PROCESS_ORDER_CHANGES'],  // Runs after parent completes
  statement: `call refresh_dashboards()`,
})
```

### Iceberg Tables

Native Apache Iceberg support for open table formats:

```typescript
import { IcebergTable, ExternalVolume } from 'snowflake.do'

// Create external volume pointing to your object storage
const volume = await ExternalVolume.create({
  name: 'ICEBERG_STORAGE',
  storageLocations: [{
    name: 's3_location',
    storageBaseUrl: 's3://my-iceberg-bucket/',
    storageProvider: 'S3',
    storageAwsRoleArn: env.AWS_ROLE_ARN,
  }],
})

// Create Iceberg table (Snowflake-managed)
const table = await IcebergTable.create({
  name: 'CUSTOMER_EVENTS',
  externalVolume: 'ICEBERG_STORAGE',
  catalog: 'SNOWFLAKE',  // Snowflake manages the catalog
  baseLocation: 'customer_events/',
  columns: [
    { name: 'event_id', type: 'STRING' },
    { name: 'customer_id', type: 'STRING' },
    { name: 'event_type', type: 'STRING' },
    { name: 'timestamp', type: 'TIMESTAMP' },
    { name: 'properties', type: 'OBJECT' },
  ],
})

// Query Iceberg table like any other table
await snowflake`
  insert into CUSTOMER_EVENTS
  select * from RAW_EVENTS
  where event_date = current_date()
`

// Access from external engines (Spark, Trino, etc.)
const metadata = await table.getIcebergMetadata()
console.log(metadata.metadataLocation)  // s3://my-iceberg-bucket/customer_events/metadata/...

// Read existing Iceberg tables from external catalogs
const externalTable = await IcebergTable.mount({
  name: 'EXTERNAL_EVENTS',
  externalVolume: 'ICEBERG_STORAGE',
  catalogIntegration: 'GLUE_CATALOG',
  catalogTableName: 'analytics.events',
})
```

## AI-Native Features

### Natural Language Queries

Ask questions in plain English:

```typescript
import { askSnowflake } from 'snowflake.do'

// Simple queries
const answer = await askSnowflake('How many orders did we have last month?')
// Returns: { value: 15234, sql: "SELECT COUNT(*) FROM orders WHERE...", chart: <viz> }

// Complex analytics
const analysis = await askSnowflake(`
  What's driving the increase in customer churn?
  Break it down by acquisition channel and product line.
`)

// Predictive
const forecast = await askSnowflake(`
  Predict our revenue for next quarter based on historical trends
  and seasonality patterns.
`)
```

### AI Agents as Data Engineers

Let AI agents manage your data warehouse:

```typescript
import { priya, tom, ralph, quinn } from 'agents.do'
import { snowflake } from 'snowflake.do'

// Product manager explores data for roadmap
const insights = await priya`
  analyze our user engagement data and identify
  the top 3 features driving retention
`

// Tech lead reviews data architecture
const review = await tom`
  review our data warehouse schema and suggest
  optimizations for our growing query load
`

// Developer builds data pipeline
const pipeline = await ralph`
  build an ETL pipeline that ingests events from Kafka,
  transforms them for analytics, and loads into snowflake
`

// QA validates data quality
const quality = await quinn`
  create data quality tests for the customer_360 table
  checking for nulls, duplicates, and referential integrity
`

// Chain it all together
const dataProduct = await priya`define requirements for customer analytics`
  .map(spec => tom`design the data model for ${spec}`)
  .map(model => ralph`implement ${model} in snowflake.do`)
  .map(impl => quinn`validate data quality of ${impl}`)
  .map(validated => priya`create dashboard from ${validated}`)
```

### Automated Optimization

AI-powered query and cost optimization:

```typescript
import { optimize } from 'snowflake.do'

// Analyze and optimize slow queries
const recommendations = await optimize.queries({
  timeRange: 'last_7_days',
  minExecutionTime: '30s',
})

// Get warehouse sizing recommendations
const warehouseAdvice = await optimize.warehouses({
  analyzeUsage: true,
  suggestConsolidation: true,
})

// Automatic clustering recommendations
const clusteringAdvice = await optimize.clustering({
  table: 'EVENTS',
  sampleQueries: true,
})
```

## Architecture

### Edge-First Data Warehouse

```
                    +------------------------+
                    |   snowflake.do Worker  |
                    |   (Query Coordinator)   |
                    +------------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | WarehouseDO      | | CatalogDO        | | PipelineDO       |
    | (Compute Pool)   | | (Metadata)       | | (Ingestion)      |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
         +--------------------+--------------------+
         |                    |                    |
    +----------+       +-----------+        +------------+
    |    D1    |       |    R2     |        | Hyperdrive |
    | (Catalog)|       | (Storage) |        | (Sources)  |
    +----------+       +-----------+        +------------+
```

### Durable Objects

| Object | Purpose |
|--------|---------|
| `WarehouseDO` | Manages compute pool, query execution, auto-scaling |
| `CatalogDO` | Table metadata, schema management, access control |
| `DatabaseDO` | Database-level operations, cloning, time travel |
| `StreamDO` | Change data capture, offset tracking |
| `TaskDO` | Scheduled job execution, DAG orchestration |
| `PipelineDO` | Snowpipe ingestion, file tracking |
| `ShareDO` | Data sharing, consumer management |
| `IcebergDO` | Iceberg table management, metadata sync |

### Storage Tiers

- **Hot (D1/SQLite)** - Catalog metadata, query history, user sessions
- **Warm (R2)** - Table data in Parquet format, Iceberg metadata
- **Cold (R2 Archive)** - Historical snapshots, time travel data
- **External (Hyperdrive)** - Live connections to source systems

### Query Engine

```
User Query (SQL or Natural Language)
        |
   AI Translation (if NL)
        |
   Query Parser
        |
   Catalog Lookup (CatalogDO)
        |
   Query Optimizer
        |
   Execution Plan
        |
   Warehouse Assignment (WarehouseDO)
        |
   Parallel Execution
        |
   Result Aggregation
        |
   Response (data + metadata + insights)
```

## MCP Tools

Every capability exposed as AI tools:

```typescript
import { snowflakeTools } from 'snowflake.do/mcp'

// Available tools
snowflakeTools.map(t => t.name)
// [
//   'query',
//   'create_table',
//   'create_warehouse',
//   'clone_database',
//   'time_travel_query',
//   'create_stream',
//   'create_task',
//   'create_pipe',
//   'create_share',
//   'load_data',
//   'optimize_query',
//   'explain_plan',
// ]

// AI can manage the entire warehouse
await invokeTool('create_table', {
  name: 'EVENTS',
  columns: [
    { name: 'event_id', type: 'VARCHAR' },
    { name: 'payload', type: 'VARIANT' },
  ],
  clusterBy: ['event_date'],
})
```

## Deployment Options

### Cloudflare Workers (Recommended)

```bash
npx create-dotdo snowflake
# Deploys to your Cloudflare account
```

### Docker

```bash
docker run -p 8787:8787 dotdo/snowflake
```

### Self-Hosted

```bash
git clone https://github.com/dotdo/snowflake.do
cd snowflake.do
npm install
npm run dev    # Local development
npm run deploy # Production deployment
```

## Migration from Snowflake

### Export Your Data

```bash
# Export from Snowflake
snowsql -q "COPY INTO @export_stage FROM my_table"

# Import to snowflake.do
npx snowflake-migrate import --source ./exports
```

### SQL Compatibility

Most Snowflake SQL works directly:

```
Snowflake                       snowflake.do
-----------------------------------------------------------------
SELECT * FROM t                 SELECT * FROM t              (same)
VARIANT:field::type             VARIANT:field::type          (same)
FLATTEN(array)                  FLATTEN(array)               (same)
TIME_SLICE(ts, 1, 'HOUR')       TIME_SLICE(ts, 1, 'HOUR')    (same)
OBJECT_CONSTRUCT(*)             OBJECT_CONSTRUCT(*)          (same)
PARSE_JSON(str)                 PARSE_JSON(str)              (same)
```

## Pricing Comparison

| Feature | Snowflake | snowflake.do |
|---------|-----------|--------------|
| **Compute** | $2-4/credit, 1-256 credits/hour | Cloudflare Workers pricing |
| **Storage** | $23/TB/month | R2: $0.015/GB/month |
| **Minimum billing** | 60 seconds | Actual usage |
| **Data sharing** | Enterprise tier | Included |
| **Snowpipe** | Per-file charges | Included |
| **Iceberg** | Enterprise tier | Included |
| **AI features** | Cortex (additional cost) | Included |
| **Annual commitment** | Required for discounts | None |

### Real-World Example

*Startup with 500GB data, 10 concurrent analysts:*

| | Snowflake | snowflake.do |
|---|---|---|
| Compute (X-Small, 8hr/day) | ~$15k/year | ~$500/year |
| Storage | ~$140/year | ~$90/year |
| Data sharing | Enterprise required | Included |
| Snowpipe | ~$1k/year | Included |
| **Total** | **$16k+/year** | **~$600/year** |

## Roadmap

- [x] Virtual warehouses with auto-scaling
- [x] Zero-copy cloning
- [x] Time travel queries
- [x] Semi-structured data (JSON/Parquet/Avro)
- [x] Streams and tasks (CDC)
- [x] Snowpipe continuous ingestion
- [x] Data sharing
- [x] Iceberg tables
- [ ] Stored procedures (JavaScript/Python)
- [ ] UDFs and UDTFs
- [ ] Snowpark (DataFrame API)
- [ ] Dynamic tables
- [ ] Alerts and notifications
- [ ] Row access policies
- [ ] Data masking

## Why Open Source?

Data infrastructure is too important to be locked behind unpredictable pricing:

1. **Your data** - Your warehouse should run where you want it
2. **Your compute** - Pay for what you use, not 60-second minimums
3. **Your budget** - No surprise bills from runaway queries
4. **Your AI** - Natural language analytics should be standard, not premium
5. **Your freedom** - No vendor lock-in, no annual commitments

Snowflake showed the world what cloud data warehousing could be. **snowflake.do** makes it accessible to everyone.

## License

MIT License - Use it however you want. Build data platforms. Power your analytics. Run production workloads.

---

<p align="center">
  <strong>snowflake.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://snowflake.do">Website</a> | <a href="https://docs.snowflake.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
