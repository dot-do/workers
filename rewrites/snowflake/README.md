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

## AI-Native API

```typescript
import { snowflake } from 'snowflake.do'           // Full SDK
import { snowflake } from 'snowflake.do/tiny'      // Minimal client
import { snowflake } from 'snowflake.do/iceberg'   // Iceberg-only operations
```

Natural language for data warehousing:

```typescript
import { snowflake } from 'snowflake.do'

// Talk to it like a data analyst
const revenue = await snowflake`total revenue last quarter`
const trends = await snowflake`customer churn by cohort`
const anomaly = await snowflake`why did costs spike Tuesday?`

// Chain like sentences
await snowflake`create warehouse ANALYTICS medium auto-suspend 60s`
await snowflake`clone database PRODUCTION to DEV_TESTING`
await snowflake`stream order changes from ORDERS, merge to summary every 5 minutes`
```

## One-Click Deploy

```bash
npx create-dotdo snowflake
```

Your own data warehouse. Running on Cloudflare. Predictable costs.

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

```typescript
// Just say it
const analytics = await snowflake`create warehouse ANALYTICS medium auto-suspend 60s`
const etl = await snowflake`create warehouse ETL xlarge with 1000 credit limit`

// Scale like talking to an ops engineer
await snowflake`scale ANALYTICS to 4 clusters`
await snowflake`suspend ETL warehouse`
await snowflake`resume ANALYTICS when queries waiting`

// Run queries on specific warehouses
await snowflake`on ANALYTICS: top customers by revenue last quarter`
await snowflake`on ETL: copy events from @stage`
```

### Zero-Copy Cloning

```typescript
// Clone like you'd ask a DBA
await snowflake`clone database PRODUCTION to DEV_TESTING`
await snowflake`clone schema PRODUCTION.ANALYTICS for experimentation`
await snowflake`clone ORDERS table from yesterday at 10:30am`

// Test against production data safely
await snowflake`on DEV_TESTING: delete test customers`
// Zero storage cost - shares underlying data
```

### Time Travel

```typescript
// Query the past naturally
const yesterday = await snowflake`orders from yesterday`
const lastWeek = await snowflake`customer count as of last Monday`
const preIncident = await snowflake`inventory before the bad update`

// Recover and restore
await snowflake`restore PRODUCTS table to yesterday 11:59pm`
await snowflake`undo that delete on customers`

// Compare across time
const diff = await snowflake`diff INVENTORY last 24 hours`
await snowflake`what changed in orders since Tuesday?`
```

### Semi-Structured Data (JSON/Avro/Parquet)

```typescript
// Load any format - AI infers the schema
await snowflake`load events from @json_stage`
await snowflake`load logs from s3://bucket/parquet/`
await snowflake`ingest avro files from @kafka_stage`

// Query nested data naturally
const events = await snowflake`user events last 24 hours with properties.amount > 100`
const items = await snowflake`flatten order line items with product and quantity`

// Just ask for what you need
await snowflake`event types by user from the nested JSON`
await snowflake`extract all tags from metadata arrays`
```

### Data Sharing & Marketplace

```typescript
// Share data like sending a file
await snowflake`share CUSTOMER_METRICS and PRODUCT_USAGE with partner ABC`
await snowflake`share analytics schema with our reseller network`

// Publish to marketplace
await snowflake`list "Real-Time Customer Analytics" for free in marketplace`
await snowflake`list weather data at $0.01 per query`

// Consume shared data
await snowflake`mount partner.CUSTOMER_INSIGHTS as PARTNER_DATA`
const metrics = await snowflake`customer metrics from PARTNER_DATA`
```

### Snowpipe: Continuous Data Ingestion

```typescript
// Set up streaming ingestion naturally
await snowflake`stage s3://my-bucket/events/ as EVENTS_STAGE`
await snowflake`pipe events from EVENTS_STAGE into RAW_EVENTS automatically`

// Monitor like asking a colleague
const status = await snowflake`how many files pending in EVENTS_PIPE?`
await snowflake`when did EVENTS_PIPE last run?`

// Manual operations when needed
await snowflake`refresh EVENTS_PIPE for January 2024 files`
await snowflake`pause the events pipe`
await snowflake`resume all pipes`
```

### Streams & Tasks: Change Data Capture

```typescript
// Track changes naturally
await snowflake`stream order changes from ORDERS`
const newOrders = await snowflake`new inserts from ORDERS_CHANGES`
const allChanges = await snowflake`what changed in ORDERS since last check?`

// Automate processing like scheduling a meeting
await snowflake`every 5 minutes: merge order changes into ORDER_SUMMARY`
await snowflake`when orders change: update the daily totals`

// Build task DAGs naturally
await snowflake`after order processing: refresh dashboards`
await snowflake`chain: ingest -> transform -> aggregate -> publish`

// Monitor tasks
await snowflake`show me failed tasks today`
await snowflake`why did ORDER_SUMMARY task fail?`
```

### Iceberg Tables

```typescript
// Create Iceberg tables naturally
await snowflake`store CUSTOMER_EVENTS as iceberg in s3://my-iceberg-bucket/`
await snowflake`create iceberg table EVENTS with event_id, customer_id, timestamp`

// Query like any table
await snowflake`today's events into CUSTOMER_EVENTS`
await snowflake`customers by event count from CUSTOMER_EVENTS`

// Open format = use anywhere
const metadata = await snowflake`iceberg metadata for CUSTOMER_EVENTS`
// Access from Spark, Trino, Presto - it's just Iceberg

// Mount external Iceberg tables
await snowflake`mount iceberg table analytics.events from Glue catalog`
await snowflake`query the Databricks events table`
```

## AI-Native Features

### Natural Language Queries

```typescript
// Just ask - it's all the same syntax
const orders = await snowflake`how many orders last month?`
const churn = await snowflake`what's driving customer churn by channel?`
const forecast = await snowflake`predict Q2 revenue from historical trends`

// Returns data, SQL, and narrative
console.log(orders.data)       // Query results
console.log(orders.sql)        // Generated SQL
console.log(orders.insight)    // AI-generated explanation

// Complex analytics in plain English
await snowflake`
  why did west coast revenue drop?
  compare to last quarter by product line
`
```

### AI Agents as Data Engineers

```typescript
import { priya, tom, ralph, quinn } from 'agents.do'

// Agents talk to the warehouse like teammates
const insights = await priya`what features drive retention from user engagement data?`
const review = await tom`review our warehouse schema for the growing query load`
const pipeline = await ralph`build ETL from Kafka through transform to snowflake`
const quality = await quinn`test customer_360 for nulls, dupes, and broken refs`

// Chain agents and data operations together
const dataProduct = await priya`define customer analytics requirements`
  .map(spec => tom`design the data model for ${spec}`)
  .map(model => ralph`implement ${model} in snowflake`)
  .map(impl => quinn`validate ${impl}`)
  .map(validated => priya`create dashboard from ${validated}`)
```

### Automated Optimization

```typescript
// Ask for optimization advice naturally
await snowflake`why are my queries slow this week?`
await snowflake`which warehouses should I consolidate?`
await snowflake`how should I cluster the EVENTS table?`

// Or just let it optimize
await snowflake`optimize slow queries from last 7 days`
await snowflake`right-size all warehouses`
await snowflake`auto-cluster EVENTS based on query patterns`
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

// AI agents can manage the entire warehouse through natural language
// The MCP server translates to appropriate operations

// Tools available:
// - query, create_table, create_warehouse, clone_database
// - time_travel, stream, task, pipe, share, load_data
// - optimize, explain, monitor

// AI just talks naturally - tools are invoked automatically
await snowflake`create EVENTS table with event_id and payload, cluster by date`
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
