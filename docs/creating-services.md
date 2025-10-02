# Creating Services - Complete Guide

## Overview

This guide walks you through creating a new Workers service using the scaffolding system. You'll learn how to:

1. Generate a service from a template
2. Customize the service for your needs
3. Add RPC methods, HTTP routes, MCP tools, and queue handlers
4. Test your service
5. Deploy to production

## Prerequisites

- pnpm installed (`npm install -g pnpm`)
- Wrangler CLI installed (`npm install -g wrangler`)
- Cloudflare account (for deployment)
- Node.js 18+

## Step 1: Generate Service

Use the `create-service` CLI to generate a new service from a template:

```bash
# Domain service (for core business logic)
pnpm create-service --name agents --type domain

# Integration service (for external APIs)
pnpm create-service --name stripe --type integration

# AI service (for AI/ML functionality)
pnpm create-service --name embeddings --type ai
```

### Command Options

- `--name` **(required)** - Service name in kebab-case (e.g., `my-service`)
- `--type` **(required)** - Template type: `domain`, `integration`, or `ai`
- `--description` *(optional)* - Human-readable description

### What Gets Generated

```
<service-name>/
├── src/
│   ├── index.ts       # Main entrypoint + HTTP routes
│   ├── rpc.ts         # RPC interface definitions
│   ├── mcp.ts         # MCP server (tools + resources)
│   └── queue.ts       # Queue message handlers
├── tests/
│   └── index.test.ts  # Test file
├── package.json       # Dependencies
├── wrangler.jsonc     # Cloudflare Workers config
├── tsconfig.json      # TypeScript config
└── README.md          # Service documentation
```

## Step 2: Install Dependencies

```bash
cd <service-name>
pnpm install
```

This installs:
- Hono (HTTP framework)
- Shared packages (`@dot-do/worker-types`, `@dot-do/worker-utils`, etc.)
- TypeScript, Vitest, Wrangler
- All necessary types

## Step 3: Define Your Data Model

Start by defining the types for your service:

```typescript
// src/index.ts

export interface Agent {
  id: string
  name: string
  description: string
  model: string
  tools: string[]
  createdAt: number
  updatedAt: number
}

export interface CreateAgentInput {
  name: string
  description: string
  model?: string
  tools?: string[]
}

export interface UpdateAgentInput {
  name?: string
  description?: string
  model?: string
  tools?: string[]
}
```

## Step 4: Implement RPC Methods

Add your business logic as RPC methods in the `WorkerEntrypoint` class:

```typescript
// src/index.ts

export class Agents extends WorkerEntrypoint<Env> {
  /**
   * Get agent by ID
   */
  async getAgent(id: string): Promise<Agent | null> {
    const db = this.env.DB
    const result = await db
      .prepare('SELECT * FROM agents WHERE id = ?')
      .bind(id)
      .first<Agent>()

    return result || null
  }

  /**
   * List agents with pagination
   */
  async listAgents(options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = options
    const offset = (page - 1) * limit

    const db = this.env.DB

    const [items, count] = await Promise.all([
      db
        .prepare('SELECT * FROM agents LIMIT ? OFFSET ?')
        .bind(limit, offset)
        .all<Agent>(),
      db
        .prepare('SELECT COUNT(*) as count FROM agents')
        .first<{ count: number }>(),
    ])

    return {
      items: items.results || [],
      total: count?.count || 0,
      page,
      limit,
      hasMore: (count?.count || 0) > page * limit,
    }
  }

  /**
   * Create new agent
   */
  async createAgent(input: CreateAgentInput): Promise<Agent> {
    const id = crypto.randomUUID()
    const now = Date.now()

    const agent: Agent = {
      id,
      name: input.name,
      description: input.description,
      model: input.model || 'claude-3-5-sonnet-20241022',
      tools: input.tools || [],
      createdAt: now,
      updatedAt: now,
    }

    const db = this.env.DB
    await db
      .prepare('INSERT INTO agents (id, name, description, model, tools, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(agent.id, agent.name, agent.description, agent.model, JSON.stringify(agent.tools), agent.createdAt, agent.updatedAt)
      .run()

    return agent
  }

  /**
   * Update agent
   */
  async updateAgent(id: string, input: UpdateAgentInput): Promise<Agent | null> {
    const existing = await this.getAgent(id)
    if (!existing) return null

    const updated: Agent = {
      ...existing,
      ...input,
      updatedAt: Date.now(),
    }

    const db = this.env.DB
    await db
      .prepare('UPDATE agents SET name = ?, description = ?, model = ?, tools = ?, updatedAt = ? WHERE id = ?')
      .bind(updated.name, updated.description, updated.model, JSON.stringify(updated.tools), updated.updatedAt, id)
      .run()

    return updated
  }

  /**
   * Delete agent
   */
  async deleteAgent(id: string): Promise<boolean> {
    const db = this.env.DB
    const result = await db
      .prepare('DELETE FROM agents WHERE id = ?')
      .bind(id)
      .run()

    return result.success
  }
}
```

## Step 5: Add HTTP Routes

Create HTTP endpoints using Hono:

```typescript
// src/index.ts

const app = new Hono<{ Bindings: Env }>()

// Apply middleware
app.use('*', cors())
app.use('*', requestId())
app.use('*', logger())
app.use('*', errorHandler())

// Health check
app.get('/health', (c) => c.json(success({ status: 'ok', service: 'agents' })))

// List agents
app.get('/agents', async (c) => {
  const service = new Agents(c.env.ctx, c.env)
  const page = Number(c.req.query('page')) || 1
  const limit = Number(c.req.query('limit')) || 20

  const result = await service.listAgents({ page, limit })
  return c.json(success(result))
})

// Get agent
app.get('/agents/:id', async (c) => {
  const service = new Agents(c.env.ctx, c.env)
  const agent = await service.getAgent(c.req.param('id'))

  if (!agent) {
    return error('NOT_FOUND', 'Agent not found', undefined, 404)
  }

  return c.json(success(agent))
})

// Create agent
app.post('/agents', async (c) => {
  const service = new Agents(c.env.ctx, c.env)
  const body = await c.req.json()

  // TODO: Add Zod validation
  const agent = await service.createAgent(body)
  return c.json(success(agent), 201)
})

// Update agent
app.put('/agents/:id', async (c) => {
  const service = new Agents(c.env.ctx, c.env)
  const body = await c.req.json()

  const agent = await service.updateAgent(c.req.param('id'), body)

  if (!agent) {
    return error('NOT_FOUND', 'Agent not found', undefined, 404)
  }

  return c.json(success(agent))
})

// Delete agent
app.delete('/agents/:id', async (c) => {
  const service = new Agents(c.env.ctx, c.env)
  const deleted = await service.deleteAgent(c.req.param('id'))

  if (!deleted) {
    return error('NOT_FOUND', 'Agent not found', undefined, 404)
  }

  return c.json(success({ deleted: true }))
})
```

## Step 6: Add MCP Tools

Make your service available to AI agents via MCP:

```typescript
// src/mcp.ts

import type { McpTool } from '@dot-do/worker-types'

export const tools: McpTool[] = [
  {
    name: 'agents_get',
    description: 'Get an agent by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Agent ID' },
      },
      required: ['id'],
    },
    handler: async (input: { id: string }) => {
      // Implementation
    },
  },
  {
    name: 'agents_list',
    description: 'List all agents',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number' },
        limit: { type: 'number', description: 'Items per page' },
      },
    },
    handler: async (input: { page?: number; limit?: number }) => {
      // Implementation
    },
  },
  {
    name: 'agents_create',
    description: 'Create a new agent',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Agent name' },
        description: { type: 'string', description: 'Agent description' },
        model: { type: 'string', description: 'Model to use' },
      },
      required: ['name', 'description'],
    },
    handler: async (input: CreateAgentInput) => {
      // Implementation
    },
  },
]
```

## Step 7: Add Queue Handlers

Handle async messages:

```typescript
// src/queue.ts

export async function handleQueueMessage(batch: MessageBatch, env: Env) {
  for (const message of batch.messages) {
    try {
      await processMessage(message.body, env)
      message.ack()
    } catch (error) {
      console.error('Failed to process message:', error)
      message.retry()
    }
  }
}

async function processMessage(message: QueueMessage, env: Env) {
  switch (message.type) {
    case 'agents.created':
      await handleAgentCreated(message.data, env)
      break

    case 'agents.updated':
      await handleAgentUpdated(message.data, env)
      break

    case 'agents.deleted':
      await handleAgentDeleted(message.data, env)
      break

    default:
      console.warn(`Unknown message type: ${message.type}`)
  }
}
```

## Step 8: Configure Bindings

Update `wrangler.jsonc` with required bindings:

```jsonc
{
  "name": "agents",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-07",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  },

  // D1 Database
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "production",
      "database_id": "your-database-id"
    }
  ],

  // Service bindings (RPC)
  "services": [
    { "binding": "AI_SERVICE", "service": "ai" },
    { "binding": "AUTH_SERVICE", "service": "auth" }
  ],

  // Queue consumer
  "queues": {
    "consumers": [
      {
        "queue": "agents-queue",
        "max_batch_size": 10,
        "max_batch_timeout": 30
      }
    ]
  }
}
```

## Step 9: Write Tests

Add comprehensive tests:

```typescript
// tests/index.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { Agents } from '../src/index'

describe('Agents', () => {
  let service: Agents
  let env: any

  beforeEach(() => {
    env = {
      DB: {
        // Mock D1 database
        prepare: (sql: string) => ({
          bind: (...args: any[]) => ({
            first: async () => null,
            all: async () => ({ results: [], success: true }),
            run: async () => ({ success: true }),
          }),
        }),
      },
    }

    service = new Agents({} as any, env)
  })

  it('should create an agent', async () => {
    const input = {
      name: 'Test Agent',
      description: 'A test agent',
    }

    const agent = await service.createAgent(input)

    expect(agent).toBeDefined()
    expect(agent.name).toBe(input.name)
    expect(agent.description).toBe(input.description)
    expect(agent).toHaveProperty('id')
    expect(agent).toHaveProperty('createdAt')
  })

  it('should list agents', async () => {
    const result = await service.listAgents()

    expect(result).toHaveProperty('items')
    expect(result).toHaveProperty('total')
    expect(result).toHaveProperty('hasMore')
    expect(Array.isArray(result.items)).toBe(true)
  })
})
```

## Step 10: Test Locally

```bash
# Start development server
pnpm dev

# In another terminal, test endpoints
curl http://localhost:8787/health
curl http://localhost:8787/agents

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## Step 11: Deploy

```bash
# Deploy to production
pnpm deploy

# Or with environment
wrangler deploy --env staging
```

## Best Practices

### 1. Use Shared Types

```typescript
import type { BaseEnv, ApiResponse } from '@dot-do/worker-types'
```

### 2. Use Shared Utilities

```typescript
import { success, error, generateId, retry } from '@dot-do/worker-utils'
```

### 3. Add Validation

```typescript
import { z } from 'zod'
import { createValidator } from '@dot-do/worker-schemas'

const agentSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  model: z.string().optional(),
})

const validate = createValidator(agentSchema)
```

### 4. Use Middleware

```typescript
import { cors, auth, rateLimit, logger } from '@dot-do/worker-middleware'

app.use('*', cors())
app.use('*', auth())
app.use('*', rateLimit({ maxRequests: 100 }))
app.use('*', logger())
```

### 5. Handle Errors Properly

```typescript
try {
  const result = await service.operation()
  return c.json(success(result))
} catch (err) {
  console.error('Operation failed:', err)
  return error('OPERATION_FAILED', err.message, err, 500)
}
```

### 6. Document Your API

Add JSDoc comments to all public methods:

```typescript
/**
 * Get agent by ID
 * @param id - Agent ID
 * @returns Agent object or null if not found
 */
async getAgent(id: string): Promise<Agent | null> {
  // ...
}
```

### 7. Test Everything

- Unit tests for all RPC methods
- Integration tests for HTTP endpoints
- Mock all external dependencies

## Troubleshooting

### "Module not found" errors

```bash
pnpm install
```

### Type errors in imports

Make sure you're using workspace protocol:

```json
{
  "dependencies": {
    "@dot-do/worker-types": "workspace:*"
  }
}
```

### Wrangler errors

Check `wrangler.jsonc` syntax (no trailing commas!).

### Tests failing

Ensure mock environment is set up correctly:

```typescript
const env = {
  DB: mockD1Database(),
  KV: mockKVNamespace(),
}
```

## Next Steps

- Read [Service Patterns](./service-patterns.md) for best practices
- Review existing services for examples
- Check the main [CLAUDE.md](../CLAUDE.md) for architecture details

## Resources

- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Vitest Documentation](https://vitest.dev/)
