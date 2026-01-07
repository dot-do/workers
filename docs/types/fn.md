# Fn Types - Unified Function System

The `@dotdo/types/fn` module provides a unified type system for functions across the workers.do platform. Every function - whether AI, SQL, HTTP, or custom - uses the same core pattern.

## Core Pattern: `Fn<Out, In, Opts>`

```typescript
import type { Fn, AsyncFn, RpcFn } from '@dotdo/types/fn'
```

### Generic Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `Out` | - | Return type (most important, like `Promise<T>`) |
| `In` | `any` | Input type. Default `any` for flexible AI-style input |
| `Opts` | `{}` | Options type (model, timeout, etc.) |

### Three Calling Styles

Every `Fn` supports three invocation styles:

```typescript
// 1. Direct call
fn(input, opts?)

// 2. Tagged template with interpolation
fn`template ${value}`

// 3. Tagged template with named params
fn`template {name}`({ name: value, ...opts })
```

## Variants

### Fn - Synchronous

```typescript
interface Fn<Out, In = any, Opts = {}> {
  (input: In, opts?: Opts): Out
  (strings: TemplateStringsArray, ...values: unknown[]): Out
  <S extends string>(strings: TemplateStringsArray & { raw: readonly S[] }):
    TaggedResult<Out, S, Opts>
}
```

### AsyncFn - Returns Promise

```typescript
interface AsyncFn<Out, In = any, Opts = {}> {
  (input: In, opts?: Opts): Promise<Out>
  // ... same template signatures, wrapped in Promise
}
```

### RpcFn - Returns RpcPromise (Pipelining)

```typescript
interface RpcFn<Out, In = any, Opts = {}> {
  (input: In, opts?: Opts): RpcPromise<Out>
  // ... same template signatures, wrapped in RpcPromise
}
```

`RpcPromise` enables promise pipelining - calling methods before awaiting:

```typescript
// Both queries execute in a single round trip
const user = sql`SELECT * FROM users WHERE id = ${id}`.first()
const posts = sql`SELECT * FROM posts WHERE user_id = ${id}`.all()

console.log(await user, await posts)
```

### StreamFn - Returns AsyncIterable

For streaming responses (critical for AI):

```typescript
const stream: StreamFn<string, any, AIOptions>

for await (const chunk of stream`Tell me a story`) {
  process.stdout.write(chunk)
}
```

## Usage Examples

### AI Function

```typescript
import type { RpcFn } from '@dotdo/types/fn'
import type { GenerateTextOptions } from 'ai'

// Flexible input, typed output and options from AI SDK
const ai: RpcFn<string, any, GenerateTextOptions>

// Direct call
await ai("Summarize this document")

// Template with interpolation
await ai`Summarize: ${document}`

// Named params with options
await ai`Summarize {content} in {style} style`({
  content: document,
  style: "bullet points",
  model: openai("gpt-4"),
  temperature: 0.7
})
```

### SQL Function

```typescript
import type { RpcFn, SQLOptions } from '@dotdo/types/fn'

interface User { id: string; name: string; email: string }

const sql: RpcFn<User[], any, SQLOptions>

// Template with interpolation (safe parameterized query)
await sql`SELECT * FROM users WHERE status = ${status}`

// Named params
await sql`SELECT * FROM {table} WHERE {column} = {value}`({
  table: "users",
  column: "status",
  value: "active",
  timeout: 5000
})
```

### Typed Input Function

```typescript
import type { Fn } from '@dotdo/types/fn'

interface UserInput { id: string }
interface CacheOpts { ttl?: number }

const getUser: Fn<User, UserInput, CacheOpts>

// Type-checked input
getUser({ id: "123" }, { ttl: 3600 })
```

## Template Extraction

The `ExtractParams` type extracts `{name}` placeholders at compile time:

```typescript
type Params = ExtractParams<'SELECT * FROM {table} WHERE {column} = {value}'>
// => 'table' | 'column' | 'value'
```

This enables type-safe named parameters:

```typescript
sql`SELECT * FROM {table}`({ table: "users" })  // OK
sql`SELECT * FROM {table}`({ wrong: "users" })  // Type error!
```

## Streaming

For AI responses that stream tokens:

```typescript
import type { StreamFn, RpcStreamFn, RpcStream } from '@dotdo/types/fn'
import type { StreamTextOptions } from 'ai'

// Basic streaming
const stream: StreamFn<string, any, StreamTextOptions>

for await (const chunk of stream`Tell me a story`) {
  process.stdout.write(chunk)
}

// RPC streaming with collection methods
const rpcStream: RpcStreamFn<string, any, StreamTextOptions>

const response = rpcStream`Tell me a story`
const text = await response.text()  // Collect all chunks
const chunks = await response.collect()  // Array of chunks
```

### RpcStream Methods

```typescript
interface RpcStream<Out> extends AsyncIterable<Out> {
  collect(): RpcPromise<Out[]>      // All chunks as array
  text(): RpcPromise<string>        // Concatenated (for strings)
  first(): RpcPromise<Out | undefined>
  last(): RpcPromise<Out | undefined>
  count(): RpcPromise<number>
  map<T>(fn: (chunk: Out) => T): RpcStream<T>
  filter(fn: (chunk: Out) => boolean): RpcStream<Out>
  reduce<T>(fn: (acc: T, chunk: Out) => T, initial: T): RpcPromise<T>
}
```

## Context

Pass execution context through function chains:

```typescript
import type { FnContext, RpcContextFn } from '@dotdo/types/fn'

const fn: RpcContextFn<Result, Input>

// Call with context
await fn(ctx, input, opts)

// Or bind context
const boundFn = fn.withContext(ctx)
await boundFn(input, opts)
```

### FnContext Fields

```typescript
interface FnContext {
  requestId?: string    // Unique request ID
  userId?: string       // Authenticated user
  orgId?: string        // Organization
  apiKeyId?: string     // API key used
  timestamp?: number    // Request time
  timeoutMs?: number    // Remaining timeout
  traceId?: string      // Distributed tracing
  spanId?: string
  parentSpanId?: string
  metadata?: Record<string, unknown>
  signal?: AbortSignal  // Cancellation
}
```

## Error Handling

### FnResult - Explicit Errors

```typescript
import type { FnResult, SafeFn, isOk, isErr } from '@dotdo/types/fn'

const safeFn: SafeFn<User, { id: string }>

const result = safeFn({ id: "123" })

if (isOk(result)) {
  console.log(result.value)  // User
} else {
  console.error(result.error)  // FnError
}
```

### FnError Structure

```typescript
interface FnError {
  code: string          // 'VALIDATION_ERROR', 'TIMEOUT', etc.
  message: string       // Human-readable
  details?: unknown     // Additional info
  retryable?: boolean   // Can retry?
  retryAfter?: number   // Suggested delay (ms)
  cause?: Error         // Original error
}
```

## Middleware

Wrap functions with cross-cutting concerns:

```typescript
import type { FnMiddleware, FnHooks } from '@dotdo/types/fn'

// Middleware pattern
const logging: FnMiddleware = (next) => async (input, opts) => {
  console.log('Input:', input)
  const result = await next(input, opts)
  console.log('Output:', result)
  return result
}

// Hooks pattern
const hooks: FnHooks<Result, Input> = {
  before: (input) => console.log('Before:', input),
  after: (result) => console.log('After:', result),
  onError: (error) => console.error('Error:', error),
  finally: () => console.log('Done')
}
```

## Partial Application

Pre-configure functions:

```typescript
import type { PartialFn } from '@dotdo/types/fn'

const ai: PartialFn<string, any, AIOptions>

// Create pre-configured version
const gpt4 = ai.withOpts({ model: 'gpt-4', temperature: 0.7 })

// Use it
await gpt4`Summarize ${text}`
```

## Batch Execution

Execute multiple calls in parallel:

```typescript
import type { BatchFn } from '@dotdo/types/fn'

const batch: BatchFn

const [users, posts, comments] = await batch([
  sql`SELECT * FROM users`,
  sql`SELECT * FROM posts`,
  sql`SELECT * FROM comments`
])
```

## Validation

Runtime validation with schema:

```typescript
import type { ValidatedFn } from '@dotdo/types/fn'

const fn: ValidatedFn<Output, Input>

// Validated call (throws on invalid input)
await fn(input)

// Skip validation for trusted internal calls
await fn.unsafe(input)
```

## Utility Types

### Extractors

```typescript
import type { FnOut, FnIn, FnOpts } from '@dotdo/types/fn'

type MyFn = Fn<string, { id: string }, { cache: boolean }>

type Out = FnOut<MyFn>   // string
type In = FnIn<MyFn>     // { id: string }
type Opts = FnOpts<MyFn> // { cache: boolean }
```

### Converters

```typescript
import type { ToAsync, ToRpc } from '@dotdo/types/fn'

type SyncFn = Fn<string, Input>
type AsyncVersion = ToAsync<SyncFn>  // AsyncFn<string, Input>
type RpcVersion = ToRpc<SyncFn>      // RpcFn<string, Input>
```

## Common Options

### AI Options

AI options come from the `ai` package (Vercel AI SDK):

```typescript
import type { GenerateTextOptions, StreamTextOptions } from 'ai'

// Use AI SDK types for options
const ai: RpcFn<string, any, GenerateTextOptions>
const stream: RpcStreamFn<string, any, StreamTextOptions>
```

### SQL & HTTP Options

```typescript
import type { SQLOptions, HTTPOptions } from '@dotdo/types/fn'

// SQL
interface SQLOptions {
  timeout?: number
  transaction?: boolean
  returnType?: 'all' | 'first' | 'one' | 'count'
}

// HTTP
interface HTTPOptions {
  headers?: Record<string, string>
  timeout?: number
  retry?: { attempts?: number; delay?: number; backoff?: 'linear' | 'exponential' }
}
```

## Type Guards

Runtime type checking:

```typescript
import { isFn, isFnError, isOk, isErr } from '@dotdo/types/fn'

if (isFn(value)) { /* value is Fn */ }
if (isFnError(value)) { /* value is FnError */ }
if (isOk(result)) { /* result.value is available */ }
if (isErr(result)) { /* result.error is available */ }
```

## Building Functions

Fluent builder for creating typed functions:

```typescript
import type { FnBuilder } from '@dotdo/types/fn'

const builder: FnBuilder

const myFn = builder()
  .name('getUser')
  .description('Fetch a user by ID')
  .input<{ id: string }>({ type: 'object', properties: { id: { type: 'string' } } })
  .output<User>({ type: 'object' })
  .opts<{ cache?: boolean }>()
  .handler(async (input, opts) => {
    // implementation
  })
```

## Registry

Register and discover functions:

```typescript
import type { FnRegistry } from '@dotdo/types/fn'

const registry: FnRegistry

// Get function by name
const fn = registry.get<User, { id: string }>('getUser')

// Call by name
const user = await registry.call<User>('getUser', { id: '123' })

// List all functions
const names = registry.list()

// Get metadata
const meta = registry.meta('getUser')
```

## Composition

Build pipelines:

```typescript
import type { Pipeline } from '@dotdo/types/fn'

const pipeline: Pipeline<Input, Output>

const result = await pipeline
  .pipe(transform)
  .pipe(validate)
  .catch(handleError)
  .tap(log)
  (input)
```
