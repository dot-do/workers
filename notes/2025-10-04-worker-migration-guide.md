# Worker Migration Guide - RPC-Only Architecture

**Date:** 2025-10-04
**Status:** Migration Strategy
**Related:** Issue #1

## Overview

This guide outlines the migration strategy for converting workers from having both HTTP and RPC interfaces to being RPC-only, with the `api` worker serving as the single HTTP entry point.

## Current State

Most workers currently have **both interfaces**:

```typescript
// RPC Interface (WorkerEntrypoint) - KEEP THIS
export class MyService extends WorkerEntrypoint<Env> {
  async myMethod(arg: string) {
    // Business logic
  }
}

// HTTP Interface (Hono) - DEPRECATE THIS
const app = new Hono()
app.get('/route', handler)

export default {
  fetch: app.fetch  // ← This should be removed
}
```

## Target State

After migration, workers should have **only RPC interface**:

```typescript
// RPC Interface ONLY
export default class MyService extends WorkerEntrypoint<Env> {
  async myMethod(arg: string) {
    // Business logic
  }

  async health() {
    return { status: 'healthy', timestamp: new Date().toISOString() }
  }
}
```

HTTP access is routed through the `api` worker:
```
User → api worker → MyService (RPC)
```

## Migration Strategy

### Phase 1: API Worker Deployment (✅ COMPLETE)
- [x] Create `api` worker as single HTTP entry point
- [x] Configure routing for all services
- [x] Deploy and test

### Phase 2: Internal Migration (CURRENT)
- [ ] Update all internal service-to-service calls to use RPC
- [ ] Remove direct HTTP calls between services
- [ ] Update tests to use RPC interfaces

### Phase 3: Deprecation Notice
- [ ] Add deprecation warnings to HTTP interfaces
- [ ] Document migration timeline
- [ ] Notify stakeholders

### Phase 4: Removal (FUTURE)
- [ ] Remove Hono apps from workers
- [ ] Remove fetch handlers
- [ ] Update wrangler configs
- [ ] Verify all functionality via api worker

## Service-by-Service Migration

### Core Services

#### ✅ `api` - Already RPC-only (HTTP entry point)
**Status:** Complete - This is the new pattern

#### ⚠️ `gateway` - Needs Migration
**Current:** Has both RPC (GatewayService) and HTTP (Hono app)

**Actions:**
1. Ensure all routing is handled by `api` worker
2. Keep RPC methods for backward compatibility
3. Remove HTTP interface in future phase
4. Consider deprecating entirely (replaced by `api` worker)

**RPC Methods to Keep:**
```typescript
- route(url: string, options?: RequestInit)
- health()
```

#### ⚠️ `db` - Needs Migration
**Current:** Has both RPC (DatabaseService) and HTTP (Hono app)

**Actions:**
1. Keep all RPC methods (get, list, search, etc.)
2. Remove HTTP debugging routes
3. Debug via api worker: `GET /api/db/health`

**RPC Methods to Keep:**
```typescript
- get(ns: string, id: string, options?)
- list(ns: string, options?)
- search(query: string, embedding?, options?)
- create(ns: string, data: any)
- update(ns: string, id: string, data: any)
- delete(ns: string, id: string)
- health()
```

#### ⚠️ `auth` - Needs Migration
**Current:** Has both RPC (AuthService) and HTTP (Hono app)

**Actions:**
1. Keep all RPC methods (login, validateToken, etc.)
2. Keep HTTP for OAuth callbacks (special case)
3. Remove other HTTP routes

**RPC Methods to Keep:**
```typescript
- validateToken(token: string)
- validateApiKey(key: string)
- validateSession(sessionId: string)
- createUser(email: string, password: string)
- login(email: string, password: string)
- logout(sessionId: string)
- health()
```

**HTTP to Keep (OAuth callbacks):**
```typescript
// These need HTTP for OAuth provider redirects
- GET /auth/callback/google
- GET /auth/callback/github
- GET /auth/callback/workos
```

#### ⚠️ `schedule` - Needs Migration
**Current:** Has RPC (ScheduleService) and minimal HTTP

**Actions:**
1. Keep RPC methods for task management
2. Remove HTTP interface (use api worker)
3. Cron triggers remain unchanged

**RPC Methods to Keep:**
```typescript
- runTask(taskName: string)
- listTasks()
- getTaskStatus(taskName: string)
- health()
```

#### ⚠️ `webhooks` - Keep HTTP for External Callbacks
**Current:** Has RPC and HTTP for webhook endpoints

**Actions:**
1. Keep HTTP interface - required for external webhooks
2. Route through api worker: `POST /api/webhooks/stripe`
3. Keep RPC methods for internal calls

**Special Case:** Webhooks NEED HTTP endpoints for external services (Stripe, GitHub, etc.)

#### ⚠️ `email` - Needs Migration
**Current:** Has RPC (EmailService) and HTTP

**Actions:**
1. Keep RPC methods (sendEmail, sendTemplate, etc.)
2. Remove HTTP interface
3. All email sending via RPC

**RPC Methods to Keep:**
```typescript
- sendEmail(to: string, subject: string, body: string)
- sendTemplate(to: string, template: string, data: any)
- health()
```

#### ⚠️ `mcp` - Keep HTTP for MCP Protocol
**Current:** Has RPC and HTTP (JSON-RPC 2.0)

**Actions:**
1. Keep HTTP - required for MCP protocol
2. Route through api worker: `POST /mcp`
3. Keep RPC for internal tool calls

**Special Case:** MCP server NEEDS HTTP for AI agent integration

#### ⚠️ `queue` - Needs Migration
**Current:** Has RPC (QueueService) and HTTP

**Actions:**
1. Keep RPC methods (send, consume, etc.)
2. Remove HTTP interface
3. All queue operations via RPC

**RPC Methods to Keep:**
```typescript
- send(queueName: string, message: any)
- consume(queueName: string, handler: Function)
- health()
```

### AI Services

#### ⚠️ `ai` - Needs Migration
**Actions:**
1. Keep RPC methods (generateText, generateImage, etc.)
2. Remove HTTP interface
3. All AI calls via RPC

#### ⚠️ `embeddings` - Needs Migration
**Actions:**
1. Keep RPC methods (generateEmbedding, batchEmbeddings)
2. Remove HTTP interface
3. All embedding calls via RPC

## Special Cases

### Services That MUST Keep HTTP

Some services require HTTP endpoints for external integrations:

1. **`webhooks`** - External services (Stripe, GitHub) need HTTP
2. **`auth`** - OAuth callbacks require HTTP
3. **`mcp`** - MCP protocol requires JSON-RPC over HTTP

**Solution:** Route these through `api` worker, but keep fetch handlers

### Services for Backward Compatibility

During migration, keep fetch handlers for:
- Debugging and testing
- Gradual migration of client code
- Rollback capability

**Plan:** Remove after Phase 3 (6-12 months)

## Code Changes

### Before (Current)
```typescript
// worker/src/index.ts
import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'

export class MyService extends WorkerEntrypoint<Env> {
  async myMethod(arg: string) {
    return { result: arg }
  }
}

const app = new Hono()
app.get('/method/:arg', async (c) => {
  const arg = c.req.param('arg')
  const service = new MyService(c.env.ctx, c.env)
  const result = await service.myMethod(arg)
  return c.json(result)
})

export default {
  fetch: app.fetch  // ← Remove this
}
```

### After (Target)
```typescript
// worker/src/index.ts
import { WorkerEntrypoint } from 'cloudflare:workers'

export default class MyService extends WorkerEntrypoint<Env> {
  async myMethod(arg: string) {
    return { result: arg }
  }

  async health() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    }
  }
}
```

### Calling from API Worker
```typescript
// api/src/index.ts
app.get('/api/myservice/method/:arg', async (c) => {
  const arg = c.req.param('arg')
  const result = await c.env.MYSERVICE.myMethod(arg)
  return c.json(result)
})
```

## Testing Strategy

### RPC Testing
```typescript
// tests/myservice.test.ts
describe('MyService RPC', () => {
  it('should call method via RPC', async () => {
    const service = new MyService({} as any, env)
    const result = await service.myMethod('test')
    expect(result.result).toBe('test')
  })
})
```

### HTTP Testing (via API worker)
```typescript
// tests/api.test.ts
describe('API Worker routing', () => {
  it('should route to MyService', async () => {
    const response = await fetch('http://localhost:8787/api/myservice/method/test')
    const data = await response.json()
    expect(data.result).toBe('test')
  })
})
```

## Deployment Strategy

### Step 1: Deploy API Worker
```bash
cd api && pnpm deploy
```

### Step 2: Update Service Bindings
```jsonc
// api/wrangler.jsonc
{
  "services": [
    { "binding": "MYSERVICE", "service": "myservice" }
  ]
}
```

### Step 3: Test Routing
```bash
# Old way (deprecated)
curl https://myservice.do/method/test

# New way (via api worker)
curl https://api.do/api/myservice/method/test
```

### Step 4: Migrate Internal Calls
```typescript
// Before
const response = await fetch('https://myservice.do/method/test')

// After
const result = await env.MYSERVICE.myMethod('test')
```

### Step 5: Remove HTTP Interface
```typescript
// Remove Hono app and fetch handler
// Keep only WorkerEntrypoint class
```

## Timeline

- **Month 1:** API worker deployment and internal migration
- **Month 2-3:** Update all service-to-service calls to RPC
- **Month 4-6:** Deprecation warnings and migration support
- **Month 7-12:** Remove fetch handlers (except special cases)

## Rollback Plan

If issues arise:
1. Keep fetch handlers during migration
2. Route can toggle between direct and via-api
3. Monitor metrics during transition
4. Gradual rollout by service

## Benefits After Migration

1. **Simpler Architecture**
   - Single HTTP entry point
   - Clear separation of concerns
   - Easier to reason about

2. **Better Performance**
   - RPC faster than HTTP
   - Reduced network overhead
   - Better connection pooling

3. **Enhanced Security**
   - Single point for auth/rate limiting
   - Reduced attack surface
   - Easier to monitor

4. **Improved Testing**
   - Test RPC interfaces directly
   - Integration tests via api worker
   - Clearer boundaries

5. **Operational Excellence**
   - Centralized logging
   - Consistent metrics
   - Easier debugging

## Next Steps

1. ✅ Deploy api worker
2. ⏳ Update internal service calls to RPC
3. ⏳ Add deprecation warnings
4. ⏳ Document for external users
5. ⏳ Plan removal timeline

## Resources

- [API Worker README](../api/README.md)
- [DO Worker README](../do/README.md)
- [Service Bindings Docs](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
- [WorkerEntrypoint Docs](https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/)

---

**Status:** Migration in progress
**Next Review:** After Phase 2 completion
