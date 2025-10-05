# numerics

# Numerics Dashboard Worker

Real-time KPI metrics API in Numerics JSON format for Apple ecosystem dashboards (Apple TV, Apple Watch, iPhone, Mac).

## Overview

This worker provides 16 critical business metrics for the Services.Delivery platform in a format compatible with [Numerics Dashboard](https://numericsdashboard.app/). Metrics are cached in KV with a 5-minute TTL for fast dashboard refreshes across all Apple devices, with API key authentication for secure access.

## Features

- ✅ **16 KPI Metrics** - Funnel, revenue, marketplace, creator, and platform metrics
- ✅ **Numerics JSON Format** - Native widget support (number, line graph, named line graph)
- ✅ **KV-Based Caching** - 5-minute TTL for fast dashboard refreshes
- ✅ **API Key Authentication** - Secure access control via Bearer token
- ✅ **MCP Integration** - AI-accessible metrics via Model Context Protocol
- ✅ **Rate Limiting** - Per-widget request limits
- ✅ **Real-time Updates** - Live data from Analytics and DB services
- ✅ **Multi-Device Support** - Optimized for Apple TV, Watch, iPhone, Mac
- ✅ **OKR Tracking** - 2025Q4 $1M ARR goal monitoring
- ✅ **Development Mode** - No API key required when not configured

## Architecture

```
┌─────────────┐
│  Numerics   │  ◄── Apple TV / Watch / iPhone / Mac
│     App     │      Polls every 5 minutes
└──────┬──────┘
       │
       │ HTTPS + Bearer Auth
       │
       ▼
┌──────────────┐
│   numerics/  │  ◄── This Worker
│   Worker     │      - KV cache (5min TTL)
└──────┬───────┘      - Metric calculations
       │
       │ RPC Bindings
       │
       ├────────────┬──────────────┐
       ▼            ▼              ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │   DB    │  │Analytics │  │  KV NS   │
   │ Service │  │ Service  │  │  Cache   │
   └─────────┘  └──────────┘  └──────────┘
```

**Service Dependencies:**
- **DB Service** (binding: `DB`) - Database queries for transactional data
- **Analytics Service** (binding: `ANALYTICS`) - Real-time event tracking and aggregation
- **KV Namespace** (binding: `METRICS_KV`) - Metric caching (5-minute TTL)

## API Endpoints

### Funnel Metrics

```bash
GET /api/metrics/visitors        # Website visitors
GET /api/metrics/signups          # User sign-ups
GET /api/metrics/active-users    # Active users (DAU/MAU)
```

### Revenue Metrics (OKR Tracking)

```bash
GET /api/metrics/mrr             # Monthly Recurring Revenue
GET /api/metrics/arr             # Annual Recurring Revenue ($1M target)
GET /api/metrics/gmv             # Gross Marketplace Volume
GET /api/metrics/gmv-growth      # GMV Growth Rate (60%+ target)
```

### Marketplace Metrics (KR Tracking)

```bash
GET /api/metrics/services-listed      # Total services (200+ target)
GET /api/metrics/services-active      # Active services (100+ target)
GET /api/metrics/providers            # Service providers (100+ target)
GET /api/metrics/service-rating       # Average rating (4.5+ target)
GET /api/metrics/dispute-rate         # Dispute rate (<5% target)
```

### Creator Metrics

```bash
GET /api/metrics/creators                  # Creators publishing (50+ target)
GET /api/metrics/top-creators-revenue      # Top 10 creator earnings
```

### Platform Metrics

```bash
GET /api/metrics/functions       # Functions catalogued (1,000+ target)
GET /api/metrics/api-calls       # Daily API call volume
```

### Utility Endpoints

```bash
GET /api/metrics                 # List all available metrics
GET /health                      # Health check
DELETE /api/cache                # Clear metric cache
GET /mcp/tools                   # MCP tool definitions
```

## Query Parameters

- `?period=today|week|month|quarter|year` - Time period (default: month)
- `?compare=true|false` - Include previous period for comparison (default: false)

## Numerics JSON Format

### Number Widget (with comparison)

```json
{
  "postfix": "Visitors",
  "data": [
    { "value": 12450 },  // Current period
    { "value": 11280 }   // Previous period (for % change)
  ]
}
```

### Line Graph Widget

```json
{
  "postfix": "USD",
  "data": [
    { "value": 18923 },
    { "value": 17736 },
    { "value": 17663 }
  ]
}
```

### Named Line Graph Widget

```json
{
  "postfix": "GMV",
  "data": [
    { "name": "Oct", "value": 125000 },
    { "name": "Nov", "value": 200000 },
    { "name": "Dec", "value": 320000 }
  ]
}
```

### Color Override (Red for alerts)

```json
{
  "postfix": "%",
  "color": "#FF6B6B",
  "data": [{ "value": 3.2 }]
}
```

## Authentication

API requests require Bearer token authentication:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://numerics.apis.do/api/metrics/mrr
```

Set API key via Wrangler:

```bash
wrangler secret put NUMERICS_API_KEY
```

**Development mode** (no API key configured) allows all requests.

## Numerics Dashboard Setup

### Apple TV - Executive Dashboard

Focus on high-level OKR metrics:

- **ARR** (Annual Recurring Revenue) - $1M target
- **GMV** (Gross Marketplace Volume) - Growth rate
- **MRR** (Monthly Recurring Revenue) - Monthly target
- **Active Users** - Engagement metric

### Apple Watch - Quick Glance

Essential metrics at a glance:

- **MRR** - Current month
- **Visitors** - Today vs. yesterday
- **Active Users** - Current vs. previous

### iPhone - Full Funnel

Complete customer journey:

- Visitors → Sign-ups → Active Users → Revenue
- Conversion rates at each stage
- Marketplace metrics (services, providers, ratings)

### Mac - Detailed Analytics

All 16 metrics with historical trends:

- Full timeseries data
- Comparison views
- Top creators leaderboard
- API call volumes

## MCP Integration

Access metrics via Model Context Protocol for AI agents:

```ts
// Example MCP tool call
const mrr = await mcp.call('metrics.mrr', { period: 'month', compare: true })
// Returns: { current: 83500, previous: 52180 }
```

Available MCP tools:

- `metrics.visitors`
- `metrics.signups`
- `metrics.activeUsers`
- `metrics.mrr`
- `metrics.arr`
- `metrics.gmv`
- `metrics.gmvGrowth`
- `metrics.servicesListed`
- `metrics.servicesActive`
- `metrics.providers`
- `metrics.serviceRating`
- `metrics.disputeRate`
- `metrics.creators`
- `metrics.topCreatorsRevenue`
- `metrics.functions`
- `metrics.apiCalls`

## Caching Strategy

### KV Cache (5-minute TTL)

```ts
// Cache key format: metric:{metricName}:{period}:{compare}
const cacheKey = `metric:mrr:month:compare`

// Write to cache with TTL
await METRICS_KV.put(cacheKey, JSON.stringify(result), {
  expirationTtl: 300 // 5 minutes
})

// Read from cache
const cached = await METRICS_KV.get(cacheKey)
```

### Cache Invalidation

```bash
# Clear all cached metrics
DELETE /api/cache

# Or invalidate specific metric via code
await invalidateMetricCache('mrr', env)
```

## Configuration

### Environment Variables

- `CACHE_TTL` - Cache TTL in seconds (default: 300)
- `ENVIRONMENT` - Environment name (production/staging/development)

### Secrets

- `NUMERICS_API_KEY` - API key for Numerics app authentication

### Bindings

- `DB` - Database service binding
- `ANALYTICS` - Analytics service binding
- `METRICS_KV` - KV namespace for caching

## Implementation



## Usage Examples

### Fetch MRR Metric

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://numerics.apis.do/api/metrics/mrr?period=month&compare=true"
```

**Response:**
```json
{
  "postfix": "USD",
  "data": [
    { "value": 83500 },
    { "value": 52180 }
  ]
}
```

### Fetch Dispute Rate (with alert color)

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://numerics.apis.do/api/metrics/dispute-rate?period=month"
```

**Response:**
```json
{
  "postfix": "%",
  "color": "#FF6B6B",
  "data": [{ "value": 2.3 }]
}
```

### List All Metrics

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://numerics.apis.do/api/metrics
```

### Clear Cache

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_API_KEY" \
  https://numerics.apis.do/api/cache
```

## Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm typecheck

# Run tests
pnpm test

# Development mode (local)
pnpm dev

# Deploy to production
pnpm deploy
```

## Related Documentation

- [Numerics JSON API Docs](https://docs.numericsdashboard.app/json-api)
- [Services.Delivery OKRs](../../README.md) - 2025Q4 $1M ARR goal
- [Analytics Service](../analytics/README.md) - Data source
- [Database Service](../db/README.md) - Transaction data

## Tech Stack

- **Hono** - Fast web framework
- **KV Namespace** - Fast metric caching
- **RPC** - Service-to-service communication
- **Numerics** - Apple ecosystem dashboard app
- **TypeScript** - Type-safe development

---

**Generated from:** numerics.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts numerics.mdx`

---

**Generated from:** numerics.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts numerics.mdx`
