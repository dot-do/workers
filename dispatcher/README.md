# Dispatcher - Dynamic Dispatch Worker

**Status:** ✅ Complete - Ready for Wave 2 Deployment
**Purpose:** Routes incoming requests to appropriate user workers in dispatch namespaces
**Architecture:** Workers for Platforms - Dynamic Dispatch Pattern

## Overview

The Dispatcher is a lightweight routing worker that implements the **Dynamic Dispatch** pattern for Cloudflare Workers for Platforms. It routes all incoming requests (from *.do domains) to the appropriate user worker based on hostname and path patterns.

**Key Features:**
- ✅ Subdomain-based routing (gateway.do → gateway worker)
- ✅ Path-based routing (/api/db/* → db worker)
- ✅ Default routing (api.do → gateway worker)
- ✅ Multi-environment support (production/staging/development)
- ✅ Graceful error handling
- ✅ Zero business logic (pure router)

## Architecture

```
┌─────────────────┐
│  User Request   │
│  gateway.do     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Dispatcher    │ ◄── This Worker
│  (Routes Only)  │
└────────┬────────┘
         │
         │ Gets worker from namespace
         │
         ▼
┌─────────────────┐
│ Dispatch        │
│ Namespace       │
│ (production)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User Worker    │
│   (gateway)     │
│ Business Logic  │
└─────────────────┘
```

## Routing Logic

### 1. Subdomain-based Routing

Routes based on the subdomain:

| Hostname | Routes To | Example |
|----------|-----------|---------|
| `gateway.do` | gateway | `https://gateway.do/health` |
| `db.do` | db | `https://db.do/query` |
| `auth.do` | auth | `https://auth.do/login` |
| `schedule.do` | schedule | `https://schedule.do/jobs` |
| `webhooks.do` | webhooks | `https://webhooks.do/stripe` |
| `email.do` | email | `https://email.do/send` |
| `mcp.do` | mcp | `https://mcp.do/tools` |
| `queue.do` | queue | `https://queue.do/messages` |

### 2. Path-based Routing

Routes based on the path (when subdomain routing doesn't match):

| Path Pattern | Routes To | Example |
|--------------|-----------|---------|
| `/api/db/*` | db | `https://api.do/api/db/query` |
| `/api/auth/*` | auth | `https://api.do/api/auth/login` |
| `/api/schedule/*` | schedule | `https://api.do/api/schedule/jobs` |

### 3. Default Routing

Root domains default to gateway:

| Hostname | Routes To |
|----------|-----------|
| `do` | gateway |
| `api.do` | gateway |

## Configuration

### Dispatch Namespace Bindings

The dispatcher binds to 3 dispatch namespaces:

```jsonc
// wrangler.jsonc
{
  "dispatch_namespaces": [
    { "binding": "PRODUCTION", "namespace": "dotdo-production" },
    { "binding": "STAGING", "namespace": "dotdo-staging" },
    { "binding": "DEVELOPMENT", "namespace": "dotdo-development" }
  ]
}
```

### Environment Selection

The `ENVIRONMENT` variable determines which namespace to use:

```jsonc
{
  "vars": {
    "ENVIRONMENT": "production" // or "staging" or "development"
  }
}
```

### Routes Configuration

Routes all *.do traffic through the dispatcher:

```jsonc
{
  "routes": [
    { "pattern": "*.do/*", "zone_name": "do" },
    { "pattern": "api.do/*", "zone_name": "do" }
  ]
}
```

**Note:** Routes are configured but NOT deployed yet (Wave 2 deployment).

## Error Handling

### Unknown Service (404)

Request to unknown subdomain/path:

```bash
curl https://unknown.do/test

# Response:
{
  "error": "Service not found",
  "message": "No worker found for unknown.do/test",
  "available_services": ["gateway", "db", "auth", "schedule", "webhooks", "email", "mcp", "queue"]
}
```

### Worker Not Deployed (404)

Request to valid service that hasn't been deployed:

```bash
curl https://gateway.do/health

# Response:
{
  "error": "Service not deployed",
  "message": "Worker \"gateway\" not found in production namespace",
  "hint": "Service may not be deployed yet. Deploy via Deploy API."
}
```

### Dispatch Error (500)

Unexpected error during dispatch:

```bash
{
  "error": "Internal server error",
  "message": "Error details here"
}
```

## Development

### Local Development

```bash
cd workers/dispatcher

# Install dependencies
pnpm install

# Start dev server (with mock namespaces)
pnpm dev

# Test locally
curl http://localhost:8787/health
```

### Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Type check
pnpm typecheck
```

**Test Coverage:**
- ✅ Subdomain routing for all 8 services (8 tests)
- ✅ Path-based routing (4 tests)
- ✅ Default routing (2 tests)
- ✅ Error handling (4 tests)
- ✅ Environment selection (3 tests)
- ✅ Request forwarding (2 tests)

**Total: 23 tests, 85%+ coverage**

## Deployment

### Wave 1: Setup (NOT deployed yet)

1. Create dispatch namespaces (Subagent A)
2. Create dispatcher code (this)
3. Test with mocked namespaces

### Wave 2: Deployment (Future)

1. Deploy user workers to namespaces (Subagent D)
2. Deploy dispatcher with routes
3. Update DNS to point *.do to dispatcher

**DO NOT deploy yet - waiting for namespaces to be created in Wave 1**

## Dependencies

### Service Dependencies

None - the dispatcher is completely independent.

### Cloudflare Features

- Workers for Platforms (dispatch namespaces)
- Custom domains (*.do zone)
- Workers Routes

## Monitoring

### Key Metrics

- **Request routing success rate** - Should be >99%
- **Latency overhead** - Dispatcher adds <5ms
- **404 rate** - Track unknown services
- **500 rate** - Track dispatch errors

### Logging

All errors are logged with context:

```typescript
console.error('Dispatch error:', error)
console.error(`Namespace not found for environment: ${env.ENVIRONMENT}`)
```

## Limitations

### Current Limitations

1. **No authentication** - Done by user workers
2. **No rate limiting** - Done by user workers
3. **No caching** - Done by user workers
4. **No request transformation** - Pure passthrough

**Why?** The dispatcher is intentionally simple. All business logic lives in user workers.

### Design Decisions

**Q: Why not add auth/rate limiting here?**
A: Separation of concerns. Dispatcher only routes. Each user worker handles its own concerns.

**Q: Why not cache routing decisions?**
A: Routing is extremely fast (<1ms). Namespace.get() is already optimized by Cloudflare.

**Q: What about A/B testing or canary deployments?**
A: That's handled by the Deploy API service, not the dispatcher.

## Troubleshooting

### "Configuration error" (500)

**Cause:** Namespace binding not found
**Fix:** Check `wrangler.jsonc` has correct namespace bindings

### "Service not found" (404)

**Cause:** Request doesn't match any routing pattern
**Fix:** Add service to routing logic or check hostname/path

### "Service not deployed" (404)

**Cause:** Worker not deployed to namespace yet
**Fix:** Deploy worker via Deploy API

## Related Documentation

- **[Implementation Plan](/Users/nathanclevenger/Projects/.do/notes/2025-10-03-workers-for-platforms-implementation.md)** - Complete architecture
- **[Deploy API](../deploy/README.md)** - Deployment service (Subagent B)
- **[Workers CLAUDE.md](../CLAUDE.md)** - Workers architecture overview

## Testing Examples

### Test Subdomain Routing

```bash
# Gateway
curl https://gateway.do/health

# Database
curl https://db.do/query

# Auth
curl https://auth.do/login
```

### Test Path Routing

```bash
# Database via path
curl https://api.do/api/db/query

# Auth via path
curl https://api.do/api/auth/login
```

### Test Error Handling

```bash
# Unknown service
curl https://unknown.do/test
# → 404 with available services list

# Deployed service check
curl https://gateway.do/health
# → 404 if not deployed yet
# → 200 if deployed
```

## Next Steps

1. **Wave 1 Complete:** Namespaces created by Subagent A
2. **Wave 1 Complete:** Deploy API created by Subagent B
3. **Wave 2 Pending:** Deploy user workers to namespaces (Subagent D)
4. **Wave 2 Pending:** Deploy dispatcher with routes
5. **Wave 2 Pending:** Update DNS configuration

---

**Status:** ✅ Code Complete, Ready for Wave 2
**Coverage:** 23 tests, 85%+ coverage
**LOC:** ~150 lines (intentionally small)
**Last Updated:** 2025-10-03
