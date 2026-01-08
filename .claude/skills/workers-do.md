---
name: workers-do
description: Use when creating, deploying, or managing workers.do workers. Handles MDX-as-Worker pattern, wrangler.json generation, and multi-transport RPC setup.
---

# workers.do Development Skill

## When to Use

- Creating new workers
- Deploying workers to workers.do platform
- Converting code to MDX-as-Worker format
- Setting up RPC wrapper workers
- Managing wrangler configuration

## MDX-as-Worker Pattern

Workers can be defined in MDX files. The frontmatter is wrangler.json shape plus `dependencies`:

```mdx
---
name: my-worker
compatibility_date: "2024-01-01"
d1_databases:
  - binding: DB
    database_name: users
dependencies:
  hono: ^4.0.0
---

# My Worker

Documentation here.

export default {
  users: { list: () => db.query('SELECT * FROM users') }
}
```

## RPC Wrapper Pattern

To wrap an npm package as a multi-transport RPC worker:

```typescript
import SomePackage from 'some-package'
import { env } from 'cloudflare:workers'
import { RPC } from 'workers.do/rpc'

export default RPC(new SomePackage(env.API_KEY))
```

This exposes the package via:
- Workers RPC: `env.MY_WORKER.method()`
- REST: `GET /api/method?arg=val`
- CapnWeb: WebSocket RPC
- MCP: JSON-RPC 2.0

## Binding Conventions

When using `dotdo/rpc`, use these conventional binding names:

- `this.env.JOSE` - JWT operations
- `this.env.ESBUILD` - Build/transform
- `this.env.MDX` - MDX compilation
- `this.env.STRIPE` - Stripe operations
- `this.env.ORG` - Auth for AI and Humans (id.org.ai / WorkOS)
- `this.env.CLOUDFLARE` - Cloudflare API

## Folder Structure

```
workers/
  workers/     # workers.do umbrella (npm: workers.do)
  cloudflare/  # Cloudflare SDK RPC
  jose/        # JWT RPC
  stripe/      # Stripe RPC
  ...
```

## CLI Commands

```bash
workers.do login      # OAuth via WorkOS
workers.do dev        # Local development
workers.do build      # Generate wrangler.json from MDX
workers.do deploy     # Deploy to platform
workers.do logs       # Tail logs
```

## Checklist for New Workers

1. [ ] Create folder in `workers/`
2. [ ] Add `package.json` with `@dotdo/worker-*` name
3. [ ] Add `index.ts` with RPC wrapper or export default
4. [ ] Add `wrangler.json` or use MDX frontmatter
5. [ ] Add `README.md` documenting the worker
6. [ ] Test locally with `workers.do dev`
