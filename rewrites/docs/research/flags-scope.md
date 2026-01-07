# Feature Flags & Experimentation Rewrite Scope

## flags.do / experiments.do

**Date**: 2026-01-07
**Status**: Research Complete - Ready for Implementation Planning

---

## Executive Summary

This document scopes a Cloudflare Workers rewrite for feature flag evaluation and A/B testing experimentation. The goal is to provide sub-millisecond flag evaluation at the edge, consistent user bucketing via Durable Objects, and integrated statistical analysis for experiments.

---

## 1. Competitive Landscape Analysis

### 1.1 LaunchDarkly

**Core Value Proposition**: Runtime control plane for features, AI, and releases.

**Key Metrics**:
- 99.99% uptime
- 45T+ flag evaluations daily
- <200ms global flag change propagation
- 100+ points of presence

**Key Features**:
- Progressive rollouts with blast radius control
- Real-time feature-level performance tracking
- Automatic rollback on custom thresholds
- Bayesian and Frequentist statistical analysis
- Multi-armed bandits for dynamic traffic allocation

**SDK Architecture**:
- Client-side, Server-side, AI, and Edge SDKs
- Cloudflare Workers SDK uses KV as persistent store
- Pushes config directly to KV (no evaluation-time API calls)
- Event sending optional via `{ sendEvents: true }`

**Edge Implementation Pattern**:
```typescript
const client = init({
  clientSideID: 'client-side-id',
  options: { kvNamespace: env.LD_KV }
})
await client.waitForInitialization()
const value = await client.variation('flag-key', context, defaultValue)
```

### 1.2 Split.io (now Harness)

**Core Value Proposition**: Release faster with feature flags connected to impact data.

**Key Features**:
- Flexible targeting rules for gradual rollouts
- Automatic performance metric capture during releases
- Impact detection across concurrent rollouts
- Sub-minute issue identification via alerts
- AI-powered insights explaining metric impacts

**SDK Architecture**:
- 14+ SDKs (client and server)
- Local flag evaluation (no sensitive data transmission)
- Cloudflare Workers: "Partial consumer mode"
  - Uses external cache for flag definitions
  - Cron trigger updates cache periodically
  - Events sent directly to Harness (not cached)

**Integration Ecosystem**:
- Datadog, New Relic, Sentry monitoring
- Segment, mParticle CDP connectors
- Google Analytics, Jira integrations

### 1.3 Optimizely

**Core Value Proposition**: Ship features with confidence via code-level experiments.

**Key Features**:
- Proprietary Stats Engine for result validation
- Opal AI assistant for test ideation
- Omni-channel experimentation
- CDP integration for advanced audience targeting
- Multiple features per single flag

**SDK Architecture**:
- 9,000+ developers using platform
- "Universal" JS SDK (excludes datafile manager for performance)
- Cloudflare Cache API for datafile caching
- Custom event dispatching via platform helpers

**Cloudflare Workers Template**:
```typescript
// Uses Cache API for datafile
// Custom getOptimizelyClient() helper
// Event dispatch through Workers
```

### 1.4 Statsig

**Core Value Proposition**: Same tools as world's largest tech companies - unified A/B testing, feature management, and analytics.

**Key Features**:
- Feature gates (boolean flags)
- Experiments with variant configurations
- Layers for grouped experiment management
- Dynamic configs targeted to users
- Auto-exposure logging on every check

**SDK Architecture**:
- Extensive SDK coverage (JS, React, Node, Python, Go, Rust, C++, etc.)
- Initialize: Fetches all rule sets from servers
- Local evaluation: No network calls after init
- Auto-flush: Events sent every 60 seconds
- Config polling: Every 10 seconds (configurable)

**Statistical Capabilities**:
- P-value analysis (0.05 threshold)
- Confidence intervals
- CUPED variance reduction
- Winsorization for outliers
- Sample ratio mismatch detection

### 1.5 Flagsmith (Open Source)

**Core Value Proposition**: Ship faster with open-source feature flag management.

**Key Features**:
- Toggle features across web, mobile, server
- User segmentation based on stored traits
- Staged rollouts to percentage cohorts
- A/B testing with analytics integration
- Self-hosted via Kubernetes/Helm/OpenShift

**SDK Architecture**:
- 13+ language SDKs
- Two evaluation modes:
  1. **Remote**: Blocking network request per evaluation
  2. **Local**: Async fetch on init, poll every 60s
- Identity-based evaluation: `getIdentityFlags(identifier, traits)`
- Default fallback handlers for failures

**Open Source Advantage**:
- Full self-hosting capability
- On-premises/private cloud deployment
- GitHub-available codebase

### 1.6 GrowthBook (Open Source)

**Core Value Proposition**: #1 open-source feature flags and experimentation platform.

**Key Metrics**:
- 100B+ feature flag lookups daily
- 2,700+ companies
- 99.9999% infrastructure uptime
- SOC II certified, GDPR compliant

**Key Features**:
- Visual editor for no-code A/B tests
- Data warehouse native integration
- Enterprise-class statistics engine
- Smallest SDK footprint (9KB JS)

**Statistical Engine**:
- **Bayesian** (default): Probability distributions, intuitive results
- **Frequentist**: Two-sample t-tests, CUPED, sequential testing
- Configurable priors (Normal distribution, mean 0, SD 0.3)
- Multiple testing corrections (Benjamini-Hochberg, Bonferroni)
- SRM (Sample Ratio Mismatch) detection

**Hashing Algorithm (FNV32a v2)**:
```javascript
// Deterministic bucketing
n = fnv32a(fnv32a(seed + userId) + "")
bucket = (n % 10000) / 10000  // 0.0 to 1.0
```

**Cloudflare Workers SDK**:
```typescript
import { GrowthBook } from '@growthbook/edge-cloudflare'
// Webhook-based or JIT payload caching via KV
// Sticky bucketing for consistent UX
// Automatic attribute collection (device, browser, UTM)
```

---

## 2. Architecture Vision for flags.do

### 2.1 Domain Structure

```
flags.do                    # Primary domain
experiments.do              # Alias for experimentation focus
ab.do                       # A/B testing shorthand (if available)
```

### 2.2 High-Level Architecture

```
flags.do
├── Flag Evaluation (edge, KV cached)
│   ├── Boolean flags (gates)
│   ├── Multivariate flags (strings, numbers, JSON)
│   └── Percentage rollouts
├── User Bucketing (deterministic hash)
│   ├── FNV32a hashing (GrowthBook compatible)
│   ├── Sticky bucketing via Durable Objects
│   └── Cross-device identity resolution
├── Targeting Rules Engine
│   ├── User attributes (traits)
│   ├── Segment membership
│   ├── Geographic targeting
│   └── Time-based activation
├── Event Tracking
│   ├── Exposure logging (auto + manual)
│   ├── Conversion events
│   └── Analytics pipeline integration
├── Admin API
│   ├── Flag CRUD operations
│   ├── Experiment management
│   ├── Segment definitions
│   └── Audit logging
└── Stats Engine
    ├── Bayesian analysis (default)
    ├── Frequentist analysis
    ├── CUPED variance reduction
    └── SRM detection
```

### 2.3 Durable Object Design

```typescript
// FlagConfigDO - Single source of truth for flag configuration
// One per project/environment
class FlagConfigDO extends DurableObject<Env> {
  // SQLite: flag definitions, targeting rules, segments
  // WebSocket: Real-time config updates to edge
  // Methods: getFlags, updateFlag, createExperiment
}

// UserBucketDO - Consistent bucketing per user
// One per user (or user segment for efficiency)
class UserBucketDO extends DurableObject<Env> {
  // SQLite: user assignments, sticky bucket history
  // Methods: getBucket, assignToExperiment, getAssignments
}

// ExperimentDO - Experiment state and results
// One per experiment
class ExperimentDO extends DurableObject<Env> {
  // SQLite: exposures, conversions, computed stats
  // Methods: recordExposure, recordConversion, getResults
}

// AnalyticsDO - Aggregated analytics
// Sharded by time period for write scalability
class AnalyticsDO extends DurableObject<Env> {
  // SQLite: aggregated counts, metrics
  // Methods: ingest, query, export
}
```

### 2.4 Storage Strategy

| Data Type | Hot Storage | Warm Storage | Archive |
|-----------|-------------|--------------|---------|
| Flag configs | KV (edge cached) | SQLite in DO | - |
| User buckets | SQLite in DO | - | R2 (old users) |
| Exposures | SQLite in DO | R2 (batch export) | Analytics warehouse |
| Experiment results | SQLite in DO | R2 (historical) | - |

### 2.5 Edge Evaluation Flow

```
Request arrives at edge
         │
         ▼
┌─────────────────────────┐
│  Check KV for flags     │  ◄── Sub-ms read
│  (cached flag config)   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Hash user ID + flag    │  ◄── FNV32a (no network)
│  Deterministic bucket   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Evaluate targeting     │  ◄── In-memory rules
│  rules against context  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Return variation       │  ◄── < 1ms total
│  Log exposure (async)   │
└─────────────────────────┘
```

---

## 3. API Design

### 3.1 SDK Interface

```typescript
import { Flags } from 'flags.do'

const flags = Flags({
  projectKey: 'my-project',
  environment: 'production'
})

// Boolean flag
const showNewUI = await flags.isEnabled('new-ui', {
  userId: 'user-123',
  attributes: { plan: 'pro', country: 'US' }
})

// Multivariate flag
const buttonColor = await flags.getValue('button-color', {
  userId: 'user-123',
  default: 'blue'
})

// Experiment assignment
const experiment = await flags.getExperiment('checkout-flow', {
  userId: 'user-123'
})
// { variation: 'B', payload: { layout: 'single-page' } }

// Track conversion
await flags.track('purchase', {
  userId: 'user-123',
  value: 99.99,
  properties: { sku: 'WIDGET-001' }
})
```

### 3.2 REST API

```
GET  /flags/:projectKey/:flagKey
     ?userId=xxx&attributes=base64json
     Returns: { value, variation, reason }

POST /flags/:projectKey/:flagKey/evaluate
     Body: { userId, attributes }
     Returns: { value, variation, reason }

POST /events/:projectKey
     Body: { events: [{ type, userId, ... }] }
     Returns: { accepted: number }

GET  /experiments/:projectKey/:experimentKey/results
     Returns: { variations: [...], winner, confidence }
```

### 3.3 Admin API

```
# Flags
GET    /admin/projects/:projectKey/flags
POST   /admin/projects/:projectKey/flags
GET    /admin/projects/:projectKey/flags/:flagKey
PUT    /admin/projects/:projectKey/flags/:flagKey
DELETE /admin/projects/:projectKey/flags/:flagKey

# Experiments
GET    /admin/projects/:projectKey/experiments
POST   /admin/projects/:projectKey/experiments
GET    /admin/projects/:projectKey/experiments/:experimentKey
PUT    /admin/projects/:projectKey/experiments/:experimentKey
POST   /admin/projects/:projectKey/experiments/:experimentKey/start
POST   /admin/projects/:projectKey/experiments/:experimentKey/stop

# Segments
GET    /admin/projects/:projectKey/segments
POST   /admin/projects/:projectKey/segments
PUT    /admin/projects/:projectKey/segments/:segmentKey
DELETE /admin/projects/:projectKey/segments/:segmentKey
```

---

## 4. Targeting Rules Engine

### 4.1 Rule Syntax (MongoDB-style, GrowthBook compatible)

```typescript
interface TargetingRule {
  id: string
  condition: Condition  // MongoDB-style query
  coverage: number      // 0.0 - 1.0
  variations: VariationWeight[]
  hashAttribute?: string  // Default: 'userId'
}

// Condition examples
{ country: 'US' }
{ plan: { $in: ['pro', 'enterprise'] } }
{ $and: [
  { country: 'US' },
  { age: { $gte: 18 } }
]}
{ $or: [
  { betaTester: true },
  { employeeId: { $exists: true } }
]}
```

### 4.2 Operators Supported

| Operator | Description | Example |
|----------|-------------|---------|
| `$eq` | Equals | `{ plan: { $eq: 'pro' } }` |
| `$ne` | Not equals | `{ status: { $ne: 'banned' } }` |
| `$in` | In array | `{ country: { $in: ['US', 'CA'] } }` |
| `$nin` | Not in array | `{ country: { $nin: ['CN', 'RU'] } }` |
| `$gt`, `$gte` | Greater than | `{ age: { $gte: 18 } }` |
| `$lt`, `$lte` | Less than | `{ usage: { $lt: 1000 } }` |
| `$exists` | Property exists | `{ premiumFeature: { $exists: true } }` |
| `$regex` | Regex match | `{ email: { $regex: '@company\\.com$' } }` |
| `$and`, `$or`, `$not` | Logical | `{ $and: [...] }` |

### 4.3 Evaluation Order

1. **Kill switch check** - If flag is disabled globally, return default
2. **Individual targeting** - Check if user has specific override
3. **Segment rules** - Evaluate rules in priority order
4. **Percentage rollout** - Hash user into bucket
5. **Default rule** - Fall back to default variation

---

## 5. Statistical Engine

### 5.1 Bayesian Analysis (Default)

```typescript
interface BayesianResult {
  variationId: string
  users: number
  conversions: number
  conversionRate: number
  chanceToWin: number           // P(this > control)
  expectedLoss: number          // Risk if choosing this
  credibleInterval: [number, number]  // 95% CI
  uplift: {
    mean: number
    distribution: number[]      // For visualization
  }
}
```

**Prior Configuration**:
- Default: Uninformative prior
- Optional: Normal(0, 0.3) to shrink extreme results

### 5.2 Frequentist Analysis

```typescript
interface FrequentistResult {
  variationId: string
  users: number
  conversions: number
  conversionRate: number
  pValue: number
  significanceLevel: 0.01 | 0.05 | 0.1
  isSignificant: boolean
  confidenceInterval: [number, number]
  relativeUplift: number
  standardError: number
}
```

### 5.3 Variance Reduction (CUPED)

```typescript
// CUPED: Controlled Using Pre-Experiment Data
// Reduces variance by adjusting for pre-experiment behavior

interface CUPEDConfig {
  enabled: boolean
  covariate: string           // e.g., 'pre_experiment_sessions'
  lookbackDays: number        // How far back to look
}

// Adjusted metric = Y - theta * (X - mean(X))
// Where X is the covariate, theta is regression coefficient
```

### 5.4 Data Quality Checks

| Check | Description | Action |
|-------|-------------|--------|
| SRM | Sample Ratio Mismatch | Alert if allocation differs from expected |
| MDE | Minimum Detectable Effect | Warn if sample too small |
| Novelty | Early results instability | Suggest waiting period |
| Carryover | Previous experiment contamination | Flag affected users |

---

## 6. Edge Advantages

### 6.1 Performance Benefits

| Metric | Traditional SDK | flags.do Edge |
|--------|----------------|---------------|
| Flag evaluation | 1-5ms | <0.5ms |
| Cold start | 50-200ms | ~0ms (isolates) |
| Network round trips | 1-2 per eval | 0 (cached) |
| Global latency | Variable | Consistent <50ms |

### 6.2 Unique Edge Capabilities

1. **Server-Side Rendering Support**
   - Evaluate flags before HTML generation
   - No flash of wrong content (FOWC)
   - SEO-safe personalization

2. **Bot Detection Integration**
   - Exclude bots from experiments automatically
   - Use Cloudflare Bot Management signals
   - Prevent analytics pollution

3. **Geographic Targeting**
   - Native access to `cf-ipcountry`, `cf-ipcity`
   - No client-side geo lookup needed
   - Real-time geo-based rollouts

4. **Request Header Targeting**
   - Target by User-Agent, Accept-Language
   - Device type detection
   - A/B test by request characteristics

5. **Response Transformation**
   - Modify HTML at edge based on flags
   - Inject experiment tracking scripts
   - Serve different static assets

---

## 7. Integration Points

### 7.1 Internal Platform Services

```typescript
// Bind to other workers.do services
interface Env {
  FLAGS: DurableObjectNamespace    // Flag config DO
  USERS: DurableObjectNamespace    // User bucket DO
  EXPERIMENTS: DurableObjectNamespace
  ANALYTICS: DurableObjectNamespace

  // Platform integrations
  LLM: Service                     // AI-powered targeting
  ANALYTICS_DO: Service            // analytics.do integration
}
```

### 7.2 External Integrations

| Integration | Purpose | Implementation |
|-------------|---------|----------------|
| Segment | Event routing | Webhook receiver |
| Amplitude | Analytics | Event export |
| Mixpanel | Analytics | Event export |
| BigQuery | Data warehouse | Scheduled export |
| Snowflake | Data warehouse | Scheduled export |
| Slack | Notifications | Webhook sender |
| PagerDuty | Alerts | Webhook sender |

### 7.3 MCP Integration

```typescript
// AI agents can control experiments
const mcpTools = {
  'flags_get': { /* Get flag value */ },
  'flags_set': { /* Update flag */ },
  'experiment_create': { /* Create A/B test */ },
  'experiment_results': { /* Get stats */ },
  'experiment_decide': { /* AI recommends winner */ }
}
```

---

## 8. Implementation Phases

### Phase 1: Core Flag Evaluation (MVP)

**Duration**: 2-3 weeks

**Deliverables**:
- [ ] Boolean flag evaluation at edge
- [ ] KV-cached flag configuration
- [ ] FNV32a deterministic bucketing
- [ ] Basic targeting rules (equals, in)
- [ ] SDK: `isEnabled()`, `getValue()`
- [ ] Admin API: Flag CRUD

**TDD Issues**:
```
[EPIC] Core flag evaluation
  [RED] Test flag evaluation returns correct value
  [GREEN] Implement KV-cached flag lookup
  [RED] Test deterministic bucketing
  [GREEN] Implement FNV32a hashing
  [RED] Test basic targeting rules
  [GREEN] Implement condition evaluator
  [REFACTOR] Extract targeting engine
```

### Phase 2: Experiments & Events

**Duration**: 2-3 weeks

**Deliverables**:
- [ ] Experiment configuration
- [ ] Exposure tracking (auto-logged)
- [ ] Conversion event ingestion
- [ ] Event batching and export
- [ ] SDK: `getExperiment()`, `track()`

**TDD Issues**:
```
[EPIC] Experimentation engine
  [RED] Test experiment assignment
  [GREEN] Implement variation selection
  [RED] Test exposure logging
  [GREEN] Implement auto-exposure tracking
  [RED] Test event batching
  [GREEN] Implement event pipeline
```

### Phase 3: Statistics Engine

**Duration**: 3-4 weeks

**Deliverables**:
- [ ] Bayesian analysis
- [ ] Frequentist analysis
- [ ] CUPED variance reduction
- [ ] SRM detection
- [ ] Results API

**TDD Issues**:
```
[EPIC] Statistics engine
  [RED] Test Bayesian probability calculation
  [GREEN] Implement Beta distribution
  [RED] Test frequentist t-test
  [GREEN] Implement significance testing
  [RED] Test CUPED adjustment
  [GREEN] Implement variance reduction
  [RED] Test SRM detection
  [GREEN] Implement sample ratio check
```

### Phase 4: Advanced Features

**Duration**: 2-3 weeks

**Deliverables**:
- [ ] Segments management
- [ ] Mutual exclusion groups
- [ ] Multi-armed bandits
- [ ] Sticky bucketing
- [ ] Audit logging

### Phase 5: Dashboard & Integrations

**Duration**: 2-3 weeks

**Deliverables**:
- [ ] Web dashboard (React)
- [ ] Analytics integrations
- [ ] Webhook notifications
- [ ] MCP tools

---

## 9. Technical Specifications

### 9.1 Hashing Implementation

```typescript
// FNV32a implementation (GrowthBook v2 compatible)
function fnv32a(str: string): number {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function getBucket(userId: string, seed: string): number {
  const n = fnv32a(fnv32a(seed + userId).toString() + '')
  return (n % 10000) / 10000  // 0.0000 to 0.9999
}

function inBucket(bucket: number, range: [number, number]): boolean {
  return bucket >= range[0] && bucket < range[1]
}
```

### 9.2 Flag Configuration Schema

```typescript
interface Flag {
  key: string
  name: string
  description?: string
  type: 'boolean' | 'string' | 'number' | 'json'
  defaultValue: any
  enabled: boolean

  // Targeting
  rules: TargetingRule[]

  // Experiment settings (if A/B test)
  experiment?: {
    key: string
    variations: Variation[]
    trafficAllocation: number  // 0.0 - 1.0
    status: 'draft' | 'running' | 'paused' | 'completed'
  }

  // Metadata
  tags: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
}

interface Variation {
  id: string
  key: string
  name: string
  value: any
  weight: number  // 0.0 - 1.0, must sum to 1.0
}
```

### 9.3 Event Schema

```typescript
interface ExposureEvent {
  type: 'exposure'
  timestamp: string
  userId: string
  flagKey: string
  variationKey: string
  experimentKey?: string
  attributes: Record<string, any>
  source: 'sdk' | 'edge' | 'api'
}

interface TrackEvent {
  type: 'track'
  timestamp: string
  userId: string
  eventName: string
  value?: number
  properties: Record<string, any>
  source: 'sdk' | 'api'
}
```

---

## 10. Consistency Guarantees

### 10.1 Flag Propagation

| Change Type | Propagation Time | Mechanism |
|-------------|------------------|-----------|
| Flag enable/disable | <1s | WebSocket push |
| Targeting rule update | <5s | KV cache invalidation |
| New flag creation | <10s | KV write + cache |
| Experiment start/stop | <1s | WebSocket + DO state |

### 10.2 Bucketing Consistency

**Guarantee**: Same user + same flag + same seed = same bucket

**Implementation**:
- Deterministic FNV32a hash (no randomness)
- Sticky bucketing optional (DO-persisted)
- Cross-device: Identity resolution layer

### 10.3 Event Delivery

**Guarantee**: At-least-once delivery to analytics

**Implementation**:
- Events buffered in DO SQLite
- Batch export every 60s
- Retry with exponential backoff
- Dead letter queue for failures

---

## 11. Pricing Model Considerations

| Tier | Flags | MAU | Experiments | Price |
|------|-------|-----|-------------|-------|
| Free | 5 | 10K | 1 | $0 |
| Starter | 25 | 100K | 5 | $29/mo |
| Pro | Unlimited | 1M | Unlimited | $99/mo |
| Enterprise | Unlimited | Unlimited | Unlimited | Custom |

**Usage-Based Additions**:
- $0.10 per 100K additional evaluations
- $0.50 per 100K additional events
- $10 per additional 100K MAU

---

## 12. Competitive Differentiation

### 12.1 vs LaunchDarkly

| Aspect | LaunchDarkly | flags.do |
|--------|--------------|----------|
| Edge evaluation | Yes (via KV) | Native |
| Pricing | $$$$ | $ |
| Open source | No | Core open |
| Self-hosting | No | Yes |
| Stats engine | Basic | Advanced (Bayesian/Freq) |

### 12.2 vs GrowthBook

| Aspect | GrowthBook | flags.do |
|--------|------------|----------|
| Edge evaluation | Plugin | Native |
| Managed hosting | Limited | Full |
| Real-time updates | Polling | WebSocket |
| Infrastructure | BYO | Included |
| Analytics | Warehouse-native | Integrated + export |

### 12.3 Unique Value Props

1. **True Edge-Native**: Built for Cloudflare from ground up
2. **Unified Platform**: Part of workers.do ecosystem
3. **AI-Ready**: MCP integration for agent-controlled experiments
4. **Developer Experience**: Natural language API patterns
5. **Transparent Pricing**: Simple, predictable costs

---

## 13. Open Questions

1. **Domain choice**: `flags.do` vs `experiments.do` vs both?
2. **Stats engine**: Build custom or integrate existing (e.g., GrowthBook's)?
3. **Visual editor**: Priority for no-code A/B tests?
4. **SDK strategy**: Universal SDK or platform-specific?
5. **Warehouse integration**: Native connectors or export-only?

---

## 14. References

- [LaunchDarkly Cloudflare SDK](https://launchdarkly.com/docs/sdk/edge/cloudflare)
- [GrowthBook Edge SDK](https://docs.growthbook.io/lib/edge/cloudflare)
- [GrowthBook Statistics Overview](https://docs.growthbook.io/statistics/overview)
- [GrowthBook SDK Build Guide](https://docs.growthbook.io/lib/build-your-own)
- [Statsig Documentation](https://docs.statsig.com/)
- [Flagsmith Documentation](https://docs.flagsmith.com/)
- [Harness Feature Management](https://www.harness.io/products/feature-management-experimentation)

---

## 15. Next Steps

1. **Create beads workspace**: `bd init --prefix=flags` in `rewrites/flags/`
2. **Create TDD epics**: Core evaluation, experiments, statistics
3. **Scaffold project**: DO classes, SDK structure, API routes
4. **Implement Phase 1**: Core flag evaluation MVP
5. **Validate with users**: Get feedback on API design

---

*Document version: 1.0*
*Last updated: 2026-01-07*
