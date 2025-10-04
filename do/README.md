# DO Worker - Unified Service Entry Point

The `do` worker serves as the single entry point for all platform services, providing:

1. **Unified RPC Interface** - All services accessible through one binding
2. **Automatic Context Passing** - Authentication and user context passed through all calls
3. **Code Execution** - Dynamic worker loader for executing user code
4. **Single Binding** - Other services only need to bind to `do`

## Architecture

```
┌─────────────┐
│ Your Worker │
│             │
│  bindings:  │
│  - DO       │  ◄── Single binding point
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  DO Worker  │  ◄── Unified entry point
│             │
│  bindings:  │
│  - DB       │
│  - AUTH     │
│  - EMAIL    │
│  - QUEUE    │
│  - etc...   │
└──────┬──────┘
       │
       ├──► DB Service
       ├──► Auth Service
       ├──► Email Service
       ├──► Queue Service
       └──► 4 more services
```

## Usage

### Service Binding

In your worker's `wrangler.jsonc`:

```jsonc
{
  "services": [
    { "binding": "DO", "service": "do" }
  ]
}
```

### RPC Calls (Direct)

```typescript
import { WorkerEntrypoint } from 'cloudflare:workers'

interface Env {
  DO: Service<DO>
}

export class MyService extends WorkerEntrypoint<Env> {
  async getUser(userId: string) {
    // Context is optional - will create anonymous context if not provided
    const user = await this.env.DO.db_get('users', userId)
    return user
  }

  async sendEmail(to: string, subject: string, body: string) {
    // Context automatically passed through
    await this.env.DO.email_send(to, subject, body)
  }
}
```

### RPC Calls (With Context)

```typescript
import type { ServiceContext } from './types'

export class MyService extends WorkerEntrypoint<Env> {
  async getUserWithContext(userId: string, context: ServiceContext) {
    // Pass context explicitly for authentication tracking
    const user = await this.env.DO.db_get('users', userId, context)
    return user
  }
}
```

### HTTP API

```bash
# Call any service method
curl -X POST https://do.do/rpc/db/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "params": {
      "sql": "SELECT * FROM users WHERE id = ?",
      "params": ["user_123"]
    }
  }'

# Response
{
  "success": true,
  "result": [
    { "id": "user_123", "email": "user@example.com" }
  ]
}
```

### Code Execution

```bash
curl -X POST https://do.do/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const users = await env.DO.db_list(\"users\"); return users;",
    "timeout": 5000
  }'
```

## Available Methods

### Database (db_*)

- `db_query(sql, params)` - Execute SQL query
- `db_get(ns, id)` - Get entity by ID
- `db_list(ns, options)` - List entities
- `db_upsert(ns, id, data)` - Create or update entity
- `db_delete(ns, id)` - Delete entity
- `db_search(ns, query, options)` - Full-text search

### Authentication (auth_*)

- `auth_validateToken(token)` - Validate JWT token
- `auth_createSession(userId)` - Create user session
- `auth_createApiKey(name, permissions)` - Create API key
- `auth_checkPermission(permission)` - Check user permission

### Email (email_*)

- `email_send(to, subject, body, options)` - Send email
- `email_sendTemplate(to, template, data)` - Send templated email

### Queue (queue_*)

- `queue_send(queue, message, options)` - Send message to queue
- `queue_batch(queue, messages)` - Send batch of messages

### Schedule (schedule_*)

- `schedule_execute(taskName)` - Execute scheduled task
- `schedule_listTasks()` - List all tasks
- `schedule_getHistory(taskName, limit)` - Get execution history

### Webhooks (webhooks_*)

- `webhooks_syncToGitHub(options)` - Sync to GitHub
- `webhooks_resolveConflict(conflictId, strategy)` - Resolve sync conflict

### MCP (mcp_*)

- `mcp_listTools()` - List available MCP tools
- `mcp_callTool(toolName, args)` - Call MCP tool

### Gateway (gateway_*)

- `gateway_route(path, options)` - Route request through gateway

## Authentication Context

Every request automatically includes authentication context:

```typescript
interface AuthContext {
  user?: {
    id: string
    email: string
    name?: string
    role?: string
    permissions?: string[]
  }
  session?: {
    id: string
    expiresAt: number
  }
  apiKey?: {
    id: string
    name: string
    permissions: string[]
  }
  authenticated: boolean
}
```

Context is extracted from:
- `Authorization: Bearer <token>` header
- Validated by auth service
- Passed through all service calls

## Benefits

### For Service Developers

1. **No Binding Changes** - Services only need `DO` binding
2. **Automatic Auth** - Context passed automatically
3. **Type Safety** - Full TypeScript types
4. **Single Entry Point** - One place to look

### For Platform

1. **Centralized Control** - All traffic flows through DO
2. **Context Tracking** - Every call has user context
3. **Easy Auditing** - Single point for logging
4. **Version Control** - Update services without changing bindings

## Configuration

### wrangler.jsonc

```jsonc
{
  "name": "do",
  "main": "src/index.ts",
  "compatibility_date": "2025-07-08",

  "routes": [
    {
      "pattern": "do.do/*",
      "zone_name": "do.do"
    }
  ],

  "worker_loaders": [
    {
      "binding": "LOADER"
    }
  ],

  "services": [
    { "binding": "DB", "service": "db" },
    { "binding": "AUTH", "service": "auth" },
    { "binding": "GATEWAY", "service": "gateway" },
    { "binding": "SCHEDULE", "service": "schedule" },
    { "binding": "WEBHOOKS", "service": "webhooks" },
    { "binding": "EMAIL", "service": "email" },
    { "binding": "MCP", "service": "mcp" },
    { "binding": "QUEUE", "service": "queue" }
  ]
}
```

## Migration Guide

### Before (Multiple Bindings)

```jsonc
{
  "services": [
    { "binding": "DB", "service": "db" },
    { "binding": "AUTH", "service": "auth" },
    { "binding": "EMAIL", "service": "email" },
    { "binding": "QUEUE", "service": "queue" }
  ]
}
```

```typescript
const user = await env.DB.get('users', userId)
await env.EMAIL.send(to, subject, body)
await env.QUEUE.send('notifications', message)
```

### After (Single DO Binding)

```jsonc
{
  "services": [
    { "binding": "DO", "service": "do" }
  ]
}
```

```typescript
const user = await env.DO.db_get('users', userId)
await env.DO.email_send(to, subject, body)
await env.DO.queue_send('notifications', message)
```

## Development

```bash
# Install dependencies
pnpm install

# Run locally
pnpm dev

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Testing

```bash
# Health check
curl https://do.drivly.workers.dev/health

# Service info
curl https://do.drivly.workers.dev/

# Test database query
curl -X POST https://do.drivly.workers.dev/rpc/db/query \
  -H "Content-Type: application/json" \
  -d '{
    "params": {
      "sql": "SELECT 1 as test"
    }
  }'
```

## See Also

- [workers/CLAUDE.md](../CLAUDE.md) - Workers architecture overview
- [db/CLAUDE.md](../db/CLAUDE.md) - Database service documentation
- [auth/CLAUDE.md](../auth/CLAUDE.md) - Authentication service documentation
