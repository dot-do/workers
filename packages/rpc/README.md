# @dotdo/rpc

Universal RPC wrapper that exposes any npm package as a multi-transport Cloudflare Worker.

## Overview

`@dotdo/rpc` transforms any npm package into a deployable worker with automatic support for multiple communication protocols:

- **Workers RPC** - Service bindings for worker-to-worker communication
- **REST** - HTTP endpoints with `GET /api/method?arg=val`
- **CapnWeb** - WebSocket-based RPC protocol
- **MCP** - JSON-RPC 2.0 for AI tool integration

## Installation

```bash
npm install @dotdo/rpc
# or
pnpm add @dotdo/rpc
```

## Tree-Shakable Imports

Every package should have multiple entry points for different use cases:

| Entry Point | Description | Size |
|-------------|-------------|------|
| `@dotdo/rpc` | Full featured | ~12kB |
| `@dotdo/rpc/tiny` | Minimal, no dependencies | ~4kB |
| `@dotdo/rpc/worker` | Worker-specific usage | ~8kB |
| `@dotdo/rpc/client` | Client-side usage | ~6kB |

### Individual Imports

```typescript
// Full package
import { RPC } from '@dotdo/rpc'

// Minimal version
import { RPC } from '@dotdo/rpc/tiny'

// Worker-specific (uses service bindings)
import { RPC } from '@dotdo/rpc/worker'

// Client-side
import { RPC } from '@dotdo/rpc/client'
```

## Quick Start

Three lines to expose any package:

```typescript
import * as jose from 'jose'
import { RPC } from '@dotdo/rpc'

export default RPC(jose)
```

Deploy with Wrangler and access via any transport.

## Usage Patterns

### Namespace of Functions

Wrap modules that export functions directly:

```typescript
// workers/jose/index.ts
import * as jose from 'jose'
import { RPC } from '@dotdo/rpc'

export default RPC(jose)
```

Access methods:
```typescript
// Workers RPC
await env.JOSE.jwtVerify(token, publicKey)
await env.JOSE.SignJWT({ sub: 'user' }).sign(privateKey)

// REST
GET /api/jwtVerify?token=xyz&publicKey=abc

// MCP JSON-RPC
{ "jsonrpc": "2.0", "method": "jwtVerify", "params": ["token", "key"], "id": 1 }
```

### Instantiated SDK Clients

Wrap already-instantiated objects:

```typescript
// workers/stripe/index.ts
import Stripe from 'stripe'
import { env } from 'cloudflare:workers'
import { RPC } from '@dotdo/rpc'

export default RPC(new Stripe(env.STRIPE_SECRET_KEY))
```

Access methods:
```typescript
// Workers RPC
await env.STRIPE.customers.create({ email: 'alice@example.com' })
await env.STRIPE.subscriptions.list({ customer: 'cus_123' })

// REST
POST /api/customers/create { "email": "alice@example.com" }
GET /api/subscriptions/list?customer=cus_123

// MCP JSON-RPC
{ "jsonrpc": "2.0", "method": "customers.create", "params": { "email": "alice@example.com" }, "id": 1 }
```

### Classes that Need Instantiation

Wrap SDK constructors that require runtime configuration:

```typescript
// workers/cloudflare/index.ts
import Cloudflare from 'cloudflare'
import { env } from 'cloudflare:workers'
import { RPC } from '@dotdo/rpc'

export default RPC(new Cloudflare({ apiToken: env.CLOUDFLARE_API_TOKEN }))
```

Access methods:
```typescript
// Workers RPC
await env.CLOUDFLARE.zones.list()
await env.CLOUDFLARE.dns.records.create('zone_id', { type: 'A', name: 'www', content: '1.2.3.4' })

// REST
GET /api/zones/list
POST /api/dns/records/create?zone_id=xyz { "type": "A", "name": "www", "content": "1.2.3.4" }
```

## Transport Examples

### Workers RPC (Service Bindings)

Configure in `wrangler.toml`:

```toml
[[services]]
binding = "JOSE"
service = "jose-worker"

[[services]]
binding = "STRIPE"
service = "stripe-worker"
```

Use in your worker:

```typescript
export default {
  async fetch(request: Request, env: Env) {
    // Direct RPC calls - type-safe and fast
    const token = await env.JOSE.SignJWT({ sub: 'user123' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(env.JWT_SECRET)

    const customer = await env.STRIPE.customers.create({
      email: 'user@example.com',
      metadata: { userId: 'user123' }
    })

    return Response.json({ token, customerId: customer.id })
  }
}
```

### REST API

All methods are automatically exposed as HTTP endpoints:

```bash
# GET for read operations
curl https://jose.workers.do/api/jwtVerify?token=eyJ...

# POST for mutations
curl -X POST https://stripe.workers.do/api/customers/create \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com"}'

# Nested methods use dot or slash notation
curl https://cloudflare.workers.do/api/zones.list
curl https://cloudflare.workers.do/api/zones/list
```

### MCP JSON-RPC 2.0

For AI tool integration:

```json
{
  "jsonrpc": "2.0",
  "method": "customers.create",
  "params": {
    "email": "alice@example.com",
    "name": "Alice"
  },
  "id": "req-123"
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "id": "cus_abc123",
    "email": "alice@example.com",
    "name": "Alice"
  },
  "id": "req-123"
}
```

Batch requests are supported:

```json
[
  { "jsonrpc": "2.0", "method": "customers.list", "params": { "limit": 10 }, "id": 1 },
  { "jsonrpc": "2.0", "method": "products.list", "params": { "active": true }, "id": 2 }
]
```

### CapnWeb (WebSocket RPC)

For real-time bidirectional communication:

```typescript
const ws = new WebSocket('wss://stripe.workers.do/rpc')

ws.onopen = () => {
  ws.send(JSON.stringify({
    method: 'customers.create',
    params: { email: 'alice@example.com' },
    id: 1
  }))
}

ws.onmessage = (event) => {
  const response = JSON.parse(event.data)
  console.log('Customer created:', response.result)
}
```

## Real-World Examples

### JWT Worker

```typescript
// workers/jose/index.ts
import * as jose from 'jose'
import { RPC } from '@dotdo/rpc'

export default RPC(jose)
```

### Stripe Worker

```typescript
// workers/stripe/index.ts
import Stripe from 'stripe'
import { env } from 'cloudflare:workers'
import { RPC } from '@dotdo/rpc'

export default RPC(new Stripe(env.STRIPE_SECRET_KEY))
```

### Cloudflare API Worker

```typescript
// workers/cloudflare/index.ts
import Cloudflare from 'cloudflare'
import { env } from 'cloudflare:workers'
import { RPC } from '@dotdo/rpc'

export default RPC(new Cloudflare({ apiToken: env.CLOUDFLARE_API_TOKEN }))
```

### MDX Compiler Worker

```typescript
// workers/mdx/index.ts
import * as mdx from '@mdx-js/mdx'
import { RPC } from '@dotdo/rpc'

export default RPC(mdx)
```

### ESBuild Worker

```typescript
// workers/esbuild/index.ts
import * as esbuild from 'esbuild-wasm'
import { RPC } from '@dotdo/rpc'

export default RPC(esbuild)
```

## Binding Conventions

When using RPC workers as service bindings, follow these naming conventions:

| Binding | Service | Package |
|---------|---------|---------|
| `JOSE` | jose-worker | jose |
| `STRIPE` | stripe-worker | stripe |
| `CLOUDFLARE` | cloudflare-worker | cloudflare |
| `ESBUILD` | esbuild-worker | esbuild-wasm |
| `MDX` | mdx-worker | @mdx-js/mdx |
| `ORG` | workos-worker | @workos-inc/node |

## Configuration

### wrangler.toml

```toml
name = "jose-worker"
main = "index.ts"
compatibility_date = "2024-01-01"

[vars]
DEBUG = "false"

# For workers requiring secrets
# [secrets]
# STRIPE_SECRET_KEY
# CLOUDFLARE_API_TOKEN
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DEBUG` | Enable debug logging |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `MAX_BODY_SIZE` | Maximum request body size (bytes) |
| `REQUEST_TIMEOUT` | Request timeout (milliseconds) |

## Architecture

`@dotdo/rpc` is part of the workers.do ecosystem. It transforms any npm package into a worker that:

1. Exposes all public methods via multiple transports
2. Handles serialization/deserialization automatically
3. Provides consistent error handling across protocols
4. Supports both synchronous and async methods
5. Preserves method chaining (e.g., `SignJWT().setProtectedHeader().sign()`)

## Related Packages

| Package | Description |
|---------|-------------|
| `workers.do` | Umbrella package with tree-shakable imports |
| `dotdo` | Base Durable Object class |
| `@dotdo/edge-api` | HATEOAS API framework |
| `@dotdo/middleware` | Hono middleware collection |

## License

MIT
