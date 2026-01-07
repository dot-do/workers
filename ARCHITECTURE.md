# workers.do Architecture

## Overview

workers.do is a monorepo providing a complete platform for building on Cloudflare Workers. The architecture is designed around several key principles:

1. **Multi-transport RPC** - Every API automatically exposes REST, Workers RPC, CapnWeb, MCP, and HATEOAS interfaces
2. **Tree-shakable composition** - Pay only for what you use, from tiny to full-featured
3. **Free-tier optimization** - Maximize Cloudflare's free offerings with Snippets and Static Assets
4. **MDX-as-Worker** - Workers defined in MDX files that serve as code, docs, and config

## Repository Structure

```
workers.do/
├── apps/                  # Full applications (Vite + React Router + shadcn)
│   ├── admin/             # Platform admin UI
│   ├── dashboard/         # Analytics & monitoring
│   ├── app/               # User-facing application
│   └── docs/              # Fumadocs documentation
│
├── workers/               # Cloudflare Workers (deployable units)
│   ├── workers/           # workers.do umbrella worker
│   ├── cloudflare/        # Cloudflare SDK as RPC
│   ├── jose/              # JWT operations as RPC
│   ├── stripe/            # Stripe SDK as RPC
│   ├── workos/            # WorkOS SDK as RPC
│   ├── esbuild/           # esbuild-wasm as RPC
│   └── mdx/               # MDX compiler as RPC
│
├── middleware/            # Hono middleware (@dotdo/middleware)
│   ├── cors/
│   ├── auth/
│   ├── cache/
│   └── rate-limit/
│
├── objects/               # Durable Objects
│   └── do/                # Base DO class (npm: dotdo)
│
├── snippets/              # Cloudflare Snippets (free tier)
│   ├── cache/             # Caching + analytics
│   ├── auth/              # JWT verification
│   └── router/            # Dynamic routing
│
├── packages/              # npm packages
│   ├── edge-api/          # HATEOAS framework
│   └── rpc/               # Universal RPC wrapper
│
├── primitives/            # TypeScript interfaces (git submodule)
│
├── auth/                  # Better Auth integration
│   ├── core/
│   ├── api-key/
│   ├── mcp/
│   ├── organization/
│   ├── admin/
│   └── oauth-proxy/
│
└── plugins/               # Extensibility plugins
```

## Package Naming Convention

| Folder | npm Package | Import Path |
|--------|-------------|-------------|
| `workers/workers/` | `workers.do` | `workers.do`, `workers.do/middleware`, etc. |
| `objects/do/` | `dotdo` | `dotdo`, `dotdo/tiny`, `dotdo/rpc` |
| `middleware/*` | `@dotdo/middleware` | `@dotdo/middleware`, `workers.do/middleware` |
| `auth/*` | `@dotdo/auth` | `@dotdo/auth`, `workers.do/auth` |
| `snippets/*` | `@dotdo/snippets` | `@dotdo/snippets` |
| `packages/edge-api/` | `@dotdo/edge-api` | `@dotdo/edge-api` |
| `packages/rpc/` | `@dotdo/rpc` | `@dotdo/rpc` |

## Core Components

### 1. dotdo - The Base Durable Object

The foundation of the entire system. A Durable Object class built on:
- **Drizzle ORM** - Type-safe SQL with Cloudflare D1/DO SQLite
- **Better Auth** - Complete authentication with plugins
- **Multi-transport** - HTTP, WebSocket, Workers RPC, CapnWeb

```typescript
// Full featured
import { DO } from 'dotdo'

// Minimal - no deps, no auth, smallest bundle
import { DO } from 'dotdo/tiny'

// RPC mode - expects heavy deps (jose, etc.) as Worker bindings
import { DO } from 'dotdo/rpc'

// With auth
import { DO } from 'dotdo/auth'
```

#### Binding Conventions

When using `dotdo/rpc`, dependencies are accessed via conventional binding names:

```typescript
this.env.JOSE        // JWT operations
this.env.ESBUILD     // Build/transform
this.env.MDX         // MDX compilation
this.env.STRIPE      // Stripe operations
this.env.WORKOS      // WorkOS/OAuth
this.env.CLOUDFLARE  // Cloudflare API
```

### 2. RPC() - Universal Package Wrapper

Wraps any npm package as a multi-transport RPC worker:

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

// workers/cloudflare/index.ts
import Cloudflare from 'cloudflare'
import { env } from 'cloudflare:workers'
import { RPC } from 'workers.do/rpc'

export default RPC(new Cloudflare({ apiToken: env.CLOUDFLARE_API_TOKEN }))
```

RPC() automatically provides:
- **Workers RPC** - `env.JOSE.verify(token)`
- **CapnWeb** - WebSocket RPC protocol
- **MCP JSON-RPC** - `{ jsonrpc: '2.0', method: 'verify', params: [...] }`
- **REST** - `GET /api/verify?token=xyz`

### 3. edge-api - HATEOAS Framework

Provides the HTTP layer with explorable APIs:

```typescript
import { EdgeAPI } from '@dotdo/edge-api'

export default EdgeAPI({
  users: {
    list: () => db.query('SELECT * FROM users'),
    get: (id) => db.query('SELECT * FROM users WHERE id = ?', [id])
  }
})

// Response shape:
{
  api: { name: 'my-api', version: '1.0.0' },
  links: {
    users: '/users',
    'users.list': '/users/list',
    'users.get': '/users/:id'
  },
  actions: { ... },
  data: { ... },
  user: { ... }
}
```

### 4. MDX-as-Worker

Workers can be defined in MDX files:

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

This worker handles user management.

import { Hono } from 'hono'
import { z } from 'zod'

const app = new Hono()

app.get('/users', async (c) => {
  const users = await c.env.DB.prepare('SELECT * FROM users').all()
  return c.json(users)
})

export default app
```

The `workers.do build` command:
1. Parses frontmatter → generates `wrangler.json`
2. Extracts `dependencies` → updates `package.json`
3. Compiles code → `dist/my-api.js`
4. Optionally generates docs from prose

Fenced code blocks with `export` marker become actual exports:

````mdx
```ts export
export const config = { cors: true }
```
````

## Authentication Architecture

### Better Auth Integration

All Better Auth plugins supported:

```
auth/
├── core/              # Base better-auth + Drizzle schema
├── api-key/           # Programmatic access tokens
├── mcp/               # AI tool authentication
├── organization/      # Multi-tenancy
├── admin/             # User management
└── oauth-proxy/       # OAuth flow handling
```

### Cookie Strategy

Three cookies with distinct purposes:

| Cookie | Format | Purpose |
|--------|--------|---------|
| `auth` | JWT | User authentication (signed, verified) |
| `settings` | sqid | Anonymous ID + preferences (lightweight) |
| `session` | sqid | Session tracking (lightweight) |

Anonymous ID generated via sqid from:
- ASN
- Cloudflare colo
- ISO country/region
- Language
- IP prefix (first 3 octets)

## Snippets Architecture

Cloudflare Snippets for free-tier optimization:

### Constraints
- < 5ms CPU time
- < 32KB compressed
- No bindings
- Limited subrequests (2 Pro, 5 Enterprise)

### Snippet Cascade

```
Request → auth snippet → cache snippet → origin
              │               │
         verify JWT      analytics + caching
              │               │
         auth cookie     settings/session cookies
                              │
                         HTTP → Pipelines → R2 Data Catalog
```

### Free-Tier Multi-Tenancy

```
100k sites from single deployment:

Request (my-docs.workers.do)
    │
    ▼
cache snippet (analytics + routing)
    │
    ▼
Static Assets (sites/my-docs.jsonl)
    │
    ▼
{ module: "...", mdx: "...", html: "..." }
```

Hostname maps to filename: `my-site.workers.do` → `sites/my-site.jsonl`

## Analytics Pipeline

```
cache snippet
    │
    ▼
Analytics Event {
  timestamp, hostname, path, method,
  status, cache (HIT/MISS), cf: { colo, country },
  userId (if auth), anonymousId (sqid)
}
    │
    ▼
HTTP endpoint → Pipelines → Streams → R2 Data Catalog (Iceberg)
                                            │
                                            ▼
                                       R2 SQL queries
```

## Apps Architecture

All apps built with Vite + React Router + shadcn:

```
apps/
├── admin/       # /admin - Platform controls (users, secrets, billing)
├── dashboard/   # /dashboard - Analytics, monitoring, overview
├── app/         # /app - User-facing features
└── docs/        # /docs - Fumadocs documentation
```

### UI Routes

Each app is embeddable in any workers.do site:

```
my-site.workers.do/admin      → admin UI (requires admin role)
my-site.workers.do/dashboard  → dashboard UI
my-site.workers.do/app        → application UI
my-site.workers.do/docs       → documentation
```

### Future Exploration

- **hono/jsx + hono/jsx/dom** - Lighter alternative to React
- **Auto-detection** - vite.config.ts vs next.config.ts determines build

## CLI Architecture

```bash
# Deploy-focused
workers.do login              # OAuth via WorkOS
workers.do dev                # Local development
workers.do deploy             # Deploy to workers.do platform
workers.do logs               # Tail logs

# Full lifecycle
workers.do init               # Scaffold new project
workers.do build              # Generate wrangler.json from MDX
workers.do domains add        # Custom domain setup
workers.do secrets set        # Manage secrets
workers.do env list           # Environment management

# Platform management
workers.do sites list         # Multi-tenant site management
workers.do sites create       # Create new site
workers.do analytics query    # R2 SQL analytics queries
workers.do users list         # User management
workers.do apikeys create     # API key management
```

### Workers for Platforms

The CLI deploys to Workers for Platforms for multi-tenant hosting:
- OAuth via oauth.do (WorkOS integration)
- Automatic wrangler.json generation from MDX
- Smart pooling to minimize per-worker costs

## primitives/ Submodule

Git submodule from `github.com/dot-org-ai/primitives.org.ai`:

```
primitives/packages/
├── ai-database/          # Database interfaces
├── ai-functions/         # Function interfaces
├── ai-workflows/         # Workflow interfaces
├── ai-providers/         # Provider interfaces
├── digital-workers/      # Worker interfaces
├── autonomous-agents/    # Agent interfaces
└── ...                   # 19 total interface packages
```

These TypeScript interfaces define contracts that `dotdo` and workers implement.

## Build System

### pnpm Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'workers/*'
  - 'middleware/*'
  - 'objects/*'
  - 'snippets/*'
  - 'packages/*'
  - 'auth/*'
  - 'plugins/*'
  - 'primitives/packages/*'
```

### Dual Publishing

Packages publish under multiple names:
- Direct: `@dotdo/middleware`
- Re-exported: `workers.do/middleware`

```json
// workers/workers/package.json
{
  "name": "workers.do",
  "exports": {
    ".": "./dist/index.js",
    "./middleware": "@dotdo/middleware",
    "./auth": "@dotdo/auth",
    "./router": "./dist/router/index.js"
  }
}
```

## Data Flow

### Request Lifecycle

```
Client Request
    │
    ▼
Snippet (auth) ─────────────────┐
    │                           │
    ▼                           │ JWT verify via
Snippet (cache) ────────────────┤ subrequest to
    │                           │ jose worker
    │ analytics event ──────────┼──► Pipelines
    │                           │
    ▼                           │
Origin (Worker/Static Assets)   │
    │                           │
    ▼                           │
Durable Object (dotdo)          │
    │                           │
    ├─► Drizzle ─► SQLite       │
    │                           │
    ├─► RPC ─► env.JOSE ────────┘
    │       ─► env.STRIPE
    │       ─► env.CLOUDFLARE
    │
    ▼
Response (JSON/HTML/CapnWeb/MCP)
```

### Multi-Transport Response

Same data, multiple formats:

```typescript
// Developer writes:
export default {
  users: {
    list: () => [{ id: 1, name: 'Alice' }]
  }
}

// System serves:
// REST: GET /users/list → [{ id: 1, name: 'Alice' }]
// RPC:  env.MY_API.users.list() → [{ id: 1, name: 'Alice' }]
// WS:   { method: 'users.list' } → { result: [...] }
// MCP:  { jsonrpc: '2.0', method: 'users.list' } → { result: [...] }
// HTML: Rendered via mdxui/hono-jsx
```
