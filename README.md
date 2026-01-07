# workers.do

> The complete platform for building, deploying, and scaling Cloudflare Workers

workers.do is a comprehensive monorepo providing everything needed to build production-grade applications on Cloudflare's edge platform. From zero-config CLI deployment to multi-tenant architectures running entirely on the free tier, workers.do abstracts away complexity while preserving full power and flexibility.

## Vision

**Write objects, return data, let the platform handle the rest.**

**Or just ask - and workers DO.**

The name carries a triple meaning:
1. **workers.do** - Cloudflare Workers on .do domains
2. **workers DO** - Workers that can DO anything via integrated AI agents
3. **Digital Workers** - The primitives.org.ai interface bridging autonomous agents and humans-in-the-loop

Every `dotdo` instance has an AI agent built in. Ask it anything via API, CLI, MCP, RPC, SDK, or any transport:

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

Or define structured APIs that the agent can also invoke:

```mdx
---
name: my-api
d1_databases:
  - binding: DB
    database_name: users
dependencies:
  zod: ^3.0.0
---

# User API

A simple user management API.

export default {
  users: {
    list: () => db.query('SELECT * FROM users'),
    get: (id) => db.query('SELECT * FROM users WHERE id = ?', [id]),
    create: (data) => db.insert('users', data)
  }
}
```

This MDX file is simultaneously:
- **The worker** - code executes on Cloudflare's edge
- **The documentation** - prose renders as docs
- **The configuration** - frontmatter replaces wrangler.toml
- **The API** - objects become REST, RPC, WebSocket, and MCP endpoints

## Features

### Multi-Transport RPC

Every API is automatically available via:
- **REST** - `GET /users/list`, `POST /users/create`
- **Workers RPC** - `env.MY_API.users.list()`
- **CapnWeb** - WebSocket-based RPC
- **MCP** - JSON-RPC for AI tool integration
- **HATEOAS** - Clickable, explorable APIs with `links`, `actions`, `data`

### Tree-Shakable Imports

```typescript
import { DO } from 'dotdo'              // Full featured
import { DO } from 'dotdo/tiny'         // Minimal, no deps
import { DO } from 'dotdo/rpc'          // Expects deps as RPC bindings
import { cors } from 'workers.do/middleware'
import { Auth } from 'workers.do/auth'
import { Router } from 'workers.do/router'
```

### Free-Tier Multi-Tenancy

Host 100k+ sites from a single deployment using:
- **Snippets** - Free-tier workers (<5ms CPU, <32KB)
- **Static Assets** - 100k files × 25MB each
- **Smart routing** - Hostname → site bundle mapping

### Zero-Config CLI

```bash
workers.do login              # OAuth via WorkOS
workers.do dev                # Local development
workers.do deploy             # Deploy to workers.do platform
workers.do sites list         # Multi-tenant management
workers.do analytics query    # R2 SQL analytics
```

## Architecture

```
apps/                  # Full applications (Vite + React Router + shadcn)
  admin/               # Platform admin UI (/admin)
  dashboard/           # Analytics & monitoring (/dashboard)
  app/                 # User-facing application (/app)
  docs/                # Fumadocs documentation (/docs)

workers/               # Cloudflare Workers
  workers/             # workers.do - the umbrella worker/package
  cloudflare/          # Cloudflare SDK as RPC
  jose/                # JWT operations as RPC
  stripe/              # Stripe SDK as RPC
  workos/              # WorkOS SDK as RPC
  esbuild/             # esbuild-wasm as RPC
  mdx/                 # MDX compiler as RPC

middleware/            # Hono middleware (@dotdo/middleware)
  cors/
  auth/
  cache/
  rate-limit/

objects/               # Durable Objects
  do/                  # Base DO class (npm: dotdo)

snippets/              # Cloudflare Snippets (free tier)
  cache/               # Caching + analytics capture
  auth/                # JWT verification
  router/              # Dynamic routing

packages/              # npm packages
  edge-api/            # HATEOAS framework
  rpc/                 # Universal RPC wrapper

primitives/            # TypeScript interfaces (submodule)

auth/                  # Better Auth integration (@dotdo/auth)
  core/
  api-key/
  mcp/
  organization/
  admin/
  oauth-proxy/

plugins/               # Extensibility plugins
```

## Quick Start

```bash
# Install CLI
npm install -g workers.do

# Login
workers.do login

# Create new project
workers.do init my-app

# Start development
cd my-app
workers.do dev

# Deploy
workers.do deploy
```

## Packages

| Package | Description |
|---------|-------------|
| `workers.do` | Umbrella package with tree-shakable imports |
| `dotdo` | Base Durable Object class with Drizzle + Better Auth |
| `@dotdo/middleware` | Hono middleware collection |
| `@dotdo/auth` | Better Auth integration with all plugins |
| `@dotdo/snippets` | Cloudflare Snippets utilities |
| `@dotdo/edge-api` | HATEOAS API framework |
| `@dotdo/rpc` | Universal RPC wrapper for npm packages |

## Design Principles

1. **Objects over frameworks** - Return data, not responses
2. **Convention over configuration** - Sensible defaults, zero boilerplate
3. **Tree-shakable everything** - Pay only for what you use
4. **Free tier first** - Maximize Cloudflare's free offerings
5. **Multi-transport by default** - REST, RPC, WebSocket, MCP from one definition

## Documentation

- [Architecture](./ARCHITECTURE.md) - Technical deep-dive
- [CLAUDE.md](./CLAUDE.md) - AI assistant guidance
- [Getting Started](./apps/docs/) - Full documentation site

## License

MIT
