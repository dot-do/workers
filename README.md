# Workers Repository

**Microservices architecture for the dot-do platform using Cloudflare Workers**

## Overview

This repository contains 30+ Cloudflare Workers services that power the dot-do platform. Each service follows a consistent pattern with **4 interfaces**: RPC, HTTP, MCP, and Queue handlers.

## Quick Start

### Create a New Service

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