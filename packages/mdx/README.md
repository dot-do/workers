# @hono/mdx

MDX/Markdown rendering middleware for [Hono](https://hono.dev).

[![npm version](https://img.shields.io/npm/v/@hono/mdx.svg)](https://www.npmjs.com/package/@hono/mdx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Fast** - Ultra-fast markdown to HTML conversion using [marked](https://marked.js.org/)
- 📝 **YAML Frontmatter** - Parse YAML frontmatter from markdown documents
- 🔗 **Heading IDs** - Automatic GitHub-flavored heading ID generation
- 🎨 **Styling** - Built-in styling options (GitHub CSS, minimal, or custom)
- 🔧 **Customizable** - Highly configurable with sensible defaults
- 📦 **Zero Config** - Works out of the box with no configuration
- 🎯 **Type-Safe** - Full TypeScript support with comprehensive types
- 🌊 **Context Variables** - Access parsed data in downstream middleware

## Installation

```bash
npm install @hono/mdx
# or
yarn add @hono/mdx
# or
pnpm add @hono/mdx
```

## Quick Start

```typescript
import { Hono } from 'hono'
import { mdx } from '@hono/mdx'

const app = new Hono()

// Simple markdown rendering
app.post('/render', mdx())

export default app
```

```bash
# Test it
curl -X POST http://localhost:8787/render \
  -H "Content-Type: text/markdown" \
  -d "# Hello World

This is **markdown** content with **bold** text."
```

## Usage Examples

### Basic Markdown Rendering

```typescript
import { Hono } from 'hono'
import { mdx } from '@hono/mdx'

const app = new Hono()

app.post('/render', mdx())

// POST /render with markdown content
// Returns: Full HTML document
```

### With Frontmatter

```typescript
app.post('/blog/render', mdx({ frontmatter: true }), (c) => {
  // Access parsed frontmatter
  const frontmatter = c.get('mdx:frontmatter')
  const html = c.get('mdx:html')

  return c.json({
    meta: frontmatter,
    content: html,
    publishedAt: frontmatter.date
  })
})
```

```bash
# Request
curl -X POST http://localhost:8787/blog/render \
  -H "Content-Type: text/markdown" \
  -d "---
title: My First Post
author: John Doe
date: 2025-10-04
tags:
  - tutorial
  - hono
---

# Introduction

This is my first blog post!"
```

### Custom Styling

```typescript
// GitHub-style markdown (default)
app.post('/github', mdx({ styling: 'github' }))

// Minimal styling
app.post('/minimal', mdx({ styling: 'minimal' }))

// No styling (bring your own CSS)
app.post('/custom', mdx({ styling: 'none' }))
```

### Without HTML Wrapper

```typescript
// Return only the rendered HTML fragment
app.post('/fragment', mdx({ wrapper: false }))

// Useful for embedding in existing pages
```

### Documentation Site Pattern

```typescript
import { Hono } from 'hono'
import { mdx } from '@hono/mdx'
import { readFile } from 'fs/promises'

const app = new Hono()

// Serve markdown files as HTML
app.get('/docs/:page', async (c) => {
  const page = c.req.param('page')

  // Read markdown file
  const markdown = await readFile(`./docs/${page}.md`, 'utf-8')

  // Render with middleware manually
  return c.post('/render-internal', {
    headers: { 'content-type': 'text/markdown' },
    body: markdown
  })
})

app.post('/render-internal', mdx())
```

### Blog Platform Pattern

```typescript
app.post('/blog/preview', mdx(), (c) => {
  const meta = c.get('mdx:frontmatter')
  const html = c.get('mdx:html')

  // Store in database
  await db.posts.create({
    title: meta.title,
    author: meta.author,
    content: html,
    published: false
  })

  return c.json({ success: true, preview: html })
})
```

### Custom Renderer

```typescript
import { mdx } from '@hono/mdx'
import { customMarkdownParser } from './my-parser'

app.post('/custom', mdx({
  customRenderer: async (markdown) => {
    // Use your own markdown processor
    return customMarkdownParser(markdown)
  }
}))
```

## API Reference

### `mdx(options?: MdxOptions)`

Creates a middleware that converts Markdown to HTML.

#### Options

```typescript
interface MdxOptions {
  frontmatter?: boolean   // Parse YAML frontmatter (default: true)
  headingIds?: boolean    // Add IDs to headings (default: true)
  gfm?: boolean          // GitHub-flavored markdown (default: true)
  styling?: 'github' | 'minimal' | 'none'  // CSS preset (default: 'github')
  wrapper?: boolean      // Wrap in HTML document (default: true)
  customRenderer?: (markdown: string) => string | Promise<string>  // Custom renderer
}
```

##### `frontmatter` (boolean)
- **Default:** `true`
- Parse YAML frontmatter from markdown documents
- Extracted frontmatter is available via `c.get('mdx:frontmatter')`

##### `headingIds` (boolean)
- **Default:** `true`
- Add unique IDs to headings for anchor links
- Uses GitHub-flavored markdown slug format
- Example: `# Hello World` → `<h1 id="hello-world">Hello World</h1>`

##### `gfm` (boolean)
- **Default:** `true`
- Enable GitHub-flavored markdown extensions
- Tables, task lists, strikethrough, etc.

##### `styling` (string)
- **Default:** `'github'`
- **Options:** `'github'`, `'minimal'`, `'none'`
- Controls CSS styling applied to output
  - `'github'`: Use GitHub markdown CSS (via unpkg CDN)
  - `'minimal'`: Basic responsive styles
  - `'none'`: No styling (BYO CSS)

##### `wrapper` (boolean)
- **Default:** `true`
- Wrap output in complete HTML document
- Set to `false` for HTML fragments

##### `customRenderer` (function)
- **Default:** `undefined`
- Provide custom markdown rendering function
- Receives markdown string, returns HTML string
- Can be async

### Context Variables

The middleware sets the following variables in the Hono context:

#### `mdx:frontmatter`
```typescript
const frontmatter = c.get('mdx:frontmatter')
// { title: 'My Post', author: 'John Doe', ... }
```

Parsed YAML frontmatter object. Empty object `{}` if no frontmatter.

#### `mdx:html`
```typescript
const html = c.get('mdx:html')
// "<h1>Hello World</h1><p>Content...</p>"
```

Rendered HTML string.

#### `mdx:markdown`
```typescript
const markdown = c.get('mdx:markdown')
// "# Hello World\n\nContent..."
```

Original markdown input.

### Access in Downstream Middleware

```typescript
app.post('/render', mdx())

app.post('/render', async (c) => {
  const frontmatter = c.get('mdx:frontmatter')
  const html = c.get('mdx:html')
  const markdown = c.get('mdx:markdown')

  // Use the parsed data
  return c.json({
    title: frontmatter.title || 'Untitled',
    wordCount: markdown.split(/\s+/).length,
    html
  })
})
```

## Advanced Usage

### Conditional Rendering

```typescript
app.post('/render', async (c, next) => {
  // Pre-processing
  const contentType = c.req.header('content-type')

  if (contentType?.includes('markdown')) {
    // Apply MDX middleware
    return mdx()(c, next)
  }

  // Skip for other content types
  await next()
})
```

### Response Transformation

```typescript
app.post('/render', mdx(), async (c) => {
  const html = c.get('mdx:html')

  // Add custom headers or metadata
  c.header('X-Rendered-By', 'Hono MDX')
  c.header('X-Render-Time', Date.now().toString())

  // Transform HTML if needed
  const enhanced = html.replace(
    '<body',
    '<body data-theme="dark"'
  )

  return c.html(enhanced)
})
```

### Caching Pattern

```typescript
import { cache } from 'hono/cache'

app.post(
  '/render',
  cache({
    cacheName: 'mdx-cache',
    cacheControl: 'max-age=3600',
  }),
  mdx()
)
```

## Migration from html Worker

If you're migrating from the html worker to @hono/mdx:

**Before (html worker):**
```typescript
import { WorkerEntrypoint } from 'cloudflare:workers'

export default class extends WorkerEntrypoint {
  async fetch(req: Request) {
    const md = await req.text()
    const html = renderMarkdown(md)
    return new Response(html)
  }
}
```

**After (@hono/mdx):**
```typescript
import { Hono } from 'hono'
import { mdx } from '@hono/mdx'

const app = new Hono()
app.post('/render', mdx())

export default app
```

## Examples

See the [examples](./examples/) directory for:
- Blog platform
- Documentation site
- API documentation renderer
- Custom styling examples

## Contributing

This middleware is designed to be contributed to the official [Hono middleware repository](https://github.com/honojs/middleware).

For local development:

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Type check
pnpm typecheck

# Watch mode
pnpm test:watch
```

## Requirements

- Hono ^4.0.0
- Node.js 18+ (for development)

## Dependencies

- [`marked`](https://marked.js.org/) - Fast markdown parser
- [`marked-gfm-heading-id`](https://www.npmjs.com/package/marked-gfm-heading-id) - Heading ID generation
- [`yaml`](https://www.npmjs.com/package/yaml) - YAML parser

## License

MIT

## Related

- [Hono](https://hono.dev) - Ultrafast web framework
- [marked](https://marked.js.org/) - Markdown parser
- [MDX](https://mdxjs.com/) - Markdown for the component era

## Credits

Created as part of the dot-do workers architecture. Designed for contribution to the Hono middleware ecosystem.
