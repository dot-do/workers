# Testing Guide

## Testing Strategy

We use a **three-tier testing approach**:

1. **Unit Tests** - Fast, local tests using Miniflare simulation
2. **Integration Tests** - Service-to-service communication tests
3. **Development Tests** - Tests against deployed workers via `wrangler dev`

## Development Tests (Recommended)

**Test deployed workers locally using wrangler dev + RPC**

### Setup

```bash
# 1. Deploy workers
cd yaml && wrangler deploy
cd ../esbuild && wrangler deploy

# 2. Terminal 1: Start test worker
cd tests/dev
wrangler dev

# 3. Terminal 2: Run tests
cd workers
pnpm test:dev
```

### How It Works

**Simple service bindings + wrangler OAuth:**

```jsonc
// tests/dev/wrangler.jsonc
{
  "services": [
    { "binding": "YAML_SERVICE", "service": "yaml" },
    { "binding": "ESBUILD_SERVICE", "service": "esbuild" }
  ]
}
```

When you run `wrangler dev`, service bindings **automatically RPC to deployed workers**. No API tokens, no remote config needed - OAuth handles authentication.

### Benefits

- ✅ **Simple** - Just normal service bindings
- ✅ **Real** - Tests actual deployed code
- ✅ **Secure** - OAuth handles authentication
- ✅ **Fast** - No complex setup

### Writing Tests

```typescript
import { env } from 'cloudflare:test'

describe('YAML Worker', () => {
  it('should parse YAML', async () => {
    // Automatically RPCs to deployed worker
    const result = await env.YAML_SERVICE.parse('key: value')
    expect(result).toEqual({ key: 'value' })
  })
})
```

## Unit Tests

**Fast local tests with Miniflare simulation**

```bash
# Run all unit tests
pnpm test:unit

# Watch mode
pnpm test:watch
```

Unit tests mock external dependencies and test individual functions in isolation.

## Integration Tests

**Service-to-service communication tests**

```bash
# Run integration tests
pnpm test:integration

# Watch mode
pnpm test:integration:watch
```

Integration tests verify that services communicate correctly via RPC.

## Test Coverage

```bash
# Run with coverage
pnpm test:coverage

# Target: 80%+ coverage for all services
```

## Troubleshooting

### "Service not found"

Ensure worker is deployed:
```bash
cd <worker-name>
wrangler deploy
```

### "Not authenticated"

Login to wrangler:
```bash
wrangler login
wrangler whoami  # Verify login
```

### Tests timeout

- Check `wrangler dev` is running
- Check worker logs: `wrangler tail <worker-name>`
- Increase timeout in vitest.config.ts

## Best Practices

- ✅ Write unit tests first (TDD)
- ✅ Use dev tests for integration testing
- ✅ Keep tests focused and fast
- ✅ Mock external APIs when possible
- ✅ Run tests in CI/CD
- ❌ Don't test against production (use staging)
- ❌ Don't skip tests in PRs

## CI/CD Integration

**GitHub Actions example:**

```yaml
- name: Deploy workers
  run: |
    cd workers/yaml && wrangler deploy
    cd ../esbuild && wrangler deploy
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

- name: Run tests
  run: |
    cd workers/tests/dev
    wrangler dev &
    sleep 5
    cd ../..
    pnpm test:dev
```

## See Also

- [tests/dev/README.md](tests/dev/README.md) - Development testing guide
- [Vitest Pool Workers](https://github.com/cloudflare/workers-sdk/tree/main/packages/vitest-pool-workers)
- [Wrangler Dev](https://developers.cloudflare.com/workers/wrangler/commands/#dev)
