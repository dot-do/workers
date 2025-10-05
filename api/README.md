# api

# API Worker - Single HTTP Entry Point

The API worker is the **only** worker with public HTTP access in the entire system. All other workers are accessed exclusively via RPC (service bindings), making this the single gateway for all external traffic.

## Overview

The API worker implements a sophisticated multi-layer routing system that:
- Routes HTTP requests to appropriate microservices
- Validates authentication and authorization
- Enforces rate limiting
- Logs all requests and responses
- Manages domain-based routing with dynamic configuration
- Provides fallback waitlist functionality for unmatched domains

## Architecture

```
External Request → Cloudflare DNS → API Worker → Service Binding (RPC) → Target Worker
```

All workers have `workers.dev` disabled and no direct routes. Only the API worker handles HTTP traffic, ensuring:
- ✅ **Centralized Security** - Single authentication point
- ✅ **Unified Rate Limiting** - Consistent across all services
- ✅ **Complete Observability** - All requests logged in one place
- ✅ **Dynamic Routing** - No deployment needed for route changes
- ✅ **Flexible Scaling** - Route traffic to any service dynamically

## Key Features

### 1. Multi-Layer Routing

**Routing Priority (highest to lowest):**

1. **Special Domain Routing** - Hardcoded patterns for `*.apis.do` and `sites.do`
2. **Path-Based Routing** - Pattern matching on URL paths (e.g., `/api/db/*`)
3. **Domain-Based Routing** - JSON configuration in Workers Assets (1,273+ domains)
4. **Waitlist Fallback** - Any unmatched domain routes to waitlist service

**Special Domain Patterns:**

```ts
// *.apis.do subdomains → service routing
agents.apis.do → AGENT_SERVICE
db.apis.do → DB_SERVICE
fn.apis.do → FN_SERVICE
auth.apis.do → AUTH_SERVICE
gateway.apis.do → GATEWAY_SERVICE

// sites.do path/subdomain routing
sites.do/api.management → GATEWAY_SERVICE (with path metadata)
api.management.sites.do → GATEWAY_SERVICE (with subdomain metadata)
```

**Path-Based Routes:**

```ts
/api/db/* → DB_SERVICE (requires auth)
/api/auth/* → AUTH_SERVICE (public)
/api/agents/* → AGENTS_SERVICE (requires auth)
/api/workflows/* → WORKFLOWS_SERVICE (requires auth)
/mcp/* → MCP_SERVICE (public)
/health → Built-in health check
```

**Domain-Based Routes:**

Stored in `assets/domain-routes.json` with 1,273+ domain mappings:

```json
{
  "domain": "agent.do",
  "service": "agent",
  "binding": "AGENT_SERVICE",
  "requiresAuth": false,
  "requiresAdmin": false,
  "metadata": {
    "description": "AI agent service",
    "category": "Service"
  },
  "updatedAt": "2025-10-04T20:00:00.000Z"
}
```

### 2. Authentication & Authorization

The API worker supports three authentication methods:

1. **Bearer Token** - `Authorization: Bearer <token>`
2. **API Key** - `X-API-Key: <key>`
3. **Session Cookie** - `Cookie: session=<id>`

All authentication is validated through the `AUTH_SERVICE` via RPC.

**Auth Context:**

```ts
interface AuthContext {
  userId: string
  email: string
  isAdmin: boolean
  permissions: string[]
  sessionId?: string
  apiKey?: string
}
```

**Route Protection:**

- Routes can require authentication (`requiresAuth: true`)
- Routes can require admin access (`requiresAdmin: true`)
- Public routes are accessible without authentication
- Failed auth returns `401 Unauthorized` or `403 Forbidden`

### 3. Rate Limiting

Rate limits are enforced per user or IP address:

- **Authenticated Users** - Keyed by `user:{userId}`
- **Anonymous Users** - Keyed by `ip:{clientIp}`
- **Default Limit** - 100 requests per 60 seconds
- **Storage** - KV namespace for distributed rate limiting
- **Headers** - Returns `X-RateLimit-*` headers

Rate limit exceeded returns `429 Too Many Requests` with retry information.

### 4. Request Logging

All requests and responses are logged with:

- Request ID (ULID)
- Timestamp
- Method and URL
- Client IP and User Agent
- User ID (if authenticated)
- Response status and duration
- Async analytics logging via Queue Service

**Log Format:**

```json
{
  "type": "request",
  "requestId": "01HQRS9WXYZ...",
  "timestamp": "2025-10-04T20:00:00.000Z",
  "method": "POST",
  "url": "/api/db/query",
  "hostname": "api.do",
  "ip": "203.0.113.1",
  "userAgent": "Mozilla/5.0...",
  "userId": "user_123"
}
```

### 5. Dynamic Domain Routing

Domain routes are stored in Workers Assets and cached with a stale-while-revalidate (SWR) strategy:

- **Cache Duration** - 10 seconds (configurable)
- **Two-Level Cache** - In-memory + KV namespace
- **Automatic Refresh** - Stale cache served while fetching new data
- **Fallback** - Uses stale cache if Assets fetch fails
- **Wildcard Support** - `*.example.com` patterns supported

**Cache Invalidation:**

```ts
// Force refresh domain routes
await invalidateDomainRoutesCache(env)
```

### 6. Metrics & Headers

All responses include:

- `X-Request-Id` - Unique request identifier
- `X-Response-Time` - Duration in milliseconds
- `X-RateLimit-Limit` - Maximum requests per window
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset timestamp (ISO 8601)

## RPC Interface

The API worker does not export an RPC interface. It only provides HTTP endpoints and routes to other services via RPC.

## HTTP API

### `GET /health`

Health check endpoint (public, no auth required).

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-10-04T20:00:00.000Z",
  "service": "api"
}
```

### All Other Routes

Dynamically routed based on:

1. Special routing patterns (*.apis.do, sites.do)
2. Path-based rules (/api/service/*)
3. Domain-based configuration (domain-routes.json)
4. Waitlist fallback (unmatched domains)

## Configuration

### Adding Domains

**Method 1: Zone Routes (Cloudflare Dashboard)**

1. Go to Cloudflare Dashboard → Zone → DNS
2. Add CNAME record: `@ → api.drivly.workers.dev`
3. Go to Workers & Pages → api → Triggers → Routes
4. Add route: `yourdomain.com/*` (zone: yourdomain.com)

**Method 2: Custom Domains for SaaS**

1. Go to Cloudflare Dashboard → SSL/TLS → Custom Hostnames
2. Add custom hostname: `customer.yourdomain.com`
3. Point to: `api.drivly.workers.dev`
4. No wrangler.jsonc changes needed

**Method 3: DNS CNAME**

For domains already in your Cloudflare account:

1. Add CNAME record: `subdomain → api.drivly.workers.dev`
2. No additional configuration needed
3. API worker automatically routes based on domain-routes.json

### Adding Domain Routes

Update `assets/domain-routes.json`:

```json
{
  "domain": "newservice.do",
  "service": "newservice",
  "binding": "NEWSERVICE_SERVICE",
  "requiresAuth": false,
  "requiresAdmin": false,
  "metadata": {
    "description": "New service description",
    "category": "Service"
  },
  "updatedAt": "2025-10-04T20:00:00.000Z"
}
```

Changes are cached with SWR (10s refresh) - no deployment needed!

### Adding Service Bindings

To add a new service:

1. Deploy the service worker
2. Add binding to frontmatter (this file):
   ```yaml
   services:
     - binding: NEW_SERVICE
       service: new-service
   ```
3. Update routing logic (if needed) in `src/routing/paths.ts`
4. Rebuild: `pnpm build-mdx api.mdx`
5. Deploy: `npx wrangler deploy`

### Adding Path Routes

Edit the `PATH_ROUTES` array in implementation below to add new path-based routes.

## Development

```bash
# Local development (from workers/api/)
pnpm dev

# Build from .mdx
pnpm build-mdx api.mdx

# Deploy
npx wrangler deploy

# View logs
npx wrangler tail api --format pretty

# Check deployments
npx wrangler deployments list
```

## Testing Routes

```bash
# Test via workers.dev URL
curl -s https://api.drivly.workers.dev/health

# Test subdomain routing (*.apis.do)
curl -s https://agents.apis.do/health

# Test sites.do path routing
curl -s https://sites.do/api.management

# Test with authentication
curl -s https://api.do/api/db/query \
  -H "Authorization: Bearer $TOKEN"

# Test with API key
curl -s https://api.do/api/agents/list \
  -H "X-API-Key: $API_KEY"

# Test custom domain (after DNS setup)
curl -s https://yourdomain.com/health
```

## Implementation

The API worker is implemented with:

- **Hono** - Fast, lightweight HTTP router
- **Service Bindings** - RPC communication with all services
- **Workers Assets** - Domain routing configuration storage
- **KV Namespace** - Rate limiting and caching
- **Dispatch Namespaces** - Workers for Platforms support

### Type Definitions



### Utility Functions



### Authentication Middleware



### Rate Limiting Middleware



### Logging Middleware



### Domain Routing



### Path-Based Routing



### Main Worker Implementation



## Related Documentation

- **[workers/CLAUDE.md](../CLAUDE.md)** - Workers architecture overview
- **[Root CLAUDE.md](../../CLAUDE.md)** - Multi-repo structure
- **Assets:** `assets/domain-routes.json` - Domain mappings (1,273 domains)

## Architecture Benefits

✅ **Single Entry Point** - One worker handles all HTTP traffic
✅ **Flexible Routing** - DNS, zones, or custom domains
✅ **No Route Limits** - No wrangler.jsonc route limits (1,273+ domains supported)
✅ **Dynamic Configuration** - domain-routes.json updates without redeploy (10s SWR cache)
✅ **Custom Domains for SaaS** - Easy tenant-specific domains
✅ **Complete Observability** - All requests logged centrally
✅ **Unified Security** - Single authentication and rate limiting point
✅ **Independent Service Scaling** - Route traffic based on load
✅ **Zero Service Exposure** - No worker has public access except this one

## Production Deployment

**Current Deployment:** https://api.drivly.workers.dev

The API worker is deployed to Cloudflare Workers and handles all incoming HTTP traffic for the entire platform. It is the **only** worker with public routes enabled.

**Key Metrics:**
- **Services Connected:** 20+ microservices via RPC
- **Domains Supported:** 1,273+ via domain-routes.json
- **Rate Limiting:** 100 requests/minute per user/IP
- **Cache Duration:** 10 seconds (SWR for domain routes)
- **Dependencies:** KV (cache + rate limiting), Assets (domain config)

---

**Generated from:** api.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts api.mdx`
