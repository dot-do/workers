# @hono/mdx Middleware - Contribution Proposal

## Summary

Proposal to contribute MDX/Markdown rendering middleware to the Hono ecosystem at https://github.com/honojs/middleware

## Research Summary

### Hono Middleware Repository Structure

**Repository:** https://github.com/honojs/middleware
**License:** MIT
**Package Manager:** Yarn 4.9.2 with workspaces
**Build System:** Turborepo 2.5.6
**Key Versions:**
- TypeScript: 5.8.2
- Hono: 4.9.8
- Vitest: 3.2.4

**Package Structure:**
```
packages/
└── mdx/
    ├── src/
    │   ├── index.ts        # Main middleware implementation
    │   └── index.test.ts   # Vitest tests
    ├── package.json        # Package configuration
    ├── README.md          # Documentation
    └── tsconfig.json      # TypeScript config (optional)
```

### Contribution Process

1. Clone repository: `git clone https://github.com/honojs/middleware.git`
2. Create new package in `packages/mdx/`
3. Write middleware implementation
4. Write comprehensive tests
5. Create pull request
6. Hono maintainers review and discuss
7. Once accepted, proposer becomes the middleware's author

### Reference: @hono/hello Middleware

**Minimal Example:**
```typescript
import type { Context, MiddlewareHandler } from 'hono'

export const hello = (message: string): MiddlewareHandler => {
  return async (c: Context, next) => {
    c.res.headers.set('X-Message', message)
    await next()
  }
}
```

## Proposal: @hono/mdx Middleware

### Purpose

Provide Hono applications with seamless MDX/Markdown rendering capabilities:
- Convert Markdown to HTML
- Parse YAML frontmatter
- Support GitHub-flavored markdown
- Heading IDs and anchor links
- Customizable styling

### Use Cases

1. **Documentation Sites** - Render markdown documentation dynamically
2. **Blogs** - Convert markdown posts to HTML on-the-fly
3. **API Documentation** - Serve API docs from markdown files
4. **Content Management** - Handle markdown content in Hono apps
5. **Static Site Generation** - Pre-render markdown pages

### Proposed API

#### Basic Usage

```typescript
import { Hono } from 'hono'
import { mdx } from '@hono/mdx'

const app = new Hono()

// Simple markdown rendering
app.post('/render', mdx())

// Request:
// POST /render
// Content-Type: text/markdown
// Body: # Hello World\n\nThis is **markdown**

// Response:
// Content-Type: text/html
// Body: <h1 id="hello-world">Hello World</h1><p>This is <strong>markdown</strong></p>
```

#### With Options

```typescript
app.post('/render', mdx({
  frontmatter: true,           // Parse YAML frontmatter
  headingIds: true,            // Add IDs to headings
  gfm: true,                   // GitHub-flavored markdown
  styling: 'github',           // Use GitHub markdown CSS
  wrapper: true,               // Wrap in HTML document
  customRenderer: (md) => {},  // Custom rendering function
}))
```

#### Advanced: Frontmatter Access

```typescript
app.post('/render', mdx({ frontmatter: true }), async (c) => {
  const frontmatter = c.get('mdx:frontmatter')
  // frontmatter = { title: 'My Post', author: 'John Doe', date: '2025-10-04' }

  const html = c.get('mdx:html')
  // html = rendered HTML content

  return c.json({ frontmatter, html })
})
```

#### Route-Based Rendering

```typescript
// Render markdown files from specific routes
app.get('/docs/:file', mdx({
  basePath: './content/docs',
  extension: '.md'
}))

// GET /docs/getting-started → renders ./content/docs/getting-started.md
```

### Implementation Design

#### Core Middleware Function

```typescript
import type { Context, MiddlewareHandler } from 'hono'
import { marked } from 'marked'
import { gfmHeadingId } from 'marked-gfm-heading-id'
import YAML from 'yaml'

export interface MdxOptions {
  frontmatter?: boolean
  headingIds?: boolean
  gfm?: boolean
  styling?: 'github' | 'minimal' | 'none'
  wrapper?: boolean
  customRenderer?: (markdown: string) => string
}

export const mdx = (options: MdxOptions = {}): MiddlewareHandler => {
  const {
    frontmatter = true,
    headingIds = true,
    gfm = true,
    styling = 'github',
    wrapper = true,
  } = options

  // Configure marked
  if (headingIds) {
    marked.use(gfmHeadingId())
  }

  return async (c: Context, next) => {
    // Only process POST requests with markdown content
    const contentType = c.req.header('content-type')
    if (c.req.method !== 'POST' || !contentType?.includes('markdown')) {
      await next()
      return
    }

    const markdown = await c.req.text()

    // Parse frontmatter if enabled
    let parsedFrontmatter: any = {}
    let content = markdown

    if (frontmatter) {
      const frontmatterRegex = /^---\s*[\r\n]+([\s\S]*?)\r?\n---\s*[\r\n]*/m
      const match = content.match(frontmatterRegex)
      if (match) {
        parsedFrontmatter = YAML.parse(match[1]) || {}
        content = content.replace(match[0], '')
      }
    }

    // Convert markdown to HTML
    let html = marked.parse(content)

    // Apply styling wrapper if enabled
    if (wrapper) {
      html = wrapHtml(html, styling, parsedFrontmatter)
    }

    // Store in context for downstream middleware
    c.set('mdx:frontmatter', parsedFrontmatter)
    c.set('mdx:html', html)

    // Set response
    c.header('content-type', 'text/html; charset=utf-8')
    c.res = new Response(html, {
      headers: c.res.headers,
    })

    await next()
  }
}

function wrapHtml(
  body: string,
  styling: string,
  frontmatter: any
): string {
  const styleLink = styling === 'github'
    ? '<link rel="stylesheet" href="https://unpkg.com/github-markdown-css/github-markdown-light.css">'
    : ''

  const frontmatterSection = Object.keys(frontmatter).length > 0
    ? `<section class="frontmatter">
         <h2>Front-matter</h2>
         <pre><code>${JSON.stringify(frontmatter, null, 2)}</code></pre>
       </section>`
    : ''

  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>${frontmatter.title || 'Rendered Markdown'}</title>
${styleLink}
<style>
  body { max-width: 780px; margin: 2rem auto; padding: 0 1rem; font: 16px/1.6 system-ui; }
  .frontmatter { background: #f6f8fa; border: 1px solid #d0d7de; padding: 1rem; border-radius: 6px; margin: 1.5rem 0; }
</style>
<body class="markdown-body">
${frontmatterSection}
${body}
</body>
</html>`
}
```

#### Package Configuration

**package.json:**
```json
{
  "name": "@hono/mdx",
  "version": "0.1.0",
  "description": "MDX/Markdown rendering middleware for Hono",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "test": "vitest",
    "test:watch": "vitest --watch"
  },
  "keywords": [
    "hono",
    "middleware",
    "mdx",
    "markdown",
    "rendering",
    "frontmatter",
    "yaml"
  ],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/honojs/middleware.git",
    "directory": "packages/mdx"
  },
  "dependencies": {
    "hono": "^4.9.8",
    "marked": "^16.3.0",
    "marked-gfm-heading-id": "^4.1.2",
    "yaml": "^2.8.1"
  },
  "devDependencies": {
    "vitest": "^3.2.4",
    "tsup": "^8.0.0",
    "@types/node": "^20.0.0"
  },
  "peerDependencies": {
    "hono": "^4.0.0"
  }
}
```

### Test Suite

**src/index.test.ts:**
```typescript
import { Hono } from 'hono'
import { mdx } from './index'
import { describe, it, expect } from 'vitest'

describe('MDX Middleware', () => {
  describe('Basic Markdown Rendering', () => {
    it('should convert markdown to HTML', async () => {
      const app = new Hono()
      app.post('/render', mdx())

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Hello World\n\nThis is **bold** text.'
      })

      const html = await res.text()
      expect(html).toContain('<h1')
      expect(html).toContain('Hello World')
      expect(html).toContain('<strong>bold</strong>')
    })

    it('should not process non-markdown requests', async () => {
      const app = new Hono()
      app.post('/render', mdx())
      app.post('/render', (c) => c.text('fallback'))

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: 'test' })
      })

      expect(await res.text()).toBe('fallback')
    })
  })

  describe('Frontmatter Support', () => {
    it('should parse YAML frontmatter', async () => {
      const app = new Hono()
      app.post('/render', mdx({ frontmatter: true }), (c) => {
        const fm = c.get('mdx:frontmatter')
        return c.json(fm)
      })

      const markdown = `---
title: Test Post
author: John Doe
date: 2025-10-04
---

# Content

Body text here.`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const json = await res.json()
      expect(json).toEqual({
        title: 'Test Post',
        author: 'John Doe',
        date: '2025-10-04'
      })
    })

    it('should handle markdown without frontmatter', async () => {
      const app = new Hono()
      app.post('/render', mdx({ frontmatter: true }), (c) => {
        const fm = c.get('mdx:frontmatter')
        return c.json(fm)
      })

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Just Content\n\nNo frontmatter here.'
      })

      const json = await res.json()
      expect(json).toEqual({})
    })
  })

  describe('Heading IDs', () => {
    it('should add IDs to headings when enabled', async () => {
      const app = new Hono()
      app.post('/render', mdx({ headingIds: true }))

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Hello World\n\n## Getting Started'
      })

      const html = await res.text()
      expect(html).toContain('id="hello-world"')
      expect(html).toContain('id="getting-started"')
    })
  })

  describe('HTML Wrapper', () => {
    it('should wrap in HTML document when wrapper=true', async () => {
      const app = new Hono()
      app.post('/render', mdx({ wrapper: true }))

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      const html = await res.text()
      expect(html).toContain('<!doctype html>')
      expect(html).toContain('<html')
      expect(html).toContain('</html>')
    })

    it('should not wrap when wrapper=false', async () => {
      const app = new Hono()
      app.post('/render', mdx({ wrapper: false }))

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      const html = await res.text()
      expect(html).not.toContain('<!doctype html>')
      expect(html).toContain('<h1')
    })
  })

  describe('Context Variables', () => {
    it('should expose mdx:html in context', async () => {
      const app = new Hono()
      app.post('/render', mdx(), (c) => {
        const html = c.get('mdx:html')
        return c.json({ length: html.length })
      })

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      const json = await res.json()
      expect(json.length).toBeGreaterThan(0)
    })
  })
})
```

### Documentation

**README.md:**
```markdown
# @hono/mdx

MDX/Markdown rendering middleware for [Hono](https://hono.dev).

## Features

- 🚀 Fast markdown to HTML conversion using [marked](https://marked.js.org/)
- 📝 YAML frontmatter parsing
- 🔗 GitHub-flavored heading IDs
- 🎨 Built-in styling options (GitHub CSS)
- 🔧 Highly customizable
- 📦 Zero configuration required

## Installation

```bash
npm install @hono/mdx
# or
yarn add @hono/mdx
# or
pnpm add @hono/mdx
```

## Usage

### Basic Example

```typescript
import { Hono } from 'hono'
import { mdx } from '@hono/mdx'

const app = new Hono()

app.post('/render', mdx())

export default app
```

```bash
curl -X POST http://localhost:8787/render \
  -H "Content-Type: text/markdown" \
  -d "# Hello World

This is **markdown** content."
```

### With Frontmatter

```typescript
app.post('/render', mdx({ frontmatter: true }), (c) => {
  const frontmatter = c.get('mdx:frontmatter')
  const html = c.get('mdx:html')

  return c.json({
    meta: frontmatter,
    content: html
  })
})
```

### Configuration Options

```typescript
interface MdxOptions {
  frontmatter?: boolean  // Parse YAML frontmatter (default: true)
  headingIds?: boolean   // Add IDs to headings (default: true)
  gfm?: boolean         // GitHub-flavored markdown (default: true)
  styling?: 'github' | 'minimal' | 'none'  // CSS styling (default: 'github')
  wrapper?: boolean     // Wrap in HTML document (default: true)
}
```

## API

### Middleware

#### `mdx(options?: MdxOptions): MiddlewareHandler`

Creates a middleware that converts markdown to HTML.

**Options:**
- `frontmatter` (boolean): Parse YAML frontmatter. Default: `true`
- `headingIds` (boolean): Add IDs to headings. Default: `true`
- `gfm` (boolean): Enable GitHub-flavored markdown. Default: `true`
- `styling` (string): CSS styling preset. Options: `'github'`, `'minimal'`, `'none'`. Default: `'github'`
- `wrapper` (boolean): Wrap output in HTML document. Default: `true`

### Context Variables

The middleware sets the following variables in the Hono context:

- `mdx:frontmatter` - Parsed YAML frontmatter object
- `mdx:html` - Rendered HTML string

Access these in downstream middleware:

```typescript
app.post('/render', mdx(), (c) => {
  const frontmatter = c.get('mdx:frontmatter')
  const html = c.get('mdx:html')
  // ...
})
```

## Examples

### Blog Post Rendering

```typescript
import { Hono } from 'hono'
import { mdx } from '@hono/mdx'

const app = new Hono()

app.post('/blog/render', mdx({ styling: 'github' }), (c) => {
  const meta = c.get('mdx:frontmatter')
  const content = c.get('mdx:html')

  // Add custom metadata
  const post = {
    ...meta,
    content,
    renderedAt: new Date().toISOString()
  }

  return c.json(post)
})
```

### Documentation Site

```typescript
app.get('/docs/:page', async (c) => {
  const page = c.req.param('page')
  const markdown = await fetch(`https://raw.githubusercontent.com/user/repo/main/docs/${page}.md`)
    .then(r => r.text())

  return c.post('/render', {
    headers: { 'content-type': 'text/markdown' },
    body: markdown
  })
})
```

## License

MIT

## Author

[Your Name]

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) in the main repository.
```

## Next Steps

### Immediate Actions

1. **Fork and Clone** honojs/middleware repository
2. **Create Package Structure** in `packages/mdx/`
3. **Implement Core Functionality** as designed above
4. **Write Comprehensive Tests** covering all features
5. **Document Thoroughly** with README and examples
6. **Create Pull Request** following contribution guidelines
7. **Engage with Maintainers** for review and feedback

### Future Enhancements

Once the core middleware is accepted, consider these additions:

1. **MDX Component Support** - Full MDX with JSX components
2. **Syntax Highlighting** - Built-in code block highlighting
3. **Custom Renderers** - Plugin system for custom markdown extensions
4. **Caching** - Cache rendered HTML for performance
5. **File System Support** - Direct file reading/rendering
6. **SSR/SSG** - Server-side rendering and static generation helpers

## Benefits to Hono Ecosystem

1. **First-Class Markdown Support** - Hono apps can easily render markdown
2. **Documentation Sites** - Enable quick doc sites with Hono
3. **Blog Platforms** - Build markdown-based blogs with Hono
4. **API Documentation** - Serve API docs from markdown files
5. **Content Management** - Handle markdown content in Hono apps

## Alignment with Hono Philosophy

- ✅ **Fast** - Uses marked (fast markdown parser)
- ✅ **Lightweight** - Minimal dependencies
- ✅ **Simple** - Easy to use, zero config
- ✅ **Flexible** - Highly customizable
- ✅ **TypeScript** - Fully typed

## Estimated Timeline

- **Week 1**: Implementation and basic tests
- **Week 2**: Comprehensive testing and documentation
- **Week 3**: Pull request and feedback iteration
- **Week 4**: Final review and merge

---

**Prepared:** 2025-10-04
**Status:** Proposal for Hono maintainer review
**Repository:** https://github.com/honojs/middleware
