# Code Execution Service - Implementation Notes

## WS-109: code-exec/ Service Implementation

**Status**: ⚠️ **BLOCKED** - Requires Cloudflare Containers or Workers for Platforms

## Summary

This service was implemented to provide secure code execution for user-submitted code. However, a fundamental Cloudflare Workers security restriction prevents the use of dynamic code execution (`new Function()`, `eval()`, etc.) in the standard Workers runtime.

## What Was Implemented

✅ **Complete Service Structure**:
- RPC interface with `CodeExecService` class
- HTTP API with REST endpoints (`/execute`, `/validate`, `/health`, etc.)
- Type definitions for all interfaces
- Comprehensive test suite
- Security validation
- Execution history tracking (D1 schema)
- Runtime API design (ai, api, db, console)

✅ **Code Organization**:
- `/src/index.ts` - Main service entrypoint
- `/src/sandbox.ts` - Sandbox execution logic
- `/src/runtime.ts` - Runtime API implementation
- `/src/types.ts` - TypeScript definitions
- `/tests/` - Comprehensive test suite
- `/migrations/` - D1 database schema

## The Fundamental Blocker

**Cloudflare Workers Security Model**:

Cloudflare Workers (standard runtime) blocks dynamic code generation for security:
- ❌ `new Function()` - Blocked
- ❌ `eval()` - Blocked
- ❌ `AsyncFunction constructor` - Blocked
- ❌ Any string-to-code execution - Blocked

**Error**: `"Code generation from strings disallowed for this context"`

This is **intentional** and **cannot be bypassed** in the standard Workers runtime.

## Solutions

### Option 1: Cloudflare Workers for Platforms (Recommended)

Use **Cloudflare Workers for Platforms** to spawn isolated Worker instances:

```typescript
// Create isolated worker with user code
const worker = await env.DISPATCH_NAMESPACE.create({
  script: userCode,
  bindings: { AI, DB, etc }
})

// Execute in isolated context
const result = await worker.fetch(request)
```

**Pros**:
- Secure isolation per execution
- Full Workers API available
- No code generation restrictions
- Can use npm packages
- Production-ready

**Cons**:
- Requires Workers for Platforms subscription
- More complex setup
- Per-worker resource limits

**Setup**: https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/

### Option 2: Cloudflare Containers

Use **Cloudflare Containers** to run code in containerized environments:

```typescript
// Start container with Python/Node.js
const container = await env.CONTAINERS.start({
  image: 'python:3.11-slim',
  env: { ... },
  timeout: 30000
})

// Execute code in container
const result = await container.exec(code)
```

**Pros**:
- Supports Python, Node.js, any language
- Full OS environment
- Can install packages
- Strong isolation

**Cons**:
- Higher cold start latency
- More expensive
- More complex networking
- Still in beta (as of 2025)

**Setup**: https://developers.cloudflare.com/workers/runtime-apis/containers/

### Option 3: External Execution Service

Delegate to an external code execution service:

```typescript
// Call external sandbox API
const result = await fetch('https://sandbox-api.example.com/execute', {
  method: 'POST',
  body: JSON.stringify({ code, language, context })
})
```

**Options**:
- Judge0 API
- Piston API
- Custom container service

**Pros**:
- Works immediately
- Supports many languages
- Battle-tested

**Cons**:
- External dependency
- Network latency
- Additional cost
- Data leaves Cloudflare network

### Option 4: Limited Static Execution (Current Approach - NOT VIABLE)

The current implementation attempts to use `new Function()` which **does not work** in standard Cloudflare Workers.

**Status**: ❌ Does not work, tests fail

## Recommended Next Steps

1. **Immediate**: Document this blocker in STATUS.md and RECOMMENDATIONS.md
2. **Short-term**: Evaluate Workers for Platforms vs Containers
3. **Medium-term**: Implement solution (likely Workers for Platforms)
4. **Long-term**: Consider hybrid approach (containers for Python, Workers for JS)

## Migration Path

If using **Workers for Platforms**:

1. Sign up for Workers for Platforms
2. Create dispatch namespace
3. Update `CodeSandbox.execute()` to use dispatch namespace
4. Test with isolated worker spawning
5. Update tests to work with dispatch namespace

If using **Cloudflare Containers**:

1. Enable Containers in Cloudflare account
2. Create container configuration
3. Update `CodeSandbox.executePython()` to use containers
4. Add container lifecycle management
5. Test with actual containerized execution

## Current State

**Files Created**:
- ✅ Service structure complete
- ✅ Types and interfaces defined
- ✅ Runtime API designed
- ✅ Tests written
- ✅ Documentation created

**Files Work**:
- ✅ TypeScript compilation passes
- ❌ Tests fail (code execution blocked)
- ❌ Cannot execute user code

**Deployment Status**:
- ⚠️ Can deploy, but execution will fail
- ⚠️ Needs Workers for Platforms or Containers

## References

- [Cloudflare Workers for Platforms](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/)
- [Cloudflare Containers (Beta)](https://developers.cloudflare.com/workers/runtime-apis/containers/)
- [Workers Security Model](https://developers.cloudflare.com/workers/runtime-apis/web-standards/)
- [Dynamic Code Generation Restrictions](https://developers.cloudflare.com/workers/runtime-apis/nodejs/#dynamic-code-evaluation)

## Conclusion

The code execution service is **architecturally complete** but **cannot run** in standard Cloudflare Workers due to security restrictions. This is not a bug or implementation issue - it's a fundamental platform limitation.

**Action Required**: Choose and implement one of the solutions above (Workers for Platforms recommended).

---

**Author**: Backend Engineer I (WS-109)
**Date**: 2025-10-02
**Status**: Blocked - Requires Workers for Platforms or Containers
