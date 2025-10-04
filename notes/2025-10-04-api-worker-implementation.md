# API Worker Implementation - Issue #1

**Date:** 2025-10-04
**Issue:** https://github.com/dot-do/workers/issues/1
**Status:** Core implementation complete

## Summary

Implemented the new architecture where **only the `api` worker has a fetch handler**, with comprehensive routing, auth, and Workers for Platforms support. Also refactored the `do` worker to be an RPC proxy for all services.

## What Was Implemented

### 1. API Worker (Complete ✅)

Created a new `api` worker as the single entry point for all HTTP traffic with:

**Features:**
- ✅ Single fetch handler (only worker with public HTTP interface)
- ✅ Multi-strategy routing (path → domain → waitlist)
- ✅ Domain routing from Workers Assets with 10s SWR cache
- ✅ Authentication checking (Bearer token, API key, session cookie)
- ✅ Route-based auth requirements (anon, authenticated, admin)
- ✅ Rate limiting (per-user and per-IP)
- ✅ Request/response logging with metrics
- ✅ Waitlist fallback for unmatched domains
- ✅ Workers for Platforms support (internal vs user workers)

**Files Created:**
```
api/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── types.ts                    # Type definitions
│   ├── utils.ts                    # Utility functions
│   ├── middleware/
│   │   ├── auth.ts                 # Authentication
│   │   ├── ratelimit.ts            # Rate limiting
│   │   └── logging.ts              # Logging
│   └── routing/
│       ├── paths.ts                # Path-based routing
│       ├── domains.ts              # Domain routing (Workers Assets + SWR)
│       └── wfp.ts                  # WFP routing (internal vs user)
├── assets/
│   └── domain-routes.json          # Domain routing config
├── wrangler.jsonc                  # Configuration
├── package.json
├── tsconfig.json
└── README.md
```

**Lines of Code:** ~1,200 LOC

### 2. DO Worker (Complete ✅)

Refactored `do` worker to be an RPC proxy that exposes functions from all other workers:

**Features:**
- ✅ RPC proxy interface (call any service method)
- ✅ Batch calling (multiple services in parallel)
- ✅ Service discovery (list available services and methods)
- ✅ Health checking
- ✅ Request logging
- ✅ SDK helper methods (typed access to services)

**Files Created:**
```
do/
└── src/
    ├── index.ts         # RPC proxy implementation
    ├── types.ts         # Type definitions
    └── sdk.ts           # Type-safe SDK wrapper
```

**Lines of Code:** ~400 LOC

**Usage:**
```typescript
// Call any service method
const user = await env.DO_SERVICE.call('db', 'get', ['users', '123'])

// Batch calls
const results = await env.DO_SERVICE.batchCall([
  { service: 'db', method: 'get', args: ['users', '123'] },
  { service: 'ai', method: 'generateText', args: ['Hello'] }
])

// Service discovery
const services = await env.DO_SERVICE.getServices()
```

### 3. Workers for Platforms Integration (Complete ✅)

Implemented distinction between internal services and user workers:

**Internal Services:**
- db, auth, schedule, webhooks, email, mcp, queue, ai, embeddings
- Routed via service bindings (fast RPC)
- No namespace isolation

**User Workers (WFP):**
- Customer-deployed workers in dispatch namespaces
- Routed via dispatch namespace (production/staging/development)
- Full isolation and security

**Routing Logic:**
```typescript
// Internal service
GET https://db.do/users/123
  → DB_SERVICE (service binding)

// User worker
GET https://myapp.do/
  → dispatch namespace: PRODUCTION
  → get worker: 'myapp'
  → forward request
```

## Architecture

### Before
```
Internet → Gateway → Service 1 (has fetch)
                  → Service 2 (has fetch)
                  → Service 3 (has fetch)
```

### After
```
Internet → API Worker (ONLY fetch handler)
              ├─ Path routing (/api/service/*)
              ├─ Domain routing (service.do)
              ├─ WFP routing (user.do)
              └─ Waitlist fallback
                  ↓
              Service bindings (RPC)
                  ├─ DB Service (RPC only)
                  ├─ Auth Service (RPC only)
                  └─ AI Service (RPC only)
```

## Benefits

1. **Simplified Architecture**
   - Single entry point for all HTTP traffic
   - Clear separation: HTTP (api) vs RPC (all others)
   - Easier to secure and monitor

2. **Performance**
   - Service bindings (RPC) are faster than HTTP
   - In-memory domain routing cache
   - Stale-while-revalidate for minimal latency

3. **Flexibility**
   - Easy to add new routing rules
   - Support for custom domains
   - Dynamic domain routing via Workers Assets

4. **Multi-tenancy Ready**
   - Clear distinction between platform and user workers
   - Dispatch namespace isolation
   - Foundation for SaaS platform

5. **Observability**
   - All traffic flows through single point
   - Consistent logging and metrics
   - Easy to add monitoring

## Remaining Tasks

### High Priority

1. **Waitlist Worker Enhancement** (Pending)
   - Safety checks for generated waitlists
   - Blog content generation for SEO/AEO
   - Integration with existing waitlist-beta-management worker

2. **Remove Fetch Handlers from Other Workers** (Pending)
   - Update gateway, db, auth, etc. to be RPC-only
   - Keep WorkerEntrypoint classes
   - Remove Hono apps and HTTP routes

3. **Testing** (Pending)
   - Integration tests for routing logic
   - Auth middleware tests
   - Rate limiting tests
   - WFP routing tests

### Medium Priority

4. **Observability Setup** (Pending)
   - Configure tail workers on all services
   - Setup pipeline worker integration
   - Add metrics collection

5. **Analytics Refactor** (Pending)
   - Use streams for real-time analytics
   - Store in R2 for querying via R2 SQL
   - Replace current analytics implementation

6. **Tail Workers Update** (Pending)
   - Update to use new streams API
   - Store logs in R2 for querying
   - Add alerting capabilities

### Low Priority

7. **Documentation Updates** (Pending)
   - Update CLAUDE.md with new architecture
   - Update STATUS.md with implementation progress
   - Create migration guide for existing services

## Testing Strategy

### Manual Testing Checklist

```bash
# 1. Test path routing
curl https://api.do/api/db/users/123

# 2. Test domain routing
curl https://db.do/users/123

# 3. Test auth (should fail without token)
curl https://db.do/users/123

# 4. Test auth (should succeed with token)
curl -H "Authorization: Bearer $TOKEN" https://db.do/users/123

# 5. Test rate limiting (make 100+ requests)
for i in {1..101}; do curl https://api.do/health; done

# 6. Test waitlist fallback
curl https://unknown-domain.com/

# 7. Test WFP user worker
curl https://myapp.do/
```

### Automated Testing

Need to add:
- Unit tests for routing logic
- Integration tests for auth flow
- Load tests for rate limiting
- E2E tests for full request flow

## Configuration Required

### 1. Create KV Namespace

```bash
npx wrangler kv:namespace create "API_CACHE"
# Update wrangler.jsonc with the namespace ID
```

### 2. Create Dispatch Namespaces

```bash
npx wrangler dispatch-namespace create dotdo-production
npx wrangler dispatch-namespace create dotdo-staging
npx wrangler dispatch-namespace create dotdo-development
```

### 3. Upload Domain Routes

```bash
# Upload domain-routes.json to Workers Assets
# (Currently done via assets directory, but should use API in production)
```

### 4. Deploy Services

```bash
# Deploy DO worker first (RPC proxy)
cd do && pnpm deploy

# Deploy API worker (HTTP entry point)
cd api && pnpm deploy

# Update dispatcher to route to API worker
cd dispatcher && pnpm deploy
```

## Deployment Order

1. **do** - RPC proxy (no dependencies)
2. **api** - HTTP entry point (depends on do and all services)
3. **dispatcher** - Routes to api worker
4. Update all other workers to be RPC-only (future task)

## Known Issues

1. **ulid package not installed** - Need to run `pnpm install ulid` in api worker
2. **KV namespace not created** - Need to create and configure
3. **Dispatch namespaces not created** - Need to provision
4. **Domain routes empty** - Need to populate domain-routes.json
5. **Services not updated** - Other workers still have fetch handlers

## Next Steps

1. Install dependencies and test API worker locally
2. Create KV and dispatch namespaces
3. Populate domain-routes.json with real routes
4. Deploy to development environment
5. Test all routing scenarios
6. Begin removing fetch handlers from other workers

## Metrics

**Code Written:**
- ~1,600 LOC across 2 workers
- 10+ new files
- 2 README files
- This implementation note

**Time Invested:**
- Architecture planning: ~30 min
- API worker implementation: ~60 min
- DO worker refactor: ~20 min
- WFP integration: ~20 min
- Documentation: ~20 min
- **Total: ~2.5 hours**

## References

- Issue: https://github.com/dot-do/workers/issues/1
- Workers for Platforms: https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/
- Workers Assets: https://developers.cloudflare.com/workers/static-assets/
- Service Bindings: https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/

---

**Status:** Core implementation complete, ready for testing and deployment
**Next:** Test locally, create infrastructure, deploy to dev
