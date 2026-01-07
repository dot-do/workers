# @dotdo/snippets

Cloudflare Snippets collection for free-tier optimization in the workers.do platform.

## What Are Snippets?

Cloudflare Snippets are lightweight JavaScript modules that run at the edge before your Worker or origin. Unlike Workers, Snippets:

- Have no billing cost on any plan
- Execute in milliseconds with minimal overhead
- Can be chained together in a cascade
- Cannot access bindings (D1, KV, R2, Durable Objects)

Snippets are ideal for tasks that need to run on every request without incurring Worker invocations: authentication checks, caching, routing, and analytics capture.

## Constraints

Snippets operate under strict resource limits:

| Constraint | Limit |
|------------|-------|
| CPU time | < 5ms |
| Compressed size | < 32KB |
| Bindings | None |
| Subrequests | 2 (Pro), 5 (Enterprise) |

These constraints mean Snippets cannot perform heavy computation or directly access storage. Any external data must be fetched via subrequest to a Worker endpoint.

## Available Snippets

### auth.ts

JWT verification via subrequest to the jose Worker.

```typescript
import { authSnippet } from '@dotdo/snippets/auth'
```

**Functionality:**
- Extracts JWT from the `auth` cookie
- Verifies token via subrequest to `jose.workers.do/verify`
- Injects user context into request headers for downstream consumers:
  - `x-user-id`: User's unique identifier
  - `x-user-email`: User's email address
  - `x-user-roles`: Comma-separated role list

**Subrequest cost:** 1 subrequest per authenticated request

### cache.ts

Edge caching with Cloudflare Cache API and analytics event capture.

```typescript
import { cacheSnippet } from '@dotdo/snippets/cache'
```

**Functionality:**
- Checks Cloudflare Cache API for cached responses
- Caches successful responses (2xx status codes)
- Captures analytics events on every request (including cache hits)
- Generates anonymous ID from request fingerprint
- Fires analytics via subrequest (fire-and-forget)

**Subrequest cost:** 1 subrequest per request (analytics), 1 subrequest on cache miss (origin fetch)

### router.ts

Dynamic routing to Static Assets based on hostname.

```typescript
import { routerSnippet } from '@dotdo/snippets/router'
```

**Functionality:**
- Maps hostname to site bundle: `my-site.workers.do` resolves to `sites/my-site.jsonl`
- Content negotiation via Accept header:
  - `text/html`: Returns rendered HTML
  - `text/markdown`: Returns raw MDX source
  - Default: Returns compiled JavaScript module
- Serves `/llms.txt` endpoint with full markdown content for LLM consumption

**Subrequest cost:** 1 subrequest per request (Static Assets fetch)

## Snippet Cascade

Snippets execute in sequence, each passing the request to the next:

```
Request
   |
   v
auth snippet -----> Verifies JWT via jose.workers.do
   |                Adds x-user-* headers
   v
cache snippet ----> Checks cache, captures analytics
   |                Sends event to analytics.workers.do
   v
origin -----------> Worker or Static Assets
```

The cascade order matters:

1. **auth** runs first to verify identity before any other processing
2. **cache** runs second to serve cached responses (avoiding origin load) while capturing analytics
3. **origin** handles the actual request logic

Total subrequest budget per request:
- Auth: 1 (JWT verification)
- Cache: 1-2 (analytics + optional origin fetch)
- Router: 1 (Static Assets)

On Pro tier (2 subrequests), you may need to choose between auth verification and other subrequests. On Enterprise (5 subrequests), the full cascade operates with headroom.

## Cookie Strategy

Three cookies serve distinct purposes:

| Cookie | Format | Purpose | Set By |
|--------|--------|---------|--------|
| `auth` | JWT | User authentication | Better Auth (server-side) |
| `settings` | sqid | Anonymous ID + user preferences | Cache snippet |
| `session` | sqid | Session tracking | Cache snippet |

### JWT (auth cookie)

Signed JSON Web Token containing:
- `sub`: User ID
- `email`: User email
- `roles`: Array of role strings

Verified via subrequest to the jose Worker. Invalid tokens result in unauthenticated requests (no error, just no user context).

### sqid (settings/session cookies)

Lightweight encoded identifiers generated from request characteristics:
- ASN (Autonomous System Number)
- Cloudflare colo (data center code)
- ISO country code
- Accept-Language header prefix

sqid provides consistent anonymous identification without storing PII. The same user from the same network location generates the same anonymous ID across requests.

## Analytics Event Shape

Every request (including cache hits) generates an analytics event:

```typescript
interface AnalyticsEvent {
  timestamp: number      // Unix timestamp (ms)
  hostname: string       // Request hostname
  path: string           // URL pathname
  method: string         // HTTP method
  status: number         // Response status code
  cache: 'HIT' | 'MISS'  // Cache status
  colo: string           // Cloudflare data center
  country: string        // ISO country code
  userId?: string        // From auth (if authenticated)
  anonymousId: string    // sqid-generated ID
}
```

Events flow through the analytics pipeline:

```
Cache snippet
     |
     v
HTTP POST to analytics.workers.do/events
     |
     v
Cloudflare Pipelines
     |
     v
Cloudflare Streams
     |
     v
R2 Data Catalog (Iceberg format)
     |
     v
Queryable via R2 SQL
```

The fire-and-forget pattern ensures analytics capture does not block response delivery.

## Free-Tier Multi-Tenancy

Snippets enable hosting 100k+ sites from a single deployment:

```
Request (my-docs.workers.do)
     |
     v
auth snippet (verify user)
     |
     v
cache snippet (cache + analytics)
     |
     v
router snippet (hostname -> Static Assets)
     |
     v
Static Assets (sites/my-docs.jsonl)
     |
     v
Response { module, mdx, html }
```

Site bundles are stored as JSONL files in Static Assets:
- Maximum 100,000 files
- Up to 25MB per file
- No additional billing beyond base Worker

## Usage

Install the package:

```bash
npm install @dotdo/snippets
```

Configure snippets in Cloudflare dashboard or via API. Each snippet exports a default fetch handler:

```typescript
// Snippet configuration
export default { fetch: authSnippet }
```

Or use the umbrella package:

```typescript
import { authSnippet } from 'workers.do/snippets/auth'
import { cacheSnippet } from 'workers.do/snippets/cache'
import { routerSnippet } from 'workers.do/snippets/router'
```

## Design Principles

1. **Minimal footprint** - Every byte and millisecond counts under snippet constraints
2. **Graceful degradation** - Auth failures result in unauthenticated requests, not errors
3. **Fire-and-forget analytics** - Never block responses for telemetry
4. **Stateless by design** - All state accessed via subrequests to Workers with bindings

## License

MIT
