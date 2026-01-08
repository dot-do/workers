# databricks.do

> The $62B Data Lakehouse. Now open source. AI-native. Zero complexity.

Databricks built a $62B empire on Apache Spark. Unity Catalog costs $6/DBU. Serverless SQL warehouses start at $0.22/DBU. MLflow "Enterprise" requires premium tiers. A 50-person data team easily spends $500K-$1M/year.

**databricks.do** is the open-source alternative. Lakehouse architecture on Cloudflare. Delta tables backed by R2. SQL warehouses at the edge. ML pipelines without the bill.

## AI-Native API

```typescript
import { databricks } from 'databricks.do'           // Full SDK
import { databricks } from 'databricks.do/tiny'      // Minimal client
import { databricks } from 'databricks.do/sql'       // SQL-only operations
```

Natural language for data workflows:

```typescript
import { databricks } from 'databricks.do'

// Talk to it like a colleague
const revenue = await databricks`sales by region last quarter`
const top = await databricks`top 10 customers by revenue`
const trend = await databricks`monthly revenue trend this year`

// Chain like sentences
await databricks`customers who churned last month`
  .map(c => databricks`analyze churn reasons for ${c}`)

// Pipelines that build themselves
await databricks`run sales ETL daily at 6am`
  .monitor()           // AI watches for anomalies
  .alert()             // notify on failures
```

## The Problem

Databricks has become synonymous with "enterprise data platform":

| The Databricks Tax | Reality |
|--------------------|---------|
| **Unity Catalog** | $6/DBU premium + compute costs |
| **Serverless SQL** | $0.22-$0.70/DBU depending on tier |
| **MLflow "Enterprise"** | Requires premium workspace |
| **Jobs compute** | $0.15-$0.40/DBU depending on tier |
| **Model serving** | $0.07/1000 requests |
| **Total platform** | $500K-$1M+/year for serious data teams |

### The DBU Tax

The real cost of Databricks:

- Costs explode when workloads scale
- Proprietary Unity Catalog lock-in
- Databricks-specific skills (not transferable)
- Cross-cloud data sharing is expensive
- Simple SQL hidden behind Spark complexity

Meanwhile, Databricks' core value - **unified analytics on a lakehouse** - is a storage and compute coordination problem. Edge compute with columnar storage solves this better.

## The Solution

**databricks.do** reimagines the lakehouse for data engineers:

```
Databricks                          databricks.do
-----------------------------------------------------------------
$500K-$1M+/year                     Deploy in minutes
$6/DBU Unity Catalog                $0 - open source
Spark required                      SQL-first
Cloud-specific                      Edge-native
AI as premium feature               AI at the core
DBU-based billing                   Pay for actual compute
```

## One-Click Deploy

```bash
npx create-dotdo databricks
```

Your own Lakehouse. Running on infrastructure you control. AI-native from day one.

```typescript
import { Databricks } from 'databricks.do'

export default Databricks({
  name: 'company-lakehouse',
  domain: 'data.company.com',
  storage: 'r2',
})
```

## Features

### Data Catalog

```typescript
// Just say what you need
await databricks`create production catalog`
await databricks`create sales schema in production`
await databricks`give analysts read access to sales`

// AI infers what you need
await databricks`production.sales`         // returns schema info
await databricks`lineage for orders`       // returns data lineage
await databricks`who can access sales?`    // returns permissions
```

### Delta Tables

```typescript
// Create tables naturally
await databricks`create orders table with order_id customer_id amount status`
await databricks`partition orders by date`
await databricks`add order_id 1 customer 100 amount 99.99 to orders`

// Time travel is one word
await databricks`orders as of yesterday`
await databricks`orders version 42`
await databricks`orders changes since last week`

// Merges read like English
await databricks`upsert staging_orders into orders on order_id`
```

### SQL Analytics

```typescript
// Just ask questions
await databricks`monthly revenue this year`
await databricks`customers ranked by spend`
await databricks`cohort analysis for Q1 signups`

// Complex analysis, simple words
await databricks`customer lifetime value by acquisition channel`
await databricks`revenue attribution by marketing touchpoint`
await databricks`funnel conversion rates by segment`
```

### MLflow

```typescript
// Experiments without the ceremony
await databricks`track churn prediction experiment`
await databricks`log accuracy 0.89 precision 0.85 recall 0.92`
await databricks`register churn model v1`

// Deploy with one line
await databricks`deploy churn model to production`
await databricks`predict churn for customer 12345`

// AI manages the lifecycle
await databricks`what's the best performing churn model?`
await databricks`compare model v1 vs v2`
```

### Notebooks

```typescript
// Run analysis like you'd describe it
await databricks`run sales analysis notebook`
await databricks`schedule daily report at 8am Pacific`

// AI writes the code
await databricks`analyze sales trends and visualize as line chart`
await databricks`create dashboard for executive summary`
```

### SQL Warehouses

```typescript
// Warehouses that manage themselves
await databricks`create analytics warehouse auto-stop 15 min`
await databricks`scale warehouse to handle Black Friday traffic`

// Stream large results naturally
await databricks`stream all events from last month`
  .each(batch => process(batch))
```

### ETL Pipelines

```typescript
// Pipelines in plain English
await databricks`create sales ETL bronze silver gold`
await databricks`run sales pipeline`
await databricks`backfill orders from January`

// Quality expectations built-in
await databricks`fail if order_id is null`
await databricks`drop rows where amount <= 0`
```

## Promise Pipelining

Chain operations without callback hell:

```typescript
// Build an ML pipeline with one chain
const deployed = await databricks`load customer transactions`
  .map(data => databricks`clean and validate ${data}`)
  .map(clean => databricks`engineer churn features from ${clean}`)
  .map(features => databricks`train XGBoost on ${features}`)
  .map(model => databricks`evaluate ${model}`)
  .map(evaluated => databricks`deploy if metrics pass`)

// One network round trip. Record-replay pipelining.
```

### AI Agents as Data Engineers

```typescript
import { priya, ralph, tom, quinn } from 'agents.do'

// The whole team, naturally
const spec = await priya`design customer 360 data model`
const pipeline = await ralph`implement ${spec} with DLT`
const review = await tom`review ${pipeline} architecture`
const tests = await quinn`create quality tests for ${pipeline}`

// Chain the team
await priya`plan Q1 data roadmap`
  .map(plan => ralph`implement ${plan}`)
  .map(code => [priya, tom, quinn].map(r => r`review ${code}`))
```

### AI-Powered Data Quality

```typescript
// Monitor automatically
await databricks`monitor orders for anomalies`
await databricks`alert if row count drops 20%`
await databricks`explain why orders dropped yesterday`
// "Row count dropped 35% - source API returned errors from 2-4 AM UTC.
//  12,453 orders failed to ingest. Re-run ingestion for affected window."
```

## Architecture

### Durable Object per Workspace

```
LakehouseDO (config, users, catalogs)
  |
  +-- CatalogDO (schemas, tables, permissions)
  |     |-- SQLite: Metadata (encrypted)
  |     +-- R2: Delta tables (Parquet)
  |
  +-- WarehouseDO (queries, cache)
  |     |-- SQLite: Query state
  |     +-- Query engine
  |
  +-- MLflowDO (experiments, models)
  |     |-- SQLite: Tracking data
  |     +-- R2: Artifacts
  |
  +-- PipelineDO (ETL, schedules)
        |-- SQLite: Pipeline state
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Metadata, recent queries | <10ms |
| **Warm** | R2 Parquet | Delta tables, features | <100ms |
| **Cold** | R2 Archive | Historical versions, audit | <1s |

## vs Databricks

| Feature | Databricks | databricks.do |
|---------|------------|---------------|
| **Implementation** | DBU billing complexity | Deploy in minutes |
| **Annual Cost** | $500K-$1M+ | ~$50/month |
| **Architecture** | Spark clusters | Edge-native, global |
| **Data Catalog** | $6/DBU premium | Included |
| **AI** | Premium add-ons | AI-first design |
| **Data Location** | Databricks managed | Your Cloudflare account |
| **Lock-in** | Proprietary | MIT licensed |

## Use Cases

### Data Engineering

```typescript
// Streaming pipelines in plain English
await databricks`stream events from Kafka to bronze`
await databricks`clean bronze events to silver`
await databricks`aggregate silver to gold metrics`

// Backfills are one line
await databricks`backfill orders from last month`
```

### Data Science

```typescript
// ML without the ceremony
await databricks`train churn model on customer features`
await databricks`tune hyperparameters for best accuracy`
await databricks`deploy if accuracy > 0.9`

// Feature engineering
await databricks`create customer lifetime value features`
await databricks`store features in feature store`
```

### Business Intelligence

```typescript
// Dashboards from questions
await databricks`create executive dashboard with revenue and customers`
await databricks`add filter for date range and region`
await databricks`schedule refresh daily at 6am`
```

### Migration from Databricks

```typescript
// One-liner migration
await databricks`import from cloud.databricks.com`

// Or step by step
await databricks`import catalog production from databricks`
await databricks`import notebooks from /workspace`
await databricks`import mlflow experiments`
```

## Deployment Options

### Cloudflare Workers

```bash
npx create-dotdo databricks
# Deploys to your Cloudflare account
```

### Private Cloud

```bash
docker run -p 8787:8787 dotdo/databricks
```

## Roadmap

### Core Lakehouse
- [x] Unity Catalog (catalogs, schemas, tables)
- [x] Delta Lake tables with ACID
- [x] SQL Warehouse queries
- [x] MLflow tracking and registry
- [x] Natural language queries
- [ ] DLT Pipelines (full)
- [ ] Real-time streaming
- [ ] Vector search

### AI
- [x] Natural language to SQL
- [x] AI data quality monitoring
- [ ] AutoML integration
- [ ] Feature store
- [ ] Model serving

## Contributing

databricks.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/databricks.do
cd databricks.do
pnpm install
pnpm test
```

## License

MIT License - For the data democratizers.

---

<p align="center">
  <strong>The $62B lakehouse ends here.</strong>
  <br />
  SQL-first. AI-native. No DBU pricing.
  <br /><br />
  <a href="https://databricks.do">Website</a> |
  <a href="https://docs.databricks.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/databricks.do">GitHub</a>
</p>
