# Centralized API Architecture - Implementation Plan

**Date:** 2025-10-04
**Status:** Planning Phase
**Critical:** This architectural decision affects ALL workers

## Core Principle

**ONLY the `api` worker has fetch handlers. Everything else is RPC-only.**

This centralizes:
- ✅ Security (auth, rate limiting)
- ✅ Logging (all requests in one place)
- ✅ Routing (single source of truth)
- ✅ Monitoring (unified metrics)

## Current State

### ✅ What We Have

**API Worker (`workers/api/`):**
- ✅ Fetch handler with middleware pipeline
- ✅ Domain routing via Workers Assets (`assets/domain-routes.json`)
- ✅ Path routing (`/api/service/*`)
- ✅ SWR caching (10s cache duration)
- ✅ KV fallback caching
- ✅ Auth middleware
- ✅ Rate limiting middleware
- ✅ Request/response logging

**Routing Infrastructure:**
- ✅ `src/routing/domains.ts` - Domain-based routing
- ✅ `src/routing/paths.ts` - Path-based routing
- ✅ `assets/domain-routes.json` - Domain routing table (7 routes)
- ✅ `src/middleware/auth.ts` - Authentication
- ✅ `src/middleware/ratelimit.ts` - Rate limiting
- ✅ `src/middleware/logging.ts` - Request logging

### ❌ What Needs to Change

**Workers with Fetch Handlers (Need Conversion):**

Based on grep results, these workers have fetch handlers that need removal:

#### Core Services (8)
1. **db** - Database service (has Hono/fetch)
2. **auth** - Authentication service (has Hono/fetch)
3. **gateway** - Gateway service (has Hono/fetch) - SHOULD BE REMOVED ENTIRELY?
4. **schedule** - Scheduled tasks (has Hono/fetch)
5. **webhooks** - Webhook receiver (has Hono/fetch) - NEEDS SPECIAL HANDLING
6. **email** - Email service (has Hono/fetch)
7. **mcp** - Model Context Protocol (has Hono/fetch)
8. **queue** - Queue processing (has Hono/fetch)

#### AI Services (2)
9. **ai** - AI generation (has Hono/fetch)
10. **embeddings** - Vector embeddings (has Hono/fetch)

#### DO Worker (1)
11. **do** - Unified service entry point (has Hono/fetch) - SPECIAL CASE

#### Other Workers (~20+)
12. **agent** - AI agent service
13. **fn** - Functions service
14. **blog-stream** - Blog streaming
15. **mdx** - MDX processing
16. **mdx-landingpage-tailwind** - MDX landing pages
17. **oauth** - OAuth flows
18. **r2sql-query** - R2 SQL queries
19. **deploy** - Deployment service
20. **graph** - Graph database
21. **analytics** - Analytics service
22. **benchmark** - Benchmarking
23. And more...

## Architecture

### Request Flow

```
┌─────────────────┐
│   HTTP Request  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   api worker    │  ◄── ONLY worker with fetch handler
│   (fetch only)  │
│                 │
│  Middleware:    │
│  1. Auth        │
│  2. Rate Limit  │
│  3. Logging     │
│  4. Routing     │
└────────┬────────┘
         │
         │ RPC Call (Service Binding)
         │
         ▼
┌─────────────────┐
│ Service Workers │  ◄── RPC only (WorkerEntrypoint)
│  - db           │
│  - auth         │
│  - ai           │
│  - email        │
│  - etc...       │
└─────────────────┘
```

### Routing Priority

1. **Path-based routes** (`/api/service/*`) - Highest priority
2. **Domain-based routes** (`service.do`) - From domain-routes.json
3. **Wildcard domains** (`*.waitlist.do`) - From domain-routes.json
4. **Fallback** - 404 or waitlist page

### Domain Routing Table

**Source:** `sdk/.domains.tsv` (105 domains)

**Generated Output:** `workers/api/assets/domain-routes.json`

**Format:**
```json
[
  {
    "domain": "llm.do",
    "service": "ai",
    "binding": "AI_SERVICE",
    "method": "llm_*",
    "requiresAuth": true,
    "requiresAdmin": false,
    "metadata": {
      "description": "LLM generation (proxy to OpenRouter)",
      "category": "Gateway"
    },
    "updatedAt": "2025-10-04T00:00:00Z"
  },
  {
    "domain": "models.do",
    "service": "models",
    "binding": "MODELS_SERVICE",
    "method": "models_*",
    "requiresAuth": false,
    "requiresAdmin": false,
    "metadata": {
      "description": "Model registry (database view)",
      "category": "Model Management"
    },
    "updatedAt": "2025-10-04T00:00:00Z"
  }
]
```

## Implementation Plan

### Phase 1: Generate Routing Table (Week 1)

**Goal:** Generate complete domain-routes.json from .domains.tsv

#### Tasks:
1. ✅ Identify source: `sdk/.domains.tsv` (105 domains)
2. ⏳ Create generator: `workers/api/scripts/generate-routing-table.ts`
3. ⏳ Map domain → service binding
4. ⏳ Determine auth requirements per domain
5. ⏳ Add metadata (category, description)
6. ⏳ Deploy to Workers Assets

**Script Location:** `workers/api/scripts/generate-routing-table.ts`

**Input:** `sdk/.domains.tsv`
**Output:** `workers/api/assets/domain-routes.json`

**Example Mapping:**
```typescript
const domainMappings = {
  // Aliases (same worker, different routes)
  'llm.do': { service: 'ai', method: 'llm_*' },
  'vectors.do': { service: 'ai', method: 'vectors_*' },
  'embeddings.do': { service: 'ai', method: 'embed_*' },

  // Database views (query wrappers)
  'models.do': { service: 'models', method: 'models_*' },
  'labs.do': { service: 'models', method: 'labs_*' },

  // Direct mappings (1:1 domain to worker)
  'db.do': { service: 'db', method: 'db_*' },
  'auth.do': { service: 'auth', method: 'auth_*' },
  'agents.do': { service: 'agents', method: 'agents_*' },
  // ... 100+ more
}
```

### Phase 2: Remove Fetch from Core Services (Week 2)

**Goal:** Convert core 8 services from fetch to RPC-only

#### For Each Service:

**Before (fetch handler):**
```typescript
import { Hono } from 'hono'

const app = new Hono()

app.post('/query', async (c) => {
  const { sql } = await c.req.json()
  return c.json({ result: await db.execute(sql) })
})

export default { fetch: app.fetch }
```

**After (RPC only):**
```typescript
import { WorkerEntrypoint } from 'cloudflare:workers'

export class DBService extends WorkerEntrypoint<Env> {
  async db_query(sql: string, params?: any[]) {
    return await this.env.DB.execute(sql, params)
  }

  async db_get(ns: string, id: string) {
    return await this.env.DB.query(/* ... */)
  }

  // More RPC methods...
}

export default DBService
```

**Services to Convert:**
1. ⏳ db
2. ⏳ auth
3. ⏳ ai (add llm_* and vectors_* methods)
4. ⏳ email
5. ⏳ schedule
6. ⏳ webhooks (keep HTTP endpoint for external webhooks, internal = RPC)
7. ⏳ mcp
8. ⏳ queue

### Phase 3: Update API Worker Routing (Week 2-3)

**Goal:** API worker routes all requests to RPC services

#### Update `workers/api/src/index.ts`:

```typescript
async function routeToService(
  request: Request,
  route: RouteConfig,
  ctx: ApiContext
): Promise<Response> {
  const { service, binding, path } = route

  // Get service binding from env
  const serviceBinding = ctx.env[binding]
  if (!serviceBinding) {
    throw new Error(`Service binding ${binding} not found`)
  }

  // Extract method from path or route
  const method = extractMethodFromPath(path, service)

  // Parse request body
  const body = request.method === 'GET' ? {} : await request.json()

  // Call RPC method on service
  try {
    const result = await serviceBinding[method](...Object.values(body.params || body))

    return new Response(JSON.stringify({
      success: true,
      result,
      requestId: ctx.requestId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: {
        message: error.message,
        code: error.code || 'INTERNAL_ERROR'
      },
      requestId: ctx.requestId
    }), {
      status: error.statusCode || 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

function extractMethodFromPath(path: string, service: string): string {
  // /api/db/query → db_query
  // /api/auth/validate → auth_validate
  const parts = path.split('/').filter(Boolean)
  if (parts[0] === 'api') {
    parts.shift()
  }
  if (parts[0] === service) {
    parts.shift()
  }
  return `${service}_${parts.join('_')}`
}
```

### Phase 4: Gateway Worker Decision (Week 3)

**Question:** What is the gateway worker for?

**Options:**
1. **Remove entirely** - API worker replaces it
2. **Keep as internal router** - For dispatch namespace routing
3. **Convert to RPC service** - Internal routing logic

**Recommendation:** Need to understand gateway worker's current purpose

### Phase 5: Webhooks Special Handling (Week 3)

**Issue:** External services need to POST to webhooks

**Solution:** API worker proxies to webhooks service

```typescript
// In api worker
app.post('/webhooks/:provider/:event', async (c) => {
  const provider = c.req.param('provider')
  const event = c.req.param('event')
  const payload = await c.req.json()

  // Route to webhooks service RPC
  const result = await c.env.WEBHOOKS_SERVICE.handleWebhook(
    provider,
    event,
    payload,
    c.req.raw.headers
  )

  return c.json(result)
})
```

**Webhooks Worker RPC:**
```typescript
export class WebhooksService extends WorkerEntrypoint<Env> {
  async handleWebhook(
    provider: string,
    event: string,
    payload: any,
    headers: Headers
  ) {
    // Verify signature
    // Process webhook
    // Queue for async processing
  }
}
```

### Phase 6: DO Worker Update (Week 3-4)

**Current:** DO worker has fetch handler for code execution

**Change:** Route through API worker

**Before:**
```
User → https://do.do/execute → DO worker (fetch)
```

**After:**
```
User → https://do.do/execute → API worker → DO_SERVICE.execute() (RPC)
```

### Phase 7: Testing & Deployment (Week 4)

#### Tests Needed:
1. **Routing tests** - Domain and path routing work
2. **Auth tests** - Auth middleware works for all routes
3. **RPC tests** - All RPC methods callable
4. **Integration tests** - End-to-end request flow
5. **Performance tests** - Latency overhead acceptable

#### Deployment Strategy:
1. Deploy updated API worker (with new routing table)
2. Deploy RPC-only services (one at a time)
3. Monitor for errors
4. Rollback if issues
5. Iterate

## Special Cases

### Alias Domains

Some domains are aliases (same worker, different methods):

```json
{
  "domain": "llm.do",
  "service": "ai",
  "binding": "AI_SERVICE",
  "method": "llm_*"
},
{
  "domain": "vectors.do",
  "service": "ai",
  "binding": "AI_SERVICE",
  "method": "vectors_*"
}
```

### Database View Domains

Some domains are database query wrappers:

```json
{
  "domain": "models.do",
  "service": "models",
  "binding": "MODELS_SERVICE",
  "method": "models_*",
  "metadata": {
    "type": "database-view"
  }
}
```

### External Webhook Endpoints

External services need public HTTP endpoints:

- Stripe webhooks
- GitHub webhooks
- WorkOS callbacks
- Resend webhooks

These go through API worker → webhooks service (RPC)

## Benefits

### Security
- ✅ Single auth enforcement point
- ✅ Centralized rate limiting
- ✅ Consistent security policies
- ✅ Easier to audit

### Operations
- ✅ All requests logged in one place
- ✅ Unified metrics and monitoring
- ✅ Single point for debugging
- ✅ Easier incident response

### Development
- ✅ Clear separation: HTTP vs RPC
- ✅ Services are simpler (no HTTP logic)
- ✅ Easier to test (mock RPC calls)
- ✅ Clear interfaces

### Performance
- ✅ SWR caching reduces latency
- ✅ KV fallback ensures availability
- ✅ RPC is faster than HTTP

## Migration Checklist

### Pre-Migration (This Week)
- [x] Document current state
- [x] Identify all workers with fetch handlers
- [ ] Create routing table generator
- [ ] Generate complete domain-routes.json
- [ ] Review and approve routing table

### Core Services (Week 2)
- [ ] Convert db to RPC-only
- [ ] Convert auth to RPC-only
- [ ] Convert ai to RPC-only (add llm_*, vectors_*)
- [ ] Convert email to RPC-only
- [ ] Convert schedule to RPC-only
- [ ] Convert webhooks to RPC-only
- [ ] Convert mcp to RPC-only
- [ ] Convert queue to RPC-only

### API Worker (Week 2-3)
- [ ] Update routing logic to call RPC methods
- [ ] Add method extraction from paths
- [ ] Add RPC error handling
- [ ] Add RPC response formatting
- [ ] Deploy and test

### Gateway Decision (Week 3)
- [ ] Document gateway worker purpose
- [ ] Decide: remove, keep, or convert
- [ ] Execute decision

### DO Worker (Week 3-4)
- [ ] Convert do worker to RPC-only
- [ ] Update API worker to route do.do requests
- [ ] Test code execution flow

### Testing (Week 4)
- [ ] Write routing tests
- [ ] Write auth tests
- [ ] Write RPC tests
- [ ] Write integration tests
- [ ] Performance testing

### Deployment (Week 4)
- [ ] Deploy to staging
- [ ] Smoke tests
- [ ] Deploy to production
- [ ] Monitor metrics
- [ ] Document learnings

## Success Criteria

- [ ] ONLY api worker has fetch handler
- [ ] All 105 domains route correctly
- [ ] Auth works for all routes
- [ ] Rate limiting works for all routes
- [ ] All requests logged centrally
- [ ] RPC latency < 10ms overhead
- [ ] Zero downtime deployment
- [ ] Complete test coverage

## Questions to Answer

1. **What is gateway worker for?** Need to understand before removing
2. **How to handle external webhooks?** API proxy vs direct endpoint
3. **What about DO worker?** Route through API or keep fetch?
4. **How to generate routing table?** Manual or automated?
5. **What about auth requirements?** How to determine per domain?
6. **How to handle method mapping?** Path → RPC method

## Next Steps

1. **Create routing table generator** - Top priority
2. **Generate complete domain-routes.json** - From .domains.tsv
3. **Document gateway worker purpose** - Understand before changing
4. **Create fetch-to-RPC conversion guide** - For all services
5. **Start with db worker conversion** - Simplest example

---

**Status:** Planning Complete
**Next Action:** Create routing table generator
**ETA:** 4 weeks for full migration
**Risk:** Medium (well-defined plan, clear benefits)
