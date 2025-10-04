# API Worker - Single HTTP Entry Point

The **API Worker** is the ONLY worker in the system with a public fetch handler. It serves as the single entry point for all HTTP traffic and provides comprehensive routing, authentication, and request management.

## Architecture

```
Internet
  ↓
API Worker (ONLY public fetch handler)
  ├─ Domain routing (Workers Assets with SWR cache)
  ├─ Path routing (/api/service/*)
  ├─ Auth checking (anon vs authenticated)
  ├─ Rate limiting
  ├─ Request logging
  └─ Routes to:
      ├─ Internal services (via service bindings)
      ├─ User workers (via WFP dispatch namespaces)
      └─ Waitlist (for unmatched domains)
```

## Key Features

### 1. Single Fetch Handler
- **Only** the API worker has a public fetch handler
- All other workers expose RPC interfaces only
- Simplifies routing and security

### 2. Multi-Strategy Routing

**Priority order:**
1. **Path-based routing** (/api/service/*)
2. **Domain-based routing** (service.do, custom domains from Workers Assets)
3. **Waitlist fallback** (unmatched domains generate waitlist pages)

### 3. Domain Routing with SWR Cache

Domain routes are stored in **Workers Assets** as `domain-routes.json`:
- In-memory cache with **10-second expiration**
- KV cache for cross-instance sharing
- Stale-while-revalidate (SWR) strategy
- Updates propagate within 10 seconds

### 4. Authentication & Authorization

- Bearer tokens (JWT)
- API keys
- Session cookies
- Route-based requirements (anon, authenticated, admin)

### 5. Rate Limiting

- Per-user rate limiting (authenticated)
- Per-IP rate limiting (anonymous)
- Configurable limits per route
- Rate limit headers in responses

### 6. Workers for Platforms Support

Distinguishes between:
- **Internal services** (db, auth, ai, etc.) via service bindings
- **User workers** (customer-deployed) via dispatch namespaces

### 7. Request Logging & Analytics

- Structured JSON logs
- Request/response timing
- User tracking
- Async analytics via queue

## Routing Examples

### Path-based routing
```
GET /api/db/users/123
  → Routes to DB_SERVICE

GET /api/ai/generate
  → Routes to AI_SERVICE

GET /api/auth/login
  → Routes to AUTH_SERVICE
```

### Domain-based routing
```
GET https://db.do/users/123
  → Routes to DB_SERVICE (from domain-routes.json)

GET https://custom-domain.com/
  → Routes to configured service (from domain-routes.json)
```

### User worker routing (WFP)
```
GET https://myapp.do/
  → Routes to 'myapp' user worker in PRODUCTION namespace

GET https://staging-app.staging.do/
  → Routes to 'staging-app' user worker in STAGING namespace
```

### Waitlist fallback
```
GET https://unknown-domain.com/
  → Routes to WAITLIST_SERVICE
  → Generates waitlist page + blog for SEO
```

## Configuration

### Service Bindings

All internal services are configured as service bindings in `wrangler.jsonc`:

```jsonc
"services": [
  { "binding": "DB_SERVICE", "service": "db" },
  { "binding": "AUTH_SERVICE", "service": "auth" },
  { "binding": "AI_SERVICE", "service": "ai" }
  // ... etc
]
```

### Dispatch Namespaces (WFP)

User workers are accessed via dispatch namespaces:

```jsonc
"dispatch_namespaces": [
  { "binding": "PRODUCTION", "namespace": "dotdo-production" },
  { "binding": "STAGING", "namespace": "dotdo-staging" },
  { "binding": "DEVELOPMENT", "namespace": "dotdo-development" }
]
```

### Domain Routes (Workers Assets)

Create `assets/domain-routes.json`:

```json
[
  {
    "domain": "db.do",
    "service": "db",
    "binding": "DB_SERVICE",
    "requiresAuth": true,
    "requiresAdmin": false
  },
  {
    "domain": "*.myapp.do",
    "service": "myapp",
    "binding": "MYAPP_SERVICE",
    "requiresAuth": false
  }
]
```

## Development

```bash
# Install dependencies
pnpm install

# Run locally
pnpm dev

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## File Structure

```
api/
├── src/
│   ├── index.ts              # Main entry point + routing
│   ├── types.ts              # TypeScript types
│   ├── utils.ts              # Utility functions
│   ├── middleware/
│   │   ├── auth.ts           # Authentication logic
│   │   ├── ratelimit.ts      # Rate limiting
│   │   └── logging.ts        # Request/response logging
│   └── routing/
│       ├── paths.ts          # Path-based routes
│       ├── domains.ts        # Domain routes (Workers Assets)
│       └── wfp.ts            # WFP routing (internal vs user)
├── assets/
│   └── domain-routes.json    # Domain routing config
├── wrangler.jsonc            # Cloudflare Workers config
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

Set in `wrangler.jsonc` under `vars`:

```jsonc
"vars": {
  "ENVIRONMENT": "production"  // or "staging", "development"
}
```

## Related Services

- **DO Worker** - RPC proxy for calling services
- **Gateway** - Legacy routing (being replaced)
- **Dispatcher** - WFP namespace routing (complementary)

## Migration Notes

This worker replaces the pattern where every worker had its own fetch handler. Now:

**Before:**
- Each worker has: `export default { fetch }`
- Gateway routes to each worker via HTTP

**After:**
- Only API worker has: `export default { fetch }`
- All workers expose: `class Service extends WorkerEntrypoint`
- API routes to services via RPC (service bindings)

## See Also

- [DO Worker README](../do/README.md) - RPC proxy
- [Dispatcher README](../dispatcher/README.md) - WFP routing
- [CLAUDE.md](../CLAUDE.md) - Architecture overview
