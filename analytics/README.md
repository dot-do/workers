# 2025-10-03-analytics-pipeline

## Idea Summary

Real-time analytics data pipeline on Cloudflare edge

## Original Location

- **Source**: `cloudflare-data-poc-analytics/`
- **Date**: 2025-10-03
- **Type**: Cloudflare Data POC

## Current State

- Node.js project with package.json
- Cloudflare Workers project
- Source code in src/ directory
- Test suite included

## Key Learnings


## Next Steps

### If Validated ✅
- Extract core functionality to appropriate production repo
- Add comprehensive tests and documentation
- Integrate with platform architecture
- Deploy to production environment

### If Needs More Work ⚙️
- Continue iterating on approach
- Add missing features or capabilities
- Benchmark performance
- Document remaining blockers

### If Deprecated ❌
- Document why approach didn't work
- Extract valuable learnings to notes/
- Archive for reference
- Clean up resources

## Related Documentation

- **Root CLAUDE.md**: `../CLAUDE.md` - Multi-repo management
- **Prototypes Guide**: `../tmp/CLAUDE.md` - Experimental sandbox guidelines
- **POC Process**: `../poc/CLAUDE.md` - Formal POC workflow

---

**Created**: {date}
**Consolidated**: {datetime.now().strftime('%Y-%m-%d')}
**Status**: Archived for evaluation

---

## Original README

# Cloudflare Real-time Analytics Platform POC

A comprehensive analytics platform built on Cloudflare's Workers Analytics Engine, Pipelines, and R2 SQL for real-time event tracking, performance monitoring, and usage-based billing.

## 🚀 Features

### Event Ingestion
- **High-throughput ingestion** - Accept events via HTTP POST
- **Batch processing** - Efficient batch ingestion API
- **Auto-instrumentation** - Middleware for automatic request tracking
- **Multi-tenant** - Organization and user-level tracking
- **Performance metrics** - Duration, status codes, error tracking
- **Usage tracking** - Built-in support for usage-based billing

### Query & Analytics
- **Time-series queries** - Flexible time-range and grouping
- **Performance analysis** - Percentiles (P50, P95, P99)
- **Error tracking** - Error rates and breakdowns
- **User analytics** - Active users, sessions, cohorts
- **Usage billing** - Automatic usage calculations for billing
- **Pre-built templates** - Common query patterns

### Data Storage
- **Analytics Engine** - Real-time data (30-90 days)
- **R2 Parquet** - Historical data via Pipelines
- **R2 SQL** - SQL queries on historical data
- **Automatic archival** - Seamless transition to R2

## 📁 Project Structure

```
cloudflare-data-poc-analytics/
├── src/
│   ├── ingestion.ts        # Event ingestion worker + RPC service
│   ├── query.ts            # Query API worker + SQL templates
│   ├── types.ts            # TypeScript type definitions
│   └── dashboard.html      # Real-time dashboard UI
├── examples/
│   ├── sample-events.json      # Example event payloads
│   ├── query-examples.sql      # Common SQL queries
│   └── integration-example.ts  # Integration patterns
├── tests/
│   └── analytics.test.ts   # Test suite
├── wrangler.jsonc          # Cloudflare Workers config
├── pipeline-config.yaml    # Pipeline configuration
├── schema.sql              # Analytics Engine schema docs
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Setup

### Prerequisites

1. **Cloudflare Account** with Workers Paid plan
2. **Node.js** 18+ and pnpm
3. **Wrangler CLI** installed globally

### Installation

```bash
# Install dependencies
pnpm install

# Login to Cloudflare
wrangler login

# Update account_id in wrangler.jsonc
# Get your account ID: wrangler whoami
```

### Create Analytics Engine Dataset

```bash
# Create dataset for events
wrangler analytics-engine create-dataset analytics_events

# Create dataset for pipeline metrics
wrangler analytics-engine create-dataset pipeline_metrics
```

### Create R2 Bucket

```bash
# Create bucket for analytics storage
wrangler r2 bucket create analytics-storage

# Create bucket for errors (DLQ)
wrangler r2 bucket create analytics-errors
```

### Create Pipeline

```bash
# Create pipeline for streaming to R2
wrangler pipelines create analytics-to-r2 \
  --source analytics_events \
  --destination r2://analytics-storage/analytics/ \
  --config pipeline-config.yaml
```

### Optional: Create D1 Database

```bash
# For metadata and enrichment
wrangler d1 create analytics_metadata
```

## 🚀 Development

### Start Dev Server

```bash
# Start ingestion worker
pnpm dev

# Start query worker (in another terminal)
pnpm dev:query
```

### Ingest Sample Events

```bash
# Ingest single event
curl -X POST http://localhost:8787/events \
  -H "Content-Type: application/json" \
  -d '{
    "event": "api.request",
    "userId": "user_123",
    "properties": {
      "method": "GET",
      "path": "/api/users"
    },
    "performance": {
      "duration": 45.5,
      "statusCode": 200
    }
  }'

# Ingest batch
curl -X POST http://localhost:8787/events/batch \
  -H "Content-Type: application/json" \
  -d @examples/sample-events.json
```

### Query Analytics

```bash
# Time-series query
curl -X POST http://localhost:8788/query \
  -H "Content-Type: application/json" \
  -d '{
    "start": "2025-10-03T00:00:00Z",
    "end": "2025-10-03T23:59:59Z",
    "groupBy": "hour"
  }'

# Performance metrics
curl -X POST http://localhost:8788/metrics/performance \
  -H "Content-Type: application/json" \
  -d '{
    "start": "2025-10-03T00:00:00Z",
    "end": "2025-10-03T23:59:59Z",
    "groupBy": "hour"
  }'

# Usage billing
curl -X POST http://localhost:8788/billing/usage \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org_456",
    "start": "2025-10-01T00:00:00Z",
    "end": "2025-10-31T23:59:59Z"
  }'
```

### View Dashboard

```bash
# Open dashboard in browser
open http://localhost:8788/dashboard.html
```

## 📦 Deployment

### Deploy to Production

```bash
# Deploy both workers
pnpm deploy:all

# Or deploy individually
pnpm deploy          # Ingestion worker
pnpm deploy:query    # Query worker
```

### Deploy to Staging

```bash
wrangler deploy --env staging
```

### Monitor Deployment

```bash
# Tail logs
pnpm tail

# View analytics in dashboard
wrangler analytics-engine query analytics_events "SELECT COUNT(*) FROM analytics_events"
```

## 🔗 Integration with Existing Workers

### 1. Add Service Binding

Add to your worker's `wrangler.jsonc`:

```jsonc
{
  "services": [
    {
      "binding": "ANALYTICS_INGESTION",
      "service": "cloudflare-data-poc-analytics"
    }
  ]
}
```

### 2. Add Auto-Instrumentation

```typescript
import { Hono } from 'hono'

const app = new Hono()

// Add analytics middleware
app.use('*', async (c, next) => {
  const startTime = Date.now()

  await next()

  await c.env.ANALYTICS_INGESTION.ingestEvent({
    event: 'api.request',
    userId: c.get('userId'),
    properties: {
      method: c.req.method,
      path: new URL(c.req.url).pathname,
    },
    performance: {
      duration: Date.now() - startTime,
      statusCode: c.res.status,
    },
  })
})
```

### 3. Track Usage

```typescript
// Track AI token usage
await env.ANALYTICS_INGESTION.ingestEvent({
  event: 'usage.tracked',
  userId: 'user_123',
  organizationId: 'org_456',
  usage: {
    quantity: 1500,
    unit: 'tokens',
    sku: 'ai-text-generation',
  },
})
```

See `examples/integration-example.ts` for complete integration patterns.

## 📊 Common Use Cases

### 1. API Performance Monitoring

Track request volume, response times, and error rates across all endpoints.

```sql
SELECT
  indexes[2] as endpoint,
  COUNT(*) as requests,
  AVG(blobs[1]) as avg_ms,
  PERCENTILE(blobs[1], 0.95) as p95_ms
FROM analytics_events
WHERE timestamp >= ...
GROUP BY indexes[2]
```

### 2. Usage-Based Billing

Calculate monthly usage by organization and SKU for accurate billing.

```sql
SELECT
  indexes[0] as org_id,
  indexes[2] as sku,
  SUM(blobs[3]) as total_quantity
FROM analytics_events
WHERE event = 'usage.tracked'
  AND timestamp >= ...
GROUP BY indexes[0], indexes[2]
```

### 3. Error Tracking

Identify error patterns and track error rates over time.

```sql
SELECT
  FLOOR(timestamp / 3600000) * 3600000 as hour,
  SUM(CASE WHEN blobs[2] >= 400 THEN 1 ELSE 0 END) / COUNT(*) as error_rate
FROM analytics_events
GROUP BY hour
```

### 4. User Analytics

Track active users, sessions, and user behavior patterns.

```sql
SELECT
  COUNT(DISTINCT indexes[0]) as active_users,
  COUNT(DISTINCT indexes[1]) as unique_sessions
FROM analytics_events
WHERE timestamp >= ...
```

## 🎯 Architecture

### Data Flow

```
┌─────────────────┐
│  Client/Worker  │
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│   Ingestion     │──────┐
│    Worker       │      │
└────────┬────────┘      │
         │               │
         │ Write         │ Send to Pipeline
         ▼               ▼
┌─────────────────┐  ┌──────────────┐
│   Analytics     │  │   Pipeline   │
│     Engine      │  │  (Streaming) │
└─────────────────┘  └──────┬───────┘
         │                  │
         │ Query            │ Transform & Store
         ▼                  ▼
┌─────────────────┐  ┌──────────────┐
│  Query Worker   │  │  R2 Parquet  │
└─────────────────┘  └──────────────┘
         │                  │
         │                  │ R2 SQL
         ▼                  ▼
┌─────────────────┐  ┌──────────────┐
│   Dashboard     │  │   Analysis   │
└─────────────────┘  └──────────────┘
```

### Data Retention

- **Analytics Engine**: 30-90 days (real-time queries)
- **R2 Parquet**: Unlimited (historical queries)
- **Pipeline**: Streams data from AE → R2 automatically

### Performance

- **Ingestion**: Sub-millisecond writes
- **Real-time queries**: Typically < 100ms
- **Historical queries**: Depends on data size (R2 SQL)

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test -- --coverage
```

## 📈 Analytics Engine SQL Reference

See `examples/query-examples.sql` for 23 example queries covering:

- Time-series aggregations
- Performance analysis
- Error tracking
- User analytics
- Usage billing
- Cohort analysis
- Anomaly detection

## 🔧 Configuration

### Environment Variables

None required - all configuration is in `wrangler.jsonc`

### Bindings

- `ANALYTICS_ENGINE` - Analytics Engine dataset
- `PIPELINE` - Pipeline for R2 streaming
- `R2_BUCKET` - R2 bucket for storage
- `DB` - (Optional) D1 for metadata

### Customization

Edit `src/ingestion.ts` to customize:
- Event validation rules
- Index/blob structure
- Pipeline destinations

Edit `src/query.ts` to add:
- Custom query templates
- New aggregation patterns
- Additional metrics

## 📝 Documentation

- **Schema**: `schema.sql` - Analytics Engine data structure
- **Queries**: `examples/query-examples.sql` - SQL query patterns
- **Integration**: `examples/integration-example.ts` - Integration examples
- **API**: See inline JSDoc comments in source files

## 🤝 Integration Points

Works seamlessly with:

- **30+ existing workers** - Add via service bindings
- **Gateway worker** - Auto-track all requests
- **AI services** - Track token usage
- **Queue consumers** - Track processing metrics
- **Database services** - Track query performance

## 🚨 Troubleshooting

### Events not appearing

1. Check Analytics Engine dataset exists: `wrangler analytics-engine list-datasets`
2. Verify binding name matches `wrangler.jsonc`
3. Check worker logs: `wrangler tail`

### Pipeline not streaming

1. Verify pipeline created: `wrangler pipelines list`
2. Check R2 bucket exists: `wrangler r2 bucket list`
3. Review pipeline config: `pipeline-config.yaml`

### Queries returning empty

1. Wait 1-2 minutes for data propagation
2. Verify timestamp range is correct
3. Check index/blob structure matches schema

## 📚 Resources

- [Analytics Engine Docs](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Pipelines Docs](https://developers.cloudflare.com/pipelines/)
- [R2 SQL Docs](https://developers.cloudflare.com/r2/api/sql-api/)
- [Workers Docs](https://developers.cloudflare.com/workers/)

## 📄 License

MIT

---

**Built with ❤️ using Cloudflare Workers**

