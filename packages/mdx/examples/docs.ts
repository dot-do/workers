/**
 * Documentation Site Example
 *
 * Demonstrates using @hono/mdx for documentation:
 * - File-based routing
 * - Custom styling
 * - Navigation generation
 */

import { Hono } from 'hono'
import { mdx } from '@hono/mdx'

const app = new Hono()

// Documentation renderer
app.post('/docs/render', mdx({
  styling: 'github',
  headingIds: true
}), (c) => {
  const meta = c.get('mdx:frontmatter')
  const html = c.get('mdx:html')

  return c.json({
    title: meta.title,
    section: meta.section,
    order: meta.order || 0,
    html
  })
})

export default app
