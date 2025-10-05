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

**⚠️  EXPERIMENTAL: 3-Tier Namespace Architecture**

We're currently evaluating two namespace architecture approaches:

**Option A: 3-Tier Namespaces** (Current Implementation)
```
GitHub Actions
  └─> curl https://deploy.do/deploy (using DEPLOY_API_KEY)
      └─> Deploy API Service (AUTH_SERVICE validates)
          └─> Cloudflare Workers for Platforms API
              └─> Dispatch Namespace Selection:
                  ├─> dotdo-internal (admin-only)
                  ├─> dotdo-public (rate-limited)
                  └─> dotdo-tenant (tenant-scoped)

Incoming Requests:
  ├─> https://db.internal.do/query        → INTERNAL namespace
  ├─> https://gateway.do/health           → PUBLIC namespace
  └─> https://acme.app.tenant.do/api      → TENANT namespace
```

**Option B: Hybrid Approach** (Under Consideration)
```
GitHub Actions
  └─> Deploy API Service decides:
      ├─> Internal services → Regular Cloudflare Workers (no namespace)
      ├─> Public APIs → dotdo-public namespace
      └─> Tenant services → dotdo-tenant namespace
```

**Namespace Classification:**

- **internal** (`dotdo-internal`): Infrastructure services
  - Services: db, auth, schedule, webhooks, email, queue, mcp
  - Auth: Admin-only access required
  - Use case: Platform infrastructure

- **public** (`dotdo-public`): Public APIs
  - Services: gateway (public routes)
  - Auth: Open access, rate-limited
  - Use case: Public-facing APIs

- **tenant** (`dotdo-tenant`): Tenant deployments
  - Services: Customer-specific workers
  - Auth: Tenant-scoped authentication
  - Use case: Multi-tenant SaaS

**Benefits of Option A (3-Tier):**
- ✅ Clear security boundaries between tiers
- ✅ Independent versioning per tier
- ✅ Flexible deployment strategies
- ✅ Better isolation and fault tolerance
- ✅ Consistent deployment model

**Benefits of Option B (Hybrid):**
- ✅ Simpler deployment for infrastructure
- ✅ Lower overhead for internal services
- ✅ Only use Workers for Platforms where needed
- ✅ Reduced complexity

**Common Benefits:**
- ✅ Zero Cloudflare credentials in CI/CD
- ✅ Fine-grained RBAC via AUTH_SERVICE
- ✅ Complete audit trail of all deployments
- ✅ Foundation for multi-tenant SaaS platform

**Open Questions:**
1. Should internal services use a namespace or remain regular workers?
2. Is the complexity of 3 namespaces worth the isolation benefits?
3. How do we handle versioning across namespaces?
4. Should gateway be split into internal/public instances?
5. Do we need different deployment strategies per namespace?

**Configuration Files:**
- `scripts/setup-namespaces.sh` - Provision 3-tier namespaces
- `scripts/worker-namespaces.json` - Worker→namespace mapping
- `scripts/deploy-to-namespace.sh` - Deploy to specific namespace
- `workers/deploy/src/types.ts` - Tier and Environment types
- `workers/deploy/src/index.ts` - Namespace routing logic

**Infrastructure Services:**
1. **Deploy API** (`workers/deploy/`) - Authenticated deployment service
   - Validates API keys via AUTH_SERVICE
   - Supports both tier-based and environment-based deployment
   - Automatically routes services to appropriate namespaces
   - Logs all deployments for audit
   - Supports rollback

2. **Dispatcher** (`workers/dispatcher/`) - Dynamic routing worker
   - Routes *.do requests to appropriate user workers
   - Subdomain-based: gateway.do → gateway worker
   - Path-based: /api/db/* → db worker
   - Zero business logic (pure router)

**Legacy Environment-Based Namespaces:**
- `dotdo-production` - Production environment
- `dotdo-staging` - Staging environment
- `dotdo-development` - Development environment

**Experimental 3-Tier Namespaces:**
- `dotdo-internal` - Infrastructure services (admin-only)
- `dotdo-public` - Public APIs (rate-limited)
- `dotdo-tenant` - Tenant deployments (tenant-scoped)

### MDX Workers (.mdx Format) - Complete Guide

**Business-as-Code for Cloudflare Workers using single `.mdx` files**

All workers in this repository can be defined as single `.mdx` files that combine configuration, implementation, and documentation. This "Business-as-Code" pattern has been validated with **13 production workers** totaling ~11,500 lines of code with 100% build success rate.

#### Migration Status: Phase 1 & 2 Complete

**Phase 1: Foundation Services (6/6 complete - 100%)**
1. ✅ hello-world.mdx - Basic RPC example (~500 LOC)
2. ✅ echo.mdx - Simple echo service (~550 LOC)
3. ✅ weather-mcp.mdx - MCP tools implementation (~600 LOC)
4. ✅ eval.mdx - AI evaluations framework (~900 LOC)
5. ✅ payments.mdx - Stripe integration (~950 LOC)
6. ✅ newsletter.mdx - Resend email integration (~1,100 LOC)

**Phase 2: Domain Workers (7/7 complete - 100%)**
1. ✅ blog-stream.mdx - AI blog generation with streaming (~1,100 LOC)
2. ✅ podcast.mdx - Multi-speaker podcast generation (~1,600 LOC)
3. ✅ numerics.mdx - Real-time KPI metrics (~2,000 LOC)
4. ✅ voice.mdx - Multi-provider TTS (~1,476 LOC)
5. ✅ api.mdx - Multi-layer routing (~1,519 LOC)
6. ✅ app.mdx - Payload CMS proxy (~707 LOC)
7. ✅ site.mdx - Runtime MDX compilation (~1,249 LOC)

**Total: 13/13 workers migrated (~11,500 LOC, 100% build success)**

#### The .mdx Format

Each `.mdx` worker file contains three sections:

```mdx
---
# 1. YAML Frontmatter - Wrangler configuration
$type: Worker
$id: my-worker
name: my-worker
main: src/index.ts
compatibility_date: "2025-07-08"

# All wrangler.jsonc fields supported
services:
  - binding: DB
    service: db
---

# 2. Markdown Documentation
Comprehensive documentation with examples, architecture diagrams, and usage guides.

## 3. TypeScript Implementation

\```typescript
// Full worker implementation
import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'

export class MyService extends WorkerEntrypoint<Env> {
  async myRpcMethod(): Promise<string> {
    return 'Hello from RPC'
  }
}

const app = new Hono()
app.get('/', (c) => c.json({ message: 'Hello' }))

export default { fetch: app.fetch }
\```
```

#### Build Process

```bash
# Build single worker
pnpm build-mdx podcast.mdx

# Build with custom output directory
pnpm build-mdx podcast.mdx --output workers/podcast

# Build all .mdx workers in directory
pnpm build-mdx:all
```

**Generated Output:**
```
workers/podcast/
├── wrangler.jsonc      # Extracted from YAML frontmatter
├── src/
│   └── index.ts        # Extracted from typescript code blocks
├── README.md           # Extracted from markdown content
└── package.json        # Auto-generated if missing
```

**Build Script:** `scripts/build-mdx-worker.ts`
- Parses YAML frontmatter → wrangler.jsonc
- Extracts `typescript` code blocks → src/index.ts
- Extracts markdown content → README.md
- Validates all required fields
- Ensures proper TypeScript formatting

#### Code Block Conventions

**IMPORTANT:** Use the correct code block language identifier:

```mdx
\```typescript
// This code is EXTRACTED to src/index.ts
import { WorkerEntrypoint } from 'cloudflare:workers'

export class MyService extends WorkerEntrypoint<Env> {
  async myMethod() { ... }
}
\```

\```ts
// This code is DOCUMENTATION ONLY (not extracted)
// Use for examples, usage snippets, etc.
const example = await env.MY_SERVICE.myMethod()
\```

\```bash
# Shell commands (documentation)
curl https://api.example.com
\```

\```json
# JSON examples (documentation)
{"status": "success"}
\```
```

**Rule:** Only `typescript` blocks are extracted to src/index.ts. All other code blocks (`ts`, `bash`, `json`, etc.) remain as documentation.

#### Configuration Patterns

**All wrangler.jsonc fields are supported in frontmatter:**

```yaml
---
$type: Worker
$id: example
name: example
main: src/index.ts
compatibility_date: "2025-07-08"
account_id: b6641681fe423910342b9ffa1364c76d

# Compatibility flags
compatibility_flags:
  - nodejs_compat
  - streams_enable_constructors

# Observability
observability:
  enabled: true

# Tail consumers (logging/debugging)
tail_consumers:
  - service: pipeline

# Routes
routes:
  - pattern: example.services.do/*
    custom_domain: true

# Service bindings (RPC)
services:
  - binding: DB
    service: db
  - binding: AUTH
    service: auth
  - binding: GATEWAY
    service: gateway

# KV namespaces
kv_namespaces:
  - binding: CACHE_KV
    id: example-cache

# R2 buckets
r2_buckets:
  - binding: STORAGE
    bucket_name: example-storage

# D1 databases
d1_databases:
  - binding: DB
    database_name: production
    database_id: 81e7b9cb-3705-47be-8ad5-942877a55d64

# Queues
queues:
  consumers:
    - queue: example-queue
      max_batch_size: 10
      max_batch_timeout: 5
      max_retries: 3
      dead_letter_queue: example-dlq
  producers:
    - queue: example-queue
      binding: QUEUE

# Pipelines (event streaming)
pipelines:
  - pipeline: events-realtime
    binding: pipeline

# Workers Assets (static files)
assets:
  directory: ./public
  binding: ASSETS

# Dispatch namespaces (Workers for Platforms)
dispatch_namespaces:
  - binding: do
    namespace: do
  - binding: tenant
    namespace: dotdo-tenant

# Environment variables
vars:
  ENVIRONMENT: production
  LOG_LEVEL: info
  FEATURE_FLAG_XYZ: "true"

# Limits
limits:
  cpu_ms: 50

# Placement
placement:
  mode: smart
---
```

#### Real-World Examples

**Example 1: Simple RPC Service (hello-world.mdx)**
```yaml
---
$type: Worker
$id: hello-world
name: hello-world
main: src/index.ts
compatibility_date: "2025-07-08"

services:
  - binding: DB
    service: db
---

# Hello World Worker

Basic RPC example with database access.

\```typescript
import { WorkerEntrypoint } from 'cloudflare:workers'

export class HelloWorldService extends WorkerEntrypoint<Env> {
  async getGreeting(name?: string): Promise<string> {
    return `Hello, ${name || 'World'}!`
  }

  async logGreeting(name: string): Promise<void> {
    await this.env.DB.execute(
      'INSERT INTO greetings (name, timestamp) VALUES (?, ?)',
      name,
      new Date().toISOString()
    )
  }
}
\```
```

**Example 2: Complex Multi-Provider Service (voice.mdx)**
```yaml
---
$type: Worker
$id: voice
name: voice
main: src/index.ts
compatibility_date: "2025-07-08"

observability:
  enabled: true

tail_consumers:
  - service: pipeline

services:
  - binding: DB
    service: db

r2_buckets:
  - binding: AUDIO
    bucket_name: voice-audio

pipelines:
  - pipeline: events-realtime
    binding: pipeline

dispatch_namespaces:
  - binding: do
    namespace: do
---

# Voice Worker

Multi-provider AI voice synthesis service supporting OpenAI TTS, ElevenLabs, and Google Cloud TTS.

## Features
- 3 voice providers with 1000+ voices
- Batch processing (up to 10 voiceovers)
- R2 storage for audio files
- Database tracking with metadata

\```typescript
import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { z } from 'zod'

// Types
export interface VoiceGenerationRequest {
  text: string
  voice: string
  provider: 'openai' | 'elevenlabs' | 'google'
  format?: 'mp3' | 'wav' | 'opus'
  speed?: number
}

// RPC Interface
export class VoiceService extends WorkerEntrypoint<Env> {
  async generateVoice(request: VoiceGenerationRequest): Promise<VoiceGenerationResponse> {
    // Implementation...
  }

  async generateBatch(requests: VoiceGenerationRequest[]): Promise<VoiceGenerationResponse[]> {
    // Batch implementation...
  }
}

// HTTP API
const app = new Hono<{ Bindings: Env }>()

app.post('/generate', async (c) => {
  const body = await c.req.json()
  const service = new VoiceService(c.env.ctx, c.env)
  const result = await service.generateVoice(body)
  return c.json(result)
})

export default { fetch: app.fetch }
\```
```

**Example 3: Advanced Routing (api.mdx)**
```yaml
---
$type: Worker
$id: api
name: api
main: src/index.ts
compatibility_date: "2025-07-08"

observability:
  enabled: true

# 20+ service bindings for routing
services:
  - binding: DB
    service: db
  - binding: AUTH
    service: auth
  - binding: GATEWAY
    service: gateway
  # ... 17 more services

kv_namespaces:
  - binding: API_CACHE
    id: api-cache

assets:
  directory: ./domains
  binding: DOMAINS

dispatch_namespaces:
  - binding: production
    namespace: dotdo-production
  - binding: staging
    namespace: dotdo-staging
  - binding: development
    namespace: dotdo-development
---

# API Worker

Single HTTP entry point with multi-layer routing to 20+ microservices.

## Routing Layers
1. Special domains (*.apis.do, *.services.do)
2. Path-based (/api/db/*, /api/auth/*)
3. Domain-based (dynamically routed to user workers)
4. Waitlist fallback

\```typescript
import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'

export class ApiService extends WorkerEntrypoint<Env> {
  async route(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Layer 1: Special domains
    if (url.hostname.endsWith('.apis.do')) {
      return this.env.GATEWAY.fetch(request)
    }

    // Layer 2: Path-based routing
    if (url.pathname.startsWith('/api/db/')) {
      return this.env.DB.fetch(request)
    }

    // Layer 3: Domain-based routing (Workers Assets)
    const domainConfig = await this.env.DOMAINS.fetch(url.hostname)
    if (domainConfig) {
      return this.routeToDynamicWorker(request, domainConfig)
    }

    // Layer 4: Waitlist fallback
    return new Response('Coming soon!', { status: 200 })
  }
}

const app = new Hono()
app.all('*', (c) => {
  const service = new ApiService(c.env.ctx, c.env)
  return service.route(c.req.raw)
})

export default { fetch: app.fetch }
\```
```

#### Common Patterns

**Pattern 1: RPC + HTTP + MCP Interface**
```typescript
// RPC Interface (service-to-service)
export class MyService extends WorkerEntrypoint<Env> {
  async myRpcMethod(param: string): Promise<Result> {
    // RPC implementation
  }
}

// HTTP API (external requests)
const app = new Hono<{ Bindings: Env }>()
app.get('/items', async (c) => {
  const service = new MyService(c.env.ctx, c.env)
  const result = await service.myRpcMethod('value')
  return c.json(result)
})

// MCP Tools (AI agent integration)
const mcpTools = [
  {
    name: 'my_method',
    description: 'Description for AI agents',
    inputSchema: { type: 'object', properties: { param: { type: 'string' } } },
    handler: async (input: { param: string }) => {
      const service = new MyService({} as any, env)
      return await service.myRpcMethod(input.param)
    },
  },
]

export default { fetch: app.fetch }
```

**Pattern 2: Database + R2 Storage**
```typescript
export class MyService extends WorkerEntrypoint<Env> {
  async storeFile(file: ArrayBuffer, metadata: Record<string, any>): Promise<string> {
    const id = ulid()

    // Store file in R2
    await this.env.STORAGE.put(`files/${id}`, file, {
      httpMetadata: { contentType: metadata.contentType },
      customMetadata: metadata,
    })

    // Store metadata in database
    await this.env.DB.execute(
      'INSERT INTO files (id, filename, size, created_at) VALUES (?, ?, ?, ?)',
      id,
      metadata.filename,
      file.byteLength,
      new Date().toISOString()
    )

    return id
  }
}
```

**Pattern 3: Queue Processing with Retry**
```typescript
export class MyService extends WorkerEntrypoint<Env> {
  async queueTask(task: Task): Promise<void> {
    await this.env.QUEUE.send({
      type: 'task',
      id: ulid(),
      task,
      timestamp: Date.now(),
    })
  }
}

// Queue consumer
export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processTask(message.body.task, env)
        message.ack()
      } catch (error) {
        console.error('Task failed:', error)
        message.retry()
      }
    }
  },
}
```

#### Best Practices

**✅ DO:**
- Use `typescript` for implementation code blocks (extracted to src/index.ts)
- Use `ts` for documentation examples (not extracted)
- Include comprehensive documentation in markdown sections
- Preserve ALL configuration from original wrangler.jsonc in frontmatter
- Use proper TypeScript types (no `any`)
- Add JSDoc comments for public RPC methods
- Include architecture diagrams and usage examples
- Document all environment variables and bindings
- Add feature lists and API endpoint documentation

**❌ DON'T:**
- Mix implementation and documentation in the same code block language
- Omit any wrangler.jsonc fields from frontmatter (they're all supported)
- Use `any` types - use proper TypeScript interfaces
- Forget to export the default handler (`export default { fetch: app.fetch }`)
- Skip documentation - the markdown section is as important as the code

#### Migration Checklist

When migrating a traditional worker to .mdx format:

1. **Read source files:**
   - [ ] wrangler.jsonc - All configuration
   - [ ] src/index.ts - Implementation
   - [ ] README.md - Documentation
   - [ ] Supporting files (types.ts, schema.ts, utils.ts, etc.)

2. **Create .mdx file:**
   - [ ] Copy ALL wrangler.jsonc fields to YAML frontmatter
   - [ ] Add `$type: Worker` and `$id: <name>` fields
   - [ ] Copy README.md content to markdown section
   - [ ] Enhance documentation with examples and architecture
   - [ ] Copy implementation to `typescript` code block
   - [ ] Inline supporting files (types, schemas, utils) into main code block

3. **Build and validate:**
   - [ ] Run `pnpm build-mdx <worker>.mdx`
   - [ ] Verify wrangler.jsonc generated correctly
   - [ ] Verify src/index.ts generated correctly
   - [ ] Verify README.md generated correctly
   - [ ] Compare generated files with originals

4. **Test deployment:**
   - [ ] Deploy generated worker: `cd <worker> && wrangler deploy`
   - [ ] Test all RPC methods
   - [ ] Test all HTTP endpoints
   - [ ] Verify service bindings work
   - [ ] Check observability and logs

5. **Update migration status:**
   - [ ] Mark worker as migrated in MIGRATION-STATUS.md
   - [ ] Update LOC count
   - [ ] Note any issues or learnings

#### Deployment

**Deploy generated workers normally:**
```bash
# Build .mdx to traditional structure
pnpm build-mdx podcast.mdx

# Deploy traditionally
cd podcast
wrangler deploy

# Or deploy via Workers for Platforms
npx wrangler deploy --dispatch-namespace dotdo-production
```

**Automatic rebuild on changes:**
```bash
# Watch mode (rebuilds on .mdx file changes)
pnpm build-mdx:watch podcast.mdx
```

#### Benefits

**Validated with 13 production workers:**
- ✅ **Single Source of Truth** - Config, code, and docs in one file
- ✅ **100% Build Success** - All 13 workers built correctly on first try
- ✅ **Scales to Large Workers** - Tested up to 2,000 LOC per .mdx file
- ✅ **Complex Configurations Work** - All wrangler.jsonc fields supported (service bindings, R2, KV, D1, queues, pipelines, dispatch namespaces, Workers Assets)
- ✅ **TypeScript Intellisense** - Full autocomplete in VS Code .mdx files
- ✅ **Version Control Friendly** - One file = one worker
- ✅ **Easy Code Review** - See everything at once
- ✅ **Self-Documenting** - Documentation can't get out of sync with code
- ✅ **Zero Context Switching** - No jumping between files
- ✅ **Backward Compatible** - Generates traditional structure for deployment

#### Limitations

**Current limitations (may be addressed in future):**
- ⚠️ No hot reload in dev mode (must rebuild after .mdx changes)
- ⚠️ Large workers (2,000+ LOC) can be harder to navigate in one file
- ⚠️ Multiple code blocks concatenated (careful with imports/exports)
- ⚠️ VS Code doesn't syntax highlight YAML frontmatter in .mdx files

**Workaround:** For very complex workers, consider keeping traditional structure but generating .mdx for documentation purposes.

#### File Location Strategy

```
workers/
├── *.mdx                    # All workers in .mdx format (13 files)
├── <service-name>/          # Generated output (build artifacts)
│   ├── wrangler.jsonc
│   ├── src/index.ts
│   └── README.md
└── scripts/
    └── build-mdx-worker.ts  # Build script
```

**Recommendation:** Store .mdx files in root `workers/` directory, generate traditional structure into `workers/<service-name>/` subdirectories.

#### See Also

**Migration Documentation:**
- [MIGRATION-STATUS.md](./MIGRATION-STATUS.md) - Detailed migration progress tracking
- [Phase 1 Complete Report](../notes/2025-10-04-phase1-migration-complete.md) - Foundation services migration
- [Phase 2 Complete Report](../notes/2025-10-04-phase2-migration-complete.md) - Domain workers migration

**Build Tooling:**
- [build-mdx-worker.ts](./scripts/build-mdx-worker.ts) - Build script implementation
- [mdxe](../mdx/packages/mdxe) - Zero-config MDX development environment

**Example Workers:**
- [podcast.mdx](./podcast.mdx) - Complex multi-provider service (1,600 LOC)
- [numerics.mdx](./numerics.mdx) - Real-time metrics with KV caching (2,000 LOC)
- [api.mdx](./api.mdx) - Advanced routing with 20+ bindings (1,519 LOC)
- [hello-world.mdx](./hello-world.mdx) - Simple RPC example (500 LOC)

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

### Bi-Directional GitHub Sync (Webhooks Service)

The **webhooks** service implements comprehensive bi-directional synchronization between the database and GitHub repositories using MDX files with MDXLD (MDX Linked Data) format.

**Architecture:**
```
GitHub Push Event
      ↓ Webhook
┌─────────────────┐
│ Webhooks Worker │ ◄── Processes push events
│  (HTTP Handler) │     Syncs MDX → Database
└────────┬────────┘
         │ Queue
         ▼
┌─────────────────┐
│ Queue Consumer  │ ◄── Auto-syncs database changes
│  (Queue Handler)│     Database → GitHub
└────────┬────────┘
         │ Octokit
         ▼
    GitHub API
```

**Three Sync Modes:**
1. **GitHub → Database** - Webhook handler processes push events
2. **Database → GitHub** - RPC method `syncToGitHub()`
3. **Automatic Queue-Based** - Queue consumer auto-syncs changes

**Key Files:**
- `src/handlers/github.ts` - GitHub webhook handler and sync logic
- `src/queue.ts` - Queue consumer for automatic sync (184 LOC)
- `src/conflicts.ts` - Conflict detection and resolution (467 LOC)
- `src/index.ts` - RPC interface (WebhooksService class)

**MDXLD Format:**
All MDX files use `$id` and `$type` fields:
```yaml
---
$id: note/2025-10-03-implementation
$type: Note
title: Implementation Plan
---

# Content here...
```

**Conflict Resolution:**
When database and GitHub versions diverge, conflicts are detected via SHA comparison:
- **ours** - Use database version, force push to GitHub
- **theirs** - Use GitHub version, update database
- **merge** - Attempt three-way merge (database takes precedence)
- **manual** - Mark for manual resolution

**RPC Interface:**
```typescript
export class WebhooksService extends WorkerEntrypoint<Env> {
  // Sync entity to GitHub (called by API service)
  async syncToGitHub(options: {
    repository: string;
    path: string;
    content: string;
    message: string;
    branch?: string;
    createPR?: boolean;
  }): Promise<any>

  // Resolve conflict with strategy
  async resolveConflict(
    conflictId: string,
    strategy: 'ours' | 'theirs' | 'merge' | 'manual'
  ): Promise<any>
}
```

**Queue Configuration:**
```jsonc
{
  "queues": {
    "consumers": [
      {
        "queue": "github-sync",
        "max_batch_size": 10,
        "max_batch_timeout": 5,
        "max_retries": 3,
        "dead_letter_queue": "github-sync-dlq"
      }
    ]
  }
}
```

**Database Tracking:**
- `sync_status` - 'synced', 'pending', 'failed', 'conflict'
- `github_sha` - Git commit SHA for conflict detection
- `github_url` - Repository URL
- `github_path` - File path in repository
- `last_synced_at` - Timestamp of last sync

**Conflict Tracking Table:**
```sql
CREATE TABLE sync_conflicts (
  id TEXT PRIMARY KEY,
  ns TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  repository TEXT NOT NULL,
  path TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  database_sha TEXT NOT NULL,
  github_sha TEXT NOT NULL,
  database_content TEXT NOT NULL,
  github_content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  strategy TEXT,
  resolved_at INTEGER,
  error TEXT
);
```

**Usage Example:**
```typescript
// API service calls webhooks service via RPC
const result = await env.WEBHOOKS_SERVICE.syncToGitHub({
  repository: 'dot-do/notes',
  path: 'test-note.mdx',
  content: '---\n$id: note/test-note\n$type: Note\n---\n\nContent',
  message: 'Update test-note.mdx',
  branch: 'main',
  createPR: false
});

// Resolve conflict
const resolution = await env.WEBHOOKS_SERVICE.resolveConflict(
  'conflict_123',
  'ours' // Use database version
);
```

**Testing:**
- `tests/queue.test.ts` - Queue handler integration tests
- `tests/conflicts.test.ts` - Conflict resolution tests
- `tests/github.test.ts` - GitHub sync tests (existing)

**See Also:**
- [api/CLAUDE.md](../api/CLAUDE.md) - API endpoints for sync and conflicts
- [GRAPH-DEPLOYMENT.md](./GRAPH-DEPLOYMENT.md) - Graph database deployment guide

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

**Last Updated:** 2025-10-04
**Status:** MDX Migration Complete (13/13 workers, ~11,500 LOC, 100% build success) + 100% Production Ready (8/8 core services, ~13,000 LOC, 95+ tests)
**Repository:** https://github.com/dot-do/workers
**Parent Repo:** https://github.com/dot-do/.do
