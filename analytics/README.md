# Analytics Service - Real-Time Analytics Dashboard

**Real-time analytics for Services.Delivery using Cloudflare Analytics Engine**

## Overview

The Analytics Service provides comprehensive real-time analytics for the Services.Delivery marketplace, tracking service executions, revenue, marketplace activity, A/B test results, and user behavior.

### Key Features

✅ **Event Ingestion** - Track millions of events per day via POST /track
✅ **Real-Time Aggregation** - KV-backed counters for live dashboard updates
✅ **SQL Query API** - Flexible queries using Analytics Engine SQL API
✅ **SSE Streaming** - Real-time updates via Server-Sent Events
✅ **PayloadCMS Integration** - Beautiful dashboards with custom widgets
✅ **Export Functionality** - CSV/JSON export for external analysis

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Analytics Worker                        │
├─────────────────────────────────────────────────────────┤
│  POST /track          → Write events (25/request max)   │
│  POST /track/batch    → Batch write (25 events max)     │
│  GET /metrics/*       → Query aggregated metrics        │
│  GET /stream          → SSE for real-time updates       │
├─────────────────────────────────────────────────────────┤
│  Analytics Engine     → Unlimited cardinality storage   │
│  KV Namespace         → Real-time counter cache         │
│  Service Bindings     → RPC to @db/ service             │
└─────────────────────────────────────────────────────────┘
```

## Analytics Engine Schema

Events are mapped to Analytics Engine data points:

| Field | Usage | Example |
|-------|-------|---------|
| `blob1` | event_type | `service_execution`, `revenue_transaction` |
| `blob2` | service_id / experiment_id | `service-123` |
| `blob3` | user_id | `user-456` |
| `blob4` | session_id | `session-789` |
| `blob5` | category | `ai-ml` |
| `blob6` | status | `success`, `error` |
| `blob7` | currency | `USD` |
| `blob8` | error_code | `TIMEOUT` |
| `blob9` | search_query | `image generation` |
| `blob10` | conversion | `true`, `false` |
| `double1` | latency_ms | `245.3` |
| `double2` | revenue_amount | `100.00` |
| `double3` | variant_index | `1` |
| `index1` | sampling key | `user-456` or `service-123` |

## Metrics Tracked

### 1. Service Execution Metrics

- **Execution count** - Total service calls
- **Latency percentiles** - p50, p95, p99
- **Error rate** - Percentage of failed executions
- **Success rate** - Percentage of successful executions

**Example Event:**
```typescript
import { trackServiceExecution } from '@/collectors/service-executions'

const event = trackServiceExecution({
  serviceId: 'service-123',
  executionId: generateId(),
  latencyMs: 245,
  success: true,
  userId: user.id,
  sessionId: session.id,
})

await fetch('https://analytics.api.mw/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(event),
})
```

### 2. Revenue Metrics

- **GMV** - Gross Marketplace Volume
- **MRR** - Monthly Recurring Revenue
- **Take rate** - Platform fee percentage
- **Creator earnings** - Total creator payouts
- **Transaction count** - Number of orders
- **Average order value** - Mean transaction amount

**Example Event:**
```typescript
import { trackRevenueTransaction } from '@/collectors/revenue'

const event = trackRevenueTransaction({
  orderId: 'ord_123',
  serviceId: 'service-456',
  amount: 100.00,
  currency: 'USD',
  takeRate: 15, // 15% platform fee
  creatorId: 'creator-789',
  userId: user.id,
})

await fetch('https://analytics.api.mw/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(event),
})
```

### 3. Marketplace Metrics

- **Searches** - Number of search queries
- **Views** - Service page views
- **Conversions** - Purchase completions
- **Conversion rate** - Percentage of views → purchases
- **Top services** - Most viewed services
- **Top categories** - Most popular categories

**Example Events:**
```typescript
import { trackMarketplaceSearch, trackMarketplaceView, trackMarketplaceConversion } from '@/collectors/marketplace-activity'

// Search
await fetch('https://analytics.api.mw/track', {
  method: 'POST',
  body: JSON.stringify(trackMarketplaceSearch({
    searchQuery: 'image generation',
    category: 'ai-ml',
    sessionId: session.id,
  })),
})

// View
await fetch('https://analytics.api.mw/track', {
  method: 'POST',
  body: JSON.stringify(trackMarketplaceView({
    serviceId: 'service-123',
    category: 'ai-ml',
    sessionId: session.id,
  })),
})

// Conversion
await fetch('https://analytics.api.mw/track', {
  method: 'POST',
  body: JSON.stringify(trackMarketplaceConversion({
    serviceId: 'service-123',
    category: 'ai-ml',
    orderId: 'ord-456',
    userId: user.id,
    sessionId: session.id,
  })),
})
```

### 4. Experiment Metrics

- **Views per variant** - Number of impressions
- **Conversions per variant** - Goal completions
- **Conversion rate** - Percentage per variant
- **Winner determination** - Best performing variant
- **Statistical confidence** - Chi-square test result

**Example Events:**
```typescript
import { trackExperimentView, trackExperimentConversion } from '@/collectors/experiments'

// Variant shown
await fetch('https://analytics.api.mw/track', {
  method: 'POST',
  body: JSON.stringify(trackExperimentView({
    experimentId: 'pricing-test',
    variantIndex: 1, // Variant B
    sessionId: session.id,
  })),
})

// Goal completed
await fetch('https://analytics.api.mw/track', {
  method: 'POST',
  body: JSON.stringify(trackExperimentConversion({
    experimentId: 'pricing-test',
    variantIndex: 1,
    sessionId: session.id,
    userId: user.id,
  })),
})
```

### 5. User Metrics

- **DAU** - Daily Active Users
- **MAU** - Monthly Active Users
- **Retention** - Day 1, 7, 30 retention rates
- **Average session duration** - Mean session time
- **Churn rate** - Percentage of lost users

**Example Event:**
```typescript
import { trackUserSession } from '@/collectors/user-behavior'

await fetch('https://analytics.api.mw/track', {
  method: 'POST',
  body: JSON.stringify(trackUserSession({
    userId: user.id,
    sessionId: generateSessionId(),
    duration: Date.now() - session.startTime,
    cohort: '2025-10', // Month of user signup
  })),
})
```

## API Reference

### Event Ingestion

#### POST /track
Track a single event.

**Request:**
```json
{
  "eventType": "service_execution",
  "serviceId": "service-123",
  "latencyMs": 245,
  "success": true,
  "userId": "user-456",
  "sessionId": "session-789"
}
```

**Response:**
```json
{
  "success": true
}
```

**Limits:**
- Max 25 events per Worker invocation
- Events are written asynchronously (no await needed)

#### POST /track/batch
Track multiple events in one request.

**Request:**
```json
[
  { "eventType": "marketplace_view", "serviceId": "service-123", ... },
  { "eventType": "marketplace_view", "serviceId": "service-456", ... }
]
```

**Response:**
```json
{
  "success": true,
  "count": 2
}
```

**Limits:**
- Max 25 events per batch
- Total blob size must not exceed 16 KB per event

### Query API

#### GET /metrics/services
Query service performance metrics.

**Parameters:**
- `startDate` - ISO 8601 date (e.g., `2025-10-01T00:00:00Z`)
- `endDate` - ISO 8601 date
- `serviceId` - Filter by specific service (optional)
- `granularity` - `hour`, `day`, `week`, `month` (default: `day`)

**Response:**
```json
{
  "data": [
    {
      "serviceId": "service-123",
      "serviceName": "Image Generator",
      "executions": 1234,
      "latency": {
        "p50": 120,
        "p95": 340,
        "p99": 580,
        "avg": 165
      },
      "errorRate": 0.5,
      "successRate": 99.5,
      "period": "2025-10-01 to 2025-10-03"
    }
  ]
}
```

#### GET /metrics/revenue
Query revenue metrics.

**Parameters:**
- `startDate` - ISO 8601 date
- `endDate` - ISO 8601 date
- `granularity` - `hour`, `day`, `week`, `month`

**Response:**
```json
{
  "data": {
    "gmv": 125000.00,
    "mrr": 42000.00,
    "takeRate": 15,
    "creatorEarnings": 106250.00,
    "transactionCount": 1250,
    "avgOrderValue": 100.00,
    "period": "2025-10-01 to 2025-10-31"
  }
}
```

#### GET /metrics/marketplace
Query marketplace activity metrics.

**Parameters:**
- `startDate` - ISO 8601 date
- `endDate` - ISO 8601 date
- `category` - Filter by category (optional)
- `granularity` - `hour`, `day`, `week`, `month`

**Response:**
```json
{
  "data": {
    "searches": 5000,
    "views": 12000,
    "conversions": 1200,
    "conversionRate": 10.0,
    "topServices": [
      { "id": "service-123", "name": "Image Generator", "views": 2000 }
    ],
    "topCategories": [
      { "category": "ai-ml", "views": 5000 }
    ],
    "period": "2025-10-01 to 2025-10-07"
  }
}
```

#### GET /metrics/experiments
Query A/B test results.

**Parameters:**
- `experimentId` - Filter by experiment (optional)
- `startDate` - ISO 8601 date
- `endDate` - ISO 8601 date

**Response:**
```json
{
  "data": [
    {
      "experimentId": "pricing-test",
      "experimentName": "Pricing Tiers",
      "variants": [
        {
          "index": 0,
          "name": "Variant A",
          "views": 1000,
          "conversions": 100,
          "conversionRate": 10.0
        },
        {
          "index": 1,
          "name": "Variant B",
          "views": 1000,
          "conversions": 150,
          "conversionRate": 15.0
        }
      ],
      "winner": 1,
      "confidence": 95,
      "period": "2025-10-01 to 2025-10-03"
    }
  ]
}
```

#### GET /metrics/users
Query user behavior metrics.

**Parameters:**
- `startDate` - ISO 8601 date
- `endDate` - ISO 8601 date
- `granularity` - `hour`, `day`, `week`, `month`

**Response:**
```json
{
  "data": {
    "dau": 500,
    "mau": 5000,
    "retention": {
      "day1": 45.0,
      "day7": 30.0,
      "day30": 20.0
    },
    "avgSessionDuration": 180000,
    "churnRate": 5.0,
    "period": "2025-10-01 to 2025-10-31"
  }
}
```

### Real-Time Updates

#### GET /stream
Server-Sent Events stream for live updates.

**Response (SSE):**
```
data: {"type":"connected"}

data: {"type":"update","timestamp":1696291200000,"counters":{"executions:today":1234,"revenue:today":45678}}

data: {"type":"update","timestamp":1696291210000,"counters":{"executions:today":1235,"revenue:today":45700}}
```

**Usage:**
```typescript
const eventSource = new EventSource('https://analytics.api.mw/stream')

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Real-time update:', data)
}
```

## PayloadCMS Integration

### 1. Add Analytics Dashboards Collection

```typescript
// src/payload.config.ts
import { AnalyticsDashboards } from './collections/AnalyticsDashboards'

export default buildConfig({
  collections: [
    // ... existing collections
    AnalyticsDashboards,
  ],
})
```

### 2. Create Dashboard Configuration

Navigate to PayloadCMS admin → Analytics Dashboards → Create New

**Example Configuration:**
- **Name:** Services Performance Dashboard
- **Type:** service_performance
- **Widgets:**
  - Counter: Service Executions (last 24h)
  - Line Chart: Latency Trend (last 7d)
  - Table: Top Services
- **Refresh Interval:** 30 seconds

### 3. Add Dashboard Page

```typescript
// app/(admin)/analytics/page.tsx
import { Dashboard } from '@/components/analytics/Dashboard'
import { getPayload } from 'payload'
import config from '@payload-config'

export default async function AnalyticsPage() {
  const payload = await getPayload({ config })

  const dashboards = await payload.find({
    collection: 'analytics-dashboards',
    where: { isActive: { equals: true } },
    limit: 1,
  })

  const dashboardConfig = dashboards.docs[0]

  return <Dashboard dashboardConfig={dashboardConfig} />
}
```

### 4. Environment Variables

```env
NEXT_PUBLIC_ANALYTICS_API_URL=https://analytics.api.mw
```

## Deployment

### 1. Deploy Analytics Worker

```bash
cd workers/analytics

# Install dependencies
pnpm install

# Deploy to Cloudflare
pnpm deploy
```

### 2. Set Secrets

```bash
wrangler secret put API_TOKEN
# Paste your Cloudflare API token with Analytics Read permission

wrangler secret put ACCOUNT_ID
# Paste your Cloudflare account ID
```

### 3. Configure KV Namespace

The KV namespace for real-time counters is automatically created on first deployment.

### 4. Verify Deployment

```bash
# Health check
curl https://analytics.api.mw/health

# Track test event
curl -X POST https://analytics.api.mw/track \
  -H "Content-Type: application/json" \
  -d '{"eventType":"service_execution","serviceId":"test","latencyMs":100,"success":true}'

# Query metrics
curl "https://analytics.api.mw/metrics/services?startDate=2025-10-01T00:00:00Z&endDate=2025-10-03T00:00:00Z"
```

## Performance & Scalability

### Event Ingestion

- **Throughput:** Unlimited events per day (Analytics Engine)
- **Latency:** <10ms write latency (non-blocking)
- **Batch Size:** Max 25 events per request
- **Blob Size:** Max 16 KB per event

### Query Performance

- **SQL API:** <1s for most queries
- **Real-Time Counters:** <5ms from KV
- **Dashboard Load:** <1s total (parallel queries)

### Sampling

Analytics Engine automatically samples high-cardinality data:
- Sampling starts at ~100K events/second per index
- Sample rate preserved in `_sample_interval` column
- Queries automatically account for sampling

## Cost Estimation

### Analytics Engine Pricing

| Plan | Data Points Written | Read Queries |
|------|---------------------|--------------|
| **Workers Paid** | 10M included/month (+$0.25/M) | 1M included/month (+$1.00/M) |
| **Workers Free** | 100K included/day | 10K included/day |

### Example: 1M Marketplace Events/Month

- **Events Written:** 1M data points = $0.00 (within free tier)
- **Dashboard Queries:** ~100K/month = $0.00 (within free tier)
- **Total Cost:** $0.00/month 🎉

### Example: 100M Marketplace Events/Month

- **Events Written:** 100M data points = $22.50/month
- **Dashboard Queries:** ~500K/month = $0.00 (within free tier)
- **Total Cost:** ~$23/month

## Testing

### Unit Tests

```bash
cd workers/analytics
pnpm test
```

### Integration Tests

```bash
# Test event tracking
pnpm test:integration
```

### Load Testing

```bash
# Simulate 10K events/second
pnpm test:load
```

## Troubleshooting

### Events not appearing in queries

- Check Analytics Engine dataset name matches `wrangler.jsonc`
- Wait 30-60 seconds for events to be indexed
- Verify date range in query includes event timestamps

### Real-time counters not updating

- Check KV namespace is bound correctly
- Verify `updateRealtimeCounters()` is being called
- Check KV TTL hasn't expired (default: 7 days)

### SSE connection dropping

- Check client timeout settings
- Verify Cloudflare Workers timeout (default: 60s for paid)
- Implement reconnection logic in client

### High query costs

- Use longer time ranges with lower granularity
- Cache query results in KV for frequently accessed data
- Implement rate limiting on dashboard queries

## Best Practices

### Event Design

1. **Use consistent event types** - Define standard event types for easy querying
2. **Include sampling keys** - Use `userId` or `serviceId` for consistent sampling
3. **Batch when possible** - Use `/track/batch` for better performance
4. **Keep blobs small** - Limit total blob size to <16 KB per event

### Query Optimization

1. **Filter early** - Use WHERE clauses to reduce data scanned
2. **Aggregate efficiently** - Use built-in aggregation functions
3. **Limit results** - Use LIMIT to reduce data transfer
4. **Cache results** - Store frequently queried data in KV

### Dashboard Performance

1. **Lazy load widgets** - Load widgets on scroll
2. **Debounce updates** - Don't update too frequently
3. **Use SSE selectively** - Only for critical real-time metrics
4. **Export offline** - Generate reports asynchronously

## Related Documentation

- [Cloudflare Analytics Engine Docs](https://developers.cloudflare.com/analytics/analytics-engine/)
- [POC Recommendations](../../poc/RECOMMENDATIONS.md) - Recommendation #10
- [Payload Fumadocs Waitlist](../../poc/payload-fumadocs-waitlist/) - Analytics integration
- [A/B Testing Collection](../../poc/payload-fumadocs-waitlist/src/collections/Analytics.ts) - Experiments

---

**Last Updated:** 2025-10-03
**Version:** 1.0.0
**Status:** Production Ready
**Maintainer:** Analytics Team
