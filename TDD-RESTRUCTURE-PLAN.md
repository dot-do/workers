# TDD Restructuring Plan - Review Issues

**Date**: 2026-01-06
**Source**: 4 Code Reviews (Code, Architecture, TypeScript, Product/Roadmap)
**Total New Issues**: 37

## TDD Methodology

Each issue group follows strict RED → GREEN → REFACTOR:

1. **RED**: Write failing tests that define the expected behavior
2. **GREEN**: Implement minimum code to make tests pass
3. **REFACTOR**: Clean up while maintaining green tests

---

## EPIC 1: Security Hardening (P1 Critical)

### TDD Cycle 1.1: SQL Injection Prevention

**RED: workers-sec-001** - SQL Injection Tests
```typescript
// tests/security/sql-injection.test.ts
describe('SQL Injection Prevention', () => {
  it('should reject malicious orderBy values', async () => {
    const malicious = "name; DROP TABLE users;--";
    await expect(queryWithOrderBy(malicious))
      .rejects.toThrow(ValidationError);
  });

  it('should only allow whitelisted columns', async () => {
    const allowed = ['id', 'name', 'created_at'];
    await expect(queryWithOrderBy('malicious_column'))
      .rejects.toThrow('Invalid column');
  });

  it('should sanitize direction parameter', async () => {
    await expect(queryWithOrderBy('name', 'DESC; DROP TABLE'))
      .rejects.toThrow(ValidationError);
  });
});
```

**GREEN: workers-sec-002** - Implement Safe Query Builder
- Create `SafeQueryBuilder` class with column whitelist
- Implement parameter binding for all dynamic values
- Add direction enum (ASC/DESC only)

**REFACTOR: workers-sec-003** - Query Builder Cleanup
- Extract query building to dedicated module
- Add prepared statement caching
- Document security patterns

### TDD Cycle 1.2: Code Execution Sandbox

**RED: workers-sec-004** - Sandbox Escape Tests
```typescript
describe('Code Execution Sandbox', () => {
  it('should not have access to Node.js globals', async () => {
    const code = "typeof process";
    const result = await execute(code);
    expect(result).toBe('undefined');
  });

  it('should timeout on infinite loops', async () => {
    const code = "while(true){}";
    await expect(execute(code, { timeout: 1000 }))
      .rejects.toThrow(TimeoutError);
  });

  it('should not access file system', async () => {
    const code = "require('fs').readFileSync('/etc/passwd')";
    await expect(execute(code))
      .rejects.toThrow(SecurityError);
  });
});
```

**GREEN: workers-sec-005** - Implement Workers-Native Sandbox
- Replace Node.js `vm` with Workers-compatible isolation
- Use `new Function()` with strict context
- Add CPU time limits via Workers runtime

**REFACTOR: workers-sec-006** - Sandbox Architecture
- Create `SandboxPolicy` configuration
- Add resource quota system
- Document security boundaries

---

## EPIC 2: Memory Leak Prevention (P2 High)

### TDD Cycle 2.1: Branded Type Caching

**RED: workers-mem-001** - Memory Leak Detection Tests
```typescript
describe('Branded Type Memory', () => {
  it('should not leak memory for discarded objects', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    for (let i = 0; i < 10000; i++) {
      createBrandedType({ id: `temp-${i}` });
    }
    gc(); // Force garbage collection
    const finalMemory = process.memoryUsage().heapUsed;
    expect(finalMemory - initialMemory).toBeLessThan(1_000_000);
  });
});
```

**GREEN: workers-mem-002** - Implement WeakMap-based Caching
- Replace Map with WeakMap for branded types
- Allow garbage collection of unreferenced objects
- Add cache size monitoring

**REFACTOR: workers-mem-003** - Memory Management Utilities
- Create `MemoryManager` class
- Add memory pressure detection
- Implement LRU eviction fallback

### TDD Cycle 2.2: JWKS Cache Management

**RED: workers-mem-004** - JWKS Memory Tests
```typescript
describe('JWKS Cache', () => {
  it('should expire cached keys', async () => {
    await fetchJWKS('https://auth.example.com/.well-known/jwks.json');
    advanceTime(3600001); // 1 hour + 1ms
    expect(getCacheSize()).toBe(0);
  });

  it('should limit cache entries', async () => {
    for (let i = 0; i < 1000; i++) {
      await fetchJWKS(`https://auth${i}.example.com/jwks.json`);
    }
    expect(getCacheSize()).toBeLessThanOrEqual(100);
  });
});
```

**GREEN: workers-mem-005** - Implement TTL Cache for JWKS
- Add expiration to JWKS cache entries
- Implement max size limit
- Add periodic cleanup

**REFACTOR: workers-mem-006** - Unified Caching Layer
- Create `TieredCache` abstraction
- Integrate existing LRUCache
- Add cache statistics

---

## EPIC 3: Runtime Compatibility (P1 Critical)

### TDD Cycle 3.1: Workers Runtime Compatibility

**RED: workers-rt-001** - Runtime Compatibility Tests
```typescript
describe('Workers Runtime Compatibility', () => {
  it('should not use process.env', async () => {
    const files = await findFiles('**/*.ts');
    for (const file of files) {
      const content = await readFile(file);
      expect(content).not.toMatch(/process\.env/);
    }
  });

  it('should not use Node.js vm module', async () => {
    const files = await findFiles('**/*.ts');
    for (const file of files) {
      const content = await readFile(file);
      expect(content).not.toMatch(/require\(['"]vm['"]\)/);
      expect(content).not.toMatch(/from ['"]vm['"]/);
    }
  });
});
```

**GREEN: workers-rt-002** - Fix Runtime Incompatibilities
- Replace `process.env` with `env` bindings
- Replace `vm` module with Workers-native alternatives
- Add runtime compatibility lint rules

**REFACTOR: workers-rt-003** - Environment Abstraction
- Create `Environment` abstraction
- Support both Workers and Node.js runtimes
- Add platform detection

---

## EPIC 4: Architecture Improvements (P1 Critical)

### TDD Cycle 4.1: DO Class Decomposition

**RED: workers-arch-001** - DO Interface Tests
```typescript
describe('DO Trait Interfaces', () => {
  it('should implement StorageTrait', () => {
    const storage: StorageTrait = new StorageMixin();
    expect(storage.get).toBeDefined();
    expect(storage.put).toBeDefined();
    expect(storage.delete).toBeDefined();
  });

  it('should implement SQLTrait', () => {
    const sql: SQLTrait = new SQLMixin();
    expect(sql.query).toBeDefined();
    expect(sql.exec).toBeDefined();
  });

  it('should compose traits into DO', () => {
    const do = createDO([StorageMixin, SQLMixin, AuthMixin]);
    expect(do).toBeInstanceOf(DurableObject);
  });
});
```

**GREEN: workers-arch-002** - Implement Trait System
- Extract `StorageMixin` (~300 lines)
- Extract `SQLMixin` (~500 lines)
- Extract `AuthMixin` (~400 lines)
- Extract `WebSocketMixin` (~600 lines)

**REFACTOR: workers-arch-003** - Clean DO Architecture
- Reduce DO.ts to ~500 line coordinator
- Add trait documentation
- Create composition patterns

### TDD Cycle 4.2: Agent Extension

**RED: workers-arch-004** - Agent Compliance Tests
```typescript
describe('DO Agent Compliance', () => {
  it('should extend Agent from agents package', () => {
    const do = new DO(state, env);
    expect(do).toBeInstanceOf(Agent);
  });

  it('should implement onConnect handler', () => {
    expect(typeof DO.prototype.onConnect).toBe('function');
  });

  it('should support Agent messaging', async () => {
    const do = new DO(state, env);
    const response = await do.handleMessage({ type: 'ping' });
    expect(response.type).toBe('pong');
  });
});
```

**GREEN: workers-arch-005** - Extend Agent Class
- Change `class DO extends DurableObject` to `class DO extends Agent`
- Implement required Agent interface methods
- Integrate Agent messaging system

**REFACTOR: workers-arch-006** - Agent Integration
- Leverage Agent built-in features
- Remove redundant implementations
- Document Agent capabilities

### TDD Cycle 4.3: Schema Initialization

**RED: workers-arch-007** - Schema Init Tests
```typescript
describe('Schema Initialization', () => {
  it('should use blockConcurrencyWhile', async () => {
    const mockState = { blockConcurrencyWhile: jest.fn() };
    const do = new DO(mockState, env);
    await do.init();
    expect(mockState.blockConcurrencyWhile).toHaveBeenCalled();
  });

  it('should only initialize schema once', async () => {
    const do = new DO(state, env);
    await do.init();
    await do.init();
    expect(schemaInitCount).toBe(1);
  });
});
```

**GREEN: workers-arch-008** - Implement Proper Init
- Use `blockConcurrencyWhile` in constructor
- Add initialization flag
- Ensure single initialization

**REFACTOR: workers-arch-009** - Init Cleanup
- Create `SchemaManager` class
- Add migration support
- Document initialization flow

---

## EPIC 5: TypeScript Improvements (P2 High)

### TDD Cycle 5.1: Remove Explicit Any

**RED: workers-ts-001** - Type Safety Tests
```typescript
describe('Type Safety', () => {
  it('should have no explicit any in production code', async () => {
    const result = await runTsc('--noEmit --strict');
    expect(result.anyCount).toBe(0);
  });

  it('should have typed error handling', () => {
    type APIError = NetworkError | ValidationError | AuthError;
    const handler: ErrorHandler<APIError> = (e) => {
      // Should type-narrow correctly
      if (e instanceof NetworkError) {
        expect(e.statusCode).toBeDefined();
      }
    };
  });
});
```

**GREEN: workers-ts-002** - Add Proper Types
- Replace `any` with specific types
- Add type guards for narrowing
- Create typed error classes

**REFACTOR: workers-ts-003** - Type Architecture
- Create shared type definitions
- Add generic constraints
- Document type patterns

### TDD Cycle 5.2: SQLite Query Types

**RED: workers-ts-004** - Typed Query Tests
```typescript
describe('Typed SQLite Queries', () => {
  it('should return typed results', async () => {
    interface User { id: string; name: string; }
    const users = await sql.query<User>('SELECT * FROM users');
    // Type should be User[], not any[]
    expectType<User[]>(users);
  });

  it('should validate parameters', async () => {
    // @ts-expect-error - should fail with wrong param types
    await sql.query<User>('SELECT * FROM users WHERE id = ?', [123]);
  });
});
```

**GREEN: workers-ts-005** - Implement Typed Helpers
- Create `TypedQuery<T>` wrapper
- Add parameter type validation
- Return properly typed results

**REFACTOR: workers-ts-006** - Query Builder
- Create fluent query builder
- Add compile-time type checking
- Generate types from schema

---

## EPIC 6: Error Handling (P2 High)

### TDD Cycle 6.1: Error Hierarchy

**RED: workers-err-001** - Error Type Tests
```typescript
describe('Error Hierarchy', () => {
  it('should have base AppError', () => {
    const error = new ValidationError('invalid');
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('should serialize consistently', () => {
    const error = new NotFoundError('User not found');
    const json = error.toJSON();
    expect(json).toEqual({
      code: 'NOT_FOUND',
      message: 'User not found',
      statusCode: 404
    });
  });
});
```

**GREEN: workers-err-002** - Implement Error Classes
- Create `AppError` base class
- Create specific error types
- Add serialization

**REFACTOR: workers-err-003** - Error Handling Patterns
- Create error boundary middleware
- Add error logging integration
- Document error patterns

---

## Implementation Priority

### Sprint 1 (Immediate - P1 Critical)
1. workers-sec-001/002/003 - SQL Injection (Security)
2. workers-rt-001/002/003 - Runtime Compatibility
3. workers-arch-007/008/009 - Schema Init

### Sprint 2 (Short-term - P1/P2)
1. workers-sec-004/005/006 - Code Sandbox
2. workers-arch-001/002/003 - DO Decomposition Start
3. workers-mem-001/002/003 - Branded Types

### Sprint 3 (Medium-term - P2)
1. workers-arch-004/005/006 - Agent Extension
2. workers-ts-001/002/003 - Remove Any
3. workers-err-001/002/003 - Error Hierarchy

### Sprint 4+ (Ongoing - P2/P3)
1. workers-mem-004/005/006 - JWKS Cache
2. workers-ts-004/005/006 - SQLite Types
3. Remaining refactors

---

## Issue Creation Checklist

For each TDD cycle, create 3 beads issues:
- [ ] RED issue (type: bug, label: tdd-red)
- [ ] GREEN issue (type: feature, label: tdd-green, depends on RED)
- [ ] REFACTOR issue (type: task, label: tdd-refactor, depends on GREEN)

Total issues to create: 54 (18 TDD cycles × 3)
