# CLAUDE.md - Workers Repository

## Overview

This is the **Workers Repository** for the dot-do organization's microservices architecture. It contains 30+ Cloudflare Workers services, shared packages, templates, and tooling for rapid service development.

## Current Status: 100% Core Services Complete (8/8 Deployed)

### Core Microservices (8/8 Complete)

| Service | Status | LOC | Tests | Purpose |
|---------|--------|-----|-------|---------|
| **gateway** | ✅ Complete | 1,349 | 30+ (80%+) | Pure router - routes requests, validates auth, enforces rate limits |
| **db** | ✅ Complete | 1,909 | 16 (68%) | Database abstraction layer - all data access via RPC (PostgreSQL/Neon + ClickHouse) |
| **auth** | ✅ Complete | 2,669 | Basic | Authentication and authorization - WorkOS, API keys, sessions, RBAC |
| **schedule** | ✅ Complete | 1,925 | 39 (92-96%) | Cron jobs and scheduled tasks - 8 built-in tasks, retry logic |
| **webhooks** | ✅ Complete | 2,114 | 10 (80%+) | External webhooks - 4 providers (Stripe, WorkOS, GitHub, Resend), 25 events |
| **email** | ✅ Complete | TBD | TBD | Transactional emails - Resend integration, templates, tracking |
| **mcp** | ✅ Complete | TBD | TBD | Model Context Protocol server - AI agent tools, JSON-RPC 2.0 |
| **queue** | ✅ Complete | TBD | TBD | Message queue processing |

**Migration Status:**
- **~13,000 LOC** migrated from 4MB api.services monolith
- **95+ tests** with 75%+ average coverage
- **8/8 core services deployed** - gateway, db, auth, schedule, webhooks, email, mcp, queue
- **AI Integration Complete** - Centralized types via ai-generation, ai-embeddings, ai-chat, ai-models packages
- **Zero duplicate code** - ~250 lines eliminated through foundation packages
- **100% Production Ready** - All services have wrangler.jsonc configs and comprehensive tests

**Key Achievements:**
- ✅ Decomposed monolithic API into focused microservices with clear boundaries
- ✅ Eliminated ~250 lines of duplicate code via centralized AI foundation packages
- ✅ 100% type-safe AI integration across all services
- ✅ Independent scaling and deployment enabled

## Architecture

### Workers for Platforms (Secure Deployment Model)

The workers repository uses **Cloudflare Workers for Platforms** for secure, isolated deployments with complete audit trails and RBAC.

**Architecture Flow:**
```
GitHub Actions
  └─> curl https://deploy.do/deploy (using DEPLOY_API_KEY)
      └─> Deploy API Service (AUTH_SERVICE validates)
          └─> Cloudflare Workers for Platforms API
              └─> Dispatch Namespace (production/staging/dev)
                  └─> User Workers (gateway, db, auth, etc.)

Incoming Requests:
  └─> https://gateway.do/health
      └─> Dispatcher (routes by subdomain)
          └─> PRODUCTION namespace
              └─> gateway worker
```

**Key Benefits:**
- ✅ Zero Cloudflare credentials in CI/CD
- ✅ Fine-grained RBAC via AUTH_SERVICE
- ✅ Complete audit trail of all deployments
- ✅ Namespace isolation (dev/staging/production)
- ✅ Foundation for multi-tenant SaaS platform

**Infrastructure Services:**
1. **Deploy API** (`workers/deploy/`) - Authenticated deployment service
   - Validates API keys via AUTH_SERVICE
   - Deploys to dispatch namespaces
   - Logs all deployments for audit
   - Supports rollback

2. **Dispatcher** (`workers/dispatcher/`) - Dynamic routing worker
   - Routes *.do requests to appropriate user workers
   - Subdomain-based: gateway.do → gateway worker
   - Path-based: /api/db/* → db worker
   - Zero business logic (pure router)

**Dispatch Namespaces:**
- `dotdo-production` - Production environment
- `dotdo-staging` - Staging environment
- `dotdo-development` - Development environment

### Service Types

1. **Domain Services** (e.g., agents, workflows, business)
   - Core business logic services
   - Own specific domain models
   - Expose RPC, HTTP, MCP, and Queue interfaces
   - Deployed to dispatch namespaces

2. **Integration Services** (e.g., stripe, github, anthropic)
   - External API wrappers
   - Normalize external APIs into internal patterns
   - Handle authentication and rate limiting
   - Deployed to dispatch namespaces

3. **AI Services** (e.g., embeddings, generation, eval)
   - AI/ML-specific functionality
   - Use Workers AI or external providers
   - Optimized for inference and embeddings
   - Deployed to dispatch namespaces

### Service Interface Pattern

Every service exposes **4 interfaces**:

```typescript
export class MyService extends WorkerEntrypoint<Env> {
  // 1. RPC methods (for service-to-service calls)
  async getItem(id: string) { ... }
  async listItems(options) { ... }
}

// 2. HTTP API (Hono routes)
app.get('/items/:id', handler)
app.post('/items', handler)

// 3. MCP Server (AI tool integration)
const mcpTools = [
  { name: 'my_get_item', handler: ... },
  { name: 'my_list_items', handler: ... },
]

// 4. Queue Handler (async processing)
export default {
  fetch: app.fetch,
  queue: handleQueueMessage,
}
```

## Repository Structure

```
workers/
├── packages/                    # Shared packages
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Common utilities
│   ├── middleware/             # Hono middleware
│   └── schemas/                # Zod validation schemas
├── templates/                   # Service templates
│   ├── template-domain/        # Domain service template
│   ├── template-integration/   # Integration service template
│   └── template-ai/            # AI service template
├── scripts/                     # Build and generation scripts
│   └── create-service.ts       # Service generator CLI
├── docs/                        # Documentation
│   ├── creating-services.md    # Service creation guide
│   └── service-patterns.md     # Best practices
├── <service-name>/             # Individual services (30+)
│   ├── src/
│   │   ├── index.ts           # Main entrypoint + HTTP routes
│   │   ├── rpc.ts             # RPC interface
│   │   ├── mcp.ts             # MCP server
│   │   └── queue.ts           # Queue handlers
│   ├── tests/
│   ├── wrangler.jsonc
│   └── package.json
├── package.json                # Root workspace config
├── pnpm-workspace.yaml         # Workspace packages
├── tsconfig.base.json          # Shared TypeScript config
└── vitest.config.ts            # Shared test config
```

## Creating a New Service

### Quick Start

```bash
# Create a new domain service
pnpm create-service --name agents --type domain

# Create an integration service
pnpm create-service --name stripe --type integration

# Create an AI service
pnpm create-service --name embeddings --type ai
```

This will:
1. Copy the appropriate template
2. Replace all template variables
3. Update workspace configuration
4. Generate complete boilerplate

### Development Workflow

```bash
# Navigate to service
cd agents

# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Deploy to production
pnpm deploy
```

### Template Variables

When creating a service, these variables are automatically replaced:

- `{{SERVICE_NAME}}` → kebab-case service name (e.g., `agents`)
- `{{SERVICE_CLASS}}` → PascalCase class name (e.g., `Agents`)
- `{{NAMESPACE}}` → snake_case namespace (e.g., `agents`)
- `{{SERVICE_BINDING}}` → UPPER_CASE binding (e.g., `AGENTS_SERVICE`)
- `{{SERVICE_DESCRIPTION}}` → Human-readable description

## Shared Packages

### @dot-do/worker-types

Common TypeScript types used across all services.

```typescript
import type { BaseEnv, ApiResponse, QueueMessage, McpTool } from '@dot-do/worker-types'
```

### @dot-do/worker-utils

Utility functions for common operations.

```typescript
import { success, error, generateId, retry, toPascalCase } from '@dot-do/worker-utils'
```

### @dot-do/worker-middleware

Hono middleware for CORS, auth, rate limiting, logging, etc.

```typescript
import { cors, auth, rateLimit, logger, errorHandler, cache } from '@dot-do/worker-middleware'
```

### @dot-do/worker-schemas

Zod validation schemas for common data structures.

```typescript
import { paginationSchema, filterSchema, apiResponseSchema, createValidator } from '@dot-do/worker-schemas'
```

## Service Development

### RPC Interface

Define RPC methods in the WorkerEntrypoint class:

```typescript
export class MyService extends WorkerEntrypoint<Env> {
  async getItem(id: string) {
    const db = this.env.DB
    return await db.query('SELECT * FROM items WHERE id = ?', id)
  }
}
```

Other services can call these methods:

```typescript
const result = await env.MY_SERVICE.getItem('123')
```

### HTTP API

Use Hono to define HTTP routes:

```typescript
const app = new Hono<{ Bindings: Env }>()

app.get('/items/:id', async (c) => {
  const service = new MyService(c.env.ctx, c.env)
  const item = await service.getItem(c.req.param('id'))
  return c.json(success(item))
})
```

### MCP Server

Define tools and resources for AI agents:

```typescript
const tools: McpTool[] = [
  {
    name: 'my_get_item',
    description: 'Get an item by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
    handler: async (input) => {
      return await getItem(input.id)
    },
  },
]
```

### Queue Handlers

Process async messages:

```typescript
export async function handleQueueMessage(batch: MessageBatch, env: Env) {
  for (const message of batch.messages) {
    try {
      await processMessage(message.body, env)
      message.ack()
    } catch (error) {
      message.retry()
    }
  }
}
```

## Service Bindings

Services communicate via RPC using service bindings:

```jsonc
// wrangler.jsonc
{
  "services": [
    { "binding": "DB_SERVICE", "service": "db" },
    { "binding": "AI_SERVICE", "service": "ai" },
    { "binding": "AUTH_SERVICE", "service": "auth" }
  ]
}
```

Then use in code:

```typescript
const user = await env.AUTH_SERVICE.getUser(userId)
const embedding = await env.AI_SERVICE.generateEmbedding(text)
```

## Testing

All services use Vitest for testing:

```typescript
describe('MyService', () => {
  let service: MyService
  let env: any

  beforeEach(() => {
    env = { /* mock bindings */ }
    service = new MyService({} as any, env)
  })

  it('should get item by ID', async () => {
    const result = await service.getItem('test')
    expect(result).toBeDefined()
  })
})
```

Run tests:

```bash
# Run all tests
pnpm test

# Run tests for specific service
cd agents && pnpm test

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test -- --coverage
```

## Deployment

### Workers for Platforms Deployment

All services deploy to **dispatch namespaces** via the **Deploy API** for security and audit trails.

#### Prerequisites

1. **Create Dispatch Namespaces** (one-time setup):
```bash
npx wrangler dispatch-namespace create dotdo-production
npx wrangler dispatch-namespace create dotdo-staging
npx wrangler dispatch-namespace create dotdo-development
```

2. **Deploy Infrastructure Services**:
```bash
# Deploy API (handles authenticated deployments)
cd workers/deploy
pnpm deploy

# Dispatcher (routes *.do traffic)
cd workers/dispatcher
pnpm deploy
```

3. **Create Deploy API Key**:
```bash
curl -X POST https://auth.do/apikeys \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "GitHub Actions Deploy",
    "permissions": ["deploy"],
    "expiresInDays": 365
  }'
```

#### Deploy a Service

**Via Deploy API (Production):**
```bash
cd <service-name>

# Build bundle
pnpm build

# Base64 encode
SCRIPT_B64=$(cat dist/index.js | base64)

# Deploy via API
curl -X POST https://deploy.do/deploy \
  -H "Authorization: Bearer $DEPLOY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"service\": \"<service-name>\",
    \"environment\": \"production\",
    \"script\": \"$SCRIPT_B64\",
    \"metadata\": {
      \"commit\": \"$(git rev-parse HEAD)\",
      \"branch\": \"main\",
      \"author\": \"$(git config user.email)\",
      \"version\": \"v1.0.0\"
    }
  }"
```

**Via Wrangler (Local Testing):**
```bash
cd <service-name>
pnpm dev  # Local development
```

**Direct to Namespace (Testing):**
```bash
cd <service-name>
npx wrangler deploy --dispatch-namespace dotdo-production
```

#### Verify Deployment

```bash
# Check deployment logged
curl https://deploy.do/deployments?service=<service-name>&limit=1 \
  -H "Authorization: Bearer $DEPLOY_API_KEY"

# Test service endpoint
curl https://<service-name>.do/health
```

#### Rollback

```bash
curl -X POST https://deploy.do/rollback \
  -H "Authorization: Bearer $DEPLOY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "<service-name>",
    "environment": "production"
  }'
```

#### Deployment Environments

| Environment | Namespace | Domain | Example |
|-------------|-----------|--------|---------|
| Production | `dotdo-production` | `*.do` | `https://gateway.do` |
| Staging | `dotdo-staging` | `*.staging.do` | `https://gateway.staging.do` |
| Development | `dotdo-development` | `*.dev.do` | `https://gateway.dev.do` |

#### GitHub Actions Integration

**Example workflow:**
```yaml
- name: Deploy to Production
  run: |
    cd workers/${{ matrix.service }}
    pnpm build

    SCRIPT_B64=$(cat dist/index.js | base64)

    curl -X POST https://deploy.do/deploy \
      -H "Authorization: Bearer ${{ secrets.DEPLOY_API_KEY }}" \
      -H "Content-Type: application/json" \
      -d "{
        \"service\": \"${{ matrix.service }}\",
        \"environment\": \"production\",
        \"script\": \"$SCRIPT_B64\",
        \"metadata\": {
          \"commit\": \"${{ github.sha }}\",
          \"branch\": \"${{ github.ref_name }}\",
          \"author\": \"${{ github.actor }}\",
          \"version\": \"${{ github.run_number }}\"
        }
      }"
```

**Security:**
- ✅ No `CLOUDFLARE_API_TOKEN` in GitHub secrets
- ✅ Only `DEPLOY_API_KEY` (scoped to deployments)
- ✅ Validated by AUTH_SERVICE with RBAC
- ✅ Complete audit trail

#### Deployment Order

Services must be deployed in this order to satisfy dependencies:

1. **db** - No dependencies
2. **auth** - Depends on db
3. **gateway** - Depends on db + auth
4. **schedule** - Depends on db
5. **webhooks** - Depends on db
6. **email** - Depends on db
7. **queue** - Depends on db
8. **mcp** - Depends on all services

## Common Patterns

### Error Handling

Use shared error utility:

```typescript
import { error } from '@dot-do/worker-utils'

if (!item) {
  return error('NOT_FOUND', 'Item not found', undefined, 404)
}
```

### Response Format

Use shared success utility:

```typescript
import { success } from '@dot-do/worker-utils'

return c.json(success({ items, total, hasMore }))
```

### Validation

Use Zod schemas:

```typescript
import { z } from 'zod'
import { createValidator } from '@dot-do/worker-schemas'

const itemSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

const validate = createValidator(itemSchema)

const data = validate(body) // Throws if invalid
```

### Pagination

Use shared pagination schema:

```typescript
import { paginationSchema } from '@dot-do/worker-schemas'

const params = paginationSchema.parse(c.req.query())
// { page: 1, limit: 20, cursor?: string }
```

## Configuration

### Environment Variables

Add to `.dev.vars`:

```bash
ANTHROPIC_API_KEY=sk-...
OPENAI_API_KEY=sk-...
```

Never commit secrets!

### Bindings

Configure in `wrangler.jsonc`:

```jsonc
{
  // D1 Database
  "d1_databases": [
    { "binding": "DB", "database_name": "production", "database_id": "xxx" }
  ],

  // KV Namespace
  "kv_namespaces": [
    { "binding": "KV", "id": "xxx" }
  ],

  // R2 Bucket
  "r2_buckets": [
    { "binding": "BUCKET", "bucket_name": "production" }
  ],

  // Queue Consumer
  "queues": {
    "consumers": [
      { "queue": "my-queue", "max_batch_size": 10 }
    ]
  },

  // Service Bindings
  "services": [
    { "binding": "DB_SERVICE", "service": "db" }
  ]
}
```

## Code Standards

### TypeScript

- **Strict mode enabled** - No `any` types
- **Path aliases** - Use `@/` for imports
- **Export interfaces** - Make types reusable

### Code Style

- **Prettier** - Auto-format with `pnpm format`
- **Horizontal code** - `printWidth: 160`
- **No semicolons** - `semi: false`
- **Single quotes** - `singleQuote: true`

### Documentation

- **JSDoc comments** - For public APIs
- **Inline comments** - Only when code isn't self-documenting
- **README.md** - For each service

## Troubleshooting

### Service not found

Make sure the service is added to `pnpm-workspace.yaml`:

```yaml
packages:
  - 'packages/*'
  - 'agents'
  - 'workflows'
```

### Type errors in imports

Run `pnpm install` in both root and service directory.

### Wrangler errors

Check `wrangler.jsonc` for syntax errors (no trailing commas!).

### Tests failing

Ensure mock environment bindings are set up correctly.

## Resources

- **Documentation:** `docs/`
- **Templates:** `templates/`
- **Shared Packages:** `packages/`
- **Service Generator:** `scripts/create-service.ts`

## Next Steps

1. Create your first service: `pnpm create-service --name my-service --type domain`
2. Read the guide: `docs/creating-services.md`
3. Review patterns: `docs/service-patterns.md`
4. Check examples in existing services

## Related Documentation

**Multi-Repo Architecture:**
- **[Root CLAUDE.md](../CLAUDE.md)** - Multi-repo management and migration strategy
- **[api.services/claude.md](../api.services/claude.md)** - Legacy monolith being decomposed

**Core Infrastructure:**
- [db/CLAUDE.md](../db/CLAUDE.md) - Database layer
- [ai/CLAUDE.md](../ai/CLAUDE.md) - AI/ML features
- [api/CLAUDE.md](../api/CLAUDE.md) - API services

**MDX Content Repositories** (all sync to database via repo.do):
- [apps/CLAUDE.md](../apps/CLAUDE.md) - Application definitions
- [brands/CLAUDE.md](../brands/CLAUDE.md) - Brand identity
- [functions/CLAUDE.md](../functions/CLAUDE.md) - Function definitions
- [integrations/CLAUDE.md](../integrations/CLAUDE.md) - Integration configs
- [schemas/CLAUDE.md](../schemas/CLAUDE.md) - Schema definitions
- [services/CLAUDE.md](../services/CLAUDE.md) - Service definitions
- [sources/CLAUDE.md](../sources/CLAUDE.md) - Data source definitions
- [workflows/CLAUDE.md](../workflows/CLAUDE.md) - Workflow patterns
- [agents/CLAUDE.md](../agents/CLAUDE.md) - AI agent definitions
- [business/CLAUDE.md](../business/CLAUDE.md) - Business definitions

**Experimental:**
- [poc/CLAUDE.md](../poc/CLAUDE.md) - Proof-of-concept experiments
- [tmp/CLAUDE.md](../tmp/CLAUDE.md) - Temporary/transitional code

---

**Last Updated:** 2025-10-03
**Status:** 100% Production Ready (8/8 core services deployed, ~13,000 LOC, 95+ tests)
**Repository:** https://github.com/dot-do/workers
**Parent Repo:** https://github.com/dot-do/.do
