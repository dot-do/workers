# workers.do

> The platform for building Autonomous Startups with Business-as-Code

workers.do is the complete platform for building **Autonomous Startups** - businesses that run on AI with human oversight. Define your entire business logic, services, and operations as code, and let AI agents deliver them as software.

## Vision

**Build businesses, not just applications.**

**Write objects, return data, let AI deliver services.**

**Or just ask - and workers DO.**

The name carries a triple meaning:
1. **workers.do** - Cloudflare Workers on .do domains
2. **workers DO** - Workers that can DO anything via integrated AI agents
3. **Digital Workers** - The primitives.org.ai interface bridging autonomous agents and humans-in-the-loop

### The Autonomous Startup Stack

workers.do provides everything needed to run an AI-powered business:

| Layer | Service | What It Does |
|-------|---------|--------------|
| **Domains** | builder.domains | Free domains for AI agents and builders |
| **Identity** | id.org.ai (WorkOS) | Auth for AI and Humans - SSO, Directory Sync, secure secrets |
| **Payments** | Stripe Connect | Billing, subscriptions, marketplace payouts |
| **AI** | llm.do | LLM gateway with metering, billing, and analytics |
| **Infrastructure** | Cloudflare | Workers, DOs, D1, R2, KV, Queues |
| **Analytics** | Dashboard | Full business intelligence and observability |

```typescript
// An Autonomous Startup in a single MDX file
---
name: my-saas
services:
  - LLM      # AI capabilities via llm.do
  - STRIPE   # Payments via payments.do
  - WORKOS   # Identity via WorkOS
---

# My AI-Powered SaaS

export default {
  // AI generates content, charges customers, delivers value
  generate: async (prompt, user) => {
    const result = await env.LLM.complete(prompt)      // AI does the work
    await env.STRIPE.usage.record(user, result.tokens) // Platform bills for usage
    return result                                       // Customer gets value
  }
}
```

**Business-as-Code** - Your entire business defined in code
**AI-delivered Services-as-Software** - AI agents deliver services humans used to provide
**Autonomous Startups** - Businesses that run themselves with human oversight

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

## Platform Services

### builder.domains - Free Domains for Builders

Every Autonomous Startup needs a home. builder.domains provides free domains:

**Free Tier:**
- `*.hq.com.ai` - AI Headquarters
- `*.app.net.ai` - AI Applications
- `*.api.net.ai` - AI APIs
- `*.hq.sb` - StartupBuilder Headquarters
- `*.io.sb` - StartupBuilder IO
- `*.llc.st` - LLC domains

**Paid Tier:**
- Premium base domains (custom TLDs)
- Premium individual domains
- High-volume domain allocation
- Custom DNS and routing

```typescript
// Claim a free domain
await env.DOMAINS.claim('my-startup.hq.com.ai')

// Configure routing
await env.DOMAINS.route('my-startup.hq.com.ai', {
  worker: 'my-worker',
  paths: {
    '/api': 'api-worker',
    '/app': 'app-worker'
  }
})
```

### payments.do - Stripe Connect Integration

Every workers.do deployment gets integrated payments through our Stripe Connect platform:

```typescript
// Charge customers
await env.STRIPE.charges.create({ amount: 2000, currency: 'usd' })

// Create subscriptions
await env.STRIPE.subscriptions.create({ customer, price })

// Record usage for metered billing
await env.STRIPE.usage.record(customerId, { quantity: tokens })

// Marketplace payouts (services.do)
await env.STRIPE.transfers.create({ amount, destination: sellerAccount })
```

**services.do** enables marketplace functionality - sell services, receive payouts, all handled by the platform.

### id.org.ai - Auth for AI and Humans

Every workers.do deployment includes enterprise-grade identity via id.org.ai (powered by WorkOS):

- **SSO** - SAML, OIDC for enterprise customers
- **Directory Sync** - Okta, Azure AD, Google Workspace
- **Admin Portal** - Self-service IT admin interface
- **Organizations** - Multi-tenant user management
- **Vault** - Secure secret storage for customer API keys

```typescript
// Customers get enterprise SSO without building it
const authUrl = await env.ORG.sso.getAuthorizationUrl({
  organization: customer.orgId,
  redirectUri: 'https://my-app.workers.do/callback'
})

// Securely store org-level secrets (API keys, credentials)
await env.ORG.vault.store(orgId, 'OPENAI_KEY', apiKey)

// Manage org users
const users = await env.ORG.users.list(orgId)
```

### llm.do - AI Gateway with Billing

Unified LLM access with built-in metering and billing:

```typescript
// Simple completion - automatically metered and billed
const response = await env.LLM.complete({
  model: 'claude-3-opus',
  prompt: 'Generate a marketing email...'
})

// Streaming with usage tracking
const stream = await env.LLM.stream({
  model: 'gpt-4',
  messages: [{ role: 'user', content: '...' }]
})

// Customer brings their own key (stored in WorkOS Vault or Workers secrets)
await env.LLM.complete({ prompt, apiKey: customer.ownKey })
```

Features:
- **Multi-model** - Claude, GPT-4, Gemini, open source models
- **Usage metering** - Per-token billing integrated with Stripe
- **Analytics** - Model performance, costs, latency in dashboard
- **BYOK** - Customers can use their own API keys
- **Caching** - AI Gateway caching for cost optimization
- **Rate limiting** - Per-customer limits and quotas

## Architecture

```
apps/                  # Full applications (Vite + React Router + shadcn)
  admin/               # Platform admin UI (/admin)
  dashboard/           # Analytics & monitoring (/dashboard)
  app/                 # User-facing application (/app)
  docs/                # Fumadocs documentation (/docs)

workers/               # Cloudflare Workers
  workers/             # workers.do - the umbrella worker/package
  llm/                 # llm.do - AI gateway with billing (env.LLM)
  stripe/              # payments.do - Stripe Connect platform (env.STRIPE)
  workos/              # WorkOS SDK - enterprise identity (env.WORKOS)
  cloudflare/          # Cloudflare SDK as RPC
  jose/                # JWT operations as RPC
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

## SDKs

Strongly-typed clients for all platform services. Each SDK auto-discovers its endpoint from its package name.

```typescript
import { llm } from 'llm.do'
import { org } from 'org.ai'
import { payments } from 'payments.do'
import { services } from 'services.do'
import { domains } from 'builder.domains'

// Use default client (reads DO_API_KEY or ORG_AI_API_KEY from env)
const response = await llm.complete({ model: 'claude-3-opus', prompt: 'Hello!' })

// Or create with options
import { LLM } from 'llm.do'
const myLLM = LLM({ apiKey: 'xxx', timeout: 60000 })
```

| SDK | npm | Description |
|-----|-----|-------------|
| `llm.do` | `llm.do` | AI Gateway - Multi-model LLM access with billing |
| `org.ai` | `org.ai` | Auth for AI and Humans - SSO, Vault, Users (id.org.ai) |
| `payments.do` | `payments.do` | Stripe Connect - Billing, subscriptions, payouts |
| `services.do` | `services.do` | AI Services Marketplace |
| `builder.domains` | `builder.domains` | Free domains for builders |
| `analytics.do` | `analytics.do` | Analytics and business intelligence |
| `events.do` | `events.do` | Event-driven architecture |
| `actions.do` | `actions.do` | AI-powered actions |
| `searches.do` | `searches.do` | Vector search and RAG |
| `functions.do` | `functions.do` | Serverless functions |
| `workflows.do` | `workflows.do` | Durable workflows |

**Authentication:** Set `DO_API_KEY` or `ORG_AI_API_KEY` environment variable.

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
| `@dotdo/rpc-client` | Base CapnWeb RPC client for SDKs |

## Design Principles

1. **Business platform, not just infrastructure** - Identity, payments, AI, analytics built in
2. **Objects over frameworks** - Return data, not responses
3. **Convention over configuration** - Sensible defaults, zero boilerplate
4. **Tree-shakable everything** - Pay only for what you use
5. **Free tier first** - Maximize Cloudflare's free offerings
6. **Multi-transport by default** - REST, RPC, WebSocket, MCP from one definition

## Documentation

- [Architecture](./ARCHITECTURE.md) - Technical deep-dive
- [CLAUDE.md](./CLAUDE.md) - AI assistant guidance
- [Getting Started](./apps/docs/) - Full documentation site

## License

MIT
