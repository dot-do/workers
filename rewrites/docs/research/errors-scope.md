# errors.do - Error Monitoring Rewrite Scoping Document

## Executive Summary

This document scopes a Cloudflare Workers-native error monitoring platform that provides Sentry SDK compatibility with edge-native processing. The goal is to deliver low-latency error ingestion, intelligent issue grouping, and seamless integration with the workers.do ecosystem.

**Domain Options**: `errors.do`, `sentry.do`, `bugs.do`, `exceptions.do`

---

## 1. Platform Analysis

### 1.1 Sentry - Market Leader

**Core Value Proposition**: End-to-end error tracking with source map support, issue grouping, and release management.

**Key Technical Details**:
- **Envelope Protocol**: Binary format for batching errors, attachments, sessions
  - Endpoint: `POST /api/{PROJECT_ID}/envelope/`
  - Headers + Items with individual payloads
  - Max 40MB compressed, 200MB decompressed
  - Supports: events, transactions, attachments, sessions, logs
- **Issue Grouping**: Multi-stage fingerprinting
  - Stack trace normalization
  - Server-side fingerprint rules
  - AI-powered semantic grouping (new)
  - Hierarchical hashes for group subdivision
- **Source Maps**: Rust-based `symbolic` crate for symbolication
  - Source map upload via release artifacts
  - JS-specific: module name + filename + context-line
  - Native: function name cleaning (generics, params removed)
- **Architecture**: Relay (Rust edge proxy) -> Kafka -> Workers/Symbolication -> ClickHouse

**Cloudflare Integration**: Official `@sentry/cloudflare` SDK with `withSentry()` wrapper.

**Rewrite Opportunity**: Sentry Relay is already a Rust edge proxy - we can replace the entire backend.

### 1.2 Bugsnag

**Core Value Proposition**: Error monitoring with stability scores and breadcrumb tracking.

**Key Technical Details**:
- REST API at `notify.bugsnag.com`
- JSON payload with apiKey, releaseStage, user, context, metaData
- Breadcrumb system: circular buffer of 25 events
- GroupingHash override for custom deduplication
- Session tracking for stability scores

**Differentiator**: Automatic device/app state capture, feature flag correlation.

### 1.3 Rollbar

**Core Value Proposition**: Real-time error aggregation with custom fingerprinting.

**Key Technical Details**:
- REST API at `api.rollbar.com/api/1/item/`
- JSON payload with environment, level, body (trace/message/crash)
- Max 1024KB payload
- Telemetry timeline ("breadcrumbs")
- Custom fingerprinting via payload handlers

**Differentiator**: Simple API, strong Python ecosystem.

### 1.4 Datadog Error Tracking

**Core Value Proposition**: Unified APM with errors, traces, and logs correlation.

**Key Technical Details**:
- Error tracking built on APM spans
- Required attributes: `error.stack`, `error.message`, `error.type`
- Fingerprinting: error type + message + stack frames
- Correlation via `DD_ENV`, `DD_SERVICE`, `DD_VERSION` tags
- OpenTelemetry compatible

**Differentiator**: Full-stack observability in one platform.

### 1.5 LogRocket

**Core Value Proposition**: Session replay with error context.

**Key Technical Details**:
- DOM recording via MutationObserver (rrweb-based)
- Network request capture
- Console log capture
- `captureException(error)` for server-side
- User identification via `identify()` method

**Differentiator**: Visual debugging - see exactly what user was doing.

### 1.6 Highlight.io

**Core Value Proposition**: Open-source full-stack monitoring.

**Key Technical Details**:
- Session replay + error monitoring + logging + tracing
- OpenTelemetry integration
- rrweb for DOM recording
- Self-hostable (Docker, 8GB RAM minimum)
- Recently acquired by LaunchDarkly (March 2025)

**Differentiator**: Open source, self-hosted option.

---

## 2. Cloudflare Workers Rewrite Architecture

### 2.1 Architecture Overview

```
errors.do
├── Edge Ingestion Layer (Cloudflare Workers)
│   ├── /api/{project}/envelope/ - Sentry protocol
│   ├── /api/{project}/store/    - Legacy Sentry
│   ├── /notify                  - Bugsnag protocol
│   └── /api/1/item/             - Rollbar protocol
│
├── Processing Layer (Durable Objects)
│   ├── ErrorIngestionDO         - Rate limiting, sampling
│   ├── IssueGroupingDO          - Fingerprinting, dedup
│   ├── SymbolicationDO          - Source map processing
│   └── AlertingDO               - Real-time notifications
│
├── Storage Layer
│   ├── D1                       - Issues, fingerprints, metadata
│   ├── R2                       - Source maps, attachments
│   ├── KV                       - Hot cache, rate limits
│   └── Analytics Engine         - Time-series error data
│
└── Query Layer
    ├── Dashboard API            - REST/GraphQL
    ├── MCP Tools                - AI agent integration
    └── WebSocket                - Real-time updates
```

### 2.2 Durable Object Design

#### ErrorIngestionDO

Per-project Durable Object for ingestion control:

```typescript
export class ErrorIngestionDO extends DurableObject<Env> {
  // SQLite tables
  // - rate_limits: token bucket per client
  // - sampling_config: rules for which errors to keep
  // - project_settings: DSN, auth, quotas

  async ingest(envelope: SentryEnvelope): Promise<IngestResult> {
    // 1. Authenticate (DSN validation)
    // 2. Rate limit check
    // 3. Sampling decision
    // 4. Parse envelope items
    // 5. Route to appropriate processor
  }
}
```

#### IssueGroupingDO

Per-project Durable Object for issue management:

```typescript
export class IssueGroupingDO extends DurableObject<Env> {
  // SQLite tables
  // - issues: id, fingerprint, title, first_seen, last_seen
  // - events: id, issue_id, timestamp, payload_hash
  // - fingerprint_rules: custom grouping rules

  async processEvent(event: ErrorEvent): Promise<Issue> {
    // 1. Normalize stack trace
    // 2. Apply fingerprint rules
    // 3. Generate fingerprint hash
    // 4. Find or create issue
    // 5. Update issue statistics
    // 6. Trigger alerts if new issue
  }
}
```

#### SymbolicationDO

Singleton DO for source map processing:

```typescript
export class SymbolicationDO extends DurableObject<Env> {
  // SQLite tables
  // - source_maps: release, filename, r2_key
  // - symbolication_cache: frame_hash -> symbolicated

  async symbolicate(
    stacktrace: Stacktrace,
    release: string
  ): Promise<SymbolicatedStacktrace> {
    // 1. Check cache for each frame
    // 2. Load source maps from R2
    // 3. Parse with source-map-js (WASM too heavy for DO)
    // 4. Apply source map to each frame
    // 5. Cache results
    // 6. Return enhanced stack trace
  }
}
```

### 2.3 Protocol Support Matrix

| Protocol | Endpoint | Priority | Compatibility |
|----------|----------|----------|---------------|
| Sentry Envelope | `/api/{project}/envelope/` | P0 | Drop-in SDK |
| Sentry Store (legacy) | `/api/{project}/store/` | P1 | Legacy support |
| Bugsnag | `/notify` | P2 | SDK compatible |
| Rollbar | `/api/1/item/` | P2 | SDK compatible |
| OpenTelemetry | `/v1/traces`, `/v1/logs` | P1 | OTLP export |
| Custom | `/api/errors` | P0 | Native SDK |

### 2.4 Storage Strategy

**Hot Storage (D1/SQLite in DO)**:
- Active issues (last 7 days)
- Recent events (last 24 hours)
- Fingerprint mappings
- Rate limit counters
- Sampling decisions

**Warm Storage (R2)**:
- Source maps (per release)
- Event payloads (compressed JSON)
- Attachments (screenshots, logs)
- Session replay data

**Cold Storage (R2 Archive)**:
- Historical events (>30 days)
- Audit logs
- Compliance data

**Analytics (Analytics Engine)**:
- Error counts over time
- Error rates by release
- Geographic distribution
- Browser/device breakdowns

---

## 3. Key Features Specification

### 3.1 Error Ingestion

**Sentry Envelope Parsing**:
```typescript
interface EnvelopeHeader {
  event_id?: string
  dsn?: string
  sdk?: { name: string; version: string }
  sent_at?: string  // RFC 3339
}

interface EnvelopeItem {
  type: 'event' | 'transaction' | 'attachment' | 'session'
  length?: number
  content_type?: string
  filename?: string
}
```

**Rate Limiting**:
- Token bucket per project (configurable burst/rate)
- Dynamic sampling based on quota usage
- Burst protection for sudden spikes
- Graceful degradation (accept envelope, defer processing)

### 3.2 Issue Grouping Algorithm

**Phase 1: Stack Trace Normalization**
- Remove PII from paths
- Normalize file paths (remove hash suffixes)
- Mark frames as in-app vs system
- Clean function names (remove anonymous wrappers)

**Phase 2: Fingerprint Generation**
```typescript
function generateFingerprint(event: ErrorEvent): string[] {
  const components: string[] = []

  // 1. Exception type and message (cleaned)
  if (event.exception) {
    components.push(event.exception.type)
    components.push(cleanMessage(event.exception.value))
  }

  // 2. Stack trace (in-app frames only)
  const frames = event.stacktrace?.frames ?? []
  for (const frame of frames.filter(f => f.in_app)) {
    components.push(`${frame.module}:${frame.function}:${frame.lineno}`)
  }

  return [hash(components.join('\n'))]
}
```

**Phase 3: Custom Rules**
```yaml
# Example fingerprint rules
rules:
  - match:
      type: "NetworkError"
      message: "*timeout*"
    fingerprint: ["network-timeout"]

  - match:
      function: "handleApiError"
    fingerprint: ["{{ default }}", "{{ tags.endpoint }}"]
```

### 3.3 Source Map Processing

**Challenges**:
- Source maps can be large (>10MB for enterprise apps)
- Parsing is CPU-intensive
- Multiple source maps per release
- Mapping accuracy depends on build tooling

**Strategy**:
1. **Upload**: Source maps uploaded via CLI/CI during release
2. **Storage**: Compressed in R2 with release/filename index
3. **Lazy Loading**: Load source maps on-demand, not preloaded
4. **Caching**: Cache symbolicated frames (hash of frame -> result)
5. **Library**: Use `source-map-js` (pure JS, no WASM overhead)

```typescript
// Source map storage schema
interface SourceMapEntry {
  release: string
  filename: string      // Minified file path
  r2_key: string        // R2 object key
  uploaded_at: number
  size_bytes: number
  map_hash: string      // For cache invalidation
}
```

### 3.4 PII Scrubbing

**Default Scrubbing Rules**:
- Email addresses
- IP addresses
- Credit card numbers
- Phone numbers
- Social security numbers
- API keys/tokens (pattern matching)

**Implementation**:
```typescript
const scrubbers = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[email]' },
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[ip]' },
  { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, replacement: '[card]' },
  { pattern: /\b(sk_live_|pk_live_|sk_test_|pk_test_)[a-zA-Z0-9]+\b/g, replacement: '[api_key]' },
]
```

### 3.5 Real-Time Alerting

**Alert Triggers**:
- New issue detected
- Issue regression (reoccurrence after resolution)
- Error rate spike (>N% increase in window)
- Quota threshold reached

**Alert Channels**:
- Webhook (generic)
- Slack
- Discord
- Email
- PagerDuty

**Implementation via Durable Object Alarms**:
```typescript
class AlertingDO extends DurableObject<Env> {
  async alarm() {
    // Check pending alerts
    const alerts = await this.sql`
      SELECT * FROM pending_alerts WHERE processed = 0
    `
    for (const alert of alerts) {
      await this.dispatch(alert)
      await this.sql`UPDATE pending_alerts SET processed = 1 WHERE id = ${alert.id}`
    }
    // Schedule next check
    this.ctx.storage.setAlarm(Date.now() + 10_000) // 10s
  }
}
```

---

## 4. SDK Strategy

### 4.1 Sentry SDK Compatibility

**Goal**: Zero-code migration from Sentry by pointing DSN to errors.do

```typescript
import * as Sentry from '@sentry/browser'

Sentry.init({
  dsn: 'https://key@errors.do/123',  // Just change the host!
  // All existing config works
})
```

**Implementation**:
- Accept Sentry envelope format exactly
- Support Sentry auth header format
- Return Sentry-compatible responses
- Handle Sentry SDK version quirks

### 4.2 Native SDK (errors.do)

For new projects, provide a lightweight native SDK:

```typescript
import { Errors } from 'errors.do'

const errors = Errors({
  dsn: 'https://key@errors.do/123',
  release: '1.0.0',
  environment: 'production',
})

// Auto-capture
errors.install()

// Manual capture
errors.captureException(new Error('Something went wrong'))
errors.captureMessage('User clicked deprecated button', 'warning')

// Add context
errors.setUser({ id: '123', email: 'user@example.com' })
errors.setTag('feature', 'checkout')
errors.addBreadcrumb({ category: 'ui', message: 'Button clicked' })
```

### 4.3 Cloudflare Workers SDK

Deep integration for Workers:

```typescript
import { withErrors } from 'errors.do/cloudflare'

export default withErrors({
  dsn: 'https://key@errors.do/123',
  handler: {
    async fetch(request, env, ctx) {
      // Errors automatically captured
      throw new Error('Oops!')
    }
  }
})
```

---

## 5. API Design

### 5.1 Ingestion Endpoints

```
POST /api/{project_id}/envelope/
  - Sentry envelope format
  - Auth via X-Sentry-Auth header or DSN in envelope

POST /api/{project_id}/store/
  - Legacy Sentry JSON event
  - Deprecated but supported

POST /notify
  - Bugsnag format
  - Auth via Bugsnag-Api-Key header

POST /api/1/item/
  - Rollbar format
  - Auth via access_token in payload
```

### 5.2 Management API

```
GET    /api/projects                    # List projects
POST   /api/projects                    # Create project
GET    /api/projects/{id}               # Get project
DELETE /api/projects/{id}               # Delete project

GET    /api/projects/{id}/issues        # List issues
GET    /api/projects/{id}/issues/{id}   # Get issue details
POST   /api/projects/{id}/issues/{id}/resolve  # Resolve issue
POST   /api/projects/{id}/issues/{id}/ignore   # Ignore issue

GET    /api/projects/{id}/events        # List events
GET    /api/projects/{id}/events/{id}   # Get event details

POST   /api/projects/{id}/releases      # Create release
POST   /api/projects/{id}/sourcemaps    # Upload source maps

GET    /api/projects/{id}/stats         # Error statistics
```

### 5.3 MCP Tools

```typescript
const tools = {
  errors_list_issues: {
    description: 'List error issues for a project',
    parameters: {
      project_id: { type: 'string', required: true },
      status: { type: 'string', enum: ['unresolved', 'resolved', 'ignored'] },
      limit: { type: 'number', default: 20 },
    },
  },

  errors_get_issue: {
    description: 'Get detailed information about an error issue',
    parameters: {
      project_id: { type: 'string', required: true },
      issue_id: { type: 'string', required: true },
    },
  },

  errors_resolve_issue: {
    description: 'Mark an error issue as resolved',
    parameters: {
      project_id: { type: 'string', required: true },
      issue_id: { type: 'string', required: true },
      reason: { type: 'string' },
    },
  },

  errors_search_events: {
    description: 'Search for error events',
    parameters: {
      project_id: { type: 'string', required: true },
      query: { type: 'string', required: true },
      timeframe: { type: 'string', default: '24h' },
    },
  },
}
```

---

## 6. Complexity Analysis

### 6.1 High Complexity Components

| Component | Complexity | Reason | Mitigation |
|-----------|------------|--------|------------|
| Source Map Parsing | High | CPU intensive, large files | Cache aggressively, lazy load |
| Issue Grouping | High | ML/heuristics for semantic matching | Start with deterministic, add AI later |
| Multi-Protocol Support | Medium-High | Different formats, auth schemes | Abstract into common internal format |
| Rate Limiting | Medium | Distributed state | DO per-project handles local state |
| PII Scrubbing | Medium | Many patterns, performance | Precompiled regex, streaming |

### 6.2 Cloudflare Workers Constraints

| Constraint | Limit | Impact | Solution |
|------------|-------|--------|----------|
| CPU Time | 30s (unbound) | Source map parsing | Chunk processing, caching |
| Memory | 128MB | Large payloads | Streaming, compression |
| Subrequest Limit | 1000/request | Fanout operations | Batch, queue |
| D1 Row Size | 1MB | Event payloads | Store in R2, reference |
| R2 PUT Size | 5GB | Source maps | No issue |

### 6.3 Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Ingestion Latency (p50) | <50ms | Edge processing benefit |
| Ingestion Latency (p99) | <200ms | Acceptable for async |
| Issue Query Latency | <100ms | Dashboard responsiveness |
| Source Map Lookup | <500ms | Acceptable for async symbolication |
| Alert Delivery | <30s | Real-time notification |

---

## 7. Implementation Phases

### Phase 1: Core Ingestion (MVP)

**Duration**: 4-6 weeks

**Deliverables**:
- [ ] Sentry envelope parser
- [ ] Basic event storage (D1)
- [ ] Simple fingerprinting (type + message + stack hash)
- [ ] Issue creation/grouping
- [ ] Basic dashboard API
- [ ] Native SDK (browser + Node)

**Architecture**:
```
Worker -> ErrorIngestionDO -> IssueGroupingDO -> D1
```

### Phase 2: Source Maps & Symbolication

**Duration**: 3-4 weeks

**Deliverables**:
- [ ] Source map upload API
- [ ] R2 storage integration
- [ ] Symbolication service (source-map-js)
- [ ] Release management
- [ ] CLI for uploads

**Architecture**:
```
SymbolicationDO <- R2 (source maps)
                <- Cache (SQLite)
```

### Phase 3: Advanced Grouping & Alerting

**Duration**: 3-4 weeks

**Deliverables**:
- [ ] Custom fingerprint rules
- [ ] Issue merging/splitting
- [ ] Alert configuration
- [ ] Webhook integrations
- [ ] Slack/Discord notifications

### Phase 4: Multi-Protocol & Ecosystem

**Duration**: 4-6 weeks

**Deliverables**:
- [ ] Bugsnag protocol support
- [ ] Rollbar protocol support
- [ ] OpenTelemetry export
- [ ] Session replay (basic)
- [ ] MCP tools

### Phase 5: Polish & Scale

**Duration**: 2-4 weeks

**Deliverables**:
- [ ] Analytics Engine integration
- [ ] Performance optimization
- [ ] PII scrubbing rules UI
- [ ] Team/organization management
- [ ] Usage quotas and billing hooks

---

## 8. Integration with workers.do Ecosystem

### 8.1 Service Bindings

```typescript
// From other workers.do services
interface Env {
  ERRORS: Service<ErrorsService>
}

// Usage
await env.ERRORS.captureException(error, {
  tags: { service: 'payments.do' },
  user: { id: userId },
})
```

### 8.2 Agent Integration

```typescript
import { quinn } from 'agents.do'

// Quinn (QA agent) can query errors
quinn`what are the top unresolved errors this week?`

// Ralph (Dev agent) can investigate
ralph`investigate error ERR-123 and suggest a fix`
```

### 8.3 Workflow Integration

```typescript
import { Workflow } from 'workflows.do'

export const errorTriage = Workflow({
  trigger: { type: 'error', severity: 'critical' },
  phases: {
    investigate: { assignee: quinn, then: 'fix' },
    fix: { assignee: ralph, then: 'review' },
    review: { assignee: tom, then: 'deploy' },
    deploy: { assignee: ralph, checkpoint: true },
  },
})
```

---

## 9. Competitive Positioning

| Feature | Sentry | errors.do | Advantage |
|---------|--------|-----------|-----------|
| Edge Ingestion | Relay (self-host) | Native | Zero latency, no setup |
| Pricing | Per-event | Per-project | Predictable costs |
| Source Maps | Upload required | Upload required | Parity |
| SDK Compat | N/A | Full Sentry | Migration ease |
| AI Integration | Seer | MCP native | Deeper agents.do integration |
| Self-Host | Complex | N/A | Managed simplicity |
| Cloudflare Native | SDK only | First-class | Service bindings, DO integration |

---

## 10. Open Questions

1. **Semantic Grouping**: Should we implement AI-powered grouping in Phase 1, or start deterministic?
   - Recommendation: Start deterministic, add AI via workers AI in Phase 3

2. **Session Replay**: Full replay or just breadcrumbs?
   - Recommendation: Breadcrumbs first, full replay as separate product (replay.do?)

3. **Pricing Model**: Per-event (Sentry), per-project, or usage-based?
   - Recommendation: Tiered per-project with event quotas

4. **Trace Integration**: Build tracing into errors.do or separate service?
   - Recommendation: Separate (traces.do), with correlation IDs

5. **Dashboard**: Build custom or integrate with existing (Grafana)?
   - Recommendation: Build minimal custom, focus on MCP/API

---

## 11. References

### Documentation
- [Sentry Developer Documentation](https://develop.sentry.dev/)
- [Sentry Envelope Format](https://develop.sentry.dev/sdk/data-model/envelopes/)
- [Sentry Event Payloads](https://develop.sentry.dev/sdk/event-payloads/)
- [Sentry Grouping](https://develop.sentry.dev/backend/application-domains/grouping/)
- [Sentry Relay](https://github.com/getsentry/relay)
- [Bugsnag API](https://docs.bugsnag.com/api/error-reporting/)
- [Rollbar API](https://docs.rollbar.com/reference/create-item)
- [Datadog Error Tracking](https://docs.datadoghq.com/tracing/error_tracking/)
- [LogRocket Session Replay](https://docs.logrocket.com/docs/session-replay)
- [Highlight.io](https://github.com/highlight/highlight)

### Libraries
- [source-map-js](https://www.npmjs.com/package/source-map-js) - Pure JS source map parsing
- [@sentry/cloudflare](https://docs.sentry.io/platforms/javascript/guides/cloudflare/) - Official SDK
- [rrweb](https://github.com/rrweb-io/rrweb) - Session replay (used by Highlight, LogRocket)

---

## 12. Conclusion

errors.do presents a compelling opportunity to build a Cloudflare-native error monitoring solution that:

1. **Provides instant migration** from Sentry via protocol compatibility
2. **Delivers lower latency** via edge-native ingestion
3. **Integrates deeply** with the workers.do agent ecosystem
4. **Offers predictable pricing** via per-project model
5. **Simplifies operations** with fully managed infrastructure

The technical complexity is manageable with a phased approach, starting with core ingestion and expanding to advanced features. The key risks are source map processing performance and achieving high-quality issue grouping - both addressable with caching and iterative algorithm improvement.

**Recommended next step**: Create TDD issues in `rewrites/errors/.beads/` following the established pattern from fsx and redis rewrites.
