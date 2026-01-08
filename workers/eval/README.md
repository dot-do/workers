# @dotdo/eval

Secure sandbox code evaluation.

## Overview

This worker provides secure JavaScript execution in an isolated sandbox. It blocks dangerous globals, detects escape attempts, and enforces timeouts and memory limits.

**Binding:** `env.EVAL`

## Installation

```bash
pnpm add @dotdo/eval
```

## Usage

Access via service binding:

```typescript
// Evaluate synchronous code
const result = await env.EVAL.evaluate('1 + 1')
// { success: true, result: 2, logs: [], duration: 1 }

// Evaluate async code
const result = await env.EVAL.evaluateAsync(`
  const data = await Promise.resolve([1, 2, 3])
  data.map(x => x * 2)
`)
// { success: true, result: [2, 4, 6], logs: [], duration: 5 }

// Validate syntax
const validation = await env.EVAL.validateCode('function foo() {')
// { valid: false, errors: ['Unexpected end of input'] }
```

## Binding Convention

Configure in `wrangler.json`:

```json
{
  "services": [
    {
      "binding": "EVAL",
      "service": "worker-eval"
    }
  ]
}
```

## Available Transports

| Transport | Example |
|-----------|---------|
| Workers RPC | `await env.EVAL.evaluate(code)` |
| REST | `POST /api/eval` |
| CapnWeb | WebSocket RPC protocol |
| MCP | `{ jsonrpc: '2.0', method: 'evaluate', params: [...] }` |

## Core Methods

### evaluate(code, options?)

Execute JavaScript synchronously.

```typescript
const result = await env.EVAL.evaluate('Math.sqrt(16)', {
  timeout: 1000
})
// { success: true, result: 4, logs: [], duration: 1 }
```

### evaluateAsync(code, options?)

Execute async JavaScript.

```typescript
const result = await env.EVAL.evaluateAsync(`
  const response = await Promise.resolve({ data: 'hello' })
  response.data.toUpperCase()
`, { timeout: 5000 })
// { success: true, result: 'HELLO', logs: [], duration: 3 }
```

### validateCode(code)

Check JavaScript syntax without executing.

```typescript
const validation = await env.EVAL.validateCode('const x = 1; x + 1')
// { valid: true }

const invalid = await env.EVAL.validateCode('const x = ')
// { valid: false, errors: ['Unexpected end of input'] }
```

## Security

### Blocked Globals

The sandbox blocks access to:

- `globalThis`, `self`, `window`, `global`
- `process`, `require`, `__dirname`, `__filename`
- `eval`, `Function`
- `setTimeout`, `setInterval`, `setImmediate`
- `fetch`, `XMLHttpRequest`, `WebSocket`
- `importScripts`

### Safe Globals

The sandbox provides:

- Standard types: `Object`, `Array`, `String`, `Number`, `Boolean`
- Math utilities: `Math`, `BigInt`
- Date handling: `Date`, `JSON`
- Collections: `Map`, `Set`, `WeakMap`, `WeakSet`
- Typed arrays: `ArrayBuffer`, `Int8Array`, etc.
- Promises: `Promise`
- Utilities: `encodeURI`, `parseInt`, etc.
- Console: `console` (captured in logs)

### Escape Detection

Detects and blocks:

- Constructor chain attacks: `.constructor.constructor`
- Prototype manipulation
- Import/export statements

## Limits

| Limit | Value |
|-------|-------|
| Code size | 1 MB |
| Output size | 1 MB |
| Log size | 100 KB |
| Log entries | 1000 |
| Default timeout | 5000 ms |
| Max timeout | 60000 ms |

## Result Format

```typescript
interface ExecutionResult {
  success: boolean
  result?: unknown      // Serialized return value
  error?: string        // Error message if failed
  logs: string[]        // Captured console output
  duration: number      // Execution time in ms
  memoryUsed?: number   // Memory usage in bytes
}
```

## Error Handling

```typescript
const result = await env.EVAL.evaluate('throw new Error("oops")')
// { success: false, error: 'oops', logs: [], duration: 1 }

const result = await env.EVAL.evaluate('while(true) {}', { timeout: 100 })
// { success: false, error: 'Execution timeout exceeded', logs: [], duration: 100 }
```

## Architecture

`workers/eval` is one of four function execution backends:

```
workers/functions (umbrella)
    ├── workers/eval     → Code functions (this worker)
    ├── workers/ai       → Generative functions
    ├── workers/agents   → Agentic functions
    └── workers/humans   → Human functions
```

## Testing

```bash
pnpm test
```

Test coverage includes:
- Sandbox security
- Error handling
- Timeout enforcement
- Memory limits
- RPC interface

## License

MIT
