# studio.do

> Database Studio. Edge-Native. AI-First. Every Agent Gets Their Own.

Drizzle Studio is a centralized dashboard. TablePlus is a desktop app. pgAdmin is from the 2000s. They're all built for humans clicking through GUIs. But when Tom needs to understand why queries are slow, or Ralph needs to implement a migration, they shouldn't navigate interfaces designed for human fingers.

**studio.do** gives every AI agent their own Database Studio. Persistent state. Query history. Schema introspection. All through natural language.

## AI-Native API

```typescript
import { studio } from 'studio.do'           // Full SDK
import { studio } from 'studio.do/tiny'      // Minimal client
import { studio } from 'studio.do/mcp'       // MCP tools only
```

Natural language for database operations:

```typescript
import { studio } from 'studio.do'

// Talk to it like a colleague
const schema = await studio`schema for users`
const slow = await studio`slow queries from today`
const admins = await studio`active admins created this month in users`

// Chain like sentences
await studio`tables with no indexes`
  .map(table => studio`add index suggestions for ${table}`)

// Connections are one line
await studio`connect to Turso at libsql://my-db.turso.io`
await studio`connect to D1 database MAIN_DB`
await studio`connect to Supabase project xyz`
```

## The Problem

Drizzle Studio dominates database tooling:

| What Drizzle Studio Requires | The Reality |
|------------------------------|-------------|
| **Config Files** | `drizzle.config.ts` required |
| **Centralized** | Single server, not edge-native |
| **Proprietary** | Free tier, paid cloud |
| **Human-Only** | No MCP/AI integration |
| **Shared State** | Everyone sees the same thing |

### The Database Tax

Every database interaction requires:
- Opening a GUI application
- Navigating menus and buttons
- Writing SQL in text boxes
- Copy-pasting results

AI agents can't do any of this. They need programmatic access.

### The Isolation Problem

When Tom analyzes slow queries, he shouldn't see Ralph's query history. When Ralph runs migrations, he shouldn't affect Tom's connections. Shared dashboards break isolation.

## The Solution

**studio.do** reimagines database tooling for AI:

```
Drizzle Studio                  studio.do
-----------------------------------------------------------------
Config files required           Runtime introspection
Centralized server              Durable Object per agent
Proprietary cloud               Open source (MIT)
Human GUI                       Natural language API
Shared dashboard                Isolated per agent
No MCP                          MCP tools native
```

## One-Click Deploy

```bash
npx create-dotdo studio
```

A Database Studio for every AI agent. Running on infrastructure you control.

```typescript
import { Studio } from 'studio.do'

export default Studio({
  name: 'my-studio',
  domain: 'db.my-app.com',
})
```

## Features

### Schema Introspection

```typescript
// Natural as asking a colleague
await studio`schema`                        // all tables
await studio`schema for users`              // single table
await studio`columns in orders`             // column definitions
await studio`indexes on products`           // index definitions
await studio`foreign keys for invoices`     // relationships

// AI infers what you need
await studio`users`                         // returns schema
await studio`users data`                    // returns rows
await studio`users structure`               // returns columns
```

### Browsing Data

```typescript
// Just describe what you want
await studio`active admins in users`
await studio`orders from last week`
await studio`products under $50`

// Sorting and limiting read naturally
await studio`top 10 customers by revenue`
await studio`oldest users created before 2020`
await studio`recent errors limit 100`
```

### Executing Queries

```typescript
// Raw SQL when you need it
await studio`run SELECT * FROM users WHERE id = 123`
await studio`execute DROP TABLE temp_data`

// Query history
await studio`my recent queries`
await studio`slow queries from today`
await studio`failed queries this week`
```

### Connections

```typescript
// Connect with one line
await studio`connect to Turso at libsql://my-db.turso.io`
await studio`connect to D1 database MAIN_DB`
await studio`connect to Supabase project xyz`
await studio`connect to Postgres at postgres://localhost/mydb`

// Manage connections
await studio`list connections`
await studio`disconnect from Turso`
await studio`switch to production`
```

### Migrations

```typescript
// Schema changes are sentences
await studio`add email column to users`
await studio`create index on orders.customer_id`
await studio`rename column username to name in users`

// Migration management
await studio`pending migrations`
await studio`apply migrations`
await studio`rollback last migration`

// Generate from diff
await studio`generate migration from schema changes`
```

### Schema Visualization

```typescript
// ER diagrams on demand
await studio`diagram for orders`
await studio`visualize relationships`
await studio`entity diagram for billing tables`
```

### Promise Pipelining

Chain operations without `Promise.all`. One network round trip:

```typescript
// Analyze and optimize
await studio`tables with no indexes`
  .map(table => studio`suggest indexes for ${table}`)
  .map(suggestion => studio`apply ${suggestion}`)

// Bulk introspection
await studio`all tables`
  .map(table => studio`analyze ${table} for optimization`)

// Migration pipeline
await studio`schema diff from last week`
  .map(change => studio`generate migration for ${change}`)
  .map(migration => studio`review ${migration}`)
```

## Architecture

### Durable Object per Agent

```
                    +-----------------------+
                    |      studio.do        |
                    |  (Cloudflare Worker)  |
                    +-----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    |  StudioDO (Tom)  | | StudioDO (Ralph) | |  StudioDO (...)  |
    |                  | |                  | |                  |
    | - Connections    | | - Connections    | | - Connections    |
    | - Query History  | | - Query History  | | - Query History  |
    | - Preferences    | | - Preferences    | | - Preferences    |
    +------------------+ +------------------+ +------------------+
              |               |               |
              v               v               v
         turso.do       supabase.do         D1
```

**Key insight**: Durable Objects provide per-agent state. Each Studio instance stores its own connection info, query history, and preferences in DO SQLite.

### Multi-Database Support

| Database | Connection |
|----------|------------|
| **Turso** | `connect to Turso at libsql://...` |
| **D1** | `connect to D1 database BINDING` |
| **Supabase** | `connect to Supabase project ID` |
| **Postgres** | `connect to Postgres at postgres://...` |
| **SQLite** | `connect to SQLite at /path/to/db` |

### MCP Tools

AI agents interact via Model Context Protocol:

| Tool | Natural Language Equivalent |
|------|----------------------------|
| `studio_connect` | `connect to Turso at...` |
| `studio_introspect` | `schema for users` |
| `studio_browse` | `active admins in users` |
| `studio_query` | `run SELECT * FROM...` |
| `studio_alter` | `add email column to users` |
| `studio_visualize` | `diagram for orders` |

## Agent Integration

```typescript
import { tom, ralph } from 'agents.do'
import { studio } from 'studio.do'

// Each agent has their own Studio
await tom`connect to production database`
await ralph`connect to staging database`

// They don't see each other's connections
await tom`my connections`     // [production]
await ralph`my connections`   // [staging]

// Agents can analyze and implement
await tom`find slow queries`
  .map(query => tom`analyze ${query}`)
  .map(issue => ralph`optimize ${issue}`)
```

## vs Drizzle Studio

| Feature | Drizzle Studio | studio.do |
|---------|----------------|-----------|
| **Architecture** | Centralized server | Durable Object per agent |
| **Open Source** | No | Yes (MIT) |
| **Schema Source** | Config file (`drizzle.config.ts`) | Runtime introspection |
| **AI Integration** | None | MCP tools native |
| **Multi-tenancy** | Shared instance | Isolated per agent |
| **Offline** | No | Yes (DO state persists) |
| **Natural Language** | No | Yes |
| **ER Diagrams** | No | Yes (Mermaid) |

## Use Cases

### Database Exploration

```typescript
// Discover schema
await studio`all tables`
await studio`relationships between tables`
await studio`tables with most rows`

// Profile data
await studio`column statistics for users`
await studio`null values in orders`
await studio`duplicate emails in customers`
```

### Performance Analysis

```typescript
// Find problems
await studio`slow queries from last hour`
await studio`missing indexes`
await studio`table scan queries`

// Fix them
await studio`suggest indexes for orders`
  .map(suggestion => studio`create ${suggestion}`)
```

### Data Migration

```typescript
// Export data
await studio`export users to CSV`
await studio`backup orders table`

// Import data
await studio`import customers from CSV`
await studio`restore orders from backup`
```

### Schema Evolution

```typescript
// Make changes
await studio`add phone column to customers`
await studio`drop legacy_id from orders`
await studio`rename email to email_address in users`

// Track changes
await studio`migration history`
await studio`schema changes this month`
```

## The Rewrites Ecosystem

studio.do completes the AI database infrastructure:

| Package | Purpose |
|---------|---------|
| [fsx.do](https://fsx.do) | Filesystem for AI |
| [turso.do](https://turso.do) | libSQL/Turso client |
| [supabase.do](https://supabase.do) | Postgres-like BaaS |
| **studio.do** | Database management UI |

## License

MIT

---

<p align="center">
  <strong>Drizzle Studio is for humans. studio.do is for AI.</strong>
  <br />
  Natural language. Per-agent isolation. Edge-native.
  <br /><br />
  <a href="https://studio.do">Website</a> |
  <a href="https://docs.studio.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/studio.do">GitHub</a>
</p>
