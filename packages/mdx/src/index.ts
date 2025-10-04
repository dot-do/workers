/**
 * @hono/mdx - MDX/Markdown rendering middleware for Hono
 * @module @hono/mdx
 */

import type { Context, MiddlewareHandler } from 'hono'
import { marked, Marked } from 'marked'
import { gfmHeadingId } from 'marked-gfm-heading-id'
import type { MdxOptions, Frontmatter } from './types'
import { parseFrontmatter, wrapHtml } from './utils'

// Export types
export type { MdxOptions, Frontmatter, MdxContext } from './types'

/**
 * MDX/Markdown rendering middleware for Hono
 *
 * Converts Markdown to HTML with optional YAML frontmatter parsing,
 * GitHub-flavored markdown support, and customizable styling.
 *
 * @param options - Configuration options
 * @returns Hono middleware handler
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono'
 * import { mdx } from '@hono/mdx'
 *
 * const app = new Hono()
 * app.post('/render', mdx())
 * ```
 */
export const mdx = (options: MdxOptions = {}): MiddlewareHandler => {
  const {
    frontmatter = true,
    headingIds = true,
    gfm = true,
    styling = 'github',
    wrapper = true,
    customRenderer
  } = options

  return async (c: Context, next) => {
    // Only process requests with markdown content-type
    const contentType = c.req.header('content-type')

    // If not markdown, skip to next middleware
    if (!contentType?.includes('text/markdown') && !contentType?.includes('markdown')) {
      await next()
      return
    }

    try {
      // Create a new marked instance per request for proper configuration
      const markedInstance = new Marked()

      // Configure marked options
      markedInstance.setOptions({
        gfm: gfm,
        breaks: gfm
      })

      // Enable GFM heading IDs if requested
      if (gfm && headingIds) {
        markedInstance.use(gfmHeadingId())
      }

      // Get markdown content from request body
      const markdown = await c.req.text()

      // Store original markdown in context
      c.set('mdx:markdown', markdown)

      let parsedFrontmatter: Frontmatter = {}
      let content = markdown

      // Parse frontmatter if enabled
      if (frontmatter) {
        const result = parseFrontmatter(markdown)
        parsedFrontmatter = result.frontmatter
        content = result.content
      }

      // Convert markdown to HTML
      let html: string

      if (customRenderer) {
        // Use custom renderer if provided
        html = await customRenderer(content)
      } else {
        // Use marked to convert markdown to HTML
        html = markedInstance.parse(content) as string
      }

      // Wrap in HTML document if enabled
      if (wrapper) {
        html = wrapHtml(html, options, parsedFrontmatter)
      }

      // Store parsed data in context for downstream middleware
      c.set('mdx:frontmatter', parsedFrontmatter)
      c.set('mdx:html', html)

      // Set response headers and body
      c.header('content-type', 'text/html; charset=utf-8')
      c.res = new Response(html, {
        status: 200,
        headers: c.res?.headers || new Headers()
      })

    } catch (error) {
      // Handle errors gracefully
      console.error('MDX middleware error:', error)

      c.status(500)
      return c.json({
        error: 'Failed to render markdown',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Call next to allow handlers to access context and override response if needed
    await next()
  }
}

/**
 * Default export
 */
export default mdx
