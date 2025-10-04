# MDX Worker Migration Checklist

This checklist guides the migration of existing Cloudflare Workers to the simplified MDX format where a single `.mdx` file contains configuration, implementation, and documentation.

## Prerequisites

- [ ] Worker has stable, working implementation
- [ ] Worker has clear RPC interface or HTTP endpoints
- [ ] Worker is simple enough (< 300 lines of code recommended)
- [ ] Dependencies are npm packages (can be shared in root package.json)

## Migration Steps

### 1. Analysis Phase

- [ ] Read existing worker code (`worker.ts` or `worker.js`)
- [ ] Read existing `wrangler.jsonc` configuration
- [ ] Identify all dependencies (npm packages, service bindings, env vars)
- [ ] Identify RPC methods and HTTP endpoints
- [ ] Check if there's existing README or documentation

### 2. Create MDX File

Create `workers/<worker-name>.mdx` with the following structure:

```mdx
---
$type: Worker
$id: <worker-name>
name: <worker-name>
main: src/index.ts
compatibility_date: "2025-07-08"
account_id: b6641681fe423910342b9ffa1364c76d

observability:
  enabled: true

tail_consumers:
  - service: pipeline

# Add routes if needed
routes:
  - pattern: <worker-name>.apis.do/*
    zone_name: apis.do

# Add service bindings
services:
  - binding: DEPLOY_SERVICE
    service: deploy
  # Add other service bindings as needed

# Add other bindings (KV, R2, D1, etc.) if needed
---

# Worker Name

Brief description of what this worker does.

## Features

- ✅ Feature 1
- ✅ Feature 2
- ✅ Feature 3

## API

**Usage examples go here (use ```javascript not ```typescript):**

```javascript
// Example usage
const result = await env.WORKER_SERVICE.method(args)
```

## Dependencies

- `package-name` (version) - Description

## Implementation

```typescript
import { WorkerEntrypoint } from 'cloudflare:workers'
// Other imports...

// Implementation code here
// Must include:
// 1. WorkerEntrypoint class with RPC methods
// 2. export default class extends WorkerEntrypoint
// 3. fetch() method for HTTP endpoint

export default class extends WorkerEntrypoint {
  // RPC methods
  async method1() { ... }
  async method2() { ... }

  // HTTP endpoint
  fetch() {
    return Response.json({ success: true })
  }
}
```
```

### 3. Key Points for MDX File

- [ ] **Frontmatter** contains complete wrangler.jsonc configuration
- [ ] **Documentation** uses markdown with headings, lists, code examples
- [ ] **Example code** uses ```javascript fences (not ```typescript) to prevent extraction
- [ ] **Implementation code** uses ```typescript and includes:
  - WorkerEntrypoint pattern
  - All RPC methods
  - fetch() method for HTTP health check
  - Proper imports
  - No top-level await (use initialization function if needed)

### 4. Build Worker

```bash
cd workers
pnpm tsx scripts/build-mdx-worker.ts <worker-name>.mdx
```

This generates:
- `<worker-name>/wrangler.jsonc`
- `<worker-name>/src/index.ts`
- `<worker-name>/README.md`

### 5. Install Dependencies

If the worker needs dependencies:

```bash
cd <worker-name>
cat > package.json << EOF
{
  "name": "<worker-name>-worker",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "package-name": "^x.x.x"
  }
}
EOF

pnpm install
```

### 6. Test Build

```bash
cd <worker-name>
npx wrangler deploy --dry-run
```

Check for:
- [ ] No build errors
- [ ] Dependencies resolved
- [ ] Service bindings listed
- [ ] Correct routes configured

### 7. Deploy

```bash
npx wrangler deploy
```

Check:
- [ ] Deployment successful
- [ ] Version ID assigned
- [ ] Routes configured
- [ ] Bindings accessible

### 8. Test Deployment

```bash
# Test HTTP endpoint
curl https://<worker-name>.apis.do/ # or .drivly.workers.dev

# Should return: {"success":true}
```

### 9. Create Tests (Optional)

For comprehensive testing, create tests in `tests/dev/<worker-name>.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'

describe('<WorkerName> Worker (Remote)', () => {
  let service: any

  beforeAll(() => {
    service = env.<WORKER_SERVICE>
    if (!service) {
      throw new Error('<WORKER_SERVICE> binding not found')
    }
  })

  describe('RPC Methods', () => {
    it('should call method1', async () => {
      const result = await service.method1()
      expect(result).toBeDefined()
    })
  })

  describe('HTTP Endpoint', () => {
    it('should return success', async () => {
      const response = await service.fetch()
      const json = await response.json()
      expect(json).toEqual({ success: true })
    })
  })
})
```

Update `tests/dev/wrangler.jsonc` to add the service binding:

```jsonc
{
  "services": [
    { "binding": "<WORKER_SERVICE>", "service": "<worker-name>" },
    // ... other services
  ]
}
```

### 10. Cleanup

- [ ] Verify deployment works
- [ ] Test RPC methods (if applicable)
- [ ] Test HTTP endpoints
- [ ] Document any gotchas or special considerations
- [ ] Consider archiving old worker directory (or leaving as-is for reference)

## Common Issues

### Issue: "Could not resolve" dependency errors

**Solution:** Create `package.json` in worker directory with dependencies:
```bash
cd <worker-name>
cat > package.json << EOF
{
  "name": "<worker-name>-worker",
  "private": true,
  "dependencies": {
    "package-name": "^version"
  }
}
EOF
pnpm install
```

### Issue: "Top-level await" errors

**Solution:** Wrap initialization in a function:
```typescript
let initialized = false

async function ensureInitialized() {
  if (!initialized) {
    // initialization code
    initialized = true
  }
}

export default class extends WorkerEntrypoint {
  async method() {
    await ensureInitialized()
    // method implementation
  }
}
```

### Issue: Example code being extracted as implementation

**Solution:** Use ```javascript for examples, ```typescript only for actual implementation:
```mdx
## Examples

```javascript
// This is documentation, won't be extracted
const example = await env.SERVICE.method()
```

## Implementation

```typescript
// This is actual code, will be extracted
export default class extends WorkerEntrypoint { ... }
```
```

## Migration Candidates

### Completed
1. ✅ yaml - YAML parsing and stringification (deployed, working)
2. ✅ esbuild - TypeScript/JavaScript compilation (deployed, working)

### Next Batch (Recommended Order)
3. hash - Hashing utilities (xxHash32, sqid encoding) - ~28 lines, 2 RPC methods
4. html - Markdown to HTML rendering with frontmatter - ~75 lines, 1 HTTP endpoint
5. load - Model loader (depends on db and yaml services) - ~25 lines, 3 methods

### Future Candidates
- ast - AST parsing (~214 lines)
- markdown - HTML to Markdown conversion (uses Workers AI)
- Other utility workers

## Benefits of MDX Format

1. **Single Source of Truth** - Config, code, and docs in one file
2. **Version Control Friendly** - Easy to review changes
3. **Self-Documenting** - Documentation lives with implementation
4. **Zero Config** - Uses mdxe runtime with TypeScript intellisense
5. **Reduced Boilerplate** - No separate README, wrangler.jsonc, etc.
6. **Easy Deployment** - Build and deploy in one step
7. **Consistency** - All MDX workers follow same pattern

## Resources

- Build script: `scripts/build-mdx-worker.ts`
- Example workers: `yaml.mdx`, `esbuild.mdx`
- Testing guide: `TESTING.md`
- Main documentation: `CLAUDE.md`
