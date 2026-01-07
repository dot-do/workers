# @dotdo/worker-esbuild

esbuild-wasm exposed as a multi-transport RPC worker.

## Overview

This worker wraps [esbuild-wasm](https://github.com/evanw/esbuild), the WebAssembly version of esbuild, providing JavaScript/TypeScript bundling, minification, and transformation capabilities via Cloudflare Workers RPC.

## Installation

```bash
pnpm add esbuild-wasm @dotdo/rpc
```

## Usage

The worker follows the elegant 3-line pattern:

```typescript
import * as esbuild from 'esbuild-wasm'
import { RPC } from 'workers.do/rpc'
export default RPC(esbuild)
```

## Binding Convention

Configure in `wrangler.json`:

```json
{
  "services": [
    {
      "binding": "ESBUILD",
      "service": "worker-esbuild"
    }
  ]
}
```

Access via:

```typescript
this.env.ESBUILD
```

## Available Transports

| Transport | Example |
|-----------|---------|
| Workers RPC | `await env.ESBUILD.transform(code, options)` |
| REST | `POST /api/transform` |
| CapnWeb | WebSocket RPC protocol |
| MCP | `{ jsonrpc: '2.0', method: 'transform', params: [...] }` |

## Common Operations

```typescript
// Transform TypeScript to JavaScript
const result = await env.ESBUILD.transform(tsCode, {
  loader: 'ts',
  target: 'es2022'
})

// Minify JavaScript
const minified = await env.ESBUILD.transform(jsCode, {
  minify: true,
  target: 'es2020'
})

// Transform JSX
const jsx = await env.ESBUILD.transform(jsxCode, {
  loader: 'jsx',
  jsxFactory: 'h',
  jsxFragment: 'Fragment'
})

// Transform with source maps
const withSourceMap = await env.ESBUILD.transform(code, {
  sourcemap: true,
  sourcefile: 'input.ts',
  loader: 'ts'
})

// Bundle code (virtual filesystem)
const bundled = await env.ESBUILD.build({
  stdin: {
    contents: code,
    loader: 'ts'
  },
  bundle: true,
  write: false
})
```

## Use Cases

- On-demand TypeScript compilation
- Runtime code transformation
- Dynamic module bundling
- Code minification for user-generated content
- JSX/TSX transformation

## Dependencies

- `esbuild-wasm` ^0.24.0
- `@dotdo/rpc` workspace:*

## License

MIT
