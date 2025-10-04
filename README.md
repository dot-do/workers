# Workers Repository

**Microservices architecture for the dot-do platform using Cloudflare Workers**

## Overview

This repository contains 30+ Cloudflare Workers services that power the dot-do platform. Each service follows a consistent pattern with **4 interfaces**: RPC, HTTP, MCP, and Queue handlers.

## Quick Start

### Create a New Worker (MDX Approach - Simplified!)

**For simple workers**, create a single `.mdx` file:

```bash
# Create worker.mdx file in workers/examples/
cat > workers/examples/my-worker.mdx << 'EOF'
---
$type: Worker
name: my-worker
compatibility_date: "2025-01-01"
---

# My Worker

Documentation here...

## Code

\```typescript
import { WorkerEntrypoint } from 'cloudflare:workers'

export class MyWorker extends WorkerEntrypoint<Env> {
  async fetch() {
    return new Response('Hello!')
  }
}
\```
EOF

# Build worker from .mdx
pnpm build-mdx workers/examples/my-worker.mdx

# Deploy
cd workers/my-worker && wrangler deploy
```

**Benefits:**
- ✅ Single file for config + code + docs
- ✅ TypeScript intellisense in VS Code
- ✅ Zero configuration with mdxe
- ✅ Self-documenting

**Workers with Large Dependencies:**

For workers with large dependencies (like `yaml` or `esbuild-wasm`), dependencies are managed in the root `workers/package.json`:

```bash
# Build and deploy yaml worker
pnpm deploy:yaml

# Build and deploy esbuild worker
pnpm deploy:esbuild

# Or manually:
pnpm build-mdx workers/yaml.mdx
cd workers/yaml && wrangler deploy
```

**Example MDX Workers:**
- `workers/yaml.mdx` - YAML parsing and markdown/frontmatter streaming conversion
- `workers/esbuild.mdx` - On-demand JavaScript/TypeScript compilation with esbuild-wasm

**Self-Deployment Pattern:**

Workers can deploy themselves via RPC to the deploy service:

```bash
# Traditional deployment
cd yaml && wrangler deploy

# Self-deployment (workers deploying workers)
pnpm deploy:yaml:self

# Behind the scenes:
# 1. Worker bundles itself
# 2. Calls DEPLOY_SERVICE.deploy() via RPC
# 3. Deploy service handles Cloudflare API
# 4. Deployment logged for audit
```

**Testing with Wrangler Dev:**

Test deployed workers locally using `wrangler dev` with service bindings:

```bash
# Terminal 1: Start dev server
cd tests/dev
wrangler dev

# Terminal 2: Run tests
pnpm test:dev
```

The local test worker automatically RPCs to deployed workers. No API tokens or complex config needed - OAuth handles authentication.

### Create a New Service (Traditional Approach)

**For complex workers**, use the service generator:

```bash
# Domain service (for core business logic)
pnpm create-service --name agents --type domain

# Integration service (for external APIs)
pnpm create-service --name stripe --type integration

# AI service (for AI/ML functionality)
pnpm create-service --name embeddings --type ai
```

This generates a complete service with:
- ✅ RPC interface for service-to-service calls
- ✅ HTTP API with Hono
- ✅ MCP server for AI tool integration
- ✅ Queue handler for async processing
- ✅ Tests, types, and documentation

### Develop a Service

```bash
cd <service-name>
pnpm install
pnpm dev      # Start development server
pnpm test     # Run tests
pnpm deploy   # Deploy to production
```

## Architecture

### Service Interface Pattern

Every service exposes 4 interfaces:

```typescript
// 1. RPC (service-to-service)
export class MyService extends WorkerEntrypoint<Env> {
  async getItem(id: string) { ... }
  async listItems(options) { ... }
}

// 2. HTTP API
const app = new Hono()
app.get('/items/:id', handler)
app.post('/items', handler)

// 3. MCP Server (AI tools)
const mcpTools = [
  { name: 'my_get_item', handler: ... },
  { name: 'my_list_items', handler: ... },
]

// 4. Queue Handler
export default {
  fetch: app.fetch,
  queue: handleQueueMessage,
}
```

### Service Types

1. **Domain Services** - Core business logic (agents, workflows, business)
2. **Integration Services** - External API wrappers (stripe, github, anthropic)
3. **AI Services** - AI/ML functionality (embeddings, generation, eval)

## Repository Structure

```
workers/
├── packages/               # Shared packages
│   ├── types/             # TypeScript types
│   ├── utils/             # Common utilities
│   ├── middleware/        # Hono middleware
│   └── schemas/           # Zod schemas
├── templates/             # Service templates
│   ├── template-domain/
│   ├── template-integration/
│   └── template-ai/
├── scripts/
│   └── create-service.ts  # Service generator
├── docs/                  # Documentation
├── <service-name>/        # Individual services
└── package.json           # Root workspace
```

## Services

Each service follows this structure:

```
<service-name>/
├── src/
│   ├── index.ts          # Main + HTTP routes
│   ├── rpc.ts            # RPC interface
│   ├── mcp.ts            # MCP server
│   └── queue.ts          # Queue handlers
├── tests/
├── wrangler.jsonc
└── package.json
```

## Shared Packages

- **@dot-do/worker-types** - Common TypeScript types
- **@dot-do/worker-utils** - Utility functions
- **@dot-do/worker-middleware** - Hono middleware (CORS, auth, rate limit, etc.)
- **@dot-do/worker-schemas** - Zod validation schemas

## Development

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

### Commands

```bash
# Create new service
pnpm create-service --name <name> --type <domain|integration|ai>

# Run all tests
pnpm test

# Type check all services
pnpm typecheck

# Format code
pnpm format

# Deploy all services
pnpm deploy
```

## Documentation

### Getting Started
- **[QUICK-START.md](./QUICK-START.md)** - 5-minute deployment guide ⚡
- **[CONFIGURATION-STATUS.md](./CONFIGURATION-STATUS.md)** - Current configuration status
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Detailed deployment guide
- **[INTEGRATION.md](./INTEGRATION.md)** - Integration testing guide

### Development
- **[CLAUDE.md](./CLAUDE.md)** - Developer guide and architecture
- **[STATUS.md](./STATUS.md)** - Current implementation status
- **[TESTING.md](./TESTING.md)** - Testing guidelines

### Service Documentation
- **[Gateway](./gateway/README.md)** - API routing and traffic management
- **[Database](./db/README.md)** - Data access layer (PostgreSQL + ClickHouse)
- **[Auth](./auth/README.md)** - Authentication and authorization
- **[Schedule](./schedule/README.md)** - Cron jobs and scheduled tasks
- **[Webhooks](./webhooks/README.md)** - External webhook processing
- **[Email](./email/README.md)** - Transactional email delivery
- **[MCP](./mcp/README.md)** - Model Context Protocol server

## Standards

- **TypeScript** - Strict mode, no `any` types
- **Prettier** - Auto-format with `printWidth: 160`
- **Vitest** - Testing framework
- **Hono** - HTTP framework
- **Zod** - Schema validation

## URI Standards

- Pathnames starting with `/_` are private/secure and require auth
- Pathnames not starting with `/_` are public
- Public datasets & APIs available at `.mw` domains
- Queries use glob syntax (`*`, `**`, `**/*`)
- Version with `@` like `/@86Rf07` or `/@2025-01-01`
- Get/generate type with `::` like `/Thing::Type`

## Deployment

### ⚠️  EXPERIMENTAL: 3-Tier Namespace Architecture

We're currently evaluating a new 3-tier namespace architecture for better security isolation:

**Architecture Options:**

**Option A: 3 Namespaces** (Current Implementation)
- `internal`: Infrastructure services (db, auth, schedule, etc.) - admin-only access
- `public`: Public APIs (gateway) - open access, rate-limited
- `tenant`: Tenant-specific deployments - tenant-scoped authentication

**Option B: Hybrid Approach** (Under Consideration)
- Internal services remain as regular workers (no namespace overhead)
- Only `public` and `tenant` use Workers for Platforms namespaces

**Benefits of 3-Tier:**
- Clear security boundaries between internal, public, and tenant services
- Independent versioning per tier
- Flexible deployment strategies
- Better isolation and fault tolerance

**Benefits of Hybrid:**
- Simpler deployment for infrastructure services
- Lower overhead for internal-only services
- Only use Workers for Platforms where multi-tenancy is needed

**This is an open architectural question we're actively exploring.**

### Deployment Commands

**3-Tier Namespace Deployment (Experimental):**

```bash
# Setup namespaces (one-time)
./scripts/setup-namespaces.sh

# Deploy to specific namespace
./scripts/deploy-to-namespace.sh db internal
./scripts/deploy-to-namespace.sh gateway public
./scripts/deploy-to-namespace.sh all internal
```

**Legacy Environment-Based Deployment:**

```bash
cd <service-name>
pnpm deploy               # Production
wrangler deploy --env staging  # Staging

# Or use deployment script
./scripts/deploy-to-namespace.sh gateway production
./scripts/deploy-to-namespace.sh all staging
```

## Contributing

1. Create service from template
2. Implement business logic
3. Add tests (80%+ coverage)
4. Update documentation
5. Submit PR

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Documentation](https://hono.dev/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Vitest Documentation](https://vitest.dev/)

## License

See [LICENSE](./LICENSE)