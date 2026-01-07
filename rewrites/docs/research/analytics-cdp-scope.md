# Analytics & CDP Rewrites - Scoping Document

**Date**: 2026-01-07
**Author**: Research Phase
**Status**: Draft Scope

---

## Executive Summary

This document evaluates five analytics/CDP platforms for Cloudflare Workers rewrites:

| Platform | Verdict | Effort | Edge Synergy |
|----------|---------|--------|--------------|
| **Segment** | **RECOMMENDED** | Medium | High |
| **RudderStack** | **RECOMMENDED** | Medium | Very High |
| **Mixpanel** | Possible | High | Medium |
| **Amplitude** | Possible | High | Medium |
| **Heap** | Not Recommended | Very High | Low |

**Top Recommendations**:
1. `segment.do` - Event routing CDP with identity resolution
2. `analytics.do` - Unified analytics ingestion (RudderStack-inspired)

---

## Platform Analysis

### 1. Segment (Twilio)

**Core Value Proposition**: Customer Data Platform that collects events from any source and routes them to 300+ destinations. Single API, many outputs.

**Key APIs/Features**:
- Track API: Record user actions with properties
- Identify API: Link user traits to profiles
- Page/Screen API: Track page views
- Group API: Associate users with organizations
- Destinations: 300+ integrations (analytics, marketing, data warehouses)
- Protocols: Schema enforcement and data governance

**Event Schema** (Segment Spec):
```typescript
interface SegmentEvent {
  type: 'track' | 'identify' | 'page' | 'screen' | 'group' | 'alias'
  anonymousId?: string
  userId?: string
  timestamp: string
  context: {
    ip?: string
    userAgent?: string
    locale?: string
    campaign?: { source, medium, term, content, name }
    device?: { type, manufacturer, model }
    os?: { name, version }
    app?: { name, version, build }
  }
  integrations?: Record<string, boolean | object>
  // Type-specific fields
  properties?: Record<string, unknown>  // track, page, screen
  traits?: Record<string, unknown>       // identify, group
  event?: string                          // track only
  groupId?: string                        // group only
}
```

**Pricing Pain Point**: $25K-$200K/year enterprise, MTU-based billing at ~$0.01-0.03 per user.

**Cloudflare Workers Rewrite Potential**:

| Component | Edge Capability | Storage |
|-----------|-----------------|---------|
| Event Ingestion | Workers (sub-ms) | - |
| Schema Validation | Workers | D1 (schemas) |
| Identity Resolution | Durable Objects | SQLite |
| Destination Routing | Workers + Queues | KV (configs) |
| Real-time Streaming | WebSockets/DO | - |
| Warehouse Sync | R2 + Pipelines | Parquet/Iceberg |

**Killer Edge Feature**: First-party data collection that bypasses ad blockers, sub-millisecond ingestion, GDPR-compliant regional processing.

---

### 2. RudderStack

**Core Value Proposition**: Open-source, warehouse-native CDP. Data stays in your infrastructure, Segment API-compatible.

**Key APIs/Features**:
- 100% Segment API compatible
- Transformations API: Custom JavaScript transforms
- Warehouse-native: Identity resolution in your warehouse
- Self-hostable: Control plane + data plane architecture

**Architecture**:
```
Control Plane (React UI)     Data Plane (Go backend)
        │                            │
        └──────── Config ───────────▶│
                                     │
Sources ─────▶ Ingest ─────▶ Transform ─────▶ Destinations
                  │              │
                  └──── Queue ───┘
```

**Cloudflare Workers Rewrite Potential**:

| Component | Implementation | Storage |
|-----------|---------------|---------|
| Control Plane | Workers + React | D1 |
| Data Plane | Workers | - |
| Transformations | Workers (isolates) | - |
| Event Queue | Queues | - |
| Identity Graph | Durable Objects | SQLite |
| Warehouse Sync | Pipelines + R2 | Iceberg |

**Killer Edge Feature**: Warehouse-native approach means R2/D1 IS the warehouse. No external dependencies, complete data ownership.

---

### 3. Mixpanel

**Core Value Proposition**: Product analytics focused on user behavior funnels, retention, and cohort analysis.

**Key APIs/Features**:
- Track API: Event ingestion (2GB/min rate limit)
- Import API: Historical data (>5 days old)
- Engage API: User profiles
- Query APIs: JQL (JavaScript Query Language), Insights, Funnels, Retention

**Data Model**:
```typescript
interface MixpanelEvent {
  event: string
  properties: {
    distinct_id: string      // User identifier
    time: number             // Unix timestamp (ms)
    $insert_id?: string      // Deduplication
    // Standard properties
    $browser?: string
    $city?: string
    $os?: string
    $device?: string
    // Custom properties
    [key: string]: unknown
  }
}
```

**Cloudflare Workers Rewrite Potential**:

| Component | Feasibility | Notes |
|-----------|-------------|-------|
| Event Ingestion | High | Workers |
| User Profiles | High | Durable Objects |
| Funnels | Medium | Analytics Engine + D1 |
| Retention Charts | Medium | Pre-aggregated in DO |
| JQL Queries | Low | Complex runtime needed |
| Cohort Analysis | Medium | Window functions needed |

**Challenge**: Mixpanel's query power (funnels, retention, cohorts) requires complex analytics infrastructure. Would need ClickHouse or significant Analytics Engine work.

---

### 4. Amplitude

**Core Value Proposition**: Enterprise product analytics with behavioral cohorts, A/B testing, and data governance.

**Key APIs/Features**:
- HTTP V2 API: Event ingestion (1000 events/sec limit)
- Identify API: User property updates
- Export API: Bulk data export
- Dashboard REST API: Query analytics data
- Warehouse sync: Snowflake, BigQuery native

**Data Model**:
```typescript
interface AmplitudeEvent {
  user_id?: string
  device_id?: string
  event_type: string
  time: number
  event_properties?: Record<string, unknown>
  user_properties?: Record<string, unknown>
  groups?: Record<string, string[]>
  // Device info
  platform?: string
  os_name?: string
  os_version?: string
  device_brand?: string
  device_model?: string
  // Location
  country?: string
  region?: string
  city?: string
  // Revenue
  price?: number
  quantity?: number
  revenue?: number
  productId?: string
}
```

**Cloudflare Workers Rewrite Potential**:

| Component | Feasibility | Notes |
|-----------|-------------|-------|
| Event Ingestion | High | Workers |
| User Properties | High | Durable Objects |
| Behavioral Cohorts | Low | Complex ML needed |
| A/B Testing | Medium | Feature flags are simpler |
| Dashboard Queries | Low | Full OLAP engine needed |

**Challenge**: Amplitude's value is in its analysis engine, not just collection. A rewrite would need significant analytics infrastructure.

---

### 5. Heap

**Core Value Proposition**: Auto-capture analytics - no instrumentation needed. Records all user interactions automatically.

**Key APIs/Features**:
- Auto-capture: Clicks, pageviews, form submissions, change events
- Virtual Events: Define events retroactively from captured data
- Session Replay: Full user session recordings
- Retroactive Analysis: Query historical data with new event definitions

**Architecture Challenge**:
```
Heap captures EVERYTHING:
- Every click (with full DOM context)
- Every form field change
- Every scroll position
- Every session recording frame

This generates:
- 1 PB stored data
- 1B events/day ingested
- 250K analyses/week
```

**Cloudflare Workers Rewrite Potential**:

| Component | Feasibility | Notes |
|-----------|-------------|-------|
| Auto-capture SDK | Medium | JavaScript snippet |
| Event Ingestion | Medium | High volume challenge |
| Session Replay | Low | Massive storage, complex |
| Retroactive Queries | Very Low | Requires full data scan |
| Virtual Events | Low | Real-time pattern matching |

**Not Recommended**: Heap's value proposition (auto-capture + retroactive analysis) requires storing and querying massive amounts of raw data. This doesn't align well with edge computing constraints.

---

## Recommended Rewrites

### Primary: `segment.do` (CDP + Event Router)

**Package**: `segment.do`
**Domain**: `segment.do`, `cdp.do`, `events.do`

**Architecture**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              segment.do                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌────────────┐  │
│   │   Sources   │    │  Ingestion  │    │  Identity   │    │Destinations│  │
│   │             │───▶│   Worker    │───▶│Resolution DO│───▶│   Router   │  │
│   │ • Web SDK   │    │             │    │             │    │            │  │
│   │ • Server    │    │ • Validate  │    │ • Merge     │    │ • Queues   │  │
│   │ • Mobile    │    │ • Enrich    │    │ • Graph     │    │ • Webhooks │  │
│   │ • HTTP API  │    │ • Sample    │    │ • Persist   │    │ • Streams  │  │
│   └─────────────┘    └─────────────┘    └─────────────┘    └────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         Storage Layer                                │  │
│   ├─────────────────┬─────────────────┬─────────────────┬───────────────┤  │
│   │       KV        │       D1        │       R2        │    Queues     │  │
│   │   • Configs     │   • Schemas     │   • Archives    │   • Events    │  │
│   │   • Caches      │   • Sources     │   • Warehouse   │   • Webhooks  │  │
│   │   • Rate limits │   • Dests       │   • Exports     │   • Retries   │  │
│   └─────────────────┴─────────────────┴─────────────────┴───────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                     Durable Objects                                  │  │
│   ├─────────────────────────────────────────────────────────────────────┤  │
│   │   IdentityDO (per user)          │   WorkspaceDO (per tenant)       │  │
│   │   • SQLite identity graph        │   • SQLite config store          │  │
│   │   • Trait history                │   • Schema registry              │  │
│   │   • Merge operations             │   • Destination configs          │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Core Features**:

1. **Event Ingestion** (Workers)
   - Segment-compatible API (`/v1/track`, `/v1/identify`, `/v1/page`, etc.)
   - Schema validation against Tracking Plan
   - Context enrichment (geo, device, campaign)
   - Sub-millisecond response times

2. **Identity Resolution** (Durable Objects)
   - Per-user DO with SQLite identity graph
   - Deterministic matching (email, phone, user_id)
   - Probabilistic matching (device fingerprint, IP patterns)
   - Merge operations with conflict resolution

3. **Destination Routing** (Workers + Queues)
   - 50+ common destinations (GA4, Amplitude, Mixpanel, etc.)
   - Webhook destinations for custom integrations
   - Batching and retry logic via Queues
   - Per-destination transformation rules

4. **Data Warehouse Sync** (R2 + Pipelines)
   - Real-time CDC to R2 in Parquet/Iceberg format
   - Compatible with ClickHouse, Snowflake, BigQuery
   - Schema evolution support
   - Time travel queries

**API Design**:
```typescript
// Track event
POST /v1/track
{
  "userId": "user_123",
  "event": "Order Completed",
  "properties": {
    "orderId": "order_456",
    "revenue": 99.99,
    "products": [...]
  },
  "context": {
    "ip": "auto",
    "userAgent": "auto"
  }
}

// Identify user
POST /v1/identify
{
  "userId": "user_123",
  "traits": {
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "premium"
  }
}

// Batch events
POST /v1/batch
{
  "batch": [
    { "type": "track", ... },
    { "type": "identify", ... }
  ]
}
```

**SDK**:
```typescript
import { Analytics } from 'segment.do'

const analytics = Analytics({
  writeKey: 'your-write-key',
  // Edge-specific options
  flushAt: 20,
  flushInterval: 10000,
  // First-party tracking (bypass ad blockers)
  apiHost: 'analytics.yoursite.com'
})

analytics.track('Order Completed', {
  orderId: 'order_123',
  revenue: 99.99
})

analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'premium'
})
```

**Complexity Assessment**: MEDIUM
- Event ingestion: Low complexity
- Identity resolution: Medium complexity (graph algorithms)
- Destination routing: Medium complexity (many integrations)
- Warehouse sync: Low complexity (existing R2/Iceberg patterns)

**Dependencies**:
- `kafka.do` (optional, for high-volume streaming)
- `mongo.do` OLAP layer patterns (for analytics queries)

---

### Secondary: `analytics.do` (Unified Analytics Ingestion)

**Package**: `analytics.do`
**Domain**: `analytics.do`, `track.do`, `metrics.do`

**Positioning**: While `segment.do` is a full CDP, `analytics.do` is focused purely on analytics ingestion and basic querying - think "Analytics Engine on steroids".

**Architecture**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              analytics.do                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      Ingestion Layer (Workers)                       │  │
│   ├─────────────────┬─────────────────┬─────────────────────────────────┤  │
│   │   Track API     │   Page API      │      Batch API                  │  │
│   │   /v1/track     │   /v1/page      │      /v1/batch                  │  │
│   └────────┬────────┴────────┬────────┴─────────────┬───────────────────┘  │
│            │                 │                      │                       │
│            ▼                 ▼                      ▼                       │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │              Workers Analytics Engine (Native)                       │  │
│   │                                                                      │  │
│   │   • 25 data points per invocation                                   │  │
│   │   • Automatic sampling (ABR)                                        │  │
│   │   • 90-day retention (free)                                         │  │
│   │   • SQL API for queries                                             │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │              Extended Storage (Long-term)                            │  │
│   ├─────────────────────────────────────────────────────────────────────┤  │
│   │   R2 (Parquet/Iceberg)           │   ClickHouse (Query Engine)      │  │
│   │   • Unlimited retention          │   • Complex aggregations         │  │
│   │   • Time travel                  │   • Funnels, cohorts             │  │
│   │   • Schema evolution             │   • Window functions             │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │              Query Layer                                             │  │
│   ├─────────────────────────────────────────────────────────────────────┤  │
│   │   • SQL API (Analytics Engine + ClickHouse)                         │  │
│   │   • Grafana integration                                             │  │
│   │   • Dashboard API                                                   │  │
│   │   • Export API                                                      │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Differentiator**: Leverages Cloudflare's native Analytics Engine for hot data, with overflow to R2/ClickHouse for long-term storage and complex queries.

**SDK**:
```typescript
import { track, page, identify } from 'analytics.do'

// Simple tracking
track('Button Clicked', { buttonId: 'cta-signup' })

// Page view
page('Home', { referrer: document.referrer })

// User identification
identify('user_123', { plan: 'pro' })

// Query API
import { query } from 'analytics.do'

const results = await query.sql(`
  SELECT
    blob1 as event,
    count() as count,
    avg(double1) as avgValue
  FROM events
  WHERE timestamp > now() - INTERVAL 7 DAY
  GROUP BY event
  ORDER BY count DESC
  LIMIT 10
`)
```

**Complexity Assessment**: LOW-MEDIUM
- Event ingestion: Low (Workers + Analytics Engine)
- Storage: Low (native Analytics Engine, R2 for overflow)
- Querying: Medium (SQL API wrapper)

---

## Implementation Roadmap

### Phase 1: Core Ingestion (2 weeks)
- [ ] Event ingestion API (track, page, identify)
- [ ] Schema validation
- [ ] Context enrichment (geo, device)
- [ ] Analytics Engine integration
- [ ] Basic SDK (browser, node)

### Phase 2: Identity Resolution (2 weeks)
- [ ] IdentityDO with SQLite graph
- [ ] Deterministic matching
- [ ] Anonymous → identified merging
- [ ] Identity API

### Phase 3: Destinations (3 weeks)
- [ ] Destination framework
- [ ] 10 core destinations (GA4, Mixpanel, etc.)
- [ ] Webhook destinations
- [ ] Queue-based delivery with retries

### Phase 4: Warehouse & Analytics (2 weeks)
- [ ] R2 export (Parquet/Iceberg)
- [ ] ClickHouse integration
- [ ] Query API
- [ ] Dashboard widgets

### Phase 5: Advanced Features (2 weeks)
- [ ] Tracking Plans (schema enforcement)
- [ ] Data governance (PII detection)
- [ ] Replay/debugging tools
- [ ] Multi-tenant workspace isolation

---

## Edge Computing Advantages

### 1. First-Party Data Collection
```
Traditional:                    Edge (segment.do):

Browser ─── 3rd Party ──▶ CDN   Browser ─── Same Domain ──▶ Edge
   │            │                   │            │
   │      (Blocked by            │       (First-party,
   │       ad blockers)            │        not blocked)
   ▼                               ▼
 Partial Data                   Complete Data
```

### 2. GDPR/Privacy Compliance
```
Traditional:                    Edge:

EU User ──▶ US Server           EU User ──▶ EU Edge ──▶ Process Locally
   │            │                   │           │
   │   (Data transfer            │      (No cross-border
   │    compliance)                │       transfer needed)
```

### 3. Real-Time Processing
```
Traditional:                    Edge:

Event ──▶ Queue ──▶ Process     Event ──▶ Process at Edge
   │         │          │           │          │
   │     (100ms+)                │      (<10ms)
```

### 4. Cost Optimization
```
Segment Pricing:               segment.do Pricing:
• $0.01-0.03 per MTU           • Workers: $0.30/million requests
• $25K-$200K/year              • Queues: $0.40/million operations
• Scales with users            • R2: $0.015/GB stored
                               • Estimated: 80-90% cost reduction
```

---

## Technical Considerations

### Identity Resolution Algorithm

```typescript
interface IdentityGraph {
  // Core identity
  canonicalId: string

  // Known identifiers (deterministic)
  identifiers: {
    userId?: string[]
    email?: string[]
    phone?: string[]
    deviceId?: string[]
  }

  // Anonymous identifiers
  anonymous: {
    anonymousId: string
    firstSeen: Date
    merged?: Date
  }[]

  // Probabilistic signals
  signals: {
    ipAddresses: string[]
    userAgents: string[]
    fingerprints: string[]
  }

  // Merged identities
  mergedFrom: string[]
}

// Matching strategy
async function resolveIdentity(event: SegmentEvent): Promise<string> {
  // 1. Deterministic match (exact identifiers)
  if (event.userId) {
    return getOrCreateByUserId(event.userId)
  }

  // 2. Trait-based match (email, phone)
  if (event.traits?.email) {
    const match = await findByEmail(event.traits.email)
    if (match) return match.canonicalId
  }

  // 3. Anonymous tracking
  if (event.anonymousId) {
    const existing = await findByAnonymousId(event.anonymousId)
    if (existing) return existing.canonicalId
  }

  // 4. Probabilistic (optional, lower confidence)
  const probabilistic = await probabilisticMatch(event.context)
  if (probabilistic?.confidence > 0.9) {
    return probabilistic.canonicalId
  }

  // 5. Create new identity
  return createNewIdentity(event)
}
```

### Destination Routing

```typescript
interface Destination {
  id: string
  type: 'webhook' | 'api' | 'warehouse'
  config: {
    url?: string
    apiKey?: string
    mapping?: Record<string, string>
    filters?: EventFilter[]
    batching?: {
      maxSize: number
      maxWait: number
    }
  }
}

// Fan-out to destinations
async function routeEvent(event: ResolvedEvent) {
  const workspace = await getWorkspace(event.workspaceId)
  const destinations = workspace.destinations.filter(d =>
    matchesFilters(event, d.config.filters)
  )

  // Queue for delivery
  for (const dest of destinations) {
    const transformed = applyMapping(event, dest.config.mapping)
    await env.DESTINATION_QUEUE.send({
      destinationId: dest.id,
      event: transformed,
      attempt: 0
    })
  }
}
```

### Storage Strategy

| Data Type | Hot (0-90 days) | Warm (90 days - 1 year) | Cold (1+ years) |
|-----------|-----------------|-------------------------|-----------------|
| Events | Analytics Engine | R2 (Parquet) | R2 (Iceberg archive) |
| Identities | Durable Objects | D1 (backup) | R2 (export) |
| Configs | KV | D1 | - |
| Schemas | D1 | - | - |

---

## Competitive Analysis

| Feature | Segment | RudderStack | segment.do |
|---------|---------|-------------|------------|
| Pricing | $25K-$200K/yr | $0 (OSS) + infra | $500-$5K/yr |
| Edge Native | No | No | Yes |
| Identity Resolution | Yes | Warehouse | Edge DO |
| Destinations | 300+ | 200+ | 50+ (initial) |
| Real-time | Near (seconds) | Near (seconds) | Sub-ms |
| First-party | Requires proxy | Requires proxy | Native |
| GDPR Edge Processing | No | No | Yes |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Analytics Engine limits | Medium | Overflow to R2/ClickHouse |
| DO per-user cost at scale | Medium | Tiered identity resolution |
| Destination API changes | Low | Abstraction layer |
| Complex analytics queries | High | Partner with ClickHouse |

---

## Conclusion

**Recommended Path**:

1. **Start with `segment.do`** - Full CDP with identity resolution
2. **Offer `analytics.do`** as simpler alternative - Just analytics, no CDP features
3. **Share infrastructure** - Both use same ingestion, storage, query layers

**Unique Value Proposition**:
- **First-party tracking** that actually works (no ad blockers)
- **Edge-native** identity resolution (sub-ms, GDPR compliant)
- **90% cost reduction** vs cloud CDPs
- **Segment API compatible** (drop-in replacement)

---

## Sources

### Segment
- [Segment Track Spec](https://segment.com/docs/connections/spec/track/)
- [Segment Public API Documentation](https://docs.segmentapis.com/)
- [Segment Destinations Overview](https://segment.com/docs/connections/destinations/)
- [Segment Pricing Guide](https://www.spendflo.com/blog/segment-pricing-guide)

### RudderStack
- [RudderStack Open Source](https://www.rudderstack.com/docs/get-started/rudderstack-open-source/)
- [RudderStack GitHub](https://github.com/rudderlabs/rudder-server)

### Mixpanel
- [Mixpanel Ingestion API](https://developer.mixpanel.com/reference/ingestion-api)
- [Mixpanel Track Events](https://docs.mixpanel.com/docs/quickstart/capture-events/track-events)

### Amplitude
- [Amplitude HTTP V2 API](https://amplitude.com/docs/apis/analytics/http-v2)
- [Amplitude Snowflake Integration](https://amplitude.com/docs/data/destination-catalog/snowflake)

### Heap
- [Heap AutoCapture](https://www.heap.io/platform/autocapture)
- [Heap Architecture](https://www.heap.io/blog/heaps-next-generation-data-platform)

### Cloudflare
- [Workers Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Analytics Engine SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/)
- [Durable Objects Overview](https://developers.cloudflare.com/durable-objects/)

### Identity Resolution
- [Identity Resolution Guide](https://www.twilio.com/en-us/blog/insights/identity-resolution)
- [Identity Resolution Algorithms for CDP](https://blog.ahmadwkhan.com/guide-to-identity-resolution-algorithms-for-cdp)

### Privacy & Edge
- [First-Party Data Compliance 2025](https://secureprivacy.ai/blog/first-party-data-collection-compliance-gdpr-ccpa-2025)
- [GDPR Compliance in Edge Computing](https://www.gdpr-advisor.com/gdpr-compliance-in-edge-computing-managing-decentralized-data-storage/)
