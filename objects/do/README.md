# dotdo

> An agentic database that can DO anything

dotdo is the foundational Durable Object class for the workers.do platform. It provides a type-safe SQLite database via Drizzle ORM, optional Better Auth integration, and a built-in AI agent that can execute natural language instructions.

The name carries a triple meaning, reflecting the workers.do vision:

1. **workers.do** - Cloudflare Workers on .do domains
2. **workers DO** - Workers that can DO anything via integrated AI agents
3. **Digital Workers** - The primitives.org.ai interface bridging autonomous agents and humans-in-the-loop

## Installation

```bash
npm install dotdo
# or
pnpm add dotdo
```

## Entry Points

dotdo provides tree-shakable imports to minimize bundle size:

| Import | Description | Dependencies |
|--------|-------------|--------------|
| `dotdo` | Full-featured with all capabilities | Drizzle, Hono, Better Auth |
| `dotdo/tiny` | Minimal footprint, no external deps | None |
| `dotdo/rpc` | Expects heavy deps as Worker RPC bindings | Drizzle, Hono |
| `dotdo/auth` | Full auth integration enabled | Drizzle, Hono, Better Auth |

```typescript
import { DO } from 'dotdo'           // Full featured
import { DO } from 'dotdo/tiny'      // Minimal, no deps
import { DO } from 'dotdo/rpc'       // Deps via RPC bindings
import { DO } from 'dotdo/auth'      // With Better Auth
```

## Basic Usage

```typescript
import { DO } from 'dotdo'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export class MyDatabase extends DO {
  db = drizzle(this.ctx.storage.sql, { schema })

  async getUsers() {
    return this.db.select().from(schema.users)
  }

  async createUser(data: { name: string; email: string }) {
    return this.db.insert(schema.users).values(data).returning()
  }
}

export default {
  fetch(request, env) {
    const id = env.MY_DATABASE.idFromName('default')
    const stub = env.MY_DATABASE.get(id)
    return stub.fetch(request)
  }
}
```

## Drizzle Schema

Define your database schema using Drizzle ORM:

```typescript
// schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()),
})

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content'),
  authorId: integer('author_id').references(() => users.id),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
})
```

## Multi-Transport API

Every dotdo instance automatically exposes multiple transport interfaces:

```typescript
// HTTP REST
GET /users
POST /users { "name": "Alice", "email": "alice@example.com" }

// Workers RPC (service binding)
const users = await env.MY_DATABASE.getUsers()

// WebSocket (CapnWeb protocol)
ws.send(JSON.stringify({ method: 'getUsers', id: 1 }))

// MCP JSON-RPC (AI tool integration)
{ "jsonrpc": "2.0", "method": "getUsers", "id": 1 }
```

## Agentic Capabilities

Every dotdo instance has a built-in AI agent accessible via the `do()` method:

```typescript
// REST API
POST /do
{ "prompt": "Create a user named Alice with admin privileges" }

// Workers RPC
const result = await env.MY_DATABASE.do("Generate a report of all active users")

// WebSocket
ws.send(JSON.stringify({
  method: 'do',
  params: { prompt: 'Migrate the database schema to add a status column' }
}))

// MCP
{
  "jsonrpc": "2.0",
  "method": "do",
  "params": { "prompt": "Analyze user engagement patterns" },
  "id": 1
}
```

The agent understands your schema and can execute complex operations:

```typescript
export class AgenticDatabase extends DO {
  db = drizzle(this.ctx.storage.sql, { schema })

  // The agent can invoke any method on your class
  async getUsersByRole(role: string) {
    return this.db.select().from(schema.users).where(eq(schema.users.role, role))
  }

  async bulkUpdateStatus(userIds: number[], status: string) {
    return this.db
      .update(schema.users)
      .set({ status })
      .where(inArray(schema.users.id, userIds))
  }

  // Natural language requests route through do()
  // "Set all users with role 'trial' to status 'expired'"
  // Agent calls: bulkUpdateStatus([...trialUserIds], 'expired')
}
```

## RPC Mode Bindings

When using `dotdo/rpc`, heavy dependencies are accessed via Worker service bindings instead of bundling them:

```typescript
import { DO } from 'dotdo/rpc'

export class MyDatabase extends DO {
  async verifyToken(token: string) {
    // JWT operations via jose worker binding
    return this.env.JOSE.verify(token)
  }

  async processPayment(amount: number) {
    // Stripe operations via stripe worker binding
    return this.env.STRIPE.charges.create({ amount })
  }

  async compileContent(mdx: string) {
    // MDX compilation via mdx worker binding
    return this.env.MDX.compile(mdx)
  }
}
```

### Standard Binding Names

| Binding | Purpose | Worker |
|---------|---------|--------|
| `JOSE` | JWT operations (sign, verify, decode) | `workers/jose` |
| `STRIPE` | Payment processing | `workers/stripe` |
| `ORG` | Auth for AI and Humans (id.org.ai) | `workers/workos` |
| `ESBUILD` | Code bundling and transformation | `workers/esbuild` |
| `MDX` | MDX compilation | `workers/mdx` |
| `CLOUDFLARE` | Cloudflare API operations | `workers/cloudflare` |

Configure bindings in your wrangler configuration:

```toml
# wrangler.toml
[[services]]
binding = "JOSE"
service = "jose-worker"

[[services]]
binding = "STRIPE"
service = "stripe-worker"
```

## Authentication

When using `dotdo/auth`, Better Auth is fully integrated:

```typescript
import { DO } from 'dotdo/auth'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export class AuthenticatedDatabase extends DO {
  db = drizzle(this.ctx.storage.sql, { schema })

  // Auth context available on all requests
  async getMyPosts() {
    const user = this.auth.user
    if (!user) throw new Error('Unauthorized')

    return this.db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.authorId, user.id))
  }

  // Role-based access control
  async adminAction() {
    if (this.auth.user?.role !== 'admin') {
      throw new Error('Forbidden')
    }
    // Admin-only logic
  }
}
```

## API Reference

### DO Class

```typescript
class DO extends DurableObject {
  // Durable Object context
  ctx: DurableObjectState

  // Environment bindings
  env: Env

  // Auth context (when using dotdo/auth)
  auth: { user: User | null; session: Session | null }

  // AI agent execution
  do(prompt: string): Promise<unknown>

  // HTTP request handling
  fetch(request: Request): Promise<Response>

  // WebSocket handling
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void
  webSocketClose(ws: WebSocket, code: number, reason: string): void
}
```

## Design Principles

1. **Objects over frameworks** - Return data, not responses
2. **Convention over configuration** - Sensible defaults, zero boilerplate
3. **Tree-shakable everything** - Pay only for what you use
4. **Multi-transport by default** - REST, RPC, WebSocket, MCP from one definition

## License

MIT
