# RPC Worker - CapnWeb RPC Server with OAuth

JSON-RPC 2.0 compatible service for cross-worker communication with integrated OAuth authentication.

## Features

- **CapnWeb Protocol** - Efficient RPC communication pattern
- **OAuth Integration** - Seamless authentication via OAUTH_SERVICE
- **Service Bindings** - Direct RPC calls to auth, db, and other workers
- **JSON-RPC 2.0** - Standard protocol with batch support
- **Type Safety** - Zod validation for all RPC methods
- **Session Management** - KV-backed session storage

## Endpoints

### HTTP API

```
GET  /api/health         - Health check (protocol-router built-in)
GET  /api/capabilities   - List available protocols (protocol-router built-in)
GET  /api/methods        - List available CapnWeb RPC methods (service-specific)
POST /rpc                - Execute RPC methods (JSON-RPC 2.0)
```

### RPC Methods

#### System Methods

```typescript
// Test connectivity (no auth)
rpc('system.ping') → { pong: true, timestamp: number }

// Get system info (no auth)
rpc('system.info') → { service, version, protocol, uptime }

// Get protocol capabilities (no auth) - NEW
rpc('capabilities') → { protocols: [...], serviceRoutes: [...], timestamp }

// List CapnWeb methods (no auth) - NEW
rpc('rpc.listMethods') → [{ name, description, requiresAuth }, ...]
```

#### Authentication Methods

```typescript
// Get current user (requires auth)
rpc('auth.whoami') → { userId, email, name, organizationId }
```

#### Database Methods

```typescript
// Get entity
rpc('db.get', { ns, id })

// List entities
rpc('db.list', { ns, limit?, offset? })

// Create/update entity
rpc('db.upsert', { ns, id, type, data, content? })

// Delete entity
rpc('db.delete', { ns, id })

// Search entities
rpc('db.search', { query, ns?, type?, limit? })

// Get relationships
rpc('db.relationships', { ns, id, type? })

// Create relationship
rpc('db.createRelationship', { fromNs, fromId, toNs, toId, type, properties? })

// Batch operations
rpc('db.batchGet', { entities: [{ ns, id }, ...] })
rpc('db.batchUpsert', { entities: [{ ns, id, type, data }, ...] })
```

## Usage

### HTTP (cURL)

```bash
# Health check
curl https://rpc.do/api/health

# Get protocol capabilities (REST)
curl https://rpc.do/api/capabilities

# Get CapnWeb methods (REST)
curl https://rpc.do/api/methods

# Get protocol capabilities (RPC)
curl https://rpc.do/rpc \
  -H "Content-Type: application/json" \
  -d '{"method":"capabilities","params":{},"id":"1"}'

# List CapnWeb methods (RPC)
curl https://rpc.do/rpc \
  -H "Content-Type: application/json" \
  -d '{"method":"rpc.listMethods","params":{},"id":"1"}'

# Ping (no auth)
curl https://rpc.do/rpc \
  -H "Content-Type: application/json" \
  -d '{"method":"system.ping","params":{},"id":"1"}'

# Get entity (with auth)
curl https://rpc.do/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"method":"db.get","params":{"ns":"test","id":"person-alice"},"id":"2"}'

# Batch requests
curl https://rpc.do/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '[
    {"method":"db.get","params":{"ns":"test","id":"person-alice"},"id":"1"},
    {"method":"db.get","params":{"ns":"test","id":"person-bob"},"id":"2"}
  ]'
```

### JavaScript SDK

```typescript
import { RpcClient } from '@dot-do/rpc-client'

const rpc = new RpcClient('https://rpc.do', { token: 'your-token' })

// Simple call
const user = await rpc.call('auth.whoami')

// With params
const entity = await rpc.call('db.get', { ns: 'test', id: 'person-alice' })

// Batch calls
const results = await rpc.batch([
  { method: 'db.get', params: { ns: 'test', id: 'person-alice' } },
  { method: 'db.get', params: { ns: 'test', id: 'person-bob' } },
])
```

### Service-to-Service (RPC Binding)

```typescript
// From another worker
const result = await env.RPC_SERVICE.execute(
  'db.get',
  { ns: 'test', id: 'person-alice' },
  authToken
)
```

## Authentication

### OAuth Token (Recommended)

```bash
curl https://rpc.do/rpc \
  -H "Authorization: Bearer $OAUTH_TOKEN" \
  -d '{"method":"auth.whoami"}'
```

### Session Cookie

```bash
curl https://rpc.do/rpc \
  -H "Cookie: sessionId=$SESSION_ID" \
  -d '{"method":"auth.whoami"}'
```

## Response Format

### Success

```json
{
  "result": { "data": "..." },
  "id": "request-id"
}
```

### Error

```json
{
  "error": {
    "code": -32601,
    "message": "Method not found",
    "data": {}
  },
  "id": "request-id"
}
```

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid Request | Invalid JSON-RPC structure |
| -32601 | Method not found | Method doesn't exist |
| -32602 | Invalid params | Parameter validation failed |
| -32603 | Internal error | Server error |
| -32000 | Authentication required | Missing or invalid token |

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Configuration

### Service Bindings

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
    { "binding": "SESSIONS", "id": "your-kv-namespace-id" }
  ]
}
```

## Adding New Methods

Register methods in `src/methods.ts`:

```typescript
registry.register({
  name: 'myMethod',
  description: 'My custom RPC method',
  requiresAuth: true,
  schema: z.object({
    param1: z.string(),
    param2: z.number(),
  }),
  handler: async (params, context) => {
    // Your logic here
    return { result: 'success' }
  },
})
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

## Architecture

```
RPC Worker
├── HTTP Interface (Hono)
│   ├── /health
│   ├── /capabilities
│   └── /rpc
├── CapnWeb Registry
│   ├── Method Registry
│   ├── Validation
│   └── Execution
├── Authentication
│   ├── OAuth Token Validation
│   └── Session Management (KV)
└── Service Bindings
    ├── OAUTH_SERVICE
    ├── AUTH_SERVICE
    └── DB_SERVICE
```

## Related Services

- **oauth** - OAuth provider integration (WorkOS)
- **auth** - Authentication and authorization
- **db** - Database service (PostgreSQL/Neon + ClickHouse)

## Security

- All sensitive methods require OAuth authentication
- Tokens validated via OAUTH_SERVICE
- Sessions stored in KV with TTL
- CORS configured for allowed origins
- Service bindings for secure inter-worker communication

## License

MIT
