# TypeScript Code Review: workers.do Codebase

**Reviewed**: 2026-01-07
**Packages Examined**: `rewrites/fsx/src/`, `packages/do-core/`, `packages/security/`, `packages/types/`, `packages/auth/`
**Overall Assessment**: **Good** - Solid TypeScript fundamentals with some areas needing improvement

---

## Executive Summary

The workers.do codebase demonstrates strong TypeScript practices overall, with particularly mature code in the `fsx` rewrite and `do-core` packages. The codebase uses strict mode consistently, employs well-designed interfaces, and makes good use of generics for type-safe abstractions. However, there are opportunities to improve type safety in several areas, particularly around `any` type usage and runtime validation.

### Scores by Category

| Category | Score | Notes |
|----------|-------|-------|
| **Type Safety** | 7/10 | Good foundation, but `any` abuse in MCP/test files |
| **Interface Design** | 9/10 | Excellent, well-documented interfaces |
| **Generic Patterns** | 8/10 | Strong mixin patterns, good type utilities |
| **Error Types** | 9/10 | Comprehensive typed error hierarchy |
| **Module Structure** | 8/10 | Clean barrel files, explicit exports |
| **Type Inference** | 8/10 | Good balance of explicit vs inferred |
| **Strict Mode** | 10/10 | Consistently enabled across packages |
| **Zod/Validation** | 5/10 | Limited usage, room for improvement |

---

## 1. Compiler Configuration Analysis

### Root `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**Strengths:**
- `strict: true` enables all strict type-checking options
- `noUncheckedIndexedAccess: true` - Excellent practice for catching undefined array/object access
- Modern target (ES2022) allows latest language features
- `moduleResolution: "bundler"` - Correct for modern bundlers

**Recommendation:** Consider adding:
```json
{
  "exactOptionalPropertyTypes": true,
  "noPropertyAccessFromIndexSignature": true
}
```

### Package-Level Consistency

The `packages/do-core/tsconfig.json` adds declaration generation:

```json
{
  "declaration": true,
  "declarationMap": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedIndexedAccess": true
}
```

**Finding:** All examined packages maintain consistent strict settings.

---

## 2. Type Safety Analysis

### Any Type Usage

**Total `any` occurrences found:** ~150+ across the codebase

#### Categorization of `any` Usage:

| Category | Count | Severity | Example Location |
|----------|-------|----------|------------------|
| MCP error handlers | 16 | Medium | `fsx/src/mcp/index.ts` |
| Test file mocks | 50+ | Low | `**/test/**/*.ts` |
| Constructor types (required) | 4 | Acceptable | `packages/do-core/src/*-mixin.ts` |
| API boundaries | 10 | Medium | `packages/edge-api/`, `packages/rpc/` |
| Security sandbox tests | 20+ | Low | `packages/eval/test/sandbox-security.test.ts` |

#### Problematic Patterns Found:

**1. MCP Error Handling (Medium Severity)**

```typescript
// rewrites/fsx/src/mcp/index.ts:195
} catch (error: any) {
  return {
    content: [{ type: 'text', text: `Error: ${error.message}` }],
  }
}
```

**Recommendation:** Create typed error handling:

```typescript
// Better approach
function formatError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

} catch (error: unknown) {
  return {
    content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
  }
}
```

**2. Stats Hydration (Medium Severity)**

```typescript
// rewrites/fsx/src/core/fsx.ts:295
private hydrateStats(stats: any): Stats {
  const mode = stats.mode
  return { ...stats, /* ... */ }
}
```

**Recommendation:** Define the incoming shape:

```typescript
interface RawStats {
  mode: number
  atime: string | number
  mtime: string | number
  ctime: string | number
  birthtime: string | number
  [key: string]: unknown
}

private hydrateStats(stats: RawStats): Stats {
  // ...
}
```

**3. Mixin Constructor Pattern (Acceptable)**

```typescript
// packages/do-core/src/crud-mixin.ts:54
type Constructor<T = object> = new (...args: any[]) => T
```

**Note:** This is a TypeScript limitation (TS2545). The `any[]` is required for mixin constructors. The eslint-disable comment is appropriate here.

---

## 3. Interface Design

### Excellent Patterns Found

**1. Composable Interfaces (`packages/do-core/src/core.ts`)**

```typescript
export interface DOStorage {
  // KV-style operations
  get<T = unknown>(key: string): Promise<T | undefined>
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>
  put<T>(key: string, value: T): Promise<void>
  put<T>(entries: Record<string, T>): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  // ...
}
```

**Strengths:**
- Method overloading for flexibility
- Generic type parameters with sensible defaults
- Clear separation of concerns

**2. Domain-Driven Types (`packages/types/fn.ts`)**

```typescript
export interface DomainEvent<T = unknown> {
  id: string
  type: string
  data: T
  timestamp: number
  aggregateId?: string
  version?: number
  metadata?: Record<string, unknown>
}
```

**Strengths:**
- Generic payload type
- Optional fields for extensibility
- Self-documenting property names

**3. Schema Definition Types (`packages/do-core/src/schema.ts`)**

```typescript
export interface ColumnDefinition {
  name: string
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB'
  primaryKey?: boolean
  notNull?: boolean
  defaultValue?: unknown
  unique?: boolean
}

export interface TableDefinition {
  name: string
  columns: ColumnDefinition[]
  indexes?: IndexDefinition[]
}
```

**Strengths:**
- Constrained union types for `type`
- Hierarchical composition
- Optional properties for flexibility

---

## 4. Generic Patterns

### Mixin Pattern Analysis

The codebase demonstrates excellent use of mixins for composition:

**Example: CRUD Mixin (`packages/do-core/src/crud-mixin.ts`)**

```typescript
export function CRUDMixin<TBase extends Constructor<StorageProvider>>(Base: TBase) {
  return class extends Base {
    async get<T extends Document>(collection: string, id: string): Promise<T | null> {
      const storage = this.getStorage()
      const key = `${collection}:${id}`
      const doc = await storage.get<T>(key)
      return doc ?? null
    }

    async create<T extends Partial<Document>>(
      collection: string,
      data: T
    ): Promise<T & Document> {
      // ...
    }
  }
}
```

**Strengths:**
- Constrained base type (`extends Constructor<StorageProvider>`)
- Generic methods for type-safe operations
- Intersection types for return values (`T & Document`)

### Type Extraction Utilities (`packages/types/fn.ts`)

```typescript
export type ExtractParams<S extends string> =
  S extends `${infer _}{${infer Param}}${infer Rest}`
    ? Param | ExtractParams<Rest>
    : never

export type TaggedResult<TReturn, S extends string, TOpts = {}> =
  [ExtractParams<S>] extends [never]
    ? TReturn
    : (params: Record<ExtractParams<S>, unknown> & Partial<TOpts>) => TReturn
```

**Strengths:**
- Compile-time template string parsing
- Conditional types for API ergonomics
- Proper handling of `never` in conditional checks using tuple

### Agent Generic Pattern (`packages/do-core/src/agent.ts`)

```typescript
export class Agent<
  Env extends DOEnv = DOEnv,
  State extends AgentState = AgentState
> extends DOCore<Env> {
  private _state: State = {
    initialized: false,
    startedAt: undefined,
    lastActivity: undefined,
  } as State

  getState(): State {
    return { ...this._state }
  }
}
```

**Strengths:**
- Constrained generics with defaults
- Type-safe state management
- Extensible for subclasses

---

## 5. Error Handling Types

### POSIX-Compatible Error Hierarchy (`rewrites/fsx/src/core/errors.ts`)

```typescript
export class FSError extends Error {
  code: string
  errno: number
  syscall?: string
  path?: string
  dest?: string

  constructor(code: string, errno: number, message: string, syscall?: string, path?: string, dest?: string) {
    const fullMessage = `${code}: ${message}${syscall ? `, ${syscall}` : ''}${path ? ` '${path}'` : ''}${dest ? ` -> '${dest}'` : ''}`
    super(fullMessage)
    this.name = 'FSError'
    this.code = code
    this.errno = errno
    // ...
  }
}

export class ENOENT extends FSError {
  constructor(syscall?: string, path?: string) {
    super('ENOENT', -2, 'no such file or directory', syscall, path)
    this.name = 'ENOENT'
  }
}

export class EEXIST extends FSError { /* ... */ }
export class EISDIR extends FSError { /* ... */ }
// ... 15+ error types
```

**Strengths:**
- Comprehensive error hierarchy
- POSIX-compatible error codes and numbers
- Rich context (syscall, path, dest)
- Easy pattern matching via `instanceof`

### Typed Error Results (`packages/types/fn.ts`)

```typescript
export interface FnError {
  code: string
  message: string
  details?: unknown
  retryable?: boolean
  retryAfter?: number
  cause?: Error
  stack?: string
}

export type FnResult<T, E = FnError> =
  | { ok: true; value: T; error?: never }
  | { ok: false; value?: never; error: E }
```

**Strengths:**
- Discriminated union for exhaustive handling
- Built-in retry semantics
- Cause chaining support

---

## 6. Module Structure

### Barrel File Patterns

**Good Example (`packages/do-core/src/index.ts`):**

```typescript
export * from './core.js'
export * from './schema.js'
export * from './agent.js'
export * from './mcp-error.js'
export * from './crud-mixin.js'
export * from './actions-mixin.js'
export * from './events.js'
// ... organized by category
```

**Better Example with Explicit Exports (`rewrites/fsx/src/index.ts`):**

```typescript
// Core filesystem API
export { FSx, type FSxOptions } from './core/fsx.js'

// Types
export type {
  Stats,
  Dirent,
  FileHandle,
  ReadStreamOptions,
  WriteStreamOptions,
  // ...
} from './core/types.js'

// Constants
export { constants } from './core/constants.js'

// Errors
export { FSError, ENOENT, EEXIST, EISDIR, ENOTDIR, EACCES, ENOTEMPTY } from './core/errors.js'
```

**Recommendation:** The `fsx` approach is superior because:
1. Explicit exports prevent accidental API surface expansion
2. `type` keyword enables tree-shaking of type-only exports
3. Organized sections improve readability

### Import Consistency

The codebase consistently uses `.js` extensions in imports:

```typescript
import type { DOStorage, DOState } from './core.js'
```

**Note:** This is correct for ESM with TypeScript's `moduleResolution: "bundler"`.

---

## 7. Type Inference vs Explicit Types

### Good Balance Found

**Leveraging Inference:**

```typescript
// packages/do-core/src/schema.ts
const startTime = Date.now()  // inferred as number
const schema = this.options.schema ?? DEFAULT_SCHEMA  // inferred from union
```

**Explicit Where Needed:**

```typescript
// packages/do-core/src/crud-mixin.ts
async list<T extends Document>(
  collection: string,
  options: CRUDListOptions = {}
): Promise<T[]> {
```

### Anti-Pattern Found

```typescript
// Some locations use redundant type annotations
const result: string = someFunction()  // Function already returns string
```

**Recommendation:** Let TypeScript infer where possible; annotate return types and public APIs.

---

## 8. Runtime Validation (Zod)

### Current State

**Limited Zod usage** found primarily in:
- `mdxui/src/__tests__/panel-zod-types.test.ts`
- `mdxui/src/studio/index.ts`

### Missing Validation Opportunities

**1. API Boundaries:**

```typescript
// packages/edge-api/index.ts - Current
function getUserContext(c: any): HATEOASResponse['user'] {
  // No validation
}

// Recommended
import { z } from 'zod'

const UserContextSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
})

function getUserContext(c: unknown): HATEOASResponse['user'] {
  return UserContextSchema.parse(c)
}
```

**2. RPC Request Validation:**

```typescript
// packages/rpc/index.ts - Current
let args: any[] = []
// ... parses request body without validation

// Recommended
const RPCRequestSchema = z.object({
  method: z.string(),
  params: z.array(z.unknown()).optional(),
  id: z.union([z.string(), z.number()]).optional(),
})
```

**3. Schema Definition Validation (`packages/do-core/src/schema.ts`):**

The `LazySchemaManager` has manual validation:

```typescript
private validateSchema(schema: SchemaDefinition): void {
  for (const table of schema.tables) {
    if (!table.name || table.name.trim() === '') {
      throw new Error('Invalid schema: table name cannot be empty')
    }
    // ...
  }
}
```

**Recommended: Use Zod for schema validation:**

```typescript
const ColumnSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['TEXT', 'INTEGER', 'REAL', 'BLOB']),
  primaryKey: z.boolean().optional(),
  notNull: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  unique: z.boolean().optional(),
})

const TableSchema = z.object({
  name: z.string().min(1),
  columns: z.array(ColumnSchema).min(1),
  indexes: z.array(IndexSchema).optional(),
})

const SchemaDefinitionSchema = z.object({
  tables: z.array(TableSchema),
  version: z.number().optional(),
})

// Benefits: Automatic type inference
type SchemaDefinition = z.infer<typeof SchemaDefinitionSchema>
```

---

## 9. Recommendations Summary

### High Priority

1. **Replace `any` with `unknown` in error handlers**
   - Location: `rewrites/fsx/src/mcp/index.ts`
   - Impact: Catches type errors at compile time
   - Effort: Low

2. **Add Zod validation at API boundaries**
   - Location: `packages/rpc/`, `packages/edge-api/`
   - Impact: Runtime type safety, better error messages
   - Effort: Medium

3. **Type the `hydrateStats` parameter**
   - Location: `rewrites/fsx/src/core/fsx.ts`
   - Impact: Prevents runtime errors from malformed responses
   - Effort: Low

### Medium Priority

4. **Create shared error utilities**
   ```typescript
   // packages/utils/src/errors.ts
   export function formatUnknownError(error: unknown): string {
     if (error instanceof Error) return error.message
     if (typeof error === 'string') return error
     return JSON.stringify(error)
   }

   export function isError(value: unknown): value is Error {
     return value instanceof Error
   }
   ```

5. **Enable additional strict flags in root tsconfig**
   ```json
   {
     "exactOptionalPropertyTypes": true,
     "noPropertyAccessFromIndexSignature": true
   }
   ```

6. **Document generic type conventions**
   - `T` for main type
   - `TBase` for base class in mixins
   - `TState` for state types
   - `TEnv` for environment bindings

### Low Priority

7. **Consolidate mixin constructor type**
   ```typescript
   // packages/utils/src/types.ts
   export type Constructor<T = object> = new (...args: any[]) => T
   ```
   Currently duplicated in multiple files.

8. **Add JSDoc `@example` blocks to generic functions**
   Some generics lack usage examples in documentation.

---

## 10. Code Examples: Best Practices from This Codebase

### Example 1: Well-Typed Event Handler

```typescript
// packages/do-core/src/events.ts
export type EventHandler<T = unknown> = (data: T) => void | Promise<void>

async emit<T = unknown>(event: string, data: T): Promise<void> {
  const subs = this.subscribers.get(event)
  if (!subs || subs.size === 0) return

  for (const sub of subs) {
    try {
      await sub.handler(data)
    } catch (error) {
      console.error(`Event handler error for '${event}':`, error)
    }
    if (sub.once) toRemove.push(sub)
  }
}
```

### Example 2: Type-Safe Storage Interface

```typescript
// packages/do-core/src/core.ts
export interface DOStorage {
  get<T = unknown>(key: string): Promise<T | undefined>
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>
  put<T>(key: string, value: T): Promise<void>
  put<T>(entries: Record<string, T>): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
}
```

### Example 3: Discriminated Union Error Type

```typescript
// packages/types/fn.ts
export type FnResult<T, E = FnError> =
  | { ok: true; value: T; error?: never }
  | { ok: false; value?: never; error: E }

// Usage
function processResult<T>(result: FnResult<T>): T {
  if (result.ok) {
    return result.value  // TypeScript knows value exists
  }
  throw new Error(result.error.message)  // TypeScript knows error exists
}
```

### Example 4: Template Literal Type Extraction

```typescript
// packages/types/fn.ts
export type ExtractParams<S extends string> =
  S extends `${infer _}{${infer Param}}${infer Rest}`
    ? Param | ExtractParams<Rest>
    : never

// Usage
type Params = ExtractParams<'SELECT * FROM {table} WHERE id = {id}'>
// Result: 'table' | 'id'
```

---

## Conclusion

The workers.do codebase demonstrates mature TypeScript practices with room for targeted improvements. The strongest areas are:

1. **Error type hierarchy** - Comprehensive, POSIX-compatible
2. **Interface design** - Well-documented, composable
3. **Mixin patterns** - Type-safe, reusable
4. **Strict mode** - Consistently applied

The main areas for improvement are:

1. **`any` cleanup** - Replace with `unknown` or proper types
2. **Runtime validation** - Integrate Zod at API boundaries
3. **Centralize utilities** - Deduplicate constructor types and error helpers

Following these recommendations will improve type safety, reduce runtime errors, and make the codebase more maintainable.
