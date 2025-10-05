# CLAUDE.md - RPC Worker (CapnWeb)

## Overview

The **RPC Worker** is a JSON-RPC 2.0 compatible service that provides efficient cross-worker communication with integrated OAuth authentication. It implements a CapnWeb-inspired RPC protocol for Cloudflare Workers.

## Purpose

- **Cross-Service Communication** - Unified RPC interface for all services
- **OAuth Authentication** - Integrated token validation via OAUTH_SERVICE
- **Type Safety** - Zod validation for all RPC methods
- **Protocol Agnostic** - JSON-RPC 2.0 standard for interoperability
- **Session Management** - KV-backed session storage with TTL

## Architecture

```
RPC Worker (rpc.apis.do)
├── HTTP Interface (Hono)
│   ├── GET  /health        - Health check
│   ├── GET  /capabilities  - List methods
│   └── POST /rpc           - Execute RPC
├── CapnWeb Registry
│   ├── Method Registration
│   ├── Validation (Zod)
│   └── Execution Engine
├── Authentication
│   ├── OAuth Token Validation (OAUTH_SERVICE)
│   └── Session Management (KV)
└── Service Bindings
    ├── OAUTH_SERVICE (oauth)
    ├── AUTH_SERVICE (auth)
    └── DB_SERVICE (db)
```

## Key Features

### 1. JSON-RPC 2.0 Protocol

Standard JSON-RPC 2.0 implementation with:
- Single and batch requests
- Standardized error codes
- Request/response correlation via ID

### 2. OAuth Integration

Seamless authentication flow:
```typescript
// Token validation via OAUTH_SERVICE
const tokenInfo = await env.OAUTH_SERVICE.validateToken(token)

// Session creation with TTL
const sessionId = await createSession(tokenInfo, env.SESSIONS)
```

### 3. Method Registry

Type-safe method registration:
```typescript
registry.register({
  name: 'db.get',
  description: 'Get entity by namespace and ID',
  requiresAuth: true,
  schema: z.object({
    ns: z.string(),
    id: z.string(),
  }),
  handler: async (params, context) => {
    return await context.env.DB_SERVICE.get(params.ns, params.id)
  },
})
```

### 4. Service Proxy Pattern

RPC methods proxy to other services:
- Database operations → DB_SERVICE
- Authentication → AUTH_SERVICE
- OAuth validation → OAUTH_SERVICE

## File Structure

```
workers/rpc/
├── src/
│   ├── index.ts          # Main entrypoint + HTTP routes
│   ├── types.ts          # TypeScript interfaces
│   ├── capnweb.ts        # RPC registry and execution
│   ├── auth.ts           # OAuth authentication
│   └── methods.ts        # RPC method definitions
├── tests/
│   ├── index.test.ts     # Service tests
│   ├── auth.test.ts      # Authentication tests
│   └── capnweb.test.ts   # Registry tests
├── examples/
│   └── client.ts         # Client SDK example
├── wrangler.jsonc        # Cloudflare Workers config
├── package.json
├── tsconfig.json
└── README.md
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Watch tests
pnpm test:watch

# Type check
pnpm typecheck

# Build
pnpm build

# Deploy
pnpm deploy
```

## RPC Methods

### System Methods (No Auth)

```typescript
system.ping()           // Test connectivity
→ { pong: true, timestamp: number }

system.info()           // Get system info
→ { service, version, protocol, uptime }
```

### Authentication Methods (Requires Auth)

```typescript
auth.whoami()           // Get current user
→ { userId, email, name, organizationId }
```

### Database Methods (Requires Auth)

```typescript
db.get({ ns, id })
db.list({ ns, limit?, offset? })
db.upsert({ ns, id, type, data, content? })
db.delete({ ns, id })
db.search({ query, ns?, type?, limit? })
db.relationships({ ns, id, type? })
db.createRelationship({ fromNs, fromId, toNs, toId, type, properties? })
db.batchGet({ entities: [{ ns, id }, ...] })
db.batchUpsert({ entities: [{ ns, id, type, data }, ...] })
```

## Usage Examples

### cURL

```bash
# Ping (no auth)
curl https://rpc.apis.do/rpc \
  -H "Content-Type: application/json" \
  -d '{"method":"system.ping","params":{},"id":"1"}'

# Get entity (with auth)
curl https://rpc.apis.do/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"method":"db.get","params":{"ns":"test","id":"person-alice"},"id":"2"}'

# Batch requests
curl https://rpc.apis.do/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '[
    {"method":"db.get","params":{"ns":"test","id":"person-alice"},"id":"1"},
    {"method":"db.get","params":{"ns":"test","id":"person-bob"},"id":"2"}
  ]'
```

### JavaScript/TypeScript

```typescript
import { RpcClient } from './examples/client'

const rpc = new RpcClient({
  baseUrl: 'https://rpc.apis.do',
  token: 'your-oauth-token',
})

// Single call
const user = await rpc.call('auth.whoami')

// With params
const entity = await rpc.call('db.get', { ns: 'test', id: 'person-alice' })

// Batch calls
const results = await rpc.batch([
  { method: 'db.get', params: { ns: 'test', id: 'person-alice' } },
  { method: 'db.get', params: { ns: 'test', id: 'person-bob' } },
])
```

### Service-to-Service RPC

```typescript
// From another worker with RPC_SERVICE binding
const result = await env.RPC_SERVICE.execute(
  'db.get',
  { ns: 'test', id: 'person-alice' },
  authToken
)
```

## Authentication

### OAuth Token (Recommended)

```bash
curl https://rpc.apis.do/rpc \
  -H "Authorization: Bearer $OAUTH_TOKEN" \
  -d '{"method":"auth.whoami"}'
```

### Session Cookie

```bash
curl https://rpc.apis.do/rpc \
  -H "Cookie: sessionId=$SESSION_ID" \
  -d '{"method":"auth.whoami"}'
```

## Error Handling

### Standard Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid Request | Invalid JSON-RPC structure |
| -32601 | Method not found | Method doesn't exist |
| -32602 | Invalid params | Parameter validation failed |
| -32603 | Internal error | Server error |
| -32000 | Authentication required | Missing or invalid token |

### Error Response Format

```json
{
  "error": {
    "code": -32601,
    "message": "Method not found: invalid.method",
    "data": {}
  },
  "id": "request-id"
}
```

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test -- --coverage
```

### Test Coverage

- **src/index.ts** - Service entrypoint and HTTP routes
- **src/auth.ts** - OAuth authentication and sessions
- **src/capnweb.ts** - RPC registry and execution
- **src/methods.ts** - Method handlers

## Configuration

### Environment Variables

None required (uses service bindings).

### Service Bindings (wrangler.jsonc)

```jsonc
{
  "services": [
    { "binding": "OAUTH_SERVICE", "service": "oauth" },
    { "binding": "AUTH_SERVICE", "service": "auth" },
    { "binding": "DB_SERVICE", "service": "db" }
  ]
}
```

### KV Namespace

```jsonc
{
  "kv_namespaces": [
    { "binding": "SESSIONS", "id": "placeholder_kv_namespace_id" }
  ]
}
```

## Adding New RPC Methods

1. **Register in src/methods.ts**:

```typescript
registry.register({
  name: 'myService.myMethod',
  description: 'Description of what it does',
  requiresAuth: true,  // or false
  schema: z.object({   // optional validation
    param1: z.string(),
    param2: z.number(),
  }),
  handler: async (params, context) => {
    // Implementation here
    return { result: 'success' }
  },
})
```

2. **Document in README.md** under RPC Methods section

3. **Add tests** in `tests/index.test.ts` or create new test file

4. **Update examples** in `examples/client.ts` if relevant

## Deployment

### Current Status

- ✅ Code complete
- ✅ Tests passing
- ⏳ Awaiting deployment to rpc.do
- 🔧 Currently accessible on rpc.apis.do (temporary)

### Deploy Steps

1. **Create KV namespace**:
```bash
npx wrangler kv:namespace create SESSIONS
# Update wrangler.jsonc with namespace ID
```

2. **Deploy worker**:
```bash
pnpm deploy
```

3. **Test deployment**:
```bash
curl https://rpc.apis.do/health
curl https://rpc.apis.do/capabilities
```

4. **Configure rpc.do domain** (when zone available):
   - Add 'do' zone to Cloudflare account
   - Uncomment `{ "pattern": "rpc.do/*", "zone_name": "do" }` in wrangler.jsonc
   - Redeploy

## Integration with Other Services

### oauth (OAUTH_SERVICE)

```typescript
// Validates OAuth tokens
const tokenInfo = await env.OAUTH_SERVICE.validateToken(token)
```

### auth (AUTH_SERVICE)

```typescript
// User authentication and authorization
const user = await env.AUTH_SERVICE.getUser(userId)
```

### db (DB_SERVICE)

```typescript
// Database operations (PostgreSQL/Neon + ClickHouse)
const entity = await env.DB_SERVICE.get(ns, id)
const result = await env.DB_SERVICE.upsert({ ns, id, type, data })
```

## Security

- **OAuth Token Validation** - All protected methods require valid token
- **Session Management** - KV-backed with automatic TTL expiration
- **CORS Configuration** - Restricted to allowed origins
- **Service Bindings** - Secure inter-worker communication
- **No Direct Database Access** - All database operations via DB_SERVICE

## Performance

- **Smart Placement** - Edge locations for low latency
- **KV Session Storage** - Fast session lookups
- **Service Bindings** - Zero-latency RPC between workers
- **Batch Support** - Multiple operations in single request

## Related Documentation

- **[workers/CLAUDE.md](../CLAUDE.md)** - Workers repository overview
- **[oauth/CLAUDE.md](../oauth/CLAUDE.md)** - OAuth service
- **[auth/CLAUDE.md](../auth/CLAUDE.md)** - Auth service
- **[db/CLAUDE.md](../db/CLAUDE.md)** - Database service

## Future Enhancements

- [ ] Cap'n Proto binary protocol support (true CapnWeb)
- [ ] WebSocket support for streaming RPC
- [ ] RPC method permissions and RBAC
- [ ] Rate limiting per method
- [ ] Request/response caching
- [ ] Metrics and observability
- [ ] OpenAPI/Swagger documentation generation
- [ ] GraphQL gateway

## Notes

- Currently deployed on **rpc.apis.do** (temporary)
- Target deployment: **rpc.do** (requires 'do' zone)
- All tests passing
- Ready for production use

---

**Last Updated:** 2025-10-04
**Status:** ✅ Complete - Ready for Deployment
**Deployed:** https://rpc.apis.do (temporary)
**Target:** https://rpc.do (pending zone configuration)
