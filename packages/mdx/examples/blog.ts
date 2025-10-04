/**
 * Blog Platform Example
 *
 * Demonstrates using @hono/mdx for a blog platform with:
 * - Frontmatter metadata
 * - Post rendering
 * - Preview mode
 */

import { Hono } from 'hono'
import { mdx } from '@hono/mdx'

const app = new Hono()

// Render blog post with metadata
app.post('/blog/render', mdx(), (c) => {
  const meta = c.get('mdx:frontmatter')
  const html = c.get('mdx:html')

  return c.json({
    title: meta.title || 'Untitled',
    author: meta.author || 'Anonymous',
    date: meta.date || new Date().toISOString(),
    tags: meta.tags || [],
    content: html
  })
})

// Preview mode (no wrapper)
app.post('/blog/preview', mdx({ wrapper: false }), (c) => {
  const html = c.get('mdx:html')
  return c.html(html)
})

export default app
