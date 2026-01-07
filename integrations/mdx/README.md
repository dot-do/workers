# @dotdo/worker-mdx

MDX compiler exposed as a multi-transport RPC worker.

## Overview

This worker wraps [@mdx-js/mdx](https://github.com/mdx-js/mdx), the official MDX compiler, providing Markdown + JSX compilation capabilities via Cloudflare Workers RPC. MDX allows you to use JSX components in Markdown content.

## Installation

```bash
pnpm add @mdx-js/mdx @dotdo/rpc
```

## Usage

The worker follows the elegant 3-line pattern:

```typescript
import * as mdx from '@mdx-js/mdx'
import { RPC } from 'workers.do/rpc'
export default RPC(mdx)
```

## Binding Convention

Configure in `wrangler.json`:

```json
{
  "services": [
    {
      "binding": "MDX",
      "service": "worker-mdx"
    }
  ]
}
```

Access via:

```typescript
this.env.MDX
```

## Available Transports

| Transport | Example |
|-----------|---------|
| Workers RPC | `await env.MDX.compile(mdxContent)` |
| REST | `POST /api/compile` |
| CapnWeb | WebSocket RPC protocol |
| MCP | `{ jsonrpc: '2.0', method: 'compile', params: [...] }` |

## Common Operations

```typescript
// Compile MDX to JavaScript
const result = await env.MDX.compile(`
# Hello World

<Button onClick={() => alert('clicked')}>
  Click me
</Button>
`)

// Compile with options
const compiled = await env.MDX.compile(mdxContent, {
  jsx: true,
  jsxRuntime: 'automatic',
  jsxImportSource: 'react'
})

// Compile for Preact
const preact = await env.MDX.compile(mdxContent, {
  jsxImportSource: 'preact'
})

// Compile with remark/rehype plugins
const withPlugins = await env.MDX.compile(mdxContent, {
  remarkPlugins: [],
  rehypePlugins: []
})

// Evaluate MDX at runtime
const { default: Content } = await env.MDX.evaluate(mdxContent, {
  ...runtime
})
```

## Use Cases

- Dynamic documentation generation
- User-generated content with components
- Blog post compilation
- MDX-as-Worker pattern (workers defined in MDX files)
- Content management systems

## Dependencies

- `@mdx-js/mdx` ^3.0.0
- `@dotdo/rpc` workspace:*

## License

MIT
