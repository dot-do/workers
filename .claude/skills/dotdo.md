---
name: dotdo
description: Use when working with the base Durable Object class (dotdo). Handles Drizzle schema, Better Auth integration, and tree-shakable imports.
---

# dotdo Development Skill

## When to Use

- Creating or extending Durable Objects
- Setting up Drizzle schema for DO SQLite
- Integrating Better Auth
- Choosing between dotdo entry points (tiny, rpc, auth, full)

## Entry Points

```typescript
import { DO } from 'dotdo'        // Full featured
import { DO } from 'dotdo/tiny'   // Minimal, no deps
import { DO } from 'dotdo/rpc'    // Expects deps as RPC bindings
import { DO } from 'dotdo/auth'   // With Better Auth
```

### When to Use Each

- **dotdo** - Default, includes everything
- **dotdo/tiny** - Smallest bundle, no external deps, no auth
- **dotdo/rpc** - Light bundle, offloads jose/etc to RPC workers
- **dotdo/auth** - When you need Better Auth integration

## Drizzle Schema

Base schema in `objects/do/schema.ts`:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const things = sqliteTable('things', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  data: text('data', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  thingId: text('thing_id').references(() => things.id),
  type: text('type').notNull(),
  data: text('data', { mode: 'json' }),
  timestamp: integer('timestamp', { mode: 'timestamp' }),
})
```

## Better Auth Integration

Auth schema is separate in `auth/core/schema.ts`:

```typescript
// Better Auth tables: user, session, account, verification
// Imported from better-auth/drizzle
```

## Agentic Capabilities

Every DO has an AI agent built in. The `do()` method accepts natural language:

```typescript
// Via any transport
await myDO.do("Create a user named Alice with admin privileges")
await myDO.do("Generate a report of sales from last month")
```

## Checklist for New DO Features

1. [ ] Update schema in `objects/do/schema.ts`
2. [ ] Run migrations
3. [ ] Add methods to DO class
4. [ ] Ensure tree-shakability (no side effects in imports)
5. [ ] Test with vitest
6. [ ] Update README.md
