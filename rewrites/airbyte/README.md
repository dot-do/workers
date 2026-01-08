# airbyte.do

> Data Integration. Edge-Native. Natural Language First.

Airbyte raised $181M to build "the open-source standard for data integration." Now they run a cloud service charging $1.50/credit, require Kubernetes for self-hosting, and make data engineers babysit YAML files and Docker containers. Moving data shouldn't require a DevOps team.

**airbyte.do** is the serverless alternative. No Kubernetes. No Docker. No YAML. Natural language pipelines that deploy in seconds.

## AI-Native API

```typescript
import { airbyte } from 'airbyte.do'           // Full SDK
import { airbyte } from 'airbyte.do/tiny'      // Minimal client
import { airbyte } from 'airbyte.do/streaming' // Streaming ops
```

Natural language for data pipelines:

```typescript
import { airbyte } from 'airbyte.do'

// Talk to it like a colleague
const syncs = await airbyte`failing syncs this week`
const slow = await airbyte`connections taking > 1 hour`
const stale = await airbyte`sources not synced in 3 days`

// Chain like sentences
await airbyte`stripe charges`
  .sync(`to snowflake`)

// Pipelines that build themselves
await airbyte`connect salesforce`
  .discover()         // find all objects
  .sync(`bigquery`)   // sync everything
  .schedule(`hourly`) // keep it fresh
```

## The Problem

Self-hosted Airbyte dominates open-source ELT:

| What Airbyte Requires | The Reality |
|-----------------------|-------------|
| **Infrastructure** | 3-node Kubernetes cluster minimum |
| **Deployment** | 2+ hours to configure, test, deploy |
| **Monthly Compute** | $500-2000/month for mid-size workloads |
| **Expertise** | DevOps team or K8s knowledge required |
| **Configuration** | YAML files, Docker images, Helm charts |
| **Debugging** | kubectl logs, pod restarts, OOM errors |

### The Kubernetes Tax

Self-hosting Airbyte means:

- Multi-node K8s cluster (EKS, GKE, or roll your own)
- Temporal for workflow orchestration
- PostgreSQL for metadata
- MinIO or S3 for staging
- Monitoring stack (Prometheus, Grafana)
- On-call rotation for connector failures

Data engineers spend more time on infrastructure than data.

### The Cloud Alternative Isn't Cheap

Airbyte Cloud charges per credit:

- $1.50/credit (rows synced)
- High-volume = high bills
- Unpredictable costs at scale
- Still debugging connector configs

### The Configuration Complexity

Every connector needs:

```yaml
# This is what you're escaping
sourceDefinitionId: 778daa7c-feaf-4db6-96f3-70fd645acc77
connectionConfiguration:
  credentials:
    auth_type: OAuth
    client_id: ${SALESFORCE_CLIENT_ID}
    client_secret: ${SALESFORCE_CLIENT_SECRET}
    refresh_token: ${SALESFORCE_REFRESH_TOKEN}
  start_date: "2024-01-01T00:00:00Z"
  streams_criteria:
    - criteria: starts with
      value: Account
```

## The Solution

**airbyte.do** reimagines data integration:

```
Self-Hosted Airbyte               airbyte.do
-----------------------------------------------------------------
3-node K8s cluster                Zero infrastructure
2 hours to deploy                 Deploy in seconds
$500/month compute                Pay per sync
YAML configuration                Natural language
Docker image management           Managed connectors
kubectl debug                     \`airbyte\`why did it fail?\`\`
Temporal orchestration            Durable Objects
Manual scaling                    Edge-native auto-scale
```

## One-Click Deploy

```bash
npx create-dotdo airbyte
```

A full ELT platform. Running on your Cloudflare account. 300+ connectors ready.

```typescript
import { Airbyte } from 'airbyte.do'

export default Airbyte({
  name: 'my-data-platform',
  domain: 'data.mycompany.com',
})
```

## Features

### Sources

```typescript
// Connect sources naturally
await airbyte`connect to postgres at db.example.com`
await airbyte`add stripe as a source`
await airbyte`connect salesforce with oauth`

// AI infers what you need
await airbyte`postgres tables`              // lists available tables
await airbyte`stripe schema`                // shows data structure
await airbyte`test salesforce connection`   // verifies connectivity
```

### Destinations

```typescript
// Warehouses are one line
await airbyte`send to snowflake analytics.raw`
await airbyte`connect bigquery my-project.raw_data`
await airbyte`add databricks lakehouse`

// Or dictate directly
await airbyte`sync stripe to snowflake, bigquery, and redshift`
```

### Connections

```typescript
// Just say it
await airbyte`sync postgres users to bigquery hourly`
await airbyte`github commits to snowflake every 6 hours`
await airbyte`stripe to databricks, incremental on updated_at`

// AI configures sync modes automatically
await airbyte`what should I sync from salesforce?`
  .sync(`to snowflake`)   // submits with optimal settings

// Batch connections read like a pipeline manifest
await airbyte`
  postgres production:
  - users incremental
  - orders incremental
  - products full refresh
  all to bigquery hourly
`
```

### Sync Status

```typescript
// View status naturally
await airbyte`sync status`
await airbyte`failed syncs today`
await airbyte`slowest connections this week`

// AI surfaces what needs attention
```

### Schema Discovery

```typescript
// Discover sources naturally
await airbyte`what tables are in postgres?`
await airbyte`salesforce objects with data`
await airbyte`stripe schema changes since last week`
```

### Troubleshooting

```typescript
// Diagnose issues naturally
await airbyte`why did stripe sync fail?`
await airbyte`postgres connection timing out`
await airbyte`fix the salesforce oauth error`

// AI chains diagnosis and fixes
await airbyte`connectors with errors`
  .map(c => airbyte`diagnose ${c}`)
  .map(fix => airbyte`apply ${fix}`)
```

## Promise Pipelining

Chain operations without waiting. One network round trip.

```typescript
// Discover and sync in one chain
await airbyte`postgres tables`
  .map(table => airbyte`sync ${table} to bigquery incrementally`)
  .map(sync => airbyte`verify ${sync}`)

// Build complex pipelines that feel like talking
await airbyte`all stripe payment tables`
  .map(table => airbyte`sync ${table} to snowflake with dedup`)
  .map(sync => airbyte`transform cents to dollars in ${sync}`)
  .map(result => airbyte`notify #data-team when ${result} completes`)
```

## Agent Integration

```typescript
import { tom, priya } from 'agents.do'

// Chain agents and tools
await priya`design customer analytics pipeline`
  .map(spec => tom`implement ${spec} with airbyte.do`)
  .map(pipeline => airbyte`deploy ${pipeline}`)
```

## Architecture

### Durable Object per Connection

```
AirbyteDO (config, connectors, catalog)
  |
  +-- SourcesDO (source connectors)
  |     |-- SQLite: Source configs (encrypted)
  |     +-- Schema cache
  |
  +-- DestinationsDO (destination connectors)
  |     |-- SQLite: Destination configs (encrypted)
  |
  +-- ConnectionsDO (sync orchestration)
  |     |-- SQLite: Connection state
  |     +-- Sync history
  |
  +-- SyncsDO (job execution)
        |-- SQLite: Job state, metrics
        +-- R2: Staging data
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active connections, recent syncs | <10ms |
| **Warm** | R2 + Index | Sync history (30 days) | <100ms |
| **Cold** | R2 Archive | Audit logs (1+ years) | <1s |

## vs Airbyte

| Feature | Airbyte (Self-Hosted) | Airbyte Cloud | airbyte.do |
|---------|----------------------|---------------|------------|
| **Infrastructure** | 3-node K8s cluster | None | None |
| **Deployment** | 2+ hours | Minutes | Seconds |
| **Monthly Cost** | $500-2000 compute | $1.50/credit | Pay per sync |
| **Configuration** | YAML files | UI forms | Natural language |
| **Debugging** | kubectl logs | Logs UI | `airbyte\`why did it fail?\`` |
| **Scaling** | Manual | Managed | Edge-native auto-scale |
| **Data Location** | Your K8s cluster | Airbyte's cloud | Your Cloudflare account |
| **Lock-in** | Open source | Proprietary cloud | MIT licensed |

## Use Cases

### Data Warehouse Loading

Just sync and schedule. No infrastructure.

### Real-Time Analytics

CDC from databases, streaming to warehouses.

### AI/ML Pipelines

```typescript
// Sync to vector stores for RAG
await airbyte`sync notion pages to pinecone for search`

// Embeddings included
await airbyte`zendesk tickets to weaviate with embeddings`
```

### Multi-Destination Fan-Out

```typescript
// One source, many destinations
await airbyte`stripe to snowflake, bigquery, and redshift`
```

## Connectors

### 300+ Sources Supported

| Category | Examples |
|----------|----------|
| **Databases** | PostgreSQL, MySQL, MongoDB, SQL Server, Oracle |
| **Data Warehouses** | Snowflake, BigQuery, Redshift, Databricks |
| **SaaS** | Salesforce, HubSpot, Stripe, Shopify, Zendesk |
| **Files** | S3, GCS, SFTP, local files |
| **APIs** | REST, GraphQL, webhooks |

### 50+ Destinations Supported

| Category | Examples |
|----------|----------|
| **Warehouses** | Snowflake, BigQuery, Redshift, Databricks |
| **Lakes** | S3, GCS, Delta Lake, Iceberg |
| **Vector Stores** | Pinecone, Weaviate, Qdrant, Milvus |
| **Databases** | PostgreSQL, MySQL, MongoDB |

## Deployment Options

### Cloudflare Workers (Recommended)

```bash
npx create-dotdo airbyte
# Deploys to your Cloudflare account
```

### Self-Hosted

```bash
# Deploy to your infrastructure
docker run -p 8787:8787 dotdo/airbyte
```

## Why Cloudflare?

### 1. Global Edge

Sync jobs run close to data sources. Lower latency, faster syncs.

### 2. No Cold Starts

Durable Objects stay warm. No waiting for containers.

### 3. Unlimited Duration

Long-running syncs work naturally. No 30-second timeouts.

### 4. Built-in Queues

Reliable job scheduling. No external Temporal cluster.

### 5. R2 Storage

Staging area for large syncs. No S3 or MinIO setup.

## Related Domains

- **etl.do** - ETL pipeline orchestration
- **pipelines.do** - Data pipeline management
- **connectors.do** - Connector marketplace
- **catalog.do** - Data catalog and discovery

## Roadmap

### Core ELT
- [x] Source connectors (300+)
- [x] Destination connectors (50+)
- [x] Incremental sync
- [x] Full refresh
- [x] Schema discovery
- [ ] CDC support
- [ ] Custom transformations
- [ ] dbt integration

### AI
- [x] Natural language configuration
- [x] Auto-troubleshooting
- [ ] Schema mapping suggestions
- [ ] Sync optimization
- [ ] Anomaly detection

### Enterprise
- [x] Multi-workspace
- [ ] RBAC
- [ ] Audit logs
- [ ] SSO

## Contributing

airbyte.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/airbyte.do
cd airbyte.do
pnpm install
pnpm test
```

## License

MIT License - Move data freely.

---

<p align="center">
  <strong>No Kubernetes. No Docker. No YAML.</strong>
  <br />
  Natural language pipelines. Edge-native. Serverless.
  <br /><br />
  <a href="https://airbyte.do">Website</a> |
  <a href="https://docs.airbyte.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/airbyte.do">GitHub</a>
</p>
