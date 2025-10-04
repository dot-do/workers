# Development Tests

Tests that run locally with `wrangler dev` while calling deployed workers via RPC.

## How It Works

**Simple Service Bindings + Wrangler Dev:**

```jsonc
// wrangler.jsonc
{
  "services": [
    { "binding": "YAML_SERVICE", "service": "yaml" }
  ]
}
```

When you run `wrangler dev`, the service bindings **automatically RPC to deployed workers**. No API tokens, no remote:true config needed - OAuth handles authentication.

## Prerequisites

**Deploy workers first:**

```bash
# Deploy yaml worker
cd workers/yaml
wrangler deploy

# Deploy esbuild worker
cd workers/esbuild
wrangler deploy
```

## Running Tests

**Terminal 1 - Start dev server:**
```bash
cd tests/dev
wrangler dev
```

**Terminal 2 - Run tests:**
```bash
cd workers
pnpm test:dev
```

The tests call the local test worker, which automatically RPCs to deployed workers via service bindings.

## Writing Tests

```typescript
import { env } from 'cloudflare:test'

it('should call deployed worker', async () => {
  // This automatically RPCs to deployed worker
  const result = await env.YAML_SERVICE.parse('key: value')
  expect(result).toEqual({ key: 'value' })
})
```

## vs Local Tests

| Feature | Local Tests | Dev Tests |
|---------|-------------|-----------|
| **Environment** | Miniflare simulation | Real deployed workers |
| **Speed** | Fast (< 1s) | Slower (network RPC) |
| **Deployment** | Not required | Required |
| **Authentication** | None | Wrangler OAuth |
| **Use Case** | Unit tests | Integration tests |

## Benefits

- ✅ **Simple** - Just normal service bindings
- ✅ **No API tokens** - OAuth handles auth
- ✅ **No config complexity** - No remote:true needed
- ✅ **Real workers** - Tests actual deployed code
- ✅ **Local dev** - Run from your machine

## Troubleshooting

**Error: "Service not found"**
- Ensure worker is deployed: `wrangler deploy`
- Check service name matches deployed worker

**Error: "Not authenticated"**
- Login to wrangler: `wrangler login`
- Check OAuth status: `wrangler whoami`

**Tests timeout:**
- Check wrangler dev is running
- Check worker logs: `wrangler tail <worker-name>`

## See Also

- [wrangler dev documentation](https://developers.cloudflare.com/workers/wrangler/commands/#dev)
- [Service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
