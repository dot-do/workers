# Sites Worker

Serves compiled MDX sites with domain-based routing for `*.do`, `*.ai`, `*.studio`, `*.mt`, and other TLDs.

## Overview

This worker routes traffic based on hostname and serves pre-compiled MDX content from KV storage. Each site is compiled by Velite from `sites/**/*.mdx` files and stored in the `ASSETS` KV namespace.

## Architecture

```
Request: https://gateway.do/
  ↓
1. Parse hostname: gateway.do → { domain: "gateway", tld: "do" }
2. Load from KV: ASSETS.get("do/gateway")
3. Render MDX with custom components
4. Return HTML response
```

## Domain Routing

| Pattern | Example | KV Key |
|---------|---------|--------|
| `{domain}.do` | `gateway.do` | `do/gateway` |
| `{subdomain}.{domain}.do` | `api.gateway.do` | `do/gateway` (subdomain passed as prop) |
| `{domain}.ai` | `app.net.ai` | `ai/app.net` |
| `{domain}.studio` | `services.studio` | `studio/services` |

## Custom Components

All sites have access to:
- **Button** - Styled buttons with variants
- **Card** - Container cards with optional title
- **Alert** - Colored alerts (info, warning, error, success)
- **CodeBlock** - Syntax-highlighted code blocks

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Velite Integration

Sites are compiled from MDX to JSON by Velite:

```bash
# Compile all sites
cd sites
pnpm velite build

# Output: .velite/do.json, .velite/ai.json, etc.
```

## Deploying Assets

After compiling with Velite, upload to KV:

```bash
# Upload compiled sites to KV
pnpm deploy:assets
```

This reads `.velite/*.json` and uploads each site to the `ASSETS` KV namespace.

## Testing

```bash
# Run tests
pnpm test

# Test locally
curl http://localhost:8787/health
curl -H "Host: gateway.do" http://localhost:8787/
```

## Environment Variables

None required - all configuration is in `wrangler.jsonc`.

## Service Bindings

- **DB_SERVICE** - Database RPC service (for dynamic data)

## KV Namespaces

- **ASSETS** - Compiled MDX sites (key: `{tld}/{domain}`)

## Routes

Configured in `wrangler.jsonc`:
- `*.do/*` → serves *.do domains
- `*.ai/*` → serves *.ai domains
- `*.studio/*` → serves *.studio domains
- `*.mt/*` → serves *.mt domains

## Related Documentation

- [sites/velite.config.ts](../../sites/velite.config.ts) - Velite configuration
- [workers/mdx/](../mdx/) - MDX demo worker
- [Root CLAUDE.md](../../CLAUDE.md) - Multi-repo architecture
