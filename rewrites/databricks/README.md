# databricks.do

> The $62B Data Lakehouse. Now open source. AI-native. Zero complexity.

[![npm version](https://img.shields.io/npm/v/databricks.do.svg)](https://www.npmjs.com/package/databricks.do)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

Databricks built a $62B empire on Apache Spark. Unity Catalog costs $6/DBU. Serverless SQL warehouses start at $0.22/DBU. MLflow "Enterprise" requires premium tiers. A 50-person data team easily spends $500K-$1M/year.

**databricks.do** is the open-source alternative. Lakehouse architecture on Cloudflare. Delta tables backed by R2. SQL warehouses at the edge. ML pipelines without the bill.

## The Problem

Databricks has become synonymous with "enterprise data platform":

| The Databricks Tax | Reality |
|--------------------|---------|
| Unity Catalog | $6/DBU premium + compute costs |
| Serverless SQL | $0.22-$0.70/DBU depending on tier |
| MLflow "Enterprise" | Requires premium workspace |
| Jobs compute | $0.15-$0.40/DBU depending on tier |
| Real-time inference | Model serving at $0.07/1000 requests |
| Total platform | $500K-$1M+/year for serious data teams |

**The dirty secret**: Most Databricks implementations:
- Explode costs when workloads scale
- Lock you into proprietary Unity Catalog
- Require Databricks-specific skills (not transferable)
- Make data sharing across clouds expensive
- Hide simple SQL behind Spark complexity

Meanwhile, Databricks' core value proposition - **unified analytics on a lakehouse** - is fundamentally a storage and compute coordination problem. Edge compute with columnar storage solves this better.

## The Solution

**databricks.do** brings the lakehouse to the edge:

```bash
npx create-dotdo databricks
```

Your own Databricks alternative. Running on Cloudflare. AI-native from day one.

| Databricks | databricks.do |
|------------|---------------|
| $500K-$1M+/year | **Free** (open source) |
| Unity Catalog lock-in | **Open Delta Lake** |
| Spark required | **SQL-first** |
| DBU-based billing | **Pay for actual compute** |
| Cloud-specific | **Edge-native** |
| AI as premium feature | **AI at the core** |

---

## Features

### Unity Catalog

Data governance without the premium tier. Discover, manage, and secure all your data assets.

```typescript
import { databricks } from 'databricks.do'

// Create a catalog
await databricks.catalog.create({
  name: 'production',
  comment: 'Production data assets',
  owner: 'data-platform-team',
})

// Create a schema
await databricks.schema.create({
  catalog: 'production',
  name: 'sales',
  comment: 'Sales domain data',
  properties: {
    domain: 'sales',
    team: 'revenue-analytics',
  },
})

// Grant permissions
await databricks.grants.update({
  securable_type: 'SCHEMA',
  full_name: 'production.sales',
  changes: [
    {
      principal: 'data-analysts',
      add: ['SELECT', 'READ_VOLUME'],
    },
    {
      principal: 'data-engineers',
      add: ['SELECT', 'MODIFY', 'CREATE_TABLE'],
    },
  ],
})

// Data lineage tracking
const lineage = await databricks.lineage.get({
  table: 'production.sales.orders',
  direction: 'both', // upstream and downstream
})
```

### Delta Lake Tables

ACID transactions on cloud object storage. Time travel built-in.

```typescript
// Create a Delta table
await databricks.tables.create({
  catalog: 'production',
  schema: 'sales',
  name: 'orders',
  columns: [
    { name: 'order_id', type: 'BIGINT', nullable: false },
    { name: 'customer_id', type: 'BIGINT', nullable: false },
    { name: 'order_date', type: 'DATE', nullable: false },
    { name: 'amount', type: 'DECIMAL(18,2)', nullable: false },
    { name: 'status', type: 'STRING', nullable: false },
  ],
  partitionedBy: ['order_date'],
  clusteringBy: ['customer_id'],
  properties: {
    'delta.autoOptimize.optimizeWrite': 'true',
    'delta.autoOptimize.autoCompact': 'true',
  },
})

// Insert data with ACID guarantees
await databricks.tables.insert({
  table: 'production.sales.orders',
  data: [
    { order_id: 1, customer_id: 100, order_date: '2025-01-15', amount: 99.99, status: 'completed' },
    { order_id: 2, customer_id: 101, order_date: '2025-01-15', amount: 249.99, status: 'pending' },
  ],
})

// Time travel - query historical versions
const yesterdayData = await databricks.sql`
  SELECT * FROM production.sales.orders
  VERSION AS OF 42
`

// Or by timestamp
const historicalData = await databricks.sql`
  SELECT * FROM production.sales.orders
  TIMESTAMP AS OF '2025-01-14 00:00:00'
`

// MERGE (upsert) operations
await databricks.tables.merge({
  target: 'production.sales.orders',
  source: stagingOrders,
  on: 'target.order_id = source.order_id',
  whenMatched: {
    update: { status: 'source.status', amount: 'source.amount' },
  },
  whenNotMatched: {
    insert: '*',
  },
})
```

### Spark SQL

Full SQL analytics without the Spark cluster overhead.

```typescript
// SQL queries execute at the edge
const revenue = await databricks.sql`
  SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(amount) AS revenue,
    COUNT(DISTINCT customer_id) AS unique_customers
  FROM production.sales.orders
  WHERE order_date >= '2024-01-01'
  GROUP BY 1
  ORDER BY 1
`

// Window functions
const customerRanking = await databricks.sql`
  SELECT
    customer_id,
    SUM(amount) AS total_spend,
    RANK() OVER (ORDER BY SUM(amount) DESC) AS spend_rank,
    PERCENT_RANK() OVER (ORDER BY SUM(amount) DESC) AS percentile
  FROM production.sales.orders
  GROUP BY customer_id
`

// CTEs and complex queries
const cohortAnalysis = await databricks.sql`
  WITH first_orders AS (
    SELECT
      customer_id,
      DATE_TRUNC('month', MIN(order_date)) AS cohort_month
    FROM production.sales.orders
    GROUP BY customer_id
  ),
  monthly_activity AS (
    SELECT
      o.customer_id,
      f.cohort_month,
      DATE_TRUNC('month', o.order_date) AS activity_month,
      SUM(o.amount) AS revenue
    FROM production.sales.orders o
    JOIN first_orders f ON o.customer_id = f.customer_id
    GROUP BY 1, 2, 3
  )
  SELECT
    cohort_month,
    DATEDIFF(MONTH, cohort_month, activity_month) AS months_since_first,
    COUNT(DISTINCT customer_id) AS active_customers,
    SUM(revenue) AS cohort_revenue
  FROM monthly_activity
  GROUP BY 1, 2
  ORDER BY 1, 2
`
```

### MLflow Integration

Model lifecycle management without the premium workspace.

```typescript
import { mlflow } from 'databricks.do/ml'

// Create an experiment
const experiment = await mlflow.createExperiment({
  name: 'customer-churn-prediction',
  artifact_location: 'r2://mlflow-artifacts/churn',
  tags: {
    team: 'data-science',
    project: 'retention',
  },
})

// Log a run
const run = await mlflow.startRun({
  experiment_id: experiment.id,
  run_name: 'xgboost-v1',
})

await mlflow.logParams(run.id, {
  max_depth: 6,
  learning_rate: 0.1,
  n_estimators: 100,
})

await mlflow.logMetrics(run.id, {
  accuracy: 0.89,
  precision: 0.85,
  recall: 0.92,
  f1_score: 0.88,
  auc_roc: 0.94,
})

// Log the model
await mlflow.logModel(run.id, {
  artifact_path: 'model',
  flavor: 'sklearn',
  model: trainedModel,
  signature: {
    inputs: [
      { name: 'tenure', type: 'double' },
      { name: 'monthly_charges', type: 'double' },
      { name: 'total_charges', type: 'double' },
    ],
    outputs: [
      { name: 'churn_probability', type: 'double' },
    ],
  },
})

await mlflow.endRun(run.id)

// Register model to Model Registry
await mlflow.registerModel({
  name: 'customer-churn-model',
  source: `runs:/${run.id}/model`,
  description: 'XGBoost model for predicting customer churn',
})

// Promote to production
await mlflow.transitionModelVersion({
  name: 'customer-churn-model',
  version: 1,
  stage: 'Production',
  archive_existing: true,
})

// Model serving (inference at the edge)
const prediction = await mlflow.predict({
  model: 'customer-churn-model',
  stage: 'Production',
  input: {
    tenure: 24,
    monthly_charges: 79.99,
    total_charges: 1919.76,
  },
})
// { churn_probability: 0.23 }
```

### Notebooks

Interactive analytics without the cluster spin-up time.

```typescript
import { notebooks } from 'databricks.do'

// Create a notebook
const notebook = await notebooks.create({
  path: '/workspace/analytics/sales-analysis',
  language: 'SQL', // SQL, Python, Scala, R
  content: `
-- Cell 1: Load data
SELECT * FROM production.sales.orders LIMIT 10

-- Cell 2: Aggregate
SELECT
  status,
  COUNT(*) as count,
  SUM(amount) as total
FROM production.sales.orders
GROUP BY status

-- Cell 3: Visualization
%viz bar
SELECT
  DATE_TRUNC('day', order_date) as date,
  SUM(amount) as revenue
FROM production.sales.orders
WHERE order_date >= CURRENT_DATE - INTERVAL 30 DAYS
GROUP BY 1
ORDER BY 1
  `,
})

// Run a notebook
const result = await notebooks.run({
  path: '/workspace/analytics/sales-analysis',
  parameters: {
    start_date: '2025-01-01',
    end_date: '2025-01-31',
  },
})

// Schedule notebook execution
await notebooks.schedule({
  path: '/workspace/analytics/daily-report',
  cron: '0 8 * * *', // 8 AM daily
  timezone: 'America/Los_Angeles',
  alerts: {
    on_failure: ['data-team@company.com'],
  },
})
```

### SQL Warehouses

Serverless SQL compute that scales to zero.

```typescript
import { warehouse } from 'databricks.do'

// Create a SQL warehouse
const wh = await warehouse.create({
  name: 'analytics-warehouse',
  size: 'Small', // Small, Medium, Large, X-Large
  auto_stop_mins: 15,
  enable_photon: true, // Vectorized query engine
  max_num_clusters: 10,
  spot_instance_policy: 'COST_OPTIMIZED',
})

// Execute queries against the warehouse
const result = await warehouse.query({
  warehouse_id: wh.id,
  statement: `
    SELECT
      product_category,
      SUM(revenue) as total_revenue,
      AVG(margin) as avg_margin
    FROM production.sales.product_metrics
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  `,
  wait_timeout: '30s',
})

// Query with parameters
const customerOrders = await warehouse.query({
  warehouse_id: wh.id,
  statement: `
    SELECT * FROM production.sales.orders
    WHERE customer_id = :customer_id
    AND order_date >= :start_date
  `,
  parameters: [
    { name: 'customer_id', value: '12345', type: 'BIGINT' },
    { name: 'start_date', value: '2025-01-01', type: 'DATE' },
  ],
})

// Stream results for large queries
for await (const chunk of warehouse.streamQuery({
  warehouse_id: wh.id,
  statement: 'SELECT * FROM production.logs.events',
  chunk_size: 10000,
})) {
  await processChunk(chunk)
}
```

### DLT Pipelines (Delta Live Tables)

Declarative ETL with automatic dependency management.

```typescript
import { DLT } from 'databricks.do/pipelines'

// Define a DLT pipeline
const pipeline = DLT.pipeline({
  name: 'sales-etl',
  target: 'production.sales',
  continuous: false,
  development: false,
})

// Bronze layer - raw ingestion
const rawOrders = pipeline.table({
  name: 'raw_orders',
  comment: 'Raw orders from source systems',
  source: () => databricks.sql`
    SELECT * FROM cloud_files(
      's3://raw-data/orders/',
      'json',
      map('cloudFiles.inferColumnTypes', 'true')
    )
  `,
  expectations: {
    'valid_order_id': 'order_id IS NOT NULL',
    'valid_amount': 'amount > 0',
  },
  expectation_action: 'ALLOW', // ALLOW, DROP, FAIL
})

// Silver layer - cleaned and conformed
const cleanedOrders = pipeline.table({
  name: 'cleaned_orders',
  comment: 'Cleaned and validated orders',
  source: () => databricks.sql`
    SELECT
      CAST(order_id AS BIGINT) AS order_id,
      CAST(customer_id AS BIGINT) AS customer_id,
      TO_DATE(order_date) AS order_date,
      CAST(amount AS DECIMAL(18,2)) AS amount,
      UPPER(TRIM(status)) AS status,
      CURRENT_TIMESTAMP() AS processed_at
    FROM LIVE.raw_orders
    WHERE order_id IS NOT NULL
  `,
  expectations: {
    'unique_orders': 'COUNT(*) = COUNT(DISTINCT order_id)',
  },
})

// Gold layer - business aggregates
const dailySales = pipeline.table({
  name: 'daily_sales',
  comment: 'Daily sales aggregations',
  source: () => databricks.sql`
    SELECT
      order_date,
      COUNT(*) AS order_count,
      COUNT(DISTINCT customer_id) AS unique_customers,
      SUM(amount) AS total_revenue,
      AVG(amount) AS avg_order_value
    FROM LIVE.cleaned_orders
    WHERE status = 'COMPLETED'
    GROUP BY order_date
  `,
})

// Deploy the pipeline
await pipeline.deploy()

// Run the pipeline
const update = await pipeline.start()
console.log(update.state) // STARTING -> RUNNING -> COMPLETED
```

### Lakehouse Architecture

Unified platform for all your data workloads.

```typescript
import { lakehouse } from 'databricks.do'

// Configure the lakehouse
const config = await lakehouse.configure({
  // Storage layer
  storage: {
    type: 'r2', // R2, S3, GCS, ADLS
    bucket: 'company-lakehouse',
    region: 'auto',
  },

  // Compute layer
  compute: {
    default_warehouse: 'analytics-warehouse',
    spark_config: {
      'spark.sql.adaptive.enabled': 'true',
      'spark.sql.adaptive.coalescePartitions.enabled': 'true',
    },
  },

  // Governance layer
  governance: {
    default_catalog: 'production',
    audit_logging: true,
    data_lineage: true,
    column_level_security: true,
  },

  // AI layer
  ai: {
    vector_search_enabled: true,
    feature_store_enabled: true,
    model_serving_enabled: true,
  },
})

// Lakehouse medallion architecture
const architecture = await lakehouse.createMedallion({
  bronze: {
    catalog: 'raw',
    retention_days: 90,
    format: 'delta',
  },
  silver: {
    catalog: 'curated',
    retention_days: 365,
    format: 'delta',
    z_ordering: true,
  },
  gold: {
    catalog: 'production',
    retention_days: null, // Forever
    format: 'delta',
    materialized_views: true,
  },
})
```

---

## AI-Native Analytics

This is the revolution. Data engineering and analytics are fundamentally AI problems.

### Natural Language to SQL

Skip the SQL syntax. Just ask:

```typescript
import { databricks } from 'databricks.do'

// Natural language queries
const result = await databricks`what were our top 10 customers by revenue last quarter?`
// Generates and executes:
// SELECT customer_id, SUM(amount) as revenue
// FROM production.sales.orders
// WHERE order_date >= DATE_TRUNC('quarter', CURRENT_DATE - INTERVAL 3 MONTHS)
// GROUP BY customer_id
// ORDER BY revenue DESC
// LIMIT 10

const analysis = await databricks`analyze the trend in order volume over the past year`
// Returns data + visualization + narrative

const pipeline = await databricks`create an ETL pipeline to load customer data from S3`
// Generates DLT pipeline definition
```

### Promise Pipelining for ML Workflows

Chain ML operations without callback hell:

```typescript
import { priya, ralph, tom } from 'agents.do'
import { databricks, mlflow } from 'databricks.do'

// Build an ML pipeline with promise pipelining
const deployed = await databricks`load customer transaction data`
  .map(data => databricks`clean and validate the data`)
  .map(cleaned => databricks`engineer features for churn prediction`)
  .map(features => mlflow`train an XGBoost model`)
  .map(model => mlflow`evaluate model performance`)
  .map(evaluated => mlflow`register model if metrics pass thresholds`)
  .map(registered => mlflow`deploy to production endpoint`)

// One network round trip. Record-replay pipelining.

// AI agents orchestrate the workflow
const mlPipeline = await priya`design a customer segmentation model`
  .map(spec => ralph`implement the feature engineering`)
  .map(features => ralph`train the clustering model`)
  .map(model => [priya, tom].map(r => r`review the model performance`))
  .map(reviewed => ralph`deploy to production`)
```

### AI-Powered Data Quality

Automatic anomaly detection and data quality monitoring:

```typescript
import { dataQuality } from 'databricks.do/ai'

// Monitor data quality with AI
const monitor = await dataQuality.createMonitor({
  table: 'production.sales.orders',
  baseline_window: '30 days',
  metrics: [
    'row_count',
    'null_rate',
    'distinct_count',
    'statistical_distribution',
  ],
  alert_on: {
    row_count_change: 0.2, // 20% change
    null_rate_increase: 0.05, // 5% increase
    statistical_drift: 0.1, // Distribution shift
  },
})

// AI explains anomalies
const anomaly = await dataQuality.explain({
  table: 'production.sales.orders',
  metric: 'row_count',
  timestamp: '2025-01-15',
})
// "Row count dropped 35% on 2025-01-15 compared to the 30-day average.
//  Root cause analysis:
//  - Source system API returned errors from 2-4 AM UTC
//  - 12,453 orders failed to ingest
//  - Recommendation: Re-run ingestion for affected time window"
```

### AI Agents as Data Engineers

AI agents can build and maintain your data platform:

```typescript
import { priya, ralph, tom, quinn } from 'agents.do'
import { databricks } from 'databricks.do'

// Product manager defines requirements
const spec = await priya`
  we need a customer 360 view that combines:
  - transaction history
  - support tickets
  - product usage
  - marketing engagement
  create a data model spec
`

// Developer implements the data pipeline
const pipeline = await ralph`
  implement the customer 360 data model from ${spec}
  use DLT for incremental processing
  ensure GDPR compliance with column masking
`

// Tech lead reviews the architecture
const review = await tom`
  review the customer 360 pipeline architecture:
  - data modeling best practices
  - performance optimization
  - cost efficiency
  ${pipeline}
`

// QA validates data quality
const validation = await quinn`
  create data quality tests for customer 360:
  - referential integrity
  - business rule validation
  - freshness SLAs
`
```

---

## Architecture

databricks.do mirrors Databricks' architecture with Durable Objects:

```
                     Cloudflare Edge
                           |
           +---------------+---------------+
           |               |               |
     +-----------+   +-----------+   +-----------+
     | Auth      |   | SQL       |   | MCP       |
     | Gateway   |   | Gateway   |   | Server    |
     +-----------+   +-----------+   +-----------+
           |               |               |
           +-------+-------+-------+-------+
                   |               |
            +------------+  +------------+
            | Workspace  |  | Workspace  |
            | DO         |  | DO         |
            +------------+  +------------+
                   |
    +--------------+--------------+
    |              |              |
+--------+  +-----------+  +---------+
| Catalog|  | Warehouse |  | MLflow  |
| DO     |  | DO        |  | DO      |
+--------+  +-----------+  +---------+
    |              |              |
+---+---+   +------+------+  +----+----+
|       |   |      |      |  |    |    |
Delta  Unity Query Vector Model Exp
Tables Catalog Engine Search Registry
```

### Durable Object Structure

| Durable Object | Databricks Equivalent | Purpose |
|----------------|----------------------|---------|
| `WorkspaceDO` | Workspace | Multi-tenant isolation |
| `CatalogDO` | Unity Catalog | Data governance |
| `SchemaDO` | Schema | Namespace management |
| `TableDO` | Delta Table | ACID table operations |
| `WarehouseDO` | SQL Warehouse | Query execution |
| `PipelineDO` | DLT Pipeline | ETL orchestration |
| `NotebookDO` | Notebook | Interactive analytics |
| `MLflowDO` | MLflow | Model lifecycle |
| `ExperimentDO` | Experiment | ML tracking |
| `ModelDO` | Model Registry | Model versioning |

### Storage Tiers

```
Hot (SQLite in DO)     Warm (R2 Parquet)     Cold (R2 Archive)
-----------------      -----------------      -----------------
Catalog metadata       Delta table data       Historical versions
Recent query cache     ML artifacts           Audit logs
Notebook state         Feature store          Compliance archive
MLflow tracking        Large datasets         Long-term retention
```

### Query Execution

```typescript
// Query flow
SQL Query
    |
    v
Query Parser (Validate syntax)
    |
    v
Catalog Resolver (Resolve table references)
    |
    v
Access Control (Check permissions)
    |
    v
Query Optimizer (Generate execution plan)
    |
    v
Storage Layer (Fetch from R2/cache)
    |
    v
Execution Engine (Process at edge)
    |
    v
Results (Stream back to client)
```

---

## vs Databricks

| Feature | Databricks | databricks.do |
|---------|------------|---------------|
| Pricing | $500K-$1M+/year | **Free** |
| Unity Catalog | $6/DBU premium | **Included** |
| SQL Warehouse | $0.22-$0.70/DBU | **Edge compute** |
| MLflow | Premium tier | **Included** |
| Infrastructure | Databricks managed | **Your Cloudflare** |
| Lock-in | Proprietary | **Open source** |
| Spark required | Yes | **SQL-first** |
| AI features | Premium add-ons | **Native** |

### Cost Comparison

**50-person data team with moderate workloads:**

| | Databricks | databricks.do |
|-|------------|---------------|
| SQL Warehouse compute | $180,000/year | $0 |
| Unity Catalog | $36,000/year | $0 |
| Jobs compute | $120,000/year | $0 |
| MLflow/Model Serving | $48,000/year | $0 |
| Databricks Premium | $96,000/year | $0 |
| **Annual Total** | **$480,000** | **$50** (Workers) |
| **3-Year TCO** | **$1,440,000+** | **$150** |

---

## Quick Start

### One-Click Deploy

```bash
npx create-dotdo databricks

# Follow prompts:
# - Workspace name
# - Storage configuration (R2 bucket)
# - Default catalog name
# - Authentication method
```

### Manual Setup

```bash
git clone https://github.com/dotdo/databricks.do
cd databricks.do
npm install
npm run deploy
```

### First Query

```typescript
import { DatabricksClient } from 'databricks.do'

const databricks = new DatabricksClient({
  url: 'https://your-workspace.databricks.do',
  token: process.env.DATABRICKS_TOKEN,
})

// 1. Create a catalog
await databricks.catalog.create({ name: 'demo' })

// 2. Create a schema
await databricks.schema.create({
  catalog: 'demo',
  name: 'sales',
})

// 3. Create a table
await databricks.tables.create({
  catalog: 'demo',
  schema: 'sales',
  name: 'orders',
  columns: [
    { name: 'id', type: 'BIGINT' },
    { name: 'customer', type: 'STRING' },
    { name: 'amount', type: 'DECIMAL(10,2)' },
  ],
})

// 4. Insert data
await databricks.tables.insert({
  table: 'demo.sales.orders',
  data: [
    { id: 1, customer: 'Acme Corp', amount: 999.99 },
    { id: 2, customer: 'Globex Inc', amount: 1499.99 },
  ],
})

// 5. Query with SQL
const result = await databricks.sql`
  SELECT customer, SUM(amount) as total
  FROM demo.sales.orders
  GROUP BY customer
`

// 6. Or use natural language
const analysis = await databricks`what's our total revenue?`
// "Total revenue is $2,499.98 from 2 orders."
```

---

## Migration from Databricks

### Export from Databricks

```bash
# Export Unity Catalog metadata
databricks unity-catalog export --catalog production --output ./export

# Export notebooks
databricks workspace export_dir /workspace ./notebooks --format DBC

# Export MLflow experiments
databricks experiments export --experiment-id 123 --output ./mlflow

# Or use our migration tool
npx databricks.do migrate export \
  --workspace https://your-workspace.cloud.databricks.com \
  --token $DATABRICKS_TOKEN
```

### Import to databricks.do

```bash
npx databricks.do migrate import \
  --source ./export \
  --url https://your-workspace.databricks.do

# Migrates:
# - Unity Catalog (catalogs, schemas, tables)
# - Table data (Delta format preserved)
# - Access controls and grants
# - MLflow experiments and models
# - Notebooks and dashboards
# - SQL queries and alerts
```

### Parallel Run

```typescript
// Run both systems during transition
const bridge = databricks.migration.createBridge({
  source: {
    type: 'databricks-cloud',
    workspace: 'https://...',
    token: process.env.DATABRICKS_TOKEN,
  },
  target: {
    type: 'databricks.do',
    url: 'https://...',
  },
  mode: 'dual-read', // Read from both, compare results
})

// Validation queries run against both
// Reconciliation reports generated automatically
// Cut over when confident
```

---

## Industry Use Cases

### Data Engineering

```typescript
// Real-time data pipeline
const pipeline = DLT.pipeline({
  name: 'streaming-events',
  continuous: true,
})

pipeline.table({
  name: 'events_bronze',
  source: () => databricks.sql`
    SELECT * FROM cloud_files(
      'r2://events/',
      'json',
      map('cloudFiles.format', 'json')
    )
  `,
})

pipeline.table({
  name: 'events_silver',
  source: () => databricks.sql`
    SELECT
      event_id,
      user_id,
      event_type,
      TO_TIMESTAMP(event_time) as event_timestamp,
      properties
    FROM LIVE.events_bronze
  `,
})
```

### Data Science

```typescript
// Feature engineering + model training
const features = await databricks.sql`
  SELECT
    customer_id,
    COUNT(*) as order_count,
    SUM(amount) as total_spend,
    AVG(amount) as avg_order_value,
    MAX(order_date) as last_order,
    DATEDIFF(CURRENT_DATE, MAX(order_date)) as days_since_last_order
  FROM production.sales.orders
  GROUP BY customer_id
`

const model = await mlflow.autoML({
  task: 'classification',
  target: 'churned',
  features: features,
  time_budget_minutes: 60,
})
```

### Business Intelligence

```typescript
// Self-service analytics
const dashboard = await databricks.dashboard.create({
  name: 'Executive Summary',
  queries: [
    {
      name: 'Revenue Trend',
      sql: `SELECT DATE_TRUNC('month', order_date) as month, SUM(amount) as revenue FROM production.sales.orders GROUP BY 1`,
      visualization: 'line',
    },
    {
      name: 'Top Customers',
      sql: `SELECT customer_id, SUM(amount) as spend FROM production.sales.orders GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
      visualization: 'bar',
    },
  ],
  refresh_schedule: '0 8 * * *',
})
```

---

## Roadmap

### Now
- [x] Unity Catalog (catalogs, schemas, tables)
- [x] Delta Lake tables with ACID
- [x] SQL Warehouse queries
- [x] MLflow tracking and registry
- [x] Notebooks (SQL)
- [x] Natural language queries

### Next
- [ ] DLT Pipelines (full implementation)
- [ ] Python notebooks
- [ ] Real-time streaming tables
- [ ] Vector search
- [ ] Feature store
- [ ] Model serving endpoints

### Later
- [ ] Spark compatibility layer
- [ ] DBT integration
- [ ] Airflow integration
- [ ] Unity Catalog federation
- [ ] Cross-cloud Delta Sharing
- [ ] Photon-compatible query engine

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Quick Start](./docs/quickstart.mdx) | Deploy in 5 minutes |
| [Unity Catalog](./docs/unity-catalog.mdx) | Data governance |
| [Delta Lake](./docs/delta-lake.mdx) | ACID tables |
| [SQL Warehouse](./docs/sql-warehouse.mdx) | Query execution |
| [MLflow](./docs/mlflow.mdx) | ML lifecycle |
| [DLT Pipelines](./docs/dlt.mdx) | ETL orchestration |
| [Migration](./docs/migration.mdx) | Moving from Databricks |

---

## Contributing

databricks.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/databricks.do
cd databricks.do
npm install
npm test
npm run dev
```

Key areas for contribution:
- Query engine optimization
- Delta Lake protocol compliance
- MLflow API compatibility
- Notebook execution runtime
- DLT pipeline orchestration

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT

---

<p align="center">
  <strong>The Lakehouse, simplified.</strong><br/>
  Built on Cloudflare Workers. Powered by AI. No DBU pricing.
</p>
