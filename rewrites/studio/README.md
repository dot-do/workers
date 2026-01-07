# studio.do

Database Studio on Cloudflare Durable Objects - A database management UI for every AI agent.

## The Problem

AI agents need to inspect and manage databases. But existing tools like Drizzle Studio are:
- Centralized (not edge-native)
- Proprietary (not open source)
- Config-driven (require `drizzle.config.ts`)
- Human-focused (no MCP/AI integration)

## The Vision

Every AI agent gets their own Database Studio instance.

```typescript
import { tom, ralph } from 'agents.do'
import { Turso } from 'turso.do'
import { Studio } from 'studio.do'

// Each agent has their own database
const tomDb = Turso.for(tom)
const ralphDb = Turso.for(ralph)

// And their own Studio to manage it
const tomStudio = Studio.for(tom)
await tomStudio.connect(tomDb)

// AI can now introspect and modify data structures
await tom`check my database schema and suggest optimizations`
// Uses MCP tools: studio_introspect, studio_query
```

Not a shared admin panel. Each agent has isolated, persistent Studio state.

## Features

- **Runtime Introspection** - No config files needed, introspects live databases
- **Multi-Database Support** - Turso, Supabase.do, Cloudflare D1, any libSQL
- **MCP Tools** - AI-native database operations via Model Context Protocol
- **Per-Agent Isolation** - Each agent/tenant gets their own Studio instance
- **Query History** - Stored in DO SQLite, persists across sessions
- **Schema Visualization** - ER diagrams via Mermaid

## Architecture

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

## Installation

```bash
npm install studio.do
```

## Quick Start

### Connect to a Database

```typescript
import { Studio } from 'studio.do'

const studio = new Studio(env.STUDIO)

// Connect to Turso
await studio.connect('turso', {
  url: 'libsql://my-db-org.turso.io',
  authToken: env.TURSO_TOKEN
})

// Or connect to D1
await studio.connect('d1', {
  binding: env.D1_DATABASE
})

// Or connect to Supabase.do
await studio.connect('supabase', {
  binding: env.SUPABASE_DO
})
```

### Introspect Schema

```typescript
// Get full schema
const schema = await studio.introspect()
console.log(schema.tables)
// [{ name: 'users', columns: [...], indexes: [...], foreignKeys: [...] }, ...]

// Get single table
const usersTable = await studio.introspect('users')
```

### Browse Data

```typescript
// Simple browse
const users = await studio.browse('users', { limit: 50 })

// With filters
const activeUsers = await studio.browse('users', {
  filter: { status: 'active', role: 'admin' },
  sort: { created_at: 'desc' },
  limit: 20,
  offset: 0
})
```

### Execute Queries

```typescript
// Run SQL
const result = await studio.query('SELECT * FROM users WHERE id = ?', [123])

// Get query history
const history = await studio.getQueryHistory({ limit: 10 })
```

### MCP Tools

```typescript
import { studioTools, invokeTool } from 'studio.do/mcp'

// List available tools
console.log(studioTools.map(t => t.name))
// ['studio_connect', 'studio_introspect', 'studio_browse', 'studio_query', ...]

// Invoke a tool
const schema = await invokeTool('studio_introspect', {
  database: 'main',
  tables: ['users', 'posts']
})

// Browse with natural language (AI feature)
const result = await invokeTool('studio_browse', {
  table: 'users',
  natural: 'active admins created this month'
})
```

### Durable Object

```typescript
import { StudioDO } from 'studio.do/do'

// In your worker
export { StudioDO }

export default {
  async fetch(request, env) {
    // Each agent gets their own Studio instance
    const id = env.STUDIO.idFromName('agent-tom')
    const stub = env.STUDIO.get(id)
    return stub.fetch(request)
  }
}
```

## API Overview

### Core (`studio.do`)

**Connection Management**
- `connect(type, config)` - Connect to a database
- `disconnect(name?)` - Disconnect from database(s)
- `listConnections()` - List active connections

**Schema Introspection**
- `introspect(table?)` - Get schema for all tables or specific table
- `getTables()` - List table names
- `getColumns(table)` - Get column definitions
- `getIndexes(table)` - Get index definitions
- `getForeignKeys(table)` - Get foreign key relationships

**Data Operations**
- `browse(table, options?)` - Browse table data with filtering/pagination
- `query(sql, params?)` - Execute arbitrary SQL
- `insert(table, data)` - Insert row(s)
- `update(table, data, where)` - Update row(s)
- `delete(table, where)` - Delete row(s)

**Query Management**
- `getQueryHistory(options?)` - Get past queries
- `saveQuery(name, sql)` - Save a named query
- `getSavedQueries()` - List saved queries

### MCP Tools (`studio.do/mcp`)

| Tool | Description |
|------|-------------|
| `studio_connect` | Connect to a database |
| `studio_introspect` | Get database schema |
| `studio_browse` | Browse table data with filters |
| `studio_query` | Execute SQL query |
| `studio_alter` | Modify schema (DDL) |
| `studio_visualize` | Generate ER diagram |

### Durable Object (`studio.do/do`)

- `StudioDO` - Main Durable Object class
- Handles all operations via fetch API
- Stores preferences and history in DO SQLite

## Comparison with Drizzle Studio

| Feature | Drizzle Studio | studio.do |
|---------|---------------|-----------|
| **Architecture** | Centralized server | Durable Object per user |
| **Open Source** | No | Yes (MIT) |
| **Schema Source** | Config file | Runtime introspection |
| **AI Integration** | None | MCP tools native |
| **Multi-tenancy** | Shared instance | Isolated per agent |
| **Offline** | No | Yes (DO state persists) |
| **ER Diagrams** | No | Yes (Mermaid) |

## The Rewrites Ecosystem

studio.do completes the AI infrastructure stack:

| Package | Purpose |
|---------|---------|
| [fsx.do](https://fsx.do) | Filesystem for AI |
| [turso.do](https://turso.do) | libSQL/Turso client |
| [supabase.do](https://supabase.do) | Postgres-like BaaS |
| **studio.do** | Database management UI |

## License

MIT
