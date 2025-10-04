/**
 * Tests for @hono/mdx middleware
 */
import { Hono } from 'hono'
import { mdx } from './index'
import { describe, it, expect, beforeEach } from 'vitest'
import type { MdxOptions } from './types'

describe('@hono/mdx Middleware', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
  })

  describe('Basic Markdown Rendering', () => {
    it('should convert simple markdown to HTML', async () => {
      app.post('/render', mdx(), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Hello World\n\nThis is **bold** text.'
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/html')

      const html = await res.text()
      expect(html).toContain('<h1')
      expect(html).toContain('Hello World')
      expect(html).toContain('<strong>bold</strong>')
    })

    it('should handle empty markdown', async () => {
      app.post('/render', mdx(), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: ''
      })

      expect(res.status).toBe(200)
      const html = await res.text()
      expect(html).toBeDefined()
    })

    it('should handle complex markdown with lists and code', async () => {
      const markdown = `# Title

## Features

- Item 1
- Item 2
- Item 3

\`\`\`javascript
console.log('hello')
\`\`\`

More content here.`

      app.post('/render', mdx(), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const html = await res.text()
      expect(html).toContain('<h1')
      expect(html).toContain('<h2')
      expect(html).toContain('<ul')
      expect(html).toContain('<li')
      expect(html).toContain('<code')
    })
  })

  describe('Content-Type Filtering', () => {
    it('should only process markdown content-type', async () => {
      app.post('/render', mdx(), (c) => c.res)
      app.post('/render', (c) => c.text('fallback'))

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: 'test' })
      })

      expect(await res.text()).toBe('fallback')
    })

    it('should process text/markdown content-type', async () => {
      app.post('/render', mdx(), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      expect(res.headers.get('content-type')).toContain('text/html')
    })

    it('should skip non-markdown content-type', async () => {
      app.post('/render', mdx(), (c) => c.res)
      app.post('/render', (c) => c.text('other'))

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: '# Test'
      })

      expect(await res.text()).toBe('other')
    })

    it('should process content-type with markdown substring', async () => {
      app.post('/render', mdx(), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown; charset=utf-8' },
        body: '# Test'
      })

      expect(res.headers.get('content-type')).toContain('text/html')
    })
  })

  describe('Frontmatter Parsing', () => {
    it('should parse YAML frontmatter when enabled', async () => {
      app.post('/render', mdx({ frontmatter: true }), (c) => {
        const fm = c.get('mdx:frontmatter')
        return c.json(fm)
      })

      const markdown = `---
title: Test Post
author: John Doe
date: 2025-10-04
tags:
  - test
  - markdown
---

# Content

Body text here.`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const json = await res.json() as any
      expect(json).toEqual({
        title: 'Test Post',
        author: 'John Doe',
        date: '2025-10-04',
        tags: ['test', 'markdown']
      })
    })

    it('should handle markdown without frontmatter', async () => {
      app.post('/render', mdx({ frontmatter: true }), (c) => {
        const fm = c.get('mdx:frontmatter')
        return c.json(fm)
      })

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Just Content\n\nNo frontmatter here.'
      })

      const json = await res.json() as any
      expect(json).toEqual({})
    })

    it('should parse nested frontmatter structures', async () => {
      app.post('/render', mdx(), (c) => {
        const fm = c.get('mdx:frontmatter')
        return c.json(fm)
      })

      const markdown = `---
meta:
  title: Nested
  seo:
    description: Test
    keywords:
      - one
      - two
---

# Content`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const json = await res.json() as any
      expect(json.meta.title).toBe('Nested')
      expect(json.meta.seo.keywords).toEqual(['one', 'two'])
    })

    it('should handle malformed frontmatter gracefully', async () => {
      app.post('/render', mdx(), (c) => c.res)

      const markdown = `---
invalid: : : yaml
---

# Content`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      // Should not crash
      expect(res.status).toBe(200)
    })

    it('should skip frontmatter when disabled', async () => {
      app.post('/render', mdx({ frontmatter: false, wrapper: false }), (c) => c.res)

      const markdown = `---
title: Test
---

# Content`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const html = await res.text()
      // Should include the frontmatter as markdown content
      expect(html).toContain('---')
    })
  })

  describe('Heading IDs', () => {
    it('should add IDs to headings when enabled', async () => {
      app.post('/render', mdx({ headingIds: true, wrapper: false }), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Hello World\n\n## Getting Started\n\n### Sub Section'
      })

      const html = await res.text()
      expect(html).toContain('id="hello-world"')
      expect(html).toContain('id="getting-started"')
      expect(html).toContain('id="sub-section"')
    })

    it('should handle special characters in headings', async () => {
      app.post('/render', mdx({ headingIds: true, wrapper: false }), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Hello & Welcome!\n\n## FAQ: What is this?'
      })

      const html = await res.text()
      expect(html).toContain('id=')
      // Should generate some valid ID
      expect(html).toMatch(/id="[a-z0-9-]+"/i)
    })

    it('should not add IDs when disabled', async () => {
      app.post('/render', mdx({ headingIds: false, wrapper: false }), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Hello World'
      })

      const html = await res.text()
      // Without gfmHeadingId, marked doesn't add IDs
      expect(html).toContain('<h1>')
    })
  })

  describe('HTML Wrapper', () => {
    it('should wrap in full HTML document when wrapper=true', async () => {
      app.post('/render', mdx({ wrapper: true }), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      const html = await res.text()
      expect(html).toContain('<!doctype html>')
      expect(html).toContain('<html')
      expect(html).toContain('<head')
      expect(html).toContain('<body')
      expect(html).toContain('</html>')
    })

    it('should not wrap when wrapper=false', async () => {
      app.post('/render', mdx({ wrapper: false }), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      const html = await res.text()
      expect(html).not.toContain('<!doctype html>')
      expect(html).toContain('<h1')
    })

    it('should use frontmatter title in HTML wrapper', async () => {
      app.post('/render', mdx({ wrapper: true }), (c) => c.res)

      const markdown = `---
title: My Custom Title
---

# Content`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const html = await res.text()
      expect(html).toContain('<title>My Custom Title</title>')
    })

    it('should use default title when no frontmatter', async () => {
      app.post('/render', mdx({ wrapper: true }), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      const html = await res.text()
      expect(html).toContain('<title>Rendered Markdown</title>')
    })

    it('should display frontmatter in wrapper', async () => {
      app.post('/render', mdx({ wrapper: true }), (c) => c.res)

      const markdown = `---
title: Test
author: John
---

# Content`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const html = await res.text()
      expect(html).toContain('class="frontmatter"')
      expect(html).toContain('Front-matter')
    })
  })

  describe('Styling Options', () => {
    it('should include GitHub CSS when styling=github', async () => {
      app.post('/render', mdx({ styling: 'github' }), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      const html = await res.text()
      expect(html).toContain('github-markdown-css')
      expect(html).toContain('class="markdown-body"')
    })

    it('should include minimal styles when styling=minimal', async () => {
      app.post('/render', mdx({ styling: 'minimal' }), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      const html = await res.text()
      expect(html).toContain('<style>')
      expect(html).not.toContain('github-markdown-css')
      expect(html).toContain('max-width: 780px')
    })

    it('should include no styles when styling=none', async () => {
      app.post('/render', mdx({ styling: 'none', wrapper: true }), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      const html = await res.text()
      expect(html).toContain('<html')
      expect(html).not.toContain('github-markdown-css')
    })

    it('should work with wrapper=false and styling options', async () => {
      app.post('/render', mdx({ styling: 'minimal', wrapper: false }), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      const html = await res.text()
      // Without wrapper, styling is not applied (only in wrapper)
      expect(html).not.toContain('<style>')
      expect(html).toContain('<h1')
    })
  })

  describe('Context Variables', () => {
    it('should expose mdx:html in context', async () => {
      app.post('/render', mdx(), (c) => {
        const html = c.get('mdx:html')
        return c.json({ htmlLength: html.length })
      })

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test\n\nContent here.'
      })

      const json = await res.json() as any
      expect(json.htmlLength).toBeGreaterThan(0)
    })

    it('should expose mdx:markdown in context', async () => {
      app.post('/render', mdx(), (c) => {
        const markdown = c.get('mdx:markdown')
        return c.json({ markdown })
      })

      const originalMarkdown = '# Test\n\nContent'
      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: originalMarkdown
      })

      const json = await res.json() as any
      expect(json.markdown).toBe(originalMarkdown)
    })

    it('should expose mdx:frontmatter in context', async () => {
      app.post('/render', mdx(), (c) => {
        const fm = c.get('mdx:frontmatter')
        const html = c.get('mdx:html')
        return c.json({ hasFrontmatter: Object.keys(fm).length > 0, hasHtml: !!html })
      })

      const markdown = `---
title: Test
---

# Content`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const json = await res.json() as any
      expect(json.hasFrontmatter).toBe(true)
      expect(json.hasHtml).toBe(true)
    })

    it('should expose empty frontmatter when none present', async () => {
      app.post('/render', mdx(), (c) => {
        const fm = c.get('mdx:frontmatter')
        return c.json(fm)
      })

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Content'
      })

      const json = await res.json() as any
      expect(json).toEqual({})
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid markdown gracefully', async () => {
      app.post('/render', mdx(), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '' // Empty body
      })

      expect(res.status).toBe(200)
    })

    it('should return error on processing failure', async () => {
      app.post('/render', mdx({
        customRenderer: async () => {
          throw new Error('Renderer failed')
        }
      }), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      expect(res.status).toBe(500)
      const json = await res.json() as any
      expect(json.error).toBeDefined()
      expect(json.error).toBe('Failed to render markdown')
    })

    it('should include error message in response', async () => {
      app.post('/render', mdx({
        customRenderer: async () => {
          throw new Error('Custom error')
        }
      }), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      const json = await res.json() as any
      expect(json.message).toBe('Custom error')
    })
  })

  describe('Custom Renderer', () => {
    it('should use custom renderer when provided', async () => {
      app.post('/render', mdx({
        customRenderer: async (md) => {
          return `<div class="custom">${md}</div>`
        },
        wrapper: false
      }), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      const html = await res.text()
      expect(html).toContain('class="custom"')
      expect(html).toContain('# Test') // Raw markdown preserved
    })

    it('should support async custom renderer', async () => {
      app.post('/render', mdx({
        customRenderer: async (md) => {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 10))
          return `<div>${md}</div>`
        },
        wrapper: false
      }), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      expect(res.status).toBe(200)
    })

    it('should apply frontmatter parsing before custom renderer', async () => {
      app.post('/render', mdx({
        customRenderer: async (md) => {
          // Custom renderer receives content without frontmatter
          return `<pre>${md}</pre>`
        },
        wrapper: false
      }), (c) => {
        const fm = c.get('mdx:frontmatter')
        const html = c.get('mdx:html')
        return c.json({ frontmatter: fm, htmlContainsYaml: html.includes('---') })
      })

      const markdown = `---
title: Test
---

# Content`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const json = await res.json() as any
      expect(json.frontmatter.title).toBe('Test')
      expect(json.htmlContainsYaml).toBe(false) // Frontmatter stripped
    })
  })

  describe('Integration Scenarios', () => {
    it('should work in middleware chain', async () => {
      let middlewareCount = 0

      app.use('*', async (c, next) => {
        middlewareCount++
        await next()
      })

      app.post('/render', mdx(), (c) => c.res)

      app.use('*', async (c, next) => {
        middlewareCount++
        await next()
      })

      await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      expect(middlewareCount).toBe(2)
    })

    it('should allow downstream middleware to access context', async () => {
      app.post('/render', mdx(), (c) => c.res)
      app.post('/render', (c) => {
        const fm = c.get('mdx:frontmatter')
        const html = c.get('mdx:html')
        return c.json({
          title: fm.title || 'Untitled',
          wordCount: html.split(/\s+/).length
        })
      })

      const markdown = `---
title: My Post
---

# Hello World

This is content.`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const json = await res.json() as any
      expect(json.title).toBe('My Post')
      expect(json.wordCount).toBeGreaterThan(0)
    })

    it('should handle multiple POST routes', async () => {
      app.post('/render', mdx(), (c) => c.res)
      app.post('/other', (c) => c.text('other route'))

      const res1 = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      const res2 = await app.request('/other', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'test'
      })

      expect(res1.headers.get('content-type')).toContain('text/html')
      expect(res2.headers.get('content-type')).toContain('text/plain')
    })

    it('should preserve original response headers', async () => {
      app.use('*', async (c, next) => {
        await next()
        c.header('X-Custom', 'test')
      })

      app.post('/render', mdx(), (c) => c.res)

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: '# Test'
      })

      expect(res.headers.get('content-type')).toContain('text/html')
      expect(res.headers.get('X-Custom')).toBe('test')
    })
  })

  describe('GFM Support', () => {
    it('should support GitHub-flavored markdown when enabled', async () => {
      app.post('/render', mdx({ gfm: true, wrapper: false }), (c) => c.res)

      const markdown = `
# Test

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |

~~strikethrough~~
`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const html = await res.text()
      expect(html).toContain('<table')
      expect(html).toContain('<del>strikethrough</del>')
    })

    it('should support task lists', async () => {
      app.post('/render', mdx({ gfm: true, wrapper: false }), (c) => c.res)

      const markdown = `
- [ ] Unchecked
- [x] Checked
`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const html = await res.text()
      expect(html).toContain('<input')
      expect(html).toContain('type="checkbox"')
    })

    it('should support autolinks', async () => {
      app.post('/render', mdx({ gfm: true, wrapper: false }), (c) => c.res)

      const markdown = `Visit https://example.com for more info`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const html = await res.text()
      expect(html).toContain('<a href="https://example.com"')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long markdown documents', async () => {
      app.post('/render', mdx(), (c) => c.res)

      // Generate 1000 lines of markdown
      const markdown = Array(1000).fill('# Heading\n\nParagraph text.\n\n').join('')

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      expect(res.status).toBe(200)
    })

    it('should handle special characters in content', async () => {
      app.post('/render', mdx({ wrapper: false }), (c) => c.res)

      const markdown = `# Test <script>alert("xss")</script>`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const html = await res.text()
      // marked should escape HTML by default
      expect(html).toContain('&lt;script&gt;')
    })

    it('should handle unicode characters', async () => {
      app.post('/render', mdx({ wrapper: false }), (c) => c.res)

      const markdown = `# 你好世界 🌍\n\nHello 世界`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const html = await res.text()
      expect(html).toContain('你好世界')
      expect(html).toContain('🌍')
    })

    it('should handle markdown with multiple frontmatter-like sections', async () => {
      app.post('/render', mdx({ wrapper: false }), (c) => c.res)

      const markdown = `---
title: Real Frontmatter
---

# Content

\`\`\`yaml
---
fake: frontmatter
---
\`\`\`
`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const html = await res.text()
      // Should only parse first frontmatter
      expect(html).toContain('<code')
      expect(html).toContain('fake:')
    })

    it('should handle empty lines and whitespace', async () => {
      app.post('/render', mdx({ wrapper: false }), (c) => c.res)

      const markdown = `

# Title


Paragraph 1


Paragraph 2

`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const html = await res.text()
      expect(html).toContain('<h1')
      expect(html).toContain('<p>')
    })
  })

  describe('Options Combinations', () => {
    it('should work with all options enabled', async () => {
      app.post('/render', mdx({
        frontmatter: true,
        headingIds: true,
        gfm: true,
        styling: 'github',
        wrapper: true
      }), (c) => c.res)

      const markdown = `---
title: Full Featured
---

# Hello World

## Getting Started

- [ ] Todo item

| Col1 | Col2 |
|------|------|
| A    | B    |
`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const html = await res.text()
      expect(html).toContain('<!doctype html>')
      expect(html).toContain('id="hello-world"')
      expect(html).toContain('<table')
      expect(html).toContain('github-markdown-css')
      expect(html).toContain('class="frontmatter"')
    })

    it('should work with all options disabled', async () => {
      app.post('/render', mdx({
        frontmatter: false,
        headingIds: false,
        gfm: false,
        styling: 'none',
        wrapper: false
      }), (c) => c.res)

      const markdown = `# Simple Markdown`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const html = await res.text()
      expect(html).not.toContain('<!doctype html>')
      expect(html).toContain('<h1')
    })

    it('should work with mixed options', async () => {
      app.post('/render', mdx({
        frontmatter: true,
        headingIds: false,
        gfm: true,
        styling: 'minimal',
        wrapper: true
      }), (c) => c.res)

      const markdown = `---
title: Mixed
---

# Test

- [x] Done
`

      const res = await app.request('/render', {
        method: 'POST',
        headers: { 'content-type': 'text/markdown' },
        body: markdown
      })

      const html = await res.text()
      expect(html).toContain('<!doctype html>')
      expect(html).toContain('max-width: 780px')
      expect(html).not.toContain('github-markdown-css')
      expect(html).toContain('class="frontmatter"')
    })
  })
})
