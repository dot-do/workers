# workers.do

> The complete platform for building, deploying, and scaling Cloudflare Workers

workers.do is the umbrella package that re-exports all components of the workers.do ecosystem. It provides tree-shakable imports for middleware, authentication, RPC, snippets, and routing - allowing you to pay only for what you use.

## Installation

```bash
npm install workers.do
# or
pnpm add workers.do
# or
yarn add workers.do
```

## Tree-Shakable Imports

Import only what you need. Each subpath maps to a dedicated package:

```typescript
// Umbrella - re-exports dotdo
import { DO } from 'workers.do'

// Middleware collection
import { cors, cache, rateLimit } from 'workers.do/middleware'

// Authentication (Better Auth integration)
import { Auth, apiKey, mcp, organization } from 'workers.do/auth'

// Universal RPC wrapper
import { RPC } from 'workers.do/rpc'

// Cloudflare Snippets utilities
import { authSnippet, cacheSnippet, routerSnippet } from 'workers.do/snippets'

// Routing
import { Router } from 'workers.do/router'
```

### Import Mapping

| Import Path | Package | Description |
|-------------|---------|-------------|
| `workers.do` | `dotdo` | Base Durable Object with Drizzle + Better Auth |
| `workers.do/middleware` | `@dotdo/middleware` | Hono middleware collection |
| `workers.do/auth` | `@dotdo/auth` | Better Auth plugins |
| `workers.do/rpc` | `@dotdo/rpc` | Universal RPC wrapper |
| `workers.do/snippets` | `@dotdo/snippets` | Free-tier Cloudflare Snippets |
| `workers.do/router` | Built-in | Dynamic routing utilities |

## Quick Start

### Basic Durable Object

```typescript
import { DO } from 'workers.do'

export class MyDO extends DO {
  users = {
    list: () => this.db.query('SELECT * FROM users'),
    get: (id: string) => this.db.query('SELECT * FROM users WHERE id = ?', [id]),
    create: (data: User) => this.db.insert('users', data)
  }
}

export default {
  fetch(request, env) {
    const id = env.MY_DO.idFromName('main')
    const stub = env.MY_DO.get(id)
    return stub.fetch(request)
  }
}
```

### With Middleware

```typescript
import { Hono } from 'hono'
import { cors, cache, rateLimit } from 'workers.do/middleware'
import { Auth } from 'workers.do/auth'

const app = new Hono()

app.use('*', cors())
app.use('*', rateLimit({ limit: 100, window: 60 }))
app.use('/api/*', cache({ ttl: 300 }))
app.use('/protected/*', Auth.middleware())

app.get('/api/users', (c) => c.json({ users: [] }))

export default app
```

## MDX-as-Worker

Define workers in MDX files that serve as code, documentation, and configuration simultaneously:

```mdx
---
name: my-api
compatibility_date: "2024-01-01"
d1_databases:
  - binding: DB
    database_name: users
kv_namespaces:
  - binding: CACHE
    id: abc123
dependencies:
  hono: ^4.0.0
  zod: ^3.0.0
---

# My API Worker

This worker handles user management with full CRUD operations.

## Endpoints

- `GET /users` - List all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create new user

import { Hono } from 'hono'
import { z } from 'zod'

const app = new Hono()

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email()
})

app.get('/users', async (c) => {
  const users = await c.env.DB.prepare('SELECT * FROM users').all()
  return c.json(users)
})

app.post('/users', async (c) => {
  const body = await c.req.json()
  const user = UserSchema.parse(body)
  await c.env.DB.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
    .bind(user.name, user.email)
    .run()
  return c.json({ success: true })
})

export default app
```

Build with `workers.do build`:

1. Parses frontmatter to generate `wrangler.json`
2. Extracts `dependencies` to update `package.json`
3. Compiles TypeScript to `dist/my-api.js`
4. Optionally generates documentation from prose

## Multi-Transport RPC

Every API defined with workers.do automatically exposes multiple transport protocols:

### Wrapping Any npm Package

```typescript
// workers/jose/index.ts
import * as jose from 'jose'
import { RPC } from 'workers.do/rpc'

export default RPC(jose)

// workers/stripe/index.ts
import Stripe from 'stripe'
import { env } from 'cloudflare:workers'
import { RPC } from 'workers.do/rpc'

export default RPC(new Stripe(env.STRIPE_SECRET_KEY))
```

### Available Transports

```typescript
// REST API
GET /api/verify?token=xyz
POST /api/customers/create { "email": "user@example.com" }

// Workers RPC (Service Bindings)
await env.JOSE.verify(token)
await env.STRIPE.customers.create({ email: 'user@example.com' })

// CapnWeb (WebSocket RPC)
ws.send(JSON.stringify({ method: 'verify', params: [token] }))

// MCP JSON-RPC (AI tool integration)
{ "jsonrpc": "2.0", "method": "verify", "params": { "token": "..." }, "id": 1 }

// HATEOAS (Explorable API)
GET / -> { links: { verify: '/verify', ... }, actions: {...}, data: {...} }
```

### Binding Conventions

When using RPC mode, dependencies are accessed via conventional binding names:

```typescript
this.env.JOSE        // JWT operations
this.env.ESBUILD     // Build/transform
this.env.MDX         // MDX compilation
this.env.STRIPE      // Stripe operations
this.env.WORKOS      // WorkOS/OAuth
this.env.CLOUDFLARE  // Cloudflare API
```

## AI Agent Integration

Every workers.do instance includes an AI agent. Ask it anything via any transport:

```typescript
// REST API
POST /do { "prompt": "Create a user named Alice with admin privileges" }

// CLI
workers.do ask "Generate a report of all sales from last month"

// MCP (AI-to-AI)
{ "method": "do", "params": { "prompt": "Analyze user engagement" } }

// Workers RPC
await env.MY_DO.do("Migrate the database schema to v2")

// SDK
const result = await worker.do("Build me a landing page for this product")
```

## CLI Usage

```bash
# Authentication
workers.do login              # OAuth via WorkOS
workers.do logout

# Development
workers.do dev                # Local development server
workers.do build              # Build MDX to wrangler.json + dist/

# Deployment
workers.do deploy             # Deploy to workers.do platform
workers.do logs               # Tail production logs

# Project Management
workers.do init [name]        # Scaffold new project
workers.do domains add        # Custom domain setup
workers.do secrets set        # Manage secrets
workers.do env list           # Environment management

# Multi-Tenant Sites
workers.do sites list         # List all hosted sites
workers.do sites create       # Create new site
workers.do sites delete       # Remove a site

# Analytics
workers.do analytics query    # R2 SQL analytics queries

# Administration
workers.do users list         # User management
workers.do apikeys create     # API key management
```

## Related Packages

| Package | npm | Description |
|---------|-----|-------------|
| [dotdo](../objects/do) | `dotdo` | Base Durable Object with Drizzle + Better Auth |
| [@dotdo/middleware](../middleware) | `@dotdo/middleware` | Hono middleware collection (cors, cache, rate-limit, auth) |
| [@dotdo/auth](../auth) | `@dotdo/auth` | Better Auth integration with all plugins |
| [@dotdo/rpc](../packages/rpc) | `@dotdo/rpc` | Universal RPC wrapper for npm packages |
| [@dotdo/snippets](../snippets) | `@dotdo/snippets` | Cloudflare Snippets utilities (free tier) |
| [@dotdo/edge-api](../packages/edge-api) | `@dotdo/edge-api` | HATEOAS API framework |

## Free-Tier Multi-Tenancy

Host 100k+ sites from a single deployment using Cloudflare's free offerings:

- **Snippets** - Free-tier workers (<5ms CPU, <32KB)
- **Static Assets** - 100k files, 25MB each
- **Smart Routing** - Hostname to site bundle mapping

```
Request (my-docs.workers.do)
    |
    v
cache snippet (analytics + routing)
    |
    v
Static Assets (sites/my-docs.jsonl)
    |
    v
{ module: "...", mdx: "...", html: "..." }
```

## Architecture

```
workers.do/
  workers/workers/     # This package (umbrella)
  workers/jose/        # JWT operations as RPC
  workers/stripe/      # Stripe SDK as RPC
  workers/cloudflare/  # Cloudflare API as RPC
  workers/esbuild/     # esbuild-wasm as RPC
  workers/mdx/         # MDX compiler as RPC

  objects/do/          # dotdo - Base DO class

  middleware/          # @dotdo/middleware
    cors/
    auth/
    cache/
    rate-limit/

  auth/                # @dotdo/auth
    core/
    api-key/
    mcp/
    organization/
    admin/
    oauth-proxy/

  snippets/            # @dotdo/snippets
    cache.ts
    auth.ts
    router.ts

  packages/
    rpc/               # @dotdo/rpc
    edge-api/          # @dotdo/edge-api
```

## Design Principles

1. **Objects over frameworks** - Return data, not responses
2. **Convention over configuration** - Sensible defaults, zero boilerplate
3. **Tree-shakable everything** - Pay only for what you use
4. **Free tier first** - Maximize Cloudflare's free offerings
5. **Multi-transport by default** - REST, RPC, WebSocket, MCP from one definition

## Documentation

- [Architecture](../../ARCHITECTURE.md) - Technical deep-dive
- [CLAUDE.md](../../CLAUDE.md) - AI assistant guidance
- [Main README](../../README.md) - Project overview

## License

MIT
