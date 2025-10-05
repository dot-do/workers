# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Cloudflare Edge Network                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    Hono HTTP API                           │   │
│  │                  (Worker: ml-registry-poc)                 │   │
│  └──────┬─────────────────────────────────────────────────────┘   │
│         │                                                           │
│         ├─── Models Registry                                       │
│         ├─── Lineage Tracker                                       │
│         ├─── Performance Tracker                                   │
│         ├─── Compliance Manager                                    │
│         └─── Vibe Coding Integration                               │
│                                                                     │
└────────────┬────────────┬───────────┬───────────┬──────────────────┘
             │            │           │           │
             ↓            ↓           ↓           ↓
      ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐
      │    D1    │ │    R2    │ │Vectorize│ │ Analytics  │
      │ (Graph)  │ │(Artifacts)│ │(Search) │ │  Engine    │
      └──────────┘ └──────────┘ └─────────┘ └────────────┘
```

## Component Architecture

### 1. HTTP API Layer (Hono)

**Purpose:** RESTful API for all operations

**Components:**
- Route handlers (30+ endpoints)
- Request validation (Zod schemas)
- Error handling
- CORS and middleware

**Endpoints:**
- `/api/models/*` - Model registry
- `/api/lineage/*` - Lineage tracking
- `/api/performance/*` - Performance metrics
- `/api/governance/*` - Compliance & approvals
- `/api/vibe/*` - Vibe coding integration

### 2. Model Registry Layer

**Purpose:** Manage model lifecycle

**Components:**
- `ModelRegistry` class
  - `registerModel()` - Create new model
  - `createModelVersion()` - Version management
  - `promoteToProduction()` - Deployment control
  - `deprecateModel()` - Lifecycle management
  - `searchModels()` - Discovery

**Storage:**
- Models stored as `things` with `type: model`
- Versions in `model_versions` table
- Metadata in JSON blobs

### 3. Lineage Tracking Layer

**Purpose:** Track dependencies and impact

**Components:**
- `LineageTracker` class
  - `trackDataset()` - Training data dependencies
  - `trackDeployment()` - Deployment relationships
  - `getFullLineage()` - Upstream + downstream
  - `getImpactAnalysis()` - Change impact
  - `getLineageGraph()` - Visualization data

**Storage:**
- Relationships: trainedOn, deployedTo, evaluatedOn
- Graph traversal via recursive queries

### 4. Performance Tracking Layer

**Purpose:** Monitor model performance

**Components:**
- `PerformanceTracker` class
  - `recordMetric()` - Store metrics
  - `getMetrics()` - Query metrics
  - `getStatistics()` - Aggregate stats
  - `compareModels()` - Side-by-side comparison
  - `trackInference()` - End-to-end tracking

**Storage:**
- `model_metrics` table (D1)
- Analytics Engine (time-series)

**Metrics:**
- Latency (p50, p95, p99)
- Accuracy
- Cost
- Quality score
- Throughput

### 5. Governance & Compliance Layer

**Purpose:** Ensure regulatory compliance

**Components:**
- `ComplianceManager` class
  - `requestApproval()` - Start workflow
  - `reviewApproval()` - Approve/reject
  - `runComplianceChecks()` - GDPR, AI Act, etc.
  - `logEvent()` - Audit trail
  - `getGovernanceHistory()` - Audit queries

**Storage:**
- `approvals` table
- `governance_events` table

**Checks:**
- GDPR compliance
- EU AI Act classification
- Fairness testing
- Bias detection
- Security audit

### 6. Vibe Coding Integration Layer

**Purpose:** Cost optimization and A/B testing

**Components:**
- `VibeCodingIntegration` class
  - `trackAIRequest()` - AI Gateway integration
  - `getCostSummary()` - Cost analysis
  - `compareModels()` - A/B testing
  - `getCostTrends()` - Time-series analysis
  - `getROI()` - Value calculation

**Storage:**
- `model_costs` table
- `model_metrics` (quality scores)

**Analysis:**
- Provider comparison (OpenAI, Anthropic, Cloudflare)
- Cost per request/token
- Quality vs cost
- Automatic winner selection

### 7. Graph Database Layer

**Purpose:** Store entities and relationships

**Schema:**
- `things` - Universal entity table
- `relationships` - Universal edge table

**Indexes:**
- Type-based queries
- Time-series queries
- Graph traversal

**Patterns:**
- Things + Relationships
- Polymorphic types
- JSON metadata
- Recursive queries

## Data Flow Diagrams

### Register Model Flow

```
Client Request
     │
     ↓
┌────────────┐
│ POST       │
│/api/models │
└─────┬──────┘
      │
      ↓
┌─────────────────┐
│ Validate Schema │ (Zod)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ ModelRegistry   │
│.registerModel() │
└────────┬────────┘
         │
         ├──→ Create thing (type: model)
         │    ↓
         │   D1 INSERT into things
         │
         ├──→ Create version record
         │    ↓
         │   D1 INSERT into model_versions
         │
         └──→ Upload artifacts (optional)
              ↓
             R2 PUT object
```

### Track Inference Flow

```
AI Gateway Request
     │
     ↓
┌──────────────┐
│ POST         │
│/api/vibe/track│
└──────┬───────┘
       │
       ↓
┌──────────────────────┐
│ VibeCodingIntegration│
│.trackAIRequest()     │
└──────┬───────────────┘
       │
       ├──→ Record cost
       │    ↓
       │   D1 INSERT into model_costs
       │
       ├──→ Record performance
       │    ↓
       │   D1 INSERT into model_metrics
       │    ↓
       │   Analytics Engine write
       │
       └──→ Record quality (if provided)
            ↓
           D1 INSERT into model_metrics
```

### Get Lineage Flow

```
Client Request
     │
     ↓
┌────────────────────┐
│ GET                │
│/api/lineage/:id    │
└─────────┬──────────┘
          │
          ↓
┌─────────────────┐
│ LineageTracker  │
│.getFullLineage()│
└────────┬────────┘
         │
         ├──→ Get upstream (recursive)
         │    │
         │    └──→ Follow 'derivedFrom', 'trainedOn'
         │         ↓
         │        D1 SELECT (BFS traversal)
         │
         └──→ Get downstream (recursive)
              │
              └──→ Follow 'deployedTo', 'usedBy'
                    ↓
                   D1 SELECT (BFS traversal)
```

### Approval Workflow Flow

```
Request Approval
     │
     ↓
┌─────────────────────┐
│ POST                │
│/api/governance/     │
│approvals            │
└──────┬──────────────┘
       │
       ↓
┌──────────────────────┐
│ ComplianceManager    │
│.requestApproval()    │
└──────┬───────────────┘
       │
       ├──→ Run compliance checks
       │    │
       │    ├──→ GDPR check
       │    ├──→ AI Act check
       │    ├──→ Fairness check
       │    ├──→ Bias check
       │    └──→ Security check
       │         ↓
       │        Results array
       │
       ├──→ Create approval record
       │    ↓
       │   D1 INSERT into approvals
       │
       └──→ Log governance event
            ↓
           D1 INSERT into governance_events
            ↓
        Return approval ID

Later...

Review Approval
     │
     ↓
┌─────────────────────┐
│ POST                │
│/api/governance/     │
│approvals/:id/review │
└──────┬──────────────┘
       │
       ↓
┌──────────────────────┐
│ ComplianceManager    │
│.reviewApproval()     │
└──────┬───────────────┘
       │
       ├──→ Update approval status
       │    ↓
       │   D1 UPDATE approvals
       │
       └──→ Log governance event
            ↓
           D1 INSERT into governance_events
```

## Storage Architecture

### D1 Database (SQLite at Edge)

**Tables:**
1. `things` - 10M+ rows (models, datasets, etc.)
2. `relationships` - 100M+ rows (edges)
3. `model_versions` - 10M+ rows (version tracking)
4. `model_metrics` - 1B+ rows (performance data)
5. `governance_events` - 10M+ rows (audit trail)
6. `approvals` - 1M+ rows (workflow state)
7. `model_costs` - 100M+ rows (cost tracking)

**Size Estimates:**
- Things: 1 KB each → 10 GB
- Relationships: 100 bytes each → 10 GB
- Total: ~50 GB (within D1 limits)

### R2 Storage (Object Storage)

**Buckets:**
- `ml-model-artifacts` - Model files, checkpoints

**Usage:**
- Model weights (GBs to TBs)
- Training checkpoints
- Evaluation results
- Exported lineage graphs

**Access:**
- Direct upload via presigned URLs
- Download via CDN (low latency)
- Versioned objects (immutable)

### Vectorize (Vector Search)

**Index:**
- `ml-model-embeddings` - 768-dimensional vectors

**Usage:**
- Model similarity search
- Find similar models
- Recommendation system

**Performance:**
- < 50ms query latency
- Cosine similarity metric
- 5M+ vectors capacity

### Analytics Engine (Time-Series)

**Dataset:**
- `ml_model_analytics` - Real-time metrics

**Usage:**
- Performance time-series
- Cost time-series
- Aggregate queries

**Performance:**
- Real-time ingestion
- SQL queries
- No additional latency

## Scalability & Performance

### Read Performance

**D1 Reads:**
- Primary key lookup: < 5ms
- Indexed query: < 10ms
- Graph traversal (3 levels): < 100ms
- Complex aggregation: < 200ms

**R2 Reads:**
- Small object (< 1 MB): < 50ms
- Large object (streaming): Instant start
- Global CDN: Low latency everywhere

**Vectorize Reads:**
- Similarity search: < 50ms
- k-NN query (k=10): < 100ms

### Write Performance

**D1 Writes:**
- Single insert: < 20ms
- Batch insert (10 rows): < 100ms
- Transaction commit: < 50ms

**R2 Writes:**
- Small upload (< 1 MB): < 100ms
- Large upload (streaming): Chunked
- Multipart upload: Parallel

**Analytics Writes:**
- Single data point: < 5ms
- Batch (25 points): < 10ms

### Throughput

**Worker:**
- Requests/second: 1000+
- CPU time/request: < 50ms
- Concurrent connections: Unlimited

**D1:**
- Reads/second: 10,000+
- Writes/second: 1,000+
- Connections/worker: 10

**R2:**
- Operations/second: Unlimited
- Bandwidth: Unlimited (no egress)

**Analytics:**
- Data points/second: 25 (per worker)
- Queries/second: Unlimited

## Security Architecture

### Authentication & Authorization

**Current:** None (POC)

**Production Requirements:**
- API key authentication
- Role-based access control (RBAC)
- Model-level permissions
- Audit all operations

**Recommended:**
- Cloudflare Access for workforce
- OAuth 2.0 for applications
- Service tokens for integrations

### Data Protection

**At Rest:**
- D1: Encrypted by default
- R2: Server-side encryption
- Vectorize: Encrypted by default

**In Transit:**
- TLS 1.3 (Cloudflare edge)
- End-to-end encryption
- Certificate pinning

### Compliance

**GDPR:**
- Data minimization
- Right to erasure (soft delete)
- Data portability (export API)
- Audit trail

**EU AI Act:**
- Risk classification
- Transparency requirements
- Human oversight
- Documentation

## Deployment Architecture

### Environments

**Development:**
- Local: `wrangler dev`
- Database: Local D1
- Storage: Local R2 emulation

**Staging:**
- Workers: Separate environment
- Database: Separate D1 instance
- Storage: Separate R2 bucket

**Production:**
- Workers: Global deployment
- Database: Global D1
- Storage: Multi-region R2

### CI/CD Pipeline

```
GitHub Push
     │
     ↓
┌────────────┐
│  GitHub    │
│  Actions   │
└─────┬──────┘
      │
      ├──→ Run tests
      │    ↓
      │   pnpm test
      │
      ├──→ Type check
      │    ↓
      │   tsc --noEmit
      │
      ├──→ Lint
      │    ↓
      │   eslint
      │
      └──→ Deploy (if main branch)
           ↓
          wrangler deploy
           ↓
      Update submodules
```

### Monitoring & Observability

**Metrics:**
- Request latency (p50, p95, p99)
- Error rate
- Database query time
- R2 operation time

**Logs:**
- Request logs (wrangler tail)
- Error logs
- Audit logs (governance_events)

**Alerts:**
- High error rate
- Slow queries
- Database size approaching limit
- Cost threshold exceeded

## Future Architecture Enhancements

### 1. Multi-Tenancy

**Changes:**
- Add `organization_id` to things
- Add `tenant` field to relationships
- Implement tenant isolation
- Per-tenant billing

### 2. Model Serving

**Components:**
- Inference Workers (AI binding)
- Load balancer (weighted routing)
- Canary deployments
- Request tracking

### 3. Advanced Analytics

**Components:**
- Data pipeline (Workers + Queues)
- OLAP database (ClickHouse)
- Dashboard (D3.js visualization)
- Alerting (webhooks)

### 4. Model Marketplace

**Components:**
- Public model catalog
- Search and discovery
- Access control
- Usage tracking

### 5. AutoML Integration

**Components:**
- Experiment tracking
- Hyperparameter tuning
- Model selection
- Deployment automation
