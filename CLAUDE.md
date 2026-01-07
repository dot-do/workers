# CLAUDE.md - AI Assistant Guidance

This file provides context and guidance for AI assistants working on the workers.do codebase.

## Project Overview

workers.do is a monorepo for building on Cloudflare Workers. It provides:
- Multi-transport RPC (REST, Workers RPC, CapnWeb, MCP)
- Tree-shakable packages (`dotdo`, `dotdo/tiny`, `dotdo/rpc`)
- Free-tier optimization via Snippets and Static Assets
- MDX-as-Worker pattern for combined code/docs/config

## Repository Structure

```
apps/           # Full applications (Vite + React Router + shadcn)
workers/        # Cloudflare Workers (deployable)
middleware/     # Hono middleware
objects/        # Durable Objects
snippets/       # Cloudflare Snippets (free tier)
packages/       # npm packages
primitives/     # TypeScript interfaces (submodule)
auth/           # Better Auth integration
plugins/        # Extensibility plugins
```

## Key Design Principles

### 1. Objects Over Frameworks

Developers should return data, not responses:

```typescript
// GOOD - just return objects
export default {
  users: {
    list: () => db.query('SELECT * FROM users')
  }
}

// AVOID - framework boilerplate
app.get('/users', (c) => c.json(db.query('SELECT * FROM users')))
```

The system handles serialization to JSON, HTML, WebSocket, etc.

### 2. Convention Over Configuration

Use conventional binding names:
- `this.env.JOSE` - JWT operations
- `this.env.STRIPE` - Stripe SDK
- `this.env.CLOUDFLARE` - Cloudflare API

### 3. Tree-Shakable Everything

Every package should have multiple entry points:
- `/tiny` - Minimal, no dependencies
- `/rpc` - Expects deps as RPC bindings
- `/auth` - With authentication
- Default - Full featured

### 4. Free Tier First

Maximize Cloudflare free offerings:
- Snippets for routing/caching/auth (<5ms CPU, <32KB)
- Static Assets for multi-tenant hosting (100k files × 25MB)
- Workers for dynamic computation

## Working with This Codebase

### Package Locations

| What you need | Where to find it |
|---------------|------------------|
| Base DO class | `objects/do/` |
| Hono middleware | `middleware/*/` |
| Auth integration | `auth/*/` |
| RPC wrapper | `packages/rpc/` |
| HATEOAS framework | `packages/edge-api/` |
| Snippets | `snippets/*/` |
| Full apps | `apps/*/` |
| Workers | `workers/*/` |

### Creating New Packages

1. Choose the right folder:
   - `workers/` for deployable workers
   - `middleware/` for Hono middleware
   - `objects/` for Durable Objects
   - `packages/` for general npm packages
   - `auth/` for auth-related plugins
   - `snippets/` for Cloudflare Snippets

2. Follow naming conventions:
   - Folder: lowercase with dashes (`my-package`)
   - npm name: `@dotdo/my-package`
   - Also exported from `workers.do/my-package`

3. Include standard files:
   - `package.json`
   - `README.md`
   - `src/index.ts`
   - `tsconfig.json`

### MDX-as-Worker Pattern

Workers can be defined in MDX:

```mdx
---
name: my-worker
d1_databases:
  - binding: DB
    database_name: users
dependencies:
  zod: ^3.0.0
---

# My Worker

Documentation here.

export default {
  users: { list: () => [...] }
}
```

Frontmatter is wrangler.json shape plus `dependencies` for package.json.

### RPC Wrapper Pattern

To wrap an npm package as an RPC worker:

```typescript
import SomePackage from 'some-package'
import { env } from 'cloudflare:workers'
import { RPC } from 'workers.do/rpc'

export default RPC(new SomePackage(env.API_KEY))
```

This creates a worker exposing the package via all transports.

## Testing

- Use `vitest` for unit tests
- Use `@cloudflare/vitest-pool-workers` for worker tests
- Test files: `*.test.ts` or `*.spec.ts`

## Common Tasks

### Adding a new middleware

```bash
mkdir middleware/my-middleware
```

Create `package.json`:
```json
{
  "name": "@dotdo/middleware-my-middleware",
  "version": "0.0.1",
  "type": "module",
  "exports": { ".": "./src/index.ts" }
}
```

### Adding a new worker

```bash
mkdir workers/my-worker
```

Minimal worker:
```typescript
import { RPC } from 'workers.do/rpc'

export default RPC({
  hello: (name: string) => `Hello, ${name}!`
})
```

### Adding an auth plugin

```bash
mkdir auth/my-plugin
```

Follow Better Auth plugin conventions.

## Dependencies

### Core Dependencies

- `hono` - Web framework
- `drizzle-orm` - ORM for SQLite/D1
- `better-auth` - Authentication
- `zod` - Schema validation
- `sqids` - Short unique IDs

### Dev Dependencies

- `vitest` - Testing
- `tsup` - Building
- `wrangler` - Cloudflare CLI
- `typescript` - Type checking

## Beads Issue Tracking

This project uses Beads for issue tracking. Key commands:

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status=in_progress  # Claim work
bd close <id>         # Complete work
bd sync --from-main   # Sync with main branch
```

## Important Files

- `README.md` - Project overview
- `ARCHITECTURE.md` - Technical deep-dive
- `pnpm-workspace.yaml` - Workspace configuration
- `tsconfig.json` - TypeScript configuration

## Gotchas

### Snippets Constraints
- < 5ms CPU time
- < 32KB compressed
- No bindings allowed
- Limited subrequests

### dotdo Entry Points
- `dotdo` - Full featured (larger bundle)
- `dotdo/tiny` - Minimal (smallest bundle)
- `dotdo/rpc` - Expects RPC bindings
- `dotdo/auth` - With Better Auth

### Package Publishing
Packages are published under two names:
- Direct: `@dotdo/middleware`
- Re-exported: `workers.do/middleware`

Both should work identically.

## Future Exploration (TODOs)

1. **hono/jsx + hono/jsx/dom** - Lighter alternative to React for apps
2. **Auto-detection builds** - vite.config.ts vs next.config.ts
3. **OpenNext simplification** - Embedded with opinionated defaults

## Contact

For questions about the codebase, check:
1. This file (CLAUDE.md)
2. ARCHITECTURE.md for technical details
3. Individual package READMEs
4. Beads issues (`bd list`)
